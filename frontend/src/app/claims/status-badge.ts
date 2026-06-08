import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ClaimStatus } from './claim.model';

// Reusable status pill, used in the claim list and detail. Styling lives in the
// global design system (.badge / .badge--<status>).
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="cssClass()">{{ label() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<ClaimStatus>();

  protected readonly label = computed(() => this.status().replace('_', ' '));
  protected readonly cssClass = computed(() => `badge badge--${this.status()}`);
}
