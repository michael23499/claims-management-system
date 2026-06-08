import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { errorInterceptor } from './error.interceptor';
import { NotificationService } from './notification.service';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let notifications: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => httpMock.verify());

  function fire(): jest.Mock {
    const onError = jest.fn();
    http.get('/x').subscribe({ next: () => undefined, error: onError });
    return onError;
  }

  it('notifies on a connection error (status 0) and rethrows', () => {
    const onError = fire();
    httpMock.expectOne('/x').error(new ProgressEvent('error'), { status: 0 });
    expect(notifications.error()).toContain('Cannot reach the server');
    expect(onError).toHaveBeenCalled();
  });

  it('notifies on a server error (5xx)', () => {
    fire();
    httpMock
      .expectOne('/x')
      .flush('err', { status: 500, statusText: 'Server Error' });
    expect(notifications.error()).toContain('Something went wrong');
  });

  it('does not notify on a client error (4xx) but still rethrows', () => {
    const onError = fire();
    httpMock
      .expectOne('/x')
      .flush('bad', { status: 400, statusText: 'Bad Request' });
    expect(notifications.error()).toBeNull();
    expect(onError).toHaveBeenCalled();
  });
});
