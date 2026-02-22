# Plan: Drag-and-Drop Scenario Builder

## Objective
Replace manual JSON-only scenario authoring with a visual "Attack/Chaos Architect" that is easier to build, validate, run, and debug while keeping full compatibility with the existing backend `Scenario` schema.

## Current State (Baseline)
- Dashboard scenario authoring is a raw textarea in `ScenarioConsole`.
- Backend accepts and runs `Scenario` objects via:
  - `GET /scenarios`
  - `POST /scenarios`
  - `POST /scenarios/:id/run`
  - `GET /scenarios/:id/status`
- Scenario execution is strictly sequential (`steps[]` order) with runtime status exposing:
  - `status`
  - `currentStepId`
  - `executionId`
  - timestamps and optional error

## Success Criteria
- A user can build a basic scenario with drag-and-drop blocks without writing JSON manually.
- Visual graph always round-trips to valid backend `Scenario` payloads.
- Save and run flows remain one-click from the same console.
- Users can still inspect and edit JSON via a live preview panel.
- During execution, the active step/node is visually highlighted until terminal state (`completed`/`failed`).

## Scope
### In Scope
- Visual canvas authoring using `reactflow`.
- Drag-from-sidebar tool palette.
- Deterministic graph-to-scenario mapping for sequential flows.
- Node-level param editing for supported actions.
- Live JSON preview and validation feedback.
- Run status visualization and active-node highlighting.

### Out of Scope (This Initiative)
- Branching/parallel execution in backend engine.
- New backend scenario execution semantics.
- Multi-user collaborative editing.
- Scenario template marketplace.

## UX Specification
### Layout
- **Left column:** Scenario library + builder palette.
- **Center:** React Flow canvas ("blueprint/circuitry" visual theme).
- **Right column:** Selected node configuration + live JSON preview.
- **Top action bar:** New, Save, Run, Validation status.

### Core Interactions
1. User drags a block from palette to canvas.
2. Node is created with sensible defaults for action + params.
3. User connects nodes in execution order.
4. JSON preview updates immediately.
5. Save persists generated scenario to backend.
6. Run starts scenario and highlights active node based on `currentStepId`.

### Validation Rules (UI-Side)
- Scenario must have at least one node.
- Every node must map to a supported action.
- Every node must have required params for its action.
- Sequential mode must form a single directed chain (or a deterministic linear order).
- Validation errors are shown inline and on affected nodes/edges.

## Technical Design
### Frontend Dependencies
- Add `reactflow` to `apps/apparatus/src/dashboard/package.json`.

### Proposed Frontend Modules
- `components/scenarios/ScenarioBuilderCanvas.tsx`
- `components/scenarios/ScenarioPalette.tsx`
- `components/scenarios/ScenarioNode.tsx`
- `components/scenarios/ScenarioConfigPanel.tsx`
- `components/scenarios/ScenarioJsonPreview.tsx`
- `components/scenarios/scenario-builder-types.ts`
- `components/scenarios/scenario-mappers.ts`
- `components/scenarios/scenario-validation.ts`

### Data Model (Frontend)
```ts
type BuilderAction = "chaos.cpu" | "chaos.memory" | "cluster.attack" | "mtd.rotate" | "delay";

interface BuilderNodeData {
  label: string;
  action: BuilderAction;
  params: Record<string, unknown>;
  delayMs?: number;
}
```

### Mapping Contract
#### Graph -> Scenario (`toScenario`)
- Build a deterministic ordered node list:
  - Primary rule: follow edges from start node through outgoing links.
  - Fallback rule (M1): sort by x-position then y-position when edges are absent.
- Convert each node into `ScenarioStep`:
  - `id` <- node id
  - `action` <- `node.data.action`
  - `params` <- sanitized `node.data.params`
  - `delayMs` <- optional node delay
- Produce `Scenario` object preserving selected scenario metadata (`id`, `name`, `description`).

#### Scenario -> Graph (`fromScenario`)
- One node per step, evenly spaced on x-axis for initial import.
- Edge from step `i` to step `i+1` for sequential visualization.
- Node type and style derived from action category.

### Autosave & Persistence Strategy
- Keep explicit `Save` button for now (M1/M2 safety).
- Add debounced draft autosave in memory (M2), then backend autosave (M3).
- Backend source of truth remains existing `/scenarios` endpoints.

### Runtime Monitoring Strategy
- On run, store returned `executionId`.
- Poll `GET /scenarios/:id/status?executionId=...` every 1s while status is `running`.
- Highlight node where `node.id === currentStepId`.
- Stop polling on terminal status (`completed` or `failed`) and show summary banner.

### Performance Targets
- Canvas interactions remain smooth with up to 50 steps (backend hard limit).
- JSON preview updates under 100ms for typical edits.

## Implementation Milestones
1. **M1: Canvas Foundation**
   - Add React Flow dependency.
   - Replace textarea-first UI with canvas-first shell.
   - Add draggable palette and node creation.
   - Support live JSON preview from node list.
2. **M2: Flow Ordering & Validation**
   - Add edge creation and sequential ordering logic.
   - Enforce chain validation with visual error states.
   - Improve graph<->scenario round-trip reliability tests.
3. **M3: Rich Node Configuration**
   - Action-specific config panels (duration/rate/target/etc.).
   - Parameter-level validation and defaults.
   - Safer autosave to backend with debounce + error recovery.
4. **M4: Execution Visualization**
   - Run status polling and active-node highlighting.
   - Node terminal status coloration (pending/running/success/failure).
   - Execution summary panel with timestamps and failure reason.

## Testing Strategy
### Unit Tests
- Mapping:
  - Graph -> Scenario deterministic ordering.
  - Scenario -> Graph import correctness.
- Validation:
  - Missing params.
  - Invalid chain topologies.
  - Unsupported actions.

### Integration Tests
- Save flow posts generated scenario JSON to `/scenarios`.
- Run flow calls `/scenarios/:id/run` then polls status endpoint.
- Runtime highlighting follows `currentStepId`.

### Manual QA
- Create scenario from scratch with drag-and-drop only.
- Reload scenario library item and verify graph reconstruction.
- Run a scenario and verify node highlighting follows backend status.

## Risks and Mitigations
- **Risk:** Graph ordering ambiguity without edges.
  - **Mitigation:** deterministic fallback sort + clear validation warnings.
- **Risk:** Drift between frontend params and backend sanitization.
  - **Mitigation:** action-specific param schemas aligned to backend sanitize logic.
- **Risk:** Polling overhead.
  - **Mitigation:** poll only while running and stop at terminal states.

## Rollout Plan
- Phase 1: Ship M1 behind the Scenario Console visual builder tab, keep JSON editor available.
- Phase 2: Default to visual builder after M2 stability.
- Phase 3: Add M3/M4 and keep JSON preview as advanced mode.
