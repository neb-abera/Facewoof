# Contributing

Thanks for wanting to improve Facewoof. Everything here builds and runs in
containers: the only tools you need on your machine are Docker and git.

## Getting started

```bash
git clone https://github.com/neb-abera/Facewoof.git
cd Facewoof
make dev        # database, API and hot-reloading client on http://localhost:3000
```

`make` on its own lists every target. Every copy of the repository — the main
checkout, a git worktree, a second clone — gets its own host ports, image tag
and compose project, derived from its directory name, so several can run side
by side. `make ports` prints yours. The ones you will use most:

| Target           | What it does                                                    |
| ---------------- | --------------------------------------------------------------- |
| `make ports`     | This checkout's host ports, image name and compose network      |
| `make dev`       | Database, API and hot-reloading client (`make ports` says where)|
| `make check`     | The lint/format gate CI runs (biome, in-container)              |
| `make test-unit` | Unit tests with coverage, hermetically, the way CI runs them    |
| `make fmt`       | Rewrite files to match biome                                    |
| `make run`       | Build and run the production image on http://localhost:8080     |
| `make e2e`       | Browser tests against a running instance                        |
| `make e2e-signin`| Sign-in tests against a mock OIDC provider (no Azure needed)    |
| `make migrate`   | Apply pending database migrations                               |
| `make clean`     | Stop the containers and delete the database volume              |

## Before you open a pull request

Run the same gates CI runs:

```bash
make check
make test-unit
```

Add tests with your change — unit tests for server behavior
(`tests/unit/`), Playwright tests for anything a browser can see
(`tests/e2e/`). Unit test coverage is enforced with thresholds in
`vite.config.ts`, and `npm run typecheck` (part of `make check`) has to pass.

Changing an endpoint means changing its entry in `server/routes.ts` (the
schemas live in `server/api/schemas.ts`), then regenerating the contract and
the client types and committing both:

```bash
npm run openapi && npm run generate:api-types
```

`make check` runs `scripts/check-contract.sh`, which fails if either file is
stale.

## What CI requires

Every pull request must pass these required status checks before it can
merge (branch protection is strict: the branch must also be up to date with
`main`):

- `lint and format`
- `production image`
- `smoke test against postgres`
- `lint (actionlint + shellcheck)`
- `analyze (javascript-typescript)`
- `analyze (actions)`
- `container scan (trivy)`
- `dependency review`

The committed list lives in `.github/required-contexts.txt`, and
`scripts/check-required-contexts.sh` asserts in CI that it still matches the
workflows — if you rename a job in a PR-gating workflow, update that file
(and branch protection) in the same change.

Merges are **squash-only** (linear history is required), commits must be
signed, and review conversations — including bot code-scanning threads —
must be resolved before merge.

## The Playwright version

`@playwright/test` in `package.json` is pinned to an **exact version**, and
`scripts/e2e.sh` runs the suite in Playwright's own image at that same
version — the image ships the browsers, the package drives them, and a
mismatch means testing against the wrong browser build. There is no second
pin to keep in step: Dependabot bumps the package and the image follows.
Keep the version exact (no caret); the script refuses a range.

## Conventions

- No CLA — contributions are accepted under the repository's
  [Apache-2.0 license](LICENSE).
- Never use `[skip ci]`; every commit that lands runs the full gate.
- Formatting is biome's opinion, not yours or ours: `make fmt` settles it.
- Security issues go through [SECURITY.md](SECURITY.md), not the issue
  tracker.
