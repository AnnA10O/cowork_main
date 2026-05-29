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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspacesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
let WorkspacesService = class WorkspacesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { city, search, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const where = { status: client_1.WorkspaceStatus.ACTIVE };
        if (city)
            where.city = { contains: city, mode: 'insensitive' };
        if (search)
            where.name = { contains: search, mode: 'insensitive' };
        const [workspaces, total] = await Promise.all([
            this.prisma.workspace.findMany({
                where, skip, take: limit,
                include: {
                    images: { orderBy: { order: 'asc' }, take: 1 },
                    pricingPlans: { where: { isActive: true } },
                    workingHours: true,
                    _count: { select: { desks: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.workspace.count({ where }),
        ]);
        return { workspaces, total, page, limit };
    }
    async findOne(id) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id },
            include: {
                images: { orderBy: { order: 'asc' } },
                pricingPlans: { where: { isActive: true } },
                workingHours: true,
                desks: { where: { isActive: true }, orderBy: { deskNumber: 'asc' } },
                feedbacks: {
                    include: { customer: { include: { user: { select: { name: true } } } } },
                    orderBy: { createdAt: 'desc' }, take: 10,
                },
            },
        });
        if (!workspace)
            throw new common_1.NotFoundException('Workspace not found');
        return workspace;
    }
    async create(managerId, dto) {
        return this.prisma.workspace.create({
            data: {
                managerId,
                name: dto.name,
                description: dto.description,
                address: dto.address,
                city: dto.city,
                state: dto.state,
                pincode: dto.pincode,
                latitude: dto.latitude,
                longitude: dto.longitude,
                googleMapsUrl: dto.googleMapsUrl,
                amenities: dto.amenities || [],
                workingHours: {
                    create: dto.workingHours,
                },
            },
            include: { workingHours: true },
        });
    }
    async update(managerId, workspaceId, dto) {
        await this.assertOwner(managerId, workspaceId);
        return this.prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                name: dto.name,
                description: dto.description,
                address: dto.address,
                city: dto.city,
                state: dto.state,
                pincode: dto.pincode,
                latitude: dto.latitude,
                longitude: dto.longitude,
                googleMapsUrl: dto.googleMapsUrl,
                amenities: dto.amenities,
            },
        });
    }
    async deactivate(managerId, workspaceId) {
        await this.assertOwner(managerId, workspaceId);
        return this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { status: client_1.WorkspaceStatus.INACTIVE },
        });
    }
    async addImage(managerId, workspaceId, imageUrl, order) {
        await this.assertOwner(managerId, workspaceId);
        const count = await this.prisma.workspaceImage.count({ where: { workspaceId } });
        if (count >= 4)
            throw new common_1.BadRequestException('Maximum 4 images allowed per workspace');
        return this.prisma.workspaceImage.create({
            data: { workspaceId, url: imageUrl, order },
        });
    }
    async removeImage(managerId, imageId) {
        const image = await this.prisma.workspaceImage.findUnique({
            where: { id: imageId },
            include: { workspace: true },
        });
        if (!image)
            throw new common_1.NotFoundException('Image not found');
        if (image.workspace.managerId !== managerId)
            throw new common_1.ForbiddenException();
        await this.prisma.workspaceImage.delete({ where: { id: imageId } });
        return { message: 'Image removed' };
    }
    async addDesk(managerId, workspaceId, dto) {
        await this.assertOwner(managerId, workspaceId);
        return this.prisma.desk.create({
            data: { workspaceId, ...dto },
        });
    }
    async updateDesk(managerId, deskId, dto) {
        const desk = await this.prisma.desk.findUnique({
            where: { id: deskId },
            include: { workspace: true },
        });
        if (!desk)
            throw new common_1.NotFoundException();
        if (desk.workspace.managerId !== managerId)
            throw new common_1.ForbiddenException();
        return this.prisma.desk.update({ where: { id: deskId }, data: dto });
    }
    async getDeskAvailability(workspaceId, date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        const desks = await this.prisma.desk.findMany({
            where: { workspaceId, isActive: true },
            include: {
                bookings: {
                    where: {
                        startTime: { lte: end },
                        endTime: { gte: start },
                        status: { in: ['CONFIRMED', 'PENDING'] },
                    },
                },
            },
        });
        return desks.map((desk) => ({
            ...desk,
            isAvailable: desk.bookings.length === 0,
        }));
    }
    async createPricingPlan(managerId, workspaceId, dto) {
        await this.assertOwner(managerId, workspaceId);
        return this.prisma.pricingPlan.create({ data: { workspaceId, ...dto } });
    }
    async updatePricingPlan(managerId, planId, dto) {
        const plan = await this.prisma.pricingPlan.findUnique({
            where: { id: planId },
            include: { workspace: true },
        });
        if (!plan || plan.workspace.managerId !== managerId)
            throw new common_1.ForbiddenException();
        return this.prisma.pricingPlan.update({ where: { id: planId }, data: dto });
    }
    async createCoupon(managerId, workspaceId, dto) {
        await this.assertOwner(managerId, workspaceId);
        return this.prisma.coupon.create({
            data: {
                workspaceId,
                code: dto.code.toUpperCase(),
                discountPercent: dto.discountPercent,
                discountFlat: dto.discountFlat,
                maxUses: dto.maxUses || 100,
                validFrom: new Date(dto.validFrom),
                validUntil: new Date(dto.validUntil),
            },
        });
    }
    async generateQrCode(managerId, workspaceId, deskId) {
        await this.assertOwner(managerId, workspaceId);
        return this.prisma.qrCode.create({
            data: { workspaceId, deskId: deskId || null },
        });
    }
    async generateStaffCode(managerId, _dto) {
        const code = (0, crypto_1.randomBytes)(4).toString('hex').toUpperCase();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        return this.prisma.staffCode.create({
            data: { managerId, code, expiresAt },
        });
    }
    async getMyStaff(managerId) {
        return this.prisma.staff.findMany({
            where: { managerId },
            include: {
                user: { select: { id: true, name: true, email: true, isActive: true } },
                workspace: { select: { id: true, name: true } },
            },
        });
    }
    async getManagerDashboard(managerId) {
        const [workspaces, totalBookings, pendingBookings, revenue] = await Promise.all([
            this.prisma.workspace.count({ where: { managerId } }),
            this.prisma.booking.count({
                where: { workspace: { managerId } },
            }),
            this.prisma.booking.count({
                where: { workspace: { managerId }, status: 'PENDING' },
            }),
            this.prisma.payment.aggregate({
                where: {
                    booking: { workspace: { managerId } },
                    status: 'SUCCESS',
                },
                _sum: { amount: true },
            }),
        ]);
        return {
            workspaces,
            totalBookings,
            pendingBookings,
            totalRevenue: revenue._sum.amount || 0,
        };
    }
    async assertOwner(managerId, workspaceId) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });
        if (!workspace)
            throw new common_1.NotFoundException('Workspace not found');
        if (workspace.managerId !== managerId)
            throw new common_1.ForbiddenException('Not your workspace');
        return workspace;
    }
};
exports.WorkspacesService = WorkspacesService;
exports.WorkspacesService = WorkspacesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkspacesService);
//# sourceMappingURL=workspaces.service.js.map