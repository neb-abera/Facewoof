# Deploying Facewoof to Azure

The pipeline in `.github/workflows/deploy.yml` builds and ships on every push
to `main` whose checks pass. Everything below is the one-time setup it depends
on, and it needs your Azure credentials, so you run it rather than CI.

Commands are written to be pasted in order. Set these first:

```bash
LOCATION=eastus2                  # see the note below before changing this
RG=facewoof-rg                    # or reuse aberatechserver-app-202412211749ResourceGroup
ACR=aberatechserver20241221175455 # the registry aberaTech already pushes to
ENVIRONMENT=facewoof-env          # or reuse aberaTech's Container Apps environment
APP=facewoof
PG=abera-postgres                 # shared with the scheduling app, see below
PG_ADMIN=facewoofadmin
SUBSCRIPTION=$(az account show --query id -o tsv)
```

## 1. Register the database provider

A subscription only registers a resource provider the first time it uses that
service, and the failure is `MissingSubscriptionRegistration` partway through
the create. `Microsoft.App`, `Microsoft.ContainerRegistry` and
`Microsoft.OperationalInsights` are already registered if aberaTech runs on this
subscription; Postgres will not be until something asks for it.

```bash
az provider register --namespace Microsoft.DBforPostgreSQL --wait
```

It prints nothing on success and takes a minute or two. Confirm:

```bash
az provider show --namespace Microsoft.DBforPostgreSQL --query registrationState -o tsv
```

To check the rest in one go:

```bash
for ns in Microsoft.DBforPostgreSQL Microsoft.App Microsoft.OperationalInsights \
          Microsoft.ContainerRegistry Microsoft.ManagedIdentity; do
  printf '%-34s ' "$ns"
  az provider show --namespace "$ns" --query registrationState -o tsv
done
```

## 2. Database

**Check the region first.** Postgres Flexible Server is not offered in every
region to every subscription, and the failure is an unhelpful "The location is
restricted from performing this operation" _after_ the resource group has been
created. `eastus` is restricted on this subscription even though aberaTech runs
there, which is why `LOCATION` above is `eastus2` — adjacent, so latency to the
registry and the rest of the account stays negligible.

To confirm a region before committing to it, this lists the tiers actually
available to you. An empty list means the region is restricted:

```bash
az postgres flexible-server list-skus -l "$LOCATION" \
  --query "[0].supportedServerEditions[].name" -o tsv
```

Expect `Burstable`, `GeneralPurpose` and `MemoryOptimized`. If it prints
nothing, pick another region and re-check.

A resource group's own location is only where its metadata lives, so a group
created in one region can hold resources in another. Getting `LOCATION` wrong
before creating the group is not worth undoing.

One Flexible Server holding a database per application. You mentioned the
scheduling app will also need Postgres: a single burstable server with two
databases costs roughly what one does, and about half what two servers do.

```bash
az group create --name "$RG" --location "$LOCATION"

# Generated into a variable, and printed, because `az` never echoes back a
# password you passed in: generating it inline would lock you out of your own
# database. Alphanumeric on purpose, so it needs no escaping in the connection
# string URL later.
PG_PASSWORD=$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)
echo "postgres admin password: $PG_PASSWORD"   # save this now

az postgres flexible-server create \
  --resource-group "$RG" --name "$PG" --location "$LOCATION" \
  --tier Burstable --sku-name Standard_B1ms \
  --storage-size 32 --version 16 \
  --admin-user "$PG_ADMIN" --admin-password "$PG_PASSWORD" \
  --public-access 0.0.0.0

az postgres flexible-server db create -g "$RG" -s "$PG" -n facewoof
az postgres flexible-server db create -g "$RG" -s "$PG" -n scheduling
```

`--public-access 0.0.0.0` is the "allow Azure services" rule, not "allow the
internet": it permits connections from inside Azure only. Keep it that way. To
connect from your laptop, add your own address for as long as you need it and
remove it afterwards:

