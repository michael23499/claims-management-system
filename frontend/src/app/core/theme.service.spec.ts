import { ThemeService } from './theme.service';

const STORAGE_KEY = 'cms-theme';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as { matchMedia?: unknown }).matchMedia;
  });

  /** Stub matchMedia (absent in jsdom) to report a dark-mode preference. */
  const stubMatchMedia = (prefersDark: boolean) => {
    (globalThis as { matchMedia?: unknown }).matchMedia = jest.fn(
      () => ({ matches: prefersDark }) as MediaQueryList,
    );
  };

  it('defaults to light and reflects it on the document root', () => {
    stubMatchMedia(false);
    const service = new ThemeService();

    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('falls back to the OS dark preference on first visit', () => {
    stubMatchMedia(true);
    const service = new ThemeService();

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('restores a previously stored theme', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const service = new ThemeService();

    expect(service.theme()).toBe('dark');
  });

  it('toggles between light and dark, persisting the choice', () => {
    stubMatchMedia(false);
    const service = new ThemeService();

    service.toggle();
    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    service.toggle();
    expect(service.theme()).toBe('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('survives localStorage read failures', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    stubMatchMedia(false);

    expect(() => new ThemeService()).not.toThrow();
  });

  it('survives localStorage write failures', () => {
    stubMatchMedia(false);
    const service = new ThemeService();
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => service.set('dark')).not.toThrow();
    expect(service.theme()).toBe('dark');
  });
});
