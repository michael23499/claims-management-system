import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Claim, ClaimStats, Paginated } from '../claim.model';
import { ClaimsService } from '../claims.service';
import { ClaimList } from './claim-list';

const STATS: ClaimStats = {
  total: 12,
  byStatus: { pending: 3, in_review: 3, finalized: 3, canceled: 3 },
  totalValue: 5000,
};

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'c1',
    title: 'A claim',
    status: 'pending',
    totalAmount: 0,
    damages: [],
    ...overrides,
  };
}

function page(items: Claim[], total = items.length): Paginated<Claim> {
  return { items, total, page: 1, limit: 10 };
}

const apiError = (message: unknown) =>
  throwError(() => new HttpErrorResponse({ error: { message }, status: 400 }));

describe('ClaimList', () => {
  let fixture: ComponentFixture<ClaimList>;
  let c: any;
  let claimsService: {
    list: jest.Mock;
    create: jest.Mock;
    getStats: jest.Mock;
  };

  async function configure(list$: unknown): Promise<void> {
    claimsService = {
      list: jest.fn().mockReturnValue(list$),
      create: jest.fn(),
      getStats: jest.fn().mockReturnValue(of(STATS)),
    };

    await TestBed.configureTestingModule({
      imports: [ClaimList],
      providers: [
        { provide: ClaimsService, useValue: claimsService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClaimList);
    c = fixture.componentInstance;
    fixture.detectChanges();
  }

  const setup = (claims: Claim[], total = claims.length) =>
    configure(of(page(claims, total)));

  it('loads the first page of claims on init', async () => {
    await setup([makeClaim()], 1);
    expect(claimsService.list).toHaveBeenCalledWith(1, 10);
    expect(c.claims()).toHaveLength(1);
    expect(c.total()).toBe(1);
    expect(c.loading()).toBe(false);
  });

  it('exposes portfolio-wide KPIs from the stats endpoint', async () => {
    await setup([makeClaim()], 1);
    expect(claimsService.getStats).toHaveBeenCalled();
    expect(c.kpis()).toEqual({
      total: 12,
      pending: 3,
      inReview: 3,
      finalized: 3,
      canceled: 3,
      value: 5000,
    });
  });

  it('reads the initial page from the URL query param', async () => {
    await setup([makeClaim()], 25);
    // No ?page in the test URL, so it defaults to 1.
    expect(c.page()).toBe(1);
  });

  it('flags failure when the list cannot be loaded', async () => {
    await configure(apiError('down'));
    expect(c.failed()).toBe(true);
    expect(c.loading()).toBe(false);
  });

  it('requires a title to create a claim', async () => {
    await setup([]);
    expect(c.createForm.invalid).toBe(true);
    c.createForm.setValue({ title: 'New one', description: '' });
    expect(c.createForm.valid).toBe(true);
  });

  it('does not call the API when the create form is invalid', async () => {
    await setup([]);
    c.create(); // form empty -> invalid
    expect(claimsService.create).not.toHaveBeenCalled();
  });

  it('reloads the first page after creating a claim', async () => {
    await setup([makeClaim({ id: 'old' })], 1);
    claimsService.create.mockReturnValue(of(makeClaim({ id: 'new' })));
    claimsService.list.mockReturnValue(
      of(page([makeClaim({ id: 'new' }), makeClaim({ id: 'old' })], 2)),
    );

    c.createForm.setValue({ title: 'New', description: '' });
    c.create();

    expect(claimsService.create).toHaveBeenCalledWith({
      title: 'New',
      description: '',
    });
    expect(c.page()).toBe(1);
    expect(c.claims()).toHaveLength(2);
    expect(c.claims()[0].id).toBe('new');
  });

  it('shows an error and keeps the list when creating fails', async () => {
    await setup([makeClaim()], 1);
    claimsService.create.mockReturnValue(apiError('nope'));

    c.createForm.setValue({ title: 'X', description: '' });
    c.create();

    expect(c.createError()).toBe('nope');
    expect(c.claims()).toHaveLength(1);
  });

  it('computes the number of pages from the total', async () => {
    await setup([makeClaim()], 25); // 25 items / 10 per page
    expect(c.totalPages()).toBe(3);
  });

  it('navigates to a valid page and reloads', async () => {
    await setup([makeClaim()], 25);
    claimsService.list.mockClear();
    claimsService.list.mockReturnValue(of(page([makeClaim({ id: 'p2' })], 25)));

    c.goToPage(2);

    expect(c.page()).toBe(2);
    expect(claimsService.list).toHaveBeenCalledWith(2, 10);
  });

  it('ignores out-of-range page navigation', async () => {
    await setup([makeClaim()], 5); // only 1 page
    claimsService.list.mockClear();

    c.goToPage(0);
    c.goToPage(99);

    expect(claimsService.list).not.toHaveBeenCalled();
    expect(c.page()).toBe(1);
  });
});
