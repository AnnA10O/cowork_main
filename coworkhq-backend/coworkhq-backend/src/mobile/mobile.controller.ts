import {
  Controller, Get, Post, Patch, Body, Param, Query,
} from '@nestjs/common';
import { MobileService } from './mobile.service';
import { Roles, Public } from '../common/decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { IsString } from 'class-validator';
import {
  RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto
} from '../auth/auth.dto';
import {
  CreateBookingDto, RescheduleBookingDto
} from '../bookings/bookings.controller';

export class VerifyPaymentDto {
  @IsString() razorpay_order_id: string;
  @IsString() razorpay_payment_id: string;
  @IsString() razorpay_signature: string;
}

@Controller('mobile')
export class MobileController {
  constructor(private mobileService: MobileService) {}

  // ── 1. AUTHENTICATION ENDPOINTS ───────────────────────────────────────────

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

  // ── 2. WORKSPACE & SEAT SELECTION ENDPOINTS ────────────────────────────────

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
  getDeskAvailability(@Param('id') id: string, @Query('date') date: string) {
    return this.mobileService.getDeskAvailability(id, date);
  }

  // ── 3. BOOKING & CHECKOUT ENDPOINTS ────────────────────────────────────────

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

  // ── 4. PAYMENT ENDPOINTS ───────────────────────────────────────────────────

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
}
