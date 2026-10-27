# Sanji's Cookbook — Design Spec

Date: 2026-10-27
Status: draft, awaiting review

## 1. Purpose

A web app where people write, store and edit cooking recipes. It is a **learning project**: the goal is to
understand how a real web app is designed, built, tested and deployed — not to ship as fast as possible. The
author writes all the code; this spec and the learner's guide explain _what_ to build and _why_.

### What we agreed

- Multi-user. Every user sees **their own recipes** plus **recipes other users shared with them**.
- Sharing is **view-only**: only the owner can edit or delete a recipe.
- The owner shares with a **specific registered user**, identified by email. No public links.
- Recipes are **text only** in v1. Photos are planned for v2.
- **Servings scaling**: on a recipe page you can change the number of servings and the ingredient quantities
  are recalculated on screen. Nothing is saved — it is a view-only feature.
- **Email + password login, built by hand** (no Google login, no hosted auth service).
- Stack: **Angular + Express + Mongoose + MongoDB**, backend in **TypeScript**, one monorepo, deployed as
  **one server**.
- **Prettier** and **ESLint** are used across the whole project.
- Very few users. Free hosting tiers are enough.

### Success criteria

1. The app runs at a public `https://…onrender.com` URL and works from any device.
2. Two users can each register, create recipes, share one with the other, and the other sees it read-only.
3. A user can never read, edit or delete a recipe they don't own and that wasn't shared with them — and
   there are automated tests proving it.
4. Every push to `main` is checked by CI (lint, format, tests, build) and deployed only if CI passes.
5. The author can explain every library in this document and why it is there.

### Out of scope for v1

Photos (v2), copying a shared recipe, password reset by email, email verification, changing email, edit
permission for shared users, unit conversion (g ↔ kg), share links, end-to-end browser tests.

---

## 2. Architecture overview

```
           Browser (Angular app)
                  │   same origin: https://sanjis-cookbook.onrender.com
                  ▼
   ┌──────────────────────────────────────┐
   │  Express server (Render)             │
   │   /api/*   → JSON API                │
   │   /*       → Angular's built files   │
   └──────────────────────────────────────┘
                  │  Mongoose
                  ▼
          MongoDB Atlas (free cluster)
```

**One server serves both the API and the Angular app.** This means the browser sees a single _origin_.

> **Origin** = protocol + domain + port, e.g. `https://sanjis-cookbook.onrender.com`. Browsers treat
> requests to a _different_ origin with suspicion: they apply **CORS** rules (the server must explicitly
> say which other origins may call it) and stricter **cookie** rules (a cookie set by `api.example.com`
> is not freely sent from a page on `app.example.com`; it needs `SameSite=None; Secure`, and some browsers
> block it anyway). By serving everything from one origin we avoid both problems entirely.

The alternatives we rejected: hosting the frontend and backend separately (forces you to fight cross-site
cookies), and full-stack frameworks like Analog/Next.js (they blur the client/server boundary that this
project is meant to teach).

---

## 3. Repository structure and tooling

```
sanjis-cookbook/
  package.json          root: npm workspaces + scripts (dev, build, lint, format, test, start)
  package-lock.json
  eslint.config.js      one ESLint config for the whole repo
  .prettierrc           Prettier options
  .prettierignore       folders Prettier skips (dist/, coverage/, …)
  .editorconfig         basic editor settings (indent, line endings)
  .nvmrc                the Node version the project uses
  .gitignore            node_modules/, dist/, .env, coverage/, …
  .github/workflows/ci.yml
  docs/
  client/               Angular app (its own package.json)
  server/               Express API (its own package.json, tsconfig.json)
    src/
      app.ts            creates and configures the Express app, but does NOT call listen()
      server.ts         connects to MongoDB, then calls app.listen(PORT)
      config.ts         reads and validates environment variables
      modules/
        auth/           auth.routes.ts, auth.controller.ts, auth.service.ts, auth.schemas.ts
        recipes/        recipe.model.ts, recipes.routes.ts, recipes.controller.ts,
                        recipes.service.ts, recipes.schemas.ts
        users/          user.model.ts
      middleware/       require-auth.ts, validate.ts, error-handler.ts
      errors/           app-error.ts
    tests/
```

### Why split `app.ts` and `server.ts`?

