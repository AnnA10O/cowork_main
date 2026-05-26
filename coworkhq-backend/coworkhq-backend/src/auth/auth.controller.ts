import { Controller, Post, Body, UseGuards, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterDto, LoginDto, StaffRegisterDto,
  RefreshTokenDto, ChangePasswordDto,
} from './auth.dto';
import { Public } from '../common/decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /** POST /auth/register — Customer or Manager sign-up */
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** POST /auth/register/staff — Staff sign-up via manager code */
  @Public()
  @Post('register/staff')
  registerStaff(@Body() dto: StaffRegisterDto) {
    return this.authService.registerStaff(dto);
  }

  /** POST /auth/login */
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** POST /auth/refresh */
  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  /** PATCH /auth/change-password */
  @Patch('change-password')
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }
}
