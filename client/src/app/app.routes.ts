import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { LoginPage } from './features/auth/login/login.page';
import { RegisterPage } from './features/auth/register/register.page';
import { RecipeListPage } from './features/recipes/recipe-list/recipe-list.page';
import { RecipeFormPage } from './features/recipes/recipe-form/recipe-form.page';
import { RecipeDetailPage } from './features/recipes/recipe-detail/recipe-detail.page';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  {
    path: 'recipes',
    canActivate: [authGuard],
    children: [
      { path: '', component: RecipeListPage },
      { path: 'new', component: RecipeFormPage },
      { path: ':id', component: RecipeDetailPage },
      { path: ':id/edit', component: RecipeFormPage },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'recipes' },
];
