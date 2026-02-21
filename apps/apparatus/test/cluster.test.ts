import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startClusterNode, getClusterMembers, createClusterCommandSignature, validateAttackCommand } from '../src/cluster.js';
import request from 'supertest';
import { createApp } from '../src/app.js';
import dgram from 'dgram';

const app = createApp();

describe('Distributed Cluster', () => {
    let cluster: any;
    let port: number;

    beforeEach(() => {
        port = 40000 + Math.floor(Math.random() * 20000);
        cluster = startClusterNode({ port, host: '127.0.0.1' });
    });

    afterEach(() => {
        cluster.stop();
    });

    it('should discover nodes from beacons', async () => {
        await new Promise<void>((resolve) => {
            try {
                cluster.socket.address();
                resolve();
            } catch {
                cluster.socket.once('listening', resolve);
            }
        });

        const socket = dgram.createSocket('udp4');
        const beacon = JSON.stringify({ type: 'BEACON', ip: '192.168.1.100' });
        
        await new Promise<void>((resolve) => {
            socket.send(beacon, port, '127.0.0.1', () => {
                socket.close();
                resolve();
            });
        });

        // Give it a moment to process the UDP packet
        await new Promise(r => setTimeout(r, 100));
        
        const members = getClusterMembers();
        expect(members.map((m: any) => m.ip)).toContain('192.168.1.100');
    });

    it('should broadcast attack commands', async () => {
        const response = await request(app)
            .post('/cluster/attack')
            .send({ target: 'http://127.0.0.1:8090/echo', rate: 10 });
        
        expect(response.status).toBe(200);
        expect(response.body.message).toContain('broadcasted');
    });

    it('should reject attack command with invalid target', async () => {
        const response = await request(app)
            .post('/cluster/attack')
            .send({ target: 'http://example.com', rate: 10 });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Target host is not allowed');
    });

    it('should return 500 when attack broadcast fails', async () => {
        const createSocketSpy = vi
            .spyOn(dgram, 'createSocket')
            .mockImplementationOnce(() => {
                throw new Error('socket boom');
            });

        const response = await request(app)
            .post('/cluster/attack')
            .send({ target: 'http://127.0.0.1:8090/echo', rate: 10 });

        createSocketSpy.mockRestore();

        expect(response.status).toBe(500);
        expect(response.body.error).toContain('socket boom');
    });

    it('should clamp attack rate to max 2000', () => {
        const valid = validateAttackCommand('http://127.0.0.1:8090/echo', 999999);
        expect(valid.rate).toBe(2000);
    });

    it('should truncate fractional attack rates', () => {
        const valid = validateAttackCommand('http://127.0.0.1:8090/echo', 42.9);
        expect(valid.rate).toBe(42);
    });

    it('should expose cluster stop endpoint', async () => {
        const response = await request(app)
            .post('/cluster/attack/stop')
            .send({});

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('broadcasted');
    });
});

async function waitForCondition(predicate: () => boolean, timeoutMs = 2000, intervalMs = 25) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (predicate()) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Timed out waiting for expected condition');
}

async function waitForProcessedCommands(clusterModule: any, previousCount: number) {
    await waitForCondition(() => clusterModule.getClusterCommandMetrics().received > previousCount);
}

