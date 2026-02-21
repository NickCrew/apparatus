import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Scenario Engine', () => {
  // --- P0: Action allowlist validation ---

  it('should block chaos.crash action in saved scenarios', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({
        name: 'bad-scenario',
        steps: [
          { id: '1', action: 'chaos.crash', params: { delayMs: 1000 } },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid action');
  });

  it('should reject unknown action names', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({
        name: 'unknown-action',
        steps: [
          { id: '1', action: 'exec.shell', params: { cmd: 'whoami' } },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid action');
  });

  it('should reject empty action string', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({
        name: 'empty-action',
        steps: [
          { id: '1', action: '', params: {} },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid action');
  });

  // --- P0: Param sanitization vectors ---

  it('should validate step params using tool sanitization', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({
        name: 'invalid-target',
        steps: [
          { id: '1', action: 'cluster.attack', params: { target: 'file:///tmp', rate: 10 } },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.toLowerCase()).toContain('http/https');
  });

  it('should reject javascript: protocol in cluster target', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({
        name: 'js-proto',
        steps: [
          { id: '1', action: 'cluster.attack', params: { target: 'javascript:alert(1)', rate: 10 } },
        ],
      });

    expect(res.status).toBe(400);
  });

  it('should reject data: protocol in cluster target', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({
        name: 'data-proto',
        steps: [
          { id: '1', action: 'cluster.attack', params: { target: 'data:text/html,<script>alert(1)</script>', rate: 10 } },
        ],
      });

    expect(res.status).toBe(400);
  });

  it('should reject steps with array params', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({
        name: 'bad-params',
        steps: [
          { id: '1', action: 'delay', params: [100] },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid params');
  });

  it('should reject steps with null params', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({
        name: 'null-params',
        steps: [
          { id: '1', action: 'delay', params: null },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid params');
  });

  // --- P0: Input validation ---

  it('should reject scenario with missing name', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({
        steps: [{ id: '1', action: 'delay', params: { duration: 100 } }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing name');
  });

  it('should reject scenario with missing steps', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({ name: 'no-steps' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid steps');
  });

  it('should reject scenario with too many steps', async () => {
    const steps = Array.from({ length: 51 }, (_, i) => ({
      id: `step-${i}`,
      action: 'delay' as const,
      params: { duration: 10 },
    }));

    const res = await request(app)
      .post('/scenarios')
      .send({ name: 'too-many', steps });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Too many steps');
  });

  it('should reject invalid scenario ID characters', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({
        id: '../traversal',
        name: 'bad-id',
        steps: [{ id: '1', action: 'delay', params: { duration: 100 } }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('must match');
  });

  // --- P0/P1: Execution lifecycle ---

  it('should run a delay scenario and expose execution status', async () => {
    const saveRes = await request(app)
      .post('/scenarios')
      .send({
        name: 'delay-scenario',
        steps: [
          { id: '1', action: 'delay', params: { duration: 20 } },
        ],
      });

    expect(saveRes.status).toBe(200);
    const scenarioId = saveRes.body.id as string;

    const runRes = await request(app)
      .post(`/scenarios/${scenarioId}/run`);

    expect(runRes.status).toBe(202);
    expect(runRes.body.executionId).toBeDefined();

    const executionId = runRes.body.executionId as string;

    let status = 'running';
    for (let i = 0; i < 40; i++) {
      const statusRes = await request(app)
        .get(`/scenarios/${scenarioId}/status`)
        .query({ executionId });

      expect(statusRes.status).toBe(200);
      status = statusRes.body.status;
      if (status !== 'running') break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    expect(status).toBe('completed');
  });

  it('should track failed scenario execution', async () => {
    // Pre-occupy the CPU spike so the scenario step fails with "already running"
    const { triggerCpuSpike, stopCpuSpike } = await import('../src/chaos.js');
    triggerCpuSpike(10000);

    try {
      const saveRes = await request(app)
        .post('/scenarios')
        .send({
          name: 'fail-scenario',
          steps: [
            { id: '1', action: 'chaos.cpu', params: { duration: 100 } },
          ],
        });

      expect(saveRes.status).toBe(200);
      const scenarioId = saveRes.body.id as string;

      const runRes = await request(app)
        .post(`/scenarios/${scenarioId}/run`);

      expect(runRes.status).toBe(202);
      const executionId = runRes.body.executionId as string;

      let run: any;
      for (let i = 0; i < 60; i++) {
        const statusRes = await request(app)
          .get(`/scenarios/${scenarioId}/status`)
          .query({ executionId });

        run = statusRes.body;
        if (run.status !== 'running') break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      expect(run.status).toBe('failed');
      expect(run.error).toBeDefined();
      expect(run.finishedAt).toBeDefined();
    } finally {
      stopCpuSpike();
    }
  });

  it('should return 404 for running nonexistent scenario', async () => {
    const res = await request(app)
      .post('/scenarios/nonexistent-id/run');

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('not found');
  });

  it('should return 404 for status of nonexistent scenario', async () => {
    const res = await request(app)
      .get('/scenarios/nonexistent-id/status');

    expect(res.status).toBe(404);
  });

  // --- P1: Sanitization clamps values ---

  it('should clamp CPU spike duration to max 120000ms', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({
        name: 'clamped-cpu',
        steps: [
          { id: '1', action: 'chaos.cpu', params: { duration: 999999 } },
        ],
      });

    expect(res.status).toBe(200);
    // The saved step should have duration clamped to 120000
    const saved = res.body.steps[0];
    expect(saved.params.duration).toBe(120000);
  });

  it('should clamp memory amount to max 4096MB', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({
        name: 'clamped-memory',
        steps: [
          { id: '1', action: 'chaos.memory', params: { action: 'allocate', amount: 99999 } },
        ],
      });

    expect(res.status).toBe(200);
    const saved = res.body.steps[0];
    expect(saved.params.amount).toBe(4096);
  });

  it('should clamp cluster attack rate to max 2000', async () => {
    const res = await request(app)
      .post('/scenarios')
      .send({
        name: 'clamped-rate',
        steps: [
          { id: '1', action: 'cluster.attack', params: { target: 'http://127.0.0.1:8090/echo', rate: 99999 } },
        ],
      });

    expect(res.status).toBe(200);
    const saved = res.body.steps[0];
    expect(saved.params.rate).toBe(2000);
  });

  it('should list saved scenarios', async () => {
    const res = await request(app).get('/scenarios');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
