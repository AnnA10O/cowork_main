import { PrismaService } from '../prisma/prisma.service';
declare class UpdateProfileDto {
    name?: string;
    phone?: string;
    preferredLang?: string;
}
declare class CreateFeedbackDto {
    workspaceId: string;
    bookingId?: string;
    rating: number;
    comment?: string;
}
declare class WarnCustomerDto {
    customerId: string;
    reason: string;
}
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        phone: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
        managerProfile: {
            id: string;
            businessName: string;
            gstNumber: string;
            platformFeeDue: import("@prisma/client/runtime/library").Decimal;
            totalPaid: import("@prisma/client/runtime/library").Decimal;
        };
        customerProfile: {
            id: string;
            loyaltyPoints: number;
            referralCode: string;
            preferredLang: string;
        };
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        phone: string;
        name: string;
    }>;
    submitFeedback(userId: string, dto: CreateFeedbackDto): Promise<{
        id: string;
        createdAt: Date;
        workspaceId: string;
        customerId: string;
        bookingId: string | null;
        rating: number;
        comment: string | null;
        isPublic: boolean;
    }>;
    getWorkspaceFeedbacks(workspaceId: string): Promise<({
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
    })[]>;
    warnCustomer(managerId: string, dto: WarnCustomerDto): Promise<{
        id: string;
        createdAt: Date;
        customerId: string;
        reason: string;
        issuedBy: string;
    }>;
    getLoyaltyPoints(userId: string): Promise<{
        loyaltyPoints: number;
        referralCode: string;
    }>;
    updateManagerProfile(userId: string, data: {
        businessName?: string;
        gstNumber?: string;
        panNumber?: string;
        bankAccountNumber?: string;
        bankIfsc?: string;
    }): Promise<{
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
    }>;
}
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getProfile(user: any): Promise<{
        id: string;
        email: string;
        phone: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
        managerProfile: {
            id: string;
            businessName: string;
            gstNumber: string;
            platformFeeDue: import("@prisma/client/runtime/library").Decimal;
            totalPaid: import("@prisma/client/runtime/library").Decimal;
        };
        customerProfile: {
            id: string;
            loyaltyPoints: number;
            referralCode: string;
            preferredLang: string;
        };
    }>;
    updateProfile(user: any, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        phone: string;
        name: string;
    }>;
    getLoyaltyPoints(user: any): Promise<{
        loyaltyPoints: number;
        referralCode: string;
    }>;
    updateManagerProfile(user: any, data: any): Promise<{
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
    }>;
    submitFeedback(user: any, dto: CreateFeedbackDto): Promise<{
        id: string;
        createdAt: Date;
        workspaceId: string;
        customerId: string;
        bookingId: string | null;
        rating: number;
        comment: string | null;
        isPublic: boolean;
    }>;
    getWorkspaceFeedbacks(workspaceId: string): Promise<({
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
    })[]>;
    warnCustomer(user: any, dto: WarnCustomerDto): Promise<{
        id: string;
        createdAt: Date;
        customerId: string;
        reason: string;
        issuedBy: string;
    }>;
}
export declare class UsersModule {
}
export {};
