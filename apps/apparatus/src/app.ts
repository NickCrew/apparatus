import express, { Express } from "express";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import compression from "compression";
import multer from "multer";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { cfg } from "./config.js";
import { logger } from "./logger.js";
import { echoHandler, sseHandler } from "./echoHandler.js";
import { sseBroadcaster, broadcastRequest } from "./sse-broadcast.js";
import { register, httpRequestDurationMicroseconds, httpRequestsTotal } from "./metrics.js";
import { swaggerDocument } from "./swagger.js";
import { getHistory, clearHistory } from "./history.js";
import { proxyHandler } from "./proxy.js";
import { authForgeHandler, authVerifyHandler, jwtDebugHandler, jwtDebugPostHandler } from "./jwt-debug.js";
import { rateLimitHandler } from "./ratelimit.js";
import { graphqlHandler } from "./graphql.js";
import { jwksHandler, tokenMintHandler, oidcDiscoveryHandler } from "./oidc.js";
import { sinkHandler } from "./sink.js";
import { dlpHandler } from "./dlp.js";
import { generatorHandler } from "./generator.js";
import { sysInfoHandler } from "./sysinfo.js";
import { dnsHandler, pingHandler } from "./infra-debug.js";
import { webhookReceiveHandler, webhookListHandler } from "./webhook.js";
import { eicarHandler, crashHandler, cpuSpikeHandler, getChaosStatus, memorySpikeHandler } from "./chaos.js";
import { kvHandler } from "./kv.js";
import { scriptHandler } from "./scripting.js";
import { pcapHandler, harReplayHandler, livePacketHandler } from "./forensics.js";
import { clusterAttackHandler, clusterAttackStopHandler, getClusterMembers } from "./cluster.js";
import { tarpitMiddleware, tarpitListHandler, tarpitReleaseHandler, tarpitTrapHandler } from "./tarpit.js";
import { blackholeAddHandler, blackholeListHandler, blackholeMiddleware, blackholeReleaseHandler } from "./blackhole.js";
import { selfHealingMiddleware, getHealthStatus } from "./self-healing.js";
import { deceptionHandler, deceptionHistoryHandler, deceptionClearHandler } from "./deception.js";
import { redTeamFuzzerRunHandler, redTeamValidateHandler } from "./redteam.js";
import { activeShieldMiddleware, sentinelHandler } from "./sentinel.js";
import {
    ghostCreateHandler,
    ghostDeleteHandler,
    ghostHandler,
    ghostMockMiddleware,
    ghostStartHandler,
    ghostStopHandler,
} from "./ghosting.js";
import { polymorphicRouteMiddleware, mtdHandler } from "./mtd.js";
import { victimRouter } from "./victim/index.js";
import { chat } from "./ai/client.js";
import {
    autopilotConfigHandler,
    autopilotKillHandler,
    autopilotReportsHandler,
    autopilotStartHandler,
    autopilotStatusHandler,
    autopilotStopHandler,
} from "./ai/redteam.js";
import { runEscapeScan } from "./escape/index.js";
import { triggerSupplyChainAttack } from "./simulator/supply-chain.js";
import { getGraphHandler, injectMalwareHandler, resetGraphHandler } from "./simulator/dependency-graph.js";
import { scenarioListHandler, scenarioSaveHandler, scenarioRunHandler, scenarioRunStatusHandler } from "./scenarios.js";
import {
    drillCancelHandler,
    drillDebriefHandler,
    drillListHandler,
    drillMarkDetectedHandler,
    drillRunHandler,
    drillStatusHandler,
} from "./drills.js";
import { startDemoLoop, stopDemoLoop, getDemoConfig, updateDemoConfig, type DemoConfig } from "./demo-mode.js";
import { attackerProfileHandler, attackerRegistryHandler } from "./attacker-tracker.js";
import { readdirSync } from "fs";
import { readdir } from "fs/promises";
import { request } from "undici";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

