import { Request, Response } from "express";
import { request } from "undici";

const PAYLOADS = {
    xss: [
        "<script>alert(1)</script>",
        "javascript:alert(1)",
        "<img src=x onerror=alert(1)>",
    ],
    sqli: [
        "' OR '1'='1",
        "UNION SELECT 1,2,3--",
        "admin' --",
    ],
    pathtraversal: [
        "../../etc/passwd",
        "..\\windows\\win.ini",
        "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    ],
    cmdinjection: [
        "; cat /etc/passwd",
        "| whoami",
        "$(whoami)",
    ],
    nosqli: [
        '{"$$gt": ""}',
        '{"$$ne": null}'
    ]
};

const FUZZER_BLOCKED_STATUS_CODES = new Set([403, 406, 429, 500, 502, 503]);
const VALIDATE_BLOCKED_STATUS_CODES = new Set([403, 406, 500]); // Preserve legacy validate endpoint behavior.
const SUPPORTED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_BODY_PREVIEW_CHARS = 8_000;
const MAX_RESPONSE_CAPTURE_BYTES = 64 * 1024;
const MAX_OUTBOUND_BODY_BYTES = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 5_000;
const MIN_TIMEOUT_MS = 250;
const MAX_TIMEOUT_MS = 20_000;
const DEFAULT_ALLOWED_FUZZER_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

type StringRecord = Record<string, string>;

interface FuzzerRunInput {
    target?: string;
    path?: string;
    method?: string;
    headers?: StringRecord;
    query?: Record<string, string | number | boolean>;
    body?: unknown;
    timeoutMs?: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is StringRecord {
    if (!isPlainObject(value)) return false;
    return Object.values(value).every((entry) => typeof entry === "string");
}

function isPrimitiveRecord(value: unknown): value is Record<string, string | number | boolean> {
    if (!isPlainObject(value)) return false;
    return Object.values(value).every((entry) => {
        return typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean";
    });
}

function normalizeMethod(method: unknown): string | null {
    if (typeof method !== "string" || method.trim().length === 0) {
        return "GET";
    }

    const normalized = method.trim().toUpperCase();
    return SUPPORTED_METHODS.has(normalized) ? normalized : null;
}

function normalizeTimeout(timeoutMs: unknown): number {
    if (typeof timeoutMs !== "number" || Number.isNaN(timeoutMs)) {
        return DEFAULT_TIMEOUT_MS;
    }
    return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, Math.floor(timeoutMs)));
}

function classifyFuzzerBlockedStatus(status: number): boolean {
    return FUZZER_BLOCKED_STATUS_CODES.has(status);
}

function classifyValidateBlockedStatus(status: number): boolean {
    return VALIDATE_BLOCKED_STATUS_CODES.has(status);
}

function buildPreview(bodyText: string): string {
    if (bodyText.length <= MAX_BODY_PREVIEW_CHARS) return bodyText;
    return `${bodyText.slice(0, MAX_BODY_PREVIEW_CHARS)}\n...[truncated]`;
}

function normalizeResponseHeaders(headers: Record<string, string | string[] | undefined>): StringRecord {
    const normalized: StringRecord = {};
    for (const [key, value] of Object.entries(headers)) {
        if (value === undefined) continue;
        normalized[key] = Array.isArray(value) ? value.join(", ") : value;
    }
    return normalized;
}

