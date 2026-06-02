import { IsString, IsInt, Min, Max, IsOptional, IsBoolean } from 'class-validator';
import { Controller, Get, Post, Patch, Body, Param, Query, Module } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// ── DTOs ──────────────────────────────────────────────────────────────

class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  preferredLang?: string;
}

class CreateFeedbackDto {
  @IsString()
  workspaceId: string;

  @IsString()
  @IsOptional()
  bookingId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}

class WarnCustomerDto {
  @IsString()
  customerId: string;

  @IsString()
  reason: string;
}

// ── Service ───────────────────────────────────────────────────────────

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, role: true, createdAt: true,
        customerProfile: {
          select: { id: true, loyaltyPoints: true, referralCode: true, preferredLang: true },
        },
        managerProfile: {
          select: {
            id: true, businessName: true, gstNumber: true,
            platformFeeDue: true, totalPaid: true,
          },
        },
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name, phone: dto.phone },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (dto.preferredLang) {
      await this.prisma.customer.updateMany({
        where: { userId },
        data: { preferredLang: dto.preferredLang },
      });
    }
    return user;
  }

  // ── Feedback ──────────────────────────────────────────────────────

  async submitFeedback(userId: string, dto: CreateFeedbackDto) {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer profile not found');

    // Prevent duplicate feedback per booking
    if (dto.bookingId) {
      const existing = await this.prisma.feedback.findFirst({
        where: { customerId: customer.id, bookingId: dto.bookingId },
      });
      if (existing) return existing;
    }

    return this.prisma.feedback.create({
      data: {
        customerId: customer.id,
        workspaceId: dto.workspaceId,
        bookingId: dto.bookingId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  async getWorkspaceFeedbacks(workspaceId: string) {
    return this.prisma.feedback.findMany({
      where: { workspaceId, isPublic: true },
      include: {
        customer: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Manager warns customer ────────────────────────────────────────

  async warnCustomer(managerId: string, dto: WarnCustomerDto) {
    const manager = await this.prisma.manager.findUnique({
      where: { id: managerId },
      include: { user: { select: { id: true } } },
    });
    if (!manager) throw new NotFoundException('Manager not found');

    return this.prisma.customerWarning.create({
      data: {
        customerId: dto.customerId,
        issuedBy: manager.user.id,
        reason: dto.reason,
      },
    });
  }

  // ── Loyalty Points ────────────────────────────────────────────────

  async getLoyaltyPoints(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
      select: { loyaltyPoints: true, referralCode: true },
    });
    return customer;
  }

  // ── Manager updates business profile ─────────────────────────────

  async updateManagerProfile(userId: string, data: {
    businessName?: string;
    gstNumber?: string;
    panNumber?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
  }) {
    return this.prisma.manager.update({
      where: { userId },
      data,
    });
  }

  async getManagerCustomers(managerId: string) {
    const manager = await this.prisma.manager.findUnique({
      where: { id: managerId },
      select: { userId: true },
    });
    const managerUserId = manager?.userId || '';

    const customerBookings = await this.prisma.booking.findMany({
      where: {
        workspace: {
          managerId,
        },
      },
      select: {
        customerId: true,
      },
      distinct: ['customerId'],
    });

    const customerIds = customerBookings.map((b) => b.customerId);

    return this.prisma.customer.findMany({
      where: {
        id: {
          in: customerIds,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        warnings: {
          where: {
            issuedBy: managerUserId,
          },
        },
      },
    });
  }
}

// ── Controller ────────────────────────────────────────────────────────

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /** GET /users/me */
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  /** PATCH /users/me */
  @Patch('me')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  /** GET /users/me/loyalty */
  @Roles(Role.CUSTOMER)
  @Get('me/loyalty')
  getLoyaltyPoints(@CurrentUser() user: any) {
    return this.usersService.getLoyaltyPoints(user.id);
  }

  /** PATCH /users/me/manager-profile — Manager updates business details */
  @Roles(Role.MANAGER)
  @Patch('me/manager-profile')
  updateManagerProfile(@CurrentUser() user: any, @Body() data: any) {
    return this.usersService.updateManagerProfile(user.id, data);
  }

  /** POST /users/feedback — Customer submits feedback */
  @Roles(Role.CUSTOMER)
  @Post('feedback')
  submitFeedback(@CurrentUser() user: any, @Body() dto: CreateFeedbackDto) {
    return this.usersService.submitFeedback(user.id, dto);
  }

  /** GET /users/feedback/:workspaceId — Public workspace feedbacks */
  @Get('feedback/:workspaceId')
  getWorkspaceFeedbacks(@Param('workspaceId') workspaceId: string) {
    return this.usersService.getWorkspaceFeedbacks(workspaceId);
  }

  /** POST /users/warn-customer — Manager warns a customer */
  @Roles(Role.MANAGER)
  @Post('warn-customer')
  warnCustomer(@CurrentUser() user: any, @Body() dto: WarnCustomerDto) {
    return this.usersService.warnCustomer(user.managerProfile.id, dto);
  }

  /** GET /users/manager/customers — Manager's customers roster */
  @Roles(Role.MANAGER)
  @Get('manager/customers')
  getManagerCustomers(@CurrentUser() user: any) {
    return this.usersService.getManagerCustomers(user.managerProfile.id);
  }
}

// ── Module ────────────────────────────────────────────────────────────

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
