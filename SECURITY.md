# Security Policy

## Supported Versions

Only the current production deployment (built from `main`) receives security
updates.

## Reporting a Vulnerability

Please report vulnerabilities privately via
[GitHub's private vulnerability reporting](https://github.com/neb-abera/Facewoof/security/advisories/new)
rather than opening a public issue. If you cannot use GitHub, email
<support@alias.abera.tech>. Please include a proof of concept or
reproduction steps where possible.

What to expect:

- **Acknowledgement within 7 days** of your report.
- **Coordinated disclosure**: please keep the details private while a fix is
  prepared. We will credit you in the advisory unless you prefer otherwise.
- **A fix or a status update within 90 days.** If a complete fix needs
  longer, you will hear why and what the plan is rather than silence.

## How this repository searches for vulnerabilities

- CodeQL static analysis (JavaScript/TypeScript, workflows) on every pull
  request and weekly
- trivy scans the production image for HIGH/CRITICAL CVEs on every pull
  request and weekly (`security-scan.yml`). Accepted findings live in
  `.trivyignore` with their reasoning
- Dependabot alerts, security updates and weekly version updates across
  npm, docker and actions
- a held-majors check on every pull request fails when a dependency's next
  major cannot install, the one case Dependabot stays silent about (accepted
  cases live in `.held-majors` with their reasoning)
- dependency review blocks pull requests that introduce high-severity
  vulnerable dependencies
- OpenSSF Scorecard grades the repository's supply-chain posture weekly
- secret scanning with push protection
- browser and API smoke tests run against the real image and a real
  Postgres on every pull request, including a mock-OIDC sign-in exercise
- property tests with fast-check over the parsers that read a stranger's
  text (`tests/unit/discover.property.test.ts`): the location resolver and
  the image URL checks under generated input, 300 runs each, seeded

## Standards this repository is checked against

The gates above are the machinery. This table says which published
control each one answers, so a reviewer with the standard in hand can
find the evidence. A control with no machinery is written down as a
deviation. The application standard is DISA's Application Security and
Development STIG V6R4 (2025-09-09). The identity controls are NIST SP
800-63B. The threat model is `docs/THREAT-MODEL.md`.

| Control | Requirement | Here | Evidence |
|---|---|---|---|
| ASD V-222425, V-222426 | Enforce approved authorizations per object | Met | Every route that takes an id proves membership first. `tests/e2e/authz.spec.ts` has a stranger refused another pack's objects, and `scripts/check-db-roles.sh` runs it as the no-DDL role |
| ASD V-222430 | Execute without excessive permissions | Met | Non-root image (`checks.yml` asserts `Config.User`). The runtime database role has no DDL (`scripts/check-db-roles.sh`) |
| ASD V-222432, V-222536 to V-222548 | Lockout and password rules | Not applicable | No passwords are stored or checked here. Sign-in is OIDC through Entra, which enforces its own. Guest sign-in is rate limited and `guest.refused` is an event |
| ASD V-222522, V-222526 | Unique identification, multifactor for network access | Met by the identity provider | Entra with the provider's second factor. Guests are demo accounts holding a zip code and nothing that names a person |
| ASD V-222575, V-222576, V-222578 | Session cookies: HttpOnly, Secure, destroyed on logoff | Met | `server/session.ts`, `server/cookies.ts`. Sign-out revokes the session and is the `auth.logout` event |
| ASD V-222389, V-222390 | Terminate idle sessions after 15 minutes (users) and 10 minutes (admins) | Deviation, tracked | The session lifetime in `server/session.ts` is not held to these limits. There is no admin role |
| ASD V-222441 to V-222449, V-222462, V-222464 | Audit session events and logon attempts with time, source and outcome | Met | `oidc.signed_in`, `oidc.failed`, `auth.logout`, `auth.session_revoked`, `guest.created`, `guest.refused` and the refusal events in `server/security-log.ts`, with the request id, shipped to Application Insights (`docs/OPERATIONS.md`) |
| ASD V-222444 | No sensitive data in logs | Met | Events carry names, a request id and a route. Never a token, a cookie or a person's data |
| ASD V-222596 | Protect transmitted information | Met | HTTPS only at the edge, HSTS |
| ASD V-222602 | Protect from XSS | Met | React escapes. `helmet` sets the CSP. ZAP baseline on every pull request |
| ASD V-222603 | Protect from CSRF | Met | `lusca` tokens on every state change, read from the cookie and echoed in a header (`tests/e2e/security.spec.ts`) |
| ASD V-222604, V-222607, V-222609 | Injection and input handling | Met | Parameterised queries. Every body and query is a Zod schema (`server/api/schemas.ts`). The parsers over free text are property-tested |
| ASD V-222594, V-222667 | Restrict denial of service | Met | `express-rate-limit` per route family (`server/limits.ts`), body limits, Cloudflare in front |
| ASD V-222610 | Error messages reveal nothing exploitable | Met | Schema issues come back as field names and messages (`issuesOf`), never a stack |
| ASD V-222642 | No embedded authentication data | Met | Secrets are container app secrets. CodeQL and push protection on the repository |
| ASD V-222614, V-222658 | Patches current, products supported | Met | Dependabot with auto-merge for non-majors, the held-majors gate, Node LTS |
| ASD V-222645 | Application files hashed before deployment | Met | Build provenance attestation on every deploy |
| ASD V-222648 | Code review | Met | Every change is a pull request with CodeQL, Trivy, ZAP, dependency review and Scorecard |
| ASD V-222655 | Threat model per release | Met | `docs/THREAT-MODEL.md`, reviewed with every release |
| ASD V-222515, V-222624 | Vulnerability assessment, active testing | Met | ZAP baseline against the real image and database on every pull request, Trivy on the image, CodeQL, weekly schedules |
| SP 800-63B §4.2 | AAL2 for a signed-in person | Met by the identity provider | Entra with a second factor. Guests are AAL0 by design and can reach nothing that names a person |

One deviation: the idle timeout, which would sign people out mid-search.
