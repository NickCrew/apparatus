import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import * as jose from "jose";
import { getOidcSigningMaterial } from "./oidc.js";

type JsonRecord = Record<string, unknown>;

interface ForgeRequest {
    sub?: string;
    role?: string;
    expiresIn?: string;
    claims?: JsonRecord;
}

interface VulnerabilityFlags {
    allowNoneAlg?: boolean;
    allowWeakKey?: boolean;
    allowKeyConfusion?: boolean;
}

interface VerifyRequest {
    token?: string;
    vulnerabilities?: VulnerabilityFlags;
}

const TOKEN_ISSUER = "urn:apparatus:token-forge";
const TOKEN_AUDIENCE = "urn:apparatus:client";
const WEAK_KEYS = ["secret", "password", "123456", "letmein", "apparatus"] as const;
const MAX_TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;
const EXPIRY_UNIT_SECONDS = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
} as const;

const DEFAULT_FLAGS: Required<VulnerabilityFlags> = {
    allowNoneAlg: false,
    allowWeakKey: false,
    allowKeyConfusion: false,
};

function getBearerToken(authHeader?: string): string | undefined {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return undefined;
    }
    const token = authHeader.slice("Bearer ".length).trim();
    return token || undefined;
}

function parseDecodedJwt(token: string): jwt.Jwt | null {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === "string") {
        return null;
    }
    return decoded;
}

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeClaims(value: unknown): JsonRecord {
    return isRecord(value) ? value : {};
}

function tokenFromRequest(req: Request): string | undefined {
    const tokenFromBody = isRecord(req.body) && typeof req.body.token === "string"
        ? req.body.token.trim()
        : undefined;
    return tokenFromBody || getBearerToken(req.headers.authorization);
}

/**
 * Strips PEM armor to produce raw base64 key material used as an HMAC secret
 * in the key-confusion simulation path.
 */
function toPublicKeySecret(publicKeyPem: string): string {
    return publicKeyPem
        .replace(/-----BEGIN PUBLIC KEY-----/g, "")
        .replace(/-----END PUBLIC KEY-----/g, "")
        .replace(/\s+/g, "")
        .trim();
}

function normalizeExpiresIn(value: string | undefined): string {
    if (!value) return "1h";

    const match = /^(\d+)([smhd])$/i.exec(value.trim());
    if (!match) return "1h";

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase() as keyof typeof EXPIRY_UNIT_SECONDS;

    if (!Number.isFinite(amount) || amount <= 0) {
        return "1h";
    }

    const seconds = amount * EXPIRY_UNIT_SECONDS[unit];
    if (seconds > MAX_TOKEN_LIFETIME_SECONDS) {
        return "24h";
    }

    return `${amount}${unit}`;
}

export function jwtDebugHandler(req: Request, res: Response) {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
        return res.status(400).json({ error: "Missing or invalid Authorization header (Bearer token required)" });
    }

    const decoded = parseDecodedJwt(token);
    if (!decoded) {
        return res.status(400).json({ error: "Invalid JWT token structure" });
    }

    return res.json({
        token,
        header: decoded.header,
        payload: decoded.payload,
        signature: decoded.signature,
    });
}

export async function jwtDebugPostHandler(req: Request, res: Response) {
    const token = tokenFromRequest(req);

    if (!token) {
        return res.status(400).json({
            valid: false,
            header: {},
            payload: {},
            error: "Missing token in body (token) or Authorization header",
        });
    }

    const decoded = parseDecodedJwt(token);
    if (!decoded) {
        return res.status(400).json({
            valid: false,
            header: {},
            payload: {},
            error: "Invalid JWT token structure",
        });
    }

    const { keyPair } = await getOidcSigningMaterial();

    let valid = false;
    let error: string | undefined;

    try {
        await jose.jwtVerify(token, keyPair.publicKey, { algorithms: ["RS256"] });
        valid = true;
    } catch (verificationError) {
        const message = verificationError instanceof Error ? verificationError.message : "Signature verification failed";
        error = message;
    }

    return res.json({
        valid,
        header: decoded.header,
        payload: decoded.payload,
        error,
    });
}

