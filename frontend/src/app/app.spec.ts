import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { NotificationService } from './core/notification.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows and dismisses the global error banner', () => {
    const notifications = TestBed.inject(NotificationService);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.banner')).toBeNull();

    notifications.show('Server down');
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('.banner');
    expect(banner?.textContent).toContain('Server down');

    notifications.clear();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.banner')).toBeNull();
  });
});
