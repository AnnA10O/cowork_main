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
exports.UsersModule = exports.UsersController = exports.UsersService = void 0;
const class_validator_1 = require("class-validator");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const decorators_1 = require("../common/decorators");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
class UpdateProfileDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "preferredLang", void 0);
class CreateFeedbackDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFeedbackDto.prototype, "workspaceId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateFeedbackDto.prototype, "bookingId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], CreateFeedbackDto.prototype, "rating", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateFeedbackDto.prototype, "comment", void 0);
class WarnCustomerDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WarnCustomerDto.prototype, "customerId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WarnCustomerDto.prototype, "reason", void 0);
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(userId) {
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
    async updateProfile(userId, dto) {
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
    async submitFeedback(userId, dto) {
        const customer = await this.prisma.customer.findUnique({ where: { userId } });
        if (!customer)
            throw new common_2.NotFoundException('Customer profile not found');
        if (dto.bookingId) {
            const existing = await this.prisma.feedback.findFirst({
                where: { customerId: customer.id, bookingId: dto.bookingId },
            });
            if (existing)
                return existing;
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
    async getWorkspaceFeedbacks(workspaceId) {
        return this.prisma.feedback.findMany({
            where: { workspaceId, isPublic: true },
            include: {
                customer: { include: { user: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async warnCustomer(managerId, dto) {
        const manager = await this.prisma.manager.findUnique({
            where: { id: managerId },
            include: { user: { select: { id: true } } },
        });
        if (!manager)
            throw new common_2.NotFoundException('Manager not found');
        return this.prisma.customerWarning.create({
            data: {
                customerId: dto.customerId,
                issuedBy: manager.user.id,
                reason: dto.reason,
            },
        });
    }
    async getLoyaltyPoints(userId) {
        const customer = await this.prisma.customer.findUnique({
            where: { userId },
            select: { loyaltyPoints: true, referralCode: true },
        });
        return customer;
    }
    async updateManagerProfile(userId, data) {
        return this.prisma.manager.update({
            where: { userId },
            data,
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_2.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    getProfile(user) {
        return this.usersService.getProfile(user.id);
    }
    updateProfile(user, dto) {
        return this.usersService.updateProfile(user.id, dto);
    }
    getLoyaltyPoints(user) {
        return this.usersService.getLoyaltyPoints(user.id);
    }
    updateManagerProfile(user, data) {
        return this.usersService.updateManagerProfile(user.id, data);
    }
    submitFeedback(user, dto) {
        return this.usersService.submitFeedback(user.id, dto);
    }
    getWorkspaceFeedbacks(workspaceId) {
        return this.usersService.getWorkspaceFeedbacks(workspaceId);
    }
    warnCustomer(user, dto) {
        return this.usersService.warnCustomer(user.managerProfile.id, dto);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Get)('me/loyalty'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getLoyaltyPoints", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Patch)('me/manager-profile'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateManagerProfile", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Post)('feedback'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateFeedbackDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "submitFeedback", null);
__decorate([
    (0, common_1.Get)('feedback/:workspaceId'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getWorkspaceFeedbacks", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Post)('warn-customer'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, WarnCustomerDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "warnCustomer", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [UsersService])
], UsersController);
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        controllers: [UsersController],
        providers: [UsersService],
        exports: [UsersService],
    })
], UsersModule);
//# sourceMappingURL=users.module.js.map