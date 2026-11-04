import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  private _fb = inject(FormBuilder);
  private _destroyRef = inject(DestroyRef);
  private _authSrv = inject(AuthService);
  private router = inject(Router);

  public form = this._fb.nonNullable.group({
    email: ['', { validators: [Validators.required, Validators.email] }],
    password: ['', { validators: [Validators.required] }],
  });

  public submitting = signal<boolean>(false);

  public serverError = signal<string | null>(null);
  public serverDetails = signal<string[]>([]);

  ngOnInit(): void {
    this.form.valueChanges.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => {
      this.serverError.set(null);
      this.serverDetails.set([]);
    });
  }

  public onSubmit(): void {
    if (this.form.valid) {
      this.submitting.set(true);
      const { email, password } = this.form.getRawValue();
      this._authSrv.login(email, password).subscribe({
        next: () => this.router.navigateByUrl('/recipes'),
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.serverError.set(err.error?.error?.message ?? 'Something went wrong');
          if (err.status === 400) {
            this.serverDetails.set(
              Object.values(err.error?.error?.details ?? {}).flat() as string[],
            );
          }
        },
      });
    }
  }
}