```bash
az postgres flexible-server firewall-rule create -g "$RG" -n "$PG" \
  --rule-name laptop --start-ip-address "$(curl -s ifconfig.me)" \
  --end-ip-address "$(curl -s ifconfig.me)"
```

There is no way to read that password back out of Azure later, so save it
before moving on. If you lose it, reset it with
`az postgres flexible-server update -g "$RG" -n "$PG" --admin-password ...`.

The application applies its own migrations at start-up, so there is nothing to
load by hand. The first revision creates the schema and the demo roster.

That convenience is also a liability: to migrate at boot the serving process
has to connect as the role that owns the schema, so anything that reaches the
database through the app can `DROP` and `ALTER` as well as read. "Database
roles" below is the owner-run procedure that ends it.

## 3. Container app

```bash
az containerapp env create -g "$RG" -n "$ENVIRONMENT" --location "$LOCATION"

az containerapp create \
  -g "$RG" -n "$APP" --environment "$ENVIRONMENT" \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --target-port 8080 --ingress external \
  --min-replicas 1 --max-replicas 3 \
  --registry-server "$ACR.azurecr.io" --registry-identity system
```

It starts on a placeholder image; the first deploy replaces it.

`--min-replicas 1` rather than 0 on purpose. Scaling to zero saves a little
money and costs a cold start of several seconds on the first visit, which is
the wrong trade for something whose whole job is to be looked at.

Then the connection string, as a secret rather than a plain environment
variable so it does not show up in `az containerapp show`:

```bash
az containerapp secret set -g "$RG" -n "$APP" \
  --secrets db-url="postgresql://$PG_ADMIN:$PG_PASSWORD@$PG.postgres.database.azure.com:5432/facewoof?sslmode=require"

az containerapp update -g "$RG" -n "$APP" \
  --set-env-vars DATABASE_URL=secretref:db-url PGSSL=true NODE_ENV=production
```

Azure Database for PostgreSQL requires TLS, which is what `PGSSL=true` turns on
in `server/db/database.ts`.

## 4. Let the container app pull from the registry

```bash
PRINCIPAL=$(az containerapp show -g "$RG" -n "$APP" \
  --query identity.principalId -o tsv)

az role assignment create --assignee "$PRINCIPAL" --role AcrPull \
  --scope "$(az acr show -n "$ACR" --query id -o tsv)"
```

## 5. Give GitHub Actions permission, without a stored secret

Federated credentials rather than a client secret: GitHub presents a short
lived OIDC token, Azure trusts it because it came from this repository's `main`
branch, and there is no long lived credential anywhere to leak or rotate.

```bash
APP_ID=$(az ad app create --display-name facewoof-deploy --query appId -o tsv)
az ad sp create --id "$APP_ID"

az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "github-env-production",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:neb-abera/Facewoof:environment:production",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Deploying revisions, and pushing images.
az role assignment create --assignee "$APP_ID" --role Contributor \
  --scope "/subscriptions/$SUBSCRIPTION/resourceGroups/$RG"
az role assignment create --assignee "$APP_ID" --role AcrPush \
  --scope "$(az acr show -n "$ACR" --query id -o tsv)"
# Pushing needs ARM read on the registry as well as the push data action.
az role assignment create --assignee "$APP_ID" --role Reader \
  --scope "$(az acr show -n "$ACR" --query id -o tsv)"
```

`Contributor` on the resource group is broader than this needs. If you want to
tighten it later, the workflow only calls `az containerapp update` and
`az containerapp show`, so a custom role with
`Microsoft.App/containerApps/read` and `.../write` is enough.

The `subject` must match what GitHub actually puts in the token, and that
depends on the workflow. `deploy.yml` declares `environment: production`, so the
subject is `repo:...:environment:production` — **not** `ref:refs/heads/main`. Get
this wrong and the deploy fails at login with AADSTS700213 and a message naming
the subject it presented, which is the value to use.

