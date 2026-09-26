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
subscription. Postgres will not be until something asks for it.

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
there, which is why `LOCATION` above is `eastus2`. It is adjacent, so latency
to the registry and the rest of the account stays negligible.

To confirm a region before committing to it, this lists the tiers
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

`--public-access 0.0.0.0` is the "allow Azure services" rule: it permits
connections from inside Azure only. Keep it that way. To connect from your
laptop, add your own address for as long as you need it and
remove it afterwards:

```bash
az postgres flexible-server firewall-rule create -g "$RG" -n "$PG" \
  --rule-name laptop --start-ip-address "$(curl -s ifconfig.me)" \
  --end-ip-address "$(curl -s ifconfig.me)"
```

There is no way to read that password back out of Azure later, so save it
before moving on. If you lose it, reset it with
`az postgres flexible-server update -g "$RG" -n "$PG" --admin-password ...`.

The deploy workflow's `migrate` job creates the schema and the demo roster on
the first deploy, as the `facewoof-migrator` identity. "Database roles" below
sets that identity up, and the serving identity with rows and no DDL.

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

It starts on a placeholder image. The first deploy replaces it.

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

The `subject` must match what GitHub puts in the token, and that
depends on the workflow. `deploy.yml` declares `environment: production`, so the
subject is `repo:...:environment:production`, and **not**
`ref:refs/heads/main`. Get this wrong and the deploy fails at login with
AADSTS700213 and a message naming the subject it presented, which is the
value to use.

Deploying is then restricted to the `production` environment, which is also
where a required reviewer would be configured.

The environment deploys from `main` alone. Without a branch policy, a
workflow on any branch that names `production` gets a token with this
subject, and Azure accepts it. That was the state until 2026-09-26.

```bash
gh api -X PUT repos/neb-abera/Facewoof/environments/production \
  -F 'deployment_branch_policy[protected_branches]=false' \
  -F 'deployment_branch_policy[custom_branch_policies]=true'
gh api -X POST repos/neb-abera/Facewoof/environments/production/deployment-branch-policies \
  -f name=main -f type=branch
```

The deploy workflow's `target` job runs `scripts/check-environment-policy.sh`
before anything else. If the policy is gone, or allows any branch beside
`main`, the deploy stops there with the reason.

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

`abera.tech` is already proxied through Cloudflare. `facewoof.abera.tech` was
left "DNS only", so every visitor opened a TLS connection straight to the
ingress in eastus2 and downloaded every asset from there. Proxying the
subdomain terminates TLS at the visitor's nearest edge, compresses with
brotli, and serves the content-hashed assets from cache. The server marks
them `immutable, max-age=31536000`, which Cloudflare respects, while
`index.html` and `/api/*` stay uncached (HTML is not in Cloudflare's default
cacheable extensions, and the API sends no cache headers).

In the dashboard, zone `abera.tech`:

1. **DNS → Records**: edit the `facewoof` CNAME and switch Proxy status to
   **Proxied**. Leave the `asuid.facewoof` TXT record alone.
2. **SSL/TLS → Overview**: the encryption mode must be **Full (strict)**. It
   is zone-wide. If the zone is on something weaker, scope the change with a
   configuration rule for `facewoof.abera.tech` rather than loosening the
   main site.

Full (strict) works because the Azure-managed certificate is bound at the
ingress, so Cloudflare's connection to the origin verifies. The one caveat:
Azure renews that certificate by re-checking the CNAME, and while proxied the
name resolves to Cloudflare. If a renewal email arrives, switch the record to
DNS only, wait for the renewal, and switch back. Or replace the managed
certificate with a Cloudflare Origin CA certificate (15-year validity,
SSL/TLS → Origin Server → Create Certificate, then
`az containerapp ssl upload`), which ends the renewal problem.

### Tell the app how many proxies are in front of it

