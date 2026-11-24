import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { errorMessage } from './shared/error-message';

@Component({
  imports: [RouterOutlet, RouterLink],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal("Sanji's Cookbook");
  private _router = inject(Router);
  public auth = inject(AuthService);

  public onLogout(): void {
    this.auth.logout().subscribe({
      next: () => this._router.navigateByUrl('/login'),
      error: (err) => errorMessage(err),
    });
  }
}
