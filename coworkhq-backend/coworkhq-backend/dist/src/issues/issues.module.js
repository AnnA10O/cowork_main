"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssuesModule = exports.IssuesController = exports.IssuesService = void 0;
const class_validator_1 = require("class-validator");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const notifications_module_1 = require("../notifications/notifications.module");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const decorators_1 = require("../common/decorators");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
class ReportIssueDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReportIssueDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ReportIssueDto.prototype, "qrCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ReportIssueDto.prototype, "workspaceId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ReportIssueDto.prototype, "deskId", void 0);
class ResolveIssueDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ResolveIssueDto.prototype, "note", void 0);
let IssuesService = class IssuesService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async reportViaQr(qrCode, description, reportedBy) {
        const qr = await this.prisma.qrCode.findUnique({
            where: { code: qrCode },
        });
        if (!qr || !qr.isActive)
            throw new common_2.NotFoundException('Invalid QR code');
        const issue = await this.prisma.issue.create({
            data: {
                qrCodeId: qr.id,
                workspaceId: qr.workspaceId,
                deskId: qr.deskId,
                reportedBy,
                description,
                status: 'OPEN',
            },
        });
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: qr.workspaceId },
            include: { staff: { where: { workspaceId: qr.workspaceId, isActive: true }, take: 1, include: { user: true } } },
        });
        let assignedStaffUserId = null;
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
    async getIssues(workspaceId, status) {
        return this.prisma.issue.findMany({
            where: {
                workspaceId,
                ...(status && { status: status }),
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
    async resolve(issueId, staffId, note) {
        const assignment = await this.prisma.issueAssignment.findFirst({
            where: { issueId, staffId },
        });
        if (!assignment)
            throw new common_2.ForbiddenException('Issue not assigned to you');
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
        const issue = await this.prisma.issue.findUnique({ where: { id: issueId } });
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: issue.workspaceId },
            include: { manager: { include: { user: true } } },
        });
        if (workspace?.manager?.user) {
            await this.notifications.send(workspace.manager.user.id, {
                title: 'Issue Resolved ✅',
                body: `Issue resolved by staff. Note: ${note.substring(0, 80)}`,
                type: 'issue_resolved',
                data: { issueId },
            });
        }
        return { message: 'Issue marked as resolved' };
    }
    async getMyIssues(staffId) {
        return this.prisma.issueAssignment.findMany({
            where: { staffId, resolvedAt: null },
            include: {
                issue: true,
            },
            orderBy: { assignedAt: 'desc' },
        });
    }
    async escalate(issueId, managerId) {
        const issue = await this.prisma.issue.findUnique({ where: { id: issueId } });
        if (!issue)
            throw new common_2.NotFoundException();
        return this.prisma.issue.update({
            where: { id: issueId },
            data: { status: 'ESCALATED' },
        });
    }
};
exports.IssuesService = IssuesService;
exports.IssuesService = IssuesService = __decorate([
    (0, common_2.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], IssuesService);
let IssuesController = class IssuesController {
    constructor(issuesService) {
        this.issuesService = issuesService;
    }
    reportViaQr(qrCode, dto, user) {
        return this.issuesService.reportViaQr(qrCode, dto.description, user?.customerProfile?.id);
    }
    getIssues(workspaceId, status) {
        return this.issuesService.getIssues(workspaceId, status);
    }
    getMyIssues(user) {
        return this.issuesService.getMyIssues(user.staffProfile.id);
    }
    resolve(user, id, dto) {
        return this.issuesService.resolve(id, user.staffProfile.id, dto.note);
    }
    escalate(user, id) {
        return this.issuesService.escalate(id, user.managerProfile.id);
    }
};
exports.IssuesController = IssuesController;
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Post)('qr/:qrCode'),
    __param(0, (0, common_1.Param)('qrCode')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ReportIssueDto, Object]),
    __metadata("design:returntype", void 0)
], IssuesController.prototype, "reportViaQr", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER, client_1.Role.STAFF),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('workspaceId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], IssuesController.prototype, "getIssues", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.STAFF),
    (0, common_1.Get)('my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IssuesController.prototype, "getMyIssues", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.STAFF),
    (0, common_1.Patch)(':id/resolve'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, ResolveIssueDto]),
    __metadata("design:returntype", void 0)
], IssuesController.prototype, "resolve", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Patch)(':id/escalate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], IssuesController.prototype, "escalate", null);
exports.IssuesController = IssuesController = __decorate([
    (0, common_1.Controller)('issues'),
    __metadata("design:paramtypes", [IssuesService])
], IssuesController);
let IssuesModule = class IssuesModule {
};
exports.IssuesModule = IssuesModule;
exports.IssuesModule = IssuesModule = __decorate([
    (0, common_1.Module)({
        imports: [notifications_module_1.NotificationsModule],
        controllers: [IssuesController],
        providers: [IssuesService],
        exports: [IssuesService],
    })
], IssuesModule);
//# sourceMappingURL=issues.module.js.map