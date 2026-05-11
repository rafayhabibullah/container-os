import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { OrganisationService } from './organisations.service';
import { SiteService } from './sites.service';
import { TeamService } from './team.service';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

interface MemberContext {
  id: string;
  userId: string;
  role: string;
  organisationId: string;
}

@ApiTags('organisations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class OrganisationController {
  constructor(
    private readonly organisations: OrganisationService,
    private readonly sites: SiteService,
    private readonly team: TeamService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get organisation profile' })
  getOrganisation(@Param('organisationId') orgId: string) {
    return this.organisations.getOrganisation(orgId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update organisation profile (owner only)' })
  updateOrganisation(
    @Param('organisationId') orgId: string,
    @Body() dto: UpdateOrganisationDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.organisations.updateOrganisation(orgId, dto, member.role);
  }

  @Get('sites')
  @ApiOperation({ summary: 'List sites in organisation' })
  listSites(@Param('organisationId') orgId: string) {
    return this.sites.listSites(orgId);
  }

  @Post('sites')
  @ApiOperation({ summary: 'Create a new site (owner only)' })
  createSite(
    @Param('organisationId') orgId: string,
    @Body() dto: CreateSiteDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.sites.createSite(orgId, dto, member.role);
  }

  @Get('sites/:siteId')
  @ApiOperation({ summary: 'Get a single site' })
  getSite(@Param('organisationId') orgId: string, @Param('siteId') siteId: string) {
    return this.sites.getSite(orgId, siteId);
  }

  @Patch('sites/:siteId')
  @ApiOperation({ summary: 'Update a site (owner only)' })
  updateSite(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
    @Body() dto: UpdateSiteDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.sites.updateSite(orgId, siteId, dto, member.role);
  }

  @Delete('sites/:siteId')
  @ApiOperation({ summary: 'Soft-delete a site (owner only)' })
  deleteSite(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.sites.deleteSite(orgId, siteId, member.role);
  }

  @Get('members')
  @ApiOperation({ summary: 'List organisation members' })
  listMembers(@Param('organisationId') orgId: string) {
    return this.team.listMembers(orgId);
  }

  @Delete('members/:memberId')
  @ApiOperation({ summary: 'Remove a member (owner only)' })
  removeMember(
    @Param('organisationId') orgId: string,
    @Param('memberId') memberId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.team.removeMember(orgId, memberId, member.role, member.userId);
  }

  @Get('invitations')
  @ApiOperation({ summary: 'List pending invitations (owner only)' })
  listInvitations(
    @Param('organisationId') orgId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.team.listInvitations(orgId, member.role);
  }

  @Delete('invitations/:invitationId')
  @ApiOperation({ summary: 'Revoke a pending invitation (owner only)' })
  revokeInvitation(
    @Param('organisationId') orgId: string,
    @Param('invitationId') invitationId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.team.revokeInvitation(orgId, invitationId, member.role);
  }
}
