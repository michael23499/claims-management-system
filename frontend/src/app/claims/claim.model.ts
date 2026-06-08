// Mirrors the API contract in openapi.yaml.

export type ClaimStatus = 'pending' | 'in_review' | 'finalized' | 'canceled';
export type Severity = 'low' | 'mid' | 'high';

// Option lists for dropdowns (mirror the backend enums).
export const SEVERITIES: Severity[] = ['low', 'mid', 'high'];
export const CLAIM_STATUSES: ClaimStatus[] = [
  'pending',
  'in_review',
  'finalized',
  'canceled',
];

export interface Damage {
  id: string;
  part: string;
  description: string;
  imageUrl: string;
  price: number;
  score: number;
  severity: Severity;
}

export interface Claim {
  id: string;
  title: string;
  description?: string;
  status: ClaimStatus;
  totalAmount: number;
  damages: Damage[];
  createdAt?: string;
  updatedAt?: string;
}

// Paginated API response.
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Portfolio-wide stats for the dashboard (GET /claims/stats).
export interface ClaimStats {
  total: number;
  byStatus: Record<ClaimStatus, number>;
  totalValue: number;
}

// Payloads sent to the API.
export interface CreateClaim {
  title: string;
  description?: string;
}

export interface UpdateClaim {
  title?: string;
  description?: string;
  status?: ClaimStatus;
}

export interface CreateDamage {
  part: string;
  description: string;
  imageUrl: string;
  price: number;
  score: number;
  severity: Severity;
}
