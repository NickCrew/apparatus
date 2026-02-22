import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { blackholeAddHandler, blackholeMiddleware, blackholeReleaseHandler, blackholedIps, resetBlackholeState } from '../src/blackhole.js';
import { blockedIps } from '../src/tarpit.js';
import { logger } from '../src/logger.js';
import * as sse from '../src/sse-broadcast.js';

describe('mitigation controls', () => {
    beforeEach(() => {
        resetBlackholeState();
        blockedIps.clear();
        vi.restoreAllMocks();
    });

    it('supports blackhole block/unblock and enforces middleware blocking', async () => {
        const app = createApp();
        app.set('trust proxy', true);

        const add = await request(app)
            .post('/blackhole')
            .send({ ip: '203.0.113.9' });
        expect(add.status).toBe(200);
        expect(add.body.status).toBe('blocked');
        expect(add.body.ip).toBe('203.0.113.9');
        expect(add.body.count).toBe(1);

        const list = await request(app).get('/blackhole');
        expect(list.status).toBe(200);
        expect(list.body.count).toBe(1);
        expect(list.body.blocked[0].ip).toBe('203.0.113.9');

        const blocked = await request(app)
            .get('/ratelimit')
            .set('X-Forwarded-For', '203.0.113.9');
        expect(blocked.status).toBe(403);
        expect(blocked.body.error).toContain('blackhole');
        expect(blocked.body.ip).toBe('203.0.113.9');

        const blockedMapped = await request(app)
            .get('/ratelimit')
            .set('X-Forwarded-For', '::ffff:203.0.113.9');
        expect(blockedMapped.status).toBe(403);

        const release = await request(app)
            .post('/blackhole/release')
            .send({ ip: '203.0.113.9' });
        expect(release.status).toBe(200);
        expect(release.body.status).toBe('released');

        const allowed = await request(app)
            .get('/ratelimit')
            .set('X-Forwarded-For', '203.0.113.9');
        expect(allowed.status).toBe(200);
    });

    it('allows management endpoints even when the source IP is blackholed', async () => {
        const app = createApp();
        app.set('trust proxy', true);

        await request(app)
            .post('/blackhole')
            .send({ ip: '198.51.100.10' })
            .expect(200);

        await request(app)
            .get('/blackhole')
            .set('X-Forwarded-For', '198.51.100.10')
            .expect(200);

        await request(app)
            .get('/tarpit')
            .set('X-Forwarded-For', '198.51.100.10')
            .expect(200);

        await request(app)
            .get('/api/attackers')
            .set('X-Forwarded-For', '198.51.100.10')
            .expect(200);

        const profileBypass = await request(app)
            .get('/api/attackers/198.51.100.10')
            .set('X-Forwarded-For', '198.51.100.10');
        expect(profileBypass.status).not.toBe(403);

        const blackholeSubpathBypass = await request(app)
            .get('/blackhole/release/preview')
            .set('X-Forwarded-For', '198.51.100.10');
        expect(blackholeSubpathBypass.status).not.toBe(403);

        const tarpitTrapBypass = await request(app)
            .post('/tarpit/trap')
            .set('X-Forwarded-For', '198.51.100.10')
            .send({ ip: '198.51.100.77' });
        expect(tarpitTrapBypass.status).not.toBe(403);

        await request(app)
            .get('/ratelimit')
            .set('X-Forwarded-For', '198.51.100.10')
            .expect(403);
    });

    it('rejects invalid blackhole input and returns 404 for release misses', async () => {
        const app = createApp();

        const addMissing = await request(app).post('/blackhole').send({});
        expect(addMissing.status).toBe(400);
        expect(addMissing.body.error).toBe('Invalid ip');

        await request(app).post('/blackhole').send({ ip: 'not-an-ip' }).expect(400);
        await request(app).post('/blackhole').send({ ip: '' }).expect(400);
        await request(app).post('/blackhole').send({ ip: 'unknown' }).expect(400);
        await request(app).post('/blackhole').send({ ip: 123 }).expect(400);
        await request(app).post('/blackhole').send({ ip: true }).expect(400);
        await request(app).post('/blackhole').send({ ip: ['192.0.2.1'] }).expect(400);
        await request(app).post('/blackhole').send({ ip: { value: '192.0.2.1' } }).expect(400);

        const releaseMiss = await request(app)
            .post('/blackhole/release')
            .send({ ip: '192.0.2.99' });
        expect(releaseMiss.status).toBe(404);
        expect(releaseMiss.body.error).toBe('IP not blackholed');

        await request(app).post('/blackhole').send({ ip: '198.51.100.20' }).expect(200);
        await request(app).post('/blackhole').send({ ip: '198.51.100.21' }).expect(200);

        await request(app).post('/blackhole/release').send({ ip: 123 }).expect(400);
        await request(app).post('/blackhole/release').send({ ip: true }).expect(400);
        await request(app).post('/blackhole/release').send({ ip: ['198.51.100.20'] }).expect(400);
        await request(app).post('/blackhole/release').send({ ip: { value: '198.51.100.20' } }).expect(400);
        const releaseInvalid = await request(app).post('/blackhole/release').send({ ip: 'not-an-ip' });
        expect(releaseInvalid.status).toBe(400);
        expect(releaseInvalid.body.error).toBe('Invalid ip');

        const listAfterInvalidRelease = await request(app).get('/blackhole');
        expect(listAfterInvalidRelease.status).toBe(200);
        expect(listAfterInvalidRelease.body.count).toBe(2);

        const clearViaEmpty = await request(app).post('/blackhole/release').send({ ip: '' });
        expect(clearViaEmpty.status).toBe(200);
        expect(clearViaEmpty.body.status).toBe('cleared');
        expect(clearViaEmpty.body.count).toBe(2);

        await request(app).post('/blackhole').send({ ip: '198.51.100.22' }).expect(200);
        await request(app).post('/blackhole').send({ ip: '198.51.100.23' }).expect(200);

        const clearViaUnknown = await request(app).post('/blackhole/release').send({ ip: 'UNKNOWN' });
        expect(clearViaUnknown.status).toBe(200);
        expect(clearViaUnknown.body.status).toBe('cleared');
        expect(clearViaUnknown.body.count).toBe(2);

        await request(app).post('/blackhole').send({ ip: '198.51.100.24' }).expect(200);
        await request(app).post('/blackhole').send({ ip: '198.51.100.25' }).expect(200);

        const clearViaWhitespace = await request(app).post('/blackhole/release').send({ ip: '   ' });
        expect(clearViaWhitespace.status).toBe(200);
        expect(clearViaWhitespace.body.status).toBe('cleared');
        expect(clearViaWhitespace.body.count).toBe(2);
    });

    it('normalizes mapped IPv6 addresses consistently across add, middleware, and release', async () => {
        const app = createApp();
        app.set('trust proxy', true);

        const add = await request(app).post('/blackhole').send({ ip: '::ffff:203.0.113.50' });
        expect(add.status).toBe(200);
        expect(add.body.ip).toBe('203.0.113.50');

        const list = await request(app).get('/blackhole');
        expect(list.status).toBe(200);
        expect(list.body.blocked.map((entry: { ip: string }) => entry.ip)).toContain('203.0.113.50');

        await request(app)
            .get('/ratelimit')
            .set('X-Forwarded-For', '203.0.113.50')
            .expect(403);

        const release = await request(app).post('/blackhole/release').send({ ip: '::ffff:203.0.113.50' });
        expect(release.status).toBe(200);
        expect(release.body.status).toBe('released');
        expect(release.body.ip).toBe('203.0.113.50');

        await request(app)
            .get('/ratelimit')
            .set('X-Forwarded-For', '203.0.113.50')
            .expect(200);
    });

    it('supports cross-format add and release between IPv4 and mapped IPv6 forms', async () => {
        const app = createApp();
        app.set('trust proxy', true);

        await request(app).post('/blackhole').send({ ip: '203.0.113.60' }).expect(200);
        const releaseMapped = await request(app).post('/blackhole/release').send({ ip: '::ffff:203.0.113.60' });
        expect(releaseMapped.status).toBe(200);
        expect(releaseMapped.body.status).toBe('released');
        expect(releaseMapped.body.ip).toBe('203.0.113.60');

        await request(app).post('/blackhole').send({ ip: '::ffff:203.0.113.61' }).expect(200);
        const releasePlain = await request(app).post('/blackhole/release').send({ ip: '203.0.113.61' });
        expect(releasePlain.status).toBe(200);
        expect(releasePlain.body.status).toBe('released');
        expect(releasePlain.body.ip).toBe('203.0.113.61');

        const list = await request(app).get('/blackhole');
        expect(list.status).toBe(200);
        expect(list.body.count).toBe(0);
    });

    it('is idempotent for duplicate adds and supports clear-all release', async () => {
        const app = createApp();

        await request(app).post('/blackhole').send({ ip: '203.0.113.101' }).expect(200);
        const firstList = await request(app).get('/blackhole');
        const firstBlockedAt = firstList.body.blocked[0].blockedAt;
        const duplicateMapped = await request(app).post('/blackhole').send({ ip: '::ffff:203.0.113.101' });
        expect(duplicateMapped.status).toBe(200);
        expect(duplicateMapped.body.status).toBe('blocked');
        expect(duplicateMapped.body.ip).toBe('203.0.113.101');
        expect(duplicateMapped.body.count).toBe(1);
        await request(app).post('/blackhole').send({ ip: '203.0.113.102' }).expect(200);

        const listBefore = await request(app).get('/blackhole');
        expect(listBefore.status).toBe(200);
        expect(listBefore.body.count).toBe(2);
        const sameIpAfterDuplicate = listBefore.body.blocked.find(
            (entry: { ip: string }) => entry.ip === '203.0.113.101'
        );
        expect(sameIpAfterDuplicate.blockedAt).toBe(firstBlockedAt);
        expect(Array.isArray(listBefore.body.blocked)).toBe(true);
        expect(typeof listBefore.body.blocked[0].blockedAt).toBe('number');
        expect(Number.isInteger(listBefore.body.blocked[0].duration)).toBe(true);
        expect(listBefore.body.blocked[0].duration).toBeGreaterThanOrEqual(0);

        const clearAll = await request(app)
            .post('/blackhole/release')
            .send({});
        expect(clearAll.status).toBe(200);
        expect(clearAll.body.status).toBe('cleared');
        expect(clearAll.body.count).toBe(2);

        const listAfter = await request(app).get('/blackhole');
        expect(listAfter.status).toBe(200);
        expect(listAfter.body.count).toBe(0);
        expect(listAfter.body.blocked).toEqual([]);

        const clearEmpty = await request(app)
            .post('/blackhole/release')
            .send({});
        expect(clearEmpty.status).toBe(200);
        expect(clearEmpty.body.status).toBe('cleared');
        expect(clearEmpty.body.count).toBe(0);

        await request(app).post('/blackhole').send({ ip: '203.0.113.103' }).expect(200);
        const clearViaNull = await request(app)
            .post('/blackhole/release')
            .send({ ip: null });
        expect(clearViaNull.status).toBe(200);
        expect(clearViaNull.body.status).toBe('cleared');
        expect(clearViaNull.body.count).toBe(1);
    });

    it('supports IPv6 and partial release count updates', async () => {
        const app = createApp();
        app.set('trust proxy', true);

        await request(app).post('/blackhole').send({ ip: '2001:db8::1' }).expect(200);
        await request(app).post('/blackhole').send({ ip: '2001:db8::2' }).expect(200);
        await request(app).post('/blackhole').send({ ip: '2001:db8::3' }).expect(200);

        const partial = await request(app)
            .post('/blackhole/release')
            .send({ ip: '2001:db8::2' });
        expect(partial.status).toBe(200);
        expect(partial.body.status).toBe('released');
        expect(partial.body.count).toBe(2);

        const list = await request(app).get('/blackhole');
        expect(list.status).toBe(200);
        expect(list.body.count).toBe(2);
        const ips = list.body.blocked.map((entry: { ip: string }) => entry.ip);
        expect(ips).toContain('2001:db8::1');
        expect(ips).toContain('2001:db8::3');
    });

    it('supports explicit tarpit trap and release via control API', async () => {
        const app = createApp();

        const trap = await request(app)
            .post('/tarpit/trap')
            .send({ ip: '198.51.100.77' });
        expect(trap.status).toBe(200);
        expect(trap.body.status).toBe('trapped');

        const tarpitList = await request(app).get('/tarpit');
        expect(tarpitList.status).toBe(200);
        expect(tarpitList.body.count).toBe(1);
        expect(tarpitList.body.trapped[0].ip).toBe('198.51.100.77');

        const release = await request(app)
            .post('/tarpit/release')
            .send({ ip: '198.51.100.77' });
        expect(release.status).toBe(200);
        expect(release.body.status).toBe('released');

        const after = await request(app).get('/tarpit');
        expect(after.status).toBe(200);
        expect(after.body.count).toBe(0);
    });

    it('uses socket remoteAddress fallback when req.ip is missing', () => {
        blackholedIps.add('203.0.113.11');
        const req = {
            ip: undefined,
            socket: { remoteAddress: '::ffff:203.0.113.11' },
            method: 'GET',
            path: '/ratelimit',
        } as any;
        const status = vi.fn().mockReturnThis();
        const json = vi.fn().mockReturnThis();
        const res = { status, json } as any;
        const next = vi.fn();

        blackholeMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ ip: '203.0.113.11' }));
    });

    it('uses socket remoteAddress fallback when req.ip is an empty string', () => {
        blackholedIps.add('203.0.113.12');
        const req = {
            ip: '',
            socket: { remoteAddress: '::ffff:203.0.113.12' },
            method: 'GET',
            path: '/ratelimit',
        } as any;
        const status = vi.fn().mockReturnThis();
        const json = vi.fn().mockReturnThis();
        const res = { status, json } as any;
        const next = vi.fn();

        blackholeMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ ip: '203.0.113.12' }));
    });

    it('fails closed when no source IP is available', () => {
        const req = {
            ip: undefined,
            socket: { remoteAddress: undefined },
            method: 'GET',
            path: '/ratelimit',
        } as any;
        const status = vi.fn().mockReturnThis();
        const json = vi.fn().mockReturnThis();
        const res = { status, json } as any;
        const next = vi.fn();

        blackholeMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ ip: 'unknown' }));
    });

    it('allows management requests even when source IP is unknown', () => {
        const req = {
            ip: undefined,
            socket: { remoteAddress: undefined },
            method: 'GET',
            path: '/blackhole',
        } as any;
        const status = vi.fn().mockReturnThis();
        const json = vi.fn().mockReturnThis();
        const res = { status, json } as any;
        const next = vi.fn();

        blackholeMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(status).not.toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();
    });

    it('does not emit SSE events for allowed non-blocked requests', () => {
        const broadcastSpy = vi.spyOn(sse, 'broadcastRequest').mockImplementation(() => {});
        const req = {
            ip: '198.51.100.200',
            socket: { remoteAddress: '198.51.100.200' },
            method: 'GET',
            path: '/ratelimit',
        } as any;
        const status = vi.fn().mockReturnThis();
        const json = vi.fn().mockReturnThis();
        const res = { status, json } as any;
        const next = vi.fn();

        blackholeMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(status).not.toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();
        expect(broadcastSpy).not.toHaveBeenCalled();
    });

    it('does not emit SSE events for allowlisted management bypasses', () => {
        const broadcastSpy = vi.spyOn(sse, 'broadcastRequest').mockImplementation(() => {});
        blackholedIps.add('198.51.100.201');
        const req = {
            ip: '198.51.100.201',
            socket: { remoteAddress: '198.51.100.201' },
            method: 'GET',
            path: '/blackhole',
        } as any;
        const status = vi.fn().mockReturnThis();
        const json = vi.fn().mockReturnThis();
        const res = { status, json } as any;
        const next = vi.fn();

        blackholeMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(status).not.toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();
        expect(broadcastSpy).not.toHaveBeenCalled();
    });

    it('does not allow management prefix bypass on near-match paths and emits SSE events on block', () => {
        const broadcastSpy = vi.spyOn(sse, 'broadcastRequest').mockImplementation(() => {});
        blackholedIps.add('198.51.100.88');

        for (const path of ['/blackholefoo', '/tarpitfoo', '/api/attackersfoo']) {
            const req = {
                ip: '198.51.100.88',
                socket: { remoteAddress: '198.51.100.88' },
                method: 'GET',
                path,
            } as any;
            const status = vi.fn().mockReturnThis();
            const json = vi.fn().mockReturnThis();
            const res = { status, json } as any;
            const next = vi.fn();

            blackholeMiddleware(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(status).toHaveBeenCalledWith(403);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({ ip: '198.51.100.88' }));
        }

        expect(broadcastSpy).toHaveBeenCalledWith(expect.objectContaining({
            ip: '198.51.100.88',
            status: 403,
            method: 'GET',
            latencyMs: 0,
            blockedBy: 'blackhole',
            path: '/blackholefoo',
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        }));
        expect(broadcastSpy).toHaveBeenCalledTimes(3);
    });

    it('does not allow encoded management-prefix bypasses', () => {
        blackholedIps.add('198.51.100.89');
        const req = {
            ip: '198.51.100.89',
            socket: { remoteAddress: '198.51.100.89' },
            method: 'GET',
            path: '/blackhole%2Frelease',
        } as any;
        const status = vi.fn().mockReturnThis();
        const json = vi.fn().mockReturnThis();
        const res = { status, json } as any;
        const next = vi.fn();

        blackholeMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ ip: '198.51.100.89' }));
    });

    it('does not allow case-variant management-prefix bypasses', () => {
        blackholedIps.add('198.51.100.92');
        const req = {
            ip: '198.51.100.92',
            socket: { remoteAddress: '198.51.100.92' },
            method: 'GET',
            path: '/Blackhole',
        } as any;
        const status = vi.fn().mockReturnThis();
        const json = vi.fn().mockReturnThis();
        const res = { status, json } as any;
        const next = vi.fn();

        blackholeMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ ip: '198.51.100.92' }));
    });

    it('still returns 403 when SSE broadcast throws', () => {
        blackholedIps.add('198.51.100.90');
        vi.spyOn(sse, 'broadcastRequest').mockImplementation(() => {
            throw new Error('sse unavailable');
        });

        const req = {
            ip: '198.51.100.90',
            socket: { remoteAddress: '198.51.100.90' },
            method: 'GET',
            path: '/ratelimit',
        } as any;
        const status = vi.fn().mockReturnThis();
        const json = vi.fn().mockReturnThis();
        const res = { status, json } as any;
        const next = vi.fn();

        blackholeMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ ip: '198.51.100.90' }));
    });

    it('uses current-time fallback when blackhole set and timestamps map are out of sync', async () => {
        const app = createApp();
        const now = 2_000_000;
        const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);
        try {
            blackholedIps.add('198.51.100.91');
            const list = await request(app).get('/blackhole');
            expect(list.status).toBe(200);
            const entry = list.body.blocked.find((item: { ip: string }) => item.ip === '198.51.100.91');
            expect(entry.blockedAt).toBe(now);
            expect(entry.duration).toBe(0);
        } finally {
            nowSpy.mockRestore();
        }
    });

    it('computes list duration in whole seconds', async () => {
        const app = createApp();
        let now = 1_000_000;
        const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);
        try {
            await request(app).post('/blackhole').send({ ip: '198.51.100.120' }).expect(200);
            now += 5_700;
            const list = await request(app).get('/blackhole');
            expect(list.status).toBe(200);
            const entry = list.body.blocked.find((item: { ip: string }) => item.ip === '198.51.100.120');
            expect(entry.duration).toBe(5);
        } finally {
            nowSpy.mockRestore();
        }
    });

    it('computes independent durations for multiple blocked IPs', async () => {
        const app = createApp();
        let now = 3_000_000;
        const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);
        try {
            await request(app).post('/blackhole').send({ ip: '198.51.100.160' }).expect(200);
            now += 3_000;
            await request(app).post('/blackhole').send({ ip: '198.51.100.161' }).expect(200);
            now += 4_000;

            const list = await request(app).get('/blackhole');
            expect(list.status).toBe(200);
            const entryA = list.body.blocked.find((item: { ip: string }) => item.ip === '198.51.100.160');
            const entryB = list.body.blocked.find((item: { ip: string }) => item.ip === '198.51.100.161');
            expect(entryA.duration).toBe(7);
            expect(entryB.duration).toBe(4);
        } finally {
            nowSpy.mockRestore();
        }
    });

    it('re-adds with a fresh blockedAt after single release and clear-all release', async () => {
        const app = createApp();
        let now = 10_000;
        const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);
        try {
            await request(app).post('/blackhole').send({ ip: '198.51.100.130' }).expect(200);
            await request(app).post('/blackhole/release').send({ ip: '198.51.100.130' }).expect(200);
            now += 4_000;
            await request(app).post('/blackhole').send({ ip: '198.51.100.130' }).expect(200);
            const afterSingleRelease = await request(app).get('/blackhole');
            const singleEntry = afterSingleRelease.body.blocked.find((item: { ip: string }) => item.ip === '198.51.100.130');
            expect(singleEntry.blockedAt).toBe(14_000);

            await request(app).post('/blackhole').send({ ip: '198.51.100.131' }).expect(200);
            await request(app).post('/blackhole/release').send({}).expect(200);
            now += 6_000;
            await request(app).post('/blackhole').send({ ip: '198.51.100.131' }).expect(200);
            const afterClearAll = await request(app).get('/blackhole');
            const clearEntry = afterClearAll.body.blocked.find((item: { ip: string }) => item.ip === '198.51.100.131');
            expect(clearEntry.blockedAt).toBe(20_000);
        } finally {
            nowSpy.mockRestore();
        }
    });

    it('resetBlackholeState clears all blackhole entries', async () => {
        const app = createApp();
        await request(app).post('/blackhole').send({ ip: '198.51.100.140' }).expect(200);
        await request(app).post('/blackhole').send({ ip: '198.51.100.141' }).expect(200);

        resetBlackholeState();

        const list = await request(app).get('/blackhole');
        expect(list.status).toBe(200);
        expect(list.body.count).toBe(0);
        expect(list.body.blocked).toEqual([]);
    });

    it('emits expected logger severity for add, single release, and clear-all release', () => {
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger as any);
        const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger as any);
        const status = vi.fn().mockReturnThis();
        const json = vi.fn().mockReturnThis();
        const res = { status, json } as any;

        blackholeAddHandler({ body: { ip: '198.51.100.170' } } as any, res);
        blackholeAddHandler({ body: { ip: '198.51.100.170' } } as any, res);
        blackholeReleaseHandler({ body: { ip: '198.51.100.170' } } as any, res);
        blackholeAddHandler({ body: { ip: '198.51.100.171' } } as any, res);
        blackholeReleaseHandler({ body: {} } as any, res);

        expect(warnSpy).toHaveBeenCalledWith(
            expect.objectContaining({ ip: '198.51.100.170' }),
            expect.stringContaining('blocked globally')
        );
        expect(warnSpy).toHaveBeenCalledWith(
            expect.objectContaining({ ip: '198.51.100.171' }),
            expect.stringContaining('blocked globally')
        );
        expect(warnSpy).toHaveBeenCalledTimes(2);

        expect(infoSpy).toHaveBeenCalledWith(
            expect.objectContaining({ ip: '198.51.100.170' }),
            expect.stringContaining('IP released')
        );
        expect(infoSpy).toHaveBeenCalledWith(
            expect.objectContaining({ count: 1 }),
            expect.stringContaining('all IPs released')
        );
    });
});
