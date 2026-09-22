# Threat model

What Facewoof protects, who it protects it from, and which gate holds each
answer. The application STIG (V-222655) asks for one per release.
Reviewing it is part of every release, and a new entry point is a row here
before it is a feature.

## Assets

- People's profiles: name, dog, zip code, photos, and where they are when
  they search.
- Packs and their feeds, playdates and the shared calendar: who is in
  which group, and what they said there.
- Sessions: the OIDC identity from Entra, and the guest accounts the demo
  creates.
- The Cloudinary account behind photo uploads.
- The database, its migrations, and the runtime role.
- The container image and the supply chain that builds and deploys it.

## Entry points and trust boundaries

| Boundary | What crosses it | Who is on the far side |
|---|---|---|
| Internet to Cloudflare | Every request, over TLS | Anyone |
| Cloudflare to the container app | Requests from Cloudflare's ranges, a configured number of hops (`server/client-ip.ts`) | The edge |
| Guest sign-in | A zip code, in exchange for a demo account | Anyone |
| OIDC sign-in | A code and state, exchanged for an identity (`server/oidc.ts`) | Entra, and whoever holds a code |
| The discover search | Free text for a place, a list of seen ids (`server/controllers/discover.ts`) | A signed-in stranger |
| Photo uploads | A signed ticket to Cloudinary, and the URL that comes back (`server/media.ts`) | A signed-in stranger, then Cloudinary |
| The app to Postgres | Parameterised queries as the runtime role | The application |

## Threats and answers

| Threat | Class | Answer | Gate |
|---|---|---|---|
| A member reads or writes another pack's feed, or adds a stranger to a pack | Elevation | Every route that takes an id proves membership first | `tests/e2e/authz.spec.ts`, the route tests, and `scripts/check-db-roles.sh` runs them as the no-DDL role |
| A feed or profile response carries an email or a zip the screen does not show | Disclosure | Responses are schemas that list their fields (`server/api/schemas.ts`) | `tests/unit/privacy-contract.test.ts` over the generated `server/openapi.json` |
| A stored photo URL points anywhere but the upload host | Tampering | `isAllowedImageUrl`: https only, no port, no user info, two named hosts | `tests/unit/media.test.ts` by example, `tests/unit/discover.property.test.ts` under generated input |
| An upload is larger, another format, or in another folder than allowed | Tampering | The server signs the folder, the formats and a size-bounding transformation. A browser cannot change them | `tests/unit/media.test.ts` |
| Search text breaks the resolver | Tampering | A zip or a place name resolves offline against the zip table, or to null | The property tests: never throws, a known zip or null |
| A forged form submits as a signed-in member | Spoofing | CSRF tokens (`lusca`) on every state change, read from the cookie and echoed in a header | `tests/e2e/security.spec.ts`, `csrf.rejected` events |
| A client header moves the rate-limit key | Spoofing | Trusted proxy hops are configuration, refused outside 0 to 10 | `tests/unit/client-ip.test.ts` |
| A flood of searches, swipes or sign-ins | Denial | `express-rate-limit` per route family (`server/limits.ts`), `rate_limit.hit` events | Route tests |
| Script in a profile field runs in the page | Tampering | React escapes. `helmet` sets the CSP | ZAP baseline on every pull request |
| A stolen OIDC code or a replayed state signs somebody in | Spoofing | `jose` validates the token, state is checked, `oidc.failed` is an event | `tests/e2e/sign-in.spec.ts` against the mock issuer |
| A session is stolen or lives on after sign-out | Spoofing | Session cookie flags in `server/session.ts` and `server/cookies.ts`, `auth.session_revoked` and `auth.logout` events | `tests/e2e/sign-in.spec.ts` |
| The runtime identity changes the schema | Elevation | Migrations run as their own step. The runtime role has no DDL | `scripts/check-db-roles.sh` |
| A refusal goes unnoticed | Repudiation | Named security events with the request id and never a token (`server/security-log.ts`), shipped to Application Insights | `docs/OPERATIONS.md` names the query and the alerts |
| A dependency ships a vulnerability | Tampering | Pinned digests and SHAs, locked installs, Dependabot, Trivy, CodeQL, the held-majors gate | Every pull request |
| The image is not what the source says | Tampering | Build provenance attestation on every deploy | The deploy workflow |
| A probe answered by the edge hides an outage | Denial | `no-store` on probes and `/api`, the edge rule excludes them | The deploy smoke test |

## Accepted, and why

- Guest accounts exist so a visitor can try the app. They hold a zip code
  and nothing that identifies a person, and `guest.refused` records the
  ones turned away.
- Geolocation is asked for, never required. The e2e suite runs with the
  permission denied.
- Photos live on Cloudinary. Their availability is Cloudinary's.

## When to revisit

A new route that takes an id, a new sign-in provider, a new upload kind, a
second replica, or any new place a member's text is shown to another.
