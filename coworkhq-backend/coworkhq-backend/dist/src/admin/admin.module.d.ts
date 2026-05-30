import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
declare class BanUserDto {
    reason: string;
}
declare class AdminFeedbackResponseDto {
    adminNote: string;
    isResolved?: boolean;
}
declare class CreateManagerFeedbackDto {
    subject: string;
    message: string;
}
export declare class AdminService {
    private prisma;
    private notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    getDashboard(): Promise<{
        users: {
            total: number;
            managers: number;
            customers: number;
        };
        workspaces: number;
        bookings: number;
        revenue: number | import("@prisma/client/runtime/library").Decimal;
        pendingPlatformFees: number | import("@prisma/client/runtime/library").Decimal;
        openIssues: number;
    }>;
    getAllUsers(role?: Role, page?: number, limit?: number): Promise<{
        users: {
            id: string;
            email: string;
            phone: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            isBanned: boolean;
            bannedReason: string;
            createdAt: Date;
            managerProfile: {
                id: string;
                businessName: string;
                platformFeeDue: import("@prisma/client/runtime/library").Decimal;
            };
            customerProfile: {
                id: string;
                loyaltyPoints: number;
            };
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    banUser(adminId: string, targetUserId: string, reason: string): Promise<{
        message: string;
    }>;
    unbanUser(targetUserId: string): Promise<{
        message: string;
    }>;
    getAllWorkspaces(city?: string, page?: number, limit?: number): Promise<({
        _count: {
            bookings: number;
            desks: number;
        };
        manager: {
            user: {
                email: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            businessName: string;
            gstNumber: string | null;
            panNumber: string | null;
            bankAccountNumber: string | null;
            bankIfsc: string | null;
            platformFeeDue: import("@prisma/client/runtime/library").Decimal;
            totalPaid: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        };
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
    })[]>;
    suspendWorkspace(workspaceId: string): Promise<{
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
    getFeedbacks(resolved?: boolean): Promise<({
        manager: {
            user: {
                email: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            businessName: string;
            gstNumber: string | null;
            panNumber: string | null;
            bankAccountNumber: string | null;
            bankIfsc: string | null;
            platformFeeDue: import("@prisma/client/runtime/library").Decimal;
            totalPaid: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        managerId: string;
        message: string;
        adminNote: string | null;
        isResolved: boolean;
        subject: string;
    })[]>;
    respondFeedback(feedbackId: string, dto: AdminFeedbackResponseDto): Promise<{
        id: string;
        createdAt: Date;
        managerId: string;
        message: string;
        adminNote: string | null;
        isResolved: boolean;
        subject: string;
    }>;
    getPlatformFees(status?: string): Promise<({
        manager: {
            user: {
                email: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            businessName: string;
            gstNumber: string | null;
            panNumber: string | null;
            bankAccountNumber: string | null;
            bankIfsc: string | null;
            platformFeeDue: import("@prisma/client/runtime/library").Decimal;
            totalPaid: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        managerId: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        razorpayOrderId: string;
        razorpayPaymentId: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        month: string;
    })[]>;
    getOccupancyAnalytics(city?: string): Promise<{
        id: string;
        name: string;
        city: string;
        totalDesks: number;
        bookingsLast30: number;
        occupancyRate: string;
    }[]>;
}
export declare class AdminController {
    private adminService;
    constructor(adminService: AdminService);
    getDashboard(): Promise<{
        users: {
            total: number;
            managers: number;
            customers: number;
        };
        workspaces: number;
        bookings: number;
        revenue: number | import("@prisma/client/runtime/library").Decimal;
        pendingPlatformFees: number | import("@prisma/client/runtime/library").Decimal;
        openIssues: number;
    }>;
    getUsers(role?: Role, page?: number): Promise<{
        users: {
            id: string;
            email: string;
            phone: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            isBanned: boolean;
            bannedReason: string;
            createdAt: Date;
            managerProfile: {
                id: string;
                businessName: string;
                platformFeeDue: import("@prisma/client/runtime/library").Decimal;
            };
            customerProfile: {
                id: string;
                loyaltyPoints: number;
            };
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    banUser(user: any, id: string, dto: BanUserDto): Promise<{
        message: string;
    }>;
    unbanUser(id: string): Promise<{
        message: string;
    }>;
    getWorkspaces(city?: string, page?: number): Promise<({
        _count: {
            bookings: number;
            desks: number;
        };
        manager: {
            user: {
                email: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            businessName: string;
            gstNumber: string | null;
            panNumber: string | null;
            bankAccountNumber: string | null;
            bankIfsc: string | null;
            platformFeeDue: import("@prisma/client/runtime/library").Decimal;
            totalPaid: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        };
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
    })[]>;
    suspendWorkspace(id: string): Promise<{
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
    getFeedbacks(resolved?: string): Promise<({
        manager: {
            user: {
                email: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            businessName: string;
            gstNumber: string | null;
            panNumber: string | null;
            bankAccountNumber: string | null;
            bankIfsc: string | null;
            platformFeeDue: import("@prisma/client/runtime/library").Decimal;
            totalPaid: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        managerId: string;
        message: string;
        adminNote: string | null;
        isResolved: boolean;
        subject: string;
    })[]>;
    respondFeedback(id: string, dto: AdminFeedbackResponseDto): Promise<{
        id: string;
        createdAt: Date;
        managerId: string;
        message: string;
        adminNote: string | null;
        isResolved: boolean;
        subject: string;
    }>;
    getPlatformFees(status?: string): Promise<({
        manager: {
            user: {
                email: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            businessName: string;
            gstNumber: string | null;
            panNumber: string | null;
            bankAccountNumber: string | null;
            bankIfsc: string | null;
            platformFeeDue: import("@prisma/client/runtime/library").Decimal;
            totalPaid: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        managerId: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        razorpayOrderId: string;
        razorpayPaymentId: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        month: string;
    })[]>;
    getOccupancyAnalytics(city?: string): Promise<{
        id: string;
        name: string;
        city: string;
        totalDesks: number;
        bookingsLast30: number;
        occupancyRate: string;
    }[]>;
}
export declare class ManagerFeedbackController {
    private prisma;
    constructor(prisma: PrismaService);
    submitFeedback(user: any, dto: CreateManagerFeedbackDto): import(".prisma/client").Prisma.Prisma__ManagerFeedbackClient<{
        id: string;
        createdAt: Date;
        managerId: string;
        message: string;
        adminNote: string | null;
        isResolved: boolean;
        subject: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
export declare class AdminModule {
}
export {};
