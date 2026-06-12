import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from './decorators/index';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    const start = Date.now();

    // Check DB connectivity
    let dbStatus = 'online';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'offline';
    }

    // Check Razorpay config (just env var presence, no actual API call)
    const razorpayStatus =
      process.env.RAZORPAY_KEY_ID &&
      !process.env.RAZORPAY_KEY_ID.includes('xxxx')
        ? 'connected'
        : 'not configured';

    // Check WhatsApp / WATI config
    const whatsappStatus =
      process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN
        ? 'connected'
        : 'not configured';

    return {
      api: 'online',
      database: dbStatus,
      razorpay: razorpayStatus,
      whatsapp: whatsappStatus,
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  }
}
