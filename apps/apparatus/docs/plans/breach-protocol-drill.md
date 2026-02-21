# "Breach Protocol" Drill (Incident Response) Plan

## Overview
"Breach Protocol" is a guided incident-response simulator that turns Apparatus from a chaos generator into an operations training environment. A drill applies controlled stressors, asks the operator to investigate using existing consoles (Traffic, Defense, Chaos, Deception, Cluster), and scores their response based on detection speed, mitigation quality, and recovery stability.

This mode should feel like a timed on-call incident, not a sandbox toy.

## Goals
- Train users on triage workflow: detect, scope, mitigate, verify.
- Reuse existing Apparatus primitives (`/chaos/*`, `/cluster/attack`, `/ghosts`, `/sentinel/rules`, SSE traffic stream).
- Provide measurable outcomes: Time to Detection (TTD), Time to Mitigation (TTM), Time to Resolution (TTR), and false-action penalties.
- Make scenarios deterministic and replayable for coaching and benchmarking.

## Non-Goals
- Multi-player coordination in v1.
- Persistent user profiles or cross-session leaderboards in v1.
- Full SIEM-style query language in v1.
- Production-grade adversary emulation; this is a controlled education mode.

## User Experience
1. Lobby (`/drill`):
   - Choose difficulty: `Junior`, `Senior`, `Principal`.
   - Pick scenario family: `Reliability`, `Traffic Abuse`, `AppSec`.
   - Optional toggle: `Hints On`.
2. Start Shift:
   - UI enters alert mode, starts timer, and activates scenario stressors.
   - Alert banner includes high-level symptom only (not root cause).
3. Investigation:
   - User navigates current consoles (`/traffic`, `/defense`, `/chaos`, `/deception`, `/cluster`) to gather evidence.
   - Drill timeline records key actions and metric snapshots.
4. Mitigation:
   - User performs corrective actions (stop attack, clear memory, add sentinel rule, etc.).
   - Engine validates whether mitigation satisfies win condition for a sustained window.
5. Debrief:
   - Show score breakdown, TTD/TTM/TTR, key mistakes, and recommended next drill.

## Difficulty Model
- Junior:
  - Single root cause.
  - One dominant symptom.
  - Hint cadence every 45s.
  - Wider win thresholds (easier to pass).
- Senior:
  - One root cause + one distractor signal.
  - Hint cadence every 90s.
  - Stricter sustain windows.
- Principal:
  - Multi-signal ambiguity and chained stressors.
  - Minimal hints.
  - Must satisfy two independent win predicates.

## Technical Architecture

### Frontend (`/dashboard/drill`)
- New component: `src/dashboard/components/dashboard/DrillConsole.tsx`
- New hook: `src/dashboard/hooks/useDrills.ts`
- Router update: add `<Route path="drill" element={<DrillConsole />} />` in `src/dashboard/App.tsx`
- Sidebar update: add `{ path: '/drill', label: 'Breach Protocol', icon: Siren }` in `src/dashboard/components/layout/Sidebar.tsx`

### Backend (`src/drills.ts`)
- New Drill Engine modeled after `src/scenarios.ts`, with additional state machine and condition evaluator.
- In-memory stores (v1):
  - `drillDefinitions: Map<string, DrillDefinition>`
  - `drillRuns: Map<string, DrillRun>`
  - `latestRunByDefinition: Map<string, string>`
- Register endpoints in `src/app.ts` behind `securityGate` (same as `/scenarios`).

### Shared/Existing Integrations
- Stressor execution:
  - `executeToolStep` from `src/tool-executor.ts` for `chaos.cpu`, `chaos.memory`, `cluster.attack`, `delay`.
  - Direct handler calls for `/ghosts?action=start|stop` and `/sentinel/rules` for drill-driven setup/cleanup.
- Telemetry sources:
  - `/sysinfo` for CPU/load/memory.
  - Request stream from `sse-broadcast.ts` (`request` events).
  - `/history` for recent HTTP status trend snapshots.
  - `/deception/history` for `sqli_probe` signal.

