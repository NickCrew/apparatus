import { useMemo, useState } from "react";
import { Ghost, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { useGhosts, type GhostMethod } from "../../hooks/useGhosts";

const METHODS: GhostMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function GhostConsole() {
    const { ghosts, isLoading, error, fetchGhosts, createGhost, deleteGhost } = useGhosts();

    const [route, setRoute] = useState("/api/checkout");
    const [method, setMethod] = useState<GhostMethod>("POST");
    const [responseBodyText, setResponseBodyText] = useState("{\n  \"ok\": true,\n  \"message\": \"checkout simulated\"\n}");
    const [latencyMode, setLatencyMode] = useState<"fixed" | "jitter">("fixed");
    const [latencyMs, setLatencyMs] = useState(120);
    const [jitterMinMs, setJitterMinMs] = useState(80);
    const [jitterMaxMs, setJitterMaxMs] = useState(220);
    const [errorRate, setErrorRate] = useState(0);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const sortedGhosts = useMemo(() => {
        return [...ghosts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }, [ghosts]);

    const onCreate = async () => {
        setFormError(null);
        let parsedResponseBody: unknown;
        try {
            parsedResponseBody = JSON.parse(responseBodyText);
        } catch {
            setFormError("Response body must be valid JSON");
            return;
        }

        setIsSubmitting(true);
        try {
            await createGhost({
                route,
                method,
                responseBody: parsedResponseBody,
                behavior: latencyMode === "fixed"
                    ? { latencyMs, errorRate }
                    : { jitterMs: { min: jitterMinMs, max: jitterMaxMs }, errorRate },
            });
        } catch (err: any) {
            setFormError(err?.message || "Failed to create ghost");
        } finally {
            setIsSubmitting(false);
        }
    };

    const onDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await deleteGhost(id);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl text-neutral-100 ml-2 type-heading">Ghost API Mocker</h1>
                    <p className="text-neutral-400 text-sm mt-1 ml-2">
                        Virtualize dependency APIs with configurable latency and error behavior.
                    </p>
                </div>
                <Button variant="secondary" size="sm" onClick={fetchGhosts}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                <Card variant="panel" className="flex flex-col h-full">
                    <CardHeader className="border-b border-neutral-800/40">
                        <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
                            <Plus className="h-4 w-4 text-primary-400" />
                            Create Ghost
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 overflow-y-auto">
                        <div className="space-y-2">
                            <label className="text-xs text-neutral-400 font-mono uppercase">Route</label>
                            <input
                                value={route}
                                onChange={(event) => setRoute(event.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm font-mono text-neutral-100"
                                placeholder="/api/checkout"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-neutral-400 font-mono uppercase">Method</label>
                            <select
                                value={method}
                                onChange={(event) => setMethod(event.target.value as GhostMethod)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm font-mono text-neutral-100"
                            >
                                {METHODS.map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-neutral-400 font-mono uppercase">Response Body (JSON)</label>
                            <textarea
                                value={responseBodyText}
                                onChange={(event) => setResponseBodyText(event.target.value)}
                                rows={7}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-xs font-mono text-neutral-100"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-neutral-400 font-mono uppercase">Latency Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant={latencyMode === "fixed" ? "primary" : "secondary"}
                                    size="sm"
                                    onClick={() => setLatencyMode("fixed")}
                                >
                                    Fixed
                                </Button>
                                <Button
                                    variant={latencyMode === "jitter" ? "primary" : "secondary"}
                                    size="sm"
                                    onClick={() => setLatencyMode("jitter")}
                                >
                                    Jitter
                                </Button>
                            </div>
                        </div>

                        {latencyMode === "fixed" ? (
                            <div className="space-y-2">
                                <label className="text-xs text-neutral-400 font-mono uppercase">Latency (ms)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={30000}
                                    value={latencyMs}
                                    onChange={(event) => setLatencyMs(Number(event.target.value))}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm font-mono text-neutral-100"
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-400 font-mono uppercase">Jitter Min (ms)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={30000}
                                        value={jitterMinMs}
                                        onChange={(event) => setJitterMinMs(Number(event.target.value))}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm font-mono text-neutral-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-400 font-mono uppercase">Jitter Max (ms)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={30000}
                                        value={jitterMaxMs}
                                        onChange={(event) => setJitterMaxMs(Number(event.target.value))}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm font-mono text-neutral-100"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs text-neutral-400 font-mono uppercase">Error Rate (%)</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={errorRate}
                                onChange={(event) => setErrorRate(Number(event.target.value))}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm font-mono text-neutral-100"
                            />
                        </div>

                        {(formError || error) && (
                            <div className="text-sm text-red-400 font-mono">
                                {formError || error}
                            </div>
                        )}

                        <Button variant="primary" onClick={onCreate} disabled={isSubmitting} className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            {isSubmitting ? "Creating..." : "Create Ghost"}
                        </Button>
                    </CardContent>
                </Card>

                <Card variant="panel" className="flex flex-col h-full">
                    <CardHeader className="border-b border-neutral-800/40">
                        <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
                            <Ghost className="h-4 w-4 text-primary-400" />
                            Active Ghosts
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-y-auto">
                        {isLoading ? (
                            <div className="text-sm text-neutral-400 font-mono">Loading ghosts...</div>
                        ) : sortedGhosts.length === 0 ? (
                            <div className="text-sm text-neutral-500 font-mono">No virtual ghosts active.</div>
                        ) : (
                            <div className="space-y-3">
                                {sortedGhosts.map((ghost) => (
                                    <div key={ghost.id} className="border border-neutral-800 rounded-md p-3 bg-neutral-900/40">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="info">{ghost.method}</Badge>
                                                    <span className="font-mono text-sm text-neutral-100 truncate">{ghost.route}</span>
                                                </div>
                                                <div className="text-xs text-neutral-400 font-mono mt-2">
                                                    hits={ghost.requestCount} errorRate={ghost.behavior.errorRate.toFixed(1)}%
                                                </div>
                                                <div className="text-xs text-neutral-500 font-mono mt-1">
                                                    latency={ghost.behavior.latency.mode === "fixed"
                                                        ? `${ghost.behavior.latency.ms}ms`
                                                        : `${ghost.behavior.latency.minMs}-${ghost.behavior.latency.maxMs}ms`}
                                                </div>
                                            </div>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => onDelete(ghost.id)}
                                                disabled={deletingId === ghost.id}
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                {deletingId === ghost.id ? "Deleting..." : "Delete"}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
