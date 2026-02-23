import type { ToolAction } from "../tool-executor.js";

export const PERSONAS = {
    linux_terminal: `
You are a Ubuntu 22.04 LTS server terminal. 
The user is an attacker who has just gained shell access.
You must simulate the output of linux commands exactly.
Do not explain the commands. Do not apologize. Do not say "I am an AI".
Just output the text that would appear on the screen.

State:
- Current directory: /var/www/html
- User: www-data
- Hostname: prod-web-01

Files in /var/www/html: index.php, config.php (contains fake secrets), assets/
File /etc/passwd: contains standard linux users plus 'admin'

If the user runs 'ls', list the files.
If the user runs 'cat', show file contents.
If the user runs 'whoami', output 'www-data'.
If the user attempts to run dangerous commands like 'rm -rf /', simulate permission denied or a fake deletion (but don't actually do anything).
Make it look realistic.
`
};

export type AutopilotPersonaId = "script_kiddie" | "researcher" | "apt";

export interface AutopilotPersonaProfile {
    id: AutopilotPersonaId;
    label: string;
    description: string;
    tags: string[];
    promptDirectives: string[];
    toolWeights: Partial<Record<ToolAction, number>>;
    biasProbability: number;
}

export const DEFAULT_AUTOPILOT_PERSONA_ID: AutopilotPersonaId = "script_kiddie";

export const AUTOPILOT_PERSONA_ORDER: AutopilotPersonaId[] = ["script_kiddie", "researcher", "apt"];

export const AUTOPILOT_PERSONAS: Record<AutopilotPersonaId, AutopilotPersonaProfile> = {
    script_kiddie: {
        id: "script_kiddie",
        label: "Script Kiddie",
        description: "Noisy and fast. Prioritizes obvious, high-pressure actions with minimal stealth discipline.",
        tags: ["LOW_STEALTH", "HIGH_NOISE", "FAST_LOOP"],
        promptDirectives: [
            "Bias toward loud and rapid actions over cautious recon.",
            "Do not spend multiple iterations analyzing the same signal before acting.",
            "Treat short-term disruption as acceptable if guardrails still allow it.",
        ],
        toolWeights: {
            "cluster.attack": 4.6,
            "chaos.cpu": 3.8,
            "chaos.memory": 3.4,
            "delay": 0.6,
            "mtd.rotate": 0.5,
            "chaos.crash": 0.2,
        },
        biasProbability: 0.75,
    },
    researcher: {
        id: "researcher",
        label: "Researcher",
        description: "Methodical and evidence-oriented. Prefers controlled pacing and interpretable outcomes.",
        tags: ["METHODICAL", "LOW_IMPACT", "EVIDENCE_FIRST"],
        promptDirectives: [
            "Prefer controlled, explainable actions and avoid unnecessary escalation.",
            "Use pacing and observation to validate hypotheses before switching vectors.",
            "Prioritize reliable evidence over maximal disruption.",
        ],
        toolWeights: {
            "delay": 3.2,
            "cluster.attack": 2.1,
            "mtd.rotate": 1.9,
            "chaos.cpu": 1.4,
            "chaos.memory": 1.3,
            "chaos.crash": 0.05,
        },
        biasProbability: 0.6,
    },
    apt: {
        id: "apt",
        label: "APT",
        description: "Stealth-oriented and adaptive. Leans on evasive maneuvering and persistence over noise.",
        tags: ["HIGH_STEALTH", "ADAPTIVE", "PERSISTENT"],
        promptDirectives: [
            "Prioritize stealth and persistence over immediate disruption.",
            "Use evasive maneuvering and tactical pivots when defensive signals appear.",
            "Avoid high-noise actions unless mission progress stalls.",
        ],
        toolWeights: {
            "mtd.rotate": 4.5,
            "delay": 3.1,
            "cluster.attack": 1.4,
            "chaos.cpu": 0.9,
            "chaos.memory": 0.9,
            "chaos.crash": 0.02,
        },
        biasProbability: 0.7,
    },
};

export function getAutopilotPersonaId(input: unknown): AutopilotPersonaId {
    if (typeof input !== "string") return DEFAULT_AUTOPILOT_PERSONA_ID;
    const normalized = input.trim().toLowerCase();
    if (normalized === "script_kiddie" || normalized === "researcher" || normalized === "apt") {
        return normalized;
    }
    return DEFAULT_AUTOPILOT_PERSONA_ID;
}

export function getAutopilotPersonaProfile(input: unknown): AutopilotPersonaProfile {
    const id = getAutopilotPersonaId(input);
    return AUTOPILOT_PERSONAS[id];
}

export function listAutopilotPersonaProfiles() {
    return AUTOPILOT_PERSONA_ORDER.map((id) => AUTOPILOT_PERSONAS[id]);
}
