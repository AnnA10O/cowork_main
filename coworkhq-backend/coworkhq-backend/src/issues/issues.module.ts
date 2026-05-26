import { IsString, IsOptional } from 'class-validator';
import {
  Controller, Get, Post, Patch, Body, Param, Query, Module,
} from '@nestjs/common';
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Roles, Public } from '../common/decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// ── DTOs ──────────────────────────────────────────────────────────────

class ReportIssueDto {
  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  qrCode?: string; // QR code value scanned by customer

  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  deskId?: string;
}

class ResolveIssueDto {
  @IsString()
  note: string;
}

// ── Service ───────────────────────────────────────────────────────────

@Injectable()
export class IssuesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // Customer scans QR and reports issue (can be without login too)
  async reportViaQr(qrCode: string, description: string, reportedBy?: string) {
    const qr = await this.prisma.qrCode.findUnique({
      where: { code: qrCode },
    });
    if (!qr || !qr.isActive) throw new NotFoundException('Invalid QR code');

    const issue = await this.prisma.issue.create({
      data: {
        qrCodeId:   qr.id,
        workspaceId: qr.workspaceId,
        deskId:     qr.deskId,
        reportedBy,
        description,
        status:     'OPEN',
      },
    });

    // Find manager of this workspace and assign staff
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: qr.workspaceId },
      include: { staff: { where: { workspaceId: qr.workspaceId, isActive: true }, take: 1, include: { user: true } } },
    });

    let assignedStaffUserId: string | null = null;

    if (workspace?.staff?.length > 0) {
      const staffMember = workspace.staff[0];
      await this.prisma.issueAssignment.create({
        data: { issueId: issue.id, staffId: staffMember.id },
      });
      assignedStaffUserId = staffMember.user.id;
    }

    await this.notifications.sendIssueAlert(workspace.managerId, assignedStaffUserId, issue);
    return issue;
  }

  // Staff or Manager: get issues for their workspace
  async getIssues(workspaceId: string, status?: string) {
    return this.prisma.issue.findMany({
      where: {
        workspaceId,
        ...(status && { status: status as any }),
      },
      include: {
        assignments: {
          include: {
            staff: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Staff resolves issue
  async resolve(issueId: string, staffId: string, note: string) {
    const assignment = await this.prisma.issueAssignment.findFirst({
      where: { issueId, staffId },
    });
    if (!assignment) throw new ForbiddenException('Issue not assigned to you');

    await this.prisma.$transaction([
      this.prisma.issueAssignment.update({
        where: { id: assignment.id },
        data: { resolvedAt: new Date(), note },
      }),
      this.prisma.issue.update({
        where: { id: issueId },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      }),
    ]);

    // Notify manager
    const issue = await this.prisma.issue.findUnique({ where: { id: issueId } });
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: issue.workspaceId },
      include: { manager: { include: { user: true } } },
    });

    if (workspace?.manager?.user) {
      await this.notifications.send(workspace.manager.user.id, {
        title: 'Issue Resolved ✅',
        body:  `Issue resolved by staff. Note: ${note.substring(0, 80)}`,
        type:  'issue_resolved',
        data:  { issueId },
      });
    }

    return { message: 'Issue marked as resolved' };
  }

  // Staff: my assigned issues
  async getMyIssues(staffId: string) {
    return this.prisma.issueAssignment.findMany({
      where: { staffId, resolvedAt: null },
      include: {
        issue: true,
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  // Manager: escalate to admin
  async escalate(issueId: string, managerId: string) {
    const issue = await this.prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) throw new NotFoundException();
    return this.prisma.issue.update({
      where: { id: issueId },
      data: { status: 'ESCALATED' },
    });
  }
}

// ── Controller ────────────────────────────────────────────────────────

@Controller('issues')
export class IssuesController {
  constructor(private issuesService: IssuesService) {}

  /** POST /issues/qr/:qrCode — public QR scan report (no auth required) */
  @Public()
  @Post('qr/:qrCode')
  reportViaQr(
    @Param('qrCode') qrCode: string,
    @Body() dto: ReportIssueDto,
    @CurrentUser() user?: any,
  ) {
    return this.issuesService.reportViaQr(
      qrCode, dto.description,
      user?.customerProfile?.id,
    );
  }

  /** GET /issues?workspaceId=xxx&status=OPEN — Manager/Staff */
  @Roles(Role.MANAGER, Role.STAFF)
  @Get()
  getIssues(@Query('workspaceId') workspaceId: string, @Query('status') status?: string) {
    return this.issuesService.getIssues(workspaceId, status);
  }

  /** GET /issues/my — Staff: my assigned issues */
  @Roles(Role.STAFF)
  @Get('my')
  getMyIssues(@CurrentUser() user: any) {
    return this.issuesService.getMyIssues(user.staffProfile.id);
  }

  /** PATCH /issues/:id/resolve — Staff resolves issue */
  @Roles(Role.STAFF)
  @Patch(':id/resolve')
  resolve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ResolveIssueDto,
  ) {
    return this.issuesService.resolve(id, user.staffProfile.id, dto.note);
  }

  /** PATCH /issues/:id/escalate — Manager escalates to Admin */
  @Roles(Role.MANAGER)
  @Patch(':id/escalate')
  escalate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.issuesService.escalate(id, user.managerProfile.id);
  }
}

// ── Module ────────────────────────────────────────────────────────────

@Module({
  imports: [NotificationsModule],
  controllers: [IssuesController],
  providers: [IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}
