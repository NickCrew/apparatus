import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("Demo Mode Config Validation", () => {
    it("clamps numeric fields and only accepts rooted target paths", async () => {
        const seedRes = await request(app)
            .put("/_sensor/demo/config")
            .send({ targetPath: "/seed-path" });
        expect(seedRes.status).toBe(200);

        const res = await request(app)
            .put("/_sensor/demo/config")
            .send({
                intensity: -10,
                errorRate: 250,
                latencyBase: 999999,
                attackFrequency: -5,
                targetPath: "not-rooted",
            });

        expect(res.status).toBe(200);
        expect(res.body.intensity).toBe(0);
        expect(res.body.errorRate).toBe(100);
        expect(res.body.latencyBase).toBe(30000);
        expect(res.body.attackFrequency).toBe(0);
        expect(res.body.targetPath).toBe("/seed-path");
    });
});