## Data Contracts

```ts
export type DrillDifficulty = 'junior' | 'senior' | 'principal';
export type DrillStatus = 'pending' | 'arming' | 'active' | 'stabilizing' | 'won' | 'failed' | 'cancelled';

export interface DrillDefinition {
  id: string;
  name: string;
  description: string;
  difficulty: DrillDifficulty;
  tags: Array<'reliability' | 'traffic' | 'appsec'>;
  briefing: string;
  stressors: DrillStressor[];
  winConditions: DrillCondition[];
  failConditions?: DrillCondition[];
  hintLadder: DrillHint[];
  maxDurationSec: number;
  cooldownActions?: DrillStressor[];
  createdAt: string;
}

export type DrillStressor =
  | { id: string; kind: 'tool'; step: { action: 'chaos.cpu' | 'chaos.memory' | 'cluster.attack' | 'delay'; params: Record<string, unknown>; delayMs?: number } }
  | { id: string; kind: 'ghost.start'; target?: string; delayMs?: number }
  | { id: string; kind: 'ghost.stop' }
  | { id: string; kind: 'seed.sqli'; rate: number; durationSec: number };

export type DrillCondition =
  | { kind: 'cpu_percent'; op: '<' | '>' | '<=' | '>='; value: number; sustainSec: number }
  | { kind: 'error_rate'; op: '<' | '>' | '<=' | '>='; value: number; sustainSec: number }
  | { kind: 'blocked_sqli_ratio'; op: '<' | '>' | '<=' | '>='; value: number; sustainSec: number }
  | { kind: 'cluster_attack_active'; op: '=='; value: boolean; sustainSec: number };

export interface DrillHint {
  atSec: number;
  title: string;
  body: string;
}

export interface DrillRun {
  runId: string;
  drillId: string;
  status: DrillStatus;
  startedAt: string;
  finishedAt?: string;
  detectedAt?: string;
  mitigatedAt?: string;
  timeline: DrillTimelineEvent[];
  score?: DrillScore;
  failureReason?: string;
}

export interface DrillTimelineEvent {
  at: string;
  type: 'system' | 'metric' | 'hint' | 'user_action' | 'status_change';
  message: string;
  data?: Record<string, unknown>;
}

export interface DrillScore {
  total: number;
  ttdSec: number;
  ttmSec: number;
  ttrSec: number;
  penalties: Array<{ code: string; points: number; reason: string }>;
  bonuses: Array<{ code: string; points: number; reason: string }>;
}
```

## Backend API Surface

- `GET /drills`
  - Returns drill definitions (built-in in v1, read-only).
- `POST /drills/:id/run`
  - Starts a run, returns `202` with `runId`.
- `GET /drills/:id/status?runId=...`
  - Returns full run status, timers, and timeline slice.
- `POST /drills/:id/mark-detected`
  - User indicates they have identified likely root cause; sets `detectedAt` once.
- `POST /drills/:id/cancel?runId=...`
  - Stops polling/stressors and applies cooldown.
- `GET /drills/:id/debrief?runId=...`
  - Returns score payload + suggested practice actions.

Notes:
- Guard all endpoints with existing `securityGate` behavior (localhost/demo-mode only).
- Keep response shape parallel to `/scenarios` where practical for easier hook reuse.

## Drill State Machine
- `pending`: run created, not yet arming.
- `arming`: initial stressors are being applied.
- `active`: incident in progress; timers running.
- `stabilizing`: win predicate true, waiting sustain window.
- `won`: sustained win predicate met.
- `failed`: fail predicate met or timeout reached.
- `cancelled`: operator/manual stop.

Transitions:
- `pending -> arming -> active` are automatic.
- `active -> stabilizing` when win condition first becomes true.
- `stabilizing -> active` if win predicate regresses before sustain window ends.
- `stabilizing -> won` if sustain window completes.
- `active|stabilizing -> failed` on timeout/fail condition.
- Any state except terminal -> `cancelled` on cancel request.

