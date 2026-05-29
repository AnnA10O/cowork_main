"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async send(userId, payload) {
        return this.prisma.notification.create({
            data: {
                userId,
                title: payload.title,
                body: payload.body,
                type: payload.type,
                data: payload.data || {},
            },
        });
    }
    async getUnread(userId) {
        return this.prisma.notification.findMany({
            where: { userId, isRead: false },
            orderBy: { createdAt: 'desc' },
        });
    }
    async markRead(userId, notificationIds) {
        await this.prisma.notification.updateMany({
            where: { userId, id: { in: notificationIds } },
            data: { isRead: true },
        });
        return { message: 'Marked as read' };
    }
    async sendWhatsApp(phone, templateName, params) {
        const apiUrl = this.config.get('WHATSAPP_API_URL');
        const apiToken = this.config.get('WHATSAPP_API_TOKEN');
        if (!apiUrl || !apiToken) {
            this.logger.warn('WhatsApp API not configured — skipping');
            return;
        }
        try {
            await fetch(`${apiUrl}/v1/sendTemplateMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiToken}`,
                },
                body: JSON.stringify({
                    whatsappNumber: phone.replace(/\D/g, ''),
                    template_name: templateName,
                    broadcast_name: templateName,
                    parameters: params.map((value) => ({ name: 'value', value })),
                }),
            });
        }
        catch (err) {
            this.logger.error('WhatsApp send failed:', err);
        }
    }
    async sendBookingConfirmation(booking) {
        const phone = booking.customer?.user?.phone;
        if (!phone)
            return;
        await this.sendWhatsApp(phone, 'booking_confirmed', [
            booking.customer.user.name,
            booking.workspace.name,
            booking.desk.deskNumber,
            new Date(booking.startTime).toLocaleString('en-IN'),
            `₹${booking.finalAmount}`,
        ]);
        await this.send(booking.customer.user.id, {
            title: 'Booking Confirmed! 🎉',
            body: `Your desk ${booking.desk.deskNumber} at ${booking.workspace.name} is confirmed.`,
            type: 'booking_confirmed',
            data: { bookingId: booking.id },
        });
    }
    async sendIssueAlert(managerId, staffUserId, issue) {
        const manager = await this.prisma.manager.findUnique({
            where: { id: managerId },
            include: { user: { select: { id: true } } },
        });
        if (manager) {
            await this.send(manager.user.id, {
                title: 'New Issue Reported',
                body: `Issue at Desk ${issue.deskId || 'workspace'}: ${issue.description.substring(0, 60)}`,
                type: 'new_issue',
                data: { issueId: issue.id },
            });
        }
        if (staffUserId) {
            await this.send(staffUserId, {
                title: 'Issue Assigned to You',
                body: issue.description.substring(0, 60),
                type: 'issue_assigned',
                data: { issueId: issue.id },
            });
        }
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map