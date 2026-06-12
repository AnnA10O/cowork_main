import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExtraServicesService {
  constructor(private prisma: PrismaService) {}

  async createGlobal(managerId: string, data: { name: string; description?: string; price: number; currency?: string }) {
    return this.prisma.extraService.create({
      data: {
        managerId,
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency || 'INR',
      },
    });
  }

  async findAllByManager(managerId: string) {
    return this.prisma.extraService.findMany({
      where: { managerId },
      include: {
        _count: { select: { workspaces: true, bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllByWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { managerId: true },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    return this.prisma.extraService.findMany({
      where: {
        managerId: workspace.managerId,
        isActive: true,
        workspaces: {
          some: { workspaceId, isEnabled: true },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllForWorkspaceManager(managerId: string, workspaceId: string) {
    await this.assertWorkspaceOwner(managerId, workspaceId);

    const services = await this.prisma.extraService.findMany({
      where: { managerId },
      include: {
        workspaces: { where: { workspaceId } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return services.map((service) => {
      const workspaceState = service.workspaces[0];
      const { workspaces, ...rest } = service;
      return {
        ...rest,
        workspaceEnabled: workspaceState?.isEnabled === true,
        workspaceExtraServiceId: workspaceState?.id || null,
      };
    });
  }

  async updateGlobal(managerId: string, id: string, data: { name?: string; description?: string; price?: number; isActive?: boolean }) {
    await this.assertServiceOwner(managerId, id);
    return this.prisma.extraService.update({
      where: { id },
      data,
    });
  }

  async removeGlobal(managerId: string, id: string) {
    await this.assertServiceOwner(managerId, id);
    return this.prisma.extraService.delete({
      where: { id },
    });
  }

  async toggleForWorkspace(managerId: string, workspaceId: string, extraServiceId: string, isEnabled: boolean) {
    await this.assertWorkspaceOwner(managerId, workspaceId);
    await this.assertServiceOwner(managerId, extraServiceId);

    return this.prisma.workspaceExtraService.upsert({
      where: {
        workspaceId_extraServiceId: {
          workspaceId,
          extraServiceId,
        },
      },
      create: {
        workspaceId,
        extraServiceId,
        isEnabled,
      },
      update: { isEnabled },
    });
  }

  private async assertWorkspaceOwner(managerId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { managerId: true },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    if (workspace.managerId !== managerId) throw new ForbiddenException('Not your workspace');
    return workspace;
  }

  private async assertServiceOwner(managerId: string, serviceId: string) {
    const service = await this.prisma.extraService.findUnique({
      where: { id: serviceId },
      select: { managerId: true },
    });
    if (!service) throw new NotFoundException('Extra service not found');
    if (service.managerId !== managerId) throw new ForbiddenException('Not your extra service');
    return service;
  }
}
