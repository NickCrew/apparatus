import { broadcastRequest, broadcastDeception, broadcastWebhook } from "./sse-broadcast.js";
import { logger } from "./logger.js";
import { cfg } from "./config.js";

let demoTimeout: NodeJS.Timeout | null = null;

export type TrafficPattern = 'steady' | 'sine' | 'spiky';

export interface DemoConfig {
    intensity: number;
    errorRate: number;
    latencyBase: number;
    attackFrequency: number;
    pattern: TrafficPattern;
    targetPath: string | null;
}

let currentConfig: DemoConfig = {
    intensity: 10,
    errorRate: 5,
    latencyBase: 50,
    attackFrequency: 5,
    pattern: 'steady',
    targetPath: null
};

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const PATHS = [
    "/api/v1/auth", "/api/v1/users", "/dashboard/stats", "/health", 
    "/api/orders", "/api/payment", "/api/products", "/ws/notifications",
    "/admin/login", "/.env", "/wp-login.php"
];
const SUCCESS_STATUSES = [200, 200, 201, 204, 302];
const ERROR_STATUSES = [400, 401, 403, 404, 500, 503];
const IPS = [
    "192.168.1.10", "10.0.0.5", "172.16.0.23", "203.0.113.42", "198.51.100.12",
    "8.8.8.8", "1.1.1.1", "127.0.0.1"
];

let startTime = Date.now();

function generateRandomRequest() {
    const method = METHODS[Math.floor(Math.random() * METHODS.length)];
    const path = currentConfig.targetPath || PATHS[Math.floor(Math.random() * PATHS.length)];
    
    const isError = Math.random() * 100 < currentConfig.errorRate;
    const status = isError 
        ? ERROR_STATUSES[Math.floor(Math.random() * ERROR_STATUSES.length)]
        : SUCCESS_STATUSES[Math.floor(Math.random() * SUCCESS_STATUSES.length)];
    
    const ip = IPS[Math.floor(Math.random() * IPS.length)];
    const latency = currentConfig.latencyBase + Math.floor(Math.random() * 200);

    return {
        method,
        path,
        status,
        ip,
        timestamp: new Date().toISOString(),
        latencyMs: latency,
        headers: {
            "user-agent": "Mozilla/5.0 (Synthetic/2.1)",
            "content-type": "application/json"
        }
    };
}

function generateRandomDeception() {
    return {
        timestamp: new Date().toISOString(),
        ip: IPS[Math.floor(Math.random() * IPS.length)],
        type: Math.random() > 0.5 ? 'honeypot_hit' : (Math.random() > 0.5 ? 'sqli_probe' : 'shell_command'),
        route: currentConfig.targetPath || PATHS[Math.floor(Math.random() * PATHS.length)],
        details: {
            command: "cat /etc/passwd",
            query: "' OR 1=1 --",
            source: "Synthetic Generator"
        }
    };
}

export function updateDemoConfig(config: Partial<DemoConfig>) {
    currentConfig = { ...currentConfig, ...config };
    logger.info({ config: currentConfig }, "Demo Mode: Configuration updated");
}

export function getDemoConfig() {
    return { ...currentConfig, enabled: !!demoTimeout };
}

export function startDemoLoop() {
    if (demoTimeout) return;
    startTime = Date.now();
    logger.info("Demo Mode: Starting synthetic traffic generator");
    
    const run = () => {
        const req = generateRandomRequest();
        broadcastRequest(req);

        if (Math.random() * 100 < currentConfig.attackFrequency) {
            broadcastDeception(generateRandomDeception() as any);
        }

        // Calculate dynamic intensity based on pattern
        let effectiveIntensity = currentConfig.intensity;
        const elapsed = (Date.now() - startTime) / 1000;

        if (currentConfig.pattern === 'sine') {
            // Sine wave with 30s period, oscillating between 20% and 100% of set intensity
            const wave = (Math.sin(elapsed * (Math.PI * 2 / 30)) + 1) / 2;
            effectiveIntensity = Math.max(1, currentConfig.intensity * (0.2 + 0.8 * wave));
        } else if (currentConfig.pattern === 'spiky') {
            // Occasional spikes (10% chance) that 5x the intensity
            if (Math.random() < 0.1) {
                effectiveIntensity = Math.min(100, currentConfig.intensity * 5);
            }
        }

        const baseDelay = 1000 / Math.max(1, effectiveIntensity);
        const nextDelay = baseDelay + (Math.random() * (baseDelay * 0.4) - (baseDelay * 0.2));
        
        demoTimeout = setTimeout(run, Math.max(5, nextDelay));
    };

    run();
}

export function stopDemoLoop() {
    if (demoTimeout) {
        clearTimeout(demoTimeout as NodeJS.Timeout);
        demoTimeout = null;
        logger.info("Demo Mode: Stopped synthetic traffic");
    }
}

if (cfg.demoMode) {
    startDemoLoop();
}
