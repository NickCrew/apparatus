import { Request, Response } from "express";

interface PackageNode {
    id: string;
    name: string;
    version: string;
    type: 'app' | 'lib' | 'dev';
    status: 'clean' | 'infected' | 'compromised';
    dependencies: string[]; // IDs of packages this one depends on
    dependents: string[];   // IDs of packages that depend on this one
}

interface DependencyGraph {
    nodes: Record<string, PackageNode>;
}

let graph: DependencyGraph = generateGraph();

// Generate a random dependency graph
function generateGraph(nodeCount = 30): DependencyGraph {
    const nodes: Record<string, PackageNode> = {};
    const packageNames = [
        "react", "lodash", "axios", "express", "chalk", "debug", "commander", 
        "jest", "eslint", "typescript", "webpack", "babel", "moment", "uuid", 
        "rxjs", "classnames", "prop-types", "tslib", "fs-extra", "bluebird",
        "left-pad", "is-number", "is-odd", "event-stream", "flatmap-stream" // Famous victims
    ];

    // Create Root App
    nodes["app-root"] = {
        id: "app-root",
        name: "my-enterprise-app",
        version: "1.0.0",
        type: "app",
        status: "clean",
        dependencies: [],
        dependents: []
    };

    // Create Libraries
    for (let i = 0; i < nodeCount; i++) {
        const id = `pkg-${i}`;
        const name = packageNames[i % packageNames.length] + (Math.floor(i / packageNames.length) || "");
        nodes[id] = {
            id,
            name,
            version: `${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
            type: "lib",
            status: "clean",
            dependencies: [],
            dependents: []
        };
    }

    const nodeIds = Object.keys(nodes).filter(id => id !== "app-root");

    // Link Dependencies (Force Directed-ish)
    // 1. Connect App to some top-level deps
    for (let i = 0; i < 5; i++) {
        const depId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
        if (!nodes["app-root"].dependencies.includes(depId)) {
            nodes["app-root"].dependencies.push(depId);
            nodes[depId].dependents.push("app-root");
        }
    }

    // 2. Interconnect libs (Tree structure)
    nodeIds.forEach(id => {
        // Randomly depend on other libs (lower in list to avoid cycles mostly, but cycles happen in real life)
        // Simplified: only depend on indices higher than self to guarantee DAG
        const currentIdx = parseInt(id.split('-')[1]);
        const numDeps = Math.floor(Math.random() * 3);
        
        for (let j = 0; j < numDeps; j++) {
            const targetIdx = Math.floor(Math.random() * (nodeCount - currentIdx - 1)) + currentIdx + 1;
            const targetId = `pkg-${targetIdx}`;
            
            if (nodes[targetId] && !nodes[id].dependencies.includes(targetId)) {
                nodes[id].dependencies.push(targetId);
                nodes[targetId].dependents.push(id);
            }
        }
    });

    return { nodes };
}

// Logic to propagate infection UP the tree (Dependency Chain)
// If I use 'left-pad', and 'left-pad' is infected, I am compromised.
function propagateInfection() {
    let changed = true;
    while (changed) {
        changed = false;
        Object.values(graph.nodes).forEach(node => {
            if (node.status === 'clean') {
                // Check if any dependency is infected/compromised
                const hasBadDep = node.dependencies.some(depId => {
                    const dep = graph.nodes[depId];
                    return dep && (dep.status === 'infected' || dep.status === 'compromised');
                });

                if (hasBadDep) {
                    node.status = 'compromised';
                    changed = true;
                }
            }
        });
    }
}

// Handlers
export function getGraphHandler(req: Request, res: Response) {
    res.json(graph);
}

export function resetGraphHandler(req: Request, res: Response) {
    graph = generateGraph();
    res.json(graph);
}

export function injectMalwareHandler(req: Request, res: Response) {
    const { id } = req.body;
    const node = graph.nodes[id];
    
    if (!node) return res.status(404).json({ error: "Package not found" });
    
    // Infection starts here
    node.status = 'infected';
    
    // Spread
    propagateInfection();
    
    res.json({ status: "infected", node, impact: Object.values(graph.nodes).filter(n => n.status !== 'clean').length });
}
