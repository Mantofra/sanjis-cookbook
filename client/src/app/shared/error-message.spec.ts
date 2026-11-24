import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage } from './error-message';

const OFFLINE = "You're offline — this needs a connection.";
const GENERIC = 'Something went wrong. Please try again.';

describe('errorMessage', () => {
  it('returns the offline message when the request never reached the server (status 0)', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toBe(OFFLINE);
  });

  it("returns the server's message from a { error: { message } } body", () => {
    const err = new HttpErrorResponse({
      status: 404,
      error: { error: { message: 'Recipe not found' } },
    });

    expect(errorMessage(err)).toBe('Recipe not found');
  });

  it("returns the server's message whatever the status (e.g. 401)", () => {
    const err = new HttpErrorResponse({
      status: 401,
      error: { error: { message: 'Invalid credentials' } },
    });

    expect(errorMessage(err)).toBe('Invalid credentials');
  });

  it('returns the generic message when a 500 has no usable body', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 500, error: {} }))).toBe(GENERIC);
  });

  it('returns the generic message when the body is null', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 500, error: null }))).toBe(GENERIC);
  });

  it('returns the generic message when the body is a string (e.g. an HTML page from a proxy)', () => {
    const err = new HttpErrorResponse({ status: 502, error: '<html>Bad Gateway</html>' });

    expect(errorMessage(err)).toBe(GENERIC);
  });

  it('returns the generic message when the server message is empty', () => {
    const err = new HttpErrorResponse({ status: 400, error: { error: { message: '' } } });

    expect(errorMessage(err)).toBe(GENERIC);
  });

  it('returns the generic message for a plain Error', () => {
    expect(errorMessage(new Error('x'))).toBe(GENERIC);
  });

  it('returns the generic message for undefined', () => {
    expect(errorMessage(undefined)).toBe(GENERIC);
  });
});
