# Sanji's Cookbook — Learner's Guide

**You write all the code.** This guide tells you _what_ to build, in _what order_, which names to use so the
pieces fit together, which tests prove each part works, and hints for the tricky bits. It deliberately
contains no solution code. When you finish a task (or get stuck), ask Claude: _"review task 2.3"_ or
_"I'm stuck on task 3.1, here's the error: …"_.

**Spec:** `docs/superpowers/specs/2026-10-27-sanjis-cookbook-design.md` — read the matching spec section
before each milestone. The guide says _what to do_; the spec says _why_ and explains every library.

**Goal:** a deployed, multi-user recipe app (Angular + Express 5 + Mongoose + MongoDB Atlas on Render) where
users manage their own recipes and read recipes shared with them.

## How each task works

1. **Read** — the spec section and the "Concepts" list. Look things up in the official docs.
2. **Test first** (server tasks) — write the listed tests, run them, watch them **fail**. A test you
   never saw fail might not be testing anything.
3. **Build** — write the code until the tests pass. Use the names in the **Interfaces** block exactly:
   later tasks depend on them.
4. **Verify** — run the listed command and compare with the expected result.
5. **Check yourself** — answer the questions out loud. If you can't, re-read before moving on.
6. **Commit** — small commits with clear messages (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).

Each milestone happens on its own branch (from milestone 1 on) and ends with a pull request, CI green,
merge, and a working deploy.

## Global constraints

- Node: pin the major version you use (`node -v` → `26`) in `.nvmrc` and `"engines"`. If Render or a
  native package (argon2) fails on it, switch everything to the previous LTS (`24`).
- Server is **ESM TypeScript**: `"type": "module"` in `server/package.json`, `"module": "nodenext"` in
  `tsconfig.json`. Relative imports must end in `.js` even though the file is `.ts`
  (`import { createApp } from './app.js'`) — this is how Node ESM + TypeScript works.
- Express **5**, Mongoose latest, zod **4** (`import { z } from 'zod'`).
- All API paths start with `/api`. Error body is always `{ "error": { "message": string, "details"?: … } }`.
- Auth cookie name: `token`. JWT payload: `{ sub: userId }`. Expiry: 7 days.
- Cookie flags: `httpOnly: true`, `sameSite: 'lax'`, `secure: true` only in production, `maxAge` 7 days.
- Password rules: ≥ 8 characters. Display name: 1–50 characters. Emails stored lowercase and trimmed.
- "Not allowed" and "doesn't exist" are both **404**.
- Secrets never committed. `server/.env` is git-ignored; `server/.env.example` is committed.

## Review focus

Cases the spec implies that are easy to forget. Each has a test in the task named in brackets.

1. **Email casing/whitespace** — registering `" Bob@Example.com "` then logging in as `bob@example.com`
   works; registering `BOB@example.com` afterwards → 409. [2.2, 2.3]
2. **Malformed ids** — `GET /api/recipes/not-an-id` → 404 JSON, not a 500 crash. [3.1]
3. **Sharing edge cases** — sharing with yourself → 400; sharing twice with the same person doesn't create
   duplicates; unknown email → 404. [5.1]
4. **Deleting a shared recipe** — it disappears from the other user's "Shared with me" list and their
   `GET` → 404. [5.1]
5. **Awkward scaling numbers** — 1 cup for 3 people scaled to 1 shows "⅓", not "0.3333333"; a servings
   input of 0 or empty never produces `NaN` or `Infinity` on screen. [4.1, 4.2, 4.3]

---

# Milestone 0 — Project setup

