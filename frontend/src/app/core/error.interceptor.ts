import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from './notification.service';

// Centralizes handling of unexpected/global errors. Validation errors (4xx)
// are left to the components (shown inline next to the form); here we only
// surface connection failures and server errors as a global notification.
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 0) {
        notifications.show('Cannot reach the server. Is the backend running?');
      } else if (err.status >= 500) {
        notifications.show('Something went wrong on the server. Please try again.');
      }
      return throwError(() => err);
    }),
  );
};
