import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Recipe } from '../../../core/models';
import { RecipesService } from '../recipes.service';

@Component({
  imports: [RouterLink],
  selector: 'app-recipe-list',
  styleUrl: './recipe-list.page.scss',
  templateUrl: './recipe-list.page.html',
})
export class RecipeListPage implements OnInit {
  private _recipesService = inject(RecipesService);

  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  recipes = signal<Recipe[]>([]);

  ngOnInit(): void {
    this._getRecipes();
  }

  private _getRecipes(): void {
    this._recipesService.list('mine').subscribe({
      next: (recipes) => {
        this.loading.set(false);
        this.recipes.set(recipes);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(err.error?.error?.message ?? 'Something went wrong');
      },
    });
  }
}