Every rate limit is keyed on the caller's address, which behind proxies has
to be read out of `X-Forwarded-For`. The app trusts a **hop count**
(`TRUST_PROXY_HOPS`), measured from itself outwards, and takes the entry just
beyond those hops. Anything a caller forges in the header sits further left
and is never read. `server/client-ip.ts` has the full reasoning, including why it
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
unforgeable, and it is only right for traffic that crossed both
proxies: if the subdomain is ever switched back to "DNS only", or the ingress
restriction is lifted, set it back to 1 first. Too low coarsens the
buckets. Too high lets a caller choose their own address. An invalid value
stops the server at start-up rather than guessing.

## Photo uploads (Cloudinary)

Uploads go straight from the browser to Cloudinary. The app stores only the
returned URL, and only accepts one that is `https://res.cloudinary.com/` under
an `image/upload` path, and under *your* cloud once `CLOUDINARY_CLOUD_NAME` is
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
environment has been switched to SHA-256 signatures. The default is SHA-1,
which is Cloudinary's.)

### Unsigned (the fallback, and what ran before)

While those are unset the endpoint answers 404 and the client falls back to
an **unsigned** upload preset, whose two identifiers are baked into the
bundle at build time as GitHub repository **variables** (Settings → Secrets
and variables → Actions → Variables): `VITE_CLOUD_NAME` and
`VITE_UPLOAD_PRESET`. An unsigned preset is a public write endpoint. Its
name ships to every browser and anyone can upload to it, so in production
the server logs a warning at start-up for as long as it is in this mode.
With neither mode configured the app hides photo upload.

### Switching over

1. Set the three `CLOUDINARY_*` values as above and let the new revision
   start. The start-up warning about the unsigned preset should be gone from
   the logs.
2. Upload a photo from the profile page while signed in. In the browser's
   network tab the request to `api.cloudinary.com` now carries `signature`
   and `api_key` and no `upload_preset`.
3. Delete the repository variable `VITE_UPLOAD_PRESET` (`VITE_CLOUD_NAME`
   can stay, since signed mode does not read it) and redeploy so
   the bundle stops carrying the preset name.
4. In the Cloudinary console (Settings → Upload → Upload presets) **delete
   the unsigned preset**, or switch it to Signed. Until this step the old
   public endpoint still works for anyone who saved its name, whatever the
   app does.
5. Optional, once: look for stored URLs that predate validation. Nothing is
   deleted by the app. Rows that match are not rendered anyway (the CSP
   blocks them), so review and remove by hand if any turn up.

   ```sql
   SELECT photo_id, user_id, url FROM profile_photos
    WHERE url !~ '^https://(res\.cloudinary\.com|placedog\.net)/';
   SELECT post_id, user_id, photo_url FROM posts
    WHERE photo_url IS NOT NULL
      AND photo_url !~ '^https://(res\.cloudinary\.com|placedog\.net)/';
   ```

## Database roles: a runtime identity with no DDL

Two identities touch the `facewoof` database. Neither holds a password.

| Identity | Postgres role | Rights | Used by |
|---|---|---|---|
| `facewoof-migrator`, a user-assigned managed identity in `facewoof-rg` | `facewoof-migrator` | Owns every table, sequence and index and the migration ledger. `USAGE, CREATE` on schema `public` | The `migrate` job of the deploy workflow, and nothing else |
| The container app's system-assigned identity | `facewoof-mi` | `SELECT, INSERT, UPDATE, DELETE` on tables, `USAGE, SELECT` on sequences, `SELECT` on `schema_migrations`. No `CREATE`, no `TEMPORARY`, no ownership | Serving requests |

`facewoof-migrator` holds no Azure role. It trusts one thing: a GitHub token
for this repository's `main` branch, through two federated credentials, one
per subject format (`repo:neb-abera/Facewoof:ref:refs/heads/main` and
`repo:neb-abera@29741322/Facewoof@610509973:ref:refs/heads/main`). Its
client id is the repository variable `DATABASE_MIGRATOR_CLIENT_ID`. The
`migrate` job has no `environment:`, so its subject names the branch rather
than the environment.

