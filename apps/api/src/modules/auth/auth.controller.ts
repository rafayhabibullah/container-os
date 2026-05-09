import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('operator/v1/auth/me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }

  @Post('operator/v1/users/invite')
  @UseGuards(JwtAuthGuard)
  invite(@Body() body: { email: string; type: string; roleId: string; siteIds: string[] }) {
    return this.authService.inviteUser(body.email, body.type, body.roleId, body.siteIds);
  }
}