Tests need the configured Express app but must **not** open a real port or connect to the real database.
`app.ts` exports a `createApp()` function; `server.ts` is the only file that connects to MongoDB and
listens. Tests call `createApp()` and drive the result with supertest (see §8). It's a function rather than
a single exported `app` so each test file gets a fresh app — e.g. with its own empty rate-limit counters.

### Why feature folders (`modules/auth`, `modules/recipes`)?

Everything about one feature lives together. When you work on sharing you open `modules/recipes/` and find
the model, routes and logic side by side, instead of hunting through `models/`, `routes/`, `controllers/`.

Inside a module, each file has one job:

| File | Job |
|---|---|
| `*.routes.ts` | maps URL + HTTP method → middleware + controller function |
| `*.controller.ts` | reads `req`, calls the service, writes `res`. No database code here. |
| `*.service.ts` | the actual logic and database queries. Knows nothing about `req`/`res`. |
| `*.schemas.ts` | zod schemas describing valid request bodies (see below) |
| `*.model.ts` | the Mongoose schema and model |

Keeping services free of `req`/`res` makes them easy to reason about and test.

### Tools explained

#### npm workspaces

A built-in npm feature for repos that contain several packages. The root `package.json` lists them:

```json
{ "workspaces": ["client", "server"] }
```

Then **one** `npm install` at the root installs dependencies for both, into a shared `node_modules`, with a
single `package-lock.json`. You run a script in one workspace with `npm run build -w server`, or in all of
them with `npm run test --workspaces`.

#### Prettier

An **automatic code formatter**. It rewrites your files so spacing, quotes, line breaks and commas are
always consistent, so you never discuss style. It only changes _how code looks_, never what it does.

- `.prettierrc` holds a few options (e.g. `{ "singleQuote": true, "printWidth": 100 }`).
- Scripts: `prettier --write .` (fix everything) and `prettier --check .` (only report; used in CI).
- Install the Prettier extension in your editor and enable "format on save".

#### ESLint

A **linter**: it reads your code and reports likely bugs and bad patterns, such as unused variables, a
forgotten `await`, or `==` where you meant `===`. Some problems it can fix automatically (`eslint --fix`).

- Current ESLint uses a **flat config**: a single `eslint.config.js` file that exports an array of config
  objects. Each object can target certain files (e.g. `server/**/*.ts`) and turn rules on or off.
