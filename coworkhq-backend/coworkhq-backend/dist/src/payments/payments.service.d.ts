import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class PaymentsService {
    private prisma;
    private config;
    private razorpay;
    constructor(prisma: PrismaService, config: ConfigService);
    createOrder(bookingId: string): Promise<{
        orderId: any;
        amount: number;
        currency: string;
        key: any;
    }>;
    verifyPayment(dto: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
    }): Promise<{
        success: boolean;
        payment: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PaymentStatus;
            currency: string;
            bookingId: string;
            razorpayOrderId: string;
            razorpayPaymentId: string | null;
            razorpaySignature: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            method: import(".prisma/client").$Enums.PaymentMethod;
            refundId: string | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundStatus: string | null;
        };
    }>;
    handleWebhook(body: any, signature: string): Promise<{
        received: boolean;
    }>;
    refund(razorpayPaymentId: string, amount: number): Promise<any>;
    createPlatformFeeOrder(managerId: string, month: string): Promise<{
        orderId: any;
        amount: number;
        currency: string;
        key: any;
    }>;
    generateInvoice(bookingId: string): Promise<{
        id: string;
        gstNumber: string | null;
        bookingId: string;
        invoiceNumber: string;
        issuedAt: Date;
        pdfUrl: string | null;
    }>;
}
