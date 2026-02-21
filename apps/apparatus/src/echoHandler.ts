import { Request, Response } from "express";
import { addToHistory } from "./history.js";
import { sseBroadcaster, broadcastRequest } from "./sse-broadcast.js";

export async function echoHandler(req: Request, res: Response) {
    const startedAt = (req as any)._startAt as number | undefined;

    // 1. Delay Injection
    const delayParam = req.query.delay || req.headers["x-echo-delay"];
    if (delayParam) {
        const delayMs = Number(delayParam);
        if (!isNaN(delayMs) && delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    const latencyMs = startedAt ? Date.now() - startedAt : undefined;

    // 2. Status Code Injection
    let statusCode = 200;
    const statusParam = req.query.status || req.headers["x-echo-status"];
    if (statusParam) {
        const parsed = Number(statusParam);
        if (!isNaN(parsed) && parsed >= 100 && parsed <= 599) {
            statusCode = parsed;
        }
    }

    // 3. Header Injection
    const headerParam = req.headers["x-echo-set-header"];
    if (headerParam && typeof headerParam === "string") {
        try {
            const headersToSet = JSON.parse(headerParam);
            for (const [key, value] of Object.entries(headersToSet)) {
                res.setHeader(key, value as string);
            }
        } catch (e) {
            // Ignore invalid JSON in header injection to avoid crashing
        }
    }

    const body =
        typeof req.body === "object" && req.body !== null && !(req.body instanceof Buffer)
            ? req.body
            : Buffer.isBuffer(req.body)
                ? { base64: (req.body as Buffer).toString("base64") }
                : req.body;

    // Handle Multipart Files
    let files = undefined;
    if ((req as any).files && Array.isArray((req as any).files)) {
        files = ((req as any).files as any[]).map(f => ({
            fieldname: f.fieldname,
            originalname: f.originalname,
            encoding: f.encoding,
            mimetype: f.mimetype,
            size: f.size
        }));
    }

    let tlsInfo = undefined;
    if ((req.socket as any).encrypted) {
        const sock = req.socket as any;
        const cert = sock.getPeerCertificate ? sock.getPeerCertificate(true) : undefined;
        
        tlsInfo = {
            alpnProtocol: sock.alpnProtocol || undefined,
            authorized: sock.authorized ?? undefined,
            authorizationError: sock.authorizationError,
            cipher: sock.getCipher ? sock.getCipher() : undefined,
            protocol: sock.getProtocol ? sock.getProtocol() : undefined,
            clientCert: cert && Object.keys(cert).length > 0 ? {
                subject: cert.subject,
                issuer: cert.issuer,
                valid_from: cert.valid_from,
                valid_to: cert.valid_to,
                fingerprint: cert.fingerprint,
                serialNumber: cert.serialNumber
            } : undefined
        };
    }

    const payload = {
        method: req.method,
        originalUrl: req.originalUrl,
        path: req.path,
        query: req.query,
        httpVersion: req.httpVersion,
        headers: req.headers,
        ip: req.ip,
        ips: req.ips,
        body,
        files,
        tls: tlsInfo,
        timestamp: new Date().toISOString(),
        latencyMs
    };

    addToHistory(payload);
    broadcastRequest(payload); // Broadcast to SSE clients

    res.status(statusCode).json(payload);
}

export function sseHandler(req: Request, res: Response) {
    console.log(`[SSE] New client connection request from ${req.ip}`);
    
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Safely flush headers
    if (res.flushHeaders) {
        res.flushHeaders();
    } else if (res.writeHead) {
        res.writeHead(200);
    }

    // Register this client with the SSE broadcaster
    const clientId = sseBroadcaster.addClient(res);

    if (clientId === null) {
        console.error("[SSE] Max clients reached, rejecting connection");
        res.status(503).end("Too many SSE connections.");
        return;
    }

    console.log(`[SSE] Client ${clientId} registered successfully`);
}
