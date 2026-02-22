import { Response } from "express";
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { recordDeceptionSignal, recordRequestSignal, recordTarpitSignal } from "./attacker-tracker.js";

// Configuration
const MAX_SSE_CLIENTS = 100;
const HEARTBEAT_INTERVAL_MS = 30000;

// Event types that can be broadcast
export type SSEEventType =
    | 'request'      // New HTTP request received
    | 'deception'    // Honeypot/deception event
    | 'tarpit'       // IP trapped/released
    | 'health'       // System health update
    | 'webhook'      // Webhook received

export interface SSEEvent {
    type: SSEEventType;
    timestamp: string;
    data: any;
}

interface ClientInfo {
    res: Response;
    clientId: string;
    connectedAt: Date;
    heartbeatInterval: NodeJS.Timeout;
}

// Global event emitter for SSE
export class SSEBroadcaster extends EventEmitter {
    private clients: Map<string, ClientInfo> = new Map();

    /**
     * Registers a new SSE client for receiving broadcast events.
     * @param res - Express Response object configured for SSE streaming
     * @returns clientId if added, null if max clients reached
     */
    addClient(res: Response): string | null {
        // Check max client limit (DoS protection)
        if (this.clients.size >= MAX_SSE_CLIENTS) {
            return null;
        }

        const clientId = randomUUID();

        // Setup heartbeat to keep connection alive through proxies
        const heartbeatInterval = setInterval(() => {
            if (!res.writableEnded) {
                res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
            }
        }, HEARTBEAT_INTERVAL_MS);

        const clientInfo: ClientInfo = {
            res,
            clientId,
            connectedAt: new Date(),
            heartbeatInterval
        };

        this.clients.set(clientId, clientInfo);

        // Cleanup function for all disconnect scenarios
        const cleanup = (): void => {
            const client = this.clients.get(clientId);
            if (client) {
                clearInterval(client.heartbeatInterval);
                this.clients.delete(clientId);
            }
        };

        // Handle all disconnect scenarios (P0 fix: add error/finish handlers)
        res.once('close', cleanup);
        res.once('error', cleanup);
        res.once('finish', cleanup);

        // Send connection event
        this.sendToClient(res, 'health', { status: 'connected', clientId, clients: this.clients.size });

        return clientId;
    }

    private sendToClient(res: Response, type: string, data: any): void {
        try {
            if (!res.writableEnded) {
                // Ensure data has a timestamp for the UI
                if (typeof data === 'object' && data !== null && !data.timestamp) {
                    data.timestamp = new Date().toISOString();
                }
                
                // Sanitize JSON to prevent SSE injection via newlines
                const jsonString = JSON.stringify(data);
                res.write(`event: ${type}\n`);
                res.write(`data: ${jsonString}\n\n`);
            }
        } catch (e) {
            // Client disconnected, will be cleaned up by event handlers
        }
    }

    broadcast(type: SSEEventType, data: any): void {
        for (const [, client] of this.clients) {
            this.sendToClient(client.res, type, data);
        }

        // Also emit locally for any internal listeners
        this.emit(type, { type, data, timestamp: new Date().toISOString() });
    }

    getClientCount(): number {
        return this.clients.size;
    }

    getMaxClients(): number {
        return MAX_SSE_CLIENTS;
    }
}

// Singleton instance
export const sseBroadcaster = new SSEBroadcaster();

// Convenience functions
export function broadcastRequest(request: any): void {
    if (!request.id) {
        request.id = randomUUID();
    }
    recordRequestSignal(request);
    sseBroadcaster.broadcast('request', request);
}

export function broadcastDeception(event: any): void {
    recordDeceptionSignal(event);
    sseBroadcaster.broadcast('deception', event);
}

export function broadcastTarpit(action: 'trapped' | 'released', ip: string): void {
    recordTarpitSignal({ action, ip });
    sseBroadcaster.broadcast('tarpit', { action, ip });
}

export function broadcastHealth(status: any): void {
    sseBroadcaster.broadcast('health', status);
}

export function broadcastWebhook(hookId: string, data: any): void {
    sseBroadcaster.broadcast('webhook', { hookId, ...data });
}
