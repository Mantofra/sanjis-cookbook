import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Recipe } from '../../../core/models';
import { QuantityPipe } from '../../../shared/quantity.pipe';
import { RecipesService } from '../recipes.service';
import { scaleIngredients } from '../scaling/scaling';
import { SharePanel } from '../share-panel';

@Component({
  imports: [RouterLink, QuantityPipe, SharePanel],
  selector: 'app-recipe-detail',
  styleUrl: './recipe-detail.page.scss',
  templateUrl: './recipe-detail.page.html',
})
export class RecipeDetailPage implements OnInit {
  private _recipesService = inject(RecipesService);
  private _router = inject(Router);

  // Bound from the `:id` route param via withComponentInputBinding()
  id = input.required<string>();

  recipe = signal<Recipe | null>(null);
  loading = signal<boolean>(true);
  notFound = signal<boolean>(false);
  error = signal<string | null>(null);
  deleting = signal<boolean>(false);
  chosenServings = signal<number>(1);
  scaledIngredients = computed(() => {
    const recipe = this.recipe();
    if (!recipe) return [];
    return scaleIngredients(recipe.ingredients, recipe.servings, this.chosenServings());
  });

  ngOnInit(): void {
    this._getRecipe();
  }

  /** The share panel returns the updated recipe; keep the chosen servings as they are. */
  public onRecipeChange(recipe: Recipe): void {
    this.recipe.set(recipe);
  }

  public onDelete(): void {
    const recipe = this.recipe();
    if (!recipe || !confirm(`Delete "${recipe.title}"? This cannot be undone.`)) return;

    this.deleting.set(true);
    this._recipesService.remove(recipe.id).subscribe({
      next: () => this._router.navigateByUrl('/recipes'),
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        this.error.set(err.error?.error?.message ?? 'Could not delete the recipe');
      },
    });
  }

  private _getRecipe(): void {
    this._recipesService.get(this.id()).subscribe({
      next: (recipe) => {
        this.loading.set(false);
        this.recipe.set(recipe);
        this.chosenServings.set(recipe.servings);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
        } else {
          this.error.set(err.error?.error?.message ?? 'Something went wrong');
        }
      },
    });
  }
}
