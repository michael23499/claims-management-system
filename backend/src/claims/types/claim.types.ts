// Single source of truth for the allowed values. The const arrays feed both
// the TypeScript union types and the Mongoose enums.
export const CLAIM_STATUSES = [
  'pending',
  'in_review',
  'finalized',
  'canceled',
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const SEVERITIES = ['low', 'mid', 'high'] as const;
export type Severity = (typeof SEVERITIES)[number];

// Portfolio-wide aggregates for the dashboard (computed over the whole
// collection, not a single page).
export interface ClaimStats {
  total: number;
  byStatus: Record<ClaimStatus, number>;
  totalValue: number;
}
