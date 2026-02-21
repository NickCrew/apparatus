import { Request, Response } from "express";

const EICAR_STRING = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export function eicarHandler(req: Request, res: Response) {
    // EICAR Test File
    res.set("Content-Type", "text/plain");
    res.set("Content-Disposition", 'attachment; filename="eicar.com"');
    res.send(EICAR_STRING);
}

export function scheduleCrash(delayMs = 1000) {
    setTimeout(() => {
        process.exit(1);
    }, delayMs);
}

export function crashHandler(req: Request, res: Response) {
    res.send("Crashing server in 1 second...");
    scheduleCrash(1000);
}

let cpuSpikeRunning = false;
let cpuSpikeCancelled = false;

export function triggerCpuSpike(durationMs: number = 5000) {
    if (cpuSpikeRunning) return false;
    cpuSpikeRunning = true;
    cpuSpikeCancelled = false;
    
    const end = Date.now() + durationMs;
    const spike = () => {
        if (cpuSpikeCancelled || Date.now() > end) {
            cpuSpikeRunning = false;
            return;
        }
        const now = Date.now();
        while (Date.now() - now < 10);
        setImmediate(spike);
    };
    spike();
    return true;
}

export function stopCpuSpike() {
    if (!cpuSpikeRunning) return false;
    cpuSpikeCancelled = true;
    cpuSpikeRunning = false;
    return true;
}

export function cpuSpikeHandler(req: Request, res: Response) {
    // Support both query param and JSON body
    const duration = parseInt(req.body?.duration || req.query.duration as string) || 5000;
    
    if (triggerCpuSpike(duration)) {
        res.send(`Spiking CPU for ${duration}ms`);
    } else {
        res.status(409).send("CPU spike already running");
    }
}

let memoryHogs: Buffer[] = [];

export function clearMemorySpike() {
    memoryHogs = [];
    if (global.gc) global.gc(); // Requires --expose-gc
    return "Memory cleared";
}

export function allocateMemorySpike(amountMb: number) {
    const buf = Buffer.alloc(amountMb * 1024 * 1024, "M");
    memoryHogs.push(buf);
    return `Allocated ${amountMb}MB. Total allocated chunks: ${memoryHogs.length}`;
}

export function memorySpikeHandler(req: Request, res: Response) {
    const action = req.body?.action || req.query.action || "allocate";
    const amountMb = parseInt(req.body?.amount || req.query.amount as string) || 100;

    if (action === "clear") {
        return res.send(clearMemorySpike());
    }

    try {
        res.send(allocateMemorySpike(amountMb));
    } catch (e: any) {
        res.status(500).send(`Allocation failed: ${e.message}`);
    }
}
