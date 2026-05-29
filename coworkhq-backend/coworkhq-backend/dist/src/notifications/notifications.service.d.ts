import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsService {
    private prisma;
    private config;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService);
    send(userId: string, payload: {
        title: string;
        body: string;
        type: string;
        data?: Record<string, any>;
    }): Promise<{
        data: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        body: string;
        isRead: boolean;
    }>;
    getUnread(userId: string): Promise<{
        data: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        body: string;
        isRead: boolean;
    }[]>;
    markRead(userId: string, notificationIds: string[]): Promise<{
        message: string;
    }>;
    sendWhatsApp(phone: string, templateName: string, params: string[]): Promise<void>;
    sendBookingConfirmation(booking: any): Promise<void>;
    sendIssueAlert(managerId: string, staffUserId: string | null, issue: any): Promise<void>;
}
