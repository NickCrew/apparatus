import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import jwt from 'jsonwebtoken';

const app = createApp();

describe('Advanced Features', () => {
    describe('JWT Debugger', () => {
        it('should decode a valid JWT', async () => {
            // Create a dummy JWT (unsigned/dummy is fine for decode-only handler)
            const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
            const response = await request(app)
                .get('/debug/jwt')
                .set('Authorization', `Bearer ${token}`);
            
            expect(response.status).toBe(200);
            expect(response.body.payload.name).toBe('John Doe');
        });

        it('should fail with missing header', async () => {
            const response = await request(app).get('/debug/jwt');
            expect(response.status).toBe(400);
        });

        it('should decode with POST payload and validate RS256 signature', async () => {
            const forged = await request(app).post('/auth/forge').send({ sub: 'debug-user' });
            expect(forged.status).toBe(200);

            const response = await request(app)
                .post('/debug/jwt')
                .send({ token: forged.body.token });

            expect(response.status).toBe(200);
            expect(response.body.valid).toBe(true);
            expect(response.body.payload.sub).toBe('debug-user');
        });

        it('should reject malformed token via POST', async () => {
            const response = await request(app)
                .post('/debug/jwt')
                .send({ token: 'not-a-jwt' });

            expect(response.status).toBe(400);
            expect(response.body.valid).toBe(false);
        });
    });

    describe('Identity Token Forge', () => {
        it('should forge a token and verify it in secure mode', async () => {
            const forged = await request(app).post('/auth/forge').send({ sub: 'alice', role: 'user' });
            expect(forged.status).toBe(200);
            expect(forged.body).toHaveProperty('token');
            expect(forged.body).toHaveProperty('hints.publicKey');

            const verify = await request(app)
                .post('/auth/verify')
                .send({ token: forged.body.token });

            expect(verify.status).toBe(200);
            expect(verify.body.valid).toBe(true);
            expect(verify.body.bypassed).toBe(false);
            expect(verify.body.mode).toBe('secure');
        });

        it('should reject alg=none unless vulnerability flag is enabled', async () => {
            const forged = await request(app).post('/auth/forge').send({ sub: 'none-user' });
            const decoded = jwt.decode(forged.body.token, { complete: true });
            expect(decoded && typeof decoded !== 'string').toBeTruthy();
            const parsed = decoded as jwt.Jwt;

            const noneHeader = { ...parsed.header, alg: 'none' };
            const noneToken = `${Buffer.from(JSON.stringify(noneHeader)).toString('base64url')}.${Buffer.from(JSON.stringify(parsed.payload)).toString('base64url')}.`;

            const rejected = await request(app)
                .post('/auth/verify')
                .send({ token: noneToken });
            expect(rejected.status).toBe(401);
            expect(rejected.body.valid).toBe(false);

            const accepted = await request(app)
                .post('/auth/verify')
                .send({
                    token: noneToken,
                    vulnerabilities: { allowNoneAlg: true },
                });
            expect(accepted.status).toBe(200);
            expect(accepted.body.valid).toBe(true);
            expect(accepted.body.mode).toBe('none_alg');
        });

        it('should accept weak key token only when weak-key mode is enabled', async () => {
            const weakToken = jwt.sign(
                { sub: 'attacker', role: 'admin' },
                'secret',
                { algorithm: 'HS256' }
            );

            const rejected = await request(app)
                .post('/auth/verify')
                .send({ token: weakToken });
            expect(rejected.status).toBe(401);
            expect(rejected.body.valid).toBe(false);

            const accepted = await request(app)
                .post('/auth/verify')
                .send({
                    token: weakToken,
                    vulnerabilities: { allowWeakKey: true },
                });
            expect(accepted.status).toBe(200);
            expect(accepted.body.valid).toBe(true);
            expect(accepted.body.mode).toBe('weak_key');
            expect(accepted.body.matchedKey).toBe('secret');
        });

        it('should allow key confusion token only when key-confusion mode is enabled', async () => {
            const forged = await request(app).post('/auth/forge').send({ sub: 'confusion-seed' });
            const publicKey = forged.body?.hints?.publicKey;
            expect(typeof publicKey).toBe('string');

            const confusedToken = jwt.sign(
                { sub: 'mallory', role: 'admin' },
                publicKey,
                { algorithm: 'HS256' }
            );

            const rejected = await request(app)
                .post('/auth/verify')
                .send({ token: confusedToken });
            expect(rejected.status).toBe(401);
            expect(rejected.body.valid).toBe(false);

            const accepted = await request(app)
                .post('/auth/verify')
                .send({
                    token: confusedToken,
                    vulnerabilities: { allowKeyConfusion: true },
                });

            expect(accepted.status).toBe(200);
            expect(accepted.body.valid).toBe(true);
            expect(accepted.body.mode).toBe('key_confusion');
        });
    });

    describe('Rate Limiter', () => {
        it('should allow requests within limit', async () => {
            const response = await request(app).get('/ratelimit');
            expect(response.status).toBe(200);
            expect(response.body.remaining).toBeLessThan(10);
        });
    });

    describe('Bandwidth Sink', () => {
        it('should consume uploaded data', async () => {
            const data = Buffer.alloc(1024, 'X');
            const response = await request(app)
                .post('/sink')
                .send(data);
            
            expect(response.status).toBe(200);
            expect(response.body.bytesReceived).toBe(1024);
        });
    });

    describe('Payload Generator', () => {
        it('should generate requested size', async () => {
            const response = await request(app).get('/generate?size=10k');
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Buffer);
            expect((response.body as Buffer).length).toBe(10240);
        });
    });

    describe('OIDC Mock', () => {
        it('should provide JWKS', async () => {
            const response = await request(app).get('/.well-known/jwks.json');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('keys');
        });

        it('should mint a token', async () => {
            const response = await request(app).post('/auth/token').send({ user: "test" });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('access_token');
        });
    });
});
