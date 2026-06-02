import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExtraServicesService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, data: { name: string; description?: string; price: number; currency?: string }) {
    return this.prisma.extraService.create({
      data: {
        workspaceId,
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency || 'INR',
      },
    });
  }

  async findAllByWorkspace(workspaceId: string) {
    return this.prisma.extraService.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: { name?: string; description?: string; price?: number; isActive?: boolean }) {
    return this.prisma.extraService.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.extraService.delete({
      where: { id },
    });
  }
}