## Condition Evaluation Loop
- Poll cadence: `1000ms` for active runs.
- Build snapshot each tick:
  - `cpuPercent` from `os.loadavg()[0] / cpus * 100` (same model used in `src/ai/redteam.ts`).
  - `errorRate` from rolling window of recent `request` events (`status >= 500` / total).
  - `blockedSqliRatio` from seeded SQLi attempts vs blocked responses.
  - `clusterAttackActive` from drill runtime context (set when `cluster.attack` started/stopped).
- Evaluate win/fail predicates against snapshot.
- Append metric events every 5s (not every tick) to keep timeline compact.

## Scenario Catalog (v1)

### 1) CPU Leak Containment (`drill-cpu-leak-jr`)
- Difficulty: Junior
- Initial stressors:
  - `chaos.memory` allocate `512MB`
  - `chaos.cpu` duration `45000ms`
- Expected operator actions:
  - Inspect `/sysinfo` and chaos indicators.
  - Clear memory (`chaos.memory` clear path) and stop CPU spike.
- Win conditions:
  - `cpu_percent <= 60` for `15s`
  - `error_rate <= 0.05` for `15s`
- Fail conditions:
  - timeout `> 6m`

### 2) Volumetric Traffic Spike (`drill-ddos-sr`)
- Difficulty: Senior
- Initial stressors:
  - `cluster.attack` target `/echo`, rate `500`
  - `ghost.start` delay `100ms` (background noise)
- Expected operator actions:
  - Confirm traffic surge in `/traffic`.
  - Add temporary blocking rule in `/defense`.
  - Stop cluster attack.
- Win conditions:
  - `cluster_attack_active == false` for `10s`
  - `error_rate <= 0.03` for `20s`
- Fail conditions:
  - timeout `> 8m`

### 3) SQLi Exfil Attempt (`drill-sqli-principal`)
- Difficulty: Principal
- Initial stressors:
  - `seed.sqli` against `/echo?q=` with payload variants for `120s`
  - mild `ghost.start` noise
- Expected operator actions:
  - Correlate anomalies in `/deception/history` (`sqli_probe`) and traffic patterns.
  - Deploy sentinel regex rule for SQLi signatures.
  - Verify block effectiveness.
- Win conditions:
  - `blocked_sqli_ratio >= 0.90` for `30s`
  - `error_rate <= 0.02` for `20s`
- Fail conditions:
  - timeout `> 10m`

## Scoring Model

Base score: `1000`

Deductions:
- `-1` point per second TTD.
- `-0.5` point per second TTM.
- `-0.25` point per second TTR after mitigation detected.
- `-75` for each incorrect/high-risk action (example: adding over-broad sentinel rule `.*` that blocks all traffic).
- `-100` if run fails.

Bonuses:
- `+75` if no incorrect actions.
- `+50` if resolved under scenario target time.
- `+25` if hints were never used.

Clamp final score to `[0, 1200]`.

## Frontend Design (`DrillConsole.tsx`)

### Layout
- Header strip: status badge, elapsed timer, scenario name, difficulty.
- Left panel: current objective + hint feed + action checklist.
- Right panel:
  - mini-metrics (`CPU`, `Error Rate`, `Requests/s`, `Blocked SQLi %`)
  - timeline event feed
  - controls (`Start`, `Mark Detected`, `Cancel`, `View Debrief`)
- End-state modal: scorecard + coaching notes.

### Client State
```ts
interface DrillUiState {
  selectedDrillId: string | null;
  selectedDifficulty: 'junior' | 'senior' | 'principal';
  activeRunId: string | null;
  status: DrillStatus;
  elapsedSec: number;
  timeline: DrillTimelineEvent[];
  latestSnapshot?: {
    cpuPercent: number;
    errorRate: number;
    blockedSqliRatio?: number;
  };
  debrief?: DrillScore;
}
```

