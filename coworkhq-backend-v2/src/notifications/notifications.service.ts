import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // ── In-app notification ───────────────────────────────────────────

  async send(userId: string, payload: {
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
  }) {
    return this.prisma.notification.create({
      data: {
        userId,
        title: payload.title,
        body:  payload.body,
        type:  payload.type,
        data:  payload.data || {},
      },
    });
  }

  async getUnread(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(userId: string, notificationIds: string[]) {
    await this.prisma.notification.updateMany({
      where: { userId, id: { in: notificationIds } },
      data: { isRead: true },
    });
    return { message: 'Marked as read' };
  }

  // ── WhatsApp (WATI) ───────────────────────────────────────────────

  async sendWhatsApp(phone: string, templateName: string, params: string[]) {
    const apiUrl   = this.config.get('WHATSAPP_API_URL');
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
    } catch (err) {
      this.logger.error('WhatsApp send failed:', err);
    }
  }

  // ── Booking-specific WhatsApp notifications ───────────────────────

  async sendBookingConfirmation(booking: any) {
    const phone = booking.customer?.user?.phone;
    if (!phone) return;

    await this.sendWhatsApp(phone, 'booking_confirmed', [
      booking.customer.user.name,
      booking.workspace.name,
      booking.desk.deskNumber,
      new Date(booking.startTime).toLocaleString('en-IN'),
      `₹${booking.finalAmount}`,
    ]);

    // Also send in-app notification
    await this.send(booking.customer.user.id, {
      title: 'Booking Confirmed! 🎉',
      body: `Your desk ${booking.desk.deskNumber} at ${booking.workspace.name} is confirmed.`,
      type: 'booking_confirmed',
      data: { bookingId: booking.id },
    });
  }

  async sendIssueAlert(managerId: string, staffUserId: string | null, issue: any) {
    // Notify manager
    const manager = await this.prisma.manager.findUnique({
      where: { id: managerId },
      include: { user: { select: { id: true } } },
    });
    if (manager) {
      await this.send(manager.user.id, {
        title: 'New Issue Reported',
        body:  `Issue at Desk ${issue.deskId || 'workspace'}: ${issue.description.substring(0, 60)}`,
        type:  'new_issue',
        data:  { issueId: issue.id },
      });
    }

    // Notify assigned staff
    if (staffUserId) {
      await this.send(staffUserId, {
        title: 'Issue Assigned to You',
        body:  issue.description.substring(0, 60),
        type:  'issue_assigned',
        data:  { issueId: issue.id },
      });
    }
  }
}
