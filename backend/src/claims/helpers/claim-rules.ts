import { BadRequestException } from '@nestjs/common';
import { ClaimErrors } from '../../common/errors';
import type { ClaimStatus, Severity } from '../types/claim.types';

const TERMINAL_STATUSES: readonly ClaimStatus[] = ['finalized', 'canceled'];

// True if the claim has at least one high-severity damage.
export function hasHighSeverityDamage(
  damages: ReadonlyArray<{ severity: Severity }>,
): boolean {
  return damages.some((damage) => damage.severity === 'high');
}

// Total amount of a claim = sum of its damage prices.
export function calculateTotal(
  damages: ReadonlyArray<{ price: number }>,
): number {
  return damages.reduce((sum, damage) => sum + damage.price, 0);
}

// Damages can only be managed while the claim is pending (INSTRUCTIONS 2.3).
export function assertClaimIsPending(status: ClaimStatus): void {
  if (status !== 'pending') {
    throw new BadRequestException(ClaimErrors.damagesOnlyWhenPending);
  }
}

// Enforces the claim status transition rules (INSTRUCTIONS 2.1 / 2.3 + the
// terminal-state decision). Throws BadRequestException on a forbidden change.
export function assertStatusChange(params: {
  current: ClaimStatus;
  next: ClaimStatus;
  hasHighSeverity: boolean;
  description: string;
}): void {
  const { current, next, hasHighSeverity, description } = params;

  if (current === next) return; // no-op

  if (TERMINAL_STATUSES.includes(current)) {
    throw new BadRequestException(ClaimErrors.terminal(current));
  }

  if (next === 'canceled' && current !== 'pending') {
    throw new BadRequestException(ClaimErrors.cancelOnlyFromPending);
  }

  if (next === 'finalized' && hasHighSeverity && description.length <= 100) {
    throw new BadRequestException(ClaimErrors.finalizeNeedsLongDescription);
  }
}
