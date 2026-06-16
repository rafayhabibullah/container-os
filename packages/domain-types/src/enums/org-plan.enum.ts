export enum OrgPlan {
  Free = 'free',
  Starter = 'starter',
  Professional = 'professional',
  Enterprise = 'enterprise',
}

export const PLAN_LIMITS: Record<OrgPlan, { maxSites: number; maxUnits: number }> = {
  free: { maxSites: 1, maxUnits: 10 },
  starter: { maxSites: 1, maxUnits: 50 },
  professional: { maxSites: 5, maxUnits: 500 },
  enterprise: { maxSites: Infinity, maxUnits: Infinity },
};
