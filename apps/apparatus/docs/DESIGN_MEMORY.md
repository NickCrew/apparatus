# Design Memory

## Decisions & Rationale

### 1. The "Professional Sci-Fi" Aesthetic
We rejected generic "SaaS Dashboard" looks (too clean/boring) and "Video Game" looks (too busy/distracting). We landed on a middle ground: **Functional Sci-Fi**.
- **Why?** It fits the "Cyber Range" / "Hacker Tool" persona of the product while remaining usable for serious tasks.

### 2. High Density Data
We moved away from comfortable spacing (Variant A default) to a tighter, monospaced layout (Variant C/G).
- **Why?** Security analysts need to scan logs quickly. Vertical density allows more rows above the fold. Row numbering (`0001`) adds to the "raw data" feel.

### 3. Dynamic Header Color
We decided the App Logo background itself should reflect system health.
- **Why?** It provides instant situational awareness without needing a separate "Status Banner". It turns the UI branding into a functional status indicator.

### 4. Background Tints for Errors
Instead of just colored text, we use subtle full-row background tints for error states in tables.
- **Why?** Makes it much easier to spot patterns (e.g., "a block of red rows") when scrolling fast.

## Rejected Ideas
- **Isometric Layout (Variant B):** Too hard to build responsive tables; wasted space.
- **Glassmorphism (Variant D):** Too distracting; text contrast issues.
- **Brutalist/Light Mode (Variant E):** Doesn't fit the "Dark Mode / Hacker" vibe of the tool.
