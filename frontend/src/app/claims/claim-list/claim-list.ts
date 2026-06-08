import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Claim, ClaimStats } from '../claim.model';
import { ClaimsService } from '../claims.service';
import { errorMessage } from '../http-error.util';
import { StatusBadge } from '../status-badge';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-claim-list',
  imports: [CurrencyPipe, RouterLink, ReactiveFormsModule, StatusBadge, Icon],
  templateUrl: './claim-list.html',
  styleUrl: './claim-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimList {
  private readonly claimsService = inject(ClaimsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly pageSize = 10;

  protected readonly claims = signal<Claim[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  // Page lives in the URL (?page=N) so it survives navigating into a claim and back.
  protected readonly page = signal(
    Number(this.route.snapshot.queryParamMap.get('page')) || 1,
  );
  protected readonly total = signal(0);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );

  // Portfolio-wide metrics from GET /claims/stats (whole collection, not a page).
  private readonly stats = signal<ClaimStats>({
    total: 0,
    byStatus: { pending: 0, in_review: 0, finalized: 0, canceled: 0 },
    totalValue: 0,
  });
  protected readonly kpis = computed(() => {
    const s = this.stats();
    return {
      total: s.total,
      pending: s.byStatus.pending,
      inReview: s.byStatus.in_review,
      finalized: s.byStatus.finalized,
      canceled: s.byStatus.canceled,
      value: s.totalValue,
    };
  });

  protected readonly createForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
  });

  constructor() {
    this.load();
    this.loadStats();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.page.set(page);
    this.syncPageInUrl();
    this.load();
  }

  create(): void {
    if (this.createForm.invalid) {
      return;
    }
    this.creating.set(true);
    this.createError.set(null);
    this.claimsService.create(this.createForm.getRawValue()).subscribe({
      next: () => {
        this.createForm.reset();
        this.creating.set(false);
        this.page.set(1); // newest first -> the new claim shows on the first page
        this.syncPageInUrl();
        this.load();
        this.loadStats();
      },
      error: (err: HttpErrorResponse) => {
        this.createError.set(errorMessage(err, 'Could not create the claim.'));
        this.creating.set(false);
      },
    });
  }

  private syncPageInUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: this.page() },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private load(): void {
    this.loading.set(true);
    this.claimsService.list(this.page(), this.pageSize).subscribe({
      next: (res) => {
        this.claims.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  private loadStats(): void {
    this.claimsService.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
    });
  }
}
