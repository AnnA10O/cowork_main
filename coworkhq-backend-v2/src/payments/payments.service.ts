import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

let Razorpay: any;
try { Razorpay = require('razorpay'); } catch (_) {}

@Injectable()
export class PaymentsService {
  private razorpay: any;
  constructor(private prisma: PrismaService, private config: ConfigService) {
    if (Razorpay) {
      this.razorpay = new Razorpay({
        key_id: this.config.get('RAZORPAY_KEY_ID'),
        key_secret: this.config.get('RAZORPAY_KEY_SECRET'),
      });
    }
  }

  async createOrder(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { payment: true } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.payment) throw new BadRequestException('Payment already initiated');
    const amountPaise = Math.round(Number(booking.finalAmount) * 100);
    const order = await this.razorpay.orders.create({ amount: amountPaise, currency: 'INR', receipt: `booking_${bookingId}`, notes: { bookingId } });
    await this.prisma.payment.create({ data: { bookingId, razorpayOrderId: order.id, amount: booking.finalAmount, status: 'PENDING' } });
    return { orderId: order.id, amount: amountPaise, currency: 'INR', key: this.config.get('RAZORPAY_KEY_ID') };
  }

  async verifyPayment(dto: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
    const body = `${dto.razorpay_order_id}|${dto.razorpay_payment_id}`;
    const expectedSig = crypto.createHmac('sha256', this.config.get('RAZORPAY_KEY_SECRET')).update(body).digest('hex');
    if (expectedSig !== dto.razorpay_signature) throw new BadRequestException('Payment verification failed');
    const payment = await this.prisma.payment.update({ where: { razorpayOrderId: dto.razorpay_order_id }, data: { razorpayPaymentId: dto.razorpay_payment_id, razorpaySignature: dto.razorpay_signature, status: 'SUCCESS' } });
    await this.prisma.booking.update({ where: { id: payment.bookingId }, data: { status: 'CONFIRMED' } });
    await this.generateInvoice(payment.bookingId);
    return { success: true, payment };
  }

  async handleWebhook(body: any, signature: string) {
    const expectedSig = crypto.createHmac('sha256', this.config.get('RAZORPAY_WEBHOOK_SECRET')).update(JSON.stringify(body)).digest('hex');
    if (expectedSig !== signature) throw new BadRequestException('Invalid webhook signature');
    if (body.event === 'payment.captured') {
      const { order_id, id } = body.payload.payment.entity;
      const existing = await this.prisma.payment.findUnique({ where: { razorpayOrderId: order_id } });
      if (existing && existing.status !== 'SUCCESS') {
        await this.prisma.payment.update({ where: { razorpayOrderId: order_id }, data: { razorpayPaymentId: id, status: 'SUCCESS' } });
        await this.prisma.booking.update({ where: { id: existing.bookingId }, data: { status: 'CONFIRMED' } });
      }
    }
    return { received: true };
  }

  async refund(razorpayPaymentId: string, amount: number) {
    if (!this.razorpay) return null;
    return this.razorpay.payments.refund(razorpayPaymentId, { amount: Math.round(amount * 100) });
  }

  async createPlatformFeeOrder(managerId: string, month: string) {
    const existing = await this.prisma.platformFeePayment.findFirst({ where: { managerId, month, status: 'SUCCESS' } });
    if (existing) throw new BadRequestException('Platform fee already paid for this month');
    const workspaceCount = await this.prisma.workspace.count({ where: { managerId } });
    const totalFee = workspaceCount * Number(this.config.get('PLATFORM_FEE_PER_WORKSPACE', 999));
    const order = await this.razorpay.orders.create({ amount: totalFee * 100, currency: 'INR', receipt: `platform_fee_${managerId}_${month}` });
    await this.prisma.platformFeePayment.create({ data: { managerId, month, amount: totalFee, razorpayOrderId: order.id, status: 'PENDING' } });
    return { orderId: order.id, amount: totalFee * 100, currency: 'INR', key: this.config.get('RAZORPAY_KEY_ID') };
  }

  async getManagerPayments(managerId: string) {
    return this.prisma.payment.findMany({
      where: {
        booking: {
          workspace: {
            managerId,
          },
        },
      },
      include: {
        booking: {
          include: {
            customer: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            workspace: {
              select: {
                name: true,
              },
            },
            invoice: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async generateInvoice(bookingId: string) {
    const existing = await this.prisma.invoice.findUnique({ where: { bookingId } });
    if (existing) return existing;
    const count = await this.prisma.invoice.count();
    const invoiceNumber = `CWH/${new Date().getFullYear()}/${String(count + 1).padStart(6, '0')}`;
    return this.prisma.invoice.create({ data: { bookingId, invoiceNumber } });
  }
}
