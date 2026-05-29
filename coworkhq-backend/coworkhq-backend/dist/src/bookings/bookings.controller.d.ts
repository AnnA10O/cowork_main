import { BookingsService } from './bookings.service';
export declare class CreateBookingDto {
    workspaceId: string;
    deskId: string;
    pricingPlanId: string;
    startTime: string;
    endTime: string;
    couponCode?: string;
}
export declare class RejectBookingDto {
    reason: string;
}
export declare class RescheduleBookingDto {
    newStartTime: string;
    newEndTime: string;
    newDeskId?: string;
}
export declare class BookingsController {
    private bookingsService;
    constructor(bookingsService: BookingsService);
    create(user: any, dto: CreateBookingDto): Promise<{
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
    getMyBookings(user: any, status?: string): Promise<({
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
    getManagerBookings(user: any, status?: string): Promise<({
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
    getOne(user: any, id: string): Promise<{
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
    confirm(user: any, id: string): Promise<{
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
    reject(user: any, id: string, dto: RejectBookingDto): Promise<{
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
    cancel(user: any, id: string): Promise<{
        message: string;
        refundAmount: number;
    }>;
    reschedule(user: any, id: string, dto: RescheduleBookingDto): Promise<{
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
}