The grants are `server/db/roles/runtime.sql`. CI proves on every pull request
that the app works end to end as such a role and that the role is refused
`CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `CREATE SCHEMA`, temp tables and writes
to the ledger (`scripts/check-db-roles.sh`, `make check-db-roles`).

### How a deploy migrates

The deploy workflow runs `build`, then `migrate`, then `deploy`.

1. `build` builds the image once and hands it on as an artifact.
2. `migrate` loads it, signs in to Azure as `facewoof-migrator`, and runs
   `scripts/migrate-production.sh`. The script takes an Entra token for
   Postgres and runs the image twice: `node server/db/migrate.ts list` names
   the pending migrations, then `node server/db/migrate.ts` applies them. The
   token reaches the container in a mode 600 env file and is masked in the
   log.
3. `deploy` pushes the same image and starts a revision of it. Outside
   development the server does not migrate at start-up. It reads the ledger
   and refuses to start while a migration is pending, so the previous
   revision keeps serving.

A failed `migrate` stops the run before anything is pushed. Each migration
commits on its own, so a failure leaves the ones before it applied.

A migration must work with the revision before it for one release (add
before use, remove after). That revision serves on the new schema until the
new one is ready.

`MIGRATE_ON_BOOT` decides the start-up behaviour: `true` migrates, `false`
does not, and unset means migrate in development only (`NODE_ENV`). Any other
value stops the server.

### How production was set up

On 2026-09-26, as the Entra administrator, from the dev box (an Azure
address, so the "allow Azure services" firewall rule admits it). The admin
connects with `az account get-access-token --resource-type oss-rdbms` as the
password. Two admin role names map to the same Entra user:
`neb.abera@outlook.com` holds `ADMIN` on `facewoof-migrator`, and
`nebyouabera_gmail.com#EXT#@nebyouaberagmail.onmicrosoft.com` holds `ADMIN` on
`facewoof-mi`. The handover needs both.

```bash
RG=facewoof-rg
az identity create -g "$RG" -n facewoof-migrator -l eastus2
az identity federated-credential create -g "$RG" --identity-name facewoof-migrator \
  -n github-main --issuer https://token.actions.githubusercontent.com \
  --subject repo:neb-abera/Facewoof:ref:refs/heads/main --audiences api://AzureADTokenExchange
az identity federated-credential create -g "$RG" --identity-name facewoof-migrator \
  -n github-main-immutable --issuer https://token.actions.githubusercontent.com \
  --subject repo:neb-abera@29741322/Facewoof@610509973:ref:refs/heads/main --audiences api://AzureADTokenExchange
gh variable set DATABASE_MIGRATOR_CLIENT_ID -R neb-abera/Facewoof \
  -b "$(az identity show -g "$RG" -n facewoof-migrator --query clientId -o tsv)"
```

As `neb.abera@outlook.com`, in `postgres` and then `facewoof`:

```sql
SELECT * FROM pgaadauth_create_principal_with_oid('facewoof-migrator', '<principal id>', 'service', false, false);
GRANT "facewoof-migrator" TO "nebyouabera_gmail.com#EXT#@nebyouaberagmail.onmicrosoft.com" WITH INHERIT TRUE, SET TRUE;
```

As the gmail admin role, in `facewoof`, in one transaction, so the app never
loses access to a table. The same file ran first with `ROLLBACK` in place of
`COMMIT`, and printed the owners and privileges below before rolling back.

