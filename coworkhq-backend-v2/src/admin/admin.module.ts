import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Controller, Get, Patch, Post, Body, Param, Query, Module } from '@nestjs/common';
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsModule } from '../notifications/notifications.module';

class BanUserDto {
  @IsString() reason: string;
}

class AdminFeedbackResponseDto {
  @IsString() adminNote: string;
  @IsBoolean() @IsOptional() isResolved?: boolean;
}

class CreateManagerFeedbackDto {
  @IsString() subject: string;
  @IsString() message: string;
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async getDashboard() {
    const [totalUsers, totalManagers, totalCustomers, totalWorkspaces,
      totalBookings, totalRevenue, pendingFees, openIssues] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'MANAGER' } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.workspace.count(),
      this.prisma.booking.count(),
      this.prisma.booking.aggregate({ where: { status: 'CONFIRMED' }, _sum: { finalAmount: true } }),
      this.prisma.platformFeePayment.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
      this.prisma.issue.count({ where: { status: 'OPEN' } }),
    ]);
    return {
      users: { total: totalUsers, managers: totalManagers, customers: totalCustomers },
      workspaces: totalWorkspaces, bookings: totalBookings,
      revenue: totalRevenue._sum.finalAmount || 0,
      pendingPlatformFees: pendingFees._sum.amount || 0,
      openIssues,
    };
  }

  async getAllUsers(role?: Role, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (role) where.role = role;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip, take: limit,
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          isActive: true, isBanned: true, bannedReason: true, createdAt: true,
          managerProfile:  { select: { id: true, businessName: true, platformFeeDue: true } },
          customerProfile: { select: { id: true, loyaltyPoints: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total, page, limit };
  }

  async banUser(adminId: string, targetUserId: string, reason: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('User not found');
    if (target.role === Role.ADMIN) throw new ForbiddenException('Cannot ban another admin');
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isBanned: true, bannedReason: reason, bannedAt: new Date(), bannedBy: adminId },
    });
    await this.notifications.send(targetUserId, {
      title: 'Account Suspended',
      body: `Your account has been suspended: ${reason}`,
      type: 'account_banned', data: { reason },
    });
    return { message: 'User banned successfully' };
  }

  async unbanUser(targetUserId: string) {
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isBanned: false, bannedReason: null, bannedAt: null, bannedBy: null },
    });
    await this.notifications.send(targetUserId, {
      title: 'Account Reinstated',
      body: 'Your account suspension has been lifted.',
      type: 'account_unbanned', data: {},
    });
    return { message: 'User unbanned successfully' };
  }

  async getAllWorkspaces(city?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (city) where.city = { contains: city, mode: 'insensitive' };
    return this.prisma.workspace.findMany({
      where, skip, take: limit,
      include: {
        manager: { include: { user: { select: { name: true, email: true } } } },
        _count: { select: { bookings: true, desks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async suspendWorkspace(workspaceId: string) {
    return this.prisma.workspace.update({ where: { id: workspaceId }, data: { status: 'SUSPENDED' } });
  }

  async getFeedbacks(resolved?: boolean) {
    const where: any = {};
    if (resolved !== undefined) where.isResolved = resolved;
    return this.prisma.managerFeedback.findMany({
      where,
      include: { manager: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondFeedback(feedbackId: string, dto: AdminFeedbackResponseDto) {
    return this.prisma.managerFeedback.update({
      where: { id: feedbackId },
      data: { adminNote: dto.adminNote, isResolved: dto.isResolved ?? true },
    });
  }

  async getPlatformFees(status?: string) {
    return this.prisma.platformFeePayment.findMany({
      where: status ? { status: status as any } : undefined,
      include: { manager: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOccupancyAnalytics(city?: string) {
    const workspaces = await this.prisma.workspace.findMany({
      where: city ? { city } : undefined,
      include: {
        bookings: { where: { createdAt: { gte: new Date(Date.now() - 30*24*60*60*1000) }, status: 'CONFIRMED' } },
        desks: true,
      },
    });
    return workspaces.map((w) => ({
      id: w.id, name: w.name, city: w.city,
      totalDesks: w.desks.length,
      bookingsLast30: w.bookings.length,
      occupancyRate: w.desks.length > 0
        ? ((w.bookings.length / (w.desks.length * 30)) * 100).toFixed(1) + '%' : '0%',
    }));
  }
}

@Controller('admin')
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard') getDashboard() { return this.adminService.getDashboard(); }
  @Get('users') getUsers(@Query('role') role?: Role, @Query('page') page?: number) { return this.adminService.getAllUsers(role, page); }
  @Patch('users/:id/ban') banUser(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: BanUserDto) { return this.adminService.banUser(user.id, id, dto.reason); }
  @Patch('users/:id/unban') unbanUser(@Param('id') id: string) { return this.adminService.unbanUser(id); }
  @Get('workspaces') getWorkspaces(@Query('city') city?: string, @Query('page') page?: number) { return this.adminService.getAllWorkspaces(city, page); }
  @Patch('workspaces/:id/suspend') suspendWorkspace(@Param('id') id: string) { return this.adminService.suspendWorkspace(id); }
  @Get('feedbacks') getFeedbacks(@Query('resolved') resolved?: string) { return this.adminService.getFeedbacks(resolved !== undefined ? resolved === 'true' : undefined); }
  @Patch('feedbacks/:id') respondFeedback(@Param('id') id: string, @Body() dto: AdminFeedbackResponseDto) { return this.adminService.respondFeedback(id, dto); }
  @Get('platform-fees') getPlatformFees(@Query('status') status?: string) { return this.adminService.getPlatformFees(status); }
  @Get('analytics/occupancy') getOccupancyAnalytics(@Query('city') city?: string) { return this.adminService.getOccupancyAnalytics(city); }
}

@Controller('manager-feedback')
export class ManagerFeedbackController {
  constructor(private prisma: PrismaService) {}

  @Roles(Role.MANAGER)
  @Post()
  submitFeedback(@CurrentUser() user: any, @Body() dto: CreateManagerFeedbackDto) {
    return this.prisma.managerFeedback.create({
      data: { managerId: user.managerProfile.id, subject: dto.subject, message: dto.message },
    });
  }
}

@Module({
  imports: [NotificationsModule],
  controllers: [AdminController, ManagerFeedbackController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
