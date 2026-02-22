import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
    getAttackerProfile,
    recordDeceptionSignal,
    recordRequestSignal,
    recordTarpitSignal,
    resetAttackerTracker,
} from "../src/attacker-tracker.js";

describe("attacker tracker", () => {
    beforeEach(() => {
        resetAttackerTracker();
    });

    it("aggregates weighted risk and timeline for a persistent attacker identity", () => {
        recordRequestSignal({
            ip: "203.0.113.42",
            method: "GET",
            path: "/api/orders",
            status: 200,
            timestamp: "2026-02-22T00:00:00.000Z",
        });
        recordRequestSignal({
            ip: "203.0.113.42",
            method: "GET",
            path: "/admin",
            status: 403,
            timestamp: "2026-02-22T00:00:10.000Z",
        });
        recordDeceptionSignal({
            ip: "203.0.113.42",
            type: "honeypot_hit",
            route: "/admin",
            timestamp: "2026-02-22T00:00:20.000Z",
        });
        recordTarpitSignal({
            ip: "203.0.113.42",
            action: "trapped",
            timestamp: "2026-02-22T00:00:30.000Z",
        });

        const profile = getAttackerProfile("203.0.113.42");
        expect(profile).toBeTruthy();
        expect(profile?.riskScore).toBe(112); // 1 request + (1 + 10 blocked) + 50 deception + 50 tarpit
        expect(profile?.counters.requests).toBe(2);
        expect(profile?.counters.blocked).toBe(1);
        expect(profile?.counters.deception).toBe(1);
        expect(profile?.counters.tarpitTrapped).toBe(1);
        expect(profile?.timeline.length).toBe(4);
        expect(profile?.timeline[0]?.kind).toBe("tarpit");
    });

    it("serves registry and profile APIs with filtering and sorting", async () => {
        const app = createApp();

        recordRequestSignal({ ip: "203.0.113.10", path: "/health", status: 200 });
        recordDeceptionSignal({ ip: "8.8.8.8", type: "sqli_probe", route: "/search" });
        recordTarpitSignal({ ip: "8.8.8.8", action: "trapped" });

        const registry = await request(app).get("/api/attackers?minRisk=10");
        expect(registry.status).toBe(200);
        expect(registry.body.count).toBe(1);
        expect(registry.body.tracked).toBe(2);
        expect(registry.body.profiles[0].ip).toBe("8.8.8.8");
        expect(registry.body.profiles[0].riskScore).toBe(100);

        const detail = await request(app).get("/api/attackers/8.8.8.8");
        expect(detail.status).toBe(200);
        expect(detail.body.ip).toBe("8.8.8.8");
        expect(detail.body.counters.deception).toBe(1);
        expect(detail.body.counters.tarpitTrapped).toBe(1);

        const missing = await request(app).get("/api/attackers/198.51.100.99");
        expect(missing.status).toBe(404);
    });
});
