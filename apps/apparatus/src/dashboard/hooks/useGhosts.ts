import { useCallback, useEffect, useState } from "react";
import { useApparatus } from "../providers/ApparatusProvider";

export type GhostMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface GhostRecord {
    id: string;
    route: string;
    method: GhostMethod;
    responseBody: unknown;
    behavior: {
        latency: { mode: "fixed"; ms: number } | { mode: "jitter"; minMs: number; maxMs: number };
        errorRate: number;
    };
    requestCount: number;
    createdAt: string;
    lastHitAt?: string;
}

export interface GhostCreateInput {
    route: string;
    method: GhostMethod;
    responseBody: unknown;
    behavior: {
        errorRate: number;
        latencyMs?: number;
        jitterMs?: { min: number; max: number };
    };
}

export function useGhosts() {
    const { baseUrl } = useApparatus();
    const [ghosts, setGhosts] = useState<GhostRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGhosts = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${baseUrl}/ghosts`);
            if (!response.ok) {
                throw new Error(`Failed to fetch ghosts: ${response.status}`);
            }
            const data = await response.json();
            if (Array.isArray(data)) {
                setGhosts(data);
            } else if (Array.isArray(data?.ghosts)) {
                setGhosts(data.ghosts);
            } else {
                setGhosts([]);
            }
            setError(null);
        } catch (err: any) {
            setError(err?.message || "Failed to fetch ghosts");
        } finally {
            setIsLoading(false);
        }
    }, [baseUrl]);

    const createGhost = useCallback(async (payload: GhostCreateInput) => {
        const response = await fetch(`${baseUrl}/ghosts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.error || "Failed to create ghost");
        }

        await fetchGhosts();
        return data as GhostRecord;
    }, [baseUrl, fetchGhosts]);

    const deleteGhost = useCallback(async (id: string) => {
        const response = await fetch(`${baseUrl}/ghosts/${encodeURIComponent(id)}`, {
            method: "DELETE",
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.error || "Failed to delete ghost");
        }

        await fetchGhosts();
    }, [baseUrl, fetchGhosts]);

    useEffect(() => {
        fetchGhosts();
    }, [fetchGhosts]);

    return {
        ghosts,
        isLoading,
        error,
        fetchGhosts,
        createGhost,
        deleteGhost,
    };
}
