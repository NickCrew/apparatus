import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createVirtualGhost, resetGhostStateForTests } from "../src/ghosting.js";

const app = createApp();

describe("Ghost API Mocker", () => {
    beforeEach(() => {
        resetGhostStateForTests();
    });

    afterEach(() => {
        resetGhostStateForTests();
    });

    it("creates, lists, and serves a virtual ghost endpoint", async () => {
        const createRes = await request(app)
            .post("/ghosts")
            .send({
                route: "/api/checkout",
                method: "POST",
                responseBody: { ok: true, source: "ghost" },
                behavior: {
                    latencyMs: 0,
                    errorRate: 0,
                },
            });

        expect(createRes.status).toBe(201);
        expect(createRes.body.id).toBeTruthy();

        const hitRes = await request(app)
            .post("/api/checkout")
            .send({ cartId: "123" });
        expect(hitRes.status).toBe(200);
        expect(hitRes.body).toEqual({ ok: true, source: "ghost" });
        expect(hitRes.headers["x-ghost-id"]).toBe(createRes.body.id);

        const listRes = await request(app).get("/ghosts");
        expect(listRes.status).toBe(200);
        expect(Array.isArray(listRes.body.ghosts)).toBe(true);
        expect(listRes.body.ghosts).toHaveLength(1);
        expect(listRes.body.ghosts[0].requestCount).toBe(1);
    });

    it("returns injected failures when errorRate is 100", async () => {
        const createRes = await request(app)
            .post("/ghosts")
            .send({
                route: "/api/flaky",
                method: "GET",
                responseBody: { ok: true },
                behavior: {
                    latencyMs: 0,
                    errorRate: 100,
                },
            });

        expect(createRes.status).toBe(201);

        const hitRes = await request(app).get("/api/flaky");
        expect(hitRes.status).toBe(500);
        expect(hitRes.body.error).toContain("Ghost injected failure");
        expect(hitRes.body.ghostId).toBe(createRes.body.id);
    });

    it("deletes a ghost and stops intercepting traffic", async () => {
        const createRes = await request(app)
            .post("/ghosts")
            .send({
                route: "/api/remove-me",
                method: "GET",
                responseBody: { mocked: true },
            });
        const ghostId = createRes.body.id as string;

        const deleteRes = await request(app).delete(`/ghosts/${ghostId}`);
        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.status).toBe("deleted");

        const hitRes = await request(app).get("/api/remove-me");
        expect(hitRes.status).toBe(200);
        expect(hitRes.body.path).toBe("/api/remove-me");
        expect(hitRes.headers["x-ghost-id"]).toBeUndefined();
    });

    it("rejects ghosts that shadow protected infrastructure routes", async () => {
        const res = await request(app)
            .post("/ghosts")
            .send({
                route: "/healthz",
                method: "GET",
                responseBody: { ok: false },
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain("reserved");
    });

    it("allows non-management routes that start with /ghost", async () => {
        const createRes = await request(app)
            .post("/ghosts")
            .send({
                route: "/ghostship",
                method: "GET",
                responseBody: { mocked: true },
            });

        expect(createRes.status).toBe(201);

        const hitRes = await request(app).get("/ghostship");
        expect(hitRes.status).toBe(200);
        expect(hitRes.body).toEqual({ mocked: true });
    });

    it("enforces a maximum number of virtual ghosts", () => {
        for (let i = 0; i < 500; i += 1) {
            createVirtualGhost({
                route: `/api/cap-${i}`,
                method: "GET",
                responseBody: { index: i },
            });
        }

        expect(() => createVirtualGhost({
            route: "/api/cap-overflow",
            method: "GET",
            responseBody: { overflow: true },
        })).toThrow("Maximum number of virtual ghosts reached");
    });

    it("accepts IPv4-mapped IPv6 loopback targets and rejects privileged ports", async () => {
        const dottedMapped = await request(app)
            .post("/ghosts/start")
            .send({ target: "http://[::ffff:127.0.0.1]:8090", delay: 25 });
        expect(dottedMapped.status).toBe(200);
        expect(dottedMapped.body.status).toBe("started");

        await request(app).post("/ghosts/stop");

        const hexMapped = await request(app)
            .post("/ghosts/start")
            .send({ target: "http://[::ffff:7f00:1]:8090", delay: 25 });
        expect(hexMapped.status).toBe(200);
        expect(hexMapped.body.status).toBe("started");

        await request(app).post("/ghosts/stop");

        const restricted = await request(app)
            .post("/ghosts/start")
            .send({ target: "http://127.0.0.1:22", delay: 25 });
        expect(restricted.status).toBe(400);
        expect(restricted.body.error).toContain("port is not allowed");
    });
});