describe('Cluster Gossip Authorization', () => {
    let clusterModule: any;
    let cluster: any;
    let port = 0;
    const secret = 'unit-test-secret';

    beforeEach(async () => {
        vi.resetModules();
        process.env.CLUSTER_SHARED_SECRET = secret;
        delete process.env.CLUSTER_ATTACK_ALLOWLIST;

        clusterModule = await import('../src/cluster.js');
        port = 45000 + Math.floor(Math.random() * 10000);
        cluster = clusterModule.startClusterNode({ port, host: '127.0.0.1' });

        await new Promise<void>((resolve) => {
            try {
                cluster.socket.address();
                resolve();
            } catch {
                cluster.socket.once('listening', resolve);
            }
        });
    });

    afterEach(() => {
        try {
            clusterModule.stopClusterAttack();
            cluster?.stop();
        } finally {
            delete process.env.CLUSTER_SHARED_SECRET;
            delete process.env.CLUSTER_ATTACK_ALLOWLIST;
        }
    });

    async function sendSignedCommand(payload: Record<string, unknown>, signingSecret = secret) {
        const wirePayload = {
            ...payload,
            signature: createClusterCommandSignature(signingSecret, payload),
        };

        const socket = dgram.createSocket('udp4');
        await new Promise<void>((resolve) => {
            socket.send(JSON.stringify(wirePayload), port, '127.0.0.1', () => {
                socket.close();
                resolve();
            });
        });
    }

    async function sendUnsignedCommand(payload: Record<string, unknown>) {
        const socket = dgram.createSocket('udp4');
        await new Promise<void>((resolve) => {
            socket.send(JSON.stringify(payload), port, '127.0.0.1', () => {
                socket.close();
                resolve();
            });
        });
    }

    it('rejects unsigned ATTACK commands when secret is configured', async () => {
        const before = clusterModule.getClusterCommandMetrics().received;
        await sendUnsignedCommand({
            type: 'ATTACK',
            target: 'http://127.0.0.1:8090/echo',
            rate: 10,
            ts: Date.now(),
        });

        await waitForProcessedCommands(clusterModule, before);
        expect(clusterModule.isClusterAttackActive()).toBe(false);
    });

    it('rejects signed ATTACK commands with invalid target', async () => {
        const before = clusterModule.getClusterCommandMetrics().received;
        await sendSignedCommand({
            type: 'ATTACK',
            target: 'http://example.com',
            rate: 10,
            ts: Date.now(),
        });

        await waitForProcessedCommands(clusterModule, before);
        expect(clusterModule.isClusterAttackActive()).toBe(false);
    });

    it('accepts valid signed ATTACK commands within TTL', async () => {
        await sendSignedCommand({
            type: 'ATTACK',
            target: 'http://127.0.0.1:8090/echo',
            rate: 10,
            ts: Date.now(),
        });

        await waitForCondition(() => clusterModule.isClusterAttackActive() === true);
        expect(clusterModule.isClusterAttackActive()).toBe(true);
    });

    it('rejects ATTACK commands signed with the wrong secret', async () => {
        const before = clusterModule.getClusterCommandMetrics().received;
        await sendSignedCommand({
            type: 'ATTACK',
            target: 'http://127.0.0.1:8090/echo',
            rate: 10,
            ts: Date.now(),
        }, 'wrong-secret');

        await waitForProcessedCommands(clusterModule, before);
        expect(clusterModule.isClusterAttackActive()).toBe(false);
    });

    it('rejects signed ATTACK commands with expired timestamp', async () => {
        const before = clusterModule.getClusterCommandMetrics().received;
        await sendSignedCommand({
            type: 'ATTACK',
            target: 'http://127.0.0.1:8090/echo',
            rate: 10,
            ts: Date.now() - 120_000,
        });

        await waitForProcessedCommands(clusterModule, before);
        expect(clusterModule.isClusterAttackActive()).toBe(false);
    });

    it('rejects replayed signed ATTACK commands within TTL', async () => {
        const ts = Date.now();
        const command = {
            type: 'ATTACK',
            target: 'http://127.0.0.1:8090/echo',
            rate: 10,
            ts,
        };

        const firstBaseline = clusterModule.getClusterCommandMetrics().received;
        await sendSignedCommand(command);
        await waitForProcessedCommands(clusterModule, firstBaseline);
        await waitForCondition(() => clusterModule.isClusterAttackActive() === true);

        clusterModule.stopClusterAttack();
        expect(clusterModule.isClusterAttackActive()).toBe(false);

        const secondBaseline = clusterModule.getClusterCommandMetrics().received;
        const rejectedBefore = clusterModule.getClusterCommandMetrics().rejected;
        await sendSignedCommand(command);
        await waitForProcessedCommands(clusterModule, secondBaseline);

        expect(clusterModule.isClusterAttackActive()).toBe(false);
        expect(clusterModule.getClusterCommandMetrics().rejected).toBeGreaterThan(rejectedBefore);
    });

    it('rejects unsigned STOP_ATTACK commands when secret is configured', async () => {
        await sendSignedCommand({
            type: 'ATTACK',
            target: 'http://127.0.0.1:8090/echo',
            rate: 10,
            ts: Date.now(),
        });

        await waitForCondition(() => clusterModule.isClusterAttackActive() === true);
        expect(clusterModule.isClusterAttackActive()).toBe(true);

        await sendUnsignedCommand({
            type: 'STOP_ATTACK',
            ts: Date.now(),
        });

        await waitForCondition(() => clusterModule.getClusterCommandMetrics().received >= 2);
        expect(clusterModule.isClusterAttackActive()).toBe(true);
    });

    it('accepts valid signed STOP_ATTACK commands', async () => {
        await sendSignedCommand({
            type: 'ATTACK',
            target: 'http://127.0.0.1:8090/echo',
            rate: 10,
            ts: Date.now(),
        });

        await waitForCondition(() => clusterModule.isClusterAttackActive() === true);
        expect(clusterModule.isClusterAttackActive()).toBe(true);

        await sendSignedCommand({
            type: 'STOP_ATTACK',
            ts: Date.now(),
        });

        await waitForCondition(() => clusterModule.isClusterAttackActive() === false);
        expect(clusterModule.isClusterAttackActive()).toBe(false);
    });
});

