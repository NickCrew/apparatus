# Plan: AI-Multi-Stage-Attack-Planning

## Objective
Enable the AI to think strategically by generating a high-level "Battle Plan" before executing any tools, and then adapting that plan dynamically based on success or failure.

## Key Features
- **Planning Phase:** When a mission starts, the AI first generates a JSON array of `IntendedSteps` (e.g., `["Recon", "Fingerprint", "Exploit", "Pivot"]`).
- **Plan Visualization:** Display this plan as a "Mission Checklist" in the dashboard.
- **Dynamic Re-Planning:** If a step fails (e.g., "Recon found no open ports"), the AI triggers a "Re-Plan" event to generate a new strategy.
- **Phase-Specific Tools:** Restrict tool availability based on the current phase (e.g., don't allow "Crash Process" during the "Recon" phase).

## Technical Implementation
- **Two-Pass LLM:** 
    1. **Architect Pass:** Generates the plan.
    2. **Operator Pass:** Executes the specific tools for the current step.
- **State Machine:** Update `useAutopilot` to track `currentPhase` and `planStatus`.
- **Feedback Loop:** Pass the result of the previous step into the Architect prompt to determine if the plan needs changing.

## UI/UX Design
- **Mission Checklist:** A vertical timeline in the dashboard where future steps are "Pending" (grey), current is "Active" (pulsing), and past are "Complete" (green).
- **"Thinking" Indicator:** Distinct visual state when the AI is "Re-planning" vs "Executing".

## Milestones
1. **M1:** Implement the "Architect" prompt for plan generation.
2. **M2:** Create the `MissionPlan` data structure and API.
3. **M3:** Build the "Mission Checklist" UI component.
4. **M4:** Implement dynamic re-planning logic on failure.