Deploying is then restricted to the `production` environment, which is also
where a required reviewer would be configured.

## 6. GitHub configuration

Repository **secrets**:

| Secret                  | Where it comes from                       |
| ----------------------- | ----------------------------------------- |
| `AZURE_CLIENT_ID`       | `$APP_ID` above                           |
| `AZURE_TENANT_ID`       | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID` | `az account show --query id -o tsv`       |

Repository **variables**:

| Variable               | Value              |
| ---------------------- | ------------------ |
| `ACR_LOGIN_SERVER`     | `<acr>.azurecr.io` |
| `CONTAINER_APP_NAME`   | `facewoof`         |
| `AZURE_RESOURCE_GROUP` | your `$RG`         |

```bash
gh secret set AZURE_CLIENT_ID --repo neb-abera/Facewoof --body "$APP_ID"
gh secret set AZURE_TENANT_ID --repo neb-abera/Facewoof --body "$(az account show --query tenantId -o tsv)"
gh secret set AZURE_SUBSCRIPTION_ID --repo neb-abera/Facewoof --body "$SUBSCRIPTION"

gh variable set ACR_LOGIN_SERVER --repo neb-abera/Facewoof --body "$ACR.azurecr.io"
gh variable set CONTAINER_APP_NAME --repo neb-abera/Facewoof --body "$APP"
gh variable set AZURE_RESOURCE_GROUP --repo neb-abera/Facewoof --body "$RG"
```

The workflow targets a `production` environment, so you can add a required
reviewer to it in the repository settings if you want deploys to pause for
approval.

## 7. facewoof.abera.tech

```bash
FQDN=$(az containerapp show -g "$RG" -n "$APP" \
  --query properties.configuration.ingress.fqdn -o tsv)
VERIFY=$(az containerapp show -g "$RG" -n "$APP" \
  --query properties.customDomainVerificationId -o tsv)

echo "CNAME  facewoof        -> $FQDN"
echo "TXT    asuid.facewoof  -> $VERIFY"
```

Add both records at whoever hosts `abera.tech`, wait for them to propagate,
then bind the domain and let Azure issue the certificate:

```bash
az containerapp hostname add -g "$RG" -n "$APP" --hostname facewoof.abera.tech
az containerapp hostname bind -g "$RG" -n "$APP" \
  --hostname facewoof.abera.tech --validation-method CNAME