describe('Cluster Attack Allowlist', () => {
    let clusterModule: any;
    let cluster: any;
    let port = 0;
    const secret = 'allowlist-test-secret';

    beforeEach(async () => {
        vi.resetModules();
        process.env.CLUSTER_SHARED_SECRET = secret;
        process.env.CLUSTER_ATTACK_ALLOWLIST = '.example.com';

        clusterModule = await import('../src/cluster.js');
        port = 56000 + Math.floor(Math.random() * 5000);
        cluster = clusterModule.startClusterNode({ port, host: '127.0.0.1' });

        await new Promise<void>((resolve) => {
            try {
                cluster.socket.address();
                resolve();
            } catch {
                cluster.socket.once('listening', resolve);
            }
        });
    });

    afterEach(() => {
        try {
            clusterModule.stopClusterAttack();
            cluster?.stop();
        } finally {
            delete process.env.CLUSTER_SHARED_SECRET;
            delete process.env.CLUSTER_ATTACK_ALLOWLIST;
        }
    });

    async function sendSignedCommand(payload: Record<string, unknown>) {
        const wirePayload = {
            ...payload,
            signature: createClusterCommandSignature(secret, payload),
        };

        const socket = dgram.createSocket('udp4');
        await new Promise<void>((resolve) => {
            socket.send(JSON.stringify(wirePayload), port, '127.0.0.1', () => {
                socket.close();
                resolve();
            });
        });
    }

    it('allows signed ATTACK for allowlisted suffix host', async () => {
        await sendSignedCommand({
            type: 'ATTACK',
            target: 'http://api.example.com',
            rate: 10,
            ts: Date.now(),
        });

        await waitForCondition(() => clusterModule.isClusterAttackActive() === true);
        expect(clusterModule.isClusterAttackActive()).toBe(true);
    });

    it('rejects signed ATTACK for non-allowlisted public host', async () => {
        const before = clusterModule.getClusterCommandMetrics().received;
        await sendSignedCommand({
            type: 'ATTACK',
            target: 'http://example.net',
            rate: 10,
            ts: Date.now(),
        });

        await waitForProcessedCommands(clusterModule, before);
        expect(clusterModule.isClusterAttackActive()).toBe(false);
    });
});

describe('Cluster Unsigned Guardrails', () => {
    let clusterModule: any;
    let cluster: any;
    let port = 0;
    const originalHost = process.env.HOST;

    beforeEach(async () => {
        vi.resetModules();
        delete process.env.CLUSTER_SHARED_SECRET;
        delete process.env.CLUSTER_ATTACK_ALLOWLIST;
        process.env.HOST = '0.0.0.0';

        clusterModule = await import('../src/cluster.js');
        port = 62000 + Math.floor(Math.random() * 2000);
        cluster = clusterModule.startClusterNode({ port, host: '127.0.0.1' });

        await new Promise<void>((resolve) => {
            try {
                cluster.socket.address();
                resolve();
            } catch {
                cluster.socket.once('listening', resolve);
            }
        });
    });

    afterEach(() => {
        try {
            clusterModule.stopClusterAttack();
            cluster?.stop();
        } finally {
            if (originalHost === undefined) {
                delete process.env.HOST;
            } else {
                process.env.HOST = originalHost;
            }
        }
    });

    it('rejects unsigned ATTACK when no secret is set and host is non-loopback', async () => {
        const before = clusterModule.getClusterCommandMetrics().received;

        const socket = dgram.createSocket('udp4');
        await new Promise<void>((resolve) => {
            socket.send(JSON.stringify({
                type: 'ATTACK',
                target: 'http://127.0.0.1:8090/echo',
                rate: 10,
                ts: Date.now(),
            }), port, '127.0.0.1', () => {
                socket.close();
                resolve();
            });
        });

        await waitForProcessedCommands(clusterModule, before);
        expect(clusterModule.isClusterAttackActive()).toBe(false);
    });
});
