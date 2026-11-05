import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RecipesService } from '../recipes.service';
import { Ingredient, Recipe, RecipeInput } from '../../../core/models';

@Component({
  imports: [ReactiveFormsModule, RouterModule],
  selector: 'app-recipe-form',
  styleUrl: './recipe-form.page.scss',
  templateUrl: './recipe-form.page.html',
})
export class RecipeFormPage implements OnInit {
  private _recipesSrv = inject(RecipesService);
  private _router = inject(Router);
  private _fb = inject(FormBuilder);

  serverError = signal<string | null>(null);
  serverDetails = signal<Record<string, string[]>>({});
  submitting = signal(false);
  // Edit mode only: the form stays hidden until the recipe is in, so a blank form can never be saved over it.
  loading = signal(false);
  loadError = signal<string | null>(null);

  // Bound from the ':id' route param via withComponentInputBinding() — the name must match.
  id = input<string>();
  isEdit = computed(() => !!this.id());

  form = this._fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(2000)]],
    servings: [1, [Validators.required, Validators.min(1)]],
    prepMinutes: this._fb.control<number | null>(null, Validators.min(0)),
    cookMinutes: this._fb.control<number | null>(null, Validators.min(0)),
    tags: [''],
    ingredients: this._fb.nonNullable.array([this._newIngredient()]),
    steps: this._fb.nonNullable.array([this._newStep()]),
  });

  get ingredients() {
    return this.form.controls.ingredients;
  }
  get steps() {
    return this.form.controls.steps;
  }

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;

    this.loading.set(true);
    this._recipesSrv.get(id).subscribe({
      next: (recipe) => {
        // GET also returns recipes shared with us, but only the owner may edit them.
        if (!recipe.isOwner) {
          this._router.navigate(['/recipes', recipe.id]);
          return;
        }
        this._fillForm(recipe);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.loadError.set(err.error?.error?.message ?? 'Could not load recipe');
      },
    });
  }

  private _fillForm(recipe: Recipe): void {
    this.ingredients.clear();
    recipe.ingredients.forEach((ing) => this.ingredients.push(this._newIngredient(ing)));
    this.steps.clear();
    recipe.steps.forEach((step) => this.steps.push(this._newStep(step)));

    this.form.patchValue({
      title: recipe.title,
      description: recipe.description ?? '',
      servings: recipe.servings,
      prepMinutes: recipe.prepMinutes ?? null,
      cookMinutes: recipe.cookMinutes ?? null,
      tags: recipe.tags.join(', '),
    });
  }

  private _newIngredient(ing?: Ingredient) {
    return this._fb.group({
      quantity: this._fb.control<number | null>(ing?.quantity ?? null),
      unit: this._fb.nonNullable.control(ing?.unit ?? ''),
      name: this._fb.nonNullable.control(ing?.name ?? '', Validators.required),
    });
  }

  private _newStep(text = '') {
    return this._fb.nonNullable.control(text, Validators.required);
  }

  addIngredient(): void {
    this.ingredients.push(this._newIngredient());
  }
  removeIngredient(i: number): void {
    this.ingredients.removeAt(i);
  }
  addStep(): void {
    this.steps.push(this._newStep());
  }
  removeStep(i: number) {
    this.steps.removeAt(i);
  }

  // Empty optional fields are omitted, never sent as "" / null / 0.
  private _toRecipeInput(): RecipeInput {
    const raw = this.form.getRawValue();
    const description = raw.description.trim();
    return {
      title: raw.title,
      servings: raw.servings,
      ...(description && { description }),
      ...(raw.prepMinutes != null && { prepMinutes: raw.prepMinutes }),
      ...(raw.cookMinutes != null && { cookMinutes: raw.cookMinutes }),
      tags: raw.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      ingredients: raw.ingredients.map(({ quantity, unit, name }) => ({
        name,
        ...(quantity != null && { quantity }),
        ...(unit.trim() && { unit: unit.trim() }),
      })),
      steps: raw.steps,
    };
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.serverError.set(null);
    this.serverDetails.set({});

    const payload = this._toRecipeInput();
    const id = this.id();
    const req$ = id ? this._recipesSrv.update(id, payload) : this._recipesSrv.create(payload);

    req$.subscribe({
      next: (recipe) => this._router.navigate(['/recipes', recipe.id]),
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverError.set(err.error?.error?.message ?? 'Something went wrong');
        if (err.status === 400) {
          this.serverDetails.set(err.error?.error?.details ?? {});
        }
      },
    });
  }
}
