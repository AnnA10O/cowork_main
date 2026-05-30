import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { BookingsService } from '../bookings/bookings.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class MobileService {
  constructor(
    private authService: AuthService,
    private workspacesService: WorkspacesService,
    private bookingsService: BookingsService,
    private paymentsService: PaymentsService,
  ) {}

  // ── Auth Delegates ────────────────────────────────────────────────────────
  register(dto: any) {
    return this.authService.register(dto);
  }

  login(dto: any) {
    return this.authService.login(dto);
  }

  loginWithFirebase(idToken: string) {
    return this.authService.loginWithFirebase(idToken);
  }

  refreshToken(token: string) {
    return this.authService.refreshToken(token);
  }

  changePassword(userId: string, dto: any) {
    return this.authService.changePassword(userId, dto);
  }

  // ── Workspaces Delegates ───────────────────────────────────────────────────
  findWorkspaces(query: any) {
    return this.workspacesService.findAll(query);
  }

  findWorkspace(id: string) {
    return this.workspacesService.findOne(id);
  }

  getDeskAvailability(id: string, date: string) {
    return this.workspacesService.getDeskAvailability(id, date);
  }

  // ── Bookings Delegates ─────────────────────────────────────────────────────
  createBooking(customerId: string, dto: any) {
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

  getMyBookings(customerId: string, status?: string) {
    return this.bookingsService.getCustomerBookings(customerId, status);
  }

  getOneBooking(bookingId: string, userId: string) {
    return this.bookingsService.getOne(bookingId, userId);
  }

  cancelBooking(bookingId: string, customerId: string) {
    return this.bookingsService.cancel(bookingId, customerId);
  }

  rescheduleBooking(bookingId: string, customerId: string, dto: any) {
    return this.bookingsService.reschedule(
      bookingId,
      customerId,
      new Date(dto.newStartTime),
      new Date(dto.newEndTime),
      dto.newDeskId,
    );
  }

  // ── Payment Delegates ──────────────────────────────────────────────────────
  createPaymentOrder(bookingId: string) {
    return this.paymentsService.createOrder(bookingId);
  }

  verifyPayment(dto: any) {
    return this.paymentsService.verifyPayment(dto);
  }
}
