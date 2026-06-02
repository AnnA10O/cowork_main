import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { ExtraServicesController } from './extra-services.controller';
import { ExtraServicesService } from './extra-services.service';

@Module({
  imports: [MulterModule.register({ storage: memoryStorage() })],
  controllers: [WorkspacesController, ExtraServicesController],
  providers: [WorkspacesService, ExtraServicesService],
  exports: [WorkspacesService, ExtraServicesService],
})
export class WorkspacesModule {}
