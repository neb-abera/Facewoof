# Operations runbook

Covers the shared production estate (this app, aberaTech, and the shared
`abera-postgres` server in `facewoof-rg`).

## Alerts

Azure Monitor alerts (resource group `facewoof-rg`, action group
`ops-alerts` → email): synthetic availability probes on both apps'
`/healthz` from two regions (sev-0), 5xx rate and replica restarts per app,
and Postgres CPU-credit / connection-count / storage alerts on the shared
B1ms server. If `postgres-cpu-credits-low` fires under real traffic, the
fix is a tier bump, not tuning.

### Security events

The app writes one JSON line per security event to stdout
(`server/security-log.ts`), which lands in Log Analytics as
`ContainerAppConsoleLogs_CL`. Every line has `type: "security"`, an `event`,
the `route`, the resolved client `ip`, a `userId` when there is one and a
`requestId` (Cloudflare's ray id when present). They never contain cookies,
tokens, email addresses, bodies or query strings.

```kusto
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "facewoof" and Log_s startswith "{"
| extend e = parse_json(Log_s) | where e.type == "security"
| summarize n = count() by tostring(e.event), tostring(e.ip), bin(TimeGenerated, 5m)
```

Which ones matter, if an alert is ever wired to `ops-alerts` (none is today;
these are log-search alerts the owner would create):

- `rate_limit.hit` and `guest.refused` — a sustained rate from many
  addresses is a distributed scrape or a demo-account flood; from one
  address it is the limiter doing its job.
- `authz.denied` and `csrf.rejected` — near zero in normal use, because the
  client never sends a request the server refuses. A burst from one `userId`
  is someone walking ids.
- `oidc.failed` with `reason` `state-mismatch` or `failed` — a run of these
  is a broken provider configuration or a forged callback; `expired` and
  `refused` are people changing their minds.
- `auth.session_revoked` — a cookie presented after its owner signed out.
  Occasional is a second tab; repeated from a new address is a stolen cookie
  being tried.
- `auth.required`, `guest.created`, `oidc.signed_in`, `auth.logout`,
  `auth.logout_everywhere` — context for the above, not alerts.

## Backup restore drill (quarterly)

35-day PITR is configured, and a backup is only real if restores are
rehearsed. The first drill (2026-08-30) proved the point by failing twice:
both restores hung in Provisioning for hours because the server had had an
in-place major upgrade (16 → 18) that same day, and until the first
post-upgrade full backup completes (daily, ~15:45 UTC), point-in-time
restores are effectively broken — the machinery tries to replay onto the
old-version base. **After any major engine upgrade, treat PITR as
unavailable until the next full backup lands, and drill again.** The
procedure:

```bash
az postgres flexible-server restore -g facewoof-rg \
  --name drill-restore-$(date +%Y%m%d) --source-server abera-postgres
# ~20-45 minutes to Ready. Then, with a temp firewall rule for your IP:
TOKEN=$(az account get-access-token --resource-type oss-rdbms --query accessToken -o tsv)
# psql as the Entra admin against dbname=facewoof and dbname=scheduling:
#   SELECT count(*) FROM pg_tables WHERE schemaname='public';
#   plus one business-table count each (users / appointments)
az postgres flexible-server delete -g facewoof-rg \
  --name drill-restore-<date> --yes            # always delete the drill server
```

Delete any temporary firewall rules you created, on both servers.

## Secret lifecycle

- **Database**: production uses Entra managed-identity tokens
  (`DATABASE_AUTH=entra`, role `facewoof-mi`) — no DB password in use. The
  legacy `facewoof` password role and the parked `DATABASE_URL` secret are
  scheduled for deletion after 2026-09-06 given a week of clean traffic.
- **SESSION_SECRET**: cookie-session accepts a `keys` array; rotate by
  prepending a new key (new cookies sign with it, old cookies still
  verify), deploying, then removing the old key one session-lifetime
  (24 h) later. Rotate annually or on suspicion.
- **Cloudflare purge token**: scoped to Zone → Cache Purge only; rotate
  from the Cloudflare dashboard and update the repo secret in one sitting.

## Origin lockdown

Both container apps' ingress is restricted to Cloudflare's IPv4 ranges
(the `cf-v4-*` rules; ACA ingress is IPv4-only so the v6 list is not
needed). If Cloudflare publishes new ranges (rare), sync the rules or
users on new edges get 403s. Deploy health gates poll the public domains,
not origin FQDNs, for this reason.

The lockdown is also what the app's client-address logic rests on:
`TRUST_PROXY_HOPS=2` (docs/DEPLOY.md) reads the address Cloudflare appended
to `X-Forwarded-For`, which is only trustworthy while nothing but Cloudflare
can reach the ingress. Lifting the restriction, even briefly, means setting
the variable back to 1 first.