- **`typescript-eslint`**: teaches ESLint to read TypeScript and adds TypeScript-specific rules (e.g. "this
  promise is never awaited").
- **`angular-eslint`**: adds Angular-specific rules for components and HTML templates (e.g. component
  selector naming, accessibility checks in templates). Install it with `ng add angular-eslint` in the
  client.
- **`eslint-config-prettier`**: switches off every ESLint rule that is about formatting, so ESLint and
  Prettier never disagree. Rule of thumb: **Prettier owns formatting, ESLint owns correctness**. It goes
  _last_ in the config array so it wins.

#### tsx and tsc (backend TypeScript)

Node can't always run TypeScript the way your project is configured, so we use two tools:

- **`tsx`** — runs `.ts` files directly during development. `tsx watch src/server.ts` restarts the server
  every time you save a file. Fast, no build step.
- **`tsc`** — the official TypeScript compiler. For production it type-checks everything and writes plain
  JavaScript into `server/dist/`, which Render runs with `node`. Also used in CI (`tsc --noEmit` = only
  type-check, write nothing).

#### Environment variables and `.env`

Configuration that differs between your laptop and production (database URL, secrets) is passed to the
program as **environment variables**, read in code via `process.env.NAME`. Locally they live in
`server/.env` (one `NAME=value` per line) which is **git-ignored** — secrets must never be committed.
Node can load that file itself: `node --env-file=.env …` (tsx supports the same flag), so you don't need
the `dotenv` package. `server/.env.example` _is_ committed, listing the variable names with fake values so
anyone knows what to set.

`config.ts` reads the variables once at startup and validates them with zod (below). If `JWT_SECRET` is
missing, the server crashes immediately with a clear message instead of failing mysteriously later.

#### zod

A library for **describing the shape of data and checking real data against it at runtime**.

Why do we need it when we have TypeScript? TypeScript types disappear when the code is compiled — they
can't check a JSON body that arrives over the network at runtime. A client (or an attacker) can send
anything. zod checks it while the program runs:

```ts
const createRecipeSchema = z.object({
  title: z.string().trim().min(1).max(120),
  servings: z.number().int().min(1),
  ingredients: z.array(z.object({ quantity: z.number().positive().optional(), unit: z.string().optional(), name: z.string().min(1) })),
  steps: z.array(z.string().min(1)),
});

const result = createRecipeSchema.safeParse(req.body);
// result.success === false → result.error lists exactly which fields are wrong
// result.success === true  → result.data is clean, and fully typed
```

Bonus: `z.infer<typeof createRecipeSchema>` gives you the TypeScript type for free, so the type and the
validation can never drift apart. We'll write a small `validate(schema)` middleware that runs `safeParse`
on `req.body` and responds 400 on failure, so route handlers only ever see valid data.

Note: Mongoose also validates (required fields, min/max) when saving. zod guards the **API boundary**
(what the client sent); Mongoose guards the **database boundary**. Having both is normal.

#### husky + lint-staged (milestone 6)

- **Git hooks** are scripts git runs automatically at certain moments, e.g. just before a commit.
- **husky** makes it easy to set up git hooks that are committed with the repo.
- **lint-staged** runs commands only on the files you are about to commit (not the whole repo), so it is fast.

Together: every `git commit` first runs Prettier and ESLint on the changed files, and blocks the commit if
ESLint finds errors. CI would catch these anyway; the hook just catches them earlier.

---

## 4. Data model

```
User
  email          string, required, unique, lowercase, trimmed
  passwordHash   string, required, select: false
  displayName    string, required
  createdAt, updatedAt         (Mongoose timestamps: true)

Recipe
  owner          ObjectId → User, required, indexed
  title          string, required
  description    string
  servings       number, required, integer ≥ 1
  prepMinutes    number ≥ 0
  cookMinutes    number ≥ 0
  tags           [string]
  ingredients    [{ quantity?: number > 0, unit?: string, name: string }]
  steps          [string]            (array order = step order)
  sharedWith     [ObjectId → User], indexed
  createdAt, updatedAt
```

### Design decisions

- **`sharedWith` is an array inside the recipe**, not a separate collection. "Recipes shared with me" is
  one query: `Recipe.find({ sharedWith: myId })`. A recipe is shared with a handful of people at most, so
  the array stays small. Use `$addToSet` to add a user (it won't add duplicates) and `$pull` to remove one.
- **Ingredients and steps are embedded** (stored inside the recipe document) because they're always read
  and written together with the recipe and never on their own.
- **`servings` is required** because scaling needs a reference value. **`quantity` is a number** so it can
  be multiplied; it's optional because of ingredients like "salt, to taste".
- **Indexes.** An index is a sorted lookup structure MongoDB keeps alongside a collection, like the index
  at the back of a book. Without one, `find({ owner: me })` reads every recipe in the collection; with one
  it jumps straight to the matches. We index `Recipe.owner` and `Recipe.sharedWith`. The `unique: true` on
  `User.email` also creates an index, and that index is what _guarantees_ no two users share an email —
  even if two registrations arrive at the same instant.
- **`select: false` on `passwordHash`** means Mongoose leaves the field out of every query result unless
  you explicitly ask for it (`User.findOne(...).select('+passwordHash')`, which only the login code does).
  This prevents accidentally sending the hash to the browser.
- **API responses** use `toJSON` options on the schemas to rename `_id` → `id` and drop `__v`, so the
  client sees clean objects.

---

## 5. API

All paths start with `/api`. Request and response bodies are JSON. Every route except register and login
requires the auth cookie (§6).

| Method & path | Allowed | Success | Purpose |
|---|---|---|---|
| `POST /auth/register` `{ email, password, displayName }` | anyone | 201 + user | create account and log in |
| `POST /auth/login` `{ email, password }` | anyone | 200 + user | check password, set cookie |
| `POST /auth/logout` | logged in | 204 | clear cookie |
| `GET /auth/me` | logged in | 200 + user | who am I? |
| `GET /recipes?scope=mine` (default) | logged in | 200 + list | my recipes |
| `GET /recipes?scope=shared` | logged in | 200 + list | recipes shared with me |
| `GET /recipes/:id` | owner or shared-with | 200 + recipe | read one |
| `POST /recipes` | logged in | 201 + recipe | create; owner = me |
| `PATCH /recipes/:id` | owner | 200 + recipe | update some fields |
| `DELETE /recipes/:id` | owner | 204 | delete |
| `POST /recipes/:id/shares` `{ email }` | owner | 200 + recipe | share with a registered user |
| `DELETE /recipes/:id/shares/:userId` | owner | 200 + recipe | stop sharing |

A recipe in a response includes an `isOwner: boolean` (computed by the server for the current user) so the
client knows whether to show Edit/Delete/Share buttons. List responses include the owner's `displayName` so
"Shared with me" can show who shared it.

### Access rules (the most important part of the backend)

1. **The owner always comes from the cookie, never the body.** `POST /recipes` sets
   `owner = req.userId`. If the body contains `owner`, zod strips it (zod objects drop unknown keys by
   default) — a user can't create recipes "as" someone else.
2. **Permission is part of the query.** Don't load a recipe and then check who owns it; ask MongoDB for
   "this id _and_ I'm allowed":
   - read: `Recipe.findOne({ _id: id, $or: [{ owner: me }, { sharedWith: me }] })`
   - edit/delete/share: `Recipe.findOneAndUpdate({ _id: id, owner: me }, …)` /
     `findOneAndDelete({ _id: id, owner: me })`

   If nothing matches → **404**. This makes it impossible to forget the check, because there is no
   "load first, check later" step to forget.
3. **"Not allowed" and "doesn't exist" both answer 404**, so nobody can probe which recipe ids exist.
4. **The UI hiding buttons is not security.** Anyone can call the API with curl. The server is the only
   real gatekeeper.
5. **Sharing rules**: the email is lowercased and looked up; unknown email → 404 "No user with that email";
   sharing with yourself → 400. Known trade-off: this reveals whether an email is registered. Acceptable for
   a small app among friends; a public product would answer more vaguely.
6. **PATCH can't change** `owner` or `sharedWith` — the PATCH zod schema simply doesn't include them.
   Sharing has its own endpoints.

---

## 6. Authentication and security

### Concepts

- **Password hashing.** We never store passwords. We store a **hash**: the output of a one-way function.
  From the hash you can't get the password back, but you can check whether a given password produces the
  same hash. Good password hash functions are deliberately _slow_ and include a random **salt** (a random
  value mixed in, stored inside the hash string), so stolen hashes are very expensive to crack.
- **argon2** (npm package `argon2`) is the current recommended password hash function. Two calls are all
  you need: `await argon2.hash(password)` → a string like `$argon2id$v=19$m=…$<salt>$<hash>` that you
  store; `await argon2.verify(storedHash, password)` → `true`/`false`. (`bcrypt` is an older,
  also-acceptable alternative.)
- **JWT (JSON Web Token).** A compact string made of three parts: a header, a **payload** (e.g.
  `{ "sub": "<userId>", "exp": 1767225600 }`) and a **signature**. The signature is computed with a secret
  only the server knows (`JWT_SECRET`). Anyone can _read_ the payload (it's only encoded, not encrypted),
  but nobody can _change_ it without the signature becoming invalid. So when the server receives a token
  with a valid signature, it can trust "this is user X, until time Y" without a database lookup. We'll use
  the `jsonwebtoken` package: `jwt.sign(payload, secret, { expiresIn: '7d' })` and
  `jwt.verify(token, secret)` (throws if forged or expired).
  - `sub` ("subject") is the standard field name for "who this token is about".
  - Never put secrets or the password hash in the payload — it's readable.
- **Cookies and their flags.** A cookie is a small value the server asks the browser to store and send
  back automatically on every later request to the same site. We put the JWT in a cookie named `token`
  with:
  - `httpOnly` — JavaScript in the page **cannot read** it. If some malicious script ever ran on your page
    (XSS), it still couldn't steal the token. (This is why we don't use `localStorage` for the token.)
  - `secure` — only sent over HTTPS. On in production; off locally because `localhost` is plain HTTP.
  - `sameSite: 'lax'` — the browser won't attach the cookie to background requests (fetch, form POSTs)
    triggered by _other_ websites.
  - `maxAge` — 7 days, matching the JWT expiry.
- **cookie-parser** — Express middleware that reads the `Cookie` header and puts the values on
  `req.cookies`, so the auth middleware can read `req.cookies.token`. (Setting cookies needs no library:
  `res.cookie(name, value, options)` is built into Express.)

### Flows

**Register** → validate body with zod (email format, password ≥ 8 chars, displayName 1–50 chars) →
lowercase email → `argon2.hash` → create User (a duplicate email triggers MongoDB error 11000 → 409) →
log in as below → 201.

**Login** → find user by lowercased email with `+passwordHash` → `argon2.verify`. Wrong email _or_ wrong
password → the **same** 401 "Invalid email or password" (so the login form can't be used to discover which
emails exist) → sign JWT `{ sub: user.id }` → `res.cookie('token', jwt, flags)` → 200 + user (without the
hash).

**`requireAuth` middleware** (on every protected route) → read `req.cookies.token` → `jwt.verify` → on
success set `req.userId = payload.sub` and call `next()`; on missing/invalid/expired token → 401.
(You'll need a small TypeScript declaration to add `userId` to Express's `Request` type.)

**Logout** → `res.clearCookie('token', sameFlags)` → 204.

**Known limitation:** a JWT stays valid until it expires — the server can't "cancel" one. Logout deletes
the cookie from the browser, which is enough here. Real systems that need instant revocation add a
server-side session store or a token deny-list; we don't need that.

### Extra protections

- **helmet** — Express middleware that sets a group of security-related HTTP **response headers** with
  safe defaults. One line: `app.use(helmet())`. Examples of what it sets: `X-Content-Type-Options: nosniff`
  (the browser must not guess file types), `Strict-Transport-Security` (always use HTTPS for this site),
  and a `Content-Security-Policy` that limits where scripts/styles may load from — this is a strong extra
  defence against XSS. If Angular's production build is ever blocked by the CSP (you'd see errors in the
  browser console), we adjust helmet's CSP options rather than disabling it.
- **express-rate-limit** — counts requests per IP address and answers **429 Too Many Requests** once a
  limit is passed. We put a limiter on `/api/auth/login` and `/api/auth/register` only, e.g. 10 requests
  per 15 minutes per IP, which makes guessing passwords impractically slow.
- **CSRF** (Cross-Site Request Forgery): a malicious site makes _your_ browser send a request to _our_ app,
  and the browser attaches _your_ cookie. We're protected by `sameSite: 'lax'` (the cookie isn't attached
  to such cross-site requests) plus the API only accepting JSON bodies (`express.json()`), which a plain
  HTML form on another site can't send. So we don't need CSRF tokens.
