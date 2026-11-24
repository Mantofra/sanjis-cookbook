# Milestone 8 — Italian interface

**You write all the code.** Same rules as the v1 guide (`docs/v1/learners-guide.md`): follow "How each task
works", and every v1 "Global constraint" still applies. Ask Claude to _"review task 8.2"_ when you're done or
stuck.

**Design:** `docs/v2/design.md`, Part B. Read it first, especially the **glossary**: every Italian word in
this milestone comes from there.

Branch: `feat/italian`.

## Global constraints (this milestone)

- Only **text the user can see** changes. Variable/function names, comments, API paths, JSON field names,
  commit messages and docs stay in English.
- Use the glossary words exactly; informal "tu"; short sentences.
- The error body shape doesn't change: `{ "error": { "message": string, "details"?: … } }`.
- The app name **"Sanji's Cookbook"** is not translated.

## Review focus

1. **A leftover English string** — a rarely seen state (empty "Condivise con me" tab, recipe not found,
   share with an unknown email, the delete confirm, the rate-limit message after many failed logins) still
   in English. [8.1, 8.3]
2. **Zod field errors** — register with a 3-character password → the message under the field is Italian,
   not "Too small: expected string to have >=8 characters". [8.1]
3. **Decimals** — a scaled quantity like 1.25 shows `1,25`; fractions still show `1¼`, never `1,25`. [8.2]
4. **Duplicate email** on register → an Italian 409 message (it comes from the generic `11000` branch of
   the error handler, not from an `AppError`). [8.1]

---

### Task 8.1: Server messages in Italian

**Files:** `server/src/app.ts`, `server/src/middleware/{error-handler,validate,require-auth}.ts`,
`server/src/modules/auth/{auth.service,auth.routes}.ts`,
`server/src/modules/recipes/{recipes.service,recipes.controller}.ts`; tests in `server/tests/`

**Concepts:** zod locales (`z.config`, `z.locales`), design Part B _Zod field messages_.

**Interfaces — produces:** these exact messages (the client shows them word for word):

| Today                              | Italian                                        |
| ---------------------------------- | ---------------------------------------------- |
| Not found                          | Non trovato                                    |
| Invalid JSON                       | JSON non valido                                |
| Already exists                     | Esiste già                                     |
| Something went wrong               | Qualcosa è andato storto                       |
| Invalid request                    | Richiesta non valida                           |
| Invalid query                      | Parametri non validi                           |
| Not authenticated                  | Non autenticato                                |
| Invalid email or password          | Email o password non validi                    |
| User not found                     | Utente non trovato                             |
| No user with that email            | Nessun utente con questa email                 |
| Recipe not found                   | Ricetta non trovata                            |
| Cannot share with owner            | Non puoi condividere una ricetta con te stesso |
| Too many attempts, try again later | Troppi tentativi, riprova più tardi            |

- [ ] Tests first: change every expected message in `errors.test.ts`, `auth.test.ts`, `sharing.test.ts`,
      `recipes.test.ts` to the Italian one (search the folder for `message` to find them all). Run
      `npm test -w server` → they fail.
- [ ] New test in `auth.test.ts`: register with `password: 'abc'` → 400, `error.message` is
      `'Richiesta non valida'` and `error.details.password[0]` is a string that does **not** contain
      `'Too small'` (don't pin zod's exact Italian wording — it can change between zod versions).
- [ ] New test in `auth.test.ts` (Review focus 4): register the same email twice → second is 409 with
      `'Esiste già'`.
- [ ] Replace every message in the table. In `app.ts`, call `z.config(z.locales.it())` once at module
      level (outside `createApp`), so it runs before any request and the tests get it too.
- [ ] Run `npm test -w server` → all green. `grep -rn "AppError(\|message:" server/src` shows no English.
- [ ] **Check yourself:** Why put `z.config` at module level in `app.ts` instead of in `server.ts`? What
      would the tests show if you put it in `server.ts`?
- [ ] Commit: `feat(server): italian error messages`

### Task 8.2: Shared client helpers in Italian

**Files:** `client/src/app/shared/error-message.ts` + `.spec.ts`,
`client/src/app/shared/quantity.pipe.ts` + `.spec.ts`

**Interfaces — consumes/produces:** `errorMessage(err: unknown): string` and `QuantityPipe` keep their
signatures; only the text changes.

- [ ] Tests first, in `error-message.spec.ts`: status 0 → `'Sei offline: serve una connessione.'`;
      the generic cases → `'Qualcosa è andato storto. Riprova.'`; server message case uses
      `'Ricetta non trovata'`.
- [ ] Tests first, in `quantity.pipe.spec.ts` (Review focus 3): `1.25` → `'1¼'` (fraction, unchanged);
      `1.4` → `'1,4'`; `0.15` → `'0,15'`; `2.5` → `'2½'`; `12.4` → `'12'`. Update any existing expectation
      that had a dot. Run `npm test -w client` → they fail.
- [ ] Change the two constants in `error-message.ts` and make the decimal branch of `QuantityPipe` use a
      comma.
- [ ] Run `npm test -w client` → green.
- [ ] Commit: `feat(client): italian error and quantity formatting`

### Task 8.3: Every page in Italian, then ship

**Files:** `client/src/index.html`, `client/public/manifest.webmanifest`, `client/src/app/app.html`,
every template under `client/src/app/features/`, `share-panel.ts`, `recipe-detail.page.ts` (the delete
`confirm`)

- [ ] `index.html`: `lang="it"`. Manifest: `description` → `"Le tue ricette, in cucina."`.
- [ ] Translate every visible string, page by page: header (`app.html`), login, register, list (both
      tabs and both empty states), detail (incl. not-found and the delete confirm), form (labels,
      placeholders, "facoltativo", validation messages, buttons), share panel. Glossary words exactly.
- [ ] **Verify (Review focus 1 & 2):** `npm start` and walk every state in Review focus 1, plus: form with
      every field empty and submitted, register with a short password, login with a wrong password, share
      with your own email. Nothing in English except "Sanji's Cookbook", "Email", "Password", "Tag".
- [ ] **Verify offline:** production build, open a recipe, DevTools → Offline, try to save → the Italian
      offline message.
- [ ] **Check yourself:** Why does `lang="it"` matter if every word is already Italian?
- [ ] Commit: `feat(client): italian interface`
- [ ] **Ship it:** lint/format/test/build, PR, CI green, merge, wait for Render. On the phone, the
      installed app shows Italian after two restarts (milestone 7's update behaviour). 🎉
