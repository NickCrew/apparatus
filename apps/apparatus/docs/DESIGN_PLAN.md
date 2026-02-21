# Design Plan: Apparatus Console Redesign (Variant G)

## Summary
The final design is a **"Professional Sci-Fi"** hybrid that combines high data density with clear information hierarchy. It uses a "Command Center" aesthetic with Electric Blue and Signal Red accents on a deep black background.

**Key Characteristics:**
- **Structure:** Clean, border-heavy layout (Linear-inspired).
- **Density:** Compact, monospaced data tables (GMUNK-inspired).
- **Feedback:** "Alive" UI with pulse animations, status-dependent coloring, and subtle background tints for errors.

## Visual Design System

### Palette
*   **Backgrounds:** `#050505` (App), `#0A0C11` (Panels/Cards).
*   **Borders:** `#1F2633` (Default), `#323C4D` (Hover).
*   **Primary:** Electric Blue `#00F0FF`.
*   **Success:** Neon Green `#00FF94`.
*   **Warning:** Amber `#FFB800`.
*   **Danger:** Signal Red `#FF0055`.

### Typography
*   **Headers:** `Rajdhani` (Bold, tracking-wide).
*   **UI Text:** `Outfit` (Sans-serif).
*   **Data/Code:** `JetBrains Mono` (Text-xs/sm).

### Components

#### 1. The "Status Header"
*   **Logo Area:** Changes color based on global system status (Green/Blue -> Amber -> Red).
*   **Resource Bar:** Integrated directly into the header (CPU | MEM | NET). Monospace numbers.

#### 2. "Panel" Card
*   **Style:** Sharp corners (`rounded-sm`), 1px border.
*   **Header:** Separated by border, uppercase monospace title.
*   **Content:** No padding on lists/tables (edge-to-edge).

#### 3. Traffic Table (High Density)
*   **Rows:** Compact height (`py-1.5`).
*   **Columns:** Fixed widths for IDs/Methods.
*   **States:**
    *   **500:** `bg-[#FF0055]/5` tint.
    *   **400:** `bg-[#FFB800]/5` tint.
    *   **200:** Hover tint only.

#### 4. Cluster Status List
*   **Offline Node:** Entire row gets `bg-danger/10`.
*   **Badge:** "DOWN" badge replaces load percentage.

#### 5. Streaming Log Panel
*   **Style:** Terminal aesthetic. Black background, green/blue text.
*   **Behavior:** Reverse flex direction (newest at bottom).

## Implementation Checklist

### Tailwind Config
Update `tailwind.config.ts` to include these exact hex values if not already present in the `colors.ts` token file.

### Component Updates
1.  **Refactor `Card`:** Remove default padding from `CardContent` to allow edge-to-edge tables.
2.  **Update `TrafficConsole`:** Implement the new table styles with conditional row backgrounds.
3.  **Update `Sidebar`:** Add the "System Logs" terminal widget to the bottom (or a collapsible panel).
4.  **Global State:** Ensure `systemStatus` (Operational/Partial/Critical) is available in context/store to drive the header colors.

## Accessibility
*   **Contrast:** Ensure the `#708099` text on `#0A0C11` meets 4.5:1 (it is borderline, might need `#9BA9BF`).
*   **State:** Do not rely on color alone. The "DOWN" badge and status text are critical.
*   **Motion:** Disable pulse animations if `prefers-reduced-motion` is set.