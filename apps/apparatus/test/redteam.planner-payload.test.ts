import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildPlannerMemorySummaryForTests,
  composePlannerPayloadForTests,
  resetAutopilotStateForTests,
  shouldPauseForBreakSignalsForTests,
} from '../src/ai/redteam.js';
import {
  addObjectiveProgressSignal,
  createSession,
  upsertSessionAsset,
  upsertSessionObservation,
  upsertSessionRelation,
} from '../src/ai/report-store.js';

function makeSnapshot() {
  return {
    capturedAt: new Date().toISOString(),
    rps: 90,
    requestCount: 900,
    errorCount: 0,
    errorRate: 0,
    avgLatencyMs: 110,
    cpuPercent: 35,
    memPercent: 28,
    healthy: true,
  };
}

describe('RedTeam Planner Payload', () => {
  beforeEach(() => {
    resetAutopilotStateForTests();
  });

  it('composes planner payload with empty memory context', () => {
    const session = createSession({
      objective: 'Find break on /checkout',
      targetBaseUrl: 'http://127.0.0.1:8090',
      maxIterations: 3,
      allowedTools: ['delay'],
    });

    const memory = buildPlannerMemorySummaryForTests(session.id);
    const payload = composePlannerPayloadForTests({
      control: {
        sessionId: session.id,
        stopRequested: false,
        killRequested: false,
        baseUrl: 'http://127.0.0.1:8090',
        objective: session.objective,
        intervalMs: 0,
        maxIterations: 3,
        persona: 'researcher',
        allowedTools: ['delay'],
      },
      snapshot: makeSnapshot(),
      iteration: 1,
      memory,
    });

    expect(payload.memory).not.toBeNull();
    expect(payload.memory?.totals.assets).toBe(0);
    expect(payload.memory?.totals.observations).toBe(0);
    expect(payload.memory?.totals.relations).toBe(0);
    expect(payload.memory?.recentAssets).toHaveLength(0);
    expect(payload.memory?.recentObservations).toHaveLength(0);
    expect(payload.memory?.recentRelations).toHaveLength(0);
    expect(payload.persona.id).toBe('researcher');
    expect(payload.persona.tags).toContain('METHODICAL');
    expect(payload.recentDefenseFeedback).toBeNull();
    expect(shouldPauseForBreakSignalsForTests(memory)).toBe(false);
  });

  it('composes planner payload with bounded populated memory and break-signal gating', () => {
    const session = createSession({
      objective: 'Find break on /checkout',
      targetBaseUrl: 'http://127.0.0.1:8090',
      maxIterations: 3,
      allowedTools: ['cluster.attack', 'delay'],
    });

    const endpoint = upsertSessionAsset(session.id, {
      type: 'endpoint',
      value: '/checkout',
      source: 'objective',
      confidence: 0.8,
    });
    const vuln = upsertSessionAsset(session.id, {
      type: 'vuln',
      value: 'new-5xx-errors:3',
      source: 'verification',
      confidence: 0.9,
    });

    if (!endpoint?.id || !vuln?.id) {
      throw new Error('Expected seeded assets');
    }

    upsertSessionRelation(session.id, {
      type: 'escalates_to',
      fromAssetId: endpoint.id,
      toAssetId: vuln.id,
      source: 'verification',
      confidence: 0.9,
    });

    upsertSessionObservation(session.id, {
      kind: 'verification',
      source: 'verification',
      summary: 'X'.repeat(300),
    });
    addObjectiveProgressSignal(session.id, 'breakSignals', 'new-5xx-errors:3');

    const memory = buildPlannerMemorySummaryForTests(session.id);
    const payload = composePlannerPayloadForTests({
      control: {
        sessionId: session.id,
        stopRequested: false,
        killRequested: false,
        baseUrl: 'http://127.0.0.1:8090',
        objective: session.objective,
        intervalMs: 0,
        maxIterations: 3,
        persona: 'apt',
        allowedTools: ['cluster.attack', 'delay'],
      },
      snapshot: makeSnapshot(),
      iteration: 2,
      memory,
      recentDefenseFeedback: {
        capturedAt: new Date().toISOString(),
        targetPath: '/checkout',
        statusCode: 429,
        bodySnippet: 'rate limit exceeded',
        latencyMs: 1250,
        signal: 'rate_limited',
        reason: 'Received HTTP 429 from objective endpoint.',
        basedOnTool: 'cluster.attack',
        toolFailed: false,
      },
    });

    expect(payload.memory?.totals.assets).toBeGreaterThanOrEqual(2);
    expect(payload.memory?.totals.relations).toBeGreaterThanOrEqual(1);
    expect(payload.memory?.totals.observations).toBeGreaterThanOrEqual(1);
    expect(payload.memory?.recentObservations[0]?.summary.length).toBeLessThanOrEqual(160);
    expect(payload.memory?.objectiveProgress.breakSignals).toContain('new-5xx-errors:3');
    expect(payload.persona.id).toBe('apt');
    expect(payload.persona.tags).toContain('HIGH_STEALTH');
    expect(payload.recentDefenseFeedback?.signal).toBe('rate_limited');
    expect(payload.recentDefenseFeedback?.statusCode).toBe(429);
    expect(shouldPauseForBreakSignalsForTests(memory)).toBe(true);
  });
});
