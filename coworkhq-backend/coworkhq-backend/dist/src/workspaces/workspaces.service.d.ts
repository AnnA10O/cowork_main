import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto, CreateDeskDto, CreatePricingPlanDto, UpdatePricingPlanDto, CreateCouponDto, GenerateStaffCodeDto } from './workspaces.dto';
export declare class WorkspacesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(query: {
        city?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
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
    create(managerId: string, dto: CreateWorkspaceDto): Promise<{
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
    update(managerId: string, workspaceId: string, dto: Partial<CreateWorkspaceDto>): Promise<{
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
    deactivate(managerId: string, workspaceId: string): Promise<{
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
    addImage(managerId: string, workspaceId: string, imageUrl: string, order: number): Promise<{
        id: string;
        createdAt: Date;
        workspaceId: string;
        order: number;
        url: string;
    }>;
    removeImage(managerId: string, imageId: string): Promise<{
        message: string;
    }>;
    addDesk(managerId: string, workspaceId: string, dto: CreateDeskDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        workspaceId: string;
        description: string | null;
        type: string;
        deskNumber: string;
        premiumExtra: import("@prisma/client/runtime/library").Decimal;
    }>;
    updateDesk(managerId: string, deskId: string, dto: Partial<CreateDeskDto>): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        workspaceId: string;
        description: string | null;
        type: string;
        deskNumber: string;
        premiumExtra: import("@prisma/client/runtime/library").Decimal;
    }>;
    getDeskAvailability(workspaceId: string, date: string): Promise<{
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
    createPricingPlan(managerId: string, workspaceId: string, dto: CreatePricingPlanDto): Promise<{
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
    updatePricingPlan(managerId: string, planId: string, dto: UpdatePricingPlanDto): Promise<{
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
    createCoupon(managerId: string, workspaceId: string, dto: CreateCouponDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        workspaceId: string;
        code: string;
        discountPercent: import("@prisma/client/runtime/library").Decimal | null;
        discountFlat: import("@prisma/client/runtime/library").Decimal | null;
        maxUses: number;
        validFrom: Date;
        validUntil: Date;
        usedCount: number;
    }>;
    generateQrCode(managerId: string, workspaceId: string, deskId?: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        workspaceId: string;
        code: string;
        deskId: string | null;
    }>;
    generateStaffCode(managerId: string, _dto?: GenerateStaffCodeDto): Promise<{
        id: string;
        createdAt: Date;
        managerId: string;
        code: string;
        isUsed: boolean;
        expiresAt: Date;
    }>;
    getMyStaff(managerId: string): Promise<({
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
        staffCodeId: string;
        workspaceId: string | null;
    })[]>;
    getManagerDashboard(managerId: string): Promise<{
        workspaces: number;
        totalBookings: number;
        pendingBookings: number;
        totalRevenue: number | import("@prisma/client/runtime/library").Decimal;
    }>;
    private assertOwner;
}
