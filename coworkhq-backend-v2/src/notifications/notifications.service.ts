import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
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
    // Send FCM Push notification asynchronously
    this.sendPushNotification(userId, payload.title, payload.body, payload.data).catch(err => {
      this.logger.error('Error in sendPushNotification async call', err);
    });

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

  async registerFcmToken(userId: string, fcmToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
    return { message: 'FCM token registered successfully' };
  }

  async getAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private ensureFirebaseInitialized(): boolean {
    if (admin.apps.length > 0) return true;
    try {
      const saPath = path.join(process.cwd(), 'firebase-service-account.json');
      if (fs.existsSync(saPath)) {
        admin.initializeApp({
          credential: admin.credential.cert(saPath),
        });
        this.logger.log('Firebase Admin initialized for Push Notifications.');
        return true;
      }
    } catch (e) {
      this.logger.warn('Firebase Admin failed to initialize:', e);
    }
    return false;
  }

  async sendPushNotification(userId: string, title: string, body: string, data?: Record<string, any>) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) {
      return;
    }

    const firebaseInitialized = this.ensureFirebaseInitialized();
    if (!firebaseInitialized) {
      this.logger.warn('Firebase Admin not initialized — skipping push');
      return;
    }

    try {
      const messageData = data ? Object.entries(data).reduce((acc, [key, val]) => {
        acc[key] = String(val);
        return acc;
      }, {} as Record<string, string>) : {};

      await admin.messaging().send({
        token: user.fcmToken,
        notification: { title, body },
        data: messageData,
      });
      this.logger.log(`Push notification sent successfully to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send push notification to user ${userId}:`, error);
    }
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
