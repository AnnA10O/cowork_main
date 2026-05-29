import { PaymentsService } from './payments.service';
declare class VerifyPaymentDto {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}
declare class PlatformFeeDto {
    month: string;
}
export declare class PaymentsController {
    private paymentsService;
    constructor(paymentsService: PaymentsService);
    createOrder(bookingId: string): Promise<{
        orderId: any;
        amount: number;
        currency: string;
        key: any;
    }>;
    verify(dto: VerifyPaymentDto): Promise<{
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
    webhook(body: any, signature: string): Promise<{
        received: boolean;
    }>;
    platformFee(user: any, dto: PlatformFeeDto): Promise<{
        orderId: any;
        amount: number;
        currency: string;
        key: any;
    }>;
}
export declare class PaymentsModule {
}
export {};
