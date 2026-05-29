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
exports.MobileController = exports.VerifyPaymentDto = void 0;
const common_1 = require("@nestjs/common");
const mobile_service_1 = require("./mobile.service");
const decorators_1 = require("../common/decorators");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const auth_dto_1 = require("../auth/auth.dto");
const bookings_controller_1 = require("../bookings/bookings.controller");
class VerifyPaymentDto {
}
exports.VerifyPaymentDto = VerifyPaymentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyPaymentDto.prototype, "razorpay_order_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyPaymentDto.prototype, "razorpay_payment_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyPaymentDto.prototype, "razorpay_signature", void 0);
let MobileController = class MobileController {
    constructor(mobileService) {
        this.mobileService = mobileService;
    }
    register(dto) {
        return this.mobileService.register(dto);
    }
    login(dto) {
        return this.mobileService.login(dto);
    }
    refresh(dto) {
        return this.mobileService.refreshToken(dto.refreshToken);
    }
    getProfile(user) {
        return user;
    }
    changePassword(userId, dto) {
        return this.mobileService.changePassword(userId, dto);
    }
    findAllWorkspaces(query) {
        return this.mobileService.findWorkspaces(query);
    }
    findWorkspace(id) {
        return this.mobileService.findWorkspace(id);
    }
    getDeskAvailability(id, date) {
        return this.mobileService.getDeskAvailability(id, date);
    }
    createBooking(user, dto) {
        return this.mobileService.createBooking(user.customerProfile.id, dto);
    }
    getMyBookings(user, status) {
        return this.mobileService.getMyBookings(user.customerProfile.id, status);
    }
    getOneBooking(user, id) {
        return this.mobileService.getOneBooking(id, user.id);
    }
    cancelBooking(user, id) {
        return this.mobileService.cancelBooking(id, user.customerProfile.id);
    }
    rescheduleBooking(user, id, dto) {
        return this.mobileService.rescheduleBooking(id, user.customerProfile.id, dto);
    }
    createPaymentOrder(bookingId) {
        return this.mobileService.createPaymentOrder(bookingId);
    }
    verifyPayment(dto) {
        return this.mobileService.verifyPayment(dto);
    }
};
exports.MobileController = MobileController;
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Post)('auth/register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RegisterDto]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "register", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Post)('auth/login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "login", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Post)('auth/refresh'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "refresh", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Get)('auth/profile'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "getProfile", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Patch)('auth/change-password'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, auth_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "changePassword", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Get)('workspaces'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "findAllWorkspaces", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Get)('workspaces/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "findWorkspace", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Get)('workspaces/:id/availability'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "getDeskAvailability", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Post)('bookings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, bookings_controller_1.CreateBookingDto]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "createBooking", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Get)('bookings/my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "getMyBookings", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Get)('bookings/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "getOneBooking", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Patch)('bookings/:id/cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "cancelBooking", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Patch)('bookings/:id/reschedule'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, bookings_controller_1.RescheduleBookingDto]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "rescheduleBooking", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Post)('payments/order/:bookingId'),
    __param(0, (0, common_1.Param)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "createPaymentOrder", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Post)('payments/verify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyPaymentDto]),
    __metadata("design:returntype", void 0)
], MobileController.prototype, "verifyPayment", null);
exports.MobileController = MobileController = __decorate([
    (0, common_1.Controller)('mobile'),
    __metadata("design:paramtypes", [mobile_service_1.MobileService])
], MobileController);
//# sourceMappingURL=mobile.controller.js.map