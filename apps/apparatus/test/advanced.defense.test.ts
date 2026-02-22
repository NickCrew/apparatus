import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Advanced Defense & Offense', () => {
    
    describe('Red Team', () => {
        it('should run validation scan', async () => {
            // Scan itself (echo endpoint)
            const response = await request(app).get('/redteam/validate?path=/echo&method=GET');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('summary');
            expect(response.body.summary.total).toBeGreaterThan(0);
        });

        it('should preserve legacy validate blocked classification semantics', async () => {
            const response = await request(app)
                .get('/redteam/validate')
                .query({ path: '/echo?status=429', method: 'GET' });

            expect(response.status).toBe(200);
            expect(response.body.summary.blocked).toBe(0);
            expect(response.body.summary.passed).toBe(response.body.summary.total);
        });

        it('should reject non-loopback targets on validate endpoint', async () => {
            const response = await request(app)
                .get('/redteam/validate')
                .query({ target: 'http://example.com' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('not allowed');
        });

        it('should execute a single live fuzzer request', async () => {
            const response = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({
                    path: '/echo',
                    method: 'POST',
                    headers: {
                        'X-Payload': '<script>alert(1)</script>'
                    },
                    query: {
                        probe: 'xss',
                        attempt: 1
                    },
                    body: {
                        marker: 'fuzzer-m1'
                    }
                });

            expect(response.status).toBe(200);
            expect(response.body.request.method).toBe('POST');
            expect(response.body.request.url).toContain('/echo');
            expect(response.body.response.status).toBe(200);
            expect(response.body.response.durationMs).toBeGreaterThanOrEqual(0);
            expect(response.body.response.blocked).toBe(false);
            expect(response.body.response.bodyPreview).toContain('fuzzer-m1');
            expect(response.body.response.bodyPreview).toContain('probe');
            expect(response.body.response.bodyTruncated).toBe(false);
        });

        it('should reject unsupported target protocol', async () => {
            const response = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({
                    target: 'ftp://example.com',
                    path: '/echo'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('target protocol');
        });

        it('should reject disallowed target hostnames', async () => {
            const response = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({
                    target: 'http://example.com',
                    path: '/echo'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('not allowed');
        });

        it('should reject ipv6-mapped loopback hosts', async () => {
            const response = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({
                    target: 'http://[::ffff:127.0.0.1]:8090',
                    path: '/echo'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('not allowed');
        });

        it('should reject hostnames that only prefix-match loopback', async () => {
            const response = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({
                    target: 'http://127.evil.com',
                    path: '/echo'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('not allowed');
        });

        it('should honor APPARATUS_FUZZER_ALLOWED_TARGETS for custom hosts', async () => {
            const previous = process.env.APPARATUS_FUZZER_ALLOWED_TARGETS;
            process.env.APPARATUS_FUZZER_ALLOWED_TARGETS = 'localhost.';
            try {
                const response = await request(app)
                    .post('/api/redteam/fuzzer/run')
                    .send({
                        target: 'http://localhost.',
                        path: '/echo'
                    });

                expect(response.status).toBe(200);
                expect(response.body.response.blocked).toBe(true);
                expect(response.body.response.status).toBeNull();
            } finally {
                if (previous === undefined) {
                    delete process.env.APPARATUS_FUZZER_ALLOWED_TARGETS;
                } else {
                    process.env.APPARATUS_FUZZER_ALLOWED_TARGETS = previous;
                }
            }
        });

        it('should reject unsupported methods', async () => {
            const response = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({
                    path: '/echo',
                    method: 'TRACE'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Unsupported method');
        });

        it('should clamp timeoutMs to supported bounds', async () => {
            const low = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({
                    path: '/echo',
                    timeoutMs: 1
                });
            expect(low.status).toBe(200);
            expect(low.body.request.timeoutMs).toBe(250);

            const high = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({
                    path: '/echo',
                    timeoutMs: 999999
                });
            expect(high.status).toBe(200);
            expect(high.body.request.timeoutMs).toBe(20000);
        });

        it('should reject non-string header values', async () => {
            const response = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({
                    path: '/echo',
                    headers: {
                        'X-Bad': 123
                    }
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('headers');
        });

        it('should reject non-object request bodies', async () => {
            const response = await request(app)
                .post('/api/redteam/fuzzer/run')
                .set('Content-Type', 'text/plain')
                .send('not-json-object');

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Expected JSON object body');
        });

        it('should not send body for GET requests', async () => {
            const response = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({
                    path: '/echo',
                    method: 'GET',
                    body: { shouldNotSend: true }
                });

            expect(response.status).toBe(200);
            expect(response.body.request.hasBody).toBe(false);
        });

        it('should reject absolute and protocol-relative paths', async () => {
            const absolute = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({ path: 'http://evil.com/pwn' });
            expect(absolute.status).toBe(400);
            expect(absolute.body.error).toContain('relative path');

            const protocolRelative = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({ path: '//evil.com/pwn' });
            expect(protocolRelative.status).toBe(400);
            expect(protocolRelative.body.error).toContain('relative path');
        });

        it('should return normalized upstream error details', async () => {
            const response = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({
                    target: 'http://127.0.0.1:1',
                    path: '/echo',
                    timeoutMs: 1000
                });

            expect(response.status).toBe(200);
            expect(response.body.response.status).toBeNull();
            expect(response.body.response.blocked).toBe(true);
            expect(['connection_refused', 'upstream_request_failed']).toContain(response.body.response.errorCode);
            expect(response.body.response.error).toBeTruthy();
        });

        it('should pass through string bodies without JSON wrapping', async () => {
            const response = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({
                    path: '/echo',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    body: 'raw-text-payload'
                });

            expect(response.status).toBe(200);
            expect(response.body.response.status).toBe(200);
            expect(response.body.response.bodyPreview).toContain('raw-text-payload');
        });

        it('should truncate very large upstream responses safely', async () => {
            const largePayload = 'A'.repeat(220_000);
            const response = await request(app)
                .post('/api/redteam/fuzzer/run')
                .send({
                    path: '/echo',
                    method: 'POST',
                    headers: {
                        'Accept-Encoding': 'identity'
                    },
                    body: { blob: largePayload }
                });

            expect(response.status).toBe(200);
            expect(response.body.response.status).toBe(200);
            expect(response.body.response.bodyTruncated).toBe(true);
            expect(response.body.response.bodyPreview).toContain('[truncated]');
            expect(response.body.response.bodyBytes).toBeGreaterThanOrEqual(64 * 1024);
        });
    });

    describe('Sentinel (Active Shield)', () => {
        it('should allow requests by default', async () => {
            const response = await request(app).get('/echo');
            expect(response.status).toBe(200);
        });

        it('should block after adding a rule', async () => {
            // Add rule to block "bad-agent"
            await request(app).post('/sentinel/rules').send({
                pattern: "bad-agent",
                action: "block"
            });

            // Request with bad agent in body (since middleware checks url and body string)
            // Note: Middleware stringifies body.
            const response = await request(app).post('/echo').send({ agent: "bad-agent" });
            expect(response.status).toBe(403);
            expect(response.body.error).toContain("Active Shield");
        });
    });

    describe('Ghosting', () => {
        it('should start and stop ghosts', async () => {
            const startRes = await request(app).get('/ghosts?action=start&delay=100');
            expect(startRes.status).toBe(200);
            expect(startRes.body.status).toBe("started");

            const stopRes = await request(app).get('/ghosts?action=stop');
            expect(stopRes.status).toBe(200);
            expect(stopRes.body.status).toBe("stopped");
        });
    });

    describe('Moving Target Defense (MTD)', () => {
        it('should not block when inactive', async () => {
            const response = await request(app).get('/echo');
            expect(response.status).toBe(200);
        });

        it('should require prefix when active', async () => {
            // Activate MTD
            const rotateRes = await request(app).post('/mtd').send({ prefix: "secret123" });
            expect(rotateRes.body.prefix).toBe("secret123");

            // Direct access should fail
            const directRes = await request(app).get('/echo');
            expect(directRes.status).toBe(404);

            // Prefixed access should succeed
            const prefixedRes = await request(app).get('/secret123/echo');
            expect(prefixedRes.status).toBe(200);

            // Reset (disable) MTD for other tests? 
            // In a real app we might not have a disable switch easily, but here sending empty prefix might work if implemented, 
            // otherwise subsequent tests in this suite (if any) would fail.
            // Our middleware: if (!currentPrefix) return next();
            // So let's disable it by setting empty prefix if the handler allows it.
            // Handler: currentPrefix = req.body.prefix || ...
            // If we send prefix: "", it might default to random if we used ||.
            // In src/mtd.ts: req.body.prefix || Math.random()...
            // So empty string becomes random. We can't easily disable it via API without changing code.
            // But since this is the last test, it's fine.
        });
    });
});
