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
  prepared; we will credit you in the advisory unless you prefer otherwise.
- **A fix or a status update within 90 days.** If a complete fix needs
  longer, you will hear why and what the plan is rather than silence.

## How this repository searches for vulnerabilities

- CodeQL static analysis (JavaScript/TypeScript, workflows) on every pull
  request and weekly
- trivy scans the production image for HIGH/CRITICAL CVEs on every pull
  request and weekly (`security-scan.yml`; accepted findings live in
  `.trivyignore` with their reasoning)
- Dependabot alerts, security updates and weekly version updates across
  npm, docker and actions
- dependency review blocks pull requests that introduce high-severity
  vulnerable dependencies
- OpenSSF Scorecard grades the repository's supply-chain posture weekly
- secret scanning with push protection
- browser and API smoke tests run against the real image and a real
  Postgres on every pull request, including a mock-OIDC sign-in exercise
