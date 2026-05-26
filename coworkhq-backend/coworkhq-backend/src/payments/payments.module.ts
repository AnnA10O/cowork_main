import { IsString } from 'class-validator';
import { Controller, Post, Body, Param, Headers, Module } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { Roles, Public } from '../common/decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class VerifyPaymentDto {
  @IsString() razorpay_order_id: string;
  @IsString() razorpay_payment_id: string;
  @IsString() razorpay_signature: string;
}

class PlatformFeeDto {
  @IsString() month: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Roles(Role.CUSTOMER)
  @Post('order/:bookingId')
  createOrder(@Param('bookingId') bookingId: string) {
    return this.paymentsService.createOrder(bookingId);
  }

  @Roles(Role.CUSTOMER)
  @Post('verify')
  verify(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  @Public()
  @Post('webhook')
  webhook(@Body() body: any, @Headers('x-razorpay-signature') signature: string) {
    return this.paymentsService.handleWebhook(body, signature);
  }

  @Roles(Role.MANAGER)
  @Post('platform-fee')
  platformFee(@CurrentUser() user: any, @Body() dto: PlatformFeeDto) {
    return this.paymentsService.createPlatformFeeOrder(user.managerProfile.id, dto.month);
  }
}

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
