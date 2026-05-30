import { AuthService } from '../auth/auth.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { BookingsService } from '../bookings/bookings.service';
import { PaymentsService } from '../payments/payments.service';
export declare class MobileService {
    private authService;
    private workspacesService;
    private bookingsService;
    private paymentsService;
    constructor(authService: AuthService, workspacesService: WorkspacesService, bookingsService: BookingsService, paymentsService: PaymentsService);
    register(dto: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            role: string;
        };
    }>;
    login(dto: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            role: string;
        };
    }>;
    loginWithFirebase(idToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            role: string;
        };
    }>;
    refreshToken(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            role: string;
        };
    }>;
    changePassword(userId: string, dto: any): Promise<{
        message: string;
    }>;
    findWorkspaces(query: any): Promise<{
        workspaces: ({
            _count: {
                desks: number;
            };
            workingHours: {
                id: string;
                day: import(".prisma/client").$Enums.DayOfWeek;
                workspaceId: string;
                openTime: string;
                closeTime: string;
                isClosed: boolean;
            }[];
            images: {
                id: string;
                createdAt: Date;
                workspaceId: string;
                order: number;
                url: string;
            }[];
            pricingPlans: {
                id: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                workspaceId: string;
                type: import(".prisma/client").$Enums.PricingType;
                basePrice: import("@prisma/client/runtime/library").Decimal;
                currency: string;
            }[];
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            managerId: string;
            description: string | null;
            address: string;
            city: string;
            state: string;
            pincode: string;
            latitude: import("@prisma/client/runtime/library").Decimal;
            longitude: import("@prisma/client/runtime/library").Decimal;
            googleMapsUrl: string | null;
            status: import(".prisma/client").$Enums.WorkspaceStatus;
            amenities: string[];
            totalDesks: number;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    findWorkspace(id: string): Promise<{
        feedbacks: ({
            customer: {
                user: {
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
        } & {
            id: string;
            createdAt: Date;
            workspaceId: string;
            customerId: string;
            bookingId: string | null;
            rating: number;
            comment: string | null;
            isPublic: boolean;
        })[];
        workingHours: {
            id: string;
            day: import(".prisma/client").$Enums.DayOfWeek;
            workspaceId: string;
            openTime: string;
            closeTime: string;
            isClosed: boolean;
        }[];
        images: {
            id: string;
            createdAt: Date;
            workspaceId: string;
            order: number;
            url: string;
        }[];
        desks: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            workspaceId: string;
            description: string | null;
            type: string;
            deskNumber: string;
            premiumExtra: import("@prisma/client/runtime/library").Decimal;
        }[];
        pricingPlans: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            type: import(".prisma/client").$Enums.PricingType;
            basePrice: import("@prisma/client/runtime/library").Decimal;
            currency: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        managerId: string;
        description: string | null;
        address: string;
        city: string;
        state: string;
        pincode: string;
        latitude: import("@prisma/client/runtime/library").Decimal;
        longitude: import("@prisma/client/runtime/library").Decimal;
        googleMapsUrl: string | null;
        status: import(".prisma/client").$Enums.WorkspaceStatus;
        amenities: string[];
        totalDesks: number;
    }>;
    getDeskAvailability(id: string, date: string): Promise<{
        isAvailable: boolean;
        bookings: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            status: import(".prisma/client").$Enums.BookingStatus;
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
        }[];
        id: string;
        isActive: boolean;
        createdAt: Date;
        workspaceId: string;
        description: string | null;
        type: string;
        deskNumber: string;
        premiumExtra: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    createBooking(customerId: string, dto: any): Promise<{
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
        workspaceId: string;
        status: import(".prisma/client").$Enums.BookingStatus;
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
    getMyBookings(customerId: string, status?: string): Promise<({
        workspace: {
            name: string;
            address: string;
            city: string;
        };
        desk: {
            type: string;
            deskNumber: string;
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
        workspaceId: string;
        status: import(".prisma/client").$Enums.BookingStatus;
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
    getOneBooking(bookingId: string, userId: string): Promise<{
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
        workspace: {
            name: string;
            managerId: string;
            address: string;
        };
        desk: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            workspaceId: string;
            description: string | null;
            type: string;
            deskNumber: string;
            premiumExtra: import("@prisma/client/runtime/library").Decimal;
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
        workspaceId: string;
        status: import(".prisma/client").$Enums.BookingStatus;
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
    cancelBooking(bookingId: string, customerId: string): Promise<{
        message: string;
        refundAmount: number;
    }>;
    rescheduleBooking(bookingId: string, customerId: string, dto: any): Promise<{
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
            workspaceId: string;
            status: import(".prisma/client").$Enums.BookingStatus;
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
    createPaymentOrder(bookingId: string): Promise<{
        orderId: any;
        amount: number;
        currency: string;
        key: any;
    }>;
    verifyPayment(dto: any): Promise<{
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
}
