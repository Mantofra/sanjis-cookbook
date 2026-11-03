import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const authSrv = inject(AuthService);
  const router = inject(Router);

  if (!authSrv.currentUser()) {
    return router.createUrlTree(['/login']);
  }
  return true;
};
