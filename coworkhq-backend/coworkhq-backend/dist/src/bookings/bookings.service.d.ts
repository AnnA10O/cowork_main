import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
export interface CreateBookingInput {
    customerId: string;
    workspaceId: string;
    deskId: string;
    pricingPlanId: string;
    startTime: Date;
    endTime: Date;
    couponCode?: string;
}
export declare class BookingsService {
    private prisma;
    private notifications;
    private payments;
    constructor(prisma: PrismaService, notifications: NotificationsService, payments: PaymentsService);
    create(input: CreateBookingInput): Promise<{
        workspace: {
            name: string;
            managerId: string;
        };
        desk: {
            deskNumber: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BookingStatus;
        workspaceId: string;
        premiumExtra: import("@prisma/client/runtime/library").Decimal;
        customerId: string;
        deskId: string;
        pricingPlanId: string;
        couponId: string | null;
        startTime: Date;
        endTime: Date;
        checkInTime: Date | null;
        checkOutTime: Date | null;
        baseAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        gstAmount: import("@prisma/client/runtime/library").Decimal;
        finalAmount: import("@prisma/client/runtime/library").Decimal;
        rejectedReason: string | null;
        isRescheduled: boolean;
        originalBookingId: string | null;
    }>;
    confirm(bookingId: string, managerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BookingStatus;
        workspaceId: string;
        premiumExtra: import("@prisma/client/runtime/library").Decimal;
        customerId: string;
        deskId: string;
        pricingPlanId: string;
        couponId: string | null;
        startTime: Date;
        endTime: Date;
        checkInTime: Date | null;
        checkOutTime: Date | null;
        baseAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        gstAmount: import("@prisma/client/runtime/library").Decimal;
        finalAmount: import("@prisma/client/runtime/library").Decimal;
        rejectedReason: string | null;
        isRescheduled: boolean;
        originalBookingId: string | null;
    }>;
    reject(bookingId: string, managerId: string, reason: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BookingStatus;
        workspaceId: string;
        premiumExtra: import("@prisma/client/runtime/library").Decimal;
        customerId: string;
        deskId: string;
        pricingPlanId: string;
        couponId: string | null;
        startTime: Date;
        endTime: Date;
        checkInTime: Date | null;
        checkOutTime: Date | null;
        baseAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        gstAmount: import("@prisma/client/runtime/library").Decimal;
        finalAmount: import("@prisma/client/runtime/library").Decimal;
        rejectedReason: string | null;
        isRescheduled: boolean;
        originalBookingId: string | null;
    }>;
    cancel(bookingId: string, customerId: string): Promise<{
        message: string;
        refundAmount: number;
    }>;
    reschedule(originalBookingId: string, customerId: string, newStartTime: Date, newEndTime: Date, newDeskId?: string): Promise<{
        message: string;
        originalBookingId: string;
        newBooking: {
            workspace: {
                name: string;
                managerId: string;
            };
            desk: {
                deskNumber: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.BookingStatus;
            workspaceId: string;
            premiumExtra: import("@prisma/client/runtime/library").Decimal;
            customerId: string;
            deskId: string;
            pricingPlanId: string;
            couponId: string | null;
            startTime: Date;
            endTime: Date;
            checkInTime: Date | null;
            checkOutTime: Date | null;
            baseAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            gstAmount: import("@prisma/client/runtime/library").Decimal;
            finalAmount: import("@prisma/client/runtime/library").Decimal;
            rejectedReason: string | null;
            isRescheduled: boolean;
            originalBookingId: string | null;
        };
    }>;
    getCustomerBookings(customerId: string, status?: string): Promise<({
        workspace: {
            name: string;
            address: string;
            city: string;
        };
        pricingPlan: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            type: import(".prisma/client").$Enums.PricingType;
            basePrice: import("@prisma/client/runtime/library").Decimal;
            currency: string;
        };
        desk: {
            type: string;
            deskNumber: string;
        };
        payment: {
            status: import(".prisma/client").$Enums.PaymentStatus;
            method: import(".prisma/client").$Enums.PaymentMethod;
        };
        invoice: {
            id: string;
            gstNumber: string | null;
            bookingId: string;
            invoiceNumber: string;
            issuedAt: Date;
            pdfUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BookingStatus;
        workspaceId: string;
        premiumExtra: import("@prisma/client/runtime/library").Decimal;
        customerId: string;
        deskId: string;
        pricingPlanId: string;
        couponId: string | null;
        startTime: Date;
        endTime: Date;
        checkInTime: Date | null;
        checkOutTime: Date | null;
        baseAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        gstAmount: import("@prisma/client/runtime/library").Decimal;
        finalAmount: import("@prisma/client/runtime/library").Decimal;
        rejectedReason: string | null;
        isRescheduled: boolean;
        originalBookingId: string | null;
    })[]>;
    getManagerBookings(managerId: string, status?: string): Promise<({
        pricingPlan: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            type: import(".prisma/client").$Enums.PricingType;
            basePrice: import("@prisma/client/runtime/library").Decimal;
            currency: string;
        };
        customer: {
            user: {
                email: string;
                phone: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            loyaltyPoints: number;
            referralCode: string;
            referredBy: string | null;
            preferredLang: string;
        };
        desk: {
            type: string;
            deskNumber: string;
        };
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BookingStatus;
        workspaceId: string;
        premiumExtra: import("@prisma/client/runtime/library").Decimal;
        customerId: string;
        deskId: string;
        pricingPlanId: string;
        couponId: string | null;
        startTime: Date;
        endTime: Date;
        checkInTime: Date | null;
        checkOutTime: Date | null;
        baseAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        gstAmount: import("@prisma/client/runtime/library").Decimal;
        finalAmount: import("@prisma/client/runtime/library").Decimal;
        rejectedReason: string | null;
        isRescheduled: boolean;
        originalBookingId: string | null;
    })[]>;
    getOne(bookingId: string, userId: string): Promise<{
        workspace: {
            name: string;
            managerId: string;
            address: string;
        };
        pricingPlan: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            type: import(".prisma/client").$Enums.PricingType;
            basePrice: import("@prisma/client/runtime/library").Decimal;
            currency: string;
        };
        customer: {
            user: {
                id: string;
                email: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            loyaltyPoints: number;
            referralCode: string;
            referredBy: string | null;
            preferredLang: string;
        };
        desk: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            description: string | null;
            workspaceId: string;
            type: string;
            deskNumber: string;
            premiumExtra: import("@prisma/client/runtime/library").Decimal;
        };
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
        invoice: {
            id: string;
            gstNumber: string | null;
            bookingId: string;
            invoiceNumber: string;
            issuedAt: Date;
            pdfUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BookingStatus;
        workspaceId: string;
        premiumExtra: import("@prisma/client/runtime/library").Decimal;
        customerId: string;
        deskId: string;
        pricingPlanId: string;
        couponId: string | null;
        startTime: Date;
        endTime: Date;
        checkInTime: Date | null;
        checkOutTime: Date | null;
        baseAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        gstAmount: import("@prisma/client/runtime/library").Decimal;
        finalAmount: import("@prisma/client/runtime/library").Decimal;
        rejectedReason: string | null;
        isRescheduled: boolean;
        originalBookingId: string | null;
    }>;
    private getBookingForManager;
}
