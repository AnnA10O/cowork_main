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
exports.AdminModule = exports.ManagerFeedbackController = exports.AdminController = exports.AdminService = void 0;
const class_validator_1 = require("class-validator");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const decorators_1 = require("../common/decorators");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const notifications_module_1 = require("../notifications/notifications.module");
class BanUserDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BanUserDto.prototype, "reason", void 0);
class AdminFeedbackResponseDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminFeedbackResponseDto.prototype, "adminNote", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], AdminFeedbackResponseDto.prototype, "isResolved", void 0);
class CreateManagerFeedbackDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateManagerFeedbackDto.prototype, "subject", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateManagerFeedbackDto.prototype, "message", void 0);
let AdminService = class AdminService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async getDashboard() {
        const [totalUsers, totalManagers, totalCustomers, totalWorkspaces, totalBookings, totalRevenue, pendingFees, openIssues] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { role: 'MANAGER' } }),
            this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
            this.prisma.workspace.count(),
            this.prisma.booking.count(),
            this.prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
            this.prisma.platformFeePayment.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
            this.prisma.issue.count({ where: { status: 'OPEN' } }),
        ]);
        return {
            users: { total: totalUsers, managers: totalManagers, customers: totalCustomers },
            workspaces: totalWorkspaces, bookings: totalBookings,
            revenue: totalRevenue._sum.amount || 0,
            pendingPlatformFees: pendingFees._sum.amount || 0,
            openIssues,
        };
    }
    async getAllUsers(role, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const where = {};
        if (role)
            where.role = role;
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where, skip, take: limit,
                select: {
                    id: true, name: true, email: true, phone: true, role: true,
                    isActive: true, isBanned: true, bannedReason: true, createdAt: true,
                    managerProfile: { select: { id: true, businessName: true, platformFeeDue: true } },
                    customerProfile: { select: { id: true, loyaltyPoints: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);
        return { users, total, page, limit };
    }
    async banUser(adminId, targetUserId, reason) {
        const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!target)
            throw new common_2.NotFoundException('User not found');
        if (target.role === client_1.Role.ADMIN)
            throw new common_2.ForbiddenException('Cannot ban another admin');
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
    async unbanUser(targetUserId) {
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
    async getAllWorkspaces(city, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const where = {};
        if (city)
            where.city = { contains: city, mode: 'insensitive' };
        return this.prisma.workspace.findMany({
            where, skip, take: limit,
            include: {
                manager: { include: { user: { select: { name: true, email: true } } } },
                _count: { select: { bookings: true, desks: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async suspendWorkspace(workspaceId) {
        return this.prisma.workspace.update({ where: { id: workspaceId }, data: { status: 'SUSPENDED' } });
    }
    async getFeedbacks(resolved) {
        const where = {};
        if (resolved !== undefined)
            where.isResolved = resolved;
        return this.prisma.managerFeedback.findMany({
            where,
            include: { manager: { include: { user: { select: { name: true, email: true } } } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async respondFeedback(feedbackId, dto) {
        return this.prisma.managerFeedback.update({
            where: { id: feedbackId },
            data: { adminNote: dto.adminNote, isResolved: dto.isResolved ?? true },
        });
    }
    async getPlatformFees(status) {
        return this.prisma.platformFeePayment.findMany({
            where: status ? { status: status } : undefined,
            include: { manager: { include: { user: { select: { name: true, email: true } } } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getOccupancyAnalytics(city) {
        const workspaces = await this.prisma.workspace.findMany({
            where: city ? { city } : undefined,
            include: {
                bookings: { where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, status: 'CONFIRMED' } },
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
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_2.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], AdminService);
let AdminController = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    getDashboard() { return this.adminService.getDashboard(); }
    getUsers(role, page) { return this.adminService.getAllUsers(role, page); }
    banUser(user, id, dto) { return this.adminService.banUser(user.id, id, dto.reason); }
    unbanUser(id) { return this.adminService.unbanUser(id); }
    getWorkspaces(city, page) { return this.adminService.getAllWorkspaces(city, page); }
    suspendWorkspace(id) { return this.adminService.suspendWorkspace(id); }
    getFeedbacks(resolved) { return this.adminService.getFeedbacks(resolved !== undefined ? resolved === 'true' : undefined); }
    respondFeedback(id, dto) { return this.adminService.respondFeedback(id, dto); }
    getPlatformFees(status) { return this.adminService.getPlatformFees(status); }
    getOccupancyAnalytics(city) { return this.adminService.getOccupancyAnalytics(city); }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)('role')),
    __param(1, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Patch)('users/:id/ban'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, BanUserDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "banUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/unban'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "unbanUser", null);
__decorate([
    (0, common_1.Get)('workspaces'),
    __param(0, (0, common_1.Query)('city')),
    __param(1, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getWorkspaces", null);
__decorate([
    (0, common_1.Patch)('workspaces/:id/suspend'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "suspendWorkspace", null);
__decorate([
    (0, common_1.Get)('feedbacks'),
    __param(0, (0, common_1.Query)('resolved')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getFeedbacks", null);
__decorate([
    (0, common_1.Patch)('feedbacks/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AdminFeedbackResponseDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "respondFeedback", null);
__decorate([
    (0, common_1.Get)('platform-fees'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPlatformFees", null);
__decorate([
    (0, common_1.Get)('analytics/occupancy'),
    __param(0, (0, common_1.Query)('city')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getOccupancyAnalytics", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, decorators_1.Roles)(client_1.Role.ADMIN),
    __metadata("design:paramtypes", [AdminService])
], AdminController);
let ManagerFeedbackController = class ManagerFeedbackController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    submitFeedback(user, dto) {
        return this.prisma.managerFeedback.create({
            data: { managerId: user.managerProfile.id, subject: dto.subject, message: dto.message },
        });
    }
};
exports.ManagerFeedbackController = ManagerFeedbackController;
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateManagerFeedbackDto]),
    __metadata("design:returntype", void 0)
], ManagerFeedbackController.prototype, "submitFeedback", null);
exports.ManagerFeedbackController = ManagerFeedbackController = __decorate([
    (0, common_1.Controller)('manager-feedback'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ManagerFeedbackController);
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [notifications_module_1.NotificationsModule],
        controllers: [AdminController, ManagerFeedbackController],
        providers: [AdminService],
        exports: [AdminService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map