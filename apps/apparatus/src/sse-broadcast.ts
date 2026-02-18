import { Response } from "express";
import { EventEmitter } from "events";
import { randomUUID } from "crypto";

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

        this.sendToClient(res, {

            type: 'health' as SSEEventType,

            timestamp: new Date().toISOString(),

            data: { status: 'connected', clientId, clients: this.clients.size }

        });



        return clientId;

    }



    private sendToClient(res: Response, event: SSEEvent): void {

        try {

            if (!res.writableEnded) {

                // Sanitize JSON to prevent SSE injection via newlines

                const jsonString = JSON.stringify(event);

                res.write(`event: ${event.type}\n`);

                res.write(`data: ${jsonString}\n\n`);

            }

        } catch (e) {

            // Client disconnected, will be cleaned up by event handlers

        }

    }



    broadcast(type: SSEEventType, data: any): void {

        const event: SSEEvent = {

            type,

            timestamp: new Date().toISOString(),

            data

        };



        for (const [, client] of this.clients) {

            this.sendToClient(client.res, event);

        }



        // Also emit locally for any internal listeners

        this.emit(type, event);

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

    sseBroadcaster.broadcast('request', request);

}



export function broadcastDeception(event: any): void {

    sseBroadcaster.broadcast('deception', event);

}



export function broadcastTarpit(action: 'trapped' | 'released', ip: string): void {

    sseBroadcaster.broadcast('tarpit', { action, ip });

}



export function broadcastHealth(status: any): void {

    sseBroadcaster.broadcast('health', status);

}



export function broadcastWebhook(hookId: string, data: any): void {

    sseBroadcaster.broadcast('webhook', { hookId, ...data });

}



