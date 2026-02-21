# Apparatus monorepo

set dotenv-load := false

default:
    @just --list

# ── Build ────────────────────────────────────────────────────

# Build all packages
build:
    pnpm nx run-many -t build

# Build a single package
build-pkg pkg:
    pnpm nx run {{pkg}}:build

# ── Dev ──────────────────────────────────────────────────────

# Start the apparatus server (HTTP/1 :8090, HTTP/2 :8443, etc.)
dev:
    pnpm nx run apparatus:dev

# Start the CLI in watch mode
dev-cli:
    pnpm nx run cli:dev

# Start the TUI terminal dashboard
tui:
    cd apps/apparatus && pnpm run tui

# Open the web dashboard
dashboard:
    open http://localhost:8090/dashboard

# Start the REPL
repl:
    cd apps/cli && pnpm start repl

# Start live-reload dev stack in tmux via tx (session defaults to "aps")
aps-dev-up session="aps":
    @TMUX_SESSION={{session}} tx new server-dev >/dev/null 2>&1 || true
    @TMUX_SESSION={{session}} tx new dashboard-dev >/dev/null 2>&1 || true
    @TMUX_SESSION={{session}} tx interrupt server-dev >/dev/null 2>&1 || true
    @TMUX_SESSION={{session}} tx interrupt dashboard-dev >/dev/null 2>&1 || true
    @TMUX_SESSION={{session}} tx send server-dev "cd {{justfile_directory()}} && pnpm --filter @apparatus/server dev"
    @TMUX_SESSION={{session}} tx send dashboard-dev "cd {{justfile_directory()}} && pnpm --filter @apparatus/dashboard dev"
    @echo "Live reload started in tmux session '{{session}}': server-dev + dashboard-dev"

# Show tx/tmux status for live-reload windows
aps-dev-status session="aps":
    @TMUX_SESSION={{session}} tx list
    @echo ""
    @echo "[server-dev]"
    @TMUX_SESSION={{session}} tx read server-dev 20
    @echo ""
    @echo "[dashboard-dev]"
    @TMUX_SESSION={{session}} tx read dashboard-dev 20

# Stop live-reload commands (keeps tmux windows)
aps-dev-stop session="aps":
    @TMUX_SESSION={{session}} tx interrupt server-dev >/dev/null 2>&1 || true
    @TMUX_SESSION={{session}} tx interrupt dashboard-dev >/dev/null 2>&1 || true
    @echo "Live reload stopped in tmux session '{{session}}'"

# Restart live-reload commands in tmux
aps-dev-restart session="aps":
    @TMUX_SESSION={{session}} tx interrupt server-dev >/dev/null 2>&1 || true
    @TMUX_SESSION={{session}} tx interrupt dashboard-dev >/dev/null 2>&1 || true
    @TMUX_SESSION={{session}} tx new server-dev >/dev/null 2>&1 || true
    @TMUX_SESSION={{session}} tx new dashboard-dev >/dev/null 2>&1 || true
    @TMUX_SESSION={{session}} tx send server-dev "cd {{justfile_directory()}} && pnpm --filter @apparatus/server dev"
    @TMUX_SESSION={{session}} tx send dashboard-dev "cd {{justfile_directory()}} && pnpm --filter @apparatus/dashboard dev"
    @echo "Live reload restarted in tmux session '{{session}}'"

# ── Test ─────────────────────────────────────────────────────

# Run all tests
test:
    pnpm nx run-many -t test

# Run server tests
test-server:
    pnpm nx run apparatus:test

# Run client tests
test-client:
    pnpm nx run client:test

# Run a single test file
test-file file:
    cd apps/apparatus && npx vitest run {{file}}

# Run tests in watch mode
test-watch:
    cd apps/apparatus && npx vitest

# ── Quality ──────────────────────────────────────────────────

# Type-check all packages
check:
    pnpm nx run-many -t type-check

# Lint all packages
lint:
    pnpm nx run-many -t lint

# Build + type-check + lint + test
ci: build check lint test

# ── Utilities ────────────────────────────────────────────────

# Install dependencies
install:
    pnpm install

# Clean all build artifacts
clean:
    rm -rf apps/apparatus/dist apps/cli/dist libs/client/dist
    rm -rf .nx

# Reset Nx cache
reset-cache:
    pnpm nx reset

# Generate self-signed TLS certs
gen-certs:
    cd apps/apparatus && pnpm run gen-self-signed

# Symlink apparatus tools into ~/bin (or --target DIR)
link-tools *args:
    bash scripts/link-tools.sh {{args}}

# Remove apparatus tool symlinks
unlink-tools *args:
    bash scripts/link-tools.sh --unlink {{args}}

# Show the Nx dependency graph
graph:
    pnpm nx graph
