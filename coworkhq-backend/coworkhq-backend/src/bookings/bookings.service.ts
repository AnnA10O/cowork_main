import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';

const GST_RATE = 0.18;
const REFUND_PERCENT = 0.85; // 85% refund on cancellation

export interface CreateBookingInput {
  customerId: string;
  workspaceId: string;
  deskId: string;
  pricingPlanId: string;
  startTime: Date;
  endTime: Date;
  couponCode?: string;
}

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private payments: PaymentsService,
  ) {}

  // ── Create Booking ────────────────────────────────────────────────

  async create(input: CreateBookingInput) {
    const { customerId, workspaceId, deskId, pricingPlanId, startTime, endTime, couponCode } = input;

    // 1. Check desk availability
    const conflict = await this.prisma.booking.findFirst({
      where: {
        deskId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        OR: [
          { startTime: { lte: endTime }, endTime: { gte: startTime } },
        ],
      },
    });
    if (conflict) throw new BadRequestException('Desk not available for selected time');

    // 2. Get pricing
    const [plan, desk] = await Promise.all([
      this.prisma.pricingPlan.findUnique({ where: { id: pricingPlanId } }),
      this.prisma.desk.findUnique({ where: { id: deskId } }),
    ]);
    if (!plan || !desk) throw new NotFoundException('Pricing plan or desk not found');

    // 3. Calculate amount
    const baseAmount = Number(plan.basePrice);
    const premiumExtra = Number(desk.premiumExtra);
    let discountAmount = 0;
    let couponId: string | undefined;

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
      if (!coupon) throw new BadRequestException('Invalid or expired coupon');
      if (coupon.usedCount >= coupon.maxUses) throw new BadRequestException('Coupon usage limit reached');

      couponId = coupon.id;
      if (coupon.discountFlat) discountAmount = Number(coupon.discountFlat);
      else if (coupon.discountPercent) discountAmount = baseAmount * (Number(coupon.discountPercent) / 100);
    }

    const totalAmount  = baseAmount + premiumExtra - discountAmount;
    const gstAmount    = totalAmount * GST_RATE;
    const finalAmount  = totalAmount + gstAmount;

    // 4. Create booking
    const booking = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          customerId, workspaceId, deskId,
          pricingPlanId, couponId,
          startTime, endTime,
          baseAmount, discountAmount, premiumExtra,
          totalAmount, gstAmount, finalAmount,
          status: BookingStatus.PENDING,
        },
        include: {
          workspace: { select: { name: true, managerId: true } },
          desk:      { select: { deskNumber: true } },
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

    // 5. Notify manager
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

  // ── Auto-confirm (default) or Manager confirms/rejects ────────────

  async confirm(bookingId: string, managerId: string) {
    const booking = await this.getBookingForManager(bookingId, managerId);
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking is not in pending state');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });

    // Notify customer + send WhatsApp
    await this.notifications.sendBookingConfirmation(booking);
    return updated;
  }

  async reject(bookingId: string, managerId: string, reason: string) {
    const booking = await this.getBookingForManager(bookingId, managerId);
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking is not in pending state');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.REJECTED, rejectedReason: reason },
    });

    // Trigger full refund if payment exists
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

  // ── Cancel (customer-initiated) ─────────────────────────────────
  // Policy: 85% refund, customer must pay again for reschedule

  async cancel(bookingId: string, customerId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, customerId },
      include: {
        payment: true,
        customer: { include: { user: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (!['CONFIRMED', 'PENDING'].includes(booking.status)) {
      throw new BadRequestException('Cannot cancel this booking');
    }

    const refundAmount = booking.payment
      ? Number(booking.finalAmount) * REFUND_PERCENT
      : 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      // Initiate 85% refund
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

  // ── Reschedule ────────────────────────────────────────────────────
  // Policy: original booking cancelled (85% refund), new booking created at full price

  async reschedule(
    originalBookingId: string,
    customerId: string,
    newStartTime: Date,
    newEndTime: Date,
    newDeskId?: string,
  ) {
    const original = await this.prisma.booking.findFirst({
      where: { id: originalBookingId, customerId },
      include: { payment: true },
    });

    if (!original) throw new NotFoundException('Booking not found');
    if (!['CONFIRMED', 'PENDING'].includes(original.status)) {
      throw new BadRequestException('Cannot reschedule this booking');
    }

    // Cancel original with 85% refund
    await this.cancel(originalBookingId, customerId);

    // Create new booking (customer pays fresh)
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

  // ── Get bookings ──────────────────────────────────────────────────

  async getCustomerBookings(customerId: string, status?: string) {
    return this.prisma.booking.findMany({
      where: {
        customerId,
        ...(status && { status: status as BookingStatus }),
      },
      include: {
        workspace: { select: { name: true, address: true, city: true } },
        desk:      { select: { deskNumber: true, type: true } },
        pricingPlan: true,
        payment: { select: { status: true, method: true } },
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getManagerBookings(managerId: string, status?: string) {
    return this.prisma.booking.findMany({
      where: {
        workspace: { managerId },
        ...(status && { status: status as BookingStatus }),
      },
      include: {
        customer: {
          include: { user: { select: { name: true, email: true, phone: true } } },
        },
        desk:      { select: { deskNumber: true, type: true } },
        pricingPlan: true,
        payment:     true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer:    { include: { user: { select: { id: true, name: true, email: true } } } },
        workspace:   { select: { name: true, address: true, managerId: true } },
        desk:        true,
        pricingPlan: true,
        payment:     true,
        invoice:     true,
      },
    });

    if (!booking) throw new NotFoundException();
    // Only allow the customer or the workspace manager
    const isCustomer = booking.customer.user.id === userId;
    const isManager  = booking.workspace.managerId === userId;
    if (!isCustomer && !isManager) throw new ForbiddenException();

    return booking;
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private async getBookingForManager(bookingId: string, managerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        workspace: { select: { managerId: true, name: true } },
        customer:  { include: { user: true } },
        payment:   true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.workspace.managerId !== managerId) throw new ForbiddenException();
    return booking;
  }
}