- **Request size limit**: `express.json({ limit: '100kb' })` so nobody can send huge bodies.
- **Secrets** live in `.env` locally (git-ignored) and in Render's environment settings in production.
  `JWT_SECRET` must be long and random — generate it with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`, and use a **different**
  value in dev and prod.

---

## 7. Frontend (Angular)

### Routes

| Route | Page | Guard |
|---|---|---|
| `/login`, `/register` | auth forms | — |
| `/recipes` | list with tabs _My recipes_ / _Shared with me_ (`?scope=` in the URL) | authGuard |
| `/recipes/new` | create form | authGuard |
| `/recipes/:id` | detail + servings control | authGuard |
| `/recipes/:id/edit` | edit form (only reachable via button shown to owner) | authGuard |
| `''` | redirect to `/recipes` | |
| `**` | "not found" page | |

### Structure (`client/src/app/`)

```
core/
  auth.service.ts        current user as a signal; register/login/logout/me
  auth.guard.ts          redirects to /login if not logged in
  auth.interceptor.ts    on 401 → clear user, go to /login
  models.ts              shared TypeScript interfaces (User, Recipe, Ingredient)
features/
  auth/                  login.page.ts, register.page.ts
  recipes/
    recipes.service.ts   HTTP calls for recipes and shares
    recipe-list.page.ts
    recipe-detail.page.ts
    recipe-form.page.ts  used for both new and edit
    share-panel.ts       add/remove people on the detail page (owner only)
    scaling.ts           pure scaling function (+ scaling.spec.ts)
