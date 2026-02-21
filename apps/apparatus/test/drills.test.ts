import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

function isTerminal(status: string) {
  return status === 'won' || status === 'failed' || status === 'cancelled';
}

describe('Drill Engine', () => {
  it('should expose all built-in M2 drills in catalog', async () => {
    const listRes = await request(app).get('/drills');
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);

    const ids = new Set((listRes.body as Array<{ id: string }>).map((drill) => drill.id));
    expect(ids.has('drill-cpu-leak-jr')).toBe(true);
    expect(ids.has('drill-ddos-sr')).toBe(true);
    expect(ids.has('drill-sqli-principal')).toBe(true);
  });

  it('should run CPU drill to successful terminal state with debrief', async () => {
    const runRes = await request(app).post('/drills/drill-cpu-leak-jr/run');
    expect(runRes.status).toBe(202);
    expect(typeof runRes.body.runId).toBe('string');

    const runId = runRes.body.runId as string;

    const markRes = await request(app)
      .post('/drills/drill-cpu-leak-jr/mark-detected')
      .send({ runId });

    expect(markRes.status).toBe(200);
    expect(markRes.body.run.detectedAt).toBeDefined();

    let terminalStatus: string | null = null;
    for (let i = 0; i < 120; i++) {
      const statusRes = await request(app)
        .get('/drills/drill-cpu-leak-jr/status')
        .query({ runId });

      expect(statusRes.status).toBe(200);
      terminalStatus = statusRes.body.status as string;

      if (isTerminal(terminalStatus)) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(terminalStatus).toBe('won');

    const debriefRes = await request(app)
      .get('/drills/drill-cpu-leak-jr/debrief')
      .query({ runId });

    expect(debriefRes.status).toBe(200);
    expect(debriefRes.body.status).toBe('won');
    expect(debriefRes.body.score).toBeDefined();
    expect(typeof debriefRes.body.score.total).toBe('number');
  }, 20000);

  it('should support ddos drill active->cancel->debrief lifecycle', async () => {
    const runRes = await request(app).post('/drills/drill-ddos-sr/run');
    expect(runRes.status).toBe(202);
    const runId = runRes.body.runId as string;

    let sawActiveLikeState = false;
    for (let i = 0; i < 80; i++) {
      const statusRes = await request(app)
        .get('/drills/drill-ddos-sr/status')
        .query({ runId });

      expect(statusRes.status).toBe(200);
      const status = statusRes.body.status as string;
      if (status === 'active' || status === 'stabilizing' || isTerminal(status)) {
        sawActiveLikeState = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(sawActiveLikeState).toBe(true);

    const cancelRes = await request(app)
      .post('/drills/drill-ddos-sr/cancel')
      .send({ runId });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.run.status).toBe('cancelled');

    const debriefRes = await request(app)
      .get('/drills/drill-ddos-sr/debrief')
      .query({ runId });

    expect(debriefRes.status).toBe(200);
    expect(debriefRes.body.status).toBe('cancelled');
    expect(typeof debriefRes.body.score.total).toBe('number');
  }, 25000);

  it('should track SQLi ratio metric and allow cancellation with debrief', async () => {
    const runRes = await request(app).post('/drills/drill-sqli-principal/run');
    expect(runRes.status).toBe(202);
    const runId = runRes.body.runId as string;

    let sawSqliMetric = false;
    for (let i = 0; i < 100; i++) {
      const statusRes = await request(app)
        .get('/drills/drill-sqli-principal/status')
        .query({ runId });

      expect(statusRes.status).toBe(200);
      const snapshot = statusRes.body.lastSnapshot as { blockedSqliRatio?: number } | undefined;
      if (snapshot && typeof snapshot.blockedSqliRatio === 'number') {
        sawSqliMetric = true;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(sawSqliMetric).toBe(true);

    const cancelRes = await request(app)
      .post('/drills/drill-sqli-principal/cancel')
      .send({ runId });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.run.status).toBe('cancelled');

    const debriefRes = await request(app)
      .get('/drills/drill-sqli-principal/debrief')
      .query({ runId });

    expect(debriefRes.status).toBe(200);
    expect(debriefRes.body.status).toBe('cancelled');
    expect(typeof debriefRes.body.score.total).toBe('number');
  }, 25000);
});
