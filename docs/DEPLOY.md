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
in `server/db/database.js`.

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