shared/
  quantity.pipe.ts       formats 0.5 → "½", 1.333… → "1⅓", 2.25 → "2¼"
```

### Angular concepts used

- **Standalone components** — components that declare their own imports, no `NgModule`. Default in current
  Angular.
- **Signals** — a value that Angular tracks. When it changes, everything that reads it updates
  automatically.
  - `signal(x)` creates one, `.set()`/`.update()` change it, calling it `count()` reads it.
  - `computed(() => …)` creates a read-only signal derived from others, recalculated when they change.
- **Reactive forms with `FormArray`** — a `FormArray` is a list of form controls whose length can change.
  Ingredients and steps are `FormArray`s, so the user can add, remove and reorder rows.
- **`AuthService`** holds `currentUser = signal<User | null>(null)`. On app start, `GET /api/auth/me`
  decides whether you're logged in (the app can't read the httpOnly cookie itself — it has to ask the
  server). Use `provideAppInitializer` so this check finishes before routing starts; otherwise a page
  refresh could briefly bounce you to `/login`.
- **Functional route guard** (`CanActivateFn`) — a function the router calls before entering a route;
  returning a `UrlTree` for `/login` redirects there.
- **Functional HTTP interceptor** (`HttpInterceptorFn`) — a function that sees every `HttpClient` request
  and response. Ours watches for 401 responses.

### Servings scaling (view-only)

On the detail page:

```
chosenServings    = signal(recipe.servings)
scaledIngredients = computed(() => scaleIngredients(recipe.ingredients, recipe.servings, chosenServings()))
```

`scaleIngredients(ingredients, baseServings, targetServings)` is a **pure function** in `scaling.ts`: it
gets everything it needs as arguments, returns a new array, changes nothing else, and has no Angular or HTTP
in it. Rules:

- factor = `targetServings / baseServings`; each `quantity` is multiplied by it.
- Ingredients with no `quantity` are returned unchanged.
- Units are never converted (750 g stays grams).
- `targetServings` must be an integer ≥ 1 (the input enforces this; the function also guards it).

Rounding and fractions are the job of `QuantityPipe` (display), not of the scaling function (math). Keeping
them separate means each is simple to test. Nothing is saved; reloading the page resets to the stored
servings. Shared-with users can scale too.

### Styling

Plain CSS/SCSS per component plus a small global stylesheet. No component library in v1.

---

## 8. Error handling and testing

### Server errors

**Express 5** automatically forwards errors thrown in `async` route handlers (and rejected promises) to
the error-handling middleware, so no `try/catch` boilerplate is needed in routes.

`AppError` is a tiny class extending `Error` that also carries an HTTP status:
`throw new AppError(404, 'Recipe not found')`.

One **error-handling middleware** (the one with four parameters, `(err, req, res, next)`, registered last)
turns any error into `{ "error": { "message": "...", "details": ... } }`:

| Cause | Status |
|---|---|
| zod validation failure (from `validate` middleware) | 400, `details` = field → messages |
| `AppError` | its status |
| Mongoose `CastError` (e.g. `/recipes/abc` — not a valid ObjectId) | 404 |
| MongoDB duplicate key, `err.code === 11000` | 409 |
| JSON body that can't be parsed | 400 |
| anything else | 500, message "Something went wrong"; full error logged with `console.error` |

Never send stack traces or internal messages to the client in production.

### Client errors

- Interceptor: 401 → clear user → `/login`.
- Forms: show 400 `details` next to the matching fields; show 409 ("email already registered") on register.
- Anything else: a simple error message on the page.

### Testing

- **Vitest** — a test runner: finds `*.test.ts` / `*.spec.ts` files, runs them, reports pass/fail. API
  is `describe` / `it` / `expect`, same style as Jest/Jasmine.
- **supertest** — lets a test send HTTP requests straight to your Express `app` object without opening a
  port: `await request(app).get('/api/recipes/123').set('Cookie', cookie).expect(404)`.
- **mongodb-memory-server** — downloads and starts a real but temporary MongoDB that lives in memory. Tests
  connect Mongoose to it, and it's deleted afterwards. Your Atlas databases are never touched.

**Server tests (integration tests)** — each test runs a real request through routes, middleware, Mongoose
and the in-memory database. Database collections are emptied between tests so tests don't affect each
other. Priority list:

1. Auth: register, duplicate email → 409, login wrong password → 401, `me` with/without cookie.
2. **Access rules** — the most important tests in the project:
   - stranger: GET/PATCH/DELETE someone else's recipe → 404
   - shared-with user: GET → 200; PATCH/DELETE/share → 404
   - `owner` in a POST body is ignored
   - `scope=shared` lists only recipes shared with me
   - no cookie → 401 on every protected route
3. Validation: bad bodies → 400 with field details.

**Client tests** — use the test setup the Angular CLI generates (current Angular CLI versions generate
Vitest-based unit tests). Start with `scaling.ts` and `QuantityPipe` (pure, easy, valuable), then a test or
two for components if you want to learn component testing.

### Git and CI

- `main` must always be deployable. Work on short-lived branches (`feat/auth`, `feat/sharing`), merge
  through a pull request on GitHub, even solo — the PR diff is where you review your own work.
- **CI (Continuous Integration)** — a service that runs checks automatically on every push. We use
  **GitHub Actions**: a YAML file in `.github/workflows/ci.yml` tells GitHub to start a fresh Linux
  machine, check out the repo, and run:
  1. `npm ci` — clean install of the exact versions in `package-lock.json`
  2. `npm run lint`
  3. `npm run format:check`
  4. `npm test`
  5. `npm run build`

  A red ✗ or green ✓ appears next to each commit and PR.

---

## 9. Environments and deployment

| | Runs on | Database | Secrets from |
|---|---|---|---|
| development | your laptop | Atlas, database `sanjis-dev` | `server/.env` (git-ignored) |
| test | laptop + GitHub Actions | mongodb-memory-server | test setup code |
| production | Render | Atlas, database `sanjis-prod` | Render environment settings |

### The services

- **MongoDB Atlas** — MongoDB's own hosted database service. Its **Free cluster** (formerly called M0) is
  free forever, with about 512 MB of storage (plenty for text recipes) — check the current figure on the
  [Atlas free cluster limits page](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).
  One cluster can hold several databases; the database name is the part of the connection string after
  the host, e.g. `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/sanjis-dev`.
- **Render** — a hosting service that builds your code from GitHub and runs it. Free **Web Service**
  limits ([docs](https://render.com/docs/free)):
  - spins down after **15 minutes** without traffic; the next request waits **about a minute** while it
    starts again (the browser shows a loading page)
  - 750 free instance hours per month (sleeping doesn't count — one small app never runs out)
  - the filesystem is temporary: files written to disk disappear on restart/redeploy (that's why photos
    in v2 must go to an external service)

### Local development

`npm run dev` at the root starts both:

- server: `tsx watch --env-file=.env src/server.ts` on port 3000
- client: `ng serve` on port 4200, with `proxy.conf.json` forwarding `/api` → `http://localhost:3000`

