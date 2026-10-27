import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('client');
  private _http = inject(HttpClient);

  health(): void {
    this._http
      .get('/api/health')
      .subscribe({ next: () => console.log('API ok'), error: () => console.log('API down') });
  }

  ngOnInit(): void {
    this.health();
  }
}
