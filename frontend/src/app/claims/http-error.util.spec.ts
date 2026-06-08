import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage } from './http-error.util';

describe('errorMessage', () => {
  const fallback = 'Fallback message';
  const clientError = (message: unknown) =>
    new HttpErrorResponse({ error: { message }, status: 400 });

  it('returns a single string message for a client error', () => {
    expect(errorMessage(clientError('boom'), fallback)).toBe('boom');
  });

  it('joins an array of messages', () => {
    expect(errorMessage(clientError(['a', 'b']), fallback)).toBe('a, b');
  });

  it('falls back when there is no message', () => {
    expect(errorMessage(clientError(undefined), fallback)).toBe(fallback);
  });

  it('returns null for connection errors (handled globally)', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }), fallback)).toBeNull();
  });

  it('returns null for server errors (handled globally)', () => {
    expect(
      errorMessage(new HttpErrorResponse({ status: 500 }), fallback),
    ).toBeNull();
  });
});
