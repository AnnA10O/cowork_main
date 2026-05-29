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
exports.StaffModule = exports.StaffController = exports.StaffService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const decorators_1 = require("../common/decorators");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
class UpdateProfileDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "name", void 0);
let StaffService = class StaffService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(userId) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, name: true, email: true,
                staffProfile: {
                    include: {
                        workspace: { select: { id: true, name: true, address: true } },
                        manager: { include: { user: { select: { name: true, email: true } } } },
                    },
                },
            },
        });
    }
    async getDashboard(staffId) {
        const [openIssues, resolvedToday] = await Promise.all([
            this.prisma.issueAssignment.count({ where: { staffId, resolvedAt: null } }),
            this.prisma.issueAssignment.count({
                where: {
                    staffId,
                    resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                },
            }),
        ]);
        return { openIssues, resolvedToday };
    }
    async getAssignedWorkspace(staffId) {
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
};
exports.StaffService = StaffService;
exports.StaffService = StaffService = __decorate([
    (0, common_2.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StaffService);
let StaffController = class StaffController {
    constructor(staffService) {
        this.staffService = staffService;
    }
    getProfile(user) {
        return this.staffService.getProfile(user.id);
    }
    getDashboard(user) {
        return this.staffService.getDashboard(user.staffProfile.id);
    }
    getWorkspace(user) {
        return this.staffService.getAssignedWorkspace(user.staffProfile.id);
    }
};
exports.StaffController = StaffController;
__decorate([
    (0, decorators_1.Roles)(client_1.Role.STAFF),
    (0, common_1.Get)('profile'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "getProfile", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.STAFF),
    (0, common_1.Get)('dashboard'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "getDashboard", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.STAFF),
    (0, common_1.Get)('workspace'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "getWorkspace", null);
exports.StaffController = StaffController = __decorate([
    (0, common_1.Controller)('staff'),
    __metadata("design:paramtypes", [StaffService])
], StaffController);
let StaffModule = class StaffModule {
};
exports.StaffModule = StaffModule;
exports.StaffModule = StaffModule = __decorate([
    (0, common_1.Module)({
        controllers: [StaffController],
        providers: [StaffService],
        exports: [StaffService],
    })
], StaffModule);
//# sourceMappingURL=staff.module.js.map