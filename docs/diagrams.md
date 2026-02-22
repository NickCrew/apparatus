# Diagram Index

Diagram visuals are now embedded directly in the documentation sections where they are used.

This file is retained as an index for existing links and quick lookup.

## Where Each Diagram Lives

| Diagram | Primary Doc Location |
|---|---|
| 1. High-Level Data Flow | [Architecture Guide](architecture.md#high-level-data-flow) |
| 2. Request Flow Through Middleware | [Architecture Guide](architecture.md#request-flow-through-middleware) |
| 3. Docker Compose Network Topology | [Integration Guide](integration-guide.md#docker-compose-network) and [Architecture Guide](architecture.md#network-topology-in-docker-compose) |
| 4. Red Team Autopilot Loop | [Autopilot Tutorial](tutorial-autopilot.md#typical-workflow) and [Architecture Guide](architecture.md#red-team-autopilot-loop) |
| 5. System Health States | [Architecture Guide](architecture.md#1-middleware-stack) |
| 6. Protocol Server Architecture | [Architecture Guide](architecture.md#2-protocol-servers) |
| 7. Monitoring Architecture | [Monitoring Tutorial](tutorial-monitoring.md#apparatus-monitoring-architecture) |
| 8. Dashboard Layout | [Dashboard Tutorial](tutorial-dashboard.md#the-layout) |
| 9. Middleware Stack Dependencies | [Architecture Guide](architecture.md#1-middleware-stack) |
| 10. Feature Adoption Timeline | [Quick Reference Guide](quick-reference.md#learning-path-at-a-glance) |
| 11. Interface Comparison | [Feature Catalog](features.md#dashboard--ui-2-interfaces) |
| 12. Attacker Fingerprinting Layout | [Attacker Fingerprinting Tutorial](tutorial-attacker-fingerprinting.md#the-attacker-fingerprinting-layout) |
| 13. Attacker Profile Card | [Attacker Fingerprinting Tutorial](tutorial-attacker-fingerprinting.md#whats-in-an-attacker-profile) |
| 14. Chaos Console Layout | [Chaos Console Tutorial](tutorial-chaos-console.md#the-chaos-console-layout) |
| 15. Overview Dashboard Sections | [Overview Dashboard Tutorial](tutorial-overview-dashboard.md#main-sections) |
| 16. Scenario Structure | [Scenario Builder Tutorial](tutorial-scenario-builder.md#scenario-structure) |
| 17. Campaign Phases | [Advanced Red Team Tutorial](tutorial-advanced-red-team.md#campaign-structure) |
| 18. Console Panel Structure | [Dashboard Tutorial](tutorial-dashboard.md#console-parts-standard-layout) |
| 19. Defense Classification Decision | [Live Payload Fuzzer Tutorial](tutorial-live-payload-fuzzer.md#interpreting-defense-classifications) |
| 20. Fuzzer Middleware Request Flow | [Live Payload Fuzzer Tutorial](tutorial-live-payload-fuzzer.md#workflow-1-validate-waf-rule-coverage) |
| 21. k6 Load Test Lifecycle | [Testing Lab Tutorial](tutorial-testing-lab.md#understanding-k6-scenarios) |
| 22. Testing Lab Multi-Tool Workflow | [Testing Lab Tutorial](tutorial-testing-lab.md#multi-tool-workflow-comprehensive-security-assessment) |
| 23. Nuclei Scan Process | [Testing Lab Tutorial](tutorial-testing-lab.md#understanding-nuclei-templates) |
| 24. Multi-Vector Campaign Flow | [Advanced Red Team Tutorial](tutorial-advanced-red-team.md#attack-vector-strategy) |
| 25. Attack Success Rate Flow | [Advanced Red Team Tutorial](tutorial-advanced-red-team.md#metrics-to-collect) |
| 26. CPU Impact Timeline | [Chaos Console Tutorial](tutorial-chaos-console.md#understanding-cpu-impact) |
| 27. Memory Allocation Impact | [Chaos Console Tutorial](tutorial-chaos-console.md#understanding-memory-impact) |
| 28. Chaos Recovery Decision Tree | [Chaos Console Tutorial](tutorial-chaos-console.md#issue-system-doesnt-recover) |
| 29. Bottleneck Identification Matrix | [Performance Tuning Tutorial](tutorial-performance-tuning.md#metric-based-bottleneck-identification) |
| 30. Optimization Impact Flow | [Performance Tuning Tutorial](tutorial-performance-tuning.md#reference-optimization-impact) |
| 31. Node.js Memory Management | [Performance Tuning Tutorial](tutorial-performance-tuning.md#strategy-2-nodejs-runtime-tuning) |
| 32. Incident Response Workflow | [Overview Dashboard Tutorial](tutorial-overview-dashboard.md#section-5-incident-response-workflow) |
| 33. Pressure State Transitions | [Overview Dashboard Tutorial](tutorial-overview-dashboard.md#reading-the-pressure-gauge) |
| 34. Scenario Execution Timeline | [Scenario Builder Tutorial](tutorial-scenario-builder.md#monitoring-execution) |
| 35. Scenario Step Dependency Graph | [Scenario Builder Tutorial](tutorial-scenario-builder.md#pattern-1-gradual-load-increase) |
| 36. Risk Score Calculation Flow | [Attacker Fingerprinting Tutorial](tutorial-attacker-fingerprinting.md#what-is-a-risk-score) |
| 37. Attacker Response Decision Tree | [Attacker Fingerprinting Tutorial](tutorial-attacker-fingerprinting.md#scenario-active-attack-response) |
| 38. Attacker Classification Taxonomy | [Attacker Fingerprinting Tutorial](tutorial-attacker-fingerprinting.md#understanding-attacker-categories) |
| 39. Security Testing Methodology Map | [Testing Lab Tutorial](tutorial-testing-lab.md#what-is-the-testing-lab) |
| 40. Tool Selection Decision Tree | [Testing Lab Tutorial](tutorial-testing-lab.md#try-it-navigate-to-testing-lab) |
| 41. Testing Lab Layout | [Testing Lab Tutorial](tutorial-testing-lab.md#the-testing-lab-layout) |
| 42. Live Fuzzer Interface | [Live Payload Fuzzer Tutorial](tutorial-live-payload-fuzzer.md#the-fuzzer-interface) |
| 43. Lab Operations Output Structure | [Live Payload Fuzzer Tutorial](tutorial-live-payload-fuzzer.md#reading-the-lab-operations-output) |
| 44. Terminal Dashboard Layout | [Monitoring Tutorial](tutorial-monitoring.md#section-5-terminal-ui-monitoring) |
| 45. Autopilot Console Layout | [Dashboard Tutorial](tutorial-dashboard.md#autopilot-console-walkthrough) |
| 46. Defense Console Layout | [Dashboard Tutorial](tutorial-dashboard.md#defense-console-walkthrough) |
| 47. Traffic Console Layout | [Dashboard Tutorial](tutorial-dashboard.md#traffic-console-walkthrough) |

## Diagram Source Files

Mermaid sources and generated SVG files:

- `docs/assets/diagrams/*.mmd`
- `docs/assets/diagrams/*.svg`

## Update Workflow

```bash
# Re-render all diagrams after editing .mmd files
for f in docs/assets/diagrams/*.mmd; do
  mmdc -i "$f" -o "${f%.mmd}.svg" -b transparent --configFile docs/assets/diagrams/mermaid-theme.json
done
```
