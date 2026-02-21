# Changelog

All notable changes to this project are documented in this file.

## [Unreleased] - 2026-02-21

### Added
- Ghost API Mocker virtual service system:
  - `POST /ghosts` to create method+route virtual endpoints
  - `DELETE /ghosts/:id` to remove virtual endpoints
  - Ghost middleware interception with configurable fixed/jitter latency and injected error rates
  - Per-ghost request counters and hit timestamps
- Dashboard Ghost module:
  - `GhostConsole` UI for creating/deleting/monitoring ghosts
  - `useGhosts` hook for ghost CRUD/list refresh flows
  - New `/dashboard/ghosts` route and sidebar navigation entry
- New tests:
  - `apps/apparatus/test/ghosting.test.ts`
  - `apps/apparatus/test/demo-mode-config.test.ts`

### Changed
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

### Security
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
- Default bind host is `127.0.0.1` (not `0.0.0.0`).
  - Set `HOST=0.0.0.0` explicitly for Docker/Kubernetes/remote access.
- Cluster attack controls are localhost-gated by default:
  - `POST /cluster/attack`
  - `POST /cluster/attack/stop`
- Ghost endpoints are localhost-gated by default (see Security section).
