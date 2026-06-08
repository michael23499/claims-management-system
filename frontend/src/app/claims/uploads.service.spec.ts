import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { UploadsService } from './uploads.service';

describe('UploadsService', () => {
  let service: UploadsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UploadsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(UploadsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uploads a file as multipart/form-data and returns its path', () => {
    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    let result: { path: string } | undefined;

    service.upload(file).subscribe((r) => (result = r));

    const req = http.expectOne(`${environment.apiUrl}/uploads`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ path: '/uploads/abc.png' });

    expect(result).toEqual({ path: '/uploads/abc.png' });
  });
});
