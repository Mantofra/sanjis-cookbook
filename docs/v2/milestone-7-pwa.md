# Milestone 7 — Phone app (PWA)

**You write all the code.** Same rules as the v1 guide (`docs/v1/learners-guide.md`): follow "How each task
works", and every v1 "Global constraint" still applies. Ask Claude to _"review task 7.2"_ when you're done or
stuck.

**Design:** `docs/v2/design.md`, Part A.

## Review focus

1. **Opening the app offline** — the installed app started in airplane mode lands on your recipes, not
   on the login page. [7.3]
2. **Two users, one phone** — user A logs out, user B logs in, goes offline and opens a URL of A's recipe
   → "not found"/offline message, never A's recipe. [7.4]
3. **Stuck on an old version** — after a deploy, the installed app shows the new version within two
   restarts. [7.2, 7.4]

---

Read `docs/v2/design.md` Part A first — all of it, especially the `@angular/service-worker` box.
Branch: `feat/pwa`.

**Testing the service worker:** `ng serve` never runs it. Test with the production build:
`npm run build`, then start the server as in task 1.3 and open `http://localhost:3000` (browsers treat
`localhost` as secure, so the worker runs there without HTTPS). DevTools → **Application** is your main
tool: _Manifest_, _Service workers_ (with an _Offline_ checkbox and _Update on reload_), _Cache Storage_.
When things look stale, _Application → Storage → Clear site data_ and reload.

### Task 7.1: Phone-friendly layout

**Files:** `client/src/styles.scss` and the styles of every page/component

**Concepts:** mobile-first CSS, `min-width` media queries, tap target size, CSS custom properties as tokens, `@media (hover: hover)`, DevTools device
mode.

- [ ] Open the app in DevTools device mode (toggle with Ctrl+Shift+M) at **360 px** wide. Write down
      everything that's cramped, overflowing or hard to tap.
- [ ] Rewrite the styles **mobile-first**: base styles for the narrow screen, `@media (min-width: …)` for
      wider. One column; form fields full width; buttons and links at least **44×44 px**; ingredient and
      step rows in the form stack instead of squeezing.
- [ ] Put the tap size in one place: a token in `:root` (e.g. `--tap: 2.75rem`, i.e. 44 px) that every
      button, link and stepper uses instead of repeating the number.
- [ ] Servings − / + buttons and the share panel get the same treatment (they're used with wet hands).
- [ ] Hover effects stick on touchscreens: after a tap, `:hover` stays applied (buttons and cards stay
      lifted with their shadow) until you tap elsewhere. Move hover-only effects inside
      `@media (hover: hover)` so they only apply on devices with a real pointer.
- [ ] **Verify manually:** at 360 px and 768 px, every page (login, register, list both tabs, detail,
      form new/edit, share panel, not-found): no sideways scrolling, nothing cut off, every button
      easy to hit. Desktop still looks right.
- [ ] **Check yourself:** Why write the narrow styles first and add `min-width` queries, rather than
      the reverse?
- [ ] Commit: `style(client): make every page phone-friendly`

### Task 7.2: Installable app

**Files:** run `ng add @angular/pwa` in `client/` (it creates/modifies `ngsw-config.json`,
`public/manifest.webmanifest`, `public/icons/*`, `src/index.html`, `src/app/app.config.ts`, `angular.json`);
check `server/src/app.ts`

**Concepts:** web app manifest, `display: standalone`, service worker lifecycle, `assetGroups` (v2 design
Part A).

- [ ] `cd client && npx ng add @angular/pwa`. Read the diff it made and match each change to the
      v2 design's list. (`git diff` + `git status`.)
- [ ] `index.html`: `ng add` adds a second `theme-color` meta — keep only one.
- [ ] `manifest.webmanifest`: set the values from the v2 design's _Manifest_ paragraph (`name`,
      `short_name`, `display`, `start_url`, `scope`, colors matching your `theme-color`).
- [ ] Icons: replace the Angular placeholders with your own icon at every size listed in the manifest
      (at least 192 and 512). Mark one as `"purpose": "maskable"` with the artwork inside the central
      safe zone so Android doesn't crop it.
- [ ] `ngsw-config.json`: the page uses Google Fonts. Add their two origins
      (`https://fonts.googleapis.com/**`, `https://fonts.gstatic.com/**`) as `urls` of an asset group with
      `installMode: "lazy"`, so fonts work offline after the first visit.
- [ ] Server: confirm `/ngsw-worker.js`, `/ngsw.json` and `/manifest.webmanifest` come back as the real
      files (not `index.html` from the fallback), and that `express.static` doesn't give them a long
      `Cache-Control: max-age`. If you set a `maxAge` on static files, exclude those two worker files.
