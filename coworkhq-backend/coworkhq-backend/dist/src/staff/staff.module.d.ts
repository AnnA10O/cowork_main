import { PrismaService } from '../prisma/prisma.service';
export declare class StaffService {
    private prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        name: string;
        staffProfile: {
            workspace: {
                id: string;
                name: string;
                address: string;
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
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            managerId: string;
            workspaceId: string | null;
            staffCodeId: string;
        };
    }>;
    getDashboard(staffId: string): Promise<{
        openIssues: number;
        resolvedToday: number;
    }>;
    getAssignedWorkspace(staffId: string): Promise<{
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
}
export declare class StaffController {
    private staffService;
    constructor(staffService: StaffService);
    getProfile(user: any): Promise<{
        id: string;
        email: string;
        name: string;
        staffProfile: {
            workspace: {
                id: string;
                name: string;
                address: string;
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
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            managerId: string;
            workspaceId: string | null;
            staffCodeId: string;
        };
    }>;
    getDashboard(user: any): Promise<{
        openIssues: number;
        resolvedToday: number;
    }>;
    getWorkspace(user: any): Promise<{
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
}
export declare class StaffModule {
}
