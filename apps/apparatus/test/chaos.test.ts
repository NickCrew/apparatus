import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { stopCpuSpike, clearMemorySpike } from '../src/chaos.js';

const app = createApp();

afterEach(() => {
    stopCpuSpike();
    clearMemorySpike();
});

describe('Chaos & Security', () => {
    it('should return EICAR test string', async () => {
        const response = await request(app).get('/malicious');
        expect(response.status).toBe(200);
        expect(response.text).toContain('EICAR-STANDARD-ANTIVIRUS-TEST-FILE');
    });

    // --- Memory ---

    it('should allocate memory via GET query param', async () => {
        const response = await request(app).get('/chaos/memory?amount=1');
        expect(response.status).toBe(200);
        expect(response.text).toContain('Allocated 1MB');
    });

    it('should allocate memory via POST body', async () => {
        const response = await request(app)
            .post('/chaos/memory')
            .send({ amount: 2 });

        expect(response.status).toBe(200);
        expect(response.text).toContain('Allocated 2MB');
    });

    it('should clear allocated memory via clear action', async () => {
        // Allocate first
        await request(app).get('/chaos/memory?amount=1');

        // Clear
        const response = await request(app)
            .post('/chaos/memory')
            .send({ action: 'clear' });

        expect(response.status).toBe(200);
        expect(response.text).toContain('Memory cleared');
    });

    it('should clear memory via GET query param', async () => {
        await request(app).get('/chaos/memory?amount=1');

        const response = await request(app).get('/chaos/memory?action=clear');
        expect(response.status).toBe(200);
        expect(response.text).toContain('Memory cleared');
    });

    it('should default to 100MB when no amount specified', async () => {
        const response = await request(app)
            .post('/chaos/memory')
            .send({});

        expect(response.status).toBe(200);
        expect(response.text).toContain('Allocated 100MB');
    });

    // --- CPU Spike ---

    it('should trigger CPU spike via POST body', async () => {
        const response = await request(app)
            .post('/chaos/cpu')
            .send({ duration: 100 });

        expect(response.status).toBe(200);
        expect(response.text).toContain('Spiking CPU for 100ms');
    });

    it('should trigger CPU spike via GET query param', async () => {
        const response = await request(app).get('/chaos/cpu?duration=100');

        expect(response.status).toBe(200);
        expect(response.text).toContain('Spiking CPU for 100ms');
    });

    it('should return 409 when CPU spike is already running', async () => {
        // Start first spike
        const first = await request(app)
            .post('/chaos/cpu')
            .send({ duration: 2000 });
        expect(first.status).toBe(200);

        // Try to start second spike while first is running
        const second = await request(app)
            .post('/chaos/cpu')
            .send({ duration: 100 });

        expect(second.status).toBe(409);
        expect(second.text).toContain('already running');
    });

    it('should default to 5000ms when no duration specified', async () => {
        const response = await request(app)
            .post('/chaos/cpu')
            .send({});

        expect(response.status).toBe(200);
        expect(response.text).toContain('Spiking CPU for 5000ms');
    });

    // --- stopCpuSpike ---

    it('should stop a running CPU spike', async () => {
        await request(app).post('/chaos/cpu').send({ duration: 5000 });

        const stopped = stopCpuSpike();
        expect(stopped).toBe(true);

        // Should now allow a new spike
        const response = await request(app)
            .post('/chaos/cpu')
            .send({ duration: 100 });
        expect(response.status).toBe(200);
    });

    it('should return false when stopping with no spike running', () => {
        const stopped = stopCpuSpike();
        expect(stopped).toBe(false);
    });
});
