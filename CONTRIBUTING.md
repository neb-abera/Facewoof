# Contributing

Everything here builds and runs in containers: the only tools you need on
your machine are Docker and git.

## Getting started

```bash
git clone https://github.com/neb-abera/Facewoof.git
cd Facewoof
make dev        # database, API and hot-reloading client on http://localhost:3000
```

`make` on its own lists every target. Every copy of the repository (the main
checkout, a git worktree, a second clone) gets its own host ports, image tag
and compose project, derived from its directory name, so several can run side
by side. `make ports` prints yours. The ones you will use most:

| Target           | What it does                                                    |
| ---------------- | --------------------------------------------------------------- |
| `make ports`     | This checkout's host ports, image name and compose network      |
| `make dev`       | Database, API and hot-reloading client (`make ports` says where)|
| `make check`     | The lint/format gate CI runs (biome, in-container)              |
| `make test-unit` | Unit and component tests with coverage, the way CI runs them    |
| `make test-db`   | Tests that need a real Postgres, against this copy's database   |
| `make budget`    | Fail if the production bundle outgrew `bundle-budget.json`      |
| `make fmt`       | Rewrite files to match biome                                    |
| `make run`       | Build and run the production image on http://localhost:8080     |
| `make e2e`       | Browser tests against a running instance                        |
| `make e2e-signin`| Sign-in tests against a mock OIDC provider (no Azure needed)    |
| `make migrate`   | Apply pending database migrations                               |
| `make check-db-roles` | The app as a no-DDL database role, end to end (a CI gate)  |
| `make clean`     | Stop the containers and delete the database volume              |

## Before you open a pull request

Run the same gates CI runs:

```bash
make check
make test-unit
```

Add tests with your change: unit tests for server behavior
(`tests/unit/`), tests of what a query does against a real Postgres
(`tests/db/`, run by `make test-db` and CI's smoke job), component tests for client logic (`tests/client/`, in
jsdom with a fake fetch), Playwright tests for anything a browser can see
(`tests/e2e/`). Unit test coverage is enforced with thresholds in
`vite.config.ts`, and `npm run typecheck` (part of `make check`) has to pass.

Changing an endpoint means changing its entry in `server/routes.ts` (the
schemas live in `server/api/schemas.ts`), then regenerating the contract and
the client types and committing both:

```bash
make contract
```

`make check` runs `scripts/check-contract.sh`, which fails if either file is
stale.

`make check` also runs `scripts/check-held-majors.sh`, which fails when a
dependency's next major cannot install beside the rest of its manifest.
Dependabot only opens a pull request for a bump that installs, so without it
such a pin ages with nothing red. The fix is a manifest of its own for the
package (see `tools/api-types/`). A case you accept goes in `.held-majors`
with its reason, and the check tells you when that entry can be dropped.

`scripts/check-lts-majors.sh` fails when `.github/dependabot.yml` would let
a Node major that is not LTS reach the node image or `@types/node`. Every
Dependabot pull request merges itself on green CI, so the ignore ranges are
the only hold. When a major turns LTS the check names the range to remove.

Adding a migration means regenerating the row types and committing them:

```bash
make rows
```

CI's smoke job runs `scripts/check-rows.sh` (`make check-rows` locally),
which fails if `server/db/rows.ts` is not what the schema generates.

## The bundle budget

CI's `production image` job runs `scripts/check-bundle-budget.sh`
(`make budget` locally): the gzip size of what a first visit downloads (the
entry script, the entry stylesheet, and the first load as a whole) must stay
within `bundle-budget.json`. The numbers are bytes, so the check gives the
same answer on every machine.

When it fails, it names the files that are over. Look for what grew first: a
new dependency imported from the entry chunk rather than from the route that
uses it is the usual cause, and a lazy `import()` is the usual fix. If the
growth is what you meant, raise the budget deliberately: run `make budget`,
set the budget in `bundle-budget.json` to about 10% above the size it
prints, update the measured sizes and date in that file's note, and say why
in the pull request. Raise only the budget that failed.

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

The committed list lives in `.github/required-checks`, and
`scripts/check-required-contexts.sh` asserts in CI that it still matches the
workflows, in both directions. If you rename a job in a PR-gating workflow, update that file
(and branch protection) in the same change.

Merges are **squash-only** (linear history is required), commits must be
signed, and review conversations (including bot code-scanning threads)
must be resolved before merge.

## The Playwright version

`@playwright/test` in `package.json` is pinned to an **exact version**, and
`scripts/e2e.sh` runs the suite in Playwright's own image at that same
version. The image ships the browsers, the package drives them, and a
mismatch means testing against the wrong browser build. There is no second
pin to keep in step: Dependabot bumps the package and the image follows.
Keep the version exact (no caret). The script refuses a range.

## Conventions

- No CLA. Contributions are accepted under the repository's
  [Apache-2.0 license](LICENSE).
- Never use `[skip ci]`. Every commit that lands runs the full gate.
- Formatting is biome's opinion. `make fmt` settles it.
- Security issues go through [SECURITY.md](SECURITY.md). Do not open them in
  the issue tracker.
