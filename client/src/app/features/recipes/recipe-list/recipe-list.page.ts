import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { Recipe, RecipeScope } from '../../../core/models';
import { RecipesService } from '../recipes.service';

@Component({
  imports: [RouterLink],
  selector: 'app-recipe-list',
  styleUrl: './recipe-list.page.scss',
  templateUrl: './recipe-list.page.html',
})
export class RecipeListPage implements OnInit {
  private _recipesService = inject(RecipesService);
  private _destroyRef = inject(DestroyRef);

  // Bound from the `?scope=` query param via withComponentInputBinding()
  scope = input<string>();
  activeScope = computed<RecipeScope>(() => (this.scope() === 'shared' ? 'shared' : 'mine'));
  private _activeScope$ = toObservable(this.activeScope);

  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  recipes = signal<Recipe[]>([]);

  ngOnInit(): void {
    // Re-fetch whenever the tab (query param) changes; switchMap drops stale responses.
    this._activeScope$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((scope) =>
          this._recipesService.list(scope).pipe(
            // Handle errors inside so one failed request doesn't kill the tab subscription.
            catchError((err: HttpErrorResponse) => {
              this.error.set(err.error?.error?.message ?? 'Something went wrong');
              return of<Recipe[]>([]);
            }),
          ),
        ),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe((recipes) => {
        this.loading.set(false);
        this.recipes.set(recipes);
      });
  }
}