```

A subdomain rather than a path on abera.tech is deliberate. A path would put
Facewoof on the same origin as your main site, so a cross-site scripting bug in
either would be same-origin with the other, and it would need the .NET app to
reverse proxy `/facewoof/*`, putting Facewoof's load and outages in front of
your portfolio.

If you would rather have the path anyway, the application supports it: build
with `VITE_BASE_PATH=/facewoof/` and run with `BASE_PATH=/facewoof`. Both were
verified in a browser.

## Cloudflare in front

`abera.tech` is already proxied through Cloudflare; `facewoof.abera.tech` was
left "DNS only", so every visitor opened a TLS connection straight to the
ingress in eastus2 and downloaded every asset from there. Proxying the
subdomain terminates TLS at the visitor's nearest edge, compresses with
brotli, and serves the content-hashed assets from cache — the server marks
them `immutable, max-age=31536000`, which Cloudflare respects, while
`index.html` and `/api/*` stay uncached (HTML is not in Cloudflare's default
cacheable extensions, and the API sends no cache headers).

In the dashboard, zone `abera.tech`:

1. **DNS → Records**: edit the `facewoof` CNAME and switch Proxy status to
   **Proxied**. Leave the `asuid.facewoof` TXT record alone.
2. **SSL/TLS → Overview**: the encryption mode must be **Full (strict)**. It
   is zone-wide; if the zone is on something weaker, scope the change with a
   configuration rule for `facewoof.abera.tech` rather than loosening the
   main site.

Full (strict) works because the Azure-managed certificate is bound at the
ingress, so Cloudflare's connection to the origin verifies. The one caveat:
Azure renews that certificate by re-checking the CNAME, and while proxied the
name resolves to Cloudflare. If a renewal email arrives, switch the record to
DNS only, wait for the renewal, and switch back — or replace the managed
certificate with a Cloudflare Origin CA certificate (15-year validity,
SSL/TLS → Origin Server → Create Certificate, then
`az containerapp ssl upload`), which ends the dance permanently.

### Tell the app how many proxies are in front of it

Every rate limit is keyed on the caller's address, which behind proxies has
to be read out of `X-Forwarded-For`. The app trusts a **number of hops**
(`TRUST_PROXY_HOPS`), counted from itself outwards, and takes the entry just
beyond them; anything a caller forges in the header sits further left and is
never read. `server/client-ip.ts` has the full reasoning, including why it
is not `CF-Connecting-IP`.

With the subdomain proxied the chain is visitor → Cloudflare → Container Apps
ingress → app, so production needs **2**. Left at the default of 1 the app
keys on the Cloudflare edge address and everyone behind one PoP shares a
rate-limit bucket (one visitor's demo sign-ins can lock out a city).

```bash
az containerapp update -g "$RG" -n "$APP" --set-env-vars TRUST_PROXY_HOPS=2
```

Set it **only while the origin accepts Cloudflare alone** (the `cf-v4-*`
ingress rules in docs/OPERATIONS.md). The count is what makes the address
unforgeable, and it is only right for traffic that really crossed both
proxies: if the subdomain is ever switched back to "DNS only", or the ingress
restriction is lifted, set it back to 1 first — too low merely coarsens the
buckets, too high lets a caller choose their own address. An invalid value
stops the server at start-up rather than guessing.

## Photo uploads (Cloudinary)

Uploads go straight from the browser to Cloudinary; the app stores only the
returned URL, and only accepts one that is `https://res.cloudinary.com/` under
an `image/upload` path — under *your* cloud once `CLOUDINARY_CLOUD_NAME` is
set (`server/media.ts`, the same list the CSP's `img-src` is built from).

There are two modes, and the server picks by what it has been given.

### Signed (what production should run)

The server hands a signed-in caller a ten-minute signature
(`POST /api/uploads/signature`, rate limited) that fixes the folder
(`Facewoof`), the accepted formats and an incoming size limit. Nobody without
a session can upload, and nobody can change those parameters. It turns on
when all three of these are set on the container app:

```bash
# Cloudinary console -> Settings -> API Keys. The secret goes in as a
# container-app secret, never a plain variable and never a VITE_ build arg.
az containerapp secret set -g "$RG" -n "$APP" \
  --secrets cloudinary-api-secret="<api secret>"
az containerapp update -g "$RG" -n "$APP" --set-env-vars \
  CLOUDINARY_CLOUD_NAME="<cloud name>" \
  CLOUDINARY_API_KEY="<api key>" \
  CLOUDINARY_API_SECRET=secretref:cloudinary-api-secret
```

(`CLOUDINARY_SIGNATURE_ALGORITHM=sha256` only if the Cloudinary product
environment has been switched to SHA-256 signatures; the default is SHA-1,
which is Cloudinary's.)

### Unsigned (the fallback, and what ran before)

While those are unset the endpoint answers 404 and the client falls back to
an **unsigned** upload preset, whose two identifiers are baked into the
bundle at build time as GitHub repository **variables** (Settings → Secrets
and variables → Actions → Variables): `VITE_CLOUD_NAME` and
`VITE_UPLOAD_PRESET`. An unsigned preset is a public write endpoint — its
name ships to every browser and anyone can upload to it — so in production
the server logs a warning at start-up for as long as it is in this mode.
With neither mode configured the app simply hides photo upload.

### Switching over

1. Set the three `CLOUDINARY_*` values as above and let the new revision
   start. The start-up warning about the unsigned preset should be gone from
   the logs.
2. Upload a photo from the profile page while signed in. In the browser's
   network tab the request to `api.cloudinary.com` now carries `signature`
   and `api_key` and no `upload_preset`.
3. Delete the repository variable `VITE_UPLOAD_PRESET` (keep
   `VITE_CLOUD_NAME` or not; signed mode does not read it) and redeploy so
   the bundle stops carrying the preset name.
4. In the Cloudinary console (Settings → Upload → Upload presets) **delete
   the unsigned preset**, or switch it to Signed. Until this step the old
   public endpoint still works for anyone who saved its name, whatever the
   app does.
5. Optional, once: look for stored URLs that predate validation. Nothing is
   deleted by the app; rows that match are not rendered anyway (the CSP
   blocks them), so review and remove by hand if any turn up.

   ```sql
   SELECT photo_id, user_id, url FROM profile_photos
    WHERE url !~ '^https://(res\.cloudinary\.com|placedog\.net)/';
   SELECT post_id, user_id, photo_url FROM posts
    WHERE photo_url IS NOT NULL
      AND photo_url !~ '^https://(res\.cloudinary\.com|placedog\.net)/';
   ```

## Database roles: a runtime identity with no DDL

Two roles instead of one. The **owner** role owns the tables and runs
migrations (`node server/db/migrate.ts`, which the image can run as a
one-off). The **runtime** role is what the container app connects as:
`SELECT/INSERT/UPDATE/DELETE` and sequence use, nothing else — no `CREATE` on
the schema, no `TRUNCATE`, no ownership, a read-only view of
`schema_migrations`. The grants are `server/db/roles/runtime.sql`; CI proves
on every pull request that the app works end to end as such a role and that
the role cannot change the schema (`scripts/check-db-roles.sh`,
`make check-db-roles`).

The code half ships dark: `MIGRATE_ON_BOOT` defaults to today's behaviour, so
nothing changes until the steps below are done. With `MIGRATE_ON_BOOT=false`
the server runs no DDL at boot and **refuses to start** if a migration is
pending, so a revision deployed ahead of its migration never takes traffic.

All of this is owner-run; none of it is in the deploy workflow yet.

**1. A second managed identity, for migrations.** Today the container app's
identity (`facewoof-mi`) owns the schema. It becomes the runtime role; a new
user-assigned identity becomes the owner.

```bash
az identity create -g "$RG" -n facewoof-migrate-mi
MIGRATE_CLIENT_ID=$(az identity show -g "$RG" -n facewoof-migrate-mi --query clientId -o tsv)
MIGRATE_ID=$(az identity show -g "$RG" -n facewoof-migrate-mi --query id -o tsv)
```

**2. Its database role, and ownership.** As the server's Entra admin, against
the `postgres` database and then `facewoof` (token as in docs/OPERATIONS.md):

```sql
-- dbname=postgres
SELECT * FROM pgaadauth_create_principal('facewoof-migrate-mi', false, false);

-- dbname=facewoof
GRANT CONNECT ON DATABASE facewoof TO "facewoof-migrate-mi";
GRANT USAGE, CREATE ON SCHEMA public TO "facewoof-migrate-mi";
-- Everything facewoof-mi created so far changes hands. REASSIGN needs
-- membership in both roles; azure_pg_admin has it.
REASSIGN OWNED BY "facewoof-mi" TO "facewoof-migrate-mi";
```

**3. The runtime grants**, same session, same database:

```bash
psql "host=$PG.postgres.database.azure.com dbname=facewoof user=<entra admin> sslmode=require" \
  -v ON_ERROR_STOP=1 -v runtime=facewoof-mi -v owner=facewoof-migrate-mi \
  -f server/db/roles/runtime.sql
```

Check it took, as the admin: `\dp users` shows `facewoof-mi=arwd/…` and
nothing more, and `SELECT has_schema_privilege('facewoof-mi','public','CREATE')`
is `f`.

**4. A Container Apps job that migrates**, from the same image, as the owner
identity:

```bash
az containerapp job create -g "$RG" -n facewoof-migrate --environment "$ENVIRONMENT" \
  --trigger-type Manual --replica-timeout 600 --replica-retry-limit 0 \
  --image "$ACR.azurecr.io/facewoof:latest" \
  --registry-server "$ACR.azurecr.io" --registry-identity "$MIGRATE_ID" \
  --mi-user-assigned "$MIGRATE_ID" \
  --command node --args server/db/migrate.ts \
  --env-vars DATABASE_AUTH=entra PGSSL=true PGHOST="$PG.postgres.database.azure.com" \
             PGDATABASE=facewoof PGUSER=facewoof-migrate-mi AZURE_CLIENT_ID="$MIGRATE_CLIENT_ID"
az role assignment create --assignee "$(az identity show --ids "$MIGRATE_ID" --query principalId -o tsv)" \
  --role AcrPull --scope "$(az acr show -n "$ACR" --query id -o tsv)"
```

Run it once by hand (`az containerapp job start -g "$RG" -n facewoof-migrate`)
and read its logs: it should say `database is up to date`.

**5. The deploy workflow migrates before it rolls out.** A sketch of the step
to add to `.github/workflows/deploy.yml` between "Build and push" and "Deploy
the revision" — not merged, because it fails until step 4 exists:

```yaml
      - name: Migrate, as the owner identity
        run: |
          set -euo pipefail
          az containerapp job update -g "$RESOURCE_GROUP" -n facewoof-migrate \
            --image "$REGISTRY/$IMAGE:run-${{ github.run_id }}"
          execution=$(az containerapp job start -g "$RESOURCE_GROUP" -n facewoof-migrate \
            --query name -o tsv)
          for _ in $(seq 1 60); do
            status=$(az containerapp job execution show -g "$RESOURCE_GROUP" \
              -n facewoof-migrate --job-execution-name "$execution" \
              --query properties.status -o tsv)
            case "$status" in
              Succeeded) exit 0 ;;
              Failed|Degraded|Stopped) echo "migration $status"; exit 1 ;;
            esac
            sleep 5
          done
          echo "migration did not finish"; exit 1
```

Migrations must then be backwards compatible with the revision still
serving (add before use, remove after), because the old revision runs
against the new schema for the length of the rollout. They already had to
be: replicas of the old revision were serving while the first new replica
migrated at boot.

**6. Switch the app over**, only after 2–5:

```bash
az containerapp update -g "$RG" -n "$APP" --set-env-vars MIGRATE_ON_BOOT=false
```

The revision's log should say `database is up to date (migrations are not
run at boot)`. To back out, set `MIGRATE_ON_BOOT=true` and, as the admin,
`GRANT "facewoof-migrate-mi" TO "facewoof-mi"` — the app then inherits the
owner's rights again until the cause is fixed.

If `DATABASE_URL` is still wired to the Postgres **admin** password anywhere
(section 3 above predates managed identities), that is the same problem in a
worse form: remove the secret once `DATABASE_AUTH=entra` is confirmed in use
(docs/OPERATIONS.md, "Secret lifecycle").

## Deploying

Merging to `main` runs the checks; if they pass, the deploy workflow builds in
ACR, updates the container app, and polls `/healthz` until the new revision
answers. A revision that never becomes healthy fails the run and prints the
container logs, rather than reporting green.

Rolling back is a revision switch, not a rebuild:

```bash
az containerapp revision list -g "$RG" -n "$APP" -o table
az containerapp revision activate -g "$RG" -n "$APP" --revision <previous>
```

## What this costs

Roughly $13–20 a month: the burstable B1ms Postgres is most of it, the
container app's first 180k vCPU-seconds a month are free, and the registry is
shared with aberaTech. Scaling to zero would cut the container to nothing but
costs a cold start on the first visit.
