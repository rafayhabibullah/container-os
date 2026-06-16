import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { MollieAdapter } from './mollie.adapter';

@Injectable()
export class OrganisationPaymentService {
  constructor(private readonly prisma: PrismaClient, private readonly mollie: MollieAdapter) {}

  getAccount(organisationId: string) {
    return (this.prisma as any).organisationPaymentAccount.upsert({
      where: { organisationId_provider: { organisationId, provider: 'mollie' } },
      create: { organisationId, provider: 'mollie', status: 'not_connected' },
      update: {},
    });
  }

  async startMollieOnboarding(organisationId: string, returnUrl?: string) {
    const organisation = await this.prisma.organisation.findUniqueOrThrow({ where: { id: organisationId } });
    const state = randomBytes(24).toString('hex');
    const target = returnUrl ?? `${process.env.APP_URL ?? 'http://localhost:3001'}/settings/payments?provider=mollie`;
    const link = this.mollie.createOrganisationOnboardingLink({ organisationId, returnUrl: target, state });
    return (this.prisma as any).organisationPaymentAccount.upsert({
      where: { organisationId_provider: { organisationId, provider: 'mollie' } },
      create: {
        organisationId,
        provider: 'mollie',
        status: 'onboarding_started',
        onboardingUrl: link.onboardingUrl,
        onboardingStartedAt: new Date(),
        metadata: { state, mode: link.mode, legalName: organisation.legalName },
      },
      update: {
        status: 'onboarding_started',
        onboardingUrl: link.onboardingUrl,
        onboardingStartedAt: new Date(),
        metadata: { state, mode: link.mode, legalName: organisation.legalName },
      },
    });
  }

  async completeMollieOnboarding(organisationId: string, providerAccountId?: string, capabilities?: object) {
    if (!providerAccountId && process.env.NODE_ENV === 'production') {
      throw new BadRequestException('providerAccountId is required in production');
    }
    return (this.prisma as any).organisationPaymentAccount.upsert({
      where: { organisationId_provider: { organisationId, provider: 'mollie' } },
      create: {
        organisationId,
        provider: 'mollie',
        status: 'connected',
        providerAccountId: providerAccountId ?? `manual:${organisationId}`,
        capabilities: capabilities ?? { payments: true, refunds: false },
        onboardingCompletedAt: new Date(),
      },
      update: {
        status: 'connected',
        providerAccountId: providerAccountId ?? `manual:${organisationId}`,
        capabilities: capabilities ?? { payments: true, refunds: false },
        onboardingCompletedAt: new Date(),
      },
    });
  }

  async assertConnected(organisationId: string) {
    const account = await this.getAccount(organisationId);
    if (account.status !== 'connected') throw new BadRequestException('Organisation Mollie account is not connected');
    return account;
  }
}
