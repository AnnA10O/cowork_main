import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ExtraServicesService } from './extra-services.service';
import { Roles, Public } from '../common/decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class ExtraServicesController {
  constructor(private readonly extraServicesService: ExtraServicesService) {}

  @Post('extra-services')
  @Roles(Role.MANAGER)
  createGlobal(@CurrentUser() user: any, @Body() data: { name: string; description?: string; price: number; currency?: string }) {
    return this.extraServicesService.createGlobal(user.managerProfile.id, data);
  }

  @Get('extra-services')
  @Roles(Role.MANAGER)
  findGlobal(@CurrentUser() user: any) {
    return this.extraServicesService.findAllByManager(user.managerProfile.id);
  }

  @Get('workspaces/:workspaceId/extra-services')
  @Public()
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.extraServicesService.findAllByWorkspace(workspaceId);
  }

  @Get('workspaces/:workspaceId/extra-services/manage')
  @Roles(Role.MANAGER)
  findForWorkspaceManager(@CurrentUser() user: any, @Param('workspaceId') workspaceId: string) {
    return this.extraServicesService.findAllForWorkspaceManager(user.managerProfile.id, workspaceId);
  }

  @Patch('workspaces/:workspaceId/extra-services/:id/toggle')
  @Roles(Role.MANAGER)
  toggleForWorkspace(
    @CurrentUser() user: any,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() data: { isEnabled: boolean },
  ) {
    return this.extraServicesService.toggleForWorkspace(user.managerProfile.id, workspaceId, id, data.isEnabled === true);
  }

  @Patch('extra-services/:id')
  @Roles(Role.MANAGER)
  updateGlobal(@CurrentUser() user: any, @Param('id') id: string, @Body() data: { name?: string; description?: string; price?: number; isActive?: boolean }) {
    return this.extraServicesService.updateGlobal(user.managerProfile.id, id, data);
  }

  @Delete('extra-services/:id')
  @Roles(Role.MANAGER)
  removeGlobal(@CurrentUser() user: any, @Param('id') id: string) {
    return this.extraServicesService.removeGlobal(user.managerProfile.id, id);
  }
}
