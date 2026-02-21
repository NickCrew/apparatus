import { Request, Response, NextFunction } from "express";
import { MTD_SKIP_ROUTE_PREFIXES } from "./config.js";

let currentPrefix = "";

export function setMtdPrefix(prefix: string) {
    currentPrefix = prefix;
}

export function mtdHandler(req: Request, res: Response) {
    if (req.method === "POST") {
        // Rotate prefix
        currentPrefix = req.body.prefix || Math.random().toString(36).substring(7);
        return res.json({ status: "rotated", prefix: currentPrefix, instructions: "Prepend this prefix to all future API calls" });
    }
    
    res.json({ currentPrefix });
}

export function polymorphicRouteMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!currentPrefix) return next();

    // If prefix is active, req.url MUST start with it (except for system/management routes)
    if (MTD_SKIP_ROUTE_PREFIXES.some(route => req.path === route || req.path.startsWith(`${route}/`))) return next();

    if (req.url.startsWith(`/${currentPrefix}`)) {
        // Rewrite URL to strip prefix so downstream handlers work
        req.url = req.url.replace(`/${currentPrefix}`, "") || "/";
        next();
    } else {
        // 404/403 - Hide the real API
        res.status(404).send("Not Found (MTD Active)");
    }
}
