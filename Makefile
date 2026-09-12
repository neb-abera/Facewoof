# Entry points for working on Facewoof. Every target runs in a container:
# none of them needs node, npm or postgres installed on the machine, only
# Docker.
#
# Run `make` on its own to list them.

COMPOSE ?= docker compose
DOCKER  ?= docker

.DEFAULT_GOAL := help
.PHONY: help ports dev migrate reset-db psql lint fmt e2e e2e-signin check test-unit image run logs down clean

help: ## List the available targets
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk -F':.*?## ' '{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

# Image tags, container names and the compose network derive from the checkout
# directory, so two worktrees of this repository never build over or test
# against each other's containers. Compose derives its project name the same
# way (compose.yaml deliberately has no `name:`), which is what makes the
# network name below predictable.
IMAGE := $(shell basename "$(CURDIR)" | tr '[:upper:]' '[:lower:]')
NET   := $(IMAGE)_default

# Published host ports derive from the directory too, by way of .env — compose
# only reads numbers, so they cannot come from the directory the way the image
# name does. Generated at parse time so the include has something to read; an
# existing .env is left alone, so `APP_PORT=9001 make run` and a hand-edited
# file both still work.
$(shell ./scripts/worktree-env.sh)
-include .env
CLIENT_PORT ?= 3000
API_PORT    ?= 3001
DB_PORT     ?= 5432
APP_PORT    ?= 8080
export CLIENT_PORT API_PORT DB_PORT APP_PORT

ports: ## Show this copy's host ports, image name and compose network
	@printf 'client   http://localhost:%s   (make dev)\n' '$(CLIENT_PORT)'
	@printf 'api      http://localhost:%s   (make dev)\n' '$(API_PORT)'
	@printf 'db       localhost:%s          (make dev, make psql)\n' '$(DB_PORT)'
	@printf 'app      http://localhost:%s   (make run)\n' '$(APP_PORT)'
	@printf 'image    %s\n' '$(IMAGE)'
	@printf 'network  %s\n' '$(NET)'

dev: ## Database, API and hot reloading client; `make ports` says where
	@printf 'this copy serves the client on http://localhost:%s\n' '$(CLIENT_PORT)'
	$(COMPOSE) up --build db api web

migrate: ## Apply any pending database migrations
	$(COMPOSE) run --rm migrate

reset-db: ## Throw the database away and rebuild it from the migrations
	$(COMPOSE) down --volumes
	$(COMPOSE) up -d db
	$(COMPOSE) run --rm migrate

psql: ## Open a psql shell against the development database
	$(COMPOSE) exec db psql -U facewoof -d facewoof

lint: ## biome lint and format check, against the working tree
	$(COMPOSE) run --rm lint

fmt: ## Rewrite files to match biome
	$(COMPOSE) run --rm lint npx biome check --write .

