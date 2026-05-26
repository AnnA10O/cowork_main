import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWorkspaceDto, CreateDeskDto, CreatePricingPlanDto,
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
    page?: number;
    limit?: number;
  }) {
    const { city, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { status: WorkspaceStatus.ACTIVE };
    if (city)   where.city = { contains: city, mode: 'insensitive' };
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [workspaces, total] = await Promise.all([
      this.prisma.workspace.findMany({
        where, skip, take: limit,
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          pricingPlans: { where: { isActive: true } },
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
        pricingPlans: { where: { isActive: true } },
        workingHours: true,
        desks: { where: { isActive: true }, orderBy: { deskNumber: 'asc' } },
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
        amenities: dto.amenities || [],
        workingHours: {
          create: dto.workingHours,
        },
      },
      include: { workingHours: true },
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

  // ── Images (max 4) ────────────────────────────────────────────────

  async addImage(managerId: string, workspaceId: string, imageUrl: string, order: number) {
    await this.assertOwner(managerId, workspaceId);

    const count = await this.prisma.workspaceImage.count({ where: { workspaceId } });
    if (count >= 4) throw new BadRequestException('Maximum 4 images allowed per workspace');

    return this.prisma.workspaceImage.create({
      data: { workspaceId, url: imageUrl, order },
    });
  }

  async removeImage(managerId: string, imageId: string) {
    const image = await this.prisma.workspaceImage.findUnique({
      where: { id: imageId },
      include: { workspace: true },
    });
    if (!image) throw new NotFoundException('Image not found');
    if (image.workspace.managerId !== managerId) throw new ForbiddenException();

    await this.prisma.workspaceImage.delete({ where: { id: imageId } });
    return { message: 'Image removed' };
  }

  // ── Desks ─────────────────────────────────────────────────────────

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

  async getDeskAvailability(workspaceId: string, date: string) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

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

    return desks.map((desk) => ({
      ...desk,
      isAvailable: desk.bookings.length === 0,
    }));
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
        maxUses: dto.maxUses || 100,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
      },
    });
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
      this.prisma.payment.aggregate({
        where: {
          booking: { workspace: { managerId } },
          status: 'SUCCESS',
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      workspaces,
      totalBookings,
      pendingBookings,
      totalRevenue: revenue._sum.amount || 0,
    };
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
