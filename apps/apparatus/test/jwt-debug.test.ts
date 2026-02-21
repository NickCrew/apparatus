import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import * as oidc from '../src/oidc.js';

const app = createApp();

function getLifetimeSeconds(payload: Record<string, unknown>): number {
  expect(typeof payload.iat).toBe('number');
  expect(typeof payload.exp).toBe('number');
  return (payload.exp as number) - (payload.iat as number);
}

function expectLifetimeInRange(payload: Record<string, unknown>, min: number, max: number): void {
  const lifetime = getLifetimeSeconds(payload);
  expect(lifetime).toBeGreaterThanOrEqual(min);
  expect(lifetime).toBeLessThanOrEqual(max);
}

async function forgeToken(body: Record<string, unknown> = {}) {
  const response = await request(app).post('/auth/forge').send(body);
  expect(response.status).toBe(200);
  expect(typeof response.body.token).toBe('string');
  return response;
}

describe('JWT Debug and Token Forge Coverage', () => {
  describe('authVerify validation', () => {
    it('rejects missing token', async () => {
      const response = await request(app).post('/auth/verify').send({});
      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.message).toBe('Missing token');
    });

    it('rejects malformed token', async () => {
      const response = await request(app).post('/auth/verify').send({ token: 'garbage' });
      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.mode).toBe('invalid');
      expect(response.body.message).toBe('Malformed JWT');
    });

    it('rejects whitespace-only token values', async () => {
      const response = await request(app).post('/auth/verify').send({ token: '   ' });
      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.message).toBe('Missing token');
    });

    it('rejects unknown HS256 token when all verification paths fail', async () => {
      const token = jwt.sign({ sub: 'mallory', role: 'admin' }, 'ultra-strong-secret', { algorithm: 'HS256' });

      const response = await request(app).post('/auth/verify').send({ token });
      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
      expect(response.body.mode).toBe('invalid');
      expect(response.body.message).toContain('alg=HS256');
      expect(response.body.header).toBeTruthy();
      expect(response.body.payload).toBeTruthy();
    });

    it('keeps weak-key attack disabled when vulnerabilities object is empty', async () => {
      const token = jwt.sign({ sub: 'attacker' }, 'secret', { algorithm: 'HS256' });

      const response = await request(app)
        .post('/auth/verify')
        .send({ token, vulnerabilities: {} });

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });

    it('matches non-first weak dictionary key when weak-key mode is enabled', async () => {
      const token = jwt.sign({ sub: 'attacker' }, 'letmein', { algorithm: 'HS256' });

      const response = await request(app)
        .post('/auth/verify')
        .send({ token, vulnerabilities: { allowWeakKey: true } });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.mode).toBe('weak_key');
      expect(response.body.matchedKey).toBe('letmein');
      expect(response.body.bypassed).toBe(true);
      expect(response.body.payload.sub).toBe('attacker');
    });

    it('matches first weak dictionary key when weak-key mode is enabled', async () => {
      const token = jwt.sign({ sub: 'first-weak-key' }, 'secret', { algorithm: 'HS256' });

      const response = await request(app)
        .post('/auth/verify')
        .send({ token, vulnerabilities: { allowWeakKey: true } });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.mode).toBe('weak_key');
      expect(response.body.matchedKey).toBe('secret');
      expect(response.body.bypassed).toBe(true);
    });

    it('returns secure mode for valid RS256 forged tokens', async () => {
      const forged = await forgeToken({ sub: 'secure-user' });

      const response = await request(app)
        .post('/auth/verify')
        .send({ token: forged.body.token });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.bypassed).toBe(false);
      expect(response.body.mode).toBe('secure');
      expect(response.body.payload.sub).toBe('secure-user');
    });

    it('keeps secure mode even when all vulnerability flags are enabled for a valid RS256 token', async () => {
      const forged = await forgeToken({ sub: 'secure-with-flags' });

      const response = await request(app)
        .post('/auth/verify')
        .send({
          token: forged.body.token,
          vulnerabilities: {
            allowNoneAlg: true,
            allowWeakKey: true,
            allowKeyConfusion: true,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.mode).toBe('secure');
      expect(response.body.bypassed).toBe(false);
    });

    it('rejects alg=none token by default and accepts when enabled', async () => {
      const forged = await forgeToken({ sub: 'none-user' });
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
      expect(rejected.body.mode).toBe('invalid');

      const accepted = await request(app)
        .post('/auth/verify')
        .send({ token: noneToken, vulnerabilities: { allowNoneAlg: true } });
      expect(accepted.status).toBe(200);
      expect(accepted.body.valid).toBe(true);
      expect(accepted.body.bypassed).toBe(true);
      expect(accepted.body.mode).toBe('none_alg');
      expect(accepted.body.payload.sub).toBe('none-user');
    });

    it('prioritizes none-alg branch when all vulnerability flags are enabled', async () => {
      const forged = await forgeToken({ sub: 'none-priority' });
      const decoded = jwt.decode(forged.body.token, { complete: true });
      expect(decoded && typeof decoded !== 'string').toBeTruthy();
      const parsed = decoded as jwt.Jwt;

      const noneHeader = { ...parsed.header, alg: 'none' };
      const noneToken = `${Buffer.from(JSON.stringify(noneHeader)).toString('base64url')}.${Buffer.from(JSON.stringify(parsed.payload)).toString('base64url')}.`;

      const response = await request(app)
        .post('/auth/verify')
        .send({
          token: noneToken,
          vulnerabilities: {
            allowNoneAlg: true,
            allowWeakKey: true,
            allowKeyConfusion: true,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.mode).toBe('none_alg');
    });

    it('prioritizes weak-key branch before key-confusion when both flags are enabled', async () => {
      const token = jwt.sign({ sub: 'weak-priority' }, 'secret', { algorithm: 'HS256' });

      const response = await request(app)
        .post('/auth/verify')
        .send({
          token,
          vulnerabilities: {
            allowWeakKey: true,
            allowKeyConfusion: true,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.mode).toBe('weak_key');
    });

    it('accepts key-confusion token only when key-confusion mode is enabled', async () => {
      const forged = await forgeToken({ sub: 'confusion-seed' });
      const publicKey = forged.body?.hints?.publicKey as string;
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
        .send({ token: confusedToken, vulnerabilities: { allowKeyConfusion: true } });
      expect(accepted.status).toBe(200);
      expect(accepted.body.valid).toBe(true);
      expect(accepted.body.mode).toBe('key_confusion');
      expect(accepted.body.payload.sub).toBe('mallory');
    });

    it('falls through to 401 when key-confusion mode is enabled but token is signed with the wrong secret', async () => {
      const token = jwt.sign({ sub: 'wrong-secret' }, 'not-the-public-key', { algorithm: 'HS256' });

      const response = await request(app)
        .post('/auth/verify')
        .send({ token, vulnerabilities: { allowKeyConfusion: true } });

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });

    it('falls through to 401 when weak-key mode is enabled but dictionary has no match', async () => {
      const token = jwt.sign({ sub: 'no-dictionary-match' }, 'super-strong-secret', { algorithm: 'HS256' });

      const response = await request(app)
        .post('/auth/verify')
        .send({ token, vulnerabilities: { allowWeakKey: true } });

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });

    it('handles non-string alg header values with alg=unknown fallback', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 123, typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: 'unknown-alg' })).toString('base64url');
      const token = `${header}.${payload}.signature`;

      const response = await request(app).post('/auth/verify').send({ token });
      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
      expect(response.body.message).toContain('alg=unknown');
    });

    it('handles non-object request body for verify endpoint', async () => {
      const response = await request(app)
        .post('/auth/verify')
        .set('Content-Type', 'text/plain')
        .send('plain-text');

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.message).toBe('Missing token');
    });
  });

  describe('debug token extraction and errors', () => {
    it('returns decoded fields for valid JWT via GET /debug/jwt', async () => {
      const forged = await forgeToken({ sub: 'get-debug-user' });

      const response = await request(app)
        .get('/debug/jwt')
        .set('Authorization', `Bearer ${forged.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body.token).toBe(forged.body.token);
      expect(response.body.header.alg).toBe('RS256');
      expect(response.body.payload.sub).toBe('get-debug-user');
      expect(typeof response.body.signature).toBe('string');
      expect(response.body.signature.length).toBeGreaterThan(0);
    });

    it('returns 400 when POST /debug/jwt has no token in body or header', async () => {
      const response = await request(app).post('/debug/jwt').send({});

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('Missing token');
    });

    it('returns 400 when POST /debug/jwt receives malformed JWT', async () => {
      const response = await request(app).post('/debug/jwt').send({ token: 'not.a.jwt' });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.header).toEqual({});
      expect(response.body.payload).toEqual({});
      expect(response.body.error).toContain('Invalid JWT token structure');
    });

    it('rejects GET /debug/jwt without any Authorization header', async () => {
      const response = await request(app).get('/debug/jwt');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Bearer token required');
    });

    it('rejects Bearer prefix without a separating space', async () => {
      const response = await request(app)
        .get('/debug/jwt')
        .set('Authorization', 'Bearer');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Bearer token required');
    });

    it('supports POST /debug/jwt token fallback from Authorization header', async () => {
      const forged = await forgeToken({ sub: 'header-fallback' });

      const response = await request(app)
        .post('/debug/jwt')
        .set('Authorization', `Bearer ${forged.body.token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.payload.sub).toBe('header-fallback');
    });

    it('prefers body token over Authorization header in POST /debug/jwt', async () => {
      const bodyToken = await forgeToken({ sub: 'body-token' });
      const headerToken = await forgeToken({ sub: 'header-token' });

      const response = await request(app)
        .post('/debug/jwt')
        .set('Authorization', `Bearer ${headerToken.body.token}`)
        .send({ token: bodyToken.body.token });

      expect(response.status).toBe(200);
      expect(response.body.payload.sub).toBe('body-token');
    });

    it('falls back to Authorization header when body token is whitespace-only', async () => {
      const headerToken = await forgeToken({ sub: 'fallback-from-whitespace' });

      const response = await request(app)
        .post('/debug/jwt')
        .set('Authorization', `Bearer ${headerToken.body.token}`)
        .send({ token: '   ' });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.payload.sub).toBe('fallback-from-whitespace');
    });

    it('falls back to Authorization header when body token is non-string', async () => {
      const headerToken = await forgeToken({ sub: 'fallback-non-string' });

      const response = await request(app)
        .post('/debug/jwt')
        .set('Authorization', `Bearer ${headerToken.body.token}`)
        .send({ token: 12345 });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.payload.sub).toBe('fallback-non-string');
    });

    it('returns invalid verification details for non-RS256 token via POST /debug/jwt', async () => {
      const token = jwt.sign({ sub: 'hs-user' }, 'secret', { algorithm: 'HS256' });

      const response = await request(app).post('/debug/jwt').send({ token });
      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(typeof response.body.error).toBe('string');
      expect(response.body.header.alg).toBe('HS256');
      expect(response.body.payload.sub).toBe('hs-user');
    });

    it('rejects non-Bearer Authorization headers for GET /debug/jwt', async () => {
      const response = await request(app)
        .get('/debug/jwt')
        .set('Authorization', 'Basic abc123');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Bearer token required');
    });

    it('rejects empty Bearer tokens for GET /debug/jwt', async () => {
      const response = await request(app)
        .get('/debug/jwt')
        .set('Authorization', 'Bearer   ');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Bearer token required');
    });

    it('rejects malformed Bearer token structure for GET /debug/jwt', async () => {
      const response = await request(app)
        .get('/debug/jwt')
        .set('Authorization', 'Bearer malformed-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid JWT token structure');
    });
  });

  describe('forge response contract and claim precedence', () => {
    it('returns token_type and attack hints with stripped public key', async () => {
      const response = await forgeToken();

      expect(response.body.token_type).toBe('Bearer');
      expect(response.body.header.alg).toBe('RS256');
      expect(response.body.header.kid).toBe('simulated-key-id-1');
      expect(response.body.header.typ).toBe('JWT');
      expect(response.body.hints.weakKeys).toEqual(['secret', 'password', '123456', 'letmein', 'apparatus']);
      expect(response.body.hints.publicKey).not.toContain('BEGIN PUBLIC KEY');
      expect(response.body.hints.publicKey).not.toContain('\n');
    });

    it('sets default subject, role, issuer, and audience', async () => {
      const response = await forgeToken();

      expect(response.body.payload.sub).toBe('analyst@example.local');
      expect(response.body.payload.role).toBe('user');
      expect(response.body.payload.iss).toBe('urn:apparatus:token-forge');
      expect(response.body.payload.aud).toBe('urn:apparatus:client');
    });

    it('merges custom claims into payload', async () => {
      const response = await forgeToken({
        claims: {
          department: 'security',
          level: 5,
        },
      });

      expect(response.body.payload.department).toBe('security');
      expect(response.body.payload.level).toBe(5);
    });

    it('keeps issuer and audience constants even when claims attempt overrides', async () => {
      const response = await forgeToken({
        claims: {
          iss: 'evil-issuer',
          aud: 'evil-audience',
        },
      });

      expect(response.body.payload.iss).toBe('urn:apparatus:token-forge');
      expect(response.body.payload.aud).toBe('urn:apparatus:client');
    });

    it('uses claims.sub and claims.role when top-level values are not provided', async () => {
      const response = await forgeToken({
        claims: {
          sub: 'claims-subject',
          role: 'claims-role',
        },
      });

      expect(response.body.payload.sub).toBe('claims-subject');
      expect(response.body.payload.role).toBe('claims-role');
    });

    it('prefers top-level sub/role over nested claims values', async () => {
      const response = await forgeToken({
        sub: 'top-level-sub',
        role: 'top-level-role',
        claims: {
          sub: 'claims-subject',
          role: 'claims-role',
        },
      });

      expect(response.body.payload.sub).toBe('top-level-sub');
      expect(response.body.payload.role).toBe('top-level-role');
    });

    it('handles non-object claims input safely', async () => {
      const stringClaims = await forgeToken({ claims: 'invalid-claims' });
      expect(stringClaims.body.payload.sub).toBe('analyst@example.local');

      const arrayClaims = await forgeToken({ claims: [1, 2, 3] });
      expect(arrayClaims.body.payload.role).toBe('user');
    });

    it('handles non-object request body safely', async () => {
      const response = await request(app)
        .post('/auth/forge')
        .set('Content-Type', 'text/plain')
        .send('hello-world');

      expect(response.status).toBe(200);
      expect(response.body.payload.sub).toBe('analyst@example.local');
      expect(response.body.payload.role).toBe('user');
    });

    it('returns structured 500 response when key material loading fails', async () => {
      const keySpy = vi.spyOn(oidc, 'getOidcSigningMaterial').mockRejectedValueOnce(new Error('simulated-key-failure'));

      const response = await request(app).post('/auth/forge').send({});
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Token forge failed');
      expect(response.body.details).toContain('simulated-key-failure');

      keySpy.mockRestore();
    });
  });

  describe('expiresIn normalization boundaries', () => {
    it('defaults to one hour for invalid or zero values', async () => {
      const invalid = await forgeToken({ expiresIn: 'abc' });
      expectLifetimeInRange(invalid.body.payload, 3599, 3601);

      const zero = await forgeToken({ expiresIn: '0h' });
      expectLifetimeInRange(zero.body.payload, 3599, 3601);

      const decimal = await forgeToken({ expiresIn: '1.5h' });
      expectLifetimeInRange(decimal.body.payload, 3599, 3601);

      const numeric = await forgeToken({ expiresIn: 3600 });
      expectLifetimeInRange(numeric.body.payload, 3599, 3601);

      const nullExpiry = await forgeToken({ expiresIn: null });
      expectLifetimeInRange(nullExpiry.body.payload, 3599, 3601);
    });

    it('caps excessive expiry values to 24 hours', async () => {
      const response = await forgeToken({ expiresIn: '999d' });
      expectLifetimeInRange(response.body.payload, 86399, 86401);
    });

    it('accepts supported time units including uppercase unit suffix', async () => {
      const thirtySeconds = await forgeToken({ expiresIn: '30s' });
      expectLifetimeInRange(thirtySeconds.body.payload, 29, 31);

      const fifteenMinutes = await forgeToken({ expiresIn: '15m' });
      expectLifetimeInRange(fifteenMinutes.body.payload, 899, 901);

      const twoHoursUppercase = await forgeToken({ expiresIn: '2H' });
      expectLifetimeInRange(twoHoursUppercase.body.payload, 7199, 7201);

      const oneDay = await forgeToken({ expiresIn: '1d' });
      expectLifetimeInRange(oneDay.body.payload, 86399, 86401);

      const trimmed = await forgeToken({ expiresIn: '  2h  ' });
      expectLifetimeInRange(trimmed.body.payload, 7199, 7201);
    });
  });
});