### Hook Responsibilities (`useDrills.ts`)
- `fetchDrills()`
- `startDrill(drillId)`
- `pollStatus(drillId, runId)` with exponential backoff once terminal
- `markDetected(drillId, runId)`
- `cancelDrill(drillId, runId)`
- `fetchDebrief(drillId, runId)`

## Observability
- Structured logs in `src/drills.ts`:
  - `drill_started`, `drill_state_changed`, `drill_hint_emitted`, `drill_won`, `drill_failed`, `drill_cancelled`
- Include: `runId`, `drillId`, `difficulty`, `elapsedSec`, key metrics.
- Broadcast optional `health`-type SSE summaries for future real-time drill widgets (not required for v1 launch).

## Safety Guardrails
- Never include `chaos.crash` in any drill definition.
- Always execute cooldown actions on terminal states:
  - stop CPU/memory stressors
  - stop cluster attack
  - stop ghost traffic
- Sanitize all drill definitions and stressor params using existing tool sanitization rules where possible.
- Keep all drill APIs behind `securityGate`.

## Testing Strategy

### Unit Tests (`apps/apparatus/test/drills.test.ts`)
- Validates drill definition schema and parameter clamps.
- State machine transition tests (including regression from `stabilizing` back to `active`).
- Win/fail evaluator correctness across edge thresholds.
- Score calculation tests (timeouts, penalties, bonuses).

### Integration Tests
- `POST /drills/:id/run` returns `202` and run enters `active`.
- Status polling reaches `won` when mitigation conditions are satisfied.
- Timeout path reaches `failed`.
- `cancel` path executes cooldown and returns terminal state.

### Frontend Tests
- `useDrills` hook behavior for polling lifecycle and terminal stop.
- `DrillConsole` renders lobby, active, and debrief states.
- Error handling for unavailable backend/status fetch failures.

### Manual QA Checklist
- Start each v1 scenario once and verify expected symptom appears.
- Resolve each scenario through UI-only actions.
- Confirm timer/score values are plausible and monotonic.
- Confirm no stressor remains active after completion/cancel.

## Implementation Plan
1. Backend scaffolding:
   - Add `src/drills.ts` definitions, stores, handlers, evaluator loop.
   - Wire routes in `src/app.ts` under `securityGate`.
2. Scenario content:
   - Implement 3 built-in drill definitions with hint ladders and cooldown actions.
3. Frontend shell:
   - Add route and sidebar entry.
   - Create `useDrills.ts` and `DrillConsole.tsx` base lobby/active/debrief flow.
4. Scoring + timeline:
   - Add derived metrics, scoring engine, and debrief endpoint.
5. Validation:
   - Add backend/frontend tests.
   - Run targeted test suites and manual QA checklist.
6. Documentation:
   - Update `docs/reference/feature-reference.md` and `docs/user-guides/user-guide.md` with drill usage and endpoint reference.

## Milestones
- M1: API + state machine + single scenario functional.
- M2: All three scenarios + scoring + debrief.
- M3: UI polish + tests + docs + release-ready review.

## Acceptance Criteria
- `Breach Protocol` module is reachable via dashboard navigation and supports start/cancel/debrief flows.
- Three scenarios (CPU leak, traffic spike, SQLi exfil) are playable end-to-end.
- Drill engine correctly detects win/fail conditions with sustain windows.
- Debrief includes TTD/TTM/TTR and deterministic score calculation.
- Terminal drill states always cleanup active stressors.
- Automated tests cover state machine, evaluator logic, and at least one full run path.

## Risks & Mitigations
- Risk: Metric jitter causes false pass/fail.
  - Mitigation: sustain windows + rolling averages.
- Risk: Overlap with existing scenario engine responsibilities.
  - Mitigation: keep `drills.ts` isolated and reuse only execution primitives.
- Risk: Flaky tests due timing.
  - Mitigation: condition-based polling and deterministic fake timers for unit tests.

## Future Extensions (Post-v1)
- Scenario authoring UI for custom drills.
- Team mode and collaborative debrief timeline.
- Persistent leaderboard and trend analytics.
- AI coach that suggests next best investigative action during a run.
