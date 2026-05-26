import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [MulterModule.register({ dest: '/tmp/uploads' })],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
