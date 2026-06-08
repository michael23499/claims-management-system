import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  let fixture: ComponentFixture<StatusBadge>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StatusBadge);
  });

  it('renders a humanized label and a status-specific class', () => {
    fixture.componentRef.setInput('status', 'in_review');
    fixture.detectChanges();

    const span: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(span.textContent?.trim()).toBe('in review');
    expect(span.className).toBe('badge badge--in_review');
  });
});