> **Dev proxy**: you open `http://localhost:4200`. When Angular calls `/api/recipes`, the Angular dev
> server forwards it to Express on 3000 and passes the answer back. To the browser it's all one origin —
> same as production — so cookies work identically and no CORS is needed. (Running two processes from one
> command needs a small helper such as the `concurrently` package.)

### Production build and serving

`npm run build`:

1. client: `ng build` → static files in `client/dist/<app-name>/browser/`
2. server: `tsc` → JavaScript in `server/dist/`

`npm start` → `node server/dist/server.js`. In production, `app.ts` additionally:

- `app.set('trust proxy', 1)` — see below
- serves the Angular files with `express.static(<client dist folder>)`
- for any `GET` that isn't `/api/...` and isn't a real file, sends `index.html`
  (careful: Express 5 changed wildcard route syntax — a bare `'*'` path no longer works; check the Express 5
  migration guide for the catch-all syntax, or use a final `app.use(...)` middleware that checks `req.method`)

> **Why the `index.html` fallback?** Angular is a **single-page application (SPA)**: there's only one
> real HTML file, and the Angular router decides what to show based on the URL. If you refresh the browser
> on `/recipes/123`, the request goes to Express, and there is no file called `recipes/123`. The fallback
> sends `index.html`, Angular boots, reads the URL, and shows the right page.