function normalizeHost(hostname: string): string {
    return hostname.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

function isLoopbackIpv4Host(hostname: string): boolean {
    const match = hostname.match(/^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!match) return false;
    return match.slice(1).every((octet) => {
        const value = Number(octet);
        return Number.isInteger(value) && value >= 0 && value <= 255;
    });
}

function configuredAllowedFuzzerHosts(): Set<string> {
    const allowed = new Set(DEFAULT_ALLOWED_FUZZER_HOSTS);
    const raw = process.env.APPARATUS_FUZZER_ALLOWED_TARGETS;

    if (!raw) return allowed;
    for (const candidate of raw.split(",")) {
        const normalized = normalizeHost(candidate);
        if (normalized.length > 0) {
            allowed.add(normalized);
        }
    }
    return allowed;
}

function isAllowedFuzzerTargetHost(hostname: string): boolean {
    const normalized = normalizeHost(hostname);
    if (normalized.startsWith("::ffff:")) return false;
    if (normalized.includes(":") && normalized !== "::1") return false;
    if (isLoopbackIpv4Host(normalized)) return true;
    return configuredAllowedFuzzerHosts().has(normalized);
}

function normalizePath(pathValue: string): string | null {
    const trimmed = pathValue.trim();
    if (trimmed.length === 0) return "/echo";
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("//")) {
        return null;
    }
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function buildDefaultTarget(req: Request): string {
    const port = req.socket.localPort;
    if (typeof port === "number" && port > 0) {
        return `${req.protocol}://127.0.0.1:${port}`;
    }
    return `${req.protocol}://127.0.0.1`;
}

function hasContentTypeHeader(headers: StringRecord): boolean {
    return Object.keys(headers).some((key) => key.toLowerCase() === "content-type");
}

async function readResponsePreview(body: AsyncIterable<Uint8Array> | null): Promise<{
    bodyPreview: string;
    bodyBytes: number;
    truncated: boolean;
}> {
    if (!body) {
        return { bodyPreview: "", bodyBytes: 0, truncated: false };
    }

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let truncated = false;

    for await (const chunk of body) {
        const buffer = Buffer.from(chunk);
        const remaining = MAX_RESPONSE_CAPTURE_BYTES - Math.min(totalBytes, MAX_RESPONSE_CAPTURE_BYTES);
        if (remaining > 0) {
            chunks.push(buffer.length <= remaining ? buffer : buffer.subarray(0, remaining));
        }

        totalBytes += buffer.length;
        if (totalBytes >= MAX_RESPONSE_CAPTURE_BYTES) {
            truncated = true;
            break;
        }
    }

    const previewText = Buffer.concat(chunks).toString("utf8");
    const bodyPreview = buildPreview(previewText);

    const readableBody = body as (AsyncIterable<Uint8Array> & { destroy?: () => void }) | null;
    if (truncated && typeof readableBody?.destroy === "function") {
        readableBody.destroy();
    }

    return {
        bodyPreview,
        bodyBytes: totalBytes,
        truncated,
    };
}

function normalizeUpstreamError(error: unknown): { code: string; message: string } {
    const rawCode = isPlainObject(error) && typeof error.code === "string" ? error.code : "";

    if (rawCode === "UND_ERR_HEADERS_TIMEOUT" || rawCode === "UND_ERR_BODY_TIMEOUT") {
        return { code: "upstream_timeout", message: "Upstream request timed out." };
    }
    if (rawCode === "ENOTFOUND") {
        return { code: "dns_resolution_failed", message: "Target hostname could not be resolved." };
    }
    if (rawCode === "ECONNREFUSED") {
        return { code: "connection_refused", message: "Target refused the connection." };
    }
    return { code: "upstream_request_failed", message: "Upstream request failed." };
}

export async function redTeamFuzzerRunHandler(req: Request, res: Response) {
    if (!isPlainObject(req.body)) {
        return res.status(400).json({ error: "Invalid payload. Expected JSON object body." });
    }

    const payload = req.body as FuzzerRunInput;
    const rawTarget = payload.target;

    if (rawTarget !== undefined && (typeof rawTarget !== "string" || rawTarget.trim().length === 0)) {
        return res.status(400).json({ error: "target must be a non-empty string when provided." });
    }

    const target = rawTarget?.trim() || buildDefaultTarget(req);

    let targetUrl: URL;
    try {
        targetUrl = new URL(target);
    } catch {
        return res.status(400).json({ error: "target must be a valid URL." });
    }

    if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
        return res.status(400).json({ error: "target protocol must be http or https." });
    }
    if (!isAllowedFuzzerTargetHost(targetUrl.hostname)) {
        return res.status(400).json({
            error: "target hostname is not allowed. Use localhost/127.0.0.1 or configure APPARATUS_FUZZER_ALLOWED_TARGETS.",
        });
    }

    if (payload.path !== undefined && typeof payload.path !== "string") {
        return res.status(400).json({ error: "path must be a string when provided." });
    }
    const path = normalizePath(payload.path ?? "/echo");
    if (!path) {
        return res.status(400).json({ error: "path must be a relative path and cannot include a scheme or host." });
    }

    const method = normalizeMethod(payload.method);
    if (!method) {
        return res.status(400).json({ error: `Unsupported method. Supported: ${Array.from(SUPPORTED_METHODS).join(", ")}` });
    }

    if (payload.headers !== undefined && !isStringRecord(payload.headers)) {
        return res.status(400).json({ error: "headers must be an object of string values." });
    }

    if (payload.query !== undefined && !isPrimitiveRecord(payload.query)) {
        return res.status(400).json({ error: "query must be an object with string/number/boolean values." });
    }

    const timeoutMs = normalizeTimeout(payload.timeoutMs);
    const headers: StringRecord = { ...(payload.headers ?? {}) };
    const runUrl = new URL(path, targetUrl);

    if (payload.query) {
        for (const [key, value] of Object.entries(payload.query)) {
            runUrl.searchParams.set(key, String(value));
        }
    }

    let outboundBody: string | undefined;
    if (BODY_METHODS.has(method) && payload.body !== undefined) {
        if (typeof payload.body === "string") {
            outboundBody = payload.body;
        } else {
            outboundBody = JSON.stringify(payload.body);
            if (!hasContentTypeHeader(headers)) {
                headers["Content-Type"] = "application/json";
            }
        }
    }
    if (outboundBody && Buffer.byteLength(outboundBody, "utf8") > MAX_OUTBOUND_BODY_BYTES) {
        return res.status(400).json({ error: `body exceeds maximum size of ${MAX_OUTBOUND_BODY_BYTES} bytes.` });
    }

    const startedAt = Date.now();
    try {
        const upstream = await request(runUrl.toString(), {
            method,
            headers,
            body: outboundBody,
            headersTimeout: timeoutMs,
            bodyTimeout: timeoutMs,
        });
        let preview = {
            bodyPreview: "",
            bodyBytes: 0,
            truncated: false,
        };
        try {
            preview = await readResponsePreview(upstream.body);
        } catch {
            // Preserve upstream status/headers even if preview capture fails.
            preview = {
                bodyPreview: "",
                bodyBytes: 0,
                truncated: false,
            };
        }
        const durationMs = Date.now() - startedAt;
        const status = upstream.statusCode;

        return res.json({
            request: {
                method,
                url: runUrl.toString(),
                timeoutMs,
                hasBody: outboundBody !== undefined,
            },
            response: {
                status,
                blocked: classifyFuzzerBlockedStatus(status),
                durationMs,
                headers: normalizeResponseHeaders(upstream.headers),
                // When truncated, this is bytes observed before capture stopped (lower bound of full body size).
                bodyBytes: preview.bodyBytes,
                bodyPreview: preview.bodyPreview,
                bodyTruncated: preview.truncated,
            },
        });
    } catch (error: unknown) {
        const durationMs = Date.now() - startedAt;
        const normalizedError = normalizeUpstreamError(error);

        return res.json({
            request: {
                method,
                url: runUrl.toString(),
                timeoutMs,
                hasBody: outboundBody !== undefined,
            },
            response: {
                status: null,
                blocked: true,
                durationMs,
                error: normalizedError.message,
                errorCode: normalizedError.code,
                headers: {},
                bodyBytes: 0,
                bodyPreview: "",
                bodyTruncated: false,
            },
        });
    }
}

