# Apparatus Design System — Typography

**Font:** [Recursive](https://www.recursive.design) by Stephen Nixon
**Load:** Single variable font covering sans + mono via axis interpolation

```
https://fonts.googleapis.com/css2?family=Recursive:slnt,wght,CASL,CRSV,MONO@-15..0,300..900,0..1,0..1,0..1&display=swap
```

---

## Axes

| Axis | Range | Purpose |
|------|-------|---------|
| `wght` | 300–900 | Weight |
| `MONO` | 0–1 | Monospace amount (0 = proportional, 1 = full mono) |
| `CASL` | 0–1 | Casual amount (0 = linear/sharp, 1 = soft/rounded) |
| `slnt` | -15–0 | Slant (0 = upright, -15 = full italic) |
| `CRSV` | 0.5 | Cursive — locked at 0.5, not used as a design variable |

## Brand Logic

**CASL is the brand voice axis.** Human-facing text gets casual warmth (body 0.6, metric 0.6). Machine output stays clinical (data 0, code 0, timestamp 0). The gradient creates two tonal registers from one font.

**MONO separates prose from data.** Proportional for reading (display, heading, body, nav). Monospace for precision (data, code, timestamp, metric). Half-mono (0.5) for nav items, creating a hybrid texture unique to the brand.

**slnt adds energy to navigational elements** — links, breadcrumbs, labels lean forward without changing weight or color.

---

## Roles

### Display
Page titles, hero text.
```
wght 300 · MONO 0 · CASL 0 · slnt 0
36px
```
Light weight, no personality. Calm authority. The biggest text is the thinnest — confidence over volume.

### Heading
Section headers, card titles.
```
wght 500 · MONO 0 · CASL 0.2 · slnt 0
24px
```
Slight casual warmth. Enough personality to feel human, not enough to feel soft.

### Subhead
Card subtitles, secondary headers.
```
wght 600 · MONO 0 · CASL 0.3 · slnt -3
14px · tracking 1.5px
```
A touch more casual than heading with a subtle lean. The tracking opens it up at small size.

### Body
Descriptions, tooltips, longer text.
```
wght 400 · MONO 0 · CASL 0.6 · slnt 0
13px
```
Warmest casual value in the system. This is the text people actually read — it should feel approachable without being soft.

### Label
Sidebar group headers, section tags (`TEST & ATTACK`, `INFRA`).
```
wght 600 · MONO 1 · CASL 0.3 · slnt -4
12px · tracking 1px
```
Full mono for even spacing with tracking. The lean gives structural labels a sense of direction.

### Tag
Status badges, severity chips (`CRITICAL`, `WARNING`).
```
wght 800 · MONO 0 · CASL 0 · slnt -3
11px · tracking 1.5px
```
Heaviest weight in the system. No casual — this is information that needs to be unambiguous. Slight lean for urgency.

### Metric
Big numbers, KPI values.
```
wght 400 · MONO 1 · CASL 0.6 · slnt 0
32px · tracking -0.5px
```
Full mono for column alignment. CASL 0.6 gives the numbers personality — they're not just data, they're the story. Negative tracking tightens them at large size.

### Metric Unit
Units after numbers (`RPS`, `ms`).
```
wght 500 · MONO 1 · CASL 0 · slnt 0
13px · tracking 0.5px
```
Clinical mono. No warmth — it's a unit label, not content. Smaller and quieter than the metric it supports.

### Data
Table cells, IP addresses, paths.
```
wght 500 · MONO 1 · CASL 0 · slnt 0
13px
```
Pure precision. No casual, no slant. This text needs to be unambiguous and machine-readable.

### Code
Inline code, commands, config.
```
wght 400 · MONO 1 · CASL 0 · slnt 0
13px · tracking 0.5px
```
Standard monospace. The slight tracking improves readability for longer command strings.

### Timestamp
Log times, durations.
```
wght 500 · MONO 1 · CASL 0 · slnt 0
11px · tracking 0.5px
```
Smaller and quieter. Anchors rows without stealing focus from the event it timestamps.

### Nav
Sidebar navigation links.
```
wght 500 · MONO 0.5 · CASL 0.2 · slnt -2
14px · tracking 1px
```
Half-mono hybrid — the most distinctive setting in the system. Letterforms are literally between sans and mono. Creates a sidebar texture that doesn't look like any other app.

### Nav Active
Active sidebar link.
```
wght 700 · MONO 0.5 · CASL 0.1 · slnt -2
14px · tracking 1px
```
Same hybrid as nav but heavier, slightly less casual. The weight change alone signals "you are here."

### Link
Clickable links, actions (`TRAFFIC →`, `OPEN TIMELINE`).
```
wght 700 · MONO 0 · CASL 0 · slnt -15
10px · tracking 1px
```
Full italic. Heavy, leaning hard, small. Says "this is a verb, click me." The most aggressive setting in the system.

### Breadcrumb
Path navigation (`SYSTEM / OVERVIEW`).
```
wght 700 · MONO 1 · CASL 0.2 · slnt -7
10px · tracking 2.5px
```
Heavy mono italic with wide tracking. A navigational whisper — present but never competing with content.

---

## Color Palette

| Token | Value | Ratio on surface | Use |
|-------|-------|-------------------|-----|
| `text` | `#dce4ec` | 14.70 ✅ | Primary text |
| `textMuted` | `#6d85a0` | 4.96 ✅ | Secondary text, labels |
| `textDim` | `#4e6580` | 3.14 | Decorative only (AA-Large) |
| `blue` | `#38a0ff` | 6.87 ✅ | Apparatus accent |
| `amber` | `#e5a820` | 8.95 ✅ | Crucible accent |
| `magenta` | `#d946a8` | 4.85 ✅ | Chimera accent |
| `green` | `#18c760` | 8.43 ✅ | Success, pass |
| `red` | `#ef4444` | 5.02 ✅ | Error, critical, fail |

Backgrounds: `bg #080b12`, `surface #0c111c`, `border #151e30`.

---

## Usage

```javascript
import { type, applyType, fontFamily, colors } from './type-system';

// Apply a role
<div style={applyType('metric')}>2,847</div>

// Manual composition
<span style={{
  fontFamily,
  fontVariationSettings: type.label.fontVariationSettings,
  fontSize: type.label.fontSize,
  letterSpacing: type.label.letterSpacing,
  color: colors.textMuted,
}}>TEST & ATTACK</span>
```
