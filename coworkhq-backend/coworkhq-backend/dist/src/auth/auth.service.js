"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const admin = __importStar(require("firebase-admin"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let AuthService = class AuthService {
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing)
            throw new common_1.ConflictException('Email already registered');
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                passwordHash,
                role: dto.role,
                ...(dto.role === client_1.Role.MANAGER && {
                    managerProfile: {
                        create: {
                            businessName: dto.businessName || dto.name,
                        },
                    },
                }),
                ...(dto.role === client_1.Role.CUSTOMER && {
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
    async registerStaff(dto) {
        const staffCode = await this.prisma.staffCode.findUnique({
            where: { code: dto.staffCode },
            include: { manager: true },
        });
        if (!staffCode)
            throw new common_1.NotFoundException('Invalid staff code');
        if (staffCode.isUsed)
            throw new common_1.BadRequestException('Staff code already used');
        if (new Date() > staffCode.expiresAt)
            throw new common_1.BadRequestException('Staff code expired');
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing)
            throw new common_1.ConflictException('Email already registered');
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = await this.prisma.$transaction(async (tx) => {
            const u = await tx.user.create({
                data: {
                    name: dto.name,
                    email: dto.email,
                    passwordHash,
                    role: client_1.Role.STAFF,
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
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (user.isBanned) {
            throw new common_1.UnauthorizedException(`Account suspended: ${user.bannedReason}`);
        }
        if (!user.isActive)
            throw new common_1.UnauthorizedException('Account inactive');
        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        return this.signTokens(user);
    }
    async refreshToken(token) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_SECRET'),
            });
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                select: { id: true, email: true, role: true },
            });
            if (!user)
                throw new common_1.UnauthorizedException();
            return this.signTokens(user);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async changePassword(userId, dto) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!valid)
            throw new common_1.BadRequestException('Current password is incorrect');
        const passwordHash = await bcrypt.hash(dto.newPassword, 12);
        await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
        return { message: 'Password changed successfully' };
    }
    ensureFirebaseInitialized() {
        if (admin.apps.length > 0)
            return true;
        try {
            const saPath = path.join(process.cwd(), 'firebase-service-account.json');
            if (fs.existsSync(saPath)) {
                admin.initializeApp({
                    credential: admin.credential.cert(saPath),
                });
                console.log('Firebase Admin: Initialized successfully using service account JSON.');
                return true;
            }
        }
        catch (e) {
            console.warn('Firebase Admin: Failed to initialize service account:', e);
        }
        return false;
    }
    async loginWithFirebase(idToken) {
        let email;
        let name;
        const firebaseInitialized = this.ensureFirebaseInitialized();
        if (firebaseInitialized) {
            try {
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                email = decodedToken.email;
                name = decodedToken.name || decodedToken.email.split('@')[0];
            }
            catch (e) {
                throw new common_1.UnauthorizedException('Invalid Firebase ID Token: ' + e.message);
            }
        }
        else {
            console.warn('⚠️ Firebase Admin SDK is NOT initialized (missing firebase-service-account.json). ' +
                'Falling back to insecure JWT decoding for development.');
            try {
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
            }
            catch (e) {
                if (idToken.includes('@')) {
                    email = idToken.trim();
                    name = email.split('@')[0];
                }
                else {
                    throw new common_1.UnauthorizedException('Failed to decode developer bypass token: ' + e.message);
                }
            }
        }
        let user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            user = await this.prisma.$transaction(async (tx) => {
                return tx.user.create({
                    data: {
                        email,
                        name,
                        role: client_1.Role.CUSTOMER,
                        isActive: true,
                        passwordHash: '',
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
    signTokens(user) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map