- [ ] **Verify (local production build):** DevTools → Application → _Manifest_ shows no errors and your
      icons; _Service workers_ shows `ngsw-worker.js` activated; the browser's address bar offers
      "Install". Install it → it opens in its own window without browser controls. Console: no CSP
      errors from helmet.
- [ ] **Verify updates:** change a visible text, rebuild, restart the server, open the installed app,
      close it, open it again → the new text shows (this is Review focus 3).
- [ ] **Check yourself:** What exactly makes the browser bar disappear? Why does the worker only run in
      production builds? After a deploy, why does the phone show the new version on a _later_ start
      rather than immediately?
- [ ] Commit: `feat(client): make the app installable as a pwa`

### Task 7.3: Read recipes offline

**Files:** modify `client/ngsw-config.json`; create `client/src/app/shared/error-message.ts`,
`error-message.spec.ts`; modify every page that displays an HTTP error

**Interfaces — produces:**

- `errorMessage(err: unknown): string` in `shared/error-message.ts`
- the `dataGroup` named `api-read` (task 7.4 relies on that name)

**Concepts:** `dataGroups`, `freshness` vs `performance`, `HttpErrorResponse.status === 0`.

- [ ] `ngsw-config.json`: add the `api-read` data group exactly as the v2 design's _Data caching_
      paragraph says (`urls`, `strategy`, `timeout`, `maxAge`, `maxSize`). Login, logout and register are
      **not** in it.
- [ ] Tests for `errorMessage` (write them first, watch them fail):
  - `HttpErrorResponse` with `status: 0` → `"You're offline — this needs a connection."`
  - status 404 with body `{ error: { message: 'Recipe not found' } }` → `'Recipe not found'`
  - status 500 with no usable body → `'Something went wrong. Please try again.'`
  - a value that isn't an `HttpErrorResponse` (e.g. `new Error('x')`, `undefined`) → the same generic
    message
- [ ] Implement `errorMessage`: pure, no injection.
- [ ] Use `errorMessage` everywhere a page shows an HTTP error (login, register, form, detail delete, share
      panel, list). Validation `details` on 400 still show next to the fields as before.
- [ ] **Verify (local production build):** log in, open the list (both tabs) and two recipes. DevTools →
      Application → Service workers → tick **Offline** → reload: the list and those two recipes show; a
      recipe you never opened shows the offline message; saving an edit shows the offline message.
- [ ] **Verify the cold start (Review focus 1):** still offline, close the tab/app and open it again →
      you land on `/recipes`, logged in, not on `/login`. If you get `/login`, check that `/api/auth/me`
      is in the group's `urls` and look in _Cache Storage_ for it.
- [ ] Untick Offline, edit a recipe, reload → the new version shows (freshness = network first).
- [ ] **Check yourself:** Why `freshness` and not `performance` here? Why would `POST /api/recipes`
      never be served from the cache?
- [ ] Commit: `feat(client): read already opened recipes offline`

### Task 7.4: Clear saved data when the user changes, then ship

**Files:** create `client/src/app/core/offline-cache.ts`; modify `core/auth.service.ts`

**Interfaces:**

- Consumes: the `api-read` data group name (7.3); `AuthService.login/register/logout` (2.5)
- Produces: `clearOfflineData(): Promise<void>` in `core/offline-cache.ts`

- [ ] Implement `clearOfflineData`: if `'caches' in window` is false, resolve immediately. Otherwise
      `caches.keys()`, and delete every key that starts with `ngsw:` and contains `:api-read:` (look at
      the real key names in DevTools → Cache Storage first, to confirm the pattern). Never throws: a
      failure is logged and ignored.
- [ ] In `AuthService`: call it after a **successful** `logout`, `login` and `register`, before
      `currentUser` changes. (Hint: it returns a Promise and these return Observables — `from(...)` and
      `switchMap`/`concatMap` connect them.)
- [ ] **Verify (Review focus 2):** as user A, open a recipe and copy its URL; check Cache Storage has the
      `api-read` entries. Log out → those entries are gone. Log in as B, go Offline, paste A's URL → the
      offline message, never A's recipe.
- [ ] **Ship it:** lint/format/test/build, PR, CI green, merge, wait for Render.
- [ ] **On your phone** (production URL, real HTTPS):
  - Android/Chrome: menu → _Install app_. iPhone/Safari: Share → _Add to Home Screen_.
  - Open from the icon → full-screen, no browser bar, your icon and name.
  - Open a few recipes, turn on airplane mode, close and reopen the app → recipes readable.
  - Turn airplane mode off, deploy a small visible change, open the app twice → the change shows.
- [ ] Commit (if anything changed during phone testing): `fix(client): …`. 🎉
