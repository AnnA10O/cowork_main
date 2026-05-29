import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
declare class ReportIssueDto {
    description: string;
    qrCode?: string;
    workspaceId?: string;
    deskId?: string;
}
declare class ResolveIssueDto {
    note: string;
}
export declare class IssuesService {
    private prisma;
    private notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    reportViaQr(qrCode: string, description: string, reportedBy?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        status: import(".prisma/client").$Enums.IssueStatus;
        workspaceId: string;
        deskId: string | null;
        reportedBy: string | null;
        resolvedAt: Date | null;
        qrCodeId: string | null;
    }>;
    getIssues(workspaceId: string, status?: string): Promise<({
        assignments: ({
            staff: {
                user: {
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
            };
        } & {
            id: string;
            note: string | null;
            resolvedAt: Date | null;
            assignedAt: Date;
            issueId: string;
            staffId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        status: import(".prisma/client").$Enums.IssueStatus;
        workspaceId: string;
        deskId: string | null;
        reportedBy: string | null;
        resolvedAt: Date | null;
        qrCodeId: string | null;
    })[]>;
    resolve(issueId: string, staffId: string, note: string): Promise<{
        message: string;
    }>;
    getMyIssues(staffId: string): Promise<({
        issue: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            status: import(".prisma/client").$Enums.IssueStatus;
            workspaceId: string;
            deskId: string | null;
            reportedBy: string | null;
            resolvedAt: Date | null;
            qrCodeId: string | null;
        };
    } & {
        id: string;
        note: string | null;
        resolvedAt: Date | null;
        assignedAt: Date;
        issueId: string;
        staffId: string;
    })[]>;
    escalate(issueId: string, managerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        status: import(".prisma/client").$Enums.IssueStatus;
        workspaceId: string;
        deskId: string | null;
        reportedBy: string | null;
        resolvedAt: Date | null;
        qrCodeId: string | null;
    }>;
}
export declare class IssuesController {
    private issuesService;
    constructor(issuesService: IssuesService);
    reportViaQr(qrCode: string, dto: ReportIssueDto, user?: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        status: import(".prisma/client").$Enums.IssueStatus;
        workspaceId: string;
        deskId: string | null;
        reportedBy: string | null;
        resolvedAt: Date | null;
        qrCodeId: string | null;
    }>;
    getIssues(workspaceId: string, status?: string): Promise<({
        assignments: ({
            staff: {
                user: {
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
            };
        } & {
            id: string;
            note: string | null;
            resolvedAt: Date | null;
            assignedAt: Date;
            issueId: string;
            staffId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        status: import(".prisma/client").$Enums.IssueStatus;
        workspaceId: string;
        deskId: string | null;
        reportedBy: string | null;
        resolvedAt: Date | null;
        qrCodeId: string | null;
    })[]>;
    getMyIssues(user: any): Promise<({
        issue: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            status: import(".prisma/client").$Enums.IssueStatus;
            workspaceId: string;
            deskId: string | null;
            reportedBy: string | null;
            resolvedAt: Date | null;
            qrCodeId: string | null;
        };
    } & {
        id: string;
        note: string | null;
        resolvedAt: Date | null;
        assignedAt: Date;
        issueId: string;
        staffId: string;
    })[]>;
    resolve(user: any, id: string, dto: ResolveIssueDto): Promise<{
        message: string;
    }>;
    escalate(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        status: import(".prisma/client").$Enums.IssueStatus;
        workspaceId: string;
        deskId: string | null;
        reportedBy: string | null;
        resolvedAt: Date | null;
        qrCodeId: string | null;
    }>;
}
export declare class IssuesModule {
}
export {};
