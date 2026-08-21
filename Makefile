# Entry points for working on Facewoof. Every target runs in a container:
# none of them needs node, npm or postgres installed on the machine, only
# Docker.
#
# Run `make` on its own to list them.

COMPOSE ?= docker compose
DOCKER  ?= docker

.DEFAULT_GOAL := help
.PHONY: help dev seed reset-db psql lint fmt check image run logs down clean

help: ## List the available targets
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk -F':.*?## ' '{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

dev: ## Database, API and hot reloading client on http://localhost:3000
	$(COMPOSE) up --build db api web

seed: ## Reload schema and seed data into the running database
	$(COMPOSE) run --rm seed

reset-db: ## Throw the database away and rebuild it from schema.sql and seed.sql
	$(COMPOSE) rm -sfv db
	$(COMPOSE) down --volumes
	$(COMPOSE) up -d db
	$(COMPOSE) run --rm seed

psql: ## Open a psql shell against the development database
	$(COMPOSE) exec db psql -U facewoof -d facewoof

lint: ## eslint and prettier, against the working tree
	$(COMPOSE) run --rm lint

fmt: ## Rewrite files to match prettier
	$(COMPOSE) run --rm lint npx prettier --write .

check: ## The gate CI runs: lint, format and the production image
	$(COMPOSE) run --rm lint
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
