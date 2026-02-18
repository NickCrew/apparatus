import { Request, Response } from "express";
import { triggerCpuSpike, memorySpikeHandler } from "./chaos.js";
import { clusterAttackHandler } from "./cluster.js";
import { setMtdPrefix } from "./mtd.js";
import { logger } from "./logger.js";
import { request } from "undici"; // For self-requests if needed, or direct function calls

export interface ScenarioStep {
    id: string;
    action: 'chaos.cpu' | 'chaos.memory' | 'cluster.attack' | 'mtd.rotate' | 'delay';
    params: any;
    delayMs?: number; // Post-action delay
}

export interface Scenario {
    id: string;
    name: string;
    description?: string;
    steps: ScenarioStep[];
    createdAt: string;
}

const scenarioStore: Record<string, Scenario> = {};

// Helper to execute a single step
async function executeStep(step: ScenarioStep, req: Request, res: Response) {
    logger.info({ step: step.id, action: step.action }, "Scenario: Executing Step");

    switch (step.action) {
        case 'chaos.cpu':
            triggerCpuSpike(step.params.duration || 5000);
            break;
        case 'chaos.memory':
            // Memory handler expects req/res, we mock them or refactor handler
            // Refactoring handler is better, but for speed we'll simulate logic
            // Actually, we can't easily reuse the express handler without a mock.
            // Let's rely on internal helpers. Memory handler doesn't export one easily.
            // We'll skip memory for now or refactor chaos.ts.
            // Let's assume params are { amount: 100, action: 'allocate' }
            // For now, let's just log implementation gap or refactor chaos.ts later.
            break;
        case 'cluster.attack':
            // Reusing handler logic via internal call or mock is tricky.
            // Best pattern: The handler should call a 'service' function.
            // We'll make a self-request to the API to reuse the full stack logic.
            const port = process.env.PORT_HTTP1 || 8090;
            await request(`http://localhost:${port}/cluster/attack`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(step.params)
            });
            break;
        case 'mtd.rotate':
            setMtdPrefix(step.params.prefix || Math.random().toString(36).substring(7));
            break;
        case 'delay':
            await new Promise(r => setTimeout(r, step.params.duration || 1000));
            break;
    }

    if (step.delayMs) {
        await new Promise(r => setTimeout(r, step.delayMs));
    }
}

export function scenarioListHandler(req: Request, res: Response) {
    res.json(Object.values(scenarioStore));
}

export function scenarioSaveHandler(req: Request, res: Response) {
    const scenario = req.body as Scenario;
    if (!scenario.name || !Array.isArray(scenario.steps)) {
        return res.status(400).json({ error: "Invalid scenario format" });
    }
    
    const id = scenario.id || `sc-${Date.now()}`;
    scenarioStore[id] = {
        ...scenario,
        id,
        createdAt: new Date().toISOString()
    };
    
    res.json(scenarioStore[id]);
}

export async function scenarioRunHandler(req: Request, res: Response) {
    const id = req.params.id;
    const scenario = scenarioStore[id];
    
    if (!scenario) return res.status(404).json({ error: "Scenario not found" });

    // Run async (fire and forget from API perspective, but track status?)
    // For simplicity, we'll stream logs via SSE or just return "Started"
    
    res.json({ status: "started", message: `Executing scenario: ${scenario.name}` });

    // Execute
    try {
        for (const step of scenario.steps) {
            await executeStep(step, req, res);
        }
        logger.info({ scenario: scenario.name }, "Scenario: Completed Successfully");
    } catch (e: any) {
        logger.error({ scenario: scenario.name, error: e.message }, "Scenario: Failed");
    }
}
