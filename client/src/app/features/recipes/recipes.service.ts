import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Recipe, RecipeInput } from '../../core/models';

@Service()
export class RecipesService {
  private _http = inject(HttpClient);
  private _baseUrl = '/api/recipes';

  list(scope: 'mine' | 'shared'): Observable<Recipe[]> {
    return this._http.get<Recipe[]>(`${this._baseUrl}?scope=${scope}`);
  }

  get(id: string): Observable<Recipe> {
    return this._http.get<Recipe>(`${this._baseUrl}/${id}`);
  }

  create(input: RecipeInput): Observable<Recipe> {
    return this._http.post<Recipe>(`${this._baseUrl}`, input);
  }

  update(id: string, input: Partial<RecipeInput>): Observable<Recipe> {
    return this._http.patch<Recipe>(`${this._baseUrl}/${id}`, input);
  }

  remove(id: string): Observable<void> {
    return this._http.delete<void>(`${this._baseUrl}/${id}`);
  }
}
