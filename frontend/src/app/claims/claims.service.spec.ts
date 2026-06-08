import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { CreateDamage } from './claim.model';
import { ClaimsService } from './claims.service';

const damage: CreateDamage = {
  part: 'door',
  description: 'dent',
  imageUrl: 'http://localhost:3000/uploads/a.png',
  price: 100,
  score: 5,
  severity: 'low',
};

describe('ClaimsService', () => {
  let service: ClaimsService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/claims`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ClaimsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ClaimsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists claims (paginated) with page and limit params', () => {
    service.list(2, 5).subscribe();
    const req = http.expectOne((r) => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('5');
    req.flush({ items: [], total: 0, page: 2, limit: 5 });
  });

  it('defaults to page 1 and limit 10', () => {
    service.list().subscribe();
    const req = http.expectOne((r) => r.url === base);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush({ items: [], total: 0, page: 1, limit: 10 });
  });

  it('gets portfolio stats with GET /claims/stats', () => {
    service.getStats().subscribe();
    const req = http.expectOne(`${base}/stats`);
    expect(req.request.method).toBe('GET');
    req.flush({
      total: 0,
      byStatus: { pending: 0, in_review: 0, finalized: 0, canceled: 0 },
      totalValue: 0,
    });
  });

  it('gets one claim with GET /claims/:id', () => {
    service.getById('c1').subscribe();
    const req = http.expectOne(`${base}/c1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('creates a claim with POST /claims', () => {
    service.create({ title: 'X' }).subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'X' });
    req.flush({});
  });

  it('updates a claim with PATCH /claims/:id', () => {
    service.update('c1', { status: 'in_review' }).subscribe();
    const req = http.expectOne(`${base}/c1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'in_review' });
    req.flush({});
  });

  it('adds a damage with POST /claims/:id/damages', () => {
    service.addDamage('c1', damage).subscribe();
    const req = http.expectOne(`${base}/c1/damages`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(damage);
    req.flush({});
  });

  it('replaces a damage with PUT /claims/:id/damages/:damageId', () => {
    service.replaceDamage('c1', 'd1', damage).subscribe();
    const req = http.expectOne(`${base}/c1/damages/d1`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('removes a damage with DELETE /claims/:id/damages/:damageId', () => {
    service.removeDamage('c1', 'd1').subscribe();
    const req = http.expectOne(`${base}/c1/damages/d1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});
