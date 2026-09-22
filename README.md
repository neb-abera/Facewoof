[![checks](https://github.com/neb-abera/Facewoof/actions/workflows/checks.yml/badge.svg?branch=main)](https://github.com/neb-abera/Facewoof/actions/workflows/checks.yml)
[![CodeQL](https://github.com/neb-abera/Facewoof/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/neb-abera/Facewoof/security/code-scanning)
[![codecov](https://codecov.io/gh/neb-abera/Facewoof/graph/badge.svg)](https://codecov.io/gh/neb-abera/Facewoof)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/neb-abera/Facewoof/badge)](https://scorecard.dev/viewer/?uri=github.com/neb-abera/Facewoof)

# Facewoof

Dog owners meet the dogs around them: swipe through nearby profiles, turn
matches into a pack, put a playdate on a shared calendar.

Facewoof started as a team project, renamed Diggr partway through the course.
This is the original name restored, with what it takes to run and deploy it:
a reconstructed schema, migrations, session authentication, rate limiting,
browser tests and a pipeline to Azure.

**[Try the demo](https://facewoof.abera.tech)**. No sign-up.

<p align="center">
  <img src="docs/media/demo.gif" width="900" alt="Starting the demo, swiping through nearby dogs, matching, and visiting the profile, calendar and pack feed" />
</p>
<p align="center"><sub>The demo, start to finish. <a href="docs/media/demo.mp4">Full-quality clip</a>.</sub></p>

| Discover | Match |
| --- | --- |
| ![The discover feed: a card for a nearby dog with photos, breed, age, distance and interests, and Pass and Woof buttons](docs/media/discover.png) | ![A match: both dogs' photos with Keep searching and Add to Pack](docs/media/match.png) |

| Profile | Calendar |
| --- | --- |
| ![A dog's profile: photo, breed, age, location, vaccination badge, playdate facts and the friends list](docs/media/profile.png) | ![The shared playdate calendar in week view, with a playdate just added and the Add Playdate button](docs/media/calendar.png) |

| Pack feed | Landing page |
| --- | --- |
| ![The pack feed: posts from every pack, with the packs and upcoming playdates in a sidebar](docs/media/packfeed.png) | ![The landing page: a dog on a beach, the three features, and the Try the demo button](docs/media/landing.png) |

<p align="center">
  <img src="docs/media/discover-phone.png" width="300" alt="The discover feed at phone width: the demo notice, the search bar, and one card with the Pass and Woof buttons at its foot" />
</p>

`make media` captures every image above from the current app
(`scripts/media/capture.spec.ts` walks the demo in the browser image the tests
use, and ffmpeg makes the clip).

## Running it

Docker is the only requirement.

```
make            # list every target
make ports      # this checkout's host ports, image name and compose network
make dev        # database, API and hot reloading client (client on http://localhost:3000)
make migrate    # apply pending database migrations
make reset-db   # throw the database away and rebuild it from the migrations
make psql       # a psql shell against the development database
make lint       # biome lint and format check, against your working tree
make fmt        # rewrite files to match biome
make prose      # the writing rules (.vale/styles/Abera) over every Markdown file
make test-unit  # unit tests with coverage, hermetically, the way CI runs them
make image      # build the production image the deploy pipeline builds
make run        # build and run the production image (on http://localhost:8080)
make e2e        # browser tests against a running instance
make media      # regenerate the README's screenshots and demo clip
make clean      # stop this checkout's containers and delete its database volume
```

`make dev` brings up three containers: `db` (postgres, the version
`compose.yaml` pins, which is also what production runs), `api` (express, in
watch mode) and `web` (the vite dev server). The client and server are bind
mounted, so edits on the host reload in the container.

The ports above are the main checkout's. Every other working copy (a git
worktree, a second clone) gets its own, derived from its directory name and
written to `.env` the first time `make` runs. Image tags, container names and
the compose project derive from the directory the same way. `make ports`
prints what this copy uses.

The database is brought up to date by `server/db/migrate.ts`, which the API
runs at start-up and `make migrate` runs on demand. `make reset-db` starts over.

## How it fits together

| Piece                   | What it is                                                                        |
| ----------------------- | --------------------------------------------------------------------------------- |
| `src/`                  | the React client, built by vite                                                   |
| `server/routes.ts`      | the route table: every HTTP endpoint, all under `/api`                            |
| `server/controllers/`   | the routes themselves: schemas in, handler, schemas out                           |
| `docs/THREAT-MODEL.md`  | the assets, the entry points and every threat with the gate that answers it       |
| `tests/unit/*.property.test.ts` | fast-check over the parsers that read a stranger's text                   |
| `server/api/`           | the machinery: Zod schemas, the Express adapter, the OpenAPI generator            |
| `server/openapi.json`   | the API contract, generated from the route table (`make contract`)                |
| `src/api-types.d.ts`    | the client's types, generated from the contract (`make contract`)                 |
| `tools/api-types/`      | openapi-typescript and the TypeScript 5 it needs, in a manifest of their own      |
| `server/db/`            | the queries, one module per feature                                               |
| `server/db/rows.ts`     | the tables as TypeScript, generated from the schema (`make rows`)                 |
| `server/db/migrations/` | the schema and the demo roster, applied in order by `server/db/migrate.ts`        |
| `tests/unit/`           | vitest, for the decisions inside the server                                       |
| `tests/e2e/`            | Playwright, against the production image                                          |

In development the client is served by vite and proxies `/api` to the API
container. In production a single container serves both: express serves the
built bundle and the API on one port, so nothing is cross-origin.

### The API contract

Every endpoint is one entry in `server/routes.ts`: its method and path,
whether it needs a signed-in user, its rate limiter, a Zod schema for the
request body and query string, and a Zod schema for every status it can
answer with. Requests are parsed against those schemas before a handler runs
(a mismatch is a 400 that names the field), and replies are checked against
them on the way out (a mismatch is a 500 in the log). Every error body is the same shape: `{ "error": "..." }`, with
`issues` when a request failed to parse.

The same table generates `server/openapi.json`, and openapi-typescript turns
that into `src/api-types.d.ts` for the client. Both are committed, and
`scripts/check-contract.sh` fails CI if either is not what the code
produces, so a schema change reaches the client as a compile error rather
than a runtime one. After changing a schema:

```bash
make contract
```

### The database

`server/db/rows.ts` is generated from the live schema by
`server/db/generate-rows.ts` (`make rows`) and committed, so every query is
typed against the real columns without needing a database to typecheck. The
CI smoke job regenerates it against the migrated database and fails on any
difference, so a migration that renames or retypes a column fails the build
until the types, and the queries they check, catch up.

The original database was never committed: no schema, no migrations, only
the queries that read it. `server/db/migrations/0001_schema.sql` is
reconstructed from those queries, so the column names and types are what the
application expects. Later migrations add provider sign-in,
onboarding and the playdate profile fields.

Nine tables: `users`, `profile_photos`, `friends`, `pending_relationships`,
`packs`, `pack_users`, `playdates`, `posts`, `external_identities`.

The demo roster (`0002_demo_roster.sql`) is generated. It rebuilds from `server/controllers/users.json`, the fixture the original team
left behind, and adds packs, posts and playdates so every screen has something
on it. Regenerate it with:

```bash
python3 server/db/migrations/generate-roster.py
```

It is deterministic: regenerating without changing the generator produces an
identical file, and CI asserts that it does.

### Demo accounts

`POST /api/auth/guest` creates a throwaway account cloned from a seeded
template, and the landing page's "Try the demo" button calls it.

Each visitor gets their own account. With a shared one, the first few
visitors would empty the discover feed for everyone after them, and one
visitor's pack posts would show up for the next. Guests are not discoverable, so they never appear in
anyone else's feed either. The server sweeps guests older than
`GUEST_TTL_HOURS` (24 by default) once an hour, and `ON DELETE CASCADE` takes
their photos, swipes, posts and playdates with them.

Guest accounts are not real authentication. The API does not yet enforce who
you are: any `userId` may be passed to any endpoint. Acceptable for a demo
over seeded data, and the next thing to fix.

## Configuration

Copy `.env.example` to `.env`. Every value has a working default, so `make dev`
needs no `.env` at all.

| Variable                                | What it does                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                          | the database. Set by compose locally. The only one that matters in production                             |
| `PGHOST` etc.                           | used instead of `DATABASE_URL` when it is not set                                                         |
| `PGSSL`                                 | `true` for Azure Database for PostgreSQL, which requires TLS                                              |
| `MIGRATE_ON_BOOT`                       | `false` when migrations run separately and the server's database role has no DDL (docs/DEPLOY.md)         |
| `PORT`                                  | what the server listens on (8080 in the production image)                                                 |
| `BASE_PATH`                             | mount the whole app under a path, e.g. `/facewoof`                                                        |
| `GUEST_TTL_HOURS`                       | how long a demo account lives                                                                             |
| `CORS_ORIGIN`                           | comma separated. Unset means no cross-origin requests are allowed                                         |
| `VITE_BASE_PATH`                        | build time. Must match `BASE_PATH`                                                                        |
| `TRUST_PROXY_HOPS`                      | reverse proxies in front of the server, for the rate limits' client address. 2 behind Cloudflare + ingress |
| `CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET` | signed photo uploads (docs/DEPLOY.md). Optional                                                |
| `VITE_CLOUD_NAME`, `VITE_UPLOAD_PRESET` | build time. Cloudinary's unsigned preset, the fallback when uploads are not signed. Optional              |
| `ENTRA_ISSUER` etc.                     | sign-in through Entra External ID. Optional: see below                                                    |

### Sign-in

Anyone can use Facewoof through a demo account without signing in, and that is
the default. Configuring the four variables below adds Google and Microsoft
sign-in on top. With any of them missing the buttons do not appear and nothing
else changes.

| Variable              | What it does                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `ENTRA_ISSUER`        | `https://<tenant>.ciamlogin.com/<tenant-id>/v2.0`                                               |
| `ENTRA_CLIENT_ID`     | the app registration's application (client) ID                                                  |
| `ENTRA_CLIENT_SECRET` | a client secret from that registration                                                          |
| `ENTRA_REDIRECT_URI`  | `https://<host>/api/auth/oidc/callback`, registered as a redirect URI                           |
| `ENTRA_PROVIDERS`     | which sign-in buttons to show, e.g. `email,google`. Each may carry `:hint`. Defaults to `email` |

Entra External ID is the front door. The social providers are configured
inside that tenant. The app talks OIDC to one issuer and never holds Google's
credentials, so adding a provider is a change in the tenant plus one name in
`ENTRA_PROVIDERS`.

Each entry may carry a domain hint (`google:accounts.google.com`), which
sends someone straight to that provider instead of Entra's own chooser. The defaults suit a provider created through the Graph API, which is
addressed by its issuer domain. Entra's _built-in_ providers answer to the bare
words `google`, `facebook` and `apple` instead, so a tenant configured through
the portal may need the override. A wrong hint fails with `AADSTS90023`.

`ENTRA_PROVIDERS` exists so the page only offers what the tenant can do. Email needs no federation and works as soon as a tenant exists;
`google`, `facebook` and `apple` each need setting up at the provider first,
and listing one before that is done gives you a button that dead-ends.

A personal Microsoft account is **not** one of External ID's providers. It
federates Facebook, Google, Apple, custom OIDC and SAML. An organisation's
own Entra tenant can be added as a custom OIDC provider. That is
organisational sign-in, without consumer "sign in with Microsoft".

To set it up: create an External ID tenant, register an application with the
redirect URI above, create a sign-up and sign-in user flow and attach the app
to it. That alone gives you email sign-in. For Google, add it as an identity
provider and add it to the same user flow. The
[Microsoft walkthrough](https://learn.microsoft.com/entra/external-id/customers/how-to-google-federation-customers)
covers the Google side.

Signing in from a demo account claims that account. The swipes, packs and
playdates from the demo are kept, and the guest cleanup no longer sweeps it.

The sign-in flow is covered by tests that run against a mock provider in
`tests/oidc-mock`, so no Azure credentials are needed to work on it:

```bash
make e2e-signin
```

## Deploying

Facewoof runs on Azure Container Apps at
[facewoof.abera.tech](https://facewoof.abera.tech), deployed by
`.github/workflows/deploy.yml` on every push to `main` whose checks pass. The
one-time Azure and DNS setup is in [docs/DEPLOY.md](docs/DEPLOY.md).

The production image serves the client and the API on port 8080 and runs as a
non-root user. `/healthz` checks the database and is what the platform polls.
Migrations run at start-up behind an advisory lock, so several replicas
starting at once on a deploy is safe.

At the root of its own host:

```bash
docker build --target final -t facewoof .
docker run -p 8080:8080 -e DATABASE_URL=... facewoof
```

Under a path on another host, e.g. `abera.tech/facewoof`. The prefix has to be
baked into the client bundle, because vite rewrites asset URLs at build time:

```bash
docker build --target final --build-arg VITE_BASE_PATH=/facewoof/ -t facewoof .
docker run -p 8080:8080 -e DATABASE_URL=... -e BASE_PATH=/facewoof facewoof
```

`BASE_PATH` is only needed when the reverse proxy forwards the prefix
untouched. If it strips the prefix before forwarding, leave `BASE_PATH` unset
and build with `VITE_BASE_PATH` alone.

## What the revival changed

The app had not been run in some time and did not start. The larger items:

- **The client could not build.** Two components called `require('dotenv')` and
  used `__dirname` in browser code, and read `process.env.VITE_*`, which vite
  does not substitute. They use `import.meta.env` now.
- **There was no database and no schema.** Both are reconstructed above.
- **There was no authentication.** Okta had been removed in the last three
  commits and nothing replaced it: the login page fired a request for one
  hard coded account from its render body, so it looped forever and signed
  everyone in as the same person.
- **Every query was built by string interpolation**, so the API was injectable
  through any parameter. All of them are parameterised.
- **Two paid API keys were required to start**: zipcodeapi.com for the radius
  search and Google Geocoding for the location box. The `zipcodes` package
  carries the US zip code table locally and answers both offline.
- **The API hard coded `http://localhost:3001`** in six components, so a build
  only ever talked to a developer's own machine. Requests are relative now.
- Dependencies were about three years stale. React Router moved 5 to 7, vite
  4 to 6, express 4 to 5, and tailwind is a build step instead of the CDN
  script, which is not meant for production.

Smaller fixes are noted in comments where they were made, next to the code that
had the problem.

## License

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). See
[LICENSE](LICENSE) and keep the [NOTICE](NOTICE) attribution with any copies.
The license covers Nebyou Abera's contributions and the project from the
revival onward. The original Diggr team project was built with Louise Ly,
Gabe Bennett-Brandt, Claire Tunakan and Mantaqaa Oheen, whose work remains
credited in the git history.