export function createApp(): Express {
    const app = express();
    app.set("trust proxy", false);
    const isTrafficPattern = (value: unknown): value is DemoConfig["pattern"] => {
        return value === "steady" || value === "sine" || value === "spiky";
    };
    const clampNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    if (cfg.demoMode) {
        logger.warn("Demo mode enabled: CORS allows all origins. Do not expose this instance to untrusted networks.");
    }

    const runningInContainer = Boolean(process.env.KUBERNETES_SERVICE_HOST) || existsSync("/.dockerenv");
    if (cfg.host === "127.0.0.1" && runningInContainer) {
        logger.warn("HOST is set to 127.0.0.1 in a containerized environment. Set HOST=0.0.0.0 for external/container networking.");
    }

    const safeOrigins = new Set([
        "http://localhost:8080",
        "http://localhost:8090",
        "http://localhost:4173",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8090",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ]);

    // 0. CORS (safe localhost defaults, permissive only in demo mode)
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        
        if (typeof origin === 'string') {
            // Strict: only allow if origin is present AND matches (or demo mode is on)
            const isAllowed = cfg.demoMode || safeOrigins.has(origin);

            if (isAllowed) {
                res.setHeader("Access-Control-Allow-Origin", origin);
                res.setHeader("Vary", "Origin");
                res.setHeader("Access-Control-Allow-Headers", "*");
                res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
            }
        }

        if (req.method === "OPTIONS") {
            // Always return 204. If not allowed, headers are missing -> browser blocks.
            return res.sendStatus(204);
        }

        next();
    });

    // 0.1 Critical Infrastructure (Always accessible)
    app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));
    app.get("/health/pro", (_req, res) => res.json(getHealthStatus()));
    app.get("/sse", sseHandler);
    app.get("/metrics", async (_req, res) => {
        try {
            res.set("Content-Type", register.contentType);
            res.end(await register.metrics());
        } catch {
            res.status(500).json({ error: "Failed to collect metrics" });
        }
    });

    // 0.2 Dashboard Documentation API (Always accessible for help system)
    app.get("/api/docs-index", (_req, res) => {
        const docsIndexPath = path.join(__dirname, "dist-dashboard", "docs-index.json");
        res.sendFile(docsIndexPath, (error) => {
            if (error && !res.headersSent) {
                res.status(404).json({ error: "Documentation index not found" });
            }
        });
    });

    // 0.3 Global Mitigation (Blackhole)
    // Hard-drop layer intentionally placed before adaptive defenses so blocked
    // actors cannot consume additional resources deeper in the stack.
    app.use(blackholeMiddleware);

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

    // Security Gate for Dangerous Endpoints
    const securityGate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const directIp = req.socket.remoteAddress;
        
        if (!directIp) {
            return res.status(403).json({ error: "Access denied: Unknown source." });
        }

        const isLocal =
            directIp === "127.0.0.1" ||
            directIp === "::1" ||
            directIp === "::ffff:127.0.0.1" ||
            directIp.startsWith("::ffff:127.");
            
        if (!cfg.demoMode && !isLocal) {
            return res.status(403).json({ error: "Access denied. Enable demo mode or use localhost." });
        }
        next();
    };

    // Protect dangerous endpoints
    app.use("/api/simulator", securityGate);
    app.use("/api/redteam/autopilot", securityGate);
    app.use("/_sensor", securityGate);
    app.use("/proxy", securityGate);

    // Virtual Ghost endpoints should be resolved before route handlers.
    app.use(ghostMockMiddleware);
    
    // Scenario Engine
    app.get("/scenarios", securityGate, scenarioListHandler);
    app.post("/scenarios", securityGate, scenarioSaveHandler);
    app.post("/scenarios/:id/run", securityGate, scenarioRunHandler);
    app.get("/scenarios/:id/status", securityGate, scenarioRunStatusHandler);

    // Breach Protocol Drill Engine
    app.get("/drills", securityGate, drillListHandler);
    app.post("/drills/:id/run", securityGate, drillRunHandler);
    app.get("/drills/:id/status", securityGate, drillStatusHandler);
    app.post("/drills/:id/mark-detected", securityGate, drillMarkDetectedHandler);
    app.post("/drills/:id/cancel", securityGate, drillCancelHandler);
    app.get("/drills/:id/debrief", securityGate, drillDebriefHandler);

    // Attacker Fingerprinting
    app.get("/api/attackers", securityGate, attackerRegistryHandler);
    app.get("/api/attackers/:ip", securityGate, attackerProfileHandler);

    // Swagger Documentation
    app.use("/docs", swaggerUi.serve as unknown as express.RequestHandler[], swaggerUi.setup(swaggerDocument) as unknown as express.RequestHandler);

    // Demo Mode & Integrations Control (Dashboard parity)
    app.get("/_sensor/demo", (_req, res) => {
        res.json({ success: true, ...getDemoConfig() });
    });

    app.all("/_sensor/demo/toggle", (_req, res) => {
        const config = getDemoConfig();
        if (config.enabled) {
            stopDemoLoop();
        } else {
            startDemoLoop();
        }
        res.json({ success: true, ...getDemoConfig() });
    });

    app.put("/_sensor/demo/config", (req, res) => {
        const body = req.body;
        if (!body || typeof body !== 'object') {
             return res.status(400).json({ error: "Invalid payload" });
        }

        const updates: Partial<DemoConfig> = {};
        const { intensity, errorRate, latencyBase, attackFrequency, pattern, targetPath } = body;

        if (Number.isFinite(intensity)) updates.intensity = clampNumber(Number(intensity), 0, 100);
        if (Number.isFinite(errorRate)) updates.errorRate = clampNumber(Number(errorRate), 0, 100);
        if (Number.isFinite(latencyBase)) updates.latencyBase = clampNumber(Number(latencyBase), 0, 30000);
        if (Number.isFinite(attackFrequency)) updates.attackFrequency = clampNumber(Number(attackFrequency), 0, 100);
        if (isTrafficPattern(pattern)) updates.pattern = pattern;
        if (typeof targetPath === 'string' && targetPath.startsWith('/')) updates.targetPath = targetPath;
        if (targetPath === null) updates.targetPath = targetPath;

        updateDemoConfig(updates);
        res.json({ success: true, ...getDemoConfig() });
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

    // Serve static files with SVG MIME type support
    app.use("/dashboard", express.static(dashboardPath, {
        setHeaders: (res, path) => {
            if (path.endsWith('.svg')) {
                res.setHeader('Content-Type', 'image/svg+xml');
            }
        }
    }));

    app.get("/autopilot", (_req, res) => res.redirect("/dashboard/autopilot"));

    // SPA Fallback for Dashboard
    app.get("/dashboard/*", (_req, res) => {
        res.sendFile(path.join(dashboardPath, "index.html"));
    });

    // Serve Static Assets
    app.use("/assets", express.static(path.join(process.cwd(), "assets"), {
        setHeaders: (res, path) => {
            if (path.endsWith('.svg')) {
                res.setHeader('Content-Type', 'image/svg+xml');
            }
        }
    }));

    // Debugging Tools
    app.get("/debug/jwt", jwtDebugHandler);
    app.post("/debug/jwt", jwtDebugPostHandler);
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
    app.post("/auth/forge", securityGate, authForgeHandler);
    app.post("/auth/verify", securityGate, authVerifyHandler);

    // Bandwidth Tests
    app.post("/sink", sinkHandler);
    app.get("/generate", generatorHandler);
    app.get("/dlp", dlpHandler);
    
    // Security & Chaos
    app.get("/malicious", eicarHandler);
    app.post("/chaos/crash", crashHandler);
    app.all("/chaos/cpu", cpuSpikeHandler); // Allow GET (old) and POST (new)
    app.all("/chaos/memory", memorySpikeHandler); // Allow GET (old) and POST (new)
    app.get("/chaos/status", securityGate, (_req, res) => {
        res.json(getChaosStatus());
    });

    // Advanced Logic
    app.all("/kv/:key", kvHandler);
    app.post("/script", scriptHandler);

    // Network Forensics
    app.get("/capture.pcap", pcapHandler);
    app.get("/api/forensics/live", securityGate, livePacketHandler);
    app.post("/replay", harReplayHandler);

    // Distributed Cluster
    app.post("/cluster/attack", securityGate, clusterAttackHandler);
    app.post("/cluster/attack/stop", securityGate, clusterAttackStopHandler);
    app.get("/cluster/members", (_req, res) => res.json(getClusterMembers()));

    // Advanced Defense & Offense
    app.get("/redteam/validate", securityGate, redTeamValidateHandler);
    app.post("/api/redteam/fuzzer/run", securityGate, redTeamFuzzerRunHandler);
    app.get("/api/redteam/autopilot/config", securityGate, autopilotConfigHandler);
    app.post("/api/redteam/autopilot/start", securityGate, autopilotStartHandler);
    app.post("/api/redteam/autopilot/stop", securityGate, autopilotStopHandler);
    app.post("/api/redteam/autopilot/kill", securityGate, autopilotKillHandler);
    app.get("/api/redteam/autopilot/status", securityGate, autopilotStatusHandler);
    app.get("/api/redteam/autopilot/reports", securityGate, autopilotReportsHandler);
    app.all("/sentinel/rules", sentinelHandler);
    app.get("/ghosts", securityGate, ghostHandler);
    app.post("/ghosts", securityGate, ghostCreateHandler);
    app.delete("/ghosts/:id", securityGate, ghostDeleteHandler);
    app.post("/ghosts/start", securityGate, ghostStartHandler);
    app.post("/ghosts/stop", securityGate, ghostStopHandler);
    app.all("/mtd", mtdHandler);

    // Tarpit Monitor API
    app.get("/blackhole", securityGate, blackholeListHandler);
    app.post("/blackhole", securityGate, blackholeAddHandler);
    app.post("/blackhole/release", securityGate, blackholeReleaseHandler);
    app.get("/tarpit", securityGate, tarpitListHandler);
    app.post("/tarpit/trap", securityGate, tarpitTrapHandler);
    app.post("/tarpit/release", securityGate, tarpitReleaseHandler);

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

    // Lab Integration Endpoints
    app.get("/api/lab/k6/scenarios", securityGate, async (_req, res) => {
        try {
            if (!cfg.k6ScenariosPath) return res.json({ success: true, scenarios: [] });
            const files = (await readdir(cfg.k6ScenariosPath))
                .filter(f => f.endsWith('.js'))
                .map(f => ({ name: f, path: f }));
            res.json({ success: true, scenarios: files });
        } catch (e: unknown) {
            logger.error({ error: e }, "Failed to list k6 scenarios");
            res.status(500).json({ error: "Failed to list k6 scenarios" });
        }
    });

    app.get("/api/lab/nuclei/templates", securityGate, async (_req, res) => {
        try {
            if (!cfg.nucleiTemplatesPath) return res.json({ success: true, templates: [] });
            const files = (await readdir(cfg.nucleiTemplatesPath))
                .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
                .map(f => ({ name: f, path: f }));
            res.json({ success: true, templates: files });
        } catch (e: unknown) {
            logger.error({ error: e }, "Failed to list nuclei templates");
            res.status(500).json({ error: "Failed to list nuclei templates" });
        }
    });

    // Infrastructure Status Proxies
    app.get("/api/infra/status", securityGate, (_req, res) => {
        // Status checks are primarily configuration-based manifests
        // In a real implementation, these would query the running server instances
        res.json({
            success: true,
            servers: [
                { name: "HTTP/1.1", protocol: "tcp", port: cfg.portHttp1, status: "active" },
                { name: "HTTP/2 TLS", protocol: "tcp", port: cfg.portHttp2, status: "active" },
                { name: "HTTP/2 Cleartext (h2c)", protocol: "tcp", port: cfg.portHttp1 + 1, status: cfg.enableH2C ? "active" : "disabled" },
                { name: "gRPC", protocol: "tcp", port: cfg.portGrpc, status: "active" },
                { name: "WebSocket", protocol: "ws", port: cfg.portHttp1, path: "/ws", status: "active" },
                { name: "Redis Mock", protocol: "tcp", port: cfg.portRedis, status: "active" },
                { name: "MQTT Broker", protocol: "tcp", port: cfg.portMqtt, status: "active" },
                { name: "SMTP Receiver", protocol: "tcp", port: cfg.portSmtp, status: "active" },
                { name: "Syslog Receiver", protocol: "udp", port: cfg.portSyslog, status: "active" },
                { name: "Syslog Alt", protocol: "udp", port: cfg.portSyslogAlt, status: "active" },
                { name: "ICAP Server", protocol: "tcp", port: cfg.portIcap, status: "active" },
                { name: "TCP Echo", protocol: "tcp", port: cfg.portTcp, status: "active" },
                { name: "UDP Echo", protocol: "udp", port: cfg.portUdp, status: "active" },
                { name: "Bad SSL", protocol: "tcp", port: cfg.portBadSsl, status: "active" },
            ]
        });
    });

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
    
    app.get("/api/simulator/dependencies", securityGate, getGraphHandler);
    app.post("/api/simulator/dependencies/infect", securityGate, injectMalwareHandler);
    app.post("/api/simulator/dependencies/reset", securityGate, resetGraphHandler);

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