```sql
BEGIN;
GRANT "facewoof-mi" TO CURRENT_USER WITH INHERIT TRUE, SET TRUE;
GRANT USAGE, CREATE ON SCHEMA public TO "facewoof-migrator";
-- Object by object: ALTER TABLE ... OWNER TO "facewoof-migrator" for each
-- table in public owned by facewoofadmin, then ALTER SEQUENCE for any
-- sequence left. REASSIGN OWNED BY facewoofadmin would also hand over the
-- databases that role owns, scheduling and fitness among them.
\set runtime facewoof-mi
\set owner facewoof-migrator
\i server/db/roles/runtime.sql
GRANT "facewoof-migrator" TO "facewoof-mi";                                  -- the bridge
ALTER ROLE "facewoof-mi" IN DATABASE facewoof SET role = 'facewoof-migrator';  -- the bridge
GRANT "facewoof-migrator" TO facewoofadmin;   -- sessions already open, until the restart
REVOKE facewoofadmin FROM "facewoof-mi";
REVOKE "facewoof-mi" FROM CURRENT_USER GRANTED BY CURRENT_USER;
COMMIT;
```

Before it, `facewoof-mi` was a member of `facewoofadmin`, the server
administrator (`CREATEROLE`, `CREATEDB`, `BYPASSRLS`, `azure_pg_admin`), which
owned all 11 tables, 5 sequences and 24 indexes, and the `scheduling` and
`fitness` databases too. After it, `facewoof-migrator` owns all 40 objects and
`facewoof-mi` is no administrator.

Then the serving revision was restarted
(`az containerapp revision restart`), so no session still ran as
`facewoofadmin`, and the gmail admin role ran
`REVOKE "facewoof-migrator" FROM facewoofadmin`.

After the first deploy whose `migrate` job was green, the bridge came down,
as the gmail admin role in `facewoof`, then another restart:

```sql
BEGIN;
ALTER ROLE "facewoof-mi" IN DATABASE facewoof RESET role;
REVOKE "facewoof-migrator" FROM "facewoof-mi";
COMMIT;
```

And as `neb.abera@outlook.com`:
`REVOKE "facewoof-migrator" FROM "nebyouabera_gmail.com#EXT#@nebyouaberagmail.onmicrosoft.com"`.

### Rolling back

Each step has its reverse. Run them newest first. None of them touches a row.

| To undo | Run |
|---|---|
| The runtime identity's loss of DDL | `GRANT "facewoof-migrator" TO "facewoof-mi";` and `ALTER ROLE "facewoof-mi" IN DATABASE facewoof SET role = 'facewoof-migrator';`, then restart the revision |
| Migrations outside the app | `az containerapp update -g facewoof-rg -n facewoof --set-env-vars MIGRATE_ON_BOOT=true`, with the two lines above |
| The `migrate` job | Revert the workflow change. The app then needs both rows above |
| The handover | In `facewoof`, `ALTER TABLE ... OWNER TO facewoofadmin` for each table and sequence, `GRANT facewoofadmin TO "facewoof-mi";`, `ALTER ROLE "facewoof-mi" IN DATABASE facewoof SET role = facewoofadmin;` and `GRANT TEMPORARY ON DATABASE facewoof TO PUBLIC;` |
| The identity | `az identity delete -g facewoof-rg -n facewoof-migrator` (its federated credentials go with it), `gh variable delete DATABASE_MIGRATOR_CLIENT_ID -R neb-abera/Facewoof`, and `DROP ROLE "facewoof-migrator"` once it owns nothing |

## Deploying

Merging to `main` runs the checks. If they pass, the deploy workflow builds
the image on the runner, migrates as `facewoof-migrator`, pushes the image,
updates the container app, and polls `/healthz` until the new revision
answers. A revision that never becomes healthy fails the run and prints the
container logs, rather than reporting green.

Rolling back is a revision switch:

```bash
az containerapp revision list -g "$RG" -n "$APP" -o table
az containerapp revision activate -g "$RG" -n "$APP" --revision <previous>
```

## What this costs

Roughly $13–20 a month: the burstable B1ms Postgres is most of it, the
container app's first 180k vCPU-seconds a month are free, and the registry is
shared with aberaTech. Scaling to zero would cut the container to nothing but
costs a cold start on the first visit.
