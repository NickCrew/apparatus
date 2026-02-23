# Changelog

All notable changes to this project are documented in this file.

## [Unreleased] - 2026-02-21

### Added
- Persistence foundations across core backend stores:
  - Scenario catalog persistence with disk hydration and queued flush writes.
  - Webhook inspect buffer persistence.
  - Deception history persistence.
  - Drill run-state persistence with restart-safe recovery of in-flight states.
  - Request history persistence.
  - Tarpit trapped-IP state persistence.
  - Cluster member state persistence.
- Persistence observability endpoint:
  - `GET /admin/persistence/health` (security-gated) with per-store status and aggregate summary.
- Persistence-focused test coverage:
  - `apps/apparatus/test/scenario-persistence.test.ts`
  - `apps/apparatus/test/webhook-persistence.test.ts`
  - `apps/apparatus/test/deception-persistence.test.ts`
  - `apps/apparatus/test/drills-persistence.test.ts`
  - `apps/apparatus/test/state-persistence.test.ts`
  - `apps/apparatus/test/persistence-health.test.ts`
- Backfilled closed Backlog coverage:
  - Breach Protocol rollout (TASK-1, TASK-2, TASK-3): drill planning, engine/API delivery, and richer scenario predicates.
  - Scenario Builder (TASK-11, TASK-11.1, TASK-11.2, TASK-11.3, TASK-11.4): visual canvas, edge validation, action-aware node config, and execution monitoring.
  - Attacker fingerprinting (TASK-10, TASK-12): backend attacker profiling plus dashboard/mitigation integration.
  - Dashboard UX modernization (TASK-7, TASK-14, TASK-15, TASK-16, TASK-17, TASK-18, TASK-25): HUD overlays, incident-first layout, widget controls, shared styling, and terminal immersion visuals.
  - Autopilot memory and resilience (TASK-19, TASK-19.1, TASK-19.2, TASK-19.3, TASK-19.4, TASK-19.5, TASK-20): typed session context, memory extraction/injection/surfacing, and transient telemetry failure hardening.
  - Blue-team evasion and personas (TASK-30, TASK-30.1, TASK-30.2, TASK-30.3, TASK-30.4, TASK-30.5, TASK-32, TASK-32.1, TASK-32.2, TASK-32.3, TASK-32.4): defense-signal feedback, tactical pivots/toolkit, persona-driven planning/UI, and validation.
  - CLI and automation expansion (TASK-21, TASK-22, TASK-23, TASK-24, TASK-26, TASK-27, TASK-28, TASK-29): CI workflows and expanded Data/Simulator/Labs/blackhole/ghost/chaos/JWT command surfaces.
  - Live Payload follow-up hardening (TASK-13.5): dashboard build unblock and targeted fuzzer form/test fixes.
- Live Payload Fuzzer M1 backend surface:
  - `POST /api/redteam/fuzzer/run` for single-request execution with normalized telemetry output
  - request validation for target/method/path/headers/query/body and bounded timeout controls
  - response preview capture with truncation metadata for large upstream responses
- Ghost API Mocker virtual service system:
  - `POST /ghosts` to create method+route virtual endpoints
  - `DELETE /ghosts/:id` to remove virtual endpoints
  - Ghost middleware interception with configurable fixed/jitter latency and injected error rates
  - Per-ghost request counters and hit timestamps
- Dashboard Ghost module:
  - `GhostConsole` UI for creating/deleting/monitoring ghosts
  - `useGhosts` hook for ghost CRUD/list refresh flows
  - New `/dashboard/ghosts` route and sidebar navigation entry
- Dashboard documentation hub:
  - New full-page docs experience at `/dashboard/docs` and `/dashboard/docs/:docId`
  - Dedicated document sidebar with search and grouped categories
  - In-page outline navigation for large markdown files
  - Docs hub entry points in both sidebar nav and command palette
