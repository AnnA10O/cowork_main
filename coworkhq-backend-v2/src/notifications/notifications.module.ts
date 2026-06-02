import { Controller, Get, Patch, Body, Module } from '@nestjs/common';
import { IsArray, IsString } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class MarkReadDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  getUnread(@CurrentUser() user: any) {
    return this.notificationsService.getUnread(user.id);
  }

  @Patch('mark-read')
  markRead(@CurrentUser() user: any, @Body() dto: MarkReadDto) {
    return this.notificationsService.markRead(user.id, dto.ids);
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
