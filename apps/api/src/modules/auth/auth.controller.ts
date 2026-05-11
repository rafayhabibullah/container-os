import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, AuthResponseDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { InviteDto } from './dto/invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Business owner self-registration' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Email/password login for all user types' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @Get('invite/:token')
  @ApiOperation({ summary: 'Validate invitation token' })
  validateInvite(@Param('token') token: string) {
    return this.auth.validateInviteToken(token);
  }

  @Post('accept-invite')
  @ApiOperation({ summary: 'Accept invitation and set password' })
  acceptInvite(@Body() dto: AcceptInviteDto): Promise<AuthResponseDto> {
    return this.auth.acceptInvite(dto);
  }
}

@ApiTags('organisations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class OrganisationInviteController {
  constructor(private readonly auth: AuthService) {}

  @Post('invitations')
  @ApiOperation({ summary: 'Invite an operator or tenant to the organisation' })
  invite(
    @Param('organisationId') organisationId: string,
    @CurrentMember() member: { userId: string },
    @Body() dto: InviteDto,
  ) {
    return this.auth.invite(organisationId, member.userId, dto);
  }
}
