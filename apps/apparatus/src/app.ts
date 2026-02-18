import express, { Express } from "express";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import compression from "compression";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { cfg } from "./config.js";
import { logger } from "./logger.js";
import { echoHandler, sseHandler } from "./echoHandler.js";
import { sseBroadcaster, broadcastRequest } from "./sse-broadcast.js";
import { register, httpRequestDurationMicroseconds, httpRequestsTotal } from "./metrics.js";
import { swaggerDocument } from "./swagger.js";
import { getHistory, clearHistory } from "./history.js";
import { proxyHandler } from "./proxy.js";
import { jwtDebugHandler } from "./jwt-debug.js";
import { rateLimitHandler } from "./ratelimit.js";
import { graphqlHandler } from "./graphql.js";
import { jwksHandler, tokenMintHandler, oidcDiscoveryHandler } from "./oidc.js";
import { sinkHandler } from "./sink.js";
import { dlpHandler } from "./dlp.js";
import { generatorHandler } from "./generator.js";
import { sysInfoHandler } from "./sysinfo.js";
import { dnsHandler, pingHandler } from "./infra-debug.js";
import { webhookReceiveHandler, webhookListHandler } from "./webhook.js";
import { eicarHandler, crashHandler, cpuSpikeHandler, memorySpikeHandler } from "./chaos.js";
import { kvHandler } from "./kv.js";
import { scriptHandler } from "./scripting.js";
import { pcapHandler, harReplayHandler } from "./forensics.js";
import { clusterAttackHandler, getClusterMembers } from "./cluster.js";
import { tarpitMiddleware, tarpitListHandler, tarpitReleaseHandler } from "./tarpit.js";
import { selfHealingMiddleware, getHealthStatus } from "./self-healing.js";
import { deceptionHandler, deceptionHistoryHandler, deceptionClearHandler } from "./deception.js";
import { redTeamValidateHandler } from "./redteam.js";
import { activeShieldMiddleware, sentinelHandler } from "./sentinel.js";
import { ghostHandler } from "./ghosting.js";
import { polymorphicRouteMiddleware, mtdHandler } from "./mtd.js";
import { victimRouter } from "./victim/index.js";
import { chat } from "./ai/client.js";
import { runEscapeScan } from "./escape/index.js";
import { triggerSupplyChainAttack } from "./simulator/supply-chain.js";
import { scenarioListHandler, scenarioSaveHandler, scenarioRunHandler } from "./scenarios.js";
import { request } from "undici";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

