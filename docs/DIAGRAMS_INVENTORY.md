# Documentation Diagrams Inventory

Catalog of tutorial diagrams, with conversion status from ASCII to Mermaid-rendered SVG assets.

---

## Completed Mermaid Replacements

All ASCII instances previously tracked in this file have been replaced with Mermaid diagram images in the relevant docs.

| Status | Tutorial File | Replaced Section | Mermaid Source | Embedded SVG |
|---|---|---|---|---|
| ✅ | `tutorial-attacker-fingerprinting.md` | Attacker Fingerprinting Layout | `docs/assets/diagrams/diagram-12-fingerprint-layout.mmd` | `/dashboard/assets/diagrams/diagram-12-fingerprint-layout.svg` |
| ✅ | `tutorial-attacker-fingerprinting.md` | Attacker Profile Card | `docs/assets/diagrams/diagram-13-attacker-profile-card.mmd` | `/dashboard/assets/diagrams/diagram-13-attacker-profile-card.svg` |
| ✅ | `tutorial-chaos-console.md` | Chaos Console Layout | `docs/assets/diagrams/diagram-14-chaos-console-layout.mmd` | `/dashboard/assets/diagrams/diagram-14-chaos-console-layout.svg` |
| ✅ | `tutorial-overview-dashboard.md` | Overview Dashboard Sections | `docs/assets/diagrams/diagram-15-overview-sections.mmd` | `/dashboard/assets/diagrams/diagram-15-overview-sections.svg` |
| ✅ | `tutorial-scenario-builder.md` | Scenario Structure | `docs/assets/diagrams/diagram-16-scenario-structure.mmd` | `/dashboard/assets/diagrams/diagram-16-scenario-structure.svg` |
| ✅ | `tutorial-advanced-red-team.md` | Campaign Phases Structure | `docs/assets/diagrams/diagram-17-campaign-phases.mmd` | `/dashboard/assets/diagrams/diagram-17-campaign-phases.svg` |
| ✅ | `tutorial-dashboard.md` | Console Panel Structure | `docs/assets/diagrams/diagram-18-console-panel-structure.mmd` | `/dashboard/assets/diagrams/diagram-18-console-panel-structure.svg` |

---

## Completed Workflow Diagram Additions

Additional text-only workflow sections were converted to Mermaid and embedded in their tutorial context.

| Status | Tutorial File | Added Diagrams |
|---|---|---|
| ✅ | `tutorial-live-payload-fuzzer.md` | 19 (Defense Classification), 20 (Middleware Request Flow) |
| ✅ | `tutorial-testing-lab.md` | 21 (k6 Lifecycle), 22 (Multi-Tool Workflow), 23 (Nuclei Scan Process) |
| ✅ | `tutorial-advanced-red-team.md` | 24 (Multi-Vector Campaign Flow), 25 (Attack Success Rate Flow) |
| ✅ | `tutorial-chaos-console.md` | 26 (CPU Impact Timeline), 27 (Memory Impact), 28 (Recovery Decision Tree) |
| ✅ | `tutorial-performance-tuning.md` | 29 (Bottleneck Matrix), 30 (Optimization Impact), 31 (Node Memory Management) |
| ✅ | `tutorial-overview-dashboard.md` | 32 (Incident Response Workflow), 33 (Pressure State Transitions) |
| ✅ | `tutorial-scenario-builder.md` | 34 (Scenario Execution Timeline), 35 (Step Dependency Graph) |
| ✅ | `tutorial-attacker-fingerprinting.md` | 36 (Risk Score Calculation), 37 (Attacker Response Decision Tree) |
| ✅ | `tutorial-attacker-fingerprinting.md` | 38 (Attacker Classification Taxonomy) |
| ✅ | `tutorial-testing-lab.md` | 39 (Security Testing Methodology), 40 (Tool Selection Decision Tree) |
| ✅ | `tutorial-testing-lab.md` | 41 (Testing Lab Layout) |
| ✅ | `tutorial-live-payload-fuzzer.md` | 42 (Fuzzer Interface), 43 (Lab Output Structure) |
| ✅ | `tutorial-monitoring.md` | 44 (Terminal Dashboard Layout) |
| ✅ | `tutorial-dashboard.md` | 45 (Autopilot Console), 46 (Defense Console), 47 (Traffic Console) |

---

## Tutorials Without Legacy ASCII Blocks

- `tutorial-live-payload-fuzzer.md` (already referenced existing diagram assets)
- `tutorial-testing-lab.md` (no legacy ASCII blocks recorded)

## Remaining Diagram Backlog

The previous high/medium-priority workflow gaps have now been converted to Mermaid diagrams and embedded in the tutorials.

### Outstanding

1. Optional advanced visuals
- Additional comparative charts where text tables already communicate effectively
- Domain-specific deep dives requested by future docs updates

## Notes

- Mermaid sources live in `docs/assets/diagrams/*.mmd`.
- Rendered assets live in `docs/assets/diagrams/*.svg`.
- Public docs index generation intentionally excludes inventory/index docs from publication.
