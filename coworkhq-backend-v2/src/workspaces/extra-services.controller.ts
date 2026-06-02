import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ExtraServicesService } from './extra-services.service';
import { Roles, Public } from '../common/decorators';

@Controller('workspaces/:workspaceId/extra-services')
export class ExtraServicesController {
  constructor(private readonly extraServicesService: ExtraServicesService) {}

  @Post()
  @Roles(Role.MANAGER, Role.ADMIN)
  create(@Param('workspaceId') workspaceId: string, @Body() data: { name: string; description?: string; price: number; currency?: string }) {
    return this.extraServicesService.create(workspaceId, data);
  }

  @Get()
  @Public()
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.extraServicesService.findAllByWorkspace(workspaceId);
  }

  @Patch(':id')
  @Roles(Role.MANAGER, Role.ADMIN)
  update(@Param('id') id: string, @Body() data: { name?: string; description?: string; price?: number; isActive?: boolean }) {
    return this.extraServicesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.MANAGER, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.extraServicesService.remove(id);
  }
}
