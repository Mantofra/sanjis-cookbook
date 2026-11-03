import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, firstValueFrom, map, Observable, of, tap } from 'rxjs';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _http = inject(HttpClient);
  private _currentUser = signal<User | null>(null);
  public currentUser = this._currentUser.asReadonly();

  public loadMe(): Promise<void> {
    return firstValueFrom(
      this._http.get<User>('/api/auth/me').pipe(
        tap((user) => this._currentUser.set(user)),
        map(() => undefined),
        catchError(() => {
          this._currentUser.set(null);
          return of(undefined);
        }),
      ),
    );
  }

  public register(email: string, password: string, displayName: string): Observable<User> {
    return this._http
      .post<User>('/api/auth/register', { email, password, displayName })
      .pipe(tap((user) => this._currentUser.set(user)));
  }

  public login(email: string, password: string): Observable<User> {
    return this._http
      .post<User>('/api/auth/login', { email, password })
      .pipe(tap((user) => this._currentUser.set(user)));
  }

  public logout(): Observable<void> {
    return this._http
      .post<void>('/api/auth/logout', {})
      .pipe(finalize(() => this._currentUser.set(null)));
  }

  public clearUser(): void {
    this._currentUser.set(null);
  }
}
