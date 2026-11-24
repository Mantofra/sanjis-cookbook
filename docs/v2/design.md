# Sanji's Cookbook — v2 Design

v2 collects improvements decided after v1's design. Each part below was discussed and approved on its own.
v2 starts only after v1 (milestones 0–6) is shipped. Each part gets its own guide file in this folder (Part A → `milestone-7-pwa.md`, Part B →
`milestone-8-italian.md`, Part C → `milestone-9-categories.md`, Part D → `milestone-10-search.md`).
Parts B, C and D are built in that order.

---

## Part A — Installable phone app (PWA)

### Why

The cookbook gets used in the kitchen, where a phone on the counter is far more practical than a PC. Opening
the site in the phone's browser works, but the browser bar at the top (the URL and the app name repeated)
makes it feel like a web page, not an app. The goal is an app that opens full-screen from the home screen
and still shows recipes when the kitchen Wi-Fi drops.

### Goals

- The app can be **installed** from the phone's browser: it gets a home-screen icon and opens
  **full-screen**, without the browser bar.
- Every page is **comfortable on a phone screen**: content stacks in one column, buttons are easy to tap
  with a thumb, and nothing scrolls sideways.
- **Recipes already opened can be read offline.** This covers the recipe lists and every recipe detail the
  phone has loaded at least once.
- Opening the app offline **does not log you out**: you land on your saved recipes, not the login page.
- Trying to save, edit, delete or share while offline shows a clear **"You're offline"** message.
- When the user changes (logout, or a login or registration on the same phone), saved offline data is
  **deleted**.

### Non-goals

- Editing or creating recipes offline (it would need syncing and conflict rules, which is too much for a
  cookbook).
- App stores, notifications, native phone features.
- Making the 7-day login longer. That's a possible later idea, kept separate.

### Anti-goals (it fails even if it "works" if…)

- …offline, the app sends you to the login page even though recipes are saved.
- …one user's recipes can be read by another user who logs in on the same phone.
- …the app keeps showing an old version after a deploy and never updates.

### Approaches considered

| Approach                                            | Trade-off                                                                                                                               | Verdict    |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **PWA** (manifest + service worker, `@angular/pwa`) | One codebase, no store, updates arrive with every deploy. Needs HTTPS (Render provides it).                                             | **Chosen** |
| Native shell around the website (Capacitor)         | No browser bar either, but a separate app build to install on every change. Only useful for native phone features, and none are needed. | Rejected   |
| Fully native app                                    | A second codebase in another language. Far too much for this goal.                                                                      | Rejected   |

Offline levels considered: (1) only the app's screens load offline, (2) **already opened recipes readable
offline — chosen**, (3) offline editing with sync (rejected: conflicts between phone and PC).

### New library: `@angular/service-worker` (added by `ng add @angular/pwa`)

**What a PWA is.** A Progressive Web App is a normal website that gives the phone two extra things:

1. **A web app manifest** (`manifest.webmanifest`), a small JSON file linked from `index.html`. It tells the
   phone the app's name, its icons, its colors, which page to open first, and its display mode.
   `"display": "standalone"` is the setting that removes the browser bar. When the manifest is valid and
   the site is served over HTTPS, the browser offers "Install app" (Android/Chrome) or the site can be added
   via Share → "Add to Home Screen" (iPhone/Safari).
