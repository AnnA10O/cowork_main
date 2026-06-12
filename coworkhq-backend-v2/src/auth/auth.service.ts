import {
  Injectable, BadRequestException, UnauthorizedException,
  ConflictException, NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  RegisterDto, LoginDto, StaffRegisterDto,
  ChangePasswordDto,
} from './auth.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ── Register Customer or Manager ──────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role,
        ...(dto.role === Role.MANAGER && {
          managerProfile: {
            create: {
              businessName: dto.businessName || dto.name,
            },
          },
        }),
        ...(dto.role === Role.CUSTOMER && {
          customerProfile: {
            create: {
              referredBy: dto.referralCode || null,
            },
          },
        }),
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return this.signTokens(user);
  }

  // ── Register Staff (via manager-issued code) ──────────────────────

  async registerStaff(dto: StaffRegisterDto) {
    const staffCode = await this.prisma.staffCode.findUnique({
      where: { code: dto.staffCode },
      include: { manager: true },
    });

    if (!staffCode) throw new NotFoundException('Invalid staff code');
    if (staffCode.isUsed) throw new BadRequestException('Staff code already used');
    if (new Date() > staffCode.expiresAt) throw new BadRequestException('Staff code expired');

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: Role.STAFF,
          staffProfile: {
            create: {
              managerId: staffCode.managerId,
              staffCodeId: staffCode.id,
            },
          },
        },
        select: { id: true, name: true, email: true, role: true },
      });

      await tx.staffCode.update({
        where: { id: staffCode.id },
        data: { isUsed: true },
      });

      return u;
    });

    return this.signTokens(user);
  }

  // ── Login ─────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.isBanned) {
      throw new UnauthorizedException(`Account suspended: ${user.bannedReason}`);
    }
    if (!user.isActive) throw new UnauthorizedException('Account inactive');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.signTokens(user);
  }

  // ── Refresh Token ─────────────────────────────────────────────────

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true },
      });
      if (!user) throw new UnauthorizedException();
      return this.signTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ── Change Password ───────────────────────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'Password changed successfully' };
  }

  // ── Update Profile ───────────────────────────────────────────────

  async updateProfile(userId: string, name: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true, role: true },
    });
    return user;
  }

  // ── Firebase Authentication ───────────────────────────────────────

  private ensureFirebaseInitialized(): boolean {
    if (admin.apps.length > 0) return true;

    try {
      const saPath = path.join(process.cwd(), 'firebase-service-account.json');
      if (fs.existsSync(saPath)) {
        admin.initializeApp({
          credential: admin.credential.cert(saPath),
        });
        console.log('Firebase Admin: Initialized successfully using service account JSON.');
        return true;
      }
    } catch (e) {
      console.warn('Firebase Admin: Failed to initialize service account:', e);
    }
    return false;
  }

  async loginWithFirebase(idToken: string) {
    let email: string;
    let name: string;

    const firebaseInitialized = this.ensureFirebaseInitialized();

    if (firebaseInitialized) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        email = decodedToken.email;
        name = decodedToken.name || decodedToken.email.split('@')[0];
      } catch (e) {
        throw new UnauthorizedException('Invalid Firebase ID Token: ' + (e as any).message);
      }
    } else {
      // Graceful fallback for local development if service account is not yet uploaded
      console.warn(
        '⚠️ Firebase Admin SDK is NOT initialized (missing firebase-service-account.json). ' +
        'Falling back to insecure JWT decoding for development.',
      );
      try {
        // Decode without signature verification for dev bypass
        const parts = idToken.split('.');
        if (parts.length !== 3) {
          throw new Error('JWT must have 3 parts');
        }
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        
        email = payload.email;
        name = payload.name || payload.email?.split('@')[0] || 'Firebase User';
        
        if (!email) {
          throw new Error('No email in token payload');
        }
      } catch (e) {
        // If it's a test synthetic token that is just a simple email address (e.g. for offline bypass)
        if (idToken.includes('@')) {
          email = idToken.trim();
          name = email.split('@')[0];
        } else {
          throw new UnauthorizedException('Failed to decode developer bypass token: ' + (e as any).message);
        }
      }
    }

    // Find or create customer
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Auto-register user as customer
      user = await this.prisma.$transaction(async (tx) => {
        return tx.user.create({
          data: {
            email,
            name,
            role: Role.CUSTOMER,
            isActive: true,
            passwordHash: '', // Passwordless for Google/Firebase users
            customerProfile: {
              create: {},
            },
          },
        });
      });
      console.log(`Firebase Auth: Auto-registered new customer in database: ${email}`);
    }

    return this.signTokens(user);
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private signTokens(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
      }),
      refreshToken: this.jwtService.sign(payload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