e2e: ## Browser tests against a running instance (BASE_URL to override)
	# Playwright's own image, at the version package.json pins (scripts/e2e.sh
	# derives it). The default BASE_URL is the alias `make run` gives its
	# container. It must not be a bare `app`: .app is a real gTLD on Chromium's
	# HSTS preload list (Google owns it), so the browser force-upgrades any
	# host with that name to https before the first request leaves, and every
	# test dies with ERR_SSL_PROTOCOL_ERROR against a plain-HTTP instance.
	# Nothing the server sends can prevent it — the list ships inside the
	# browser. The same goes for other preloaded TLDs (dev, page, new, day).
	E2E_NETWORK=$(NET) BASE_URL=$${BASE_URL:-http://app-under-test:8080} scripts/e2e.sh

check: ## The gate CI runs: lint, format and the production image
	$(DOCKER) build --target lint .

test-unit: ## Unit tests, hermetically, the way CI runs them
	$(DOCKER) build --target unittest .
	$(DOCKER) build --target final -t $(IMAGE) .

image: ## Build the production image the deploy pipeline builds
	$(DOCKER) build --target final -t $(IMAGE) .

run: image ## Build and run the production image; `make ports` says where
	# The image needs a database, and the compose network has to exist before
	# --network can join it. Without this the target only worked if `make dev`
	# happened to be running in another terminal.
	#
	# SESSION_SECRET: the image runs with NODE_ENV=production, and the server
	# refuses to start without one rather than generating a key per replica.
	# The target used to omit it and die on that check before serving a page.
	# INSECURE_TRANSPORT: without it the session cookie is Secure-only, so
	# over plain-HTTP localhost the browser never sends it back and every
	# sign-in silently fails. Both values are for this target only; real
	# deployments set their own.
	#
	# The `app-under-test` alias is what the e2e service's default BASE_URL
	# points at, so `make e2e` finds this container whatever the checkout is
	# called. Not a bare `app`: see compose.yaml for why Chromium refuses it.
	$(COMPOSE) up -d db
	@printf 'this copy serves on http://localhost:%s\n' '$(APP_PORT)'
	$(DOCKER) rm -f $(IMAGE)-app 2>/dev/null || true
	$(DOCKER) run --rm --name $(IMAGE)-app -p 127.0.0.1:$(APP_PORT):8080 \
		--network $(NET) --network-alias app-under-test \
		-e DATABASE_URL=postgres://facewoof:facewoof@db:5432/facewoof \
		-e SESSION_SECRET=local-only \
		-e INSECURE_TRANSPORT=true \
		$(IMAGE)

logs: ## Follow the logs of every running service
	$(COMPOSE) logs -f

down: ## Stop the containers, keeping the database volume
	$(COMPOSE) down

clean: ## Stop this copy's containers and delete its database volume
	$(COMPOSE) down --volumes --remove-orphans

# The sign-in flow, against a mock OIDC provider rather than a real tenant.
# No Azure credentials involved: the mock speaks real OIDC, so PKCE, state,
# nonce and signature verification are all genuinely exercised.
e2e-signin: ## Sign-in tests against a mock OIDC provider (no Azure needed)
	$(DOCKER) build --target final -t $(IMAGE) .
	$(COMPOSE) up -d db
	-$(DOCKER) rm -f $(IMAGE)-oidc-mock $(IMAGE)-signin
	$(DOCKER) run -d --rm --name $(IMAGE)-oidc-mock --network $(NET) \
	  --network-alias oidc-mock \
	  -e PORT=9000 -e ISSUER=http://oidc-mock:9000 -e CLIENT_ID=facewoof-test \
	  -v "$(CURDIR)/tests/oidc-mock/server.js:/app/server.js:ro" \
	  -w /app $(IMAGE) node /app/server.js
	$(DOCKER) run -d --rm --name $(IMAGE)-signin --network $(NET) \
	  --network-alias signin-under-test \
	  -e DATABASE_URL=postgres://facewoof:facewoof@db:5432/facewoof \
	  -e SESSION_SECRET=local-only -e INSECURE_TRANSPORT=true -e PORT=8080 \
	  -e GUEST_LIMIT_PER_HOUR=200 \
	  -e ENTRA_PROVIDERS=email,google \
	  -e ENTRA_ISSUER=http://oidc-mock:9000 \
	  -e ENTRA_CLIENT_ID=facewoof-test \
	  -e ENTRA_CLIENT_SECRET=local-only \
	  -e ENTRA_REDIRECT_URI=http://signin-under-test:8080/api/auth/oidc/callback \
	  $(IMAGE)
	sleep 12
	E2E_NETWORK=$(NET) CI=true \
	  BASE_URL=http://signin-under-test:8080 \
	  ENTRA_PROVIDERS=email,google ENTRA_ISSUER=http://oidc-mock:9000 \
	  scripts/e2e.sh sign-in --workers=1
	$(DOCKER) rm -f $(IMAGE)-oidc-mock $(IMAGE)-signin
