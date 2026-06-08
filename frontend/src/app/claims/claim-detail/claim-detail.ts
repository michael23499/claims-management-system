import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Claim, ClaimStatus, Damage, SEVERITIES, Severity } from '../claim.model';
import { ClaimsService } from '../claims.service';
import { errorMessage } from '../http-error.util';
import { StatusBadge } from '../status-badge';
import { UploadsService } from '../uploads.service';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-claim-detail',
  imports: [CurrencyPipe, RouterLink, ReactiveFormsModule, StatusBadge, Icon],
  templateUrl: './claim-detail.html',
  styleUrl: './claim-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly claimsService = inject(ClaimsService);
  private readonly uploadsService = inject(UploadsService);
  private readonly fb = inject(FormBuilder);

  protected readonly severities = SEVERITIES;

  // Labels for the status-change action buttons.
  private readonly statusLabels: Record<ClaimStatus, string> = {
    pending: 'Reopen (pending)',
    in_review: 'Start review',
    finalized: 'Finalize',
    canceled: 'Cancel claim',
  };

  protected readonly claim = signal<Claim | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly saving = signal(false);
  protected readonly uploadingImage = signal(false);
  protected readonly imagePreview = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly statusError = signal<string | null>(null);
  protected readonly editingClaim = signal(false);
  protected readonly claimError = signal<string | null>(null);

  // The damage being edited (null = the form is adding a new one).
  private readonly editingDamage = signal<Damage | null>(null);
  protected readonly isEditing = computed(() => this.editingDamage() !== null);

  // Total derived reactively from the claim's damages (recomputes on add /
  // remove / edit, which all replace the claim signal).
  protected readonly total = computed(() =>
    (this.claim()?.damages ?? []).reduce((sum, d) => sum + d.price, 0),
  );

  // Damages can only be managed while the claim is pending (business rule).
  protected readonly isPending = computed(
    () => this.claim()?.status === 'pending',
  );

  // Status transitions offered from the current status. The backend enforces
  // these rules too; this only drives which buttons we show.
  protected readonly availableTransitions = computed<ClaimStatus[]>(() => {
    switch (this.claim()?.status) {
      case 'pending':
        return ['in_review', 'finalized', 'canceled'];
      case 'in_review':
        return ['finalized', 'pending'];
      default:
        return []; // finalized / canceled are terminal
    }
  });

  protected readonly form = this.fb.nonNullable.group({
    part: ['', Validators.required],
    description: ['', Validators.required],
    imageUrl: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    score: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    severity: ['low' as Severity, Validators.required],
  });

  // Whole form value as a signal (mapped to the full raw value): powers the
  // live preview and change detection.
  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  // Total the claim WOULD have with the typed price (live preview). When
  // editing, the damage's current price is swapped for the typed one.
  protected readonly previewTotal = computed(() => {
    const editing = this.editingDamage();
    const swapOut = editing ? editing.price : 0;
    return this.total() - swapOut + this.formValue().price;
  });

  // In edit mode, true only if the form actually differs from the original
  // damage, so "Save changes" stays disabled until there are real changes.
  protected readonly hasChanges = computed(() => {
    const original = this.editingDamage();
    if (!original) {
      return true; // adding: not gated by changes
    }
    const current = this.formValue();
    const fields = [
      'part',
      'description',
      'imageUrl',
      'price',
      'score',
      'severity',
    ] as const;
    return fields.some((field) => current[field] !== original[field]);
  });

  // Index of the selected severity, to slide the segmented-control indicator.
  protected readonly severityIndex = computed(() =>
    this.severities.indexOf(this.formValue().severity),
  );

  // Reactive form to edit the claim's title and description.
  protected readonly claimForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
  });

  private readonly claimFormValue = toSignal(
    this.claimForm.valueChanges.pipe(map(() => this.claimForm.getRawValue())),
    { initialValue: this.claimForm.getRawValue() },
  );

  // Live character count (helps with the >100 chars rule to finalize).
  protected readonly descriptionLength = computed(
    () => this.claimFormValue().description.length,
  );

  // True only if the title or description actually differ from the claim.
  protected readonly claimHasChanges = computed(() => {
    const claim = this.claim();
    if (!claim) {
      return false;
    }
    const current = this.claimFormValue();
    return (
      current.title !== claim.title ||
      current.description !== (claim.description ?? '')
    );
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.failed.set(true);
      this.loading.set(false);
      return;
    }
    this.claimsService.getById(id).subscribe({
      next: (claim) => {
        this.claim.set(claim);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  onFileSelected(event: Event): void {
    this.uploadFile((event.target as HTMLInputElement).files?.[0]);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.uploadFile(event.dataTransfer?.files?.[0]);
  }

  private uploadFile(file: File | undefined): void {
    if (!file) {
      return;
    }
    this.uploadingImage.set(true);
    this.uploadsService.upload(file).subscribe({
      next: ({ path }) => {
        const url = `${environment.apiUrl}${path}`;
        this.form.controls.imageUrl.setValue(url);
        this.imagePreview.set(url);
        this.uploadingImage.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(errorMessage(err, 'Could not upload the image.'));
        this.uploadingImage.set(false);
      },
    });
  }

  saveDamage(): void {
    const claim = this.claim();
    if (!claim || this.form.invalid) {
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    const payload = this.form.getRawValue();
    const editing = this.editingDamage();
    const request = editing
      ? this.claimsService.replaceDamage(claim.id, editing.id, payload)
      : this.claimsService.addDamage(claim.id, payload);
    request.subscribe({
      next: (updated) => {
        this.claim.set(updated); // total() recomputes automatically
        this.resetForm();
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(errorMessage(err, 'Could not save the damage.'));
        this.saving.set(false);
      },
    });
  }

  startEdit(damage: Damage): void {
    this.editingDamage.set(damage);
    this.formError.set(null);
    this.form.setValue({
      part: damage.part,
      description: damage.description,
      imageUrl: damage.imageUrl,
      price: damage.price,
      score: damage.score,
      severity: damage.severity,
    });
    this.imagePreview.set(damage.imageUrl);
  }

  cancelEdit(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.form.reset();
    this.imagePreview.set(null);
    this.editingDamage.set(null);
    this.formError.set(null);
  }

  removeDamage(damageId: string): void {
    const claim = this.claim();
    if (!claim) {
      return;
    }
    this.formError.set(null);
    this.claimsService.removeDamage(claim.id, damageId).subscribe({
      next: (updated) => this.claim.set(updated), // total() recomputes
      error: (err: HttpErrorResponse) =>
        this.formError.set(errorMessage(err, 'Could not delete the damage.')),
    });
  }

  changeStatus(status: ClaimStatus): void {
    const claim = this.claim();
    if (!claim) {
      return;
    }
    this.statusError.set(null);
    this.claimsService.update(claim.id, { status }).subscribe({
      next: (updated) => this.claim.set(updated),
      error: (err: HttpErrorResponse) => {
        this.statusError.set(errorMessage(err, 'Could not change the status.'));
      },
    });
  }

  statusLabel(status: ClaimStatus): string {
    return this.statusLabels[status];
  }

  startEditClaim(): void {
    const claim = this.claim();
    if (!claim) {
      return;
    }
    this.claimForm.setValue({
      title: claim.title,
      description: claim.description ?? '',
    });
    this.claimError.set(null);
    this.editingClaim.set(true);
  }

  saveClaim(): void {
    const claim = this.claim();
    if (!claim || this.claimForm.invalid) {
      return;
    }
    this.claimError.set(null);
    this.claimsService.update(claim.id, this.claimForm.getRawValue()).subscribe({
      next: (updated) => {
        this.claim.set(updated);
        this.editingClaim.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.claimError.set(errorMessage(err, 'Could not update the claim.'));
      },
    });
  }

  cancelEditClaim(): void {
    this.editingClaim.set(false);
    this.claimError.set(null);
  }
}