> **Why `trust proxy`?** On Render, the browser talks to Render's **proxy** (a front server that handles
> HTTPS), which forwards the request to your Express app over plain HTTP. Without `trust proxy`, Express
> thinks every request comes from the proxy's IP over HTTP: the rate limiter would lump all users into one
> IP, and `req.secure` would be false. `trust proxy` tells Express to read the real client IP and protocol
> from the headers the proxy adds.

The server must listen on `process.env.PORT` — Render chooses the port.

### One-time setup

**Atlas**

1. Create a free cluster.
2. Create a database user with a long random password, with the role "read and write to any database"
   (or restricted to the `sanjis-*` databases).
3. Network Access: allow `0.0.0.0/0` (any IP). Render's free plan has no fixed outgoing IP address, so we
   can't whitelist one. Security rests on the strong database password.
4. Copy the connection string; make two versions, ending in `/sanjis-dev` and `/sanjis-prod`.

**Render**

1. Push the repo to GitHub.
2. New → **Web Service** → connect the GitHub repo. Runtime: Node.
   - Build command: `npm ci --include=dev && npm run build` — because `NODE_ENV=production` is set,
     a plain `npm ci` would skip devDependencies, and the build needs them (TypeScript, Angular CLI)
   - Start command: `npm start`
   - Instance type: Free
