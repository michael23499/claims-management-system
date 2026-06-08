import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('starts empty, then shows and clears an error', () => {
    expect(service.error()).toBeNull();
    service.show('boom');
    expect(service.error()).toBe('boom');
    service.clear();
    expect(service.error()).toBeNull();
  });
});
