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

## Backup restore drill (quarterly)

35-day PITR is configured, and a backup is only real if restores are
rehearsed. The drill (verified 2026-08-30):

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
