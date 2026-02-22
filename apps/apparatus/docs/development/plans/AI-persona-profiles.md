# Plan: AI-Persona-Profiles (Sophistication Levels)

## Objective
Introduce selectable "Persona Profiles" for the Autopilot AI, allowing users to simulate different types of adversaries, from loud "Script Kiddies" to stealthy "APTs" (Advanced Persistent Threats).

## Key Features
- **Sophistication Settings:**
    - **Script Kiddie:** Noisy, fast, relies on well-known scanners (k6, basic Nuclei), ignores 403 blocks, no stealth.
    - **Researcher:** Methodical, focuses on one tool category at a time, logs detailed findings, low impact.
    - **APT (Advanced):** Stealthy, uses "Ghost Traffic" to blend in, rotates MTD prefixes frequently, switches tactics if detected, targets sensitive "Loot" specifically.
- **Dynamic System Prompts:** Each persona injects a unique set of behavioral constraints into the LLM's system prompt.
- **Tool Probability Weighting:** Personas have different probabilities for tool selection (e.g., APT is 80% likely to use MTD/Ghosting vs 10% for a Script Kiddie).

## Technical Implementation
- **Backend:** Update the `AutopilotConfig` interface to include a `persona` field.
- **Prompt Library:** Create a `src/ai/personas.ts` registry that holds the behavioral prompts for each level.
- **Decision Logic:** Pass the persona's "Bias" (weightings) into the AI's decision-making loop to influence tool selection.

## UI/UX Design
- **Persona Selector:** A visual toggle or dropdown in the **Autopilot Console** with icons for each level (e.g., a hoodie for Script Kiddie, a briefcase for APT).
- **Behavior Tags:** Display tags like "LOW_STEALTH" or "HIGH_INTELLIGENCE" based on the selected persona.

## Milestones
1. **M1:** Define persona registry and baseline system prompts.
2. **M2:** Implement tool weighting logic based on persona.
3. **M3:** Build the Persona Selector UI.
4. **M4:** Performance tuning (verifying personas actually behave as described).
