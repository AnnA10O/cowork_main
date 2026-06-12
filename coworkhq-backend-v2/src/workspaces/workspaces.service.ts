import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWorkspaceDto, CreateDeskDto, CreateBulkDesksDto, CreatePricingPlanDto,
  UpdatePricingPlanDto, CreateCouponDto, GenerateStaffCodeDto,
} from './workspaces.dto';
import { WorkspaceStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  // ── Public: browse workspaces ─────────────────────────────────────

  async findAll(query: {
    city?: string;
    search?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const { city, search, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { status: WorkspaceStatus.ACTIVE };
    if (city)   where.city = { contains: city, mode: 'insensitive' };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (type)   where.type = type;

    const [workspaces, total] = await Promise.all([
      this.prisma.workspace.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit.toString(), 10) || 10,
        include: {
          images: { orderBy: { order: 'asc' } },
          pricingPlans: { orderBy: { type: 'asc' } },
          workingHours: true,
          _count: { select: { desks: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workspace.count({ where }),
    ]);

    return { workspaces, total, page, limit };
  }

  async findOne(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
        pricingPlans: { orderBy: { type: 'asc' } },
        workingHours: true,
        desks: { where: { isActive: true }, orderBy: { deskNumber: 'asc' } },
          coupons: { where: { isPublic: true, isActive: true, validUntil: { gte: new Date() } }, select: { code: true, discountPercent: true, discountFlat: true, minOrderValue: true } },
        feedbacks: {
          include: { customer: { include: { user: { select: { name: true } } } } },
          orderBy: { createdAt: 'desc' }, take: 10,
        },
      },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  // ── Manager: manage own workspaces ───────────────────────────────

  async create(managerId: string, dto: CreateWorkspaceDto) {
    return this.prisma.workspace.create({
      data: {
        managerId,
        name: dto.name,
        description: dto.description,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        googleMapsUrl: dto.googleMapsUrl,
        useDefaultImages: dto.useDefaultImages ?? true,
        type: dto.type ?? 'hot_desk',
        amenities: dto.amenities || [],
        workingHours: {
          create: dto.workingHours,
        },
        pricingPlans: {
          create: [
            { name: 'Hourly', type: 'HOURLY', basePrice: 49, currency: 'INR', isActive: true },
            { name: 'Day Pass', type: 'DAILY', basePrice: 199, currency: 'INR', isActive: true },
            { name: 'Weekly Hot Desk', type: 'WEEKLY', basePrice: 999, currency: 'INR', isActive: true },
            { name: 'Monthly Hot Desk', type: 'MONTHLY', basePrice: 2999, currency: 'INR', isActive: true },
          ]
        }
      },
      include: { workingHours: true, pricingPlans: true },
    });
  }

  async update(managerId: string, workspaceId: string, dto: Partial<CreateWorkspaceDto>) {
    await this.assertOwner(managerId, workspaceId);

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: dto.name,
        description: dto.description,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        googleMapsUrl: dto.googleMapsUrl,
        amenities: dto.amenities,
        useDefaultImages: dto.useDefaultImages,
        type: dto.type,
      },
    });
  }

  async deactivate(managerId: string, workspaceId: string) {
    await this.assertOwner(managerId, workspaceId);
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { status: WorkspaceStatus.INACTIVE },
    });
  }

  // ── Images (Dynamic Upload Limit: N * 2 + 1) ──────────────────────────────────

  async uploadImage(managerId: string, workspaceId: string, file: any, order: number) {
    await this.assertOwner(managerId, workspaceId);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    console.log(`[UPLOAD] File: ${file.originalname}, Size: ${file.size}, Buffer Length: ${file.buffer?.length}`);

    // 1. Calculate dynamic image limit (relaxed for user-defined sliding images and category images)
    const existingImages = await this.prisma.workspaceImage.findMany({
      where: { workspaceId },
    });

    if (order >= 0) {
      const existingWorkspaceImages = existingImages.filter((img) => img.order >= 0);
      const isNewSlot = !existingWorkspaceImages.some((img) => img.order === order);
      if (isNewSlot && existingWorkspaceImages.length >= 50) {
        throw new BadRequestException('Maximum workspace image limit of 50 reached.');
      }
    }

    // 2. Upload file to Supabase Storage
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'coworkhq-images';

    if (!supabaseUrl || !serviceKey) {
      throw new BadRequestException('Supabase storage credentials not configured on server');
    }

    const fileExt = file.originalname.split('.').pop();
    const fileName = `workspaces/${workspaceId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`;

    const headers = {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': file.mimetype || 'application/octet-stream',
    };

    const bodyData = new Uint8Array(file.buffer);
    let response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: bodyData,
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 404 || errText.includes('Bucket not found') || errText.includes('bucket_not_found')) {
        try {
          const createBucketUrl = `${supabaseUrl}/storage/v1/bucket`;
          const createRes = await fetch(createBucketUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceKey}`,
              'apikey': serviceKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: bucketName,
              name: bucketName,
              public: true,
            }),
          });
          if (createRes.ok || createRes.status === 409) {
            response = await fetch(uploadUrl, {
              method: 'POST',
              headers,
              body: bodyData,
            });
          }
        } catch (createErr) {
          console.error('Failed to auto-create Supabase storage bucket:', createErr);
        }
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new BadRequestException(`Failed to upload to Supabase storage: ${errText}`);
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;

    // 3. Delete old image in this slot (if exists) in DB and storage
    const matchedImage = existingImages.find((img) => img.order === order);
    if (matchedImage) {
      try {
        const deletePath = matchedImage.url.split(`/public/${bucketName}/`).pop();
        if (deletePath) {
          const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${deletePath}`;
          await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${serviceKey}`,
              'apikey': serviceKey,
            },
          });
        }
      } catch (err) {
        console.error('Failed to delete old image from Supabase Storage:', err);
      }

      return this.prisma.workspaceImage.update({
        where: { id: matchedImage.id },
        data: { url: publicUrl },
      });
    } else {
      return this.prisma.workspaceImage.create({
        data: {
          workspaceId,
          url: publicUrl,
          order,
        },
      });
    }
  }

  async removeImage(managerId: string, imageId: string) {
    const image = await this.prisma.workspaceImage.findUnique({
      where: { id: imageId },
      include: { workspace: true },
    });
    if (!image) throw new NotFoundException('Image not found');
    if (image.workspace.managerId !== managerId) throw new ForbiddenException();

    // Delete from Supabase Storage
    try {
      const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'coworkhq-images';
      const deletePath = image.url.split(`/public/${bucketName}/`).pop();
      if (deletePath) {
        const deleteUrl = `${process.env.SUPABASE_URL}/storage/v1/object/${bucketName}/${deletePath}`;
        await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_KEY,
          },
        });
      }
    } catch (err) {
      console.error('Failed to delete image from Supabase Storage:', err);
    }

    await this.prisma.workspaceImage.delete({ where: { id: imageId } });
    return { message: 'Image removed' };
  }

  async deleteDesk(managerId: string, deskId: string) {
    const desk = await this.prisma.desk.findUnique({
      where: { id: deskId },
      include: { workspace: true },
    });
    if (!desk) throw new NotFoundException('Desk not found');
    if (desk.workspace.managerId !== managerId) throw new ForbiddenException();

    await this.prisma.booking.deleteMany({ where: { deskId } });
    await this.prisma.qrCode.deleteMany({ where: { deskId } });
    await this.prisma.desk.delete({ where: { id: deskId } });
    return { message: 'Desk removed successfully' };
  }

  // ── Desks ─────────────────────────────────────────────────────────

  async addBulkDesks(managerId: string, workspaceId: string, dto: CreateBulkDesksDto) {
    await this.assertOwner(managerId, workspaceId);
    
    const desksData = [];
    for (let i = 0; i < dto.count; i++) {
      desksData.push({
        workspaceId,
        deskNumber: `${dto.prefix}${dto.startNumber + i}`,
        type: dto.type || 'standard',
        premiumExtra: dto.premiumExtra || 0,
        description: dto.description || `Seat ${dto.prefix}${dto.startNumber + i}`,
      });
    }

    // createMany skipDuplicates handles if they try to create a desk that already exists!
    const result = await this.prisma.desk.createMany({
      data: desksData,
      skipDuplicates: true,
    });

    return { message: `Successfully added ${result.count} seats`, count: result.count };
  }

  async addDesk(managerId: string, workspaceId: string, dto: CreateDeskDto) {
    await this.assertOwner(managerId, workspaceId);
    return this.prisma.desk.create({
      data: { workspaceId, ...dto },
    });
  }

  async updateDesk(managerId: string, deskId: string, dto: Partial<CreateDeskDto>) {
    const desk = await this.prisma.desk.findUnique({
      where: { id: deskId },
      include: { workspace: true },
    });
    if (!desk) throw new NotFoundException();
    if (desk.workspace.managerId !== managerId) throw new ForbiddenException();

    return this.prisma.desk.update({ where: { id: deskId }, data: dto });
  }

  async getDeskAvailability(workspaceId: string, date: string, startTimeStr?: string, endTimeStr?: string) {
    let start = new Date(date);
    start.setHours(0, 0, 0, 0);
    let end = new Date(date);
    end.setHours(23, 59, 59, 999);

    let specificTimeCheck = false;
    if (startTimeStr && endTimeStr) {
      start = new Date(startTimeStr);
      end = new Date(endTimeStr);
      specificTimeCheck = true;
    }

    const desks = await this.prisma.desk.findMany({
      where: { workspaceId, isActive: true },
      include: {
        bookings: {
          where: {
            startTime: { lte: end },
            endTime: { gte: start },
            status: { in: ['CONFIRMED', 'PENDING'] },
          },
        },
      },
    });

    return desks.map((desk) => {
      let isAvailable = desk.bookings.length === 0;
      
      // If there are bookings but we are checking a specific time slot,
      // verify against bookedSlots array if present.
      if (!isAvailable && specificTimeCheck) {
        // Assume available until proven otherwise by a direct overlap
        let blocked = false;
        for (const b of desk.bookings) {
          if (b.bookedSlots && b.bookedSlots.length > 0) {
            // Check if any slot falls within start and end
            const hasOverlap = b.bookedSlots.some(slot => {
              const slotTime = new Date(slot).getTime();
              // simplistic check: if the booked slot starts exactly at or within our range
              // A typical slot is 1 hour, so we check if the slot start time is >= start and < end
              return slotTime >= start.getTime() && slotTime < end.getTime();
            });
            if (hasOverlap) {
              blocked = true;
              break;
            }
          } else {
            // Fallback for old bookings without bookedSlots
            blocked = true;
            break;
          }
        }
        isAvailable = !blocked;
      }

      return {
        ...desk,
        isAvailable,
      };
    });
  }

  // ── Pricing Plans ─────────────────────────────────────────────────

  async createPricingPlan(managerId: string, workspaceId: string, dto: CreatePricingPlanDto) {
    await this.assertOwner(managerId, workspaceId);
    return this.prisma.pricingPlan.create({ data: { workspaceId, ...dto } });
  }

  async updatePricingPlan(managerId: string, planId: string, dto: UpdatePricingPlanDto) {
    const plan = await this.prisma.pricingPlan.findUnique({
      where: { id: planId },
      include: { workspace: true },
    });
    if (!plan || plan.workspace.managerId !== managerId) throw new ForbiddenException();
    return this.prisma.pricingPlan.update({ where: { id: planId }, data: dto });
  }

  // ── Coupons ───────────────────────────────────────────────────────

  async createCoupon(managerId: string, workspaceId: string, dto: CreateCouponDto) {
    await this.assertOwner(managerId, workspaceId);
    return this.prisma.coupon.create({
      data: {
        workspaceId,
        code: dto.code.toUpperCase(),
        discountPercent: dto.discountPercent,
        discountFlat: dto.discountFlat,
          minOrderValue: dto.minOrderValue,
          isPublic: dto.isPublic || false,
          maxUses: dto.maxUses || 100,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
      },
    });
  }

  async deleteCoupon(managerId: string, couponId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
      include: { workspace: true },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (coupon.workspace.managerId !== managerId) throw new ForbiddenException();

    return this.prisma.coupon.delete({ where: { id: couponId } });
  }

  // ── QR Codes ──────────────────────────────────────────────────────

  async generateQrCode(managerId: string, workspaceId: string, deskId?: string) {
    await this.assertOwner(managerId, workspaceId);
    return this.prisma.qrCode.create({
      data: { workspaceId, deskId: deskId || null },
    });
  }

  // ── Staff Codes ───────────────────────────────────────────────────

  async generateStaffCode(managerId: string, _dto?: GenerateStaffCodeDto) {
    const code = randomBytes(4).toString('hex').toUpperCase(); // 8-char hex
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // valid 7 days

    return this.prisma.staffCode.create({
      data: { managerId, code, expiresAt },
    });
  }

  async getMyStaff(managerId: string) {
    return this.prisma.staff.findMany({
      where: { managerId },
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        workspace: { select: { id: true, name: true } },
      },
    });
  }

  // ── Manager dashboard stats ───────────────────────────────────────

  async getManagerDashboard(managerId: string) {
    const [workspaces, totalBookings, pendingBookings, revenue] = await Promise.all([
      this.prisma.workspace.count({ where: { managerId } }),
      this.prisma.booking.count({
        where: { workspace: { managerId } },
      }),
      this.prisma.booking.count({
        where: { workspace: { managerId }, status: 'PENDING' },
      }),
      this.prisma.booking.aggregate({
        where: {
          workspace: { managerId },
          status: 'CONFIRMED',
        },
        _sum: { finalAmount: true },
      }),
    ]);

    return {
      workspaces,
      totalBookings,
      pendingBookings,
      totalRevenue: revenue._sum.finalAmount || 0,
    };
  }

  async findMyWorkspaces(managerId: string) {
    return this.prisma.workspace.findMany({
      where: { managerId },
      include: {
        images: { orderBy: { order: 'asc' } },
        pricingPlans: { orderBy: { type: 'asc' } },
        workingHours: true,
        _count: { select: { desks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWorkspaceCoupons(managerId: string, workspaceId: string) {
    await this.assertOwner(managerId, workspaceId);
    return this.prisma.coupon.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private async assertOwner(managerId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    if (workspace.managerId !== managerId) throw new ForbiddenException('Not your workspace');
    return workspace;
  }
}


