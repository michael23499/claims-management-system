import { BadRequestException } from '@nestjs/common';
import {
  assertClaimIsPending,
  assertStatusChange,
  calculateTotal,
  hasHighSeverityDamage,
} from './claim-rules';

describe('claim-rules', () => {
  describe('hasHighSeverityDamage', () => {
    it('is false without high-severity damages', () => {
      expect(
        hasHighSeverityDamage([{ severity: 'low' }, { severity: 'mid' }]),
      ).toBe(false);
    });

    it('is true with at least one high-severity damage', () => {
      expect(
        hasHighSeverityDamage([{ severity: 'low' }, { severity: 'high' }]),
      ).toBe(true);
    });
  });

  describe('assertStatusChange', () => {
    const base = { hasHighSeverity: false, description: '' };

    it('allows a no-op (same status)', () => {
      expect(() =>
        assertStatusChange({ current: 'finalized', next: 'finalized', ...base }),
      ).not.toThrow();
    });

    it('rejects changing status of a terminal claim', () => {
      expect(() =>
        assertStatusChange({ current: 'finalized', next: 'pending', ...base }),
      ).toThrow(BadRequestException);
      expect(() =>
        assertStatusChange({ current: 'canceled', next: 'pending', ...base }),
      ).toThrow(BadRequestException);
    });

    it('allows canceling from pending', () => {
      expect(() =>
        assertStatusChange({ current: 'pending', next: 'canceled', ...base }),
      ).not.toThrow();
    });

    it('rejects canceling from a non-pending state', () => {
      expect(() =>
        assertStatusChange({ current: 'in_review', next: 'canceled', ...base }),
      ).toThrow(BadRequestException);
    });

    it('rejects finalizing with a high-severity damage and a short description', () => {
      expect(() =>
        assertStatusChange({
          current: 'pending',
          next: 'finalized',
          hasHighSeverity: true,
          description: 'short',
        }),
      ).toThrow(BadRequestException);
    });

    it('allows finalizing with a high-severity damage and a long (>100) description', () => {
      expect(() =>
        assertStatusChange({
          current: 'pending',
          next: 'finalized',
          hasHighSeverity: true,
          description: 'x'.repeat(101),
        }),
      ).not.toThrow();
    });

    it('allows finalizing without high-severity damage regardless of description', () => {
      expect(() =>
        assertStatusChange({
          current: 'pending',
          next: 'finalized',
          hasHighSeverity: false,
          description: '',
        }),
      ).not.toThrow();
    });

    it('allows a normal transition (pending -> in_review)', () => {
      expect(() =>
        assertStatusChange({ current: 'pending', next: 'in_review', ...base }),
      ).not.toThrow();
    });
  });

  describe('calculateTotal', () => {
    it('is 0 with no damages', () => {
      expect(calculateTotal([])).toBe(0);
    });

    it('sums the damage prices', () => {
      expect(calculateTotal([{ price: 100 }, { price: 50.5 }])).toBe(150.5);
    });
  });

  describe('assertClaimIsPending', () => {
    it('passes when the claim is pending', () => {
      expect(() => assertClaimIsPending('pending')).not.toThrow();
    });

    it('throws when the claim is not pending', () => {
      expect(() => assertClaimIsPending('in_review')).toThrow(
        BadRequestException,
      );
    });
  });
});
