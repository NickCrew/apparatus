import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { resetAutopilotStateForTests } from '../src/ai/redteam.js';

vi.mock('../src/ai/client.js', () => ({
  chat: vi.fn(async () => JSON.stringify({
    thought: 'Holding pattern',
    reason: 'Test-mode deterministic step',
    tool: 'delay',
    params: { duration: 5 },
  })),
}));

const app = createApp();
let server: Server | null = null;
let baseUrl = '';

describe('AI Autopilot', () => {
  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server?.once('listening', () => resolve()));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    resetAutopilotStateForTests();
  });

  afterEach(() => {
    resetAutopilotStateForTests();
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      server = null;
      baseUrl = '';
    }
  });

  it('should validate objective on start', async () => {
    const res = await request(app)
      .post('/api/redteam/autopilot/start')
      .send({ objective: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing objective');
  });

  it('should start mission and expose status', async () => {
    const startRes = await request(app)
      .post('/api/redteam/autopilot/start')
      .send({
        objective: 'Find the breaking point of /checkout API',
        maxIterations: 1,
        intervalMs: 0,
        targetBaseUrl: baseUrl,
        scope: {
          allowedTools: ['delay', 'chaos.crash'],
          forbidCrash: true,
        },
      });

    expect(startRes.status).toBe(200);
    expect(startRes.body.success).toBe(true);
    expect(startRes.body.session.allowedTools).toContain('delay');
    expect(startRes.body.session.allowedTools).not.toContain('chaos.crash');

    let finalStatus: any = null;
    for (let i = 0; i < 40; i++) {
      const statusRes = await request(app)
        .get('/api/redteam/autopilot/status')
        .query({ sessionId: startRes.body.sessionId });

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.session.id).toBe(startRes.body.sessionId);
      expect(Array.isArray(statusRes.body.session.thoughts)).toBe(true);
      finalStatus = statusRes.body;
      if (['completed', 'failed', 'stopped'].includes(statusRes.body.session.state)) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    expect(finalStatus.session.thoughts.length).toBeGreaterThan(0);
    expect(
      finalStatus.session.thoughts.some((entry: { phase: string }) => entry.phase === 'analyze')
    ).toBe(true);
  });

  it('should hard-stop via kill switch', async () => {
    const startRes = await request(app)
      .post('/api/redteam/autopilot/start')
      .send({
        objective: 'Find breakpoints',
        maxIterations: 2,
        intervalMs: 10,
        targetBaseUrl: baseUrl,
        scope: {
          allowedTools: ['delay'],
          forbidCrash: true,
        },
      });

    expect(startRes.status).toBe(200);

    const killRes = await request(app)
      .post('/api/redteam/autopilot/kill');

    expect(killRes.status).toBe(200);
    expect(killRes.body.success).toBe(true);
    expect(killRes.body.killResult).toHaveProperty('cpuStopped');
    expect(killRes.body.killResult).toHaveProperty('memoryCleared');
    expect(killRes.body.killResult).toHaveProperty('cluster');
  });
});
