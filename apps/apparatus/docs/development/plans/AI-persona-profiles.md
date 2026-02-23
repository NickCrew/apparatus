# Plan: AI Persona Profiles (Sophistication Levels)

## Objective
Introduce selectable Autopilot "Persona Profiles" so operators can simulate adversaries with distinct behavior patterns, from noisy opportunistic attackers to stealthy persistent actors.

This initiative extends the existing autopilot planner and dashboard mission controls with persona-aware decisioning and operator-visible profile metadata.

## Scope

### In Scope
- Persona profiles: `script_kiddie`, `researcher`, `apt`
- Persona-aware planner behavior:
  - profile-specific prompt directives
  - deterministic tool bias weighting that influences selected actions
- API contract updates:
  - autopilot start accepts persona selection
  - autopilot config publishes supported personas and defaults
- Dashboard mission controls:
  - persona selector
  - behavior tags visible to operators
- Focused verification for backend contracts, planner behavior, and dashboard payload wiring

### Out of Scope (for this rollout)
- Persona-specific long-horizon campaign memory strategies beyond current session model
- New tool primitives or external integrations
- Automatic profile switching mid-mission (manual pre-mission selection only)

## Current Baseline
- Autopilot currently supports objective, tool scope, and safety controls.
- Planner system prompt is generic and not profile-aware.
- Tool selection fallback heuristics are static and not tied to adversary style.
- Dashboard mission control currently has no persona selector or behavior labels.

## Persona Definitions (Target Behavior)
- **Script Kiddie**
  - Fast/noisy execution
  - Prefers direct disruption and obvious probes
  - Low stealth discipline, low patience
- **Researcher**
  - Methodical and evidence-first
  - Lower-impact pacing, tool focus by category
  - Prioritizes observation quality over brute-force pressure
- **APT**
  - Stealth-weighted and adaptive
  - Prefers route/prefix maneuvering and lower-signature action mixes
  - Preserves persistence and evasion posture when blocked

## Architecture Touchpoints
- Backend planner and API handlers: `apps/apparatus/src/ai/redteam.ts`
- Persona registry: `apps/apparatus/src/ai/personas.ts`
- Dashboard mission controls: `apps/apparatus/src/dashboard/components/dashboard/AutopilotConsole.tsx`
- Dashboard hook contracts: `apps/apparatus/src/dashboard/hooks/useAutopilot.ts`
- Core contract tests:
  - `apps/apparatus/test/autopilot.test.ts`
  - `apps/apparatus/test/redteam.decision.test.ts`
  - `apps/apparatus/test/redteam.planner-payload.test.ts`
  - `apps/apparatus/src/dashboard/components/dashboard/AutopilotConsole.component.test.tsx`

## Workstreams

### W1. Persona Registry + Contract Wiring
- Define a typed persona registry with:
  - id/label/description
  - behavior tags
  - prompt directives
  - tool weight map
- Parse and normalize persona in autopilot start payload.
- Carry persona into session control and planner context.
- Expose supported personas from autopilot config endpoint.

### W2. Persona-Driven Planner Biasing
- Compose system prompt with persona directives while preserving strict JSON constraints.
- Add deterministic weighting logic to bias tool choice by persona profile.
- Ensure weighting respects allowed tools and current safety guardrails.

### W3. Dashboard Persona Controls
- Add persona selector to Mission Control in Autopilot Console.
- Send selected persona through `useAutopilot.start(...)` payload.
- Render behavior tags for selected persona and handle fallback/empty states.

### W4. Validation + Tuning
- Add/extend focused tests for:
  - start/config persona contracts
  - prompt composition with persona directives
  - deterministic persona bias differences
  - dashboard selector and payload propagation
- Record evidence and residual risk notes for rollout closure.

## Milestones

### M1: Persona Registry and Prompt Plumbing
**Outcome:** Persona definitions exist and are wired into autopilot contracts + planner prompt composition.
**Exit Criteria:**
- Persona registry includes Script Kiddie, Researcher, and APT.
- Start/config handlers accept and publish persona metadata.
- Planner system prompt receives persona directives.
- Contract tests cover persona defaults and invalid input fallback.

### M2: Deterministic Persona Tool Biasing
**Outcome:** Persona selection causes measurable, testable differences in tool preference.
**Exit Criteria:**
- Tool weighting is implemented and deterministic under test conditions.
- Allowed-tool scope and safety restrictions remain enforced.
- Distinct behavior deltas are validated for all three personas.

### M3: Persona Selector UX
**Outcome:** Operators can select and inspect persona behavior before mission launch.
**Exit Criteria:**
- Mission Control selector renders supported personas.
- Selected persona is included in start payload.
- Behavior tags are visible and reflect profile metadata.
- Component tests verify selector interactions and payload content.

### M4: Verification and Rollout Readiness
**Outcome:** Persona system is validated and ready for iterative tuning.
**Exit Criteria:**
- Focused backend and dashboard tests pass.
- Type-check/build checks remain green for touched surfaces.
- Review/audit artifacts are captured or environment constraints documented.
- Backlog initiative has completion notes and residual risks.

## Task Decomposition (Backlog Mapping)
- Parent initiative: `TASK-32` (milestone `m-11`)
- Subtasks:
  1. `TASK-32.1` (M1, milestone `m-12`)
  2. `TASK-32.2` (M2, milestone `m-13`)
  3. `TASK-32.3` (M3, milestone `m-14`)
  4. `TASK-32.4` (M4, milestone `m-15`)

Dependency chain:
- `TASK-32.1` -> (`TASK-32.2`, `TASK-32.3`) -> `TASK-32.4`

## Verification Gates
- Backend contract/decision tests:
  - `pnpm --filter @apparatus/server test -- test/autopilot.test.ts test/redteam.decision.test.ts test/redteam.planner-payload.test.ts`
- Dashboard selector/component tests:
  - `pnpm --filter @apparatus/server test -- src/dashboard/components/dashboard/AutopilotConsole.component.test.tsx`
- Type safety:
  - `pnpm --filter @apparatus/server exec tsc --noEmit`
  - `pnpm --dir apps/apparatus/src/dashboard exec tsc --noEmit`

## Risks and Mitigations
- Risk: Persona differences are too subtle to validate.
  - Mitigation: deterministic weight-driven selection tests with explicit expected deltas.
- Risk: Prompt bloat degrades planner reliability.
  - Mitigation: concise persona directives and bounded metadata in prompt assembly.
- Risk: UI and backend persona catalogs drift.
  - Mitigation: consume backend config metadata where available and keep safe local fallback.
- Risk: Persona bias conflicts with safety/tool-scope constraints.
  - Mitigation: apply weighting after allowed-tool filtering and before final action selection.

## Rollout Notes
- Deliver backend plumbing first (M1/M2), then UI controls (M3).
- Keep persona selection optional with safe default profile for backward compatibility.
- Capture validation evidence in `TASK-32.4` before initiative closure.
