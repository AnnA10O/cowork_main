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
exports.BookingsController = exports.RescheduleBookingDto = exports.RejectBookingDto = exports.CreateBookingDto = void 0;
const class_validator_1 = require("class-validator");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bookings_service_1 = require("./bookings.service");
const decorators_1 = require("../common/decorators");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
class CreateBookingDto {
}
exports.CreateBookingDto = CreateBookingDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "workspaceId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "deskId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "pricingPlanId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "startTime", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "endTime", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "couponCode", void 0);
class RejectBookingDto {
}
exports.RejectBookingDto = RejectBookingDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectBookingDto.prototype, "reason", void 0);
class RescheduleBookingDto {
}
exports.RescheduleBookingDto = RescheduleBookingDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], RescheduleBookingDto.prototype, "newStartTime", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], RescheduleBookingDto.prototype, "newEndTime", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RescheduleBookingDto.prototype, "newDeskId", void 0);
let BookingsController = class BookingsController {
    constructor(bookingsService) {
        this.bookingsService = bookingsService;
    }
    create(user, dto) {
        return this.bookingsService.create({
            customerId: user.customerProfile.id,
            workspaceId: dto.workspaceId,
            deskId: dto.deskId,
            pricingPlanId: dto.pricingPlanId,
            startTime: new Date(dto.startTime),
            endTime: new Date(dto.endTime),
            couponCode: dto.couponCode,
        });
    }
    getMyBookings(user, status) {
        return this.bookingsService.getCustomerBookings(user.customerProfile.id, status);
    }
    getManagerBookings(user, status) {
        return this.bookingsService.getManagerBookings(user.managerProfile.id, status);
    }
    getOne(user, id) {
        return this.bookingsService.getOne(id, user.id);
    }
    confirm(user, id) {
        return this.bookingsService.confirm(id, user.managerProfile.id);
    }
    reject(user, id, dto) {
        return this.bookingsService.reject(id, user.managerProfile.id, dto.reason);
    }
    cancel(user, id) {
        return this.bookingsService.cancel(id, user.customerProfile.id);
    }
    reschedule(user, id, dto) {
        return this.bookingsService.reschedule(id, user.customerProfile.id, new Date(dto.newStartTime), new Date(dto.newEndTime), dto.newDeskId);
    }
};
exports.BookingsController = BookingsController;
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateBookingDto]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "create", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Get)('my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "getMyBookings", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Get)('manager'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "getManagerBookings", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "getOne", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Patch)(':id/confirm'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "confirm", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.MANAGER),
    (0, common_1.Patch)(':id/reject'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, RejectBookingDto]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "reject", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Patch)(':id/cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "cancel", null);
__decorate([
    (0, decorators_1.Roles)(client_1.Role.CUSTOMER),
    (0, common_1.Patch)(':id/reschedule'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, RescheduleBookingDto]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "reschedule", null);
exports.BookingsController = BookingsController = __decorate([
    (0, common_1.Controller)('bookings'),
    __metadata("design:paramtypes", [bookings_service_1.BookingsService])
], BookingsController);
//# sourceMappingURL=bookings.controller.js.map