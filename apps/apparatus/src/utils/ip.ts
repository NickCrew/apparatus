import { isIP } from "node:net";

export function normalizeIp(ip?: unknown): string {
    if (typeof ip !== "string") {
        return "unknown";
    }

    const value = ip.trim();
    if (!value) {
        return "unknown";
    }

    if (value.startsWith("::ffff:")) {
        return value.slice("::ffff:".length);
    }
    return value;
}

export function isValidIpLiteral(ip: string): boolean {
    return isIP(ip) !== 0;
}
