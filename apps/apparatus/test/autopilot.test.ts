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
    server = app.listen(0, '127.0.0.1');
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
    const startRes = await request(baseUrl)
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
    expect(startRes.body.session.persona).toBe('script_kiddie');
    expect(startRes.body.session.allowedTools).toContain('delay');
    expect(startRes.body.session.allowedTools).not.toContain('chaos.crash');

    let finalStatus: any = null;
    for (let i = 0; i < 40; i++) {
      const statusRes = await request(baseUrl)
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

  it('should expose supported personas via config and honor selected persona in start payload', async () => {
    const configRes = await request(app).get('/api/redteam/autopilot/config');
    expect(configRes.status).toBe(200);
    expect(configRes.body.defaultPersona).toBe('script_kiddie');
    expect(Array.isArray(configRes.body.personas)).toBe(true);
    expect(configRes.body.personas.some((persona: { id: string }) => persona.id === 'apt')).toBe(true);

    const startRes = await request(baseUrl)
      .post('/api/redteam/autopilot/start')
      .send({
        objective: 'Stealth profile mission',
        maxIterations: 1,
        intervalMs: 0,
        persona: 'apt',
        scope: {
          allowedTools: ['delay'],
          forbidCrash: true,
        },
      });

    expect(startRes.status).toBe(200);
    expect(startRes.body.session.persona).toBe('apt');
  });

  it('should fall back to default persona when invalid persona is provided', async () => {
    const startRes = await request(baseUrl)
      .post('/api/redteam/autopilot/start')
      .send({
        objective: 'Invalid persona fallback mission',
        maxIterations: 1,
        intervalMs: 0,
        persona: 'unknown_actor',
        scope: {
          allowedTools: ['delay'],
          forbidCrash: true,
        },
      });

    expect(startRes.status).toBe(200);
    expect(startRes.body.session.persona).toBe('script_kiddie');
  });

  it('should hard-stop via kill switch', async () => {
    const startRes = await request(baseUrl)
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

  it('should log evasion policy maneuvers when defense signals are detected', async () => {
    const startRes = await request(baseUrl)
      .post('/api/redteam/autopilot/start')
      .send({
        objective: 'Probe /ratelimit for defense behavior',
        maxIterations: 12,
        intervalMs: 0,
        targetBaseUrl: baseUrl,
        scope: {
          allowedTools: ['delay'],
          forbidCrash: true,
        },
      });

    expect(startRes.status).toBe(200);

    let finalStatus: any = null;
    for (let i = 0; i < 240; i++) {
      const statusRes = await request(baseUrl)
        .get('/api/redteam/autopilot/status')
        .query({ sessionId: startRes.body.sessionId });

      expect(statusRes.status).toBe(200);
      finalStatus = statusRes.body;
      if (['completed', 'failed', 'stopped'].includes(statusRes.body.session.state)) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    expect(['completed', 'failed', 'stopped']).toContain(finalStatus.session.state);
    expect(
      finalStatus.session.thoughts.some((entry: { message: string }) =>
        entry.message.includes('Evasion policy maneuver selected')
      )
    ).toBe(true);
    expect(
      finalStatus.session.actions.some((entry: { tool: string }) => entry.tool === 'delay')
    ).toBe(true);
    expect(
      finalStatus.session.actions.some(
        (entry: { maneuver?: { triggerSignal?: string; countermeasure?: string } }) =>
          entry.maneuver?.triggerSignal === 'rate_limited' && entry.maneuver?.countermeasure === 'delay'
      )
    ).toBe(true);
    expect(
      finalStatus.session.actions.some((entry: { tool: string }) => entry.tool === 'mtd.rotate')
    ).toBe(false);
  });
});
