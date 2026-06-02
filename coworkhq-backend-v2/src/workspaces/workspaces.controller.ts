import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UploadedFile, UploadedFiles, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { WorkspacesService } from './workspaces.service';
import {
  CreateWorkspaceDto, CreateDeskDto, CreateBulkDesksDto, CreatePricingPlanDto,
  UpdatePricingPlanDto, CreateCouponDto, GenerateStaffCodeDto,
} from './workspaces.dto';
import { Roles, Public } from '../common/decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  // ── Public endpoints ──────────────────────────────────────────────

  /** GET /workspaces?city=Pune&search=sky&page=1&limit=20 */
  @Public()
  @Get()
  findAll(@Query() query: any) {
    return this.workspacesService.findAll(query);
  }

  /** GET /workspaces/my — list manager's workspaces */
  @Roles(Role.MANAGER)
  @Get('my')
  findMyWorkspaces(@CurrentUser() user: any) {
    return this.workspacesService.findMyWorkspaces(user.managerProfile.id);
  }

  /** GET /workspaces/:id/coupons — list coupons for a workspace */
  @Roles(Role.MANAGER)
  @Get(':id/coupons')
  getWorkspaceCoupons(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.workspacesService.getWorkspaceCoupons(user.managerProfile.id, id);
  }

  /** GET /workspaces/:id */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workspacesService.findOne(id);
  }

  /** GET /workspaces/:id/availability?date=2026-05-10 */
  @Public()
  @Get(':id/availability')
  getDeskAvailability(
    @Param('id') id: string, 
    @Query('date') date: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string
  ) {
    return this.workspacesService.getDeskAvailability(id, date, startTime, endTime);
  }

  // ── Manager endpoints ─────────────────────────────────────────────

  /** POST /workspaces — create workspace */
  @Roles(Role.MANAGER)
  @Post()
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(user.managerProfile.id, dto);
  }

  /** PATCH /workspaces/:id */
  @Roles(Role.MANAGER)
  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkspaceDto>,
  ) {
    return this.workspacesService.update(user.managerProfile.id, id, dto);
  }

  /** DELETE /workspaces/:id */
  @Roles(Role.MANAGER)
  @Delete(':id')
  deactivate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.workspacesService.deactivate(user.managerProfile.id, id);
  }

  // ── Images ────────────────────────────────────────────────────────

  /** POST /workspaces/:id/images — upload an image to a slot */
  @Roles(Role.MANAGER)
  @Post(':id/images')
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body('order') orderStr?: string,
  ) {
    const order = orderStr ? parseInt(orderStr, 10) : 0;
    return this.workspacesService.uploadImage(user.managerProfile.id, id, file, order);
  }

  /** DELETE /workspaces/images/:imageId */
  @Roles(Role.MANAGER)
  @Delete('images/:imageId')
  removeImage(@CurrentUser() user: any, @Param('imageId') imageId: string) {
    return this.workspacesService.removeImage(user.managerProfile.id, imageId);
  }

  // ── Desks ─────────────────────────────────────────────────────────

  /** POST /workspaces/:id/desks/bulk */
  @Roles(Role.MANAGER)
  @Post(':id/desks/bulk')
  addBulkDesks(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateBulkDesksDto,
  ) {
    return this.workspacesService.addBulkDesks(user.managerProfile.id, id, dto);
  }

  /** POST /workspaces/:id/desks */
  @Roles(Role.MANAGER)
  @Post(':id/desks')
  addDesk(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateDeskDto,
  ) {
    return this.workspacesService.addDesk(user.managerProfile.id, id, dto);
  }

  /** PATCH /workspaces/desks/:deskId */
  @Roles(Role.MANAGER)
  @Patch('desks/:deskId')
  updateDesk(
    @CurrentUser() user: any,
    @Param('deskId') deskId: string,
    @Body() dto: Partial<CreateDeskDto>,
  ) {
    return this.workspacesService.updateDesk(user.managerProfile.id, deskId, dto);
  }

  /** DELETE /workspaces/desks/:deskId */
  @Roles(Role.MANAGER)
  @Delete('desks/:deskId')
  deleteDesk(
    @CurrentUser() user: any,
    @Param('deskId') deskId: string,
  ) {
    return this.workspacesService.deleteDesk(user.managerProfile.id, deskId);
  }

  // ── Pricing Plans ─────────────────────────────────────────────────

  /** POST /workspaces/:id/pricing */
  @Roles(Role.MANAGER)
  @Post(':id/pricing')
  createPricingPlan(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreatePricingPlanDto,
  ) {
    return this.workspacesService.createPricingPlan(user.managerProfile.id, id, dto);
  }

  /** PATCH /workspaces/pricing/:planId */
  @Roles(Role.MANAGER)
  @Patch('pricing/:planId')
  updatePricingPlan(
    @CurrentUser() user: any,
    @Param('planId') planId: string,
    @Body() dto: UpdatePricingPlanDto,
  ) {
    return this.workspacesService.updatePricingPlan(user.managerProfile.id, planId, dto);
  }

  // ── Coupons ───────────────────────────────────────────────────────

  /** POST /workspaces/:id/coupons */
  @Roles(Role.MANAGER)
  @Post(':id/coupons')
  createCoupon(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateCouponDto,
  ) {
    return this.workspacesService.createCoupon(user.managerProfile.id, id, dto);
  }

  /** DELETE /workspaces/coupons/:couponId */
  @Roles(Role.MANAGER)
  @Delete('coupons/:couponId')
  deleteCoupon(
    @CurrentUser() user: any,
    @Param('couponId') couponId: string,
  ) {
    return this.workspacesService.deleteCoupon(user.managerProfile.id, couponId);
  }

  // ── QR Codes ──────────────────────────────────────────────────────

  /** POST /workspaces/:id/qr?deskId=xxx */
  @Roles(Role.MANAGER)
  @Post(':id/qr')
  generateQr(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('deskId') deskId?: string,
  ) {
    return this.workspacesService.generateQrCode(user.managerProfile.id, id, deskId);
  }

  // ── Staff Codes ───────────────────────────────────────────────────

  /** POST /workspaces/staff-codes */
  @Roles(Role.MANAGER)
  @Post('staff-codes/generate')
  generateStaffCode(@CurrentUser() user: any, @Body() dto: GenerateStaffCodeDto) {
    return this.workspacesService.generateStaffCode(user.managerProfile.id, dto);
  }

  /** GET /workspaces/staff-codes/my-staff */
  @Roles(Role.MANAGER)
  @Get('staff-codes/my-staff')
  getMyStaff(@CurrentUser() user: any) {
    return this.workspacesService.getMyStaff(user.managerProfile.id);
  }

  // ── Manager Dashboard ─────────────────────────────────────────────

  /** GET /workspaces/manager/dashboard */
  @Roles(Role.MANAGER)
  @Get('manager/dashboard')
  getManagerDashboard(@CurrentUser() user: any) {
    return this.workspacesService.getManagerDashboard(user.managerProfile.id);
  }
}
