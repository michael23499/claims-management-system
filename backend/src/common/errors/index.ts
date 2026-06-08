// Central hub for all backend error messages (single source of truth).
// Grouped by domain. Add new domains (e.g. DamageErrors) here.

export const ClaimErrors = {
  notFound: (id: string) => `Claim ${id} not found`,
  cancelOnlyFromPending: 'A claim can only be canceled from pending',
  terminal: (status: string) => `A ${status} claim cannot change its status`,
  finalizeNeedsLongDescription:
    'Finalizing a claim with a high-severity damage requires a description over 100 characters',
  damagesOnlyWhenPending:
    'Damages can only be managed while the claim is pending',
  damageNotFound: (damageId: string) => `Damage ${damageId} not found`,
} as const;
