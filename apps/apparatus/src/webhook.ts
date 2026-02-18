import { Request, Response } from "express";
import { broadcastWebhook } from "./sse-broadcast.js";

interface Webhook {
    id: string;
    timestamp: string;
    method: string;
    headers: any;
    body: any;
    query: any;
    ip: string;
}

const webhookStore: Record<string, Webhook[]> = {};

// Max 50 webhooks per ID to prevent memory leaks
const MAX_WEBHOOKS = 50;

export function webhookReceiveHandler(req: Request, res: Response) {
    const hookId = req.params.id;
    
    if (!webhookStore[hookId]) {
        webhookStore[hookId] = [];
    }

    const webhook: Webhook = {
        id: hookId,
        timestamp: new Date().toISOString(),
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query,
        ip: req.ip || req.socket.remoteAddress || "unknown"
    };

    webhookStore[hookId].unshift(webhook);
    
    // Trim
    if (webhookStore[hookId].length > MAX_WEBHOOKS) {
        webhookStore[hookId] = webhookStore[hookId].slice(0, MAX_WEBHOOKS);
    }

    broadcastWebhook(hookId, webhook);

    res.status(200).json({ status: "received", id: hookId });
}

export function webhookListHandler(req: Request, res: Response) {
    const hookId = req.params.id;
    const hooks = webhookStore[hookId] || [];
    res.json(hooks);
}
