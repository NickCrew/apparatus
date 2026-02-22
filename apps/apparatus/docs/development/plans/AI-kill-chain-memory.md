# Plan: AI-Kill-Chain-Memory (Session Context + Evidence Graph)

## Objective
Upgrade Autopilot from telemetry-only step selection to a mission agent that stores reusable evidence, reasons over that memory between iterations, and exposes the memory model in the console.

## Current Status (2026-02-22)
- `Done`: Session lifecycle and state machine exist (`idle/running/stopping/stopped/completed/failed`).
- `Done`: Per-session thought stream, action log, and findings persistence exist in the redteam store.
- `Done`: Objective, iteration, telemetry, and tool guardrails are injected into each model decision call.
- `Done`: Verification and mission summary capture breaking-point conditions and failure reason.
- `Not Done`: No typed `SessionContext` / loot inventory for discovered assets (credentials, endpoints, tokens, vulnerable paths).
- `Not Done`: No automatic extraction pipeline from tool outputs into reusable memory entities.
- `Not Done`: No explicit relationship model between finding -> asset -> exploit path.
- `Not Done`: Autopilot Console has no dedicated "Acquired Assets" or memory/graph panel.
- `Not Done`: Planner does not receive compact prior-findings memory beyond current telemetry/objective payload.

## Scope
1. Add structured memory entities to each autopilot session.
2. Capture and normalize new evidence from tool/action outcomes and verification steps.
3. Inject compact memory context into planner prompts every iteration.
4. Surface memory in the dashboard as an operator-facing panel.
5. Keep memory bounded, deterministic, and auditable.

## Memory Model (Target)
- `Asset`: discovered artifact (`endpoint`, `credential`, `token`, `service`, `host`, `vuln`).
- `Observation`: raw evidence produced by a tool or verification step.
- `Relation`: directed link between entities (`discovered_by`, `targets`, `confirms`, `escalates_to`).
- `ObjectiveProgress`: session-level progress signals (e.g., preconditions met, exploit path opened, break condition reached).

## Technical Approach
- Backend (`apps/apparatus/src/ai/report-store.ts`):
  - Extend `RedTeamSession` with `sessionContext` containing entities, relations, and bounded history.
  - Add helper methods for dedupe, upsert, and pruning.
- Mission loop (`apps/apparatus/src/ai/redteam.ts`):
  - Add a memory update stage after each action/verification.
  - Convert action results + verification notes into structured observations.
  - Include a compact memory summary in `userPrompt` alongside telemetry/objective.
  - Add explicit objective-progress checks before selecting next tool.
- Tool integration (`apps/apparatus/src/tool-executor.ts` and adapters):
  - Normalize response metadata so tools can emit structured memory candidates.
  - Preserve raw evidence while storing normalized entities for planning.
- UI (`apps/apparatus/src/dashboard/components/dashboard/AutopilotConsole.tsx`):
  - Add "Acquired Assets" panel with type tags, source tool, confidence, and first/last seen timestamps.
  - Add a lightweight relation list (table/strip) before full graph visualization.

## Milestones
1. `M1`: Define `SessionContext` types + persistence primitives in report store.
2. `M2`: Implement memory extraction and upsert pipeline in mission loop.
3. `M3`: Inject memory summary into planner prompt with bounded token budget.
4. `M4`: Add Autopilot Console "Acquired Assets" panel + relation strip.
5. `M5`: Add objective-progress gating and regression tests for memory growth/pruning.

## Acceptance Criteria
- New sessions accumulate structured memory entities and relations across iterations.
- Planner input includes memory summary on every decision step after first evidence capture.
- Duplicate findings are merged rather than appended as unbounded noise.
- Console shows discovered assets with source attribution and recency.
- Mission outcomes and memory state remain inspectable through existing session/report APIs.
