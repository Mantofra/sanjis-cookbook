import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { Recipe } from '../../core/models';
import { RecipesService } from './recipes.service';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-share-panel',
  template: `
    <section class="share" aria-labelledby="share-title">
      <h3 id="share-title" class="share__title">Share this recipe</h3>
      <p class="share__lede">People you add can read it and scale it, but not change it.</p>

      <form class="share__form" [formGroup]="form" (ngSubmit)="onShare()">
        <label class="visually-hidden" for="share-email">Their email</label>
        <input
          id="share-email"
          class="share__input"
          type="email"
          placeholder="friend@example.com"
          autocomplete="off"
          formControlName="email"
        />
        <button type="submit" class="btn btn--primary" [disabled]="email.invalid || busy()">
          Share
        </button>
      </form>

      @if (error()) {
        <p class="share__error" role="alert">{{ error() }}</p>
      }

      <ul class="share__people">
        @for (person of recipe().sharedWith ?? []; track person.id) {
          <li class="share__person">
            <span class="share__avatar" aria-hidden="true">{{ initial(person.displayName) }}</span>
            <span class="share__who">
              <span class="share__name">{{ person.displayName }}</span>
              <span class="share__email">{{ person.email }}</span>
            </span>
            <button
              type="button"
              class="btn btn--quiet"
              [disabled]="busy()"
              [attr.aria-label]="'Stop sharing with ' + person.displayName"
              (click)="onUnshare(person.id)"
            >
              Remove
            </button>
          </li>
        } @empty {
          <li class="share__empty">Only you can see this recipe.</li>
        }
      </ul>
    </section>
  `,
  styles: `
    :host {
      display: block;
      margin-top: 3.5rem;
    }

    .share {
      max-width: 40rem;
      padding: 1.75rem 1.5rem 1.25rem;
      border: 2px solid var(--ink);
      border-radius: var(--radius-lg);
      background: var(--basil-soft);

      &__title {
        font-size: 1.5rem;
      }

      &__lede {
        margin: 0.35rem 0 1.25rem;
        color: var(--ink-soft);
        font-family: var(--font-read);
        font-size: 1.05rem;
      }

      &__form {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      &__input {
        flex: 1 1 14rem;
        min-width: 0;
      }

      &__error {
        margin: 0.6rem 0 0;
        color: var(--danger);
        font-size: 0.9rem;
        font-weight: 600;
      }

      &__people {
        margin: 1.25rem 0 0;
        padding: 0;
        list-style: none;
      }

      &__person {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.6rem 0;
        border-top: 2px solid rgba(47, 107, 62, 0.18);
      }

      &__avatar {
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 50%;
        background: var(--basil);
        color: #fff;
        font-weight: 800;
      }

      &__who {
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        min-width: 0;
      }

      &__name {
        font-weight: 700;
      }

      &__email {
        overflow: hidden;
        color: var(--ink-soft);
        font-size: 0.875rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      &__empty {
        padding: 0.6rem 0;
        color: var(--ink-soft);
      }
    }
  `,
})
export class SharePanel {
  private _recipesService = inject(RecipesService);

  recipe = input.required<Recipe>();
  /** Emits the updated recipe after a successful share/unshare. */
  recipeChange = output<Recipe>();

  // A [formGroup] on the <form> is required for (ngSubmit) to fire and to prevent a native submit.
  form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });
  get email() {
    return this.form.controls.email;
  }
  busy = signal(false);
  error = signal<string | null>(null);

  initial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
  }

  onShare(): void {
    if (this.email.invalid || this.busy()) return;

    this._run(this._recipesService.share(this.recipe().id, this.email.value.trim()), () =>
      this.email.reset(),
    );
  }

  onUnshare(userId: string): void {
    if (this.busy()) return;
    this._run(this._recipesService.unshare(this.recipe().id, userId));
  }

  private _run(request: Observable<Recipe>, onSuccess: () => void = () => undefined): void {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: (recipe) => {
        this.busy.set(false);
        onSuccess();
        this.recipeChange.emit(recipe);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(err.error?.error?.message ?? 'Something went wrong');
      },
    });
  }
}
