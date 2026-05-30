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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileService = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("../auth/auth.service");
const workspaces_service_1 = require("../workspaces/workspaces.service");
const bookings_service_1 = require("../bookings/bookings.service");
const payments_service_1 = require("../payments/payments.service");
let MobileService = class MobileService {
    constructor(authService, workspacesService, bookingsService, paymentsService) {
        this.authService = authService;
        this.workspacesService = workspacesService;
        this.bookingsService = bookingsService;
        this.paymentsService = paymentsService;
    }
    register(dto) {
        return this.authService.register(dto);
    }
    login(dto) {
        return this.authService.login(dto);
    }
    loginWithFirebase(idToken) {
        return this.authService.loginWithFirebase(idToken);
    }
    refreshToken(token) {
        return this.authService.refreshToken(token);
    }
    changePassword(userId, dto) {
        return this.authService.changePassword(userId, dto);
    }
    findWorkspaces(query) {
        return this.workspacesService.findAll(query);
    }
    findWorkspace(id) {
        return this.workspacesService.findOne(id);
    }
    getDeskAvailability(id, date) {
        return this.workspacesService.getDeskAvailability(id, date);
    }
    createBooking(customerId, dto) {
        return this.bookingsService.create({
            customerId,
            workspaceId: dto.workspaceId,
            deskId: dto.deskId,
            pricingPlanId: dto.pricingPlanId,
            startTime: new Date(dto.startTime),
            endTime: new Date(dto.endTime),
            couponCode: dto.couponCode,
        });
    }
    getMyBookings(customerId, status) {
        return this.bookingsService.getCustomerBookings(customerId, status);
    }
    getOneBooking(bookingId, userId) {
        return this.bookingsService.getOne(bookingId, userId);
    }
    cancelBooking(bookingId, customerId) {
        return this.bookingsService.cancel(bookingId, customerId);
    }
    rescheduleBooking(bookingId, customerId, dto) {
        return this.bookingsService.reschedule(bookingId, customerId, new Date(dto.newStartTime), new Date(dto.newEndTime), dto.newDeskId);
    }
    createPaymentOrder(bookingId) {
        return this.paymentsService.createOrder(bookingId);
    }
    verifyPayment(dto) {
        return this.paymentsService.verifyPayment(dto);
    }
};
exports.MobileService = MobileService;
exports.MobileService = MobileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        workspaces_service_1.WorkspacesService,
        bookings_service_1.BookingsService,
        payments_service_1.PaymentsService])
], MobileService);
//# sourceMappingURL=mobile.service.js.map