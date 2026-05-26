import { IsString, IsDateString, IsOptional } from 'class-validator';
import {
  Controller, Get, Post, Patch, Body, Param, Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// ── DTOs ─────────────────────────────────────────────────────────────

export class CreateBookingDto {
  @IsString()
  workspaceId: string;

  @IsString()
  deskId: string;

  @IsString()
  pricingPlanId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsString()
  @IsOptional()
  couponCode?: string;
}

export class RejectBookingDto {
  @IsString()
  reason: string;
}

export class RescheduleBookingDto {
  @IsDateString()
  newStartTime: string;

  @IsDateString()
  newEndTime: string;

  @IsString()
  @IsOptional()
  newDeskId?: string;
}

// ── Controller ────────────────────────────────────────────────────────

@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  /** POST /bookings — Customer creates booking */
  @Roles(Role.CUSTOMER)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateBookingDto) {
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

  /** GET /bookings/my — Customer's bookings */
  @Roles(Role.CUSTOMER)
  @Get('my')
  getMyBookings(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.bookingsService.getCustomerBookings(user.customerProfile.id, status);
  }

  /** GET /bookings/manager — Manager's bookings (all their workspaces) */
  @Roles(Role.MANAGER)
  @Get('manager')
  getManagerBookings(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.bookingsService.getManagerBookings(user.managerProfile.id, status);
  }

  /** GET /bookings/:id */
  @Get(':id')
  getOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookingsService.getOne(id, user.id);
  }

  /** PATCH /bookings/:id/confirm — Manager confirms booking */
  @Roles(Role.MANAGER)
  @Patch(':id/confirm')
  confirm(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookingsService.confirm(id, user.managerProfile.id);
  }

  /** PATCH /bookings/:id/reject — Manager rejects booking */
  @Roles(Role.MANAGER)
  @Patch(':id/reject')
  reject(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RejectBookingDto,
  ) {
    return this.bookingsService.reject(id, user.managerProfile.id, dto.reason);
  }

  /** PATCH /bookings/:id/cancel — Customer cancels (85% refund) */
  @Roles(Role.CUSTOMER)
  @Patch(':id/cancel')
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookingsService.cancel(id, user.customerProfile.id);
  }

  /** PATCH /bookings/:id/reschedule — Customer reschedules (cancel + new booking) */
  @Roles(Role.CUSTOMER)
  @Patch(':id/reschedule')
  reschedule(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookingsService.reschedule(
      id,
      user.customerProfile.id,
      new Date(dto.newStartTime),
      new Date(dto.newEndTime),
      dto.newDeskId,
    );
  }
}