- New tests:
  - `apps/apparatus/test/ghosting.test.ts`
  - `apps/apparatus/test/demo-mode-config.test.ts`
  - Expanded `apps/apparatus/test/advanced.defense.test.ts` coverage for fuzzer validation, SSRF guardrails, upstream error normalization, large-response truncation, and validate-route host restriction.

### Changed
- Persistence configuration defaults:
  - Added path config/env vars for persisted stores:
    - `SCENARIO_CATALOG_PATH`
    - `WEBHOOK_STORE_PATH`
    - `DECEPTION_HISTORY_PATH`
    - `DRILL_RUNS_PATH`
    - `REQUEST_HISTORY_PATH`
    - `TARPIT_STATE_PATH`
    - `CLUSTER_STATE_PATH`
  - Persistence defaults auto-disable in `NODE_ENV=test` unless an explicit path env var is provided.
- Deception middleware routing:
  - Added admin persistence route bypass for `/admin/persistence/*` so health checks are not intercepted by honeypot routes.
- Rewrote `apps/apparatus/docs/development/plans/live-payload-fuzzer.md` into an implementation-ready engineering plan with contracts, phased milestones, and safety constraints.
- `GET /ghosts` now returns ghost system state and virtual mock list in the shape `{ status, ghosts }`.
- Added REST controls for ghost traffic:
  - `POST /ghosts/start`
  - `POST /ghosts/stop`
- Legacy query-action controls remain for compatibility:
  - `GET /ghosts?action=start|stop`
  - Deprecated with server warning logs.
- Reconciled `apps/apparatus/docs/plans/ai-red-team-plan.md` with current implementation:
  - documents Autopilot as canonical red-team AI surface
  - maps implemented vs pending scope from the original plan
- Dashboard readability/contrast pass:
  - improved opaque backgrounds and hover contrast for key console lists
  - updated modal/interactive element visibility to avoid transparent blending
- Command/help modal hardening:
  - added hidden dialog title/description metadata for Radix accessibility compliance
  - increased command dialog surface opacity and border contrast

### Security
- Cluster command authorization hardening follow-through (TASK-4):
  - additional review-driven fixes beyond initial cycle limit for signed cluster command handling.
- Hardened red-team request execution surfaces:
  - loopback-only target policy by default for fuzzer and validate endpoints
  - optional host allowlist via `APPARATUS_FUZZER_ALLOWED_TARGETS`
  - absolute/protocol-relative path rejection to prevent origin override
  - bounded outbound body and upstream response capture limits
- Ghost mutation and traffic-control routes are now protected by `securityGate` (localhost-only unless `DEMO_MODE=true`):
  - `GET /ghosts`
  - `POST /ghosts`
  - `DELETE /ghosts/:id`
  - `POST /ghosts/start`
  - `POST /ghosts/stop`
- Ghost target validation hardened:
  - Requires loopback IP literals (IPv4/IPv6 forms)
  - Port allowlist enforced (plus optional `GHOST_ALLOWED_PORTS`)
  - Redirect-following disabled for generated ghost traffic requests
- Added guardrails:
  - Max concurrent in-flight ghost responses
  - Max virtual ghost count (`500`)
  - Reserved route prefix protections to avoid shadowing critical endpoints
- Demo mode startup warning now logs when CORS is permissive.
- Added startup warning for containerized environments when `HOST=127.0.0.1`.

### Breaking Changes
- `GET /redteam/validate` is now protected by `securityGate` and host-restricted by default.
  - Non-loopback targets are rejected unless explicitly allowlisted via `APPARATUS_FUZZER_ALLOWED_TARGETS`.
- Default bind host is `127.0.0.1` (not `0.0.0.0`).
  - Set `HOST=0.0.0.0` explicitly for Docker/Kubernetes/remote access.
- Cluster attack controls are localhost-gated by default:
  - `POST /cluster/attack`
  - `POST /cluster/attack/stop`
- Ghost endpoints are localhost-gated by default (see Security section).
