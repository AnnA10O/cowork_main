import {
  Controller, Get, Post, Patch, Body, Param, Query,
} from '@nestjs/common';
import { MobileService } from './mobile.service';
import { Roles, Public } from '../common/decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { IsString, IsArray } from 'class-validator';
import {
  RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto
} from '../auth/auth.dto';
import {
  CreateBookingDto, RescheduleBookingDto
} from '../bookings/bookings.controller';
import { NotificationsService } from '../notifications/notifications.service';

export class VerifyPaymentDto {
  @IsString() razorpay_order_id: string;
  @IsString() razorpay_payment_id: string;
  @IsString() razorpay_signature: string;
}

export class RegisterFcmTokenDto {
  @IsString() fcmToken: string;
}

export class MarkReadDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

@Controller('mobile')
export class MobileController {
  constructor(
    private mobileService: MobileService,
    private notificationsService: NotificationsService,
  ) {}

  // ── 1. AUTHENTICATION ─────────────────────────────────────────────────────

  @Public()
  @Post('auth/register')
  register(@Body() dto: RegisterDto) {
    return this.mobileService.register(dto);
  }

  @Public()
  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.mobileService.login(dto);
  }

  @Public()
  @Post('auth/firebase')
  loginWithFirebase(@Body('idToken') idToken: string) {
    return this.mobileService.loginWithFirebase(idToken);
  }

  @Public()
  @Post('auth/refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.mobileService.refreshToken(dto.refreshToken);
  }

  @Roles(Role.CUSTOMER)
  @Get('auth/profile')
  getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Roles(Role.CUSTOMER)
  @Patch('auth/change-password')
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.mobileService.changePassword(userId, dto);
  }

  @Roles(Role.CUSTOMER)
  @Patch('auth/profile')
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body('name') name: string,
  ) {
    return this.mobileService.updateProfile(userId, name);
  }

  // ── 2. WORKSPACE & SEAT SELECTION ─────────────────────────────────────────

  @Public()
  @Get('workspaces')
  findAllWorkspaces(@Query() query: any) {
    return this.mobileService.findWorkspaces(query);
  }

  @Public()
  @Get('workspaces/:id')
  findWorkspace(@Param('id') id: string) {
    return this.mobileService.findWorkspace(id);
  }

  @Public()
  @Get('workspaces/:id/availability')
  getDeskAvailability(
    @Param('id') id: string,
    @Query('date') date: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.mobileService.getDeskAvailability(id, date, startTime, endTime);
  }

  // ── 3. BOOKINGS ───────────────────────────────────────────────────────────

  @Roles(Role.CUSTOMER)
  @Post('bookings')
  createBooking(@CurrentUser() user: any, @Body() dto: CreateBookingDto) {
    return this.mobileService.createBooking(user.customerProfile.id, dto);
  }

  @Roles(Role.CUSTOMER)
  @Get('bookings/my')
  getMyBookings(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.mobileService.getMyBookings(user.customerProfile.id, status);
  }

  @Roles(Role.CUSTOMER)
  @Get('bookings/:id')
  getOneBooking(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mobileService.getOneBooking(id, user.id);
  }

  @Roles(Role.CUSTOMER)
  @Patch('bookings/:id/cancel')
  cancelBooking(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mobileService.cancelBooking(id, user.customerProfile.id);
  }

  @Roles(Role.CUSTOMER)
  @Patch('bookings/:id/reschedule')
  rescheduleBooking(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.mobileService.rescheduleBooking(id, user.customerProfile.id, dto);
  }

  // ── 4. PAYMENTS ───────────────────────────────────────────────────────────

  @Roles(Role.CUSTOMER)
  @Post('payments/order/:bookingId')
  createPaymentOrder(@Param('bookingId') bookingId: string) {
    return this.mobileService.createPaymentOrder(bookingId);
  }

  @Roles(Role.CUSTOMER)
  @Post('payments/verify')
  verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.mobileService.verifyPayment(dto);
  }

  // ── 5. NOTIFICATIONS (mobile) ─────────────────────────────────────────────

  /**
   * Register/refresh FCM push token after login.
   * Called by Flutter NotificationService on init and token refresh.
   */
  @Roles(Role.CUSTOMER)
  @Post('notifications/register-token')
  registerFcmToken(
    @CurrentUser() user: any,
    @Body() dto: RegisterFcmTokenDto,
  ) {
    return this.notificationsService.registerFcmToken(user.id, dto.fcmToken);
  }

  /**
   * Fetch all in-app notifications for the logged-in customer.
   */
  @Roles(Role.CUSTOMER)
  @Get('notifications')
  getNotifications(@CurrentUser() user: any) {
    return this.notificationsService.getAll(user.id);
  }

  /**
   * Mark specific notifications as read.
   */
  @Roles(Role.CUSTOMER)
  @Patch('notifications/mark-read')
  markRead(@CurrentUser() user: any, @Body() dto: MarkReadDto) {
    return this.notificationsService.markRead(user.id, dto.ids);
  }
}