2. **A service worker**, a script the browser runs in the background, separate from the page. It sits
   between the app and the network: every request the app makes goes through it, and it can answer from a
   saved copy (stored in the browser's **Cache Storage**) instead of the network. That's what makes offline
   possible.

**Why Angular's own service worker instead of writing one.** Writing a service worker by hand means handling
versions, updates and cache cleanup yourself, which is easy to get subtly wrong (the classic bug is an app
that's stuck on an old version forever). `@angular/service-worker` is configured with one JSON file
(`ngsw-config.json`). At build time Angular produces `ngsw-worker.js` (the worker) and `ngsw.json` (a list
of every built file with a hash). When you deploy, the worker sees that the hashes changed, downloads the new
version in the background, and switches to it on a later app start.

**`ng add @angular/pwa` does the following:** installs `@angular/service-worker`; creates
`ngsw-config.json`, `public/manifest.webmanifest` and a set of placeholder icons; links the manifest and a
`theme-color` in `index.html`; registers the worker in `app.config.ts` with `provideServiceWorker(...)`
(enabled only in production builds, so `ng serve` never runs it).

**Two kinds of caching in `ngsw-config.json`:**

- `assetGroups` cover **the app itself** (JS, CSS, HTML, icons). `ng add` sets these up already. This is
  why the screens open offline.
- `dataGroups` cover **API responses**. We add one group for recipe data with the **`freshness`**
  strategy: ask the network first and use the saved copy only if the network fails or takes longer than
  `timeout`. (The other strategy, `performance`, shows the saved copy first, which would show stale recipes
  even when online, so we don't use it.) Only `GET` requests are ever cached; `POST`/`PUT`/`DELETE` always go
  to the network.

### Design

**Layout.** Mobile-first CSS: the default styles are for a narrow screen (one column, full-width form
fields, tap targets at least 44×44 px). Wider screens get extra layout through `min-width` media queries.
No component library; this stays plain CSS as in v1. The `viewport` meta tag Angular generates stays as is.

**Manifest.** `name: "Sanji's Cookbook"`, `short_name: "Cookbook"` (shown under the icon), `display:
"standalone"`, `start_url: "/recipes"`, `scope: "/"`, `theme_color`/`background_color` matching the app's
colors, and icons at least 192×192 and 512×512 (replace Angular's placeholders with a real icon).

**Data caching.** One `dataGroup` named `api-read`:

- `urls`: `/api/recipes`, `/api/recipes/**` and `/api/auth/me`. The list (both scopes, via the query
  string), every recipe detail, and "who am I". Caching `/api/auth/me` is what keeps the app logged in
  offline: `loadMe()` at startup gets the saved answer instead of failing.
- `cacheConfig`: `strategy: "freshness"`, `timeout: "3s"`, `maxAge: "30d"`, `maxSize: 200`.
- Login, logout and register are **not** in the group.

**Offline message.** A request that can't reach the server at all fails with `HttpErrorResponse.status ===
0`. A shared helper turns any HTTP error into the text a page shows: status 0 → "You're offline — this
needs a connection.", otherwise the server's `error.message`, otherwise a generic message. Every page that
already shows server errors uses it.

**Clearing saved data.** A small function deletes the Cache Storage entries belonging to the `api-read`
group (Angular names those caches with `ngsw:` and the group name inside the key). It runs after logout,
after a successful login, and after a successful registration. This covers both "logout leaves nothing
private behind" and "the next user on this phone can't read the previous user's saved recipes". It does
nothing if the browser has no Cache Storage (for example during `ng serve`).

**Server.** No API changes. Express already serves the built client. `ngsw-worker.js`, `ngsw.json` and
`manifest.webmanifest` must be served as real files (not swallowed by the SPA fallback), and
`ngsw-worker.js`/`ngsw.json` must not get a long browser-cache lifetime, or updates would stall. helmet's
default Content-Security-Policy already allows a same-origin worker and manifest. Verify, don't loosen it.

### Known limitations

- Offline you see a recipe as it was the last time the phone loaded it. Edits made on the PC appear once
  the phone is back online.
- Logging out while offline isn't possible (the server must clear the cookie). The page shows the offline
  message.
- After a deploy, the phone switches to the new version on a later app start, not instantly.
- The 7-day login still applies: once it expires, the next online start asks you to log in again.

### Left to the builder

Colors, the icon artwork, exact breakpoints, and whether to also show a small "offline" indicator in the
header (`navigator.onLine` + `online`/`offline` events). It's optional and not required by any task.

---

## Part B — Italian interface

### Why

Everyone who uses the cookbook reads Italian, and the recipes are written in Italian. An English interface
around Italian recipes feels foreign. Part B comes **before** categories and search so their new screens are
written in Italian from the start instead of being translated afterwards.

### Goals

- Every piece of text the user can see is in Italian: page text, buttons, labels, placeholders, empty-list
  messages, loading messages, form validation messages, the offline message and server error messages
  (including the per-field validation details under form fields).
- The page language is Italian (`<html lang="it">`), so phone keyboards, spell-check and screen readers
  treat it as Italian.
- Decimal quantities show with a comma (`1,25`, not `1.25`).

### Non-goals

- A language switch or English as a second language. Italian only.
- Translating code: variable names, function names, comments, commit messages, API paths and JSON field
  names stay in English. Only text a user can see changes.
- Translating these docs (they stay in English).

### Anti-goals

- …a mix: one English message left behind (a server error, a zod field error, a "Loading…") is a bug.
- …the server and client disagree about wording for the same thing (e.g. "Ricetta" on one page,
  "Piatto" on another). Use the glossary below.

### Approaches considered

| Approach                                                             | Trade-off                                                                                      | Verdict                               |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Write Italian text directly** in templates, TS and server messages | No new library; mostly text edits. Adding a language later would mean redoing it.              | **Chosen** (Italian only was decided) |
| Angular `@angular/localize` / `ngx-translate`                        | Supports several languages, but every text is written twice and there's a new system to learn. | Rejected (no second language needed)  |

Server error messages:

| Approach                                                    | Trade-off                                                                                                          | Verdict    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------- |
| **Server writes the messages in Italian**                   | Smallest change: the client keeps showing `error.message` as today. A few server tests change their expected text. | **Chosen** |
| Server sends a code (`RECIPE_NOT_FOUND`), client translates | Cleaner with several languages; pointless with one.                                                                | Rejected   |

### Design

**Client.** Translate every template (`login`, `register`, `recipe-list`, `recipe-detail`, `recipe-form`,
`share-panel`, the header in `app.html`) and every user-visible string in `.ts` files (the generic and
offline messages in `shared/error-message.ts`, confirm texts, etc.). `index.html`: `lang="it"`. The app
name **"Sanji's Cookbook"** stays as is (it's a name). Manifest: `description` → `"Le tue ricette, in
cucina."`; `name` and `short_name` unchanged.

**Quantities.** `QuantityPipe` returns a comma instead of a dot for decimals. Fraction glyphs (½, ¼…)
are unchanged. No Angular `LOCALE_ID` / `registerLocaleData` is needed: the app uses no date, number or
currency pipes. If a future feature does, add them then.

**Server.** Every `AppError` message, the messages in `error-handler.ts` ("Not found", "Invalid JSON",
"Already exists", "Something went wrong") and the rate-limit message become Italian.

**Zod field messages.** Zod writes its own messages for `details` ("Too small: expected string to have

> =1 characters"). Zod v4 ships ready-made translations: calling `z.config(z.locales.it())` once when the
> server starts (top of `app.ts`, before any schema is used) makes every zod message Italian. Custom messages
> written in schemas (if any) must be written in Italian by hand.

**Glossary** (use these words everywhere, client and server):

| English                                   | Italian                             |
| ----------------------------------------- | ----------------------------------- |
| Recipe / recipes                          | Ricetta / ricette                   |
| My recipes                                | Le mie ricette                      |
| Shared with me                            | Condivise con me                    |
| New recipe / Edit recipe                  | Nuova ricetta / Modifica ricetta    |
| Title, Description                        | Titolo, Descrizione                 |
| Servings                                  | Porzioni                            |
| Prep / Cook (minutes)                     | Preparazione / Cottura (min)        |
| Ingredients / Steps                       | Ingredienti / Procedimento          |
| Tags                                      | Tag                                 |
| Category / categories                     | Categoria / categorie               |
| Save / Cancel / Delete                    | Salva / Annulla / Elimina           |
| Share / Stop sharing                      | Condividi / Rimuovi condivisione    |
| Log in / Register / Log out               | Accedi / Registrati / Esci          |
| Email, Password, Display name             | Email, Password, Nome               |
| optional                                  | facoltativo                         |
| Loading…                                  | Caricamento…                        |
| You're offline — this needs a connection. | Sei offline: serve una connessione. |
| Something went wrong. Please try again.   | Qualcosa è andato storto. Riprova.  |
| Recipe not found                          | Ricetta non trovata                 |
| Invalid email or password                 | Email o password non validi         |

The builder translates the remaining strings in the same tone (informal "tu", short sentences).

**Tests.** Server tests that check a message (`errors`, `auth`, `sharing`, `recipes`) expect the Italian
text. Client specs for `error-message` and `QuantityPipe` (comma decimals) are updated. Add one server test
proving a zod field error comes back in Italian.

### Left to the builder

Exact wording of every string not in the glossary.

---

## Part C — Categories

### Why

A good cookbook lets you browse by kind of dish: "show me the primi", "what desserts do I have". Every
recipe belongs to at least one category, so browsing never misses a recipe.

### Goals

- A **fixed list** of categories, two levels deep (below), the same for every user.
- Every recipe has **at least one** category. You can't save a recipe without one.
- A recipe can have **several** categories (e.g. "Torte" and "Dolci al cioccolato").
- Picking a subcategory **automatically counts as its parent**: a "Pasta" recipe is also a "Primi piatti"
  recipe.
- A recipe may have just a main category with no subcategory (needed for "Colazione e merenda", which has
  none).
- Categories appear on recipe cards and on the recipe detail page.
- The list page can be **filtered by category** (built in Part D together with search).

### Non-goals

- Users creating, renaming or deleting categories.
- Icons or pictures per category.
- More than two levels.

### Anti-goals

- …a recipe saved with no category, or with a category that isn't in the list.
- …a "Pasta" recipe that doesn't show up when filtering by "Primi piatti".
- …the client and server lists drift apart.

### Approaches considered

| Approach                    | Trade-off                                                                                                                             | Verdict    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Fixed list in code**      | Simple; same for everyone, so a shared recipe's categories make sense to the friend. Changing the list means a deploy.                | **Chosen** |
| Each user creates their own | Flexible, but needs a new collection, a management screen, rules for deleting a used category and for what friends see. ~3× the work. | Rejected   |
| Fixed list + user extras    | Most of the previous one's complications.                                                                                             | Rejected   |

Where the list lives:

| Approach                                                  | Trade-off                                                                                                     | Verdict    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------- |
| **Server owns it and serves it at `GET /api/categories`** | One source of truth; the server also uses it to reject unknown ids. Cached by the service worker for offline. | **Chosen** |
| Copy of the list in client and server                     | No endpoint, but two copies that can silently drift apart.                                                    | Rejected   |

### The list

Ids are fixed lowercase slugs; a subcategory's id is `parent/child`. The path is needed because short
ids would collide (`salse/calde` and `bevande/calde`; `pane` the main category and `pane/pane`), and it
makes a subcategory's parent readable from its id. Names are shown to the user; ids are what's stored.
**Ids must never change once recipes use them** (renaming a _name_ is fine). The table below is the source
of truth for both ids and names.

| Main (id → name)                        | Subcategories (id suffix → name)                                                                                                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `antipasti` → Antipasti                 | `freddi` Freddi · `caldi` Caldi · `su-pane` Su pane · `verdure` Verdure · `di-mare` Di mare · `finger-food` Finger food                                                                                    |
| `primi` → Primi piatti                  | `pasta` Pasta · `gnocchi` Gnocchi · `pasta-ripiena` Pasta ripiena · `risotti` Risotti · `minestre-zuppe` Minestre e zuppe                                                                                  |
| `secondi` → Secondi piatti              | `carne` Carne · `pesce` Pesce · `uova` Uova · `formaggi` Formaggi                                                                                                                                          |
| `contorni` → Contorni                   | `verdure-cotte` Verdure cotte · `verdure-crude` Verdure crude · `patate` Patate · `funghi` Funghi                                                                                                          |
| `pizze` → Pizze, focacce e torte salate | `pizza` Pizza · `focacce` Focacce · `piadine` Piadine · `torte-salate` Torte salate                                                                                                                        |
| `pane` → Pane e lievitati               | `pane` Pane · `lievitati-dolci` Lievitati dolci                                                                                                                                                            |
| `dolci` → Dolci e dessert               | `torte` Torte · `al-cucchiaio` Dolci al cucchiaio · `biscotti` Biscotti e piccola pasticceria · `fritti` Dolci fritti · `cioccolato` Dolci al cioccolato · `regionali-feste` Dolci regionali e delle feste |
| `salse` → Salse e condimenti            | `sughi` Sughi per pasta · `fredde` Salse fredde · `calde` Salse calde · `creme-spalmabili` Creme spalmabili                                                                                                |
| `bevande` → Bevande                     | `analcoliche` Analcoliche · `calde` Calde · `alcoliche` Alcoliche                                                                                                                                          |
| `colazione` → Colazione e merenda       | _(none — e.g. pancake, waffle, crêpe, porridge, granola, yogurt bowl, muffin, plumcake)_                                                                                                                   |

So the full id of Pasta is `primi/pasta`; of hot drinks `bevande/calde`. The order above is the display
order everywhere.

### Design

**Server — the list.** New module `server/src/modules/categories/`:

- `categories.ts` exports the list as a typed constant (`{ id, name, subcategories: { id, name }[] }[]`,
  subcategory `id` stored as the full `parent/child`), plus two helpers derived from it: the set of all
  valid ids, and a function that, given a list of ids, returns it **normalized**: every subcategory's parent
  added, duplicates removed, sorted in list order.
- `GET /api/categories` returns the list as JSON. It's public (no `requireAuth`): nothing in it is private.

**Server — recipes.**

- Model: `categories: { type: [String], required: true }`. No index: filtering happens on the client
  (Part D).
- Zod: `categories: z.array(z.enum(ALL_IDS)).min(1)` in `recipeInputSchema` (Italian message for "at least
  one": `"Scegli almeno una categoria"`). Because `recipeUpdateSchema` is `.partial()`, a PATCH may omit
  `categories`; if it sends them, the same rule applies (non-empty, all known).
- The service normalizes `categories` before saving on create and update, so the database always holds
  parents too. **Normalization lives in the service, not in the client**: the client could forget, the
  server can't be skipped.
- `RecipeDto` gets `categories: string[]` (normalized ids).

**Client.**

- `CategoriesService` loads `GET /api/categories` once and keeps it in a signal; components use it to turn
  ids into names. Add `/api/categories` to the `api-read` dataGroup in `ngsw-config.json` so it works
  offline. (It's wiped with the rest on logout/login and simply reloaded.)
- `Recipe` / `RecipeInput` models get `categories: string[]`.
- **Form:** a "Categorie" section listing each main category with its subcategories as checkboxes.
  Ticking a subcategory also ticks its parent; unticking a parent unticks its subcategories. Required:
  `"Scegli almeno una categoria."` under the section, same style as other field errors, and server
  `details.categories` shown there too. On phones it's ~50 checkboxes, so make groups collapsible (e.g.
  `<details>`, a group with something ticked starts open).
- **Cards and detail page:** show categories as chips, **most specific only**: a recipe with
  `primi` + `primi/pasta` shows one chip, not two; a recipe with only `colazione` shows "Colazione e
  merenda". A subcategory chip reads **"Parent · Sub"** ("Bevande · Calde", "Primi piatti · Pasta"),
  because many subcategory names mean nothing alone ("Calde", "Freddi", "Di mare"). `CategoriesService`
  provides a `label(id)` helper for this. Chips are visually distinct from free-text tags. _(Builder's
  call, made during review.)_
- **Tags stay** as they are: free text for personal labels ("veloce", "della nonna").

**Old data.** There are no real recipes yet. A recipe in a dev database without `categories` still loads
(show no chips); editing it requires choosing one. No migration script.

**Tests (server).** `GET /api/categories` returns the list; create without categories → 400 with
`details.categories`; unknown id → 400; `primi/pasta` is saved as `["primi", "primi/pasta"]`; a main
category alone is accepted; duplicates collapse; PATCH with `categories: []` → 400; PATCH without
`categories` keeps them. Existing test helpers that create recipes get a valid category. A unit test of
the normalize helper.

### Left to the builder

The look of the picker and chips; whether the form shows the "Colazione e merenda" examples as a hint.

---

## Part D — Search by name and category filter

### Why

Find a recipe fast: type part of its name, or narrow to a category. Later, search may extend to
ingredients, so the matching logic is kept in one replaceable place.

### Goals

- A search box on the list page filters the current tab ("Le mie ricette" or "Condivise con me") by
  recipe **title** as you type.
- A category filter on the same page; choosing a main category also shows recipes in its subcategories
  (free, because recipes store their parents — Part C).
- Search and filter combine (both must match).
- Works **offline**, on the recipes already loaded.
- Coming back from a recipe to the list keeps the tab, search and filter, both with the phone's back
  button and with the app's own "← back" link.

### Non-goals (for now)

- Searching ingredients, description, steps or tags (a later improvement).
- Searching across both tabs at once.
- Server-side search, pagination, typo tolerance or ranking.

### Anti-goals

- …"crepe" doesn't find "Crêpe", or "Pasta" doesn't find "pasta al forno" (case and accents must not
  matter).
- …search stops working offline.
- …the matching logic is spread inside the component so adding ingredients later means rewriting it.

### Approaches considered

| Approach                                                         | Trade-off                                                                                                                                                                                 | Verdict    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Filter on the client, over the already-loaded list**           | Instant, works offline, combines easily with the category filter; full recipes are loaded, so ingredient search later is a small addition. Would get slow only with thousands of recipes. | **Chosen** |
| Server search (`?q=` on `GET /api/recipes`, regex or text index) | Scales to huge lists, but doesn't work offline and needs a request per keystroke (or debouncing).                                                                                         | Rejected   |

### Design

**Matching (pure function).** `client/src/app/features/recipes/search/recipe-search.ts` exports
`matchesSearch(recipe, query): boolean` and a `normalize(text)` helper. Normalize = lowercase + strip
accents (`text.normalize('NFD').replace(/\p{Diacritic}/gu, '')`) + trim. The query is split into words;
the recipe matches when **every** word appears somewhere in its normalized title, in any order ("forno
pasta" finds "Pasta al forno"). Empty query matches everything. Ingredients later = also look in
ingredient names inside this function. Unit tests cover case, accents, word order, partial words, empty
query.

**Category match.** `matchesCategory(recipe, categoryId | null)`: `null` → true; otherwise
`recipe.categories.includes(categoryId)`.

**List page.**

- Above the grid: a search input (`type="search"`, placeholder `"Cerca per nome…"`) and a category select
  ("Tutte le categorie", then each main category with its subcategories indented, e.g. via `<optgroup>`
  or a leading dash; the main category itself must be selectable).
- State lives in the **URL query params** `q` and `cat`, next to the existing `scope` (bound with
  `withComponentInputBinding()` like `scope`). That's what keeps them when coming back from a recipe.
  Typing updates `q` with `replaceUrl: true` so every keystroke doesn't add a history entry. Switching
  tab clears both (the tab links only set `scope`).
- The visible list is a `computed` signal over the loaded `recipes()`, `q` and `cat`. The page does
  **not** reload from the server when `q`/`cat` change, only when `scope` does.
- **The app's own "back" links remember the list** (decided during review). A small `LastListService`
  holds the last list URL (path + `scope`, `q`, `cat`); the list page updates it whenever its query params
  change. Default when nothing is stored (recipe opened directly from a link): `/recipes`. It's used by:
  the detail page's "← back" link, the form's "← back"/"Annulla" links when creating a new recipe, and the
  navigation after deleting a recipe (`recipe-detail.page.ts`). The detail page's "Vai alle mie ricette"
  link on a not-found error stays plain `/recipes`. This also fixes the existing bug where "← back" from a
  shared recipe lands on "Le mie ricette" instead of "Condivise con me". Saving the form still goes to the
  recipe's detail page, unchanged. The stored URL lives in memory only (lost on app restart → default).
- Empty result with active filters: `"Nessuna ricetta trovata."` plus a "Cancella filtri" button. The
  existing empty states ("Il tuo ricettario è vuoto", …) only show when the tab itself has no recipes.

**Server.** No changes.

### Left to the builder

Layout of the search bar and select on phone vs wide screens; whether to show a result count.
