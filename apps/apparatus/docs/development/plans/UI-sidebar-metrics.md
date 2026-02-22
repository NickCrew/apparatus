# Plan: UI-Sidebar-Metrics (High-Density Signals)

## Objective
Show small, meaningful live signals directly in sidebar navigation so operators can spot state changes without leaving their current page.

## Current Status (2026-02-22)
- `Done`: Collapsible sidebar framework and section grouping exist.
- `Done`: Sidebar footer already surfaces coarse system status.
- `Not Done`: No per-route live indicators in nav rows.
- `Not Done`: No lightweight sparkline strip for traffic/latency trends in sidebar.
- `Not Done`: No nav-level live counters (webhooks, active defense triggers, etc.).

## Scope
1. Add tiny status indicators to selected nav items (not every row).
2. Add compact trend visualization for traffic activity.
3. Add numeric count badges where counts are operationally useful.
4. Keep performance impact low and avoid noisy visual churn.
5. Preserve readability in both expanded and collapsed sidebar modes.

## Target Signals
- `Traffic`: throughput trend sparkline (recent request rate).
- `Timeline`: incident rate indicator (warn/error density).
- `Chaos`: active/idle pulse indicator (based on chaos status).
- `Deception`: hit activity pulse indicator (from deception/tarpit events).
- `Webhooks`: pending/recent webhook count badge.
- `Defense`: active trigger count badge (recent defense signals).

## Data Sources
- SSE stream events already used by dashboard (`request`, `deception`, `tarpit`, `health`, `webhook`).
- Existing API snapshots:
  - `/health` (platform status baseline)
  - `/chaos/status` (running/idle signal)
  - infra/listener endpoints already used for overview and infra pages

## Technical Approach
- Add a dedicated hook for sidebar-friendly aggregates:
  - `useSidebarMetrics()` returns rolling counts + tiny trend arrays.
- Keep sparkline rendering minimal:
  - SVG path (preferred) or tiny canvas; target < 60px width.
- Throttle updates:
  - coalesce updates to ~1Hz to avoid constant re-render pressure.
- Reuse existing design tokens/classes:
  - no inline styles; use component-library classes and tokenized colors.

## Milestones
1. `M1`: Implement `useSidebarMetrics` with rolling windows and memoized outputs.
2. `M2`: Add activity dots for `Chaos` and `Deception`.
3. `M3`: Add count badges for `Webhooks` and `Defense`.
4. `M4`: Add micro-sparkline for `Traffic` trend.
5. `M5`: Validate collapsed-mode rendering and tooltip readability.

## Acceptance Criteria
- Sidebar shows at least 4 live signals without overwhelming navigation.
- Signals update from live stream data within 1 second of event intake.
- Collapsed mode remains usable (icons + indicators + tooltips).
- No measurable interaction lag introduced in sidebar navigation.
- Styling stays consistent with existing component library and electric-blue contrast direction.
