import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Webhook Receiver', () => {
    // --- P0: Body and metadata capture ---

    it('should receive and store a webhook POST', async () => {
        const hookId = `test-${Date.now()}`;
        const payload = { event: 'deploy', sha: 'abc123' };

        const res = await request(app)
            .post(`/hooks/${hookId}`)
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('received');
        expect(res.body.id).toBe(hookId);

        // Verify stored via inspect
        const inspect = await request(app).get(`/hooks/${hookId}/inspect`);
        expect(inspect.status).toBe(200);
        expect(inspect.body.length).toBe(1);
        expect(inspect.body[0].method).toBe('POST');
        expect(inspect.body[0].body).toMatchObject(payload);
    });

    it('should capture request metadata (headers, query, method)', async () => {
        const hookId = `meta-${Date.now()}`;

        await request(app)
            .put(`/hooks/${hookId}`)
            .query({ source: 'ci' })
            .set('X-Custom-Header', 'test-value')
            .send({ data: 1 });

        const inspect = await request(app).get(`/hooks/${hookId}/inspect`);
        expect(inspect.body[0].method).toBe('PUT');
        expect(inspect.body[0].headers['x-custom-header']).toBe('test-value');
        expect(inspect.body[0].query).toMatchObject({ source: 'ci' });
    });

    it('should accept GET requests as webhooks', async () => {
        const hookId = `get-${Date.now()}`;

        const res = await request(app).get(`/hooks/${hookId}`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('received');
    });

    it('should store newest webhooks first (unshift order)', async () => {
        const hookId = `order-${Date.now()}`;

        await request(app).post(`/hooks/${hookId}`).send({ seq: 1 });
        await request(app).post(`/hooks/${hookId}`).send({ seq: 2 });
        await request(app).post(`/hooks/${hookId}`).send({ seq: 3 });

        const inspect = await request(app).get(`/hooks/${hookId}/inspect`);
        expect(inspect.body.length).toBe(3);
        // Most recent first
        expect(inspect.body[0].body).toMatchObject({ seq: 3 });
        expect(inspect.body[2].body).toMatchObject({ seq: 1 });
    });

    // --- P1: FIFO trimming at MAX_WEBHOOKS (50) ---

    it('should trim webhooks to 50 per hook ID', async () => {
        const hookId = `trim-${Date.now()}`;

        // Send 55 webhooks
        for (let i = 0; i < 55; i++) {
            await request(app)
                .post(`/hooks/${hookId}`)
                .send({ seq: i });
        }

        const inspect = await request(app).get(`/hooks/${hookId}/inspect`);
        expect(inspect.body.length).toBe(50);

        // The most recent (seq: 54) should be first, oldest trimmed
        expect(inspect.body[0].body).toMatchObject({ seq: 54 });
        expect(inspect.body[49].body).toMatchObject({ seq: 5 });
    });

    // --- P2: Multi-hookId isolation ---

    it('should isolate webhooks by hook ID', async () => {
        const hookA = `iso-a-${Date.now()}`;
        const hookB = `iso-b-${Date.now()}`;

        await request(app).post(`/hooks/${hookA}`).send({ target: 'a' });
        await request(app).post(`/hooks/${hookB}`).send({ target: 'b' });

        const inspectA = await request(app).get(`/hooks/${hookA}/inspect`);
        const inspectB = await request(app).get(`/hooks/${hookB}/inspect`);

        expect(inspectA.body.length).toBe(1);
        expect(inspectA.body[0].body).toMatchObject({ target: 'a' });

        expect(inspectB.body.length).toBe(1);
        expect(inspectB.body[0].body).toMatchObject({ target: 'b' });
    });

    it('should return empty array for unknown hook ID', async () => {
        const inspect = await request(app).get(`/hooks/nonexistent-${Date.now()}/inspect`);
        expect(inspect.status).toBe(200);
        expect(inspect.body).toEqual([]);
    });
});
