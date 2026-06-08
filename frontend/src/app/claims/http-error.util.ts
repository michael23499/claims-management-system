import { HttpErrorResponse } from '@angular/common/http';

export function errorMessage(
  err: HttpErrorResponse,
  fallback: string,
): string | null {
  if (err.status === 0 || err.status >= 500) {
    return null;
  }
  const message = err.error?.message;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  return message ?? fallback;
}