export function createApp(): Express {
    const app = express();

    // 0. Always enable CORS first for local dev
    app.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        if (req.method === "OPTIONS") return res.sendStatus(204);
        next();
    });

    // 1. Moving Target Defense (Hide everything if active)
    app.use(polymorphicRouteMiddleware);

    // 2. Self-Healing & QoS
    app.use(selfHealingMiddleware);

    // 2. Deception Engine (Misinformation wins)
    app.use(async (req, res, next) => {
        try {
            const trapped = await deceptionHandler(req, res);
            if (trapped || res.headersSent) return;
            next();
        } catch (error) {
            next(error); // Pass to Express error handler
        }
    });

    // 3. Tarpit Defense (Honeypot)
    app.use(tarpitMiddleware);

    app.use((req, res, next) => {
        (req as any)._startAt = Date.now();
        
        // Metrics: end timer on response finish
        const end = httpRequestDurationMicroseconds.startTimer();
        res.on("finish", () => {
            const route = req.route ? req.route.path : req.path;
            const status = res.statusCode;
            
            httpRequestsTotal.inc({
                method: req.method,
                route: route,
                status_code: status,
            });
            
            end({
                method: req.method,
                route: route,
                status_code: status,
            });

            // Global Traffic Broadcast for Dashboard
            // We only broadcast if it's NOT the SSE stream itself to avoid loops
            if (route !== "/sse") {
                broadcastRequest({
                    method: req.method,
                    path: req.path,
                    status: res.statusCode,
                    ip: req.ip,
                    timestamp: new Date().toISOString(),
                    latencyMs: Date.now() - ((req as any)._startAt || Date.now())
                });
            }
        });

        next();
    });

    if (cfg.enableCompression) {
        app.use(compression() as unknown as express.RequestHandler);
    }

    app.use(pinoHttp({ logger }));

    app.use(express.json({ limit: cfg.bodyLimit, strict: false }));
    app.use(express.urlencoded({ extended: true, limit: cfg.bodyLimit }));
    app.use(express.raw({ type: "application/octet-stream", limit: cfg.bodyLimit }));
    app.use(express.text({ type: "*/*", limit: cfg.bodyLimit }));

    // 1.5 Active Shield (Virtual Patching) - Moved here to access parsed body
    app.use(activeShieldMiddleware);

    // CORS Configuration - Restrict to localhost/safe origins in production
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        const safeOrigins = [
            "http://localhost:8080", 
            "http://localhost:8090", 
            "http://127.0.0.1:8080", 
            "http://127.0.0.1:8090"
        ];
        
        if (cfg.demoMode || (origin && safeOrigins.includes(origin)) || !origin) {
             res.setHeader("Access-Control-Allow-Origin", origin || "*");
             res.setHeader("Access-Control-Allow-Headers", "*");
             res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        }
        
        if (req.method === "OPTIONS") return res.sendStatus(204);
        next();
    });

    // Security Gate for Dangerous Endpoints
    const securityGate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const isLocal = req.ip === "127.0.0.1" || req.ip === "::1";
        if (!cfg.demoMode && !isLocal) {
            return res.status(403).json({ error: "Access denied. Enable demo mode or use localhost." });
        }
        next();
    };

    // Protect dangerous endpoints
    app.use("/api/simulator", securityGate);
    app.use("/_sensor", securityGate);
    app.use("/proxy", securityGate);
    
    // Scenario Engine
    app.get("/scenarios", securityGate, scenarioListHandler);
    app.post("/scenarios", securityGate, scenarioSaveHandler);
    app.post("/scenarios/:id/run", securityGate, scenarioRunHandler);

    // Prometheus Metrics Endpoint
    app.get("/metrics", async (_req, res) => {
        try {
            res.set("Content-Type", register.contentType);
            res.end(await register.metrics());
        } catch (ex) {
            res.status(500).send(ex);
        }
    });

    // Swagger Documentation
    app.use("/docs", swaggerUi.serve as unknown as express.RequestHandler[], swaggerUi.setup(swaggerDocument) as unknown as express.RequestHandler);

    app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));
    app.get("/health/pro", (_req, res) => res.json(getHealthStatus()));
    app.get("/sse", sseHandler);

    // Demo Mode & Integrations Control (Dashboard parity)
    app.get("/_sensor/demo", (_req, res) => {
        res.json({ success: true, demo_mode: cfg.demoMode });
    });

    app.all("/_sensor/demo/toggle", (_req, res) => {
        cfg.demoMode = !cfg.demoMode;
        logger.info(`Apparatus Demo mode toggled to: ${cfg.demoMode}`);
        res.json({ success: true, demo_mode: cfg.demoMode });
    });

    app.get("/_sensor/config/integrations", (_req, res) => {
        res.json({
            success: true,
            data: {
                tunnel_url: cfg.tunnelUrl,
                tunnel_api_key: cfg.tunnelApiKey,
                apparatus_url: `http://localhost:${cfg.portHttp1}`
            }
        });
    });

    app.put("/_sensor/config/integrations", (req, res) => {
        const { tunnel_url, tunnel_api_key } = req.body;
        if (tunnel_url !== undefined) cfg.tunnelUrl = tunnel_url;
        if (tunnel_api_key !== undefined) cfg.tunnelApiKey = tunnel_api_key;

        logger.info("Apparatus Integrations configuration updated from dashboard");
        res.json({ success: true, message: "Integrations configuration updated" });
    });

    // Request History
    app.get("/history", (_req, res) => res.json(getHistory()));
    app.delete("/history", (_req, res) => {
        clearHistory();
        res.sendStatus(204);
    });

    // Visual Dashboard - React App
    const dashboardPath = path.join(__dirname, "dist-dashboard");
    app.use("/dashboard", express.static(dashboardPath));
    
    // SPA Fallback for Dashboard
    app.get("/dashboard/*", (_req, res) => {
        res.sendFile(path.join(dashboardPath, "index.html"));
    });
    
    // Serve Static Assets
    app.use("/assets", express.static(path.join(process.cwd(), "assets")));

    // Debugging Tools
    app.get("/debug/jwt", jwtDebugHandler);
    app.get("/ratelimit", rateLimitHandler);
    app.get("/sysinfo", sysInfoHandler);
    app.get("/dns", dnsHandler);
    app.get("/ping", pingHandler);
    app.all("/hooks/:id", webhookReceiveHandler);
    app.get("/hooks/:id/inspect", webhookListHandler);

    // Modern API Features (GraphQL & OIDC)
    app.all("/graphql", graphqlHandler as unknown as express.RequestHandler);
    app.get("/.well-known/jwks.json", jwksHandler);
    app.get("/.well-known/openid-configuration", oidcDiscoveryHandler);
    app.all("/auth/token", tokenMintHandler);

    // Bandwidth Tests
    app.post("/sink", sinkHandler);
    app.get("/generate", generatorHandler);
    app.get("/dlp", dlpHandler);
    
    // Security & Chaos
    app.get("/malicious", eicarHandler);
    app.post("/chaos/crash", crashHandler);
    app.all("/chaos/cpu", cpuSpikeHandler); // Allow GET (old) and POST (new)
    app.all("/chaos/memory", memorySpikeHandler); // Allow GET (old) and POST (new)

    // Advanced Logic
    app.all("/kv/:key", kvHandler);
    app.post("/script", scriptHandler);

    // Network Forensics
    app.get("/capture.pcap", pcapHandler);
    app.post("/replay", harReplayHandler);

    // Distributed Cluster
    app.post("/cluster/attack", clusterAttackHandler);
    app.get("/cluster/members", (_req, res) => res.json(getClusterMembers()));

    // Advanced Defense & Offense
    app.get("/redteam/validate", redTeamValidateHandler);
    app.all("/sentinel/rules", sentinelHandler);
    app.get("/ghosts", ghostHandler);
    app.all("/mtd", mtdHandler);

    // Tarpit Monitor API
    app.get("/tarpit", tarpitListHandler);
    app.post("/tarpit/release", tarpitReleaseHandler);

    // Deception History API
    app.get("/deception/history", deceptionHistoryHandler);
    app.delete("/deception/history", deceptionClearHandler);

    // The Victim (Vulnerable App)
    app.use("/victim", victimRouter);

    // Proxy / SSRF Test
    app.all("/proxy", proxyHandler);

    // AI Chat API
    app.post("/api/ai/chat", async (req, res) => {
        try {
            const { sessionId, system, message } = req.body;
            const response = await chat(sessionId || "default", system || "You are a helpful assistant.", message);
            res.json({ response });
        } catch (err: any) {
            logger.error({ error: err.message }, "AI Chat Error");
            res.status(500).json({ error: err.message });
        }
    });

    // Infrastructure Status Proxies
    app.get("/api/infra/imposter", async (_req, res) => {
        try {
            const { statusCode, body } = await request("http://127.0.0.1:16925/health");
            if (statusCode === 200) {
                const data = await body.json();
                res.json(data);
            } else {
                res.status(502).json({ status: "error", code: statusCode });
            }
        } catch (e: any) {
            res.status(502).json({ status: "down", error: e.message });
        }
    });

    app.get("/api/infra/sidecar", async (_req, res) => {
        try {
            // Check sidecar by hitting its healthz which proxies to us
            const { statusCode } = await request("http://127.0.0.1:8081/healthz");
            if (statusCode === 200) {
                res.json({ status: "ok", role: "Toxic Sidecar" });
            } else {
                res.status(502).json({ status: "error", code: statusCode });
            }
        } catch (e: any) {
            res.status(502).json({ status: "down", error: e.message });
        }
    });

    // Supply Chain Simulator
    app.post("/api/simulator/supply-chain", async (req, res) => {
        try {
            const logs = await triggerSupplyChainAttack(req.body.target);
            res.json({ logs });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // Escape Artist API
    app.post("/api/escape/scan", async (req, res) => {
        try {
            const results = await runEscapeScan(req.body);
            res.json(results);
        } catch (err: any) {
            logger.error({ error: err.message }, "Escape Scan Error");
            res.status(500).json({ error: err.message });
        }
    });
    
    // Handle multipart uploads on any route
    app.all("*", upload.any() as unknown as express.RequestHandler, echoHandler);

    return app;
}
