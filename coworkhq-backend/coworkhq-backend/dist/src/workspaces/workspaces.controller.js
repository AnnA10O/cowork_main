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
exports.WorkspacesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const client_1 = require("@prisma/client");
const workspaces_service_1 = require("./workspaces.service");
const workspaces_dto_1 = require("./workspaces.dto");
const decorators_1 = require("../common/decorators");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let WorkspacesController = class WorkspacesController {
    constructor(workspacesService) {
        this.workspacesService = workspacesService;
    }
    findAll(query) {
        return this.workspacesService.findAll(query);
    }
    findOne(id) {
        return this.workspacesService.findOne(id);
    }
    getDeskAvailability(id, date) {
        return this.workspacesService.getDeskAvailability(id, date);
    }
    create(user, dto) {
        return this.workspacesService.create(user.managerProfile.id, dto);
    }
    update(user, id, dto) {
        return this.workspacesService.update(user.managerProfile.id, id, dto);
    }
    deactivate(user, id) {
        return this.workspacesService.deactivate(user.managerProfile.id, id);
    }
    addImages(user, id, files) {
        return { message: `${files?.length || 0} image(s) uploaded`, files: files?.map(f => f.originalname) };
    }
    removeImage(user, imageId) {
        return this.workspacesService.removeImage(user.managerProfile.id, imageId);
    }
    addDesk(user, id, dto) {
        return this.workspacesService.addDesk(user.managerProfile.id, id, dto);
    }
    updateDesk(user, deskId, dto) {
        return this.workspacesService.updateDesk(user.managerProfile.id, deskId, dto);
    }
    createPricingPlan(user, id, dto) {
        return this.workspacesService.createPricingPlan(user.managerProfile.id, id, dto);
    }
    updatePricingPlan(user, planId, dto) {
        return this.workspacesService.updatePricingPlan(user.managerProfile.id, planId, dto);
    }
    createCoupon(user, id, dto) {
        return this.workspacesService.createCoupon(user.managerProfile.id, id, dto);
    }
    generateQr(user, id, deskId) {
        return this.workspacesService.generateQrCode(user.managerProfile.id, id, deskId);
    }
    generateStaffCode(user, dto) {
        return this.workspacesService.generateStaffCode(user.managerProfile.id, dto);
    }
    getMyStaff(user) {
        return this.workspacesService.getMyStaff(user.managerProfile.id);
    }
    getManagerDashboard(user) {
        return this.workspacesService.getManagerDashboard(user.managerProfile.id);
    }
};
exports.WorkspacesController = WorkspacesController;
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "findAll", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "findOne", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Get)(':id/availability'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "getDeskAvailability", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, workspaces_dto_1.CreateWorkspaceDto]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "create", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "update", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "deactivate", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Post)(':id/images'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 4)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Array]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "addImages", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Delete)('images/:imageId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('imageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "removeImage", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Post)(':id/desks'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, workspaces_dto_1.CreateDeskDto]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "addDesk", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Patch)('desks/:deskId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('deskId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "updateDesk", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Post)(':id/pricing'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, workspaces_dto_1.CreatePricingPlanDto]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "createPricingPlan", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Patch)('pricing/:planId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('planId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, workspaces_dto_1.UpdatePricingPlanDto]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "updatePricingPlan", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Post)(':id/coupons'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, workspaces_dto_1.CreateCouponDto]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "createCoupon", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Post)(':id/qr'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('deskId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "generateQr", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Post)('staff-codes/generate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, workspaces_dto_1.GenerateStaffCodeDto]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "generateStaffCode", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Get)('staff-codes/my-staff'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "getMyStaff", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Get)('manager/dashboard'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "getManagerDashboard", null);
exports.WorkspacesController = WorkspacesController = __decorate([
    (0, common_1.Controller)('workspaces'),
    __metadata("design:paramtypes", [workspaces_service_1.WorkspacesService])
], WorkspacesController);
//# sourceMappingURL=workspaces.controller.js.map