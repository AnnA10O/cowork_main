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
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const notifications_service_1 = require("../notifications/notifications.service");
const payments_service_1 = require("../payments/payments.service");
const GST_RATE = 0.18;
const REFUND_PERCENT = 0.85;
let BookingsService = class BookingsService {
    constructor(prisma, notifications, payments) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.payments = payments;
    }
    async create(input) {
        const { customerId, workspaceId, deskId, pricingPlanId, startTime, endTime, couponCode } = input;
        const conflict = await this.prisma.booking.findFirst({
            where: {
                deskId,
                status: { in: ['CONFIRMED', 'PENDING'] },
                OR: [
                    { startTime: { lte: endTime }, endTime: { gte: startTime } },
                ],
            },
        });
        if (conflict)
            throw new common_1.BadRequestException('Desk not available for selected time');
        const [plan, desk] = await Promise.all([
            this.prisma.pricingPlan.findUnique({ where: { id: pricingPlanId } }),
            this.prisma.desk.findUnique({ where: { id: deskId } }),
        ]);
        if (!plan || !desk)
            throw new common_1.NotFoundException('Pricing plan or desk not found');
        const baseAmount = Number(plan.basePrice);
        const premiumExtra = Number(desk.premiumExtra);
        let discountAmount = 0;
        let couponId;
        if (couponCode) {
            const coupon = await this.prisma.coupon.findFirst({
                where: {
                    workspaceId,
                    code: couponCode.toUpperCase(),
                    isActive: true,
                    validFrom: { lte: new Date() },
                    validUntil: { gte: new Date() },
                },
            });
            if (!coupon)
                throw new common_1.BadRequestException('Invalid or expired coupon');
            if (coupon.usedCount >= coupon.maxUses)
                throw new common_1.BadRequestException('Coupon usage limit reached');
            couponId = coupon.id;
            if (coupon.discountFlat)
                discountAmount = Number(coupon.discountFlat);
            else if (coupon.discountPercent)
                discountAmount = baseAmount * (Number(coupon.discountPercent) / 100);
        }
        const totalAmount = baseAmount + premiumExtra - discountAmount;
        const gstAmount = totalAmount * GST_RATE;
        const finalAmount = totalAmount + gstAmount;
        const booking = await this.prisma.$transaction(async (tx) => {
            const b = await tx.booking.create({
                data: {
                    customerId, workspaceId, deskId,
                    pricingPlanId, couponId,
                    startTime, endTime,
                    baseAmount, discountAmount, premiumExtra,
                    totalAmount, gstAmount, finalAmount,
                    status: client_1.BookingStatus.PENDING,
                },
                include: {
                    workspace: { select: { name: true, managerId: true } },
                    desk: { select: { deskNumber: true } },
                },
            });
            if (couponId) {
                await tx.coupon.update({
                    where: { id: couponId },
                    data: { usedCount: { increment: 1 } },
                });
            }
            return b;
        });
        const manager = await this.prisma.manager.findFirst({
            where: { id: booking.workspace.managerId },
            include: { user: { select: { id: true, name: true } } },
        });
        if (manager) {
            await this.notifications.send(manager.user.id, {
                title: 'New Booking',
                body: `New booking for ${booking.workspace.name} — Desk ${booking.desk.deskNumber}`,
                type: 'new_booking',
                data: { bookingId: booking.id },
            });
        }
        return booking;
    }
    async confirm(bookingId, managerId) {
        const booking = await this.getBookingForManager(bookingId, managerId);
        if (booking.status !== client_1.BookingStatus.PENDING) {
            throw new common_1.BadRequestException('Booking is not in pending state');
        }
        const updated = await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: client_1.BookingStatus.CONFIRMED },
        });
        await this.notifications.sendBookingConfirmation(booking);
        return updated;
    }
    async reject(bookingId, managerId, reason) {
        const booking = await this.getBookingForManager(bookingId, managerId);
        if (booking.status !== client_1.BookingStatus.PENDING) {
            throw new common_1.BadRequestException('Booking is not in pending state');
        }
        const updated = await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: client_1.BookingStatus.REJECTED, rejectedReason: reason },
        });
        if (booking.payment) {
            await this.payments.refund(booking.payment.razorpayPaymentId, Number(booking.finalAmount));
        }
        await this.notifications.send(booking.customer.user.id, {
            title: 'Booking Rejected',
            body: `Your booking was rejected: ${reason}`,
            type: 'booking_rejected',
            data: { bookingId },
        });
        return updated;
    }
    async cancel(bookingId, customerId) {
        const booking = await this.prisma.booking.findFirst({
            where: { id: bookingId, customerId },
            include: {
                payment: true,
                customer: { include: { user: true } },
            },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (!['CONFIRMED', 'PENDING'].includes(booking.status)) {
            throw new common_1.BadRequestException('Cannot cancel this booking');
        }
        const refundAmount = booking.payment
            ? Number(booking.finalAmount) * REFUND_PERCENT
            : 0;
        await this.prisma.$transaction(async (tx) => {
            await tx.booking.update({
                where: { id: bookingId },
                data: { status: client_1.BookingStatus.CANCELLED },
            });
            if (booking.payment && booking.payment.razorpayPaymentId) {
                await this.payments.refund(booking.payment.razorpayPaymentId, refundAmount);
                await tx.payment.update({
                    where: { id: booking.payment.id },
                    data: {
                        refundAmount,
                        refundStatus: 'initiated',
                        status: 'PARTIAL_REFUND',
                    },
                });
            }
        });
        await this.notifications.send(booking.customer.user.id, {
            title: 'Booking Cancelled',
            body: `Your booking has been cancelled. ₹${refundAmount.toFixed(2)} will be refunded (85% of total).`,
            type: 'booking_cancelled',
            data: { bookingId, refundAmount },
        });
        return { message: 'Booking cancelled', refundAmount };
    }
    async reschedule(originalBookingId, customerId, newStartTime, newEndTime, newDeskId) {
        const original = await this.prisma.booking.findFirst({
            where: { id: originalBookingId, customerId },
            include: { payment: true },
        });
        if (!original)
            throw new common_1.NotFoundException('Booking not found');
        if (!['CONFIRMED', 'PENDING'].includes(original.status)) {
            throw new common_1.BadRequestException('Cannot reschedule this booking');
        }
        await this.cancel(originalBookingId, customerId);
        const newBooking = await this.create({
            customerId,
            workspaceId: original.workspaceId,
            deskId: newDeskId || original.deskId,
            pricingPlanId: original.pricingPlanId,
            startTime: newStartTime,
            endTime: newEndTime,
        });
        await this.prisma.booking.update({
            where: { id: newBooking.id },
            data: { isRescheduled: true, originalBookingId },
        });
        return {
            message: 'Booking rescheduled. Original booking cancelled with 85% refund. Please complete payment for the new booking.',
            originalBookingId,
            newBooking,
        };
    }
    async getCustomerBookings(customerId, status) {
        return this.prisma.booking.findMany({
            where: {
                customerId,
                ...(status && { status: status }),
            },
            include: {
                workspace: { select: { name: true, address: true, city: true } },
                desk: { select: { deskNumber: true, type: true } },
                pricingPlan: true,
                payment: { select: { status: true, method: true } },
                invoice: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getManagerBookings(managerId, status) {
        return this.prisma.booking.findMany({
            where: {
                workspace: { managerId },
                ...(status && { status: status }),
            },
            include: {
                customer: {
                    include: { user: { select: { name: true, email: true, phone: true } } },
                },
                desk: { select: { deskNumber: true, type: true } },
                pricingPlan: true,
                payment: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getOne(bookingId, userId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                customer: { include: { user: { select: { id: true, name: true, email: true } } } },
                workspace: { select: { name: true, address: true, managerId: true } },
                desk: true,
                pricingPlan: true,
                payment: true,
                invoice: true,
            },
        });
        if (!booking)
            throw new common_1.NotFoundException();
        const isCustomer = booking.customer.user.id === userId;
        const isManager = booking.workspace.managerId === userId;
        if (!isCustomer && !isManager)
            throw new common_1.ForbiddenException();
        return booking;
    }
    async getBookingForManager(bookingId, managerId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                workspace: { select: { managerId: true, name: true } },
                customer: { include: { user: true } },
                payment: true,
            },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.workspace.managerId !== managerId)
            throw new common_1.ForbiddenException();
        return booking;
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        payments_service_1.PaymentsService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map