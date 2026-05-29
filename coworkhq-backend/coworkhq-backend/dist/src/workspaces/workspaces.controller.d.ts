import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, CreateDeskDto, CreatePricingPlanDto, UpdatePricingPlanDto, CreateCouponDto, GenerateStaffCodeDto } from './workspaces.dto';
export declare class WorkspacesController {
    private workspacesService;
    constructor(workspacesService: WorkspacesService);
    findAll(query: any): Promise<{
        workspaces: ({
            _count: {
                desks: number;
            };
            images: {
                id: string;
                createdAt: Date;
                order: number;
                workspaceId: string;
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
            workingHours: {
                id: string;
                day: import(".prisma/client").$Enums.DayOfWeek;
                workspaceId: string;
                openTime: string;
                closeTime: string;
                isClosed: boolean;
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
    findOne(id: string): Promise<{
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
        images: {
            id: string;
            createdAt: Date;
            order: number;
            workspaceId: string;
            url: string;
        }[];
        desks: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            description: string | null;
            workspaceId: string;
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
        workingHours: {
            id: string;
            day: import(".prisma/client").$Enums.DayOfWeek;
            workspaceId: string;
            openTime: string;
            closeTime: string;
            isClosed: boolean;
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
        }[];
        id: string;
        isActive: boolean;
        createdAt: Date;
        description: string | null;
        workspaceId: string;
        type: string;
        deskNumber: string;
        premiumExtra: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    create(user: any, dto: CreateWorkspaceDto): Promise<{
        workingHours: {
            id: string;
            day: import(".prisma/client").$Enums.DayOfWeek;
            workspaceId: string;
            openTime: string;
            closeTime: string;
            isClosed: boolean;
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
    update(user: any, id: string, dto: Partial<CreateWorkspaceDto>): Promise<{
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
    deactivate(user: any, id: string): Promise<{
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
    addImages(user: any, id: string, files: any[]): {
        message: string;
        files: any[];
    };
    removeImage(user: any, imageId: string): Promise<{
        message: string;
    }>;
    addDesk(user: any, id: string, dto: CreateDeskDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        description: string | null;
        workspaceId: string;
        type: string;
        deskNumber: string;
        premiumExtra: import("@prisma/client/runtime/library").Decimal;
    }>;
    updateDesk(user: any, deskId: string, dto: Partial<CreateDeskDto>): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        description: string | null;
        workspaceId: string;
        type: string;
        deskNumber: string;
        premiumExtra: import("@prisma/client/runtime/library").Decimal;
    }>;
    createPricingPlan(user: any, id: string, dto: CreatePricingPlanDto): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        type: import(".prisma/client").$Enums.PricingType;
        basePrice: import("@prisma/client/runtime/library").Decimal;
        currency: string;
    }>;
    updatePricingPlan(user: any, planId: string, dto: UpdatePricingPlanDto): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        type: import(".prisma/client").$Enums.PricingType;
        basePrice: import("@prisma/client/runtime/library").Decimal;
        currency: string;
    }>;
    createCoupon(user: any, id: string, dto: CreateCouponDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        workspaceId: string;
        code: string;
        discountPercent: import("@prisma/client/runtime/library").Decimal | null;
        discountFlat: import("@prisma/client/runtime/library").Decimal | null;
        maxUses: number;
        usedCount: number;
        validFrom: Date;
        validUntil: Date;
    }>;
    generateQr(user: any, id: string, deskId?: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        workspaceId: string;
        deskId: string | null;
        code: string;
    }>;
    generateStaffCode(user: any, dto: GenerateStaffCodeDto): Promise<{
        id: string;
        createdAt: Date;
        managerId: string;
        code: string;
        isUsed: boolean;
        expiresAt: Date;
    }>;
    getMyStaff(user: any): Promise<({
        user: {
            id: string;
            email: string;
            name: string;
            isActive: boolean;
        };
        workspace: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        managerId: string;
        workspaceId: string | null;
        staffCodeId: string;
    })[]>;
    getManagerDashboard(user: any): Promise<{
        workspaces: number;
        totalBookings: number;
        pendingBookings: number;
        totalRevenue: number | import("@prisma/client/runtime/library").Decimal;
    }>;
}
