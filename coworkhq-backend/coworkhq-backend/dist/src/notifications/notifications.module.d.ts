import { NotificationsService } from './notifications.service';
declare class MarkReadDto {
    ids: string[];
}
export declare class NotificationsController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    getUnread(user: any): Promise<{
        data: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        body: string;
        isRead: boolean;
    }[]>;
    markRead(user: any, dto: MarkReadDto): Promise<{
        message: string;
    }>;
}
export declare class NotificationsModule {
}
export {};
