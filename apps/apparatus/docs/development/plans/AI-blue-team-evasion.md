# Plan: AI-Blue-Team-Evasion (Tactical Switching)

## Objective
Enhance the Red Team AI's intelligence by teaching it to recognize and react to defensive measures (WAF blocks, Tarpits, MTD rotations) in real-time.

## Key Features
- **Block Recognition:** The AI detects when its requests return 403 (Forbidden), 429 (Rate Limit), or high latency (Tarpit).
- **Tactical Pivot:** If blocked on a specific vector (e.g., SQLi), the AI automatically switches to a different category (e.g., IDOR or Brute Force).
- **Stealth Counters:** 
    - **Anti-Rate-Limit:** AI automatically increases its `intervalMs` if it detects 429s.
    - **Anti-WAF:** AI triggers an **MTD Rotation** if it suspects its Source IP is being targeted by rule-based blocking.
- **Evasion Logs:** The AI explicitly logs its evasion reasoning (e.g., "Vector 'SQLi' likely blocked. Switching to 'Auth Probing' and rotating prefix.").

## Technical Implementation
- **Feedback Integration:** Inject the HTTP status code and response body of the *previous* action into the LLM's current "Decision" context.
- **Evasion Toolkit:** Ensure tools like `mtd.rotate` and `ghost.start` are part of the AI's "Emergency" tool-set.
- **Success Mapping:** Track which vectors are failing and use that to update the "Attack Plan" (see `AI-multi-stage-planning.md`).

## UI/UX Design
- **Evasion Alerts:** A glowing indicator in the **Action Log** when an "Evasion Maneuver" is performed.
- **Tactical Map:** Highlight blocked routes on the **Network Map** with a "Shield" icon, showing the AI is actively avoiding them.

## Milestones
1. **M1:** Add HTTP feedback (status/body) to the AI's context window.
2. **M2:** Implement "Emergency Evasion" prompt logic.
3. **M3:** Integrate MTD rotation as a reactive evasion tactic.
4. **M4:** Dashboard visualizations for blocked vs. successfully evaded paths.