3. Environment variables: `NODE_ENV=production`, `MONGODB_URI=<prod string>`, `JWT_SECRET=<new random>`.
   Don't set `PORT` — Render does.
4. Settings → **Auto-Deploy: "After CI Checks Pass"**. Render then deploys a push to `main` only after
   every GitHub Actions check on that commit has passed ([docs](https://render.com/docs/deploys)).
5. Your app is live at `https://<service-name>.onrender.com`, with HTTPS included.

Pin the Node version (`.nvmrc` and `"engines": { "node": "…" }` in the root `package.json`) so Render,
CI and your laptop all use the same Node.

---

## 10. Milestones

Deploy a tiny app first, then grow it. Each milestone ends with: tests and lint green, merged to `main`,
deployed.

| # | Milestone | Build | Learn |
|---|---|---|---|
| 0 | **Setup** | git repo, root `package.json` with workspaces, Prettier + ESLint config, `ng new` client, Express + TypeScript server with `GET /api/health` → `{ ok: true }`, `npm run dev` with the proxy, `.env.example` | how the monorepo and tooling fit together |
| 1 | **Walking skeleton, deployed** | production build, Express serving Angular + SPA fallback, `config.ts`, Mongoose connection, Atlas, Render, GitHub Actions CI, first test (health endpoint with supertest) | deployment, environment variables, CI |
| 2 | **Auth** | User model, register/login/logout/me, `requireAuth`, `validate`, error handler, helmet, rate limiting, auth tests; login/register pages, `AuthService`, guard, interceptor, app initializer | hashing, JWT, cookies, middleware, protected routes |
| 3 | **Recipes (owner only)** | Recipe model, list(mine)/get/create/update/delete, access-rule tests; list, detail and form pages | data modeling, validation, permission-in-query, `FormArray` |
| 4 | **Servings scaling** | `scaling.ts` + `QuantityPipe` with unit tests; servings control on the detail page | signals, `computed`, pure functions, client testing |
| 5 | **Sharing** | share/unshare endpoints, `scope=shared`, `isOwner`, sharing tests; share panel, "Shared with me" tab, read-only detail view | multi-user relationships, read-only permissions |
| 6 | **Polish** | husky + lint-staged, loading/empty/error states, README | team-style workflow |

A **walking skeleton** is the thinnest version of the app that goes through every layer
(Angular → Express → MongoDB → hosting) and is actually deployed. From then on, every feature lands in
something that already works end to end.

### v2 and later

- **v2 — Photos**: one cover photo per recipe, uploaded to Cloudinary (an image hosting service); MongoDB
  stores only the image URL. Gets its own design when we get there.
- Later ideas: copy a shared recipe into your own collection, password reset by email, edit permission for
  shared users, unit conversion.

---

## 11. Library summary

| Package | Where | What it's for |
|---|---|---|
| `express` (v5) | server | HTTP server and routing |
| `mongoose` | server | MongoDB models and queries |
| `zod` | server | validate request bodies and env vars at runtime |
| `argon2` | server | hash and verify passwords |
| `jsonwebtoken` | server | create and verify login tokens |
| `cookie-parser` | server | read cookies into `req.cookies` |
| `helmet` | server | security response headers |
| `express-rate-limit` | server | limit login/register attempts |
| `typescript`, `tsx`, `@types/*` | server (dev) | compile / run TypeScript |
| `vitest`, `supertest`, `mongodb-memory-server` | server (dev) | testing |
| `@angular/*` | client | the frontend |
| `prettier` | root (dev) | formatting |
| `eslint`, `typescript-eslint`, `angular-eslint`, `eslint-config-prettier` | root/client (dev) | linting |
| `concurrently` | root (dev) | run client + server with one command |
| `husky`, `lint-staged` | root (dev) | pre-commit checks (milestone 6) |