Spec: §3. Work directly on `main` for this milestone (there's no GitHub remote yet).

### Task 0.1: Root workspace and Prettier

**Files:** create `package.json`, `.nvmrc`, `.editorconfig`, `.gitignore`, `.prettierrc`, `.prettierignore`

**Concepts:** npm workspaces, Prettier, `.editorconfig`, what `.gitignore` is for.

- [x] Create root `package.json` by hand (or `npm init -y` and edit it):
  - `"name": "sanjis-cookbook"`, `"private": true` (workspace roots must be private)
  - `"workspaces": ["client", "server"]`
  - `"engines": { "node": ">=26" }` (or your pinned major)
  - scripts for now: `format` → `prettier --write .`, `format:check` → `prettier --check .`
- [x] `.nvmrc` containing just your Node major version.
- [x] `.gitignore`: `node_modules/`, `dist/`, `coverage/`, `.env`, `.angular/`, OS/editor files.
- [x] `.prettierrc`: pick a few options and keep them (suggestion: `singleQuote: true`, `printWidth: 100`).
- [x] `.prettierignore`: `dist`, `coverage`, `.angular`, `package-lock.json`.
- [x] `npm install -D prettier` at the root.
- [x] Install the Prettier extension in your editor and turn on format-on-save.
- [x] **Verify:** `npm run format:check` → "All matched files use Prettier code style!" (run
      `npm run format` first if it complains about the spec docs).
- [x] **Check yourself:** Why is `.env` in `.gitignore` but `package-lock.json` committed?
- [x] Commit: `chore: set up root workspace and prettier`

### Task 0.2: Server skeleton with a health endpoint

**Files:** create `server/package.json`, `server/tsconfig.json`, `server/src/app.ts`,
`server/src/server.ts`

**Interfaces — produces:**

- `createApp(): Express` in `server/src/app.ts` — builds the app; never calls `listen`.
- `GET /api/health` → `200 { "ok": true }`

**Concepts:** ESM in Node, `tsconfig.json` basics (`target`, `module`, `outDir`, `rootDir`, `strict`),
`tsx watch`.

- [x] `server/package.json`: `"name": "server"`, `"private": true`, `"type": "module"`.
- [x] From the root: `npm install express -w server` and `npm install -D typescript tsx @types/node @types/express -w server`.
      (`-w server` = "install into the server workspace".)
- [x] `tsconfig.json`: `strict: true`, `module` and `moduleResolution` `nodenext`, `target` a recent ES
      version, `rootDir: "src"`, `outDir: "dist"`. Read what each option does in the TypeScript docs.
- [x] `app.ts`: `createApp()` creates the Express app, adds `express.json({ limit: '100kb' })`, and the
      health route. Returns the app.
- [x] `server.ts`: reads `PORT` from `process.env` (default 3000), calls `createApp().listen(...)`, logs the URL.
- [x] Scripts in `server/package.json`: `dev` → `tsx watch src/server.ts`, `build` → `tsc`,
      `start` → `node dist/server.js`.
- [x] **Verify:** `npm run dev -w server`, then in another terminal `curl localhost:3000/api/health` →
      `{"ok":true}`. Change the response, save, and see tsx restart.
- [x] **Verify:** `npm run build -w server` creates `server/dist/server.js`; `npm start -w server` runs it.
- [x] **Check yourself:** Why does `server.ts` import `'./app.js'` when the file is `app.ts`? Why
      separate `createApp` from `listen` (spec §3)?
- [x] Commit: `feat(server): add express skeleton with health endpoint`

### Task 0.3: Angular client and the dev proxy

**Files:** create `client/` (via the CLI), `client/proxy.conf.json`; modify `client/angular.json`, root
`package.json`

**Concepts:** Angular CLI, dev-server proxy (spec §9 "Local development"), `concurrently`.

- [x] From the root: `npx @angular/cli@latest new client --style=scss --ssr=false --skip-git --skip-install`.
      (`--skip-git`: we already have a repo. `--skip-install`: the root workspace installs everything.)
- [x] Then `npm install` at the root. Delete `client/package-lock.json` if one was created — only the
      root lock file should exist.
- [x] `proxy.conf.json`: forward `/api` to `http://localhost:3000`. Wire it in `angular.json` under the
      `serve` target's options (`proxyConfig`). Look it up in the Angular docs ("Proxying to a backend server").
- [x] Temporary check: make the root `App` component call `GET /api/health` with `HttpClient`
      (`provideHttpClient()` in `app.config.ts`) and display "API ok" or "API down". You'll delete this later.
- [x] Root: `npm install -D concurrently`. Root script `dev` → runs `npm run dev -w server` and
      `npm start -w client` together via `concurrently`.
- [x] **Verify:** `npm run dev`, open `http://localhost:4200` → "API ok". Stop the server half → reload →
      "API down".
- [x] **Check yourself:** In the browser's Network tab, which host/port did the `/api/health` request go
      to? Why does that matter for cookies later?
- [x] Commit: `feat(client): add angular app with dev proxy`

### Task 0.4: ESLint for the whole repo

**Files:** create `eslint.config.js` at the root; modify root `package.json`

**Concepts:** flat config, `typescript-eslint`, `angular-eslint`, `eslint-config-prettier` (spec §3).

- [x] Root: `npm install -D eslint @eslint/js typescript-eslint angular-eslint eslint-config-prettier`.
- [x] Write `eslint.config.js` as an array of config objects:
  1. global ignores: `**/dist`, `**/.angular`, `**/coverage`
  2. JS recommended + typescript-eslint recommended for all `**/*.ts`
  3. angular-eslint's TypeScript configs for `client/**/*.ts` and its template configs for
     `client/**/*.html` (angular-eslint's README has a flat-config example — adapt its `files` patterns to
     `client/...`)
  4. `eslint-config-prettier` **last**
- [x] Root scripts: `lint` → `eslint .`.
- [x] **Verify:** `npm run lint` → no errors. Then add an unused variable in `app.ts` → `npm run lint`
      reports it → remove it.
- [x] **Check yourself:** What would go wrong if `eslint-config-prettier` were first in the array?
- [x] Commit: `chore: add eslint for client and server`

---

# Milestone 1 — Walking skeleton, deployed

Spec: §8 (testing, CI), §9 (deployment). From now on: create a branch per milestone
(`git switch -c feat/walking-skeleton`).

### Task 1.1: Server tests with Vitest + supertest

**Files:** create `server/vitest.config.ts`, `server/tests/health.test.ts`; modify `server/package.json`, root `package.json`

- [x] `npm install -D vitest supertest @types/supertest -w server`.
- [x] `vitest.config.ts`: test files in `tests/**/*.test.ts`; add `test.env` with `NODE_ENV: 'test'`,
      `JWT_SECRET: 'test-secret'`, `MONGODB_URI: 'mongodb://unused'` (task 1.2's `config.ts` needs these).
- [x] Scripts: server `test` → `vitest run`; root `test` → `npm test --workspaces --if-present`.
- [x] Test `health.test.ts`:
  - `GET /api/health` returns 200 with body `{ ok: true }`
- [x] **Verify:** break the route on purpose → test fails; restore → `npm test` passes.
- [x] Commit: `test(server): add vitest and health test`

### Task 1.2: Config and MongoDB Atlas connection

**Files:** create `server/src/config.ts`, `server/.env`, `server/.env.example`; modify `server/src/server.ts`, server `dev` script

**Interfaces — produces:** `config: { nodeEnv: 'development' | 'test' | 'production'; port: number; mongodbUri: string; jwtSecret: string; isProd: boolean }` exported from `config.ts`.

**Concepts:** environment variables, `node --env-file`, zod for config (spec §3), Atlas (spec §9).

- [x] **Atlas setup** — follow spec §9 "One-time setup → Atlas" steps 1–4. Save both connection
      strings in a password manager.
- [x] `npm install zod mongoose -w server`.
- [x] `config.ts`: a zod schema for `process.env` (`NODE_ENV` default `'development'`, `PORT` coerced to a
      number with default 3000, `MONGODB_URI` and `JWT_SECRET` required non-empty strings). Parse once; if it
      fails, print which variables are missing and exit the process with code 1.
- [x] `.env` with your dev string (`…/sanjis-dev`) and a random `JWT_SECRET` (spec §6 shows how to generate
      one). `.env.example` with the same keys and fake values.
- [x] `server.ts`: `await mongoose.connect(config.mongodbUri)`, then listen. Log "Connected to MongoDB".
- [x] Server `dev` script → `tsx watch --env-file=.env src/server.ts`.
- [x] **Verify:** `npm run dev` logs the connection. Rename `JWT_SECRET` in `.env` → server refuses to
      start with a clear message. Restore it. `git status` must **not** show `.env`.
- [x] Commit: `feat(server): add validated config and mongodb connection`

### Task 1.3: Production build — Express serves Angular

**Files:** modify `server/src/app.ts`, root `package.json`

**Concepts:** `express.static`, SPA fallback, `trust proxy` (spec §9 — read the two boxed explanations).

- [ ] Root scripts: `build` → build client then server (`npm run build -w client && npm run build -w server`);
      `start` → `npm start -w server`.
- [ ] In `createApp()`, **only when `config.isProd`**:
  - `app.set('trust proxy', 1)`
  - `express.static` on the Angular output folder — `client/dist/client/browser`. Build the path from
    `import.meta.dirname` (the folder of the current file) going up to the repo root. It works from both
    `src/` and `dist/` because both are one level inside `server/`.
  - a fallback for `GET` requests not starting with `/api` → `res.sendFile(index.html)`. Express 5 needs
    the named-wildcard syntax (`'/{*splat}'`) — see the Express 5 migration guide.
- [ ] Remove the temporary "API ok" check from the Angular `App` component; leave a simple title.
- [ ] **Verify:** `npm run build`, then run the compiled server the way production would, loading your
      local `.env`: `cd server && NODE_ENV=production node --env-file=.env dist/server.js` → open
      `http://localhost:3000` → Angular app. Open `http://localhost:3000/some/deep/path` → still the app,
      not a 404. `/api/health` still returns JSON.
- [ ] **Check yourself:** Why must the `/api` routes be registered _before_ the fallback?
- [ ] Commit: `feat: serve angular build from express in production`

### Task 1.4: GitHub and CI

**Files:** create `.github/workflows/ci.yml`

**Concepts:** GitHub Actions workflow, job, steps; `actions/checkout`, `actions/setup-node`.

- [ ] Create an empty GitHub repo `sanjis-cookbook` (website, or `gh repo create`), add it as `origin`,
      push `main`.
- [ ] `ci.yml`: trigger on `push` and `pull_request`; one job on `ubuntu-latest`; steps: checkout →
      setup-node using `node-version-file: .nvmrc` and npm caching → `npm ci` → `npm run lint` →
      `npm run format:check` → `npm test` → `npm run build`.
- [ ] Push your branch, open a PR to `main`.
- [ ] **Verify:** the PR shows a green check. Break formatting on purpose in a commit → red ✗ → fix →
      green.
- [ ] Merge the PR.

### Task 1.5: First deploy on Render

- [ ] Follow spec §9 "One-time setup → Render", steps 1–5. Build command:
      `npm ci --include=dev && npm run build`. Start command: `npm start`. Use the **prod** connection string
      and a **new** `JWT_SECRET`.
- [ ] **Verify:** `https://<name>.onrender.com` shows the app; `/api/health` → `{"ok":true}`;
      `/recipes/anything` loads the app. Wait 20 minutes, reload → see the slow wake-up you read about.
- [ ] Read the Render deploy logs once from top to bottom, even if it worked: find the build command,
      the start command and the "Connected to MongoDB" line.
- [ ] **Check yourself:** What happens to a push to `main` whose CI fails?

---

# Milestone 2 — Authentication

Spec: §5 (auth routes), §6 (all of it), §8 (errors). Branch: `feat/auth`.

### Task 2.1: Error handling foundation

**Files:** create `server/src/errors/app-error.ts`, `server/src/middleware/error-handler.ts`,
`server/src/middleware/validate.ts`, `server/tests/errors.test.ts`; modify `app.ts`

**Interfaces — produces:**

- `class AppError extends Error { constructor(status: number, message: string, details?: unknown) }`
- `errorHandler: ErrorRequestHandler` — registered last in `createApp()`
- `validate(schema: z.ZodType): RequestHandler` — parses `req.body`; on success **replaces** `req.body`
  with the parsed data; on failure passes `new AppError(400, 'Invalid request', details)` where `details`
  is `z.flattenError(error).fieldErrors`
- unknown `/api/*` routes → 404 `{ error: { message: 'Not found' } }`

- [ ] Tests (`errors.test.ts`):
  - `GET /api/does-not-exist` → 404 with `error.message` `'Not found'`
  - `POST /api/health` with body `'{bad json'` and `Content-Type: application/json` → 400 with an
    `error.message` (hint: Express's JSON parser errors have `type === 'entity.parse.failed'`)
  - responses never contain a `stack` field
- [ ] Implement until green. The error-handler table in spec §8 lists every case — `CastError` and code
      `11000` can't be tested yet; they'll be covered by tests in 2.2 and 3.1.
- [ ] Commit: `feat(server): add central error handling and validation middleware`

### Task 2.2: User model and register

**Files:** create `server/src/modules/users/user.model.ts`, `server/src/modules/auth/auth.schemas.ts`,
`auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`, `server/tests/setup.ts`, `server/tests/auth.test.ts`

**Interfaces — produces:**

- `User` Mongoose model (fields: spec §4). `toJSON` outputs `{ id, email, displayName }` only.
- `registerSchema` (zod): `{ email, password (min 8), displayName (1–50, trimmed) }`; email trimmed,
  lowercased, valid format
- `registerUser(input: RegisterInput): Promise<UserDocument>`
- `signToken(userId: string): string`
- `setAuthCookie(res: Response, token: string): void` — the flags from Global constraints
- `POST /api/auth/register` → 201 + user JSON, sets the `token` cookie

**Concepts:** argon2 (spec §6), `select: false`, unique index, `toJSON` transform.

- [ ] `npm install argon2 jsonwebtoken cookie-parser -w server` and
      `npm install -D @types/jsonwebtoken @types/cookie-parser mongodb-memory-server -w server`.
- [ ] `tests/setup.ts` (registered as `setupFiles` in vitest config): `beforeAll` start
      `MongoMemoryServer` and `mongoose.connect` to it; `afterEach` delete all documents in every collection;
      `afterAll` disconnect and stop. (The first run downloads a MongoDB binary — be patient.)
- [ ] Tests (`auth.test.ts`, register section):
  - valid body → 201; body has `id`, `email`, `displayName`; **no** `passwordHash`; response has a
    `Set-Cookie` header starting with `token=` and containing `HttpOnly`
  - email `" Bob@Example.com "` is stored/returned as `bob@example.com`
  - same email twice (second time as `BOB@example.com`) → 409
  - password of 7 characters → 400 with `details.password`
  - missing displayName → 400 with `details.displayName`
  - the stored `passwordHash` in the DB is not the plain password and starts with `$argon2`
- [ ] Implement. Remember `await User.init()` or `syncIndexes` may be needed in tests so the unique index
      exists before the duplicate test runs.
- [ ] Commit: `feat(auth): add user model and registration`

### Task 2.3: Login, logout, me, requireAuth

**Files:** create `server/src/middleware/require-auth.ts`, `server/src/types/express.d.ts`; modify the auth module files and `auth.test.ts`

**Interfaces — produces:**

- `requireAuth: RequestHandler` — sets `req.userId: string` or responds 401 `'Not authenticated'`
- `express.d.ts` — augments Express's `Request` with `userId?: string`
- `authenticate(email: string, password: string): Promise<UserDocument>` — throws `AppError(401, 'Invalid email or password')`
- `POST /api/auth/login` → 200 + user, sets cookie
- `POST /api/auth/logout` → 204, clears cookie (requires auth)
- `GET /api/auth/me` → 200 + user (requires auth)

- [ ] Tests (add to `auth.test.ts`). Tip: write a test helper `registerAndGetCookie(app, email?)` that
      returns the `Set-Cookie` value — you'll reuse it in every later test file.
  - login with correct credentials → 200 + cookie
  - login with `BOB@EXAMPLE.COM` when registered as `bob@example.com` → 200
  - wrong password → 401 `'Invalid email or password'`; unknown email → 401 with the **same** message
  - `GET /me` with cookie → 200 + same user; without cookie → 401; with cookie `token=garbage` → 401
  - token signed with a different secret → 401
  - `POST /logout` → 204 and the `Set-Cookie` header clears `token`
- [ ] Implement. Remember `cookieParser()` in `createApp()`, and that login must explicitly select
      `+passwordHash`.
- [ ] **Check yourself:** Why the same message for wrong email and wrong password? Why can't the Angular
      app read the token itself?
- [ ] Commit: `feat(auth): add login, logout, me and requireAuth`

### Task 2.4: helmet and rate limiting

**Files:** modify `app.ts`, auth routes; create `server/tests/security.test.ts`

- [ ] `npm install helmet express-rate-limit -w server`.
- [ ] Tests:
  - any response has header `x-content-type-options: nosniff`
  - 10 failed logins from the same app → 401 each; the 11th → 429
- [ ] Implement: `helmet()` early in `createApp()`; one limiter (10 per 15 min) on login + register,
      created **inside** `createApp()` so each test app gets fresh counters.
- [ ] **Verify in the browser** (after a production build): no Content-Security-Policy errors in the
      console. If you see one about an inline `onload` handler on a stylesheet, that's Angular's critical-CSS
      inlining — disable `inlineCritical` in the production `optimization.styles` options in `angular.json`
      instead of weakening helmet.
- [ ] Commit: `feat(server): add helmet and auth rate limiting`

### Task 2.5: Client auth

**Files (client/src/app):** `core/models.ts`, `core/auth.service.ts`, `core/auth.guard.ts`,
`core/auth.interceptor.ts`, `features/auth/login.page.ts`, `features/auth/register.page.ts` (+ templates);
modify `app.config.ts`, `app.routes.ts`, the root component

**Interfaces — produces:**

- `models.ts`: `interface User { id: string; email: string; displayName: string }`
- `AuthService`: `currentUser: Signal<User | null>`, `loadMe(): Promise<void>` (sets null on 401, never
  throws), `register(email, password, displayName): Observable<User>`, `login(email, password): Observable<User>`,
  `logout(): Observable<void>` — each updates `currentUser`
- `authGuard: CanActivateFn` — `true` if logged in, else `UrlTree` to `/login`
- `authInterceptor: HttpInterceptorFn` — on 401 from any URL **except** `/api/auth/*`: clear user, go to `/login`

**Concepts:** signals, `provideAppInitializer`, functional guards and interceptors, reactive forms (spec §7).

- [ ] `app.config.ts`: `provideHttpClient(withInterceptors([authInterceptor]))` and
      `provideAppInitializer(() => inject(AuthService).loadMe())`.
- [ ] Routes: `/login`, `/register`, `/recipes` (placeholder page for now, guarded), `''` → `/recipes`.
- [ ] Login and register pages with reactive forms: show validation messages; show the server's
      `error.message` on 401/409 and `details` on 400. After success → `/recipes`.
- [ ] Header in the root component: when logged in, show display name and a Logout button.
- [ ] **Verify manually:** register → land on `/recipes` → refresh → still logged in → DevTools →
      Application → Cookies: `token` is HttpOnly → logout → `/recipes` redirects to `/login` → wrong password
      shows the error.
- [ ] **Check yourself:** Why does the interceptor skip `/api/auth/*`? (Think about `loadMe` on the
      register page.)
- [ ] Commit: `feat(client): add login, register and route protection`

### Task 2.6: Ship it

- [ ] `npm run lint && npm run format:check && npm test && npm run build` locally → all green.
- [ ] Push, PR, CI green, merge. Wait for Render to deploy.
- [ ] **Verify in production:** register a real account; in DevTools the `token` cookie shows **Secure**
      and **HttpOnly**.

---

# Milestone 3 — Recipes (owner only)

Spec: §4, §5. Branch: `feat/recipes`.

### Task 3.1: Recipe model, create and get

**Files:** create `server/src/modules/recipes/recipe.model.ts`, `recipes.schemas.ts`, `recipes.service.ts`,
`recipes.controller.ts`, `recipes.routes.ts`, `server/tests/recipes.test.ts`

**Interfaces — produces:**

- `Recipe` model (spec §4), with indexes on `owner` and `sharedWith`, `timestamps: true`
- `recipeInputSchema` (zod): `title` (trimmed, 1–120), `description?` (≤ 2000), `servings` (int ≥ 1),
  `prepMinutes?`/`cookMinutes?` (int ≥ 0), `tags` (string[], default `[]`), `ingredients`
  (`{ quantity?: number > 0, unit?: string, name: string (min 1) }[]`), `steps` (non-empty strings[])
- `recipeUpdateSchema = recipeInputSchema.partial()`
- `RecipeDto` = `{ id, title, description, servings, prepMinutes, cookMinutes, tags, ingredients, steps,
owner: { id, displayName }, isOwner: boolean, sharedWith?: { id, email, displayName }[], createdAt, updatedAt }`
  — `sharedWith` present **only** when `isOwner`
- `toRecipeDto(doc, userId: string): RecipeDto` in `recipes.service.ts`
- `createRecipe(userId, input): Promise<RecipeDto>`, `getRecipe(userId, id): Promise<RecipeDto>` (throws `AppError(404, 'Recipe not found')`)
- `POST /api/recipes` → 201, `GET /api/recipes/:id` → 200; both behind `requireAuth`

- [ ] Tests:
  - create with a valid body → 201; `isOwner: true`; `owner.id` is my id
  - body containing `owner: <someone else's id>` → recipe still owned by me
  - `servings: 0` → 400 `details.servings`; missing `title` → 400
  - get my recipe → 200
  - another user gets my recipe → **404**
  - `GET /api/recipes/not-an-id` → 404 (from the `CastError` case in the error handler)
  - no cookie → 401
- [ ] Implement. Use the permission-in-query pattern (spec §5, rule 2). `populate('owner', 'displayName')`
      to get the owner's name.
- [ ] Commit: `feat(recipes): add recipe model, create and get`

### Task 3.2: List, update, delete

**Interfaces — produces:**

- `listRecipes(userId, scope: 'mine' | 'shared'): Promise<RecipeDto[]>` — newest `updatedAt` first.
  (`'shared'` is implemented in task 5.1; for now return `[]`.)
- `updateRecipe(userId, id, input): Promise<RecipeDto>`, `deleteRecipe(userId, id): Promise<void>`
- `GET /api/recipes?scope=mine|shared` (default `mine`; anything else → 400), `PATCH /api/recipes/:id` → 200, `DELETE /api/recipes/:id` → 204

- [ ] Tests:
  - list returns only my recipes, newest first
  - `?scope=banana` → 400
  - PATCH title → 200 with new title; other fields unchanged
  - PATCH `servings: 0` → 400
  - another user PATCHes / DELETEs my recipe → 404, and the recipe is unchanged / still exists
  - DELETE → 204, then GET → 404
- [ ] Implement. For PATCH use `findOneAndUpdate` with `{ returnDocument: 'after', runValidators: true }`.
- [ ] Commit: `feat(recipes): add list, update and delete`

### Task 3.3: Client — list, detail, form

**Files (client/src/app):** extend `core/models.ts`; create `features/recipes/recipes.service.ts`,
`recipe-list.page.ts`, `recipe-detail.page.ts`, `recipe-form.page.ts` (+ templates/styles); modify `app.routes.ts`

**Interfaces — produces:**

- `models.ts`: `Ingredient`, `Recipe` (matches `RecipeDto`), `RecipeInput` (matches `recipeInputSchema`)
- `RecipesService`: `list(scope: 'mine' | 'shared'): Observable<Recipe[]>`, `get(id)`, `create(input)`,
  `update(id, input)`, `remove(id)`; task 5.2 adds `share(id, email)` and `unshare(id, userId)`

- [ ] Routes from spec §7 (all guarded).
- [ ] List page: cards/rows with title, tags, total time. "New recipe" button. Empty state: "No recipes
      yet".
- [ ] Detail page: everything readable; Edit and Delete buttons only when `isOwner` (delete asks for
      confirmation, then goes to the list).
- [ ] Form page (create + edit share one component; edit mode when the route has `:id`): a `FormArray` of
      ingredient groups (quantity, unit, name) and a `FormArray` of step controls, each row with remove, plus
      "add ingredient" / "add step" buttons. Empty optional fields must be **omitted** (not sent as `""` or
      `null`) or the server will reject them. Show server `details` next to the fields.
- [ ] **Verify manually:** create, view, edit (add/remove rows), delete. As a second user (another browser
      or a private window), paste the first user's recipe URL → the app shows "not found".
- [ ] Ship it (lint/format/test/build, PR, CI, merge, check production).

---

# Milestone 4 — Servings scaling

Spec: §7 "Servings scaling". Branch: `feat/scaling`. Client tests: run `npm test -w client`
(`ng test`; add `--watch=false` in the client's `test` script so CI doesn't hang).

### Task 4.1: The scaling function

**Files:** create `client/src/app/features/recipes/scaling.ts`, `scaling.spec.ts`

**Interfaces — produces:** `scaleIngredients(ingredients: Ingredient[], baseServings: number, targetServings: number): Ingredient[]`

- [ ] Tests:
  - 200 g for 4 → target 2 → 100 g
  - 1 for 3 → target 1 → quantity close to 0.3333 (`toBeCloseTo`)
  - ingredient without `quantity` → returned without `quantity`, everything else equal
  - unit and name never change
  - input array and its objects are not mutated (compare with a deep copy taken before)
  - target `0`, negative, non-integer or `NaN` → quantities unchanged (factor 1)
- [ ] Implement: pure, no Angular imports.
- [ ] Commit: `feat(client): add ingredient scaling function`

### Task 4.2: Quantity display pipe

**Files:** create `client/src/app/shared/quantity.pipe.ts`, `quantity.pipe.spec.ts`

**Interfaces — produces:** `QuantityPipe` with name `quantity`, `transform(value: number | undefined): string`

**Display rules** (they decide behavior, so they're given here):

1. `undefined` → `''`.
2. Values ≥ 10 → rounded to the nearest whole number.
3. Otherwise split into whole part + fractional part. If the fractional part is within 0.05 of 0 or 1,
   round to the whole number. If it's within 0.05 of ¼, ⅓, ½, ⅔ or ¾, show the whole part (omit it if 0)
   followed by that glyph.
4. Otherwise show up to 2 decimals with trailing zeros removed.

- [ ] Tests: `0.5 → '½'`, `2.25 → '2¼'`, `1.3333 → '1⅓'`, `0.6667 → '⅔'`, `3 → '3'`, `1.97 → '2'`,
      `0.1 → '0.1'`, `1.15 → '1.15'`, `12.4 → '12'`, `undefined → ''`.
- [ ] Implement.
- [ ] Commit: `feat(client): add quantity display pipe`

### Task 4.3: Servings control on the detail page

- [ ] In the detail page: `chosenServings = signal(...)` initialized from the recipe;
      `scaledIngredients = computed(...)` using `scaleIngredients`; show quantities through the `quantity`
      pipe.
- [ ] Control: − button, number input, + button. − is disabled at 1. If the input is empty or < 1, don't
      update `chosenServings` (keep the last valid value). A "reset" link appears when it differs from the
      recipe's servings.
- [ ] **Verify manually:** 4 → 2 halves everything; 3 → 1 shows ⅓ where expected; clearing the input
      never shows `NaN`; reload → back to the stored servings; nothing changed in the DB.
- [ ] Ship it.

---

# Milestone 5 — Sharing

Spec: §5 (sharing routes and rules 5–6). Branch: `feat/sharing`.

### Task 5.1: Share endpoints and "shared with me"

**Files:** modify the recipes module files; create `server/tests/sharing.test.ts`

**Interfaces — produces:**

- `shareRecipe(ownerId, recipeId, email): Promise<RecipeDto>`, `unshareRecipe(ownerId, recipeId, targetUserId): Promise<RecipeDto>`
- `POST /api/recipes/:id/shares` `{ email }` → 200 + recipe; `DELETE /api/recipes/:id/shares/:userId` → 200 + recipe
- `listRecipes(userId, 'shared')` now returns recipes where `sharedWith` contains me

- [ ] Tests (users: Alice owns the recipe, Bob gets it shared, Carol is a stranger):
  - Alice shares with `BOB@example.com` → 200; `sharedWith` contains Bob
  - Bob: `scope=shared` lists it; `scope=mine` doesn't
  - Bob: GET → 200 with `isOwner: false` and **no** `sharedWith` field
  - Bob: PATCH, DELETE, share with Carol, unshare → all 404
  - Carol: GET → 404
  - sharing with an unknown email → 404 `'No user with that email'`
  - Alice shares with herself → 400
  - Alice shares with Bob twice → `sharedWith` has Bob once
  - Alice unshares Bob → Bob's GET → 404 and his shared list is empty
  - Alice deletes the recipe → Bob's shared list is empty
- [ ] Implement with `$addToSet` / `$pull` inside the owner-scoped `findOneAndUpdate`.
- [ ] Commit: `feat(recipes): add sharing`

### Task 5.2: Client — tabs, share panel, read-only view

**Files:** create `features/recipes/share-panel.ts`; modify the list and detail pages and `RecipesService`

- [ ] List page: tabs "My recipes" / "Shared with me", synced with `?scope=` in the URL (so refresh and
      the back button keep the tab). Shared items show "by <owner name>".
- [ ] Detail page, when `isOwner`: share panel — email input + "Share" button, list of people with a
      "Remove" button each, server errors shown inline. When not owner: "Shared by <name>", no
      edit/delete/share controls, scaling still works.
- [ ] **Verify manually** with two browsers: everything in the 5.1 test list, through the UI.
- [ ] Ship it.

---

# Milestone 6 — Polish

Branch: `chore/polish`.

### Task 6.1: Pre-commit hook

- [ ] Root: `npm install -D husky lint-staged`, run `npx husky init`.
- [ ] `lint-staged` config: run `prettier --write` on staged files, and `eslint --fix` on staged `.ts`
      and `.html` files.
- [ ] Pre-commit hook runs `npx lint-staged`.
- [ ] **Verify:** stage a badly formatted file → commit → it gets formatted; stage a file with a lint
      error → the commit is blocked.

### Task 6.2: UX states and README

- [ ] Every page that loads data shows a loading state, an error state and (for lists) an empty state.
- [ ] `README.md`: what the app is, the live URL, how to run locally (`.env` from `.env.example`,
      `npm install`, `npm run dev`), the available scripts, how deployment works.
- [ ] Ship it. 🎉

---

## After v1

Version 2 (photos) and the later ideas from spec §10 each start with their own short design conversation
with Claude before you write any code.
