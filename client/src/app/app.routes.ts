import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { LoginPage } from './features/auth/login.page';
import { RegisterPage } from './features/auth/register.page';
import { RecipesPage } from './features/recipes/recipes.page';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'recipes', canActivate: [authGuard], component: RecipesPage },
  { path: '', pathMatch: 'full', redirectTo: 'recipes' },
];
