import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Claim } from '../claim.model';
import { ClaimsService } from '../claims.service';
import { UploadsService } from '../uploads.service';
import { ClaimDetail } from './claim-detail';

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'c1',
    title: 'Test claim',
    description: '',
    status: 'pending',
    totalAmount: 150,
    damages: [
      {
        id: 'd1',
        part: 'door',
        description: 'dent',
        imageUrl: 'http://x/a.png',
        price: 100,
        score: 5,
        severity: 'low',
      },
      {
        id: 'd2',
        part: 'hood',
        description: 'scratch',
        imageUrl: 'http://x/b.png',
        price: 50,
        score: 3,
        severity: 'mid',
      },
    ],
    ...overrides,
  };
}

const validDamageForm = {
  part: 'bumper',
  description: 'crack',
  imageUrl: 'http://x/c.png',
  price: 25,
  score: 1,
  severity: 'low' as const,
};

const apiError = (message: unknown) =>
  throwError(() => new HttpErrorResponse({ error: { message }, status: 400 }));

describe('ClaimDetail', () => {
  let fixture: ComponentFixture<ClaimDetail>;
  // Access protected signals/forms via `any` (they exist only for the template).
  let c: any;
  let claimsService: {
    getById: jest.Mock;
    addDamage: jest.Mock;
    replaceDamage: jest.Mock;
    removeDamage: jest.Mock;
    update: jest.Mock;
  };
  let uploadsService: { upload: jest.Mock };

  async function configure(
    getById$: unknown,
    id: string | null = 'c1',
  ): Promise<void> {
    claimsService = {
      getById: jest.fn().mockReturnValue(getById$),
      addDamage: jest.fn(),
      replaceDamage: jest.fn(),
      removeDamage: jest.fn(),
      update: jest.fn(),
    };
    uploadsService = { upload: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ClaimDetail],
      providers: [
        { provide: ClaimsService, useValue: claimsService },
        { provide: UploadsService, useValue: uploadsService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => id } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClaimDetail);
    c = fixture.componentInstance;
    fixture.detectChanges();
  }

  const setup = (claim: Claim) => configure(of(claim));

  it('loads the claim and computes the total from its damages', async () => {
    await setup(makeClaim());
    expect(c.claim()).not.toBeNull();
    expect(c.total()).toBe(150);
  });

  it('recomputes the total when a damage is added', async () => {
    const claim = makeClaim();
    await setup(claim);
    claimsService.addDamage.mockReturnValue(
      of(makeClaim({ damages: [...claim.damages, { id: 'd3', ...validDamageForm }] })),
    );

    c.form.setValue(validDamageForm);
    c.saveDamage();

    expect(claimsService.addDamage).toHaveBeenCalledWith('c1', validDamageForm);
    expect(c.total()).toBe(175);
  });

  it('recomputes the total when a damage is removed', async () => {
    const claim = makeClaim();
    await setup(claim);
    claimsService.removeDamage.mockReturnValue(
      of(makeClaim({ damages: [claim.damages[0]] })),
    );

    c.removeDamage('d2');

    expect(c.total()).toBe(100);
  });

  it('edits a damage via PUT (replaceDamage) when in edit mode', async () => {
    const claim = makeClaim();
    await setup(claim);
    claimsService.replaceDamage.mockReturnValue(
      of(makeClaim({ damages: [{ ...claim.damages[0], price: 200 }, claim.damages[1]] })),
    );

    c.startEdit(claim.damages[0]);
    c.form.controls.price.setValue(200);
    c.saveDamage();

    expect(claimsService.replaceDamage).toHaveBeenCalledWith(
      'c1',
      'd1',
      expect.objectContaining({ price: 200 }),
    );
    expect(c.total()).toBe(250);
  });

  it('previews the new total live while editing a damage price', async () => {
    const claim = makeClaim();
    await setup(claim);
    c.startEdit(claim.damages[0]); // editing d1 (price 100)
    c.form.controls.price.setValue(300);
    // total - oldPrice + newPrice = 150 - 100 + 300
    expect(c.previewTotal()).toBe(350);
  });

  it('previews the total live when adding a damage', async () => {
    await setup(makeClaim()); // total 150
    c.form.controls.price.setValue(30);
    expect(c.previewTotal()).toBe(180);
  });

  it('marks the damage form invalid when empty, valid when filled', async () => {
    await setup(makeClaim());
    c.form.reset();
    expect(c.form.invalid).toBe(true);
    c.form.setValue(validDamageForm);
    expect(c.form.valid).toBe(true);
  });

  it('does not call the API when saving an invalid damage form', async () => {
    await setup(makeClaim());
    c.form.reset(); // invalid (required fields empty)
    c.saveDamage();
    expect(claimsService.addDamage).not.toHaveBeenCalled();
  });

  it('offers transitions from pending and changes status via update', async () => {
    await setup(makeClaim({ status: 'pending' }));
    expect(c.availableTransitions()).toEqual([
      'in_review',
      'finalized',
      'canceled',
    ]);
    claimsService.update.mockReturnValue(of(makeClaim({ status: 'in_review' })));

    c.changeStatus('in_review');

    expect(claimsService.update).toHaveBeenCalledWith('c1', {
      status: 'in_review',
    });
    expect(c.isPending()).toBe(false);
  });

  it('offers finalize/reopen from in_review', async () => {
    await setup(makeClaim({ status: 'in_review' }));
    expect(c.availableTransitions()).toEqual(['finalized', 'pending']);
  });

  it('treats finalized/canceled as terminal (no transitions)', async () => {
    await setup(makeClaim({ status: 'finalized' }));
    expect(c.availableTransitions()).toEqual([]);
  });

  it('uploads an image and fills imageUrl + preview', async () => {
    await setup(makeClaim());
    uploadsService.upload.mockReturnValue(of({ path: '/uploads/x.png' }));
    const file = new File(['x'], 'x.png', { type: 'image/png' });

    c.onFileSelected({ target: { files: [file] } } as unknown as Event);

    expect(uploadsService.upload).toHaveBeenCalledWith(file);
    expect(c.form.controls.imageUrl.value).toBe(
      'http://localhost:3000/uploads/x.png',
    );
    expect(c.imagePreview()).toBe('http://localhost:3000/uploads/x.png');
  });

  it('ignores a file change with no file selected', async () => {
    await setup(makeClaim());
    c.onFileSelected({ target: { files: null } } as unknown as Event);
    expect(uploadsService.upload).not.toHaveBeenCalled();
  });

  it('edits the claim title via PATCH and exits edit mode', async () => {
    await setup(makeClaim({ title: 'Old', description: 'Old desc' }));
    c.startEditClaim();
    expect(c.editingClaim()).toBe(true);
    expect(c.claimForm.value.title).toBe('Old');
    expect(c.claimHasChanges()).toBe(false);

    c.claimForm.controls.title.setValue('New title');
    expect(c.claimHasChanges()).toBe(true);
    claimsService.update.mockReturnValue(of(makeClaim({ title: 'New title' })));
    c.saveClaim();

    expect(claimsService.update).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ title: 'New title' }),
    );
    expect(c.editingClaim()).toBe(false);
  });

  it('does not call the API when saving an invalid claim form', async () => {
    await setup(makeClaim());
    c.startEditClaim();
    c.claimForm.controls.title.setValue(''); // invalid
    c.saveClaim();
    expect(claimsService.update).not.toHaveBeenCalled();
  });

  it('counts the description length live', async () => {
    await setup(makeClaim());
    c.startEditClaim();
    c.claimForm.controls.description.setValue('abcde');
    expect(c.descriptionLength()).toBe(5);
  });

  it('shows error messages from the API (damage, status, claim)', async () => {
    await setup(makeClaim());

    claimsService.addDamage.mockReturnValue(apiError('bad'));
    c.form.setValue(validDamageForm);
    c.saveDamage();
    expect(c.formError()).toBe('bad');

    claimsService.update.mockReturnValue(apiError(['x', 'y']));
    c.changeStatus('finalized');
    expect(c.statusError()).toBe('x, y');

    c.startEditClaim();
    c.claimForm.controls.title.setValue('Changed');
    claimsService.update.mockReturnValue(apiError('fail'));
    c.saveClaim();
    expect(c.claimError()).toBe('fail');
  });

  it('cancels damage edit and claim edit modes', async () => {
    const claim = makeClaim();
    await setup(claim);

    c.startEdit(claim.damages[0]);
    expect(c.isEditing()).toBe(true);
    c.cancelEdit();
    expect(c.isEditing()).toBe(false);

    c.startEditClaim();
    c.cancelEditClaim();
    expect(c.editingClaim()).toBe(false);
  });

  it('maps statuses to human labels', async () => {
    await setup(makeClaim());
    expect(c.statusLabel('in_review')).toBe('Start review');
    expect(c.statusLabel('canceled')).toBe('Cancel claim');
  });

  it('reports failure and guards every action when the claim fails to load', async () => {
    await configure(apiError('down'));

    expect(c.failed()).toBe(true);
    expect(c.claim()).toBeNull();
    expect(c.total()).toBe(0);
    expect(c.previewTotal()).toBe(0);
    expect(c.availableTransitions()).toEqual([]);
    expect(c.isPending()).toBe(false);
    expect(c.claimHasChanges()).toBe(false);

    c.saveDamage();
    c.removeDamage('x');
    c.changeStatus('finalized');
    c.startEditClaim();
    c.saveClaim();
    c.onFileSelected({ target: { files: null } } as unknown as Event);

    expect(claimsService.addDamage).not.toHaveBeenCalled();
    expect(claimsService.removeDamage).not.toHaveBeenCalled();
    expect(claimsService.update).not.toHaveBeenCalled();
    expect(uploadsService.upload).not.toHaveBeenCalled();
    expect(c.editingClaim()).toBe(false);
  });

  it('fails fast when the route has no id', async () => {
    await configure(of(makeClaim()), null);
    expect(c.failed()).toBe(true);
    expect(claimsService.getById).not.toHaveBeenCalled();
  });

  it('hasChanges is gated by real edits to a damage', async () => {
    const claim = makeClaim();
    await setup(claim);
    expect(c.hasChanges()).toBe(true); // add mode -> not gated
    c.startEdit(claim.damages[0]);
    expect(c.hasChanges()).toBe(false); // editing, unchanged
    c.form.controls.price.setValue(999);
    expect(c.hasChanges()).toBe(true); // a field changed
  });

  it('claimHasChanges detects title and description edits', async () => {
    await setup(makeClaim({ title: 'T', description: 'D' }));
    c.startEditClaim();
    expect(c.claimHasChanges()).toBe(false);
    c.claimForm.controls.title.setValue('T2');
    expect(c.claimHasChanges()).toBe(true);
    c.claimForm.controls.title.setValue('T'); // back to original title
    c.claimForm.controls.description.setValue('D2');
    expect(c.claimHasChanges()).toBe(true);
  });

  it('handles a claim without a description', async () => {
    await setup(makeClaim({ description: undefined }));
    c.startEditClaim();
    expect(c.claimForm.value.description).toBe('');
    expect(c.claimHasChanges()).toBe(false);
  });

  it('stops the uploading flag and surfaces the error when the upload fails', async () => {
    await setup(makeClaim());
    uploadsService.upload.mockReturnValue(apiError('boom'));
    const file = new File(['x'], 'x.png', { type: 'image/png' });

    c.onFileSelected({ target: { files: [file] } } as unknown as Event);

    expect(c.uploadingImage()).toBe(false);
    expect(c.formError()).toBe('boom');
  });

  it('surfaces an inline error when deleting a damage fails', async () => {
    await setup(makeClaim());
    claimsService.removeDamage.mockReturnValue(apiError('cannot delete'));

    c.removeDamage('d2');

    expect(c.formError()).toBe('cannot delete');
  });

  it('uploads a dropped image file', async () => {
    await setup(makeClaim());
    uploadsService.upload.mockReturnValue(of({ path: '/uploads/d.png' }));
    const file = new File(['x'], 'd.png', { type: 'image/png' });
    const event = {
      preventDefault: jest.fn(),
      dataTransfer: { files: [file] },
    } as unknown as DragEvent;

    c.onDrop(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(uploadsService.upload).toHaveBeenCalledWith(file);
  });

  it('ignores a drop without a file', async () => {
    await setup(makeClaim());
    c.onDrop({
      preventDefault: jest.fn(),
      dataTransfer: null,
    } as unknown as DragEvent);
    expect(uploadsService.upload).not.toHaveBeenCalled();
  });
});
