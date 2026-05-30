import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { OrganisationService } from './organisations.service';
import { SiteService } from './sites.service';
import { TeamService } from './team.service';
import { UnitTypeService } from './unit-type.service';
import { PricingManagementService } from './pricing-management.service';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { CreateUnitTypeDto } from './dto/create-unit-type.dto';
import { UpdateUnitTypeDto } from './dto/update-unit-type.dto';
import { CreatePriceBookDto } from './dto/create-price-book.dto';
import { CreateRateRuleDto } from './dto/create-rate-rule.dto';

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
    private readonly unitTypes: UnitTypeService,
    private readonly pricing: PricingManagementService,
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

  @Get('customers')
  @ApiOperation({ summary: 'List customers for organisation' })
  listCustomers(@Param('organisationId') orgId: string) {
    return this.organisations.listCustomers(orgId);
  }

  @Get('customers/:customerId')
  @ApiOperation({ summary: 'Get a single customer' })
  getCustomer(@Param('organisationId') orgId: string, @Param('customerId') customerId: string) {
    return this.organisations.getCustomer(orgId, customerId);
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

  // ─── Unit Types ──────────────────────────────────────────────────────────────

  @Get('sites/:siteId/unit-types')
  @ApiOperation({ summary: 'List unit types for a site' })
  listUnitTypes(@Param('organisationId') orgId: string, @Param('siteId') siteId: string) {
    return this.unitTypes.listUnitTypes(orgId, siteId);
  }

  @Post('sites/:siteId/unit-types')
  @ApiOperation({ summary: 'Create unit type (owner only)' })
  createUnitType(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
    @Body() dto: CreateUnitTypeDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.unitTypes.createUnitType(orgId, siteId, dto, member.role);
  }

  @Patch('sites/:siteId/unit-types/:unitTypeId')
  @ApiOperation({ summary: 'Update unit type (owner only)' })
  updateUnitType(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
    @Param('unitTypeId') unitTypeId: string,
    @Body() dto: UpdateUnitTypeDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.unitTypes.updateUnitType(orgId, siteId, unitTypeId, dto, member.role);
  }

  @Delete('sites/:siteId/unit-types/:unitTypeId')
  @ApiOperation({ summary: 'Delete unit type (owner only)' })
  deleteUnitType(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
    @Param('unitTypeId') unitTypeId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.unitTypes.deleteUnitType(orgId, siteId, unitTypeId, member.role);
  }

  // ─── Price Books ─────────────────────────────────────────────────────────────

  @Get('sites/:siteId/price-books')
  @ApiOperation({ summary: 'List price books for a site' })
  listPriceBooks(@Param('siteId') siteId: string) {
    return this.pricing.listPriceBooks(siteId);
  }

  @Post('sites/:siteId/price-books')
  @ApiOperation({ summary: 'Create price book (owner only)' })
  createPriceBook(
    @Param('siteId') siteId: string,
    @Body() dto: CreatePriceBookDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.pricing.createPriceBook(siteId, dto, member.role);
  }

  @Post('sites/:siteId/price-books/:priceBookId/publish')
  @ApiOperation({ summary: 'Publish a price book (owner only)' })
  publishPriceBook(
    @Param('siteId') siteId: string,
    @Param('priceBookId') priceBookId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.pricing.publishPriceBook(siteId, priceBookId, member.role);
  }

  @Post('sites/:siteId/price-books/:priceBookId/archive')
  @ApiOperation({ summary: 'Archive a price book (owner only)' })
  archivePriceBook(
    @Param('siteId') siteId: string,
    @Param('priceBookId') priceBookId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.pricing.archivePriceBook(siteId, priceBookId, member.role);
  }

  @Post('sites/:siteId/price-books/:priceBookId/rate-rules')
  @ApiOperation({ summary: 'Add rate rule to price book (owner only)' })
  addRateRule(
    @Param('siteId') siteId: string,
    @Param('priceBookId') priceBookId: string,
    @Body() dto: CreateRateRuleDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.pricing.addRateRule(siteId, priceBookId, dto, member.role);
  }

  @Delete('sites/:siteId/price-books/:priceBookId/rate-rules/:rateRuleId')
  @ApiOperation({ summary: 'Remove rate rule (owner only)' })
  removeRateRule(
    @Param('siteId') siteId: string,
    @Param('priceBookId') priceBookId: string,
    @Param('rateRuleId') rateRuleId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.pricing.removeRateRule(siteId, priceBookId, rateRuleId, member.role);
  }

  // ─── Units ───────────────────────────────────────────────────────────────────

  @Get('sites/:siteId/units')
  @ApiOperation({ summary: 'List units for a site' })
  listUnits(@Param('organisationId') orgId: string, @Param('siteId') siteId: string) {
    return this.sites.listUnits(orgId, siteId);
  }

  @Post('sites/:siteId/units')
  @ApiOperation({ summary: 'Create a unit' })
  createUnit(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
    @Body() body: { unitCode: string; unitTypeId: string; kind: string; driveUp: boolean },
  ) {
    return this.sites.createUnit(orgId, siteId, body);
  }

  @Get('sites/:siteId/units/:unitId')
  @ApiOperation({ summary: 'Get a single unit' })
  getUnit(@Param('organisationId') orgId: string, @Param('siteId') siteId: string, @Param('unitId') unitId: string) {
    return this.sites.getUnit(orgId, siteId, unitId);
  }

  @Patch('sites/:siteId/units/:unitId')
  @ApiOperation({ summary: 'Update a unit' })
  patchUnit(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
    @Param('unitId') unitId: string,
    @Body() body: { unitCode?: string; driveUp?: boolean; status?: string },
  ) {
    return this.sites.patchUnit(orgId, siteId, unitId, body);
  }

  @Delete('sites/:siteId/units/:unitId')
  @ApiOperation({ summary: 'Soft-delete a unit' })
  deleteUnit(@Param('organisationId') orgId: string, @Param('siteId') siteId: string, @Param('unitId') unitId: string) {
    return this.sites.softDeleteUnit(orgId, siteId, unitId);
  }
}
