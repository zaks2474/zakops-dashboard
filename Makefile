# ZakOps Dashboard Makefile
# Standard targets for development and testing

.PHONY: install dev build start test smoke lint clean help

# Default target
help:
	@echo "ZakOps Dashboard - Available commands:"
	@echo "  make install  - Install dependencies"
	@echo "  make dev      - Start development server (port 3003)"
	@echo "  make build    - Build for production"
	@echo "  make start    - Start production server"
	@echo "  make test     - Run smoke tests (requires dev server running)"
	@echo "  make smoke    - Alias for test"
	@echo "  make lint     - Run linter"
	@echo "  make clean    - Clean build artifacts"

# Install dependencies
install:
	npm install

# Start development server on port 3003 (3001 reserved for Docker)
dev:
	npx next dev --port 3003

# Build for production
build:
	npm run build

# Start production server
start:
	npm run start

# Run smoke tests (server must be running)
test: smoke

smoke:
	@echo "Running smoke tests..."
	@if curl -s -o /dev/null -w "%{http_code}" http://localhost:3003 | grep -q "200\|307"; then \
		./smoke-test.sh; \
	else \
		echo "ERROR: Dev server not running. Start with 'make dev' first."; \
		exit 1; \
	fi

# Run linter
lint:
	npm run lint

# Clean build artifacts
clean:
	rm -rf .next
	rm -rf node_modules/.cache

# Quick health check (non-blocking)
health:
	@curl -s -o /dev/null -w "Dashboard: HTTP %{http_code}\n" http://localhost:3003/dashboard || echo "Dashboard: Not running"
	@curl -s -o /dev/null -w "API proxy: HTTP %{http_code}\n" http://localhost:3003/api/deals || echo "API: Not running"
