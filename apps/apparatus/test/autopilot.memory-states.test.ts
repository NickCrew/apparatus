import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const undiciState = {
  metricsFailuresRemaining: 0,
  metricsAlwaysFail: false,
};

vi.mock('../src/ai/client.js', () => ({
  chat: vi.fn(async () =>
    JSON.stringify({
      thought: 'Hold and observe',
      reason: 'Deterministic test planner',
      tool: 'delay',
      params: { duration: 5 },
    })
  ),
}));

vi.mock('undici', async () => {
  const actual = await vi.importActual<typeof import('undici')>('undici');
  return {
    ...actual,
    request: vi.fn(async (url: string | URL, options?: any) => {
      const target = String(url);
      if (target.includes('/metrics') && (undiciState.metricsAlwaysFail || undiciState.metricsFailuresRemaining > 0)) {
        if (undiciState.metricsFailuresRemaining > 0) {
          undiciState.metricsFailuresRemaining -= 1;
        }
        return {
          statusCode: 500,
          body: {
            text: async () => 'forced metrics failure',
          },
        };
      }
      return actual.request(url as any, options as any);
    }),
  };
});

import { createApp } from '../src/app.js';
import { resetAutopilotStateForTests } from '../src/ai/redteam.js';

const app = createApp();
let server: Server | null = null;
let baseUrl = '';

async function waitForTerminalState(sessionId: string) {
  let latest: any = null;
  for (let i = 0; i < 60; i++) {
    const statusRes = await request(baseUrl)
      .get('/api/redteam/autopilot/status')
      .query({ sessionId });
    expect(statusRes.status).toBe(200);
    latest = statusRes.body;
    if (['completed', 'stopped', 'failed'].includes(statusRes.body.session?.state)) {
      return latest;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Timed out waiting for terminal autopilot state');
}

describe('AI Autopilot Memory State Compatibility', () => {
  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server?.once('listening', () => resolve()));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    undiciState.metricsFailuresRemaining = 0;
    undiciState.metricsAlwaysFail = false;
    resetAutopilotStateForTests();
  });

  afterEach(() => {
    undiciState.metricsFailuresRemaining = 0;
    undiciState.metricsAlwaysFail = false;
    resetAutopilotStateForTests();
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server?.close(() => resolve()));
      server = null;
      baseUrl = '';
    }
  });

  it('recovers from a transient metrics failure and still completes with memory intact', async () => {
    undiciState.metricsFailuresRemaining = 1;

    const startRes = await request(baseUrl)
      .post('/api/redteam/autopilot/start')
      .send({
        objective: 'Find break on /checkout',
        maxIterations: 1,
        intervalMs: 0,
        targetBaseUrl: baseUrl,
        scope: {
          allowedTools: ['delay'],
          forbidCrash: true,
        },
      });

    expect(startRes.status).toBe(200);
    const terminal = await waitForTerminalState(startRes.body.sessionId);
    expect(terminal.session.state).toBe('completed');
    expect(terminal.session.sessionContext).toBeTruthy();
    expect(Array.isArray(terminal.session.sessionContext.observations)).toBe(true);
    expect(
      terminal.session.thoughts.some((entry: { message: string }) =>
        entry.message.includes('Retrying telemetry capture')
      )
    ).toBe(true);
    expect(
      terminal.session.thoughts.some((entry: { message: string }) =>
        entry.message.includes('Telemetry capture recovered')
      )
    ).toBe(true);
  });

  it('retains session memory in stopped state', async () => {
    const startRes = await request(baseUrl)
      .post('/api/redteam/autopilot/start')
      .send({
        objective: 'Find break on /checkout',
        maxIterations: 20,
        intervalMs: 15,
        targetBaseUrl: baseUrl,
        scope: {
          allowedTools: ['delay'],
          forbidCrash: true,
        },
      });

    expect(startRes.status).toBe(200);

    const stopRes = await request(baseUrl).post('/api/redteam/autopilot/stop');
    expect(stopRes.status).toBe(200);

    const terminal = await waitForTerminalState(startRes.body.sessionId);
    expect(terminal.session.state).toBe('stopped');
    expect(terminal.session.sessionContext).toBeTruthy();
    expect(Array.isArray(terminal.session.sessionContext.assets)).toBe(true);
  });

  it('retains session memory in failed state', async () => {
    undiciState.metricsAlwaysFail = true;

    const startRes = await request(baseUrl)
      .post('/api/redteam/autopilot/start')
      .send({
        objective: 'Find break on /checkout',
        maxIterations: 1,
        intervalMs: 0,
        targetBaseUrl: baseUrl,
        scope: {
          allowedTools: ['delay'],
          forbidCrash: true,
        },
      });

    expect(startRes.status).toBe(200);
    const terminal = await waitForTerminalState(startRes.body.sessionId);
    expect(terminal.session.state).toBe('failed');
    expect(terminal.session.error).toBeTruthy();
    expect(terminal.session.error).toContain('Telemetry capture failed after');
    expect(terminal.session.sessionContext).toBeTruthy();
    expect(Array.isArray(terminal.session.sessionContext.relations)).toBe(true);
  });
});
