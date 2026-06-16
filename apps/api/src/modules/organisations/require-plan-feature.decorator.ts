import { SetMetadata } from '@nestjs/common';
import { PlanFeature } from './plan-enforcement.service';

export const PLAN_FEATURE_KEY = 'plan_feature';
export const RequirePlanFeature = (feature: PlanFeature) => SetMetadata(PLAN_FEATURE_KEY, feature);
