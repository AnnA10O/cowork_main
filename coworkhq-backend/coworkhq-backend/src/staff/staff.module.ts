import { Controller, Get, Patch, Body, Param, Module } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// ── DTOs ──────────────────────────────────────────────────────────────

class UpdateProfileDto {
  @IsString()
  name: string;
}

// ── Service ───────────────────────────────────────────────────────────

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true,
        staffProfile: {
          include: {
            workspace: { select: { id: true, name: true, address: true } },
            manager:   { include: { user: { select: { name: true, email: true } } } },
          },
        },
      },
    });
  }

  async getDashboard(staffId: string) {
    const [openIssues, resolvedToday] = await Promise.all([
      this.prisma.issueAssignment.count({ where: { staffId, resolvedAt: null } }),
      this.prisma.issueAssignment.count({
        where: {
          staffId,
          resolvedAt: { gte: new Date(new Date().setHours(0,0,0,0)) },
        },
      }),
    ]);
    return { openIssues, resolvedToday };
  }

  async getAssignedWorkspace(staffId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        workspace: {
          include: {
            desks: { where: { isActive: true } },
            workingHours: true,
          },
        },
      },
    });
    return staff?.workspace;
  }
}

// ── Controller ────────────────────────────────────────────────────────

@Controller('staff')
export class StaffController {
  constructor(private staffService: StaffService) {}

  /** GET /staff/profile */
  @Roles(Role.STAFF)
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.staffService.getProfile(user.id);
  }

  /** GET /staff/dashboard */
  @Roles(Role.STAFF)
  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.staffService.getDashboard(user.staffProfile.id);
  }

  /** GET /staff/workspace */
  @Roles(Role.STAFF)
  @Get('workspace')
  getWorkspace(@CurrentUser() user: any) {
    return this.staffService.getAssignedWorkspace(user.staffProfile.id);
  }
}

// ── Module ────────────────────────────────────────────────────────────

@Module({
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