export async function redTeamValidateHandler(req: Request, res: Response) {
    const queryTarget = req.query.target;
    if (queryTarget !== undefined && typeof queryTarget !== "string") {
        return res.status(400).json({ error: "target query parameter must be a string when provided." });
    }
    const targetBase = queryTarget?.trim() || buildDefaultTarget(req);

    let targetBaseUrl: URL;
    try {
        targetBaseUrl = new URL(targetBase);
    } catch {
        return res.status(400).json({ error: "target must be a valid URL." });
    }
    if (targetBaseUrl.protocol !== "http:" && targetBaseUrl.protocol !== "https:") {
        return res.status(400).json({ error: "target protocol must be http or https." });
    }
    if (!isAllowedFuzzerTargetHost(targetBaseUrl.hostname)) {
        return res.status(400).json({
            error: "target hostname is not allowed. Use localhost/127.0.0.1 or configure APPARATUS_FUZZER_ALLOWED_TARGETS.",
        });
    }

    const queryPath = req.query.path;
    if (queryPath !== undefined && typeof queryPath !== "string") {
        return res.status(400).json({ error: "path query parameter must be a string when provided." });
    }
    const targetPath = normalizePath(queryPath ?? "/echo");
    if (!targetPath) {
        return res.status(400).json({ error: "path must be a relative path and cannot include a scheme or host." });
    }

    const method = normalizeMethod(req.query.method);
    if (!method) {
        return res.status(400).json({ error: `Unsupported method. Supported: ${Array.from(SUPPORTED_METHODS).join(", ")}` });
    }

    const results: any[] = [];

    // Helper to test a payload
    const testPayload = async (category: string, payload: string) => {
        const url = new URL(targetPath, targetBaseUrl);
        
        // Inject into Query Param "q"
        url.searchParams.set("q", payload);
        
        try {
            const start = Date.now();
            const { statusCode } = await request(url.toString(), {
                method,
                // Also inject into headers for good measure
                headers: {
                    "X-Payload": payload,
                    "User-Agent": `RedTeam/1.0 (${category})`
                }
            });
            const duration = Date.now() - start;
            
            return {
                category,
                payload,
                status: statusCode,
                blocked: classifyValidateBlockedStatus(statusCode), // Preserve legacy validate semantics.
                duration
            };
        } catch (e: any) {
            return {
                category,
                payload,
                error: e.message,
                blocked: true // Connection reset/timeout usually counts as "blocked" by network/WAF
            };
        }
    };

    // Run tests
    for (const [category, payloads] of Object.entries(PAYLOADS)) {
        for (const payload of payloads) {
            results.push(await testPayload(category, payload));
        }
    }

    res.json({
        target: targetBase + targetPath,
        summary: {
            total: results.length,
            blocked: results.filter(r => r.blocked).length,
            passed: results.filter(r => !r.blocked).length
        },
        details: results
    });
}
