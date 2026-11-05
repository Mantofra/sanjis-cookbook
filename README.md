# Sanji's Cookbook

A multi-user recipe app. Sign up, write down your recipes, scale them to any number of servings, and share
them read-only with other users by email.

**Live:** https://sanjis-cookbook.onrender.com

> The free Render instance sleeps when idle, so the first request after a while can take ~30 seconds.

## Stack

- **Client:** Angular (standalone components, signals, reactive forms)
- **Server:** Express 5 + TypeScript (ESM), Mongoose, zod, argon2, JWT in an `httpOnly` cookie
- **Database:** MongoDB Atlas
- **Hosting:** Render (one web service: Express serves the API and the built Angular app)
- **Tooling:** npm workspaces, Vitest + supertest, ESLint, Prettier, husky + lint-staged, GitHub Actions

## Run locally

Requirements: Node **26** (see `.nvmrc`) and a MongoDB connection string (a free Atlas cluster works).

```sh
# 1. Environment variables for the server
cp server/.env.example server/.env
#    then edit server/.env:
#    MONGODB_URI  connection string to your dev database (e.g. .../sanjis-dev)
#    JWT_SECRET   any long random string

# 2. Install everything (both workspaces; also installs the git pre-commit hook)
npm install

# 3. Start client + server together
npm run dev
```

- App: http://localhost:4200 — the Angular dev server proxies `/api/*` to the server
- API: http://localhost:3000/api (health check: `/api/health`)

## Scripts

Run from the repo root.

| Script                 | What it does                                               |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Server (watch mode) and Angular dev server, together       |
| `npm test`             | Server tests (Vitest) and client tests                     |
| `npm run lint`         | ESLint over the whole repo                                 |
| `npm run format`       | Format everything with Prettier                            |
| `npm run format:check` | Check formatting without changing files (used in CI)       |
| `npm run build`        | Build the Angular client, then compile the server          |
| `npm start`            | Run the compiled server (`server/dist`) — what Render runs |

Every commit runs Prettier and ESLint on the staged files (husky + lint-staged); lint errors block the
commit.

## Project layout

```
client/   Angular app
server/   Express API (src/modules/auth, src/modules/recipes, …)
docs/     Design spec and learner's guide
```

## Deployment

1. Push or merge to `main`.
2. GitHub Actions (`.github/workflows/ci.yml`) runs `npm ci`, lint, format check, tests and build.
3. Render is set to **Auto-Deploy: After CI Checks Pass**, so it deploys only a green commit:
   - Build command: `npm ci --include=dev && npm run build`
   - Start command: `npm start`
4. In production (`NODE_ENV=production`) Express serves the Angular build from `client/dist` and falls back
   to `index.html` for any non-API route, so client and API share one origin.

Production environment variables are set in the Render dashboard, never committed: `NODE_ENV=production`,
`MONGODB_URI` (the prod database) and `JWT_SECRET`. Render sets `PORT` itself.
