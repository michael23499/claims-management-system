import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Icon } from './icon';

describe('Icon', () => {
  let fixture: ComponentFixture<Icon>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Icon);
  });

  it('renders an inline SVG for the given name', () => {
    fixture.componentRef.setInput('name', 'plus');
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });
});
