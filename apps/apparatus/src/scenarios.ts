import { Request, Response } from "express";
import { logger } from "./logger.js";
import { executeToolStep, sanitizeToolParams, TOOL_ACTIONS, ToolAction } from "./tool-executor.js";

export interface ScenarioStep {
    id: string;
    action: ToolAction;
    params: Record<string, unknown>;
    delayMs?: number; // Post-action delay
}

export interface Scenario {
    id: string;
    name: string;
    description?: string;
    steps: ScenarioStep[];
    createdAt: string;
}

interface ScenarioRunStatus {
    executionId: string;
    scenarioId: string;
    scenarioName: string;
    status: "running" | "completed" | "failed";
    startedAt: string;
    finishedAt?: string;
    currentStepId?: string;
    error?: string;
}

const SCENARIO_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const VALID_SCENARIO_ACTIONS = TOOL_ACTIONS.filter((action) => action !== "chaos.crash");
const MAX_SCENARIOS = 200;
const MAX_SCENARIO_RUNS = 1000;

const scenarioStore = new Map<string, Scenario>();
const scenarioRuns = new Map<string, ScenarioRunStatus>();
const latestRunByScenario = new Map<string, string>();

// Helper to execute a single step (detached from request lifecycle)
async function executeStep(step: ScenarioStep) {
    logger.info({ step: step.id, action: step.action }, "Scenario: Executing Step");
    // Post-action step delay is applied centrally inside executeToolStep.
    const result = await executeToolStep(step);
    if (!result.ok) {
        throw new Error(result.error || result.message);
    }
}

export function scenarioListHandler(req: Request, res: Response) {
    res.json(Array.from(scenarioStore.values()));
}

export function scenarioSaveHandler(req: Request, res: Response) {
    const scenario = req.body as Scenario;
    
    // VALIDATION
    if (!scenario.name || typeof scenario.name !== 'string') return res.status(400).json({ error: "Missing name" });
    if (!Array.isArray(scenario.steps)) return res.status(400).json({ error: "Invalid steps array" });
    if (scenario.steps.length > 50) return res.status(400).json({ error: "Too many steps" });

    // Validate each step
    const validActions: ToolAction[] = [...VALID_SCENARIO_ACTIONS];
    const sanitizedSteps: ScenarioStep[] = [];
    for (const step of scenario.steps) {
        if (!validActions.includes(step.action)) return res.status(400).json({ error: `Invalid action: ${step.action}` });
        if (step.delayMs && typeof step.delayMs !== 'number') return res.status(400).json({ error: "Invalid delayMs" });
        if (!step.params || typeof step.params !== "object" || Array.isArray(step.params)) {
            return res.status(400).json({ error: `Invalid params for action: ${step.action}` });
        }
        try {
            const sanitizedParams = sanitizeToolParams(step.action, step.params as Record<string, unknown>);
            sanitizedSteps.push({
                ...step,
                params: sanitizedParams,
            });
        } catch (error: any) {
            return res.status(400).json({ error: error?.message || `Invalid params for action: ${step.action}` });
        }
    }
    
    const id = (scenario.id && typeof scenario.id === 'string') ? scenario.id : `sc-${Date.now()}`;
    if (!SCENARIO_ID_PATTERN.test(id)) {
        return res.status(400).json({ error: "Scenario id must match [a-zA-Z0-9_-]+" });
    }

    const existing = scenarioStore.get(id);
    if (!existing && scenarioStore.size >= MAX_SCENARIOS) {
        return res.status(429).json({ error: "Scenario store limit reached" });
    }
    
    const saved: Scenario = {
        ...scenario,
        id,
        steps: sanitizedSteps,
        createdAt: existing?.createdAt || new Date().toISOString()
    };
    scenarioStore.set(id, saved);
    
    res.json(saved);
}

export async function scenarioRunHandler(req: Request, res: Response) {
    const id = req.params.id;
    const scenario = scenarioStore.get(id);
    
    if (!scenario) return res.status(404).json({ error: "Scenario not found" });

    const executionId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const initialRun: ScenarioRunStatus = {
        executionId,
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        status: "running",
        startedAt: new Date().toISOString(),
    };
    scenarioRuns.set(executionId, initialRun);
    if (scenarioRuns.size > MAX_SCENARIO_RUNS) {
        const firstKey = scenarioRuns.keys().next().value;
        if (firstKey) {
            scenarioRuns.delete(firstKey);
        }
    }
    latestRunByScenario.set(scenario.id, executionId);

    res.status(202).json({
        status: "started",
        executionId,
        message: `Executing scenario: ${scenario.name}`
    });

    // Execute detached from request
    const runScenario = async () => {
        for (const step of scenario.steps) {
            const currentRun = scenarioRuns.get(executionId);
            if (!currentRun) return;
            scenarioRuns.set(executionId, {
                ...currentRun,
                currentStepId: step.id,
            });
            await executeStep(step);
        }
        const finishedRun = scenarioRuns.get(executionId);
        if (!finishedRun) return;
        scenarioRuns.set(executionId, {
            ...finishedRun,
            status: "completed",
            finishedAt: new Date().toISOString(),
        });
        logger.info({ scenario: scenario.name }, "Scenario: Completed Successfully");
    };

    setImmediate(() => {
        void runScenario().catch((error: any) => {
            const failedRun = scenarioRuns.get(executionId);
            if (!failedRun) return;
            scenarioRuns.set(executionId, {
                ...failedRun,
                status: "failed",
                finishedAt: new Date().toISOString(),
                error: error.message,
            });
            logger.error({ scenario: scenario.name, error: error.message }, "Scenario: Failed");
        });
    });
}

export function scenarioRunStatusHandler(req: Request, res: Response) {
    const scenarioId = req.params.id;
    const scenario = scenarioStore.get(scenarioId);
    if (!scenario) return res.status(404).json({ error: "Scenario not found" });

    const executionId = typeof req.query.executionId === "string"
        ? req.query.executionId
        : latestRunByScenario.get(scenarioId);
    if (!executionId) {
        return res.status(404).json({ error: "No execution found for scenario" });
    }

    const run = scenarioRuns.get(executionId);
    if (!run) {
        return res.status(404).json({ error: "Execution not found" });
    }

    res.json(run);
}