export async function authForgeHandler(req: Request, res: Response) {
    try {
        const body = isRecord(req.body) ? req.body as ForgeRequest : {};
        const claims = sanitizeClaims(body.claims);

        const sub = typeof body.sub === "string" ? body.sub : (typeof claims.sub === "string" ? claims.sub : "analyst@example.local");
        const role = typeof body.role === "string" ? body.role : (typeof claims.role === "string" ? claims.role : "user");
        const expiresIn = normalizeExpiresIn(typeof body.expiresIn === "string" ? body.expiresIn : undefined);

        const jwtPayload: jose.JWTPayload = {
            ...claims,
            iss: TOKEN_ISSUER,
            aud: TOKEN_AUDIENCE,
            sub,
            role,
        };

        const { keyPair } = await getOidcSigningMaterial();

        const token = await new jose.SignJWT(jwtPayload)
            .setProtectedHeader({ alg: "RS256", kid: "simulated-key-id-1", typ: "JWT" })
            .setIssuedAt()
            .setExpirationTime(expiresIn)
            .sign(keyPair.privateKey);

        const decoded = parseDecodedJwt(token);
        const publicKeyPem = await jose.exportSPKI(keyPair.publicKey);
        const publicKey = toPublicKeySecret(publicKeyPem);

        return res.json({
            token,
            token_type: "Bearer",
            header: decoded?.header ?? {},
            payload: decoded?.payload ?? {},
            hints: {
                weakKeys: WEAK_KEYS,
                publicKey,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Token forge failed";
        return res.status(500).json({ error: "Token forge failed", details: message });
    }
}

export async function authVerifyHandler(req: Request, res: Response) {
    const body = isRecord(req.body) ? req.body as VerifyRequest : {};
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
        return res.status(400).json({
            valid: false,
            bypassed: false,
            mode: "invalid",
            message: "Missing token",
        });
    }

    const decoded = parseDecodedJwt(token);
    if (!decoded) {
        return res.status(400).json({
            valid: false,
            bypassed: false,
            mode: "invalid",
            message: "Malformed JWT",
        });
    }

    const flags: Required<VulnerabilityFlags> = {
        allowNoneAlg: body.vulnerabilities?.allowNoneAlg ?? DEFAULT_FLAGS.allowNoneAlg,
        allowWeakKey: body.vulnerabilities?.allowWeakKey ?? DEFAULT_FLAGS.allowWeakKey,
        allowKeyConfusion: body.vulnerabilities?.allowKeyConfusion ?? DEFAULT_FLAGS.allowKeyConfusion,
    };

    const headerAlg = typeof decoded.header.alg === "string" ? decoded.header.alg : "unknown";

    if (headerAlg === "none") {
        if (flags.allowNoneAlg) {
            return res.json({
                valid: true,
                bypassed: true,
                mode: "none_alg",
                message: "Signature bypass accepted via alg=none (intentional vulnerable mode)",
                header: decoded.header,
                payload: decoded.payload,
            });
        }

        return res.status(401).json({
            valid: false,
            bypassed: false,
            mode: "invalid",
            message: "alg=none rejected",
            header: decoded.header,
            payload: decoded.payload,
        });
    }

    const { keyPair } = await getOidcSigningMaterial();

    try {
        const verified = await jose.jwtVerify(token, keyPair.publicKey, { algorithms: ["RS256"] });
        return res.json({
            valid: true,
            bypassed: false,
            mode: "secure",
            message: "Token verified against RS256 public key",
            header: decoded.header,
            payload: verified.payload,
        });
    } catch {
        // continue into vulnerable verification paths
    }

    if (flags.allowWeakKey) {
        for (const weakKey of WEAK_KEYS) {
            try {
                const weakPayload = jwt.verify(token, weakKey, { algorithms: ["HS256"] });
                return res.json({
                    valid: true,
                    bypassed: true,
                    mode: "weak_key",
                    message: `Token accepted with weak HMAC key: ${weakKey}`,
                    matchedKey: weakKey,
                    header: decoded.header,
                    payload: weakPayload,
                });
            } catch {
                // continue trying dictionary entries
            }
        }
    }

    if (flags.allowKeyConfusion) {
        const publicKeyPem = await jose.exportSPKI(keyPair.publicKey);
        const publicKeySecret = toPublicKeySecret(publicKeyPem);

        try {
            const confusedPayload = jwt.verify(token, publicKeySecret, { algorithms: ["HS256"] });
            return res.json({
                valid: true,
                bypassed: true,
                mode: "key_confusion",
                message: "Token accepted using public-key material as HMAC secret (algorithm confusion)",
                header: decoded.header,
                payload: confusedPayload,
            });
        } catch {
            // fall through to invalid response
        }
    }

    return res.status(401).json({
        valid: false,
        bypassed: false,
        mode: "invalid",
        message: `Signature verification failed for alg=${headerAlg}`,
        header: decoded.header,
        payload: decoded.payload,
    });
}
