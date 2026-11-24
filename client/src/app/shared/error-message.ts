import { HttpErrorResponse } from '@angular/common/http';
const GENERIC = 'Something went wrong. Please try again.';

export function errorMessage(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) return GENERIC;

  if (err.status === 0) return "You're offline — this needs a connection.";

  if (!err.error?.error?.message) return GENERIC;

  const msg = err.error.error.message;
  if (msg && msg !== '') return msg;

  return GENERIC;
}
