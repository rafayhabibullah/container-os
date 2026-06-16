import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanEnforcementService, PlanFeature } from './plan-enforcement.service';
import { PLAN_FEATURE_KEY } from './require-plan-feature.decorator';

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly plans: PlanEnforcementService) {}

  async canActivate(context: ExecutionContext) {
    const feature = this.reflector.getAllAndOverride<PlanFeature>(PLAN_FEATURE_KEY, [context.getHandler(), context.getClass()]);
    if (!feature) return true;
    const request = context.switchToHttp().getRequest();
    await this.plans.assertFeature(request.params.organisationId, feature);
    return true;
  }
}
