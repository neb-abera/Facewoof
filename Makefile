# Entry points for working on Facewoof. Every target runs in a container:
# none of them needs node, npm or postgres installed on the machine, only
# Docker.
#
# Run `make` on its own to list them.

COMPOSE ?= docker compose
DOCKER  ?= docker

.DEFAULT_GOAL := help
.PHONY: help dev migrate reset-db psql lint fmt e2e e2e-signin check image run logs down clean

help: ## List the available targets
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk -F':.*?## ' '{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

dev: ## Database, API and hot reloading client on http://localhost:3000
	$(COMPOSE) up --build db api web

migrate: ## Apply any pending database migrations
	$(COMPOSE) run --rm migrate

reset-db: ## Throw the database away and rebuild it from the migrations
	$(COMPOSE) down --volumes
	$(COMPOSE) up -d db
	$(COMPOSE) run --rm migrate

psql: ## Open a psql shell against the development database
	$(COMPOSE) exec db psql -U facewoof -d facewoof

lint: ## eslint and prettier, against the working tree
	$(COMPOSE) run --rm lint

fmt: ## Rewrite files to match prettier
	$(COMPOSE) run --rm lint npx prettier --write .

e2e: ## Browser tests against a running instance (BASE_URL to override)
	$(COMPOSE) run --rm e2e

check: ## The gate CI runs: lint, format and the production image
	$(DOCKER) build --target lint .
	$(DOCKER) build --target final -t facewoof .

image: ## Build the production image the deploy pipeline builds
	$(DOCKER) build --target final -t facewoof .

run: image ## Build and run the production image on http://localhost:8080
	# The image needs a database, and the compose network has to exist before
	# --network can join it. Without this the target only worked if `make dev`
	# happened to be running in another terminal.
	$(COMPOSE) up -d db
	$(DOCKER) run --rm --name facewoof-app -p 127.0.0.1:8080:8080 \
		--network facewoof_default \
		-e DATABASE_URL=postgres://facewoof:facewoof@db:5432/facewoof \
		facewoof

logs: ## Follow the logs of every running service
	$(COMPOSE) logs -f

down: ## Stop the containers, keeping the database volume
	$(COMPOSE) down

clean: ## Stop the containers and delete the database volume
	$(COMPOSE) down --volumes --remove-orphans

# The sign-in flow, against a mock OIDC provider rather than a real tenant.
# No Azure credentials involved: the mock speaks real OIDC, so PKCE, state,
# nonce and signature verification are all genuinely exercised.
e2e-signin: ## Sign-in tests against a mock OIDC provider (no Azure needed)
	docker build --target final -t facewoof .
	docker build --target e2e -t facewoof-e2e .
	-docker rm -f facewoof-oidc-mock facewoof-signin
	docker run -d --rm --name facewoof-oidc-mock --network facewoof_default \
	  -e PORT=9000 -e ISSUER=http://facewoof-oidc-mock:9000 -e CLIENT_ID=facewoof-test \
	  -v "$(PWD)/tests/oidc-mock/server.js:/app/server.js:ro" \
	  -w /app facewoof node /app/server.js
	docker run -d --rm --name facewoof-signin --network facewoof_default \
	  -e DATABASE_URL=postgres://facewoof:facewoof@db:5432/facewoof \
	  -e SESSION_SECRET=local-only -e INSECURE_TRANSPORT=true -e PORT=8080 \
	  -e GUEST_LIMIT_PER_HOUR=200 \
	  -e ENTRA_PROVIDERS=email,google \
	  -e ENTRA_ISSUER=http://facewoof-oidc-mock:9000 \
	  -e ENTRA_CLIENT_ID=facewoof-test \
	  -e ENTRA_CLIENT_SECRET=local-only \
	  -e ENTRA_REDIRECT_URI=http://facewoof-signin:8080/api/auth/oidc/callback \
	  facewoof
	sleep 12
	docker run --rm --network facewoof_default -e CI=true \
	  -e BASE_URL=http://facewoof-signin:8080 \
	  -e ENTRA_ISSUER=http://facewoof-oidc-mock:9000 \
	  facewoof-e2e npx playwright test sign-in --workers=1
	docker rm -f facewoof-oidc-mock facewoof-signin
