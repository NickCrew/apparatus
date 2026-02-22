# Apparatus Documentation Navigator

Welcome! This guide helps you find the right documentation for your needs.

---

## 📍 Quick Navigation

### Getting Started
- **[Quick Reference](quick-reference.md)** — Common commands, services, and troubleshooting
- **[Integration Guide](integration-guide.md)** — How Apparatus + VulnLab work together

### Learning & Tutorials
- **[Tutorial: CLI Reference](tutorial-cli.md)** — Command-line tool and scripting
- **[Tutorial: Dashboard](tutorial-dashboard.md)** — Web UI features and monitoring
- **[Tutorial: Webhooks](tutorial-webhooks.md)** — Webhook integration and testing
- **[Tutorial: Chaos Engineering](tutorial-chaos-engineering.md)** — Chaos features explained
- **[Tutorial: Defense Rules](tutorial-defense-rules.md)** — WAF and defense configuration
- **[Tutorial: Autopilot](tutorial-autopilot.md)** — Red team autonomous agent
- **[Tutorial: Monitoring](tutorial-monitoring.md)** — Metrics, dashboards, and observability
- **[Tutorial: Scenarios](tutorial-scenarios.md)** — Multi-step testing scenarios
- **[Tutorial: Live Payload Fuzzer](tutorial-live-payload-fuzzer.md)** — Interactive API & payload testing
- **[Tutorial: Testing Lab](tutorial-testing-lab.md)** — Unified security testing (k6, Nuclei, Escape Artist)
- **[Tutorial: Attacker Fingerprinting](tutorial-attacker-fingerprinting.md)** — Real-time threat monitoring & response

### Reference & Architecture
- **[Architecture Guide](architecture.md)** — System design, component details, performance
- **[Visual Diagrams](diagrams.md)** — Mermaid flowcharts and network diagrams
- **[Complete Features](features.md)** — All 58+ features catalog
- **[API Reference](api.md)** — Detailed endpoint documentation

---

## 🎯 Find Documentation by Task

### I want to...

#### Start Testing
→ **[Quick Reference](quick-reference.md)** → Common Testing Scenarios section

#### Understand System Architecture
→ **[Architecture Guide](architecture.md)** + **[Visual Diagrams](diagrams.md)**

#### Run Tests via Command Line
→ **[Tutorial: CLI Reference](tutorial-cli.md)**

#### Monitor in Real-Time
→ **[Tutorial: Dashboard](tutorial-dashboard.md)** or **[Tutorial: Monitoring](tutorial-monitoring.md)**

#### Create Automated Test Sequences
→ **[Tutorial: Scenarios](tutorial-scenarios.md)**

#### Use AI Red Team
→ **[Tutorial: Autopilot](tutorial-autopilot.md)**

#### Test with Chaos Attacks
→ **[Tutorial: Chaos Engineering](tutorial-chaos-engineering.md)**

#### Set Up Security Rules
→ **[Tutorial: Defense Rules](tutorial-defense-rules.md)**

#### Integrate Webhooks
→ **[Tutorial: Webhooks](tutorial-webhooks.md)**

#### Test APIs and Payloads Manually
→ **[Tutorial: Live Payload Fuzzer](tutorial-live-payload-fuzzer.md)**

#### Run Security Tests (Load, Vulnerabilities, Egress)
→ **[Tutorial: Testing Lab](tutorial-testing-lab.md)**

#### Monitor and Respond to Attacks
→ **[Tutorial: Attacker Fingerprinting](tutorial-attacker-fingerprinting.md)**

#### Troubleshoot Issues
→ **[Quick Reference](quick-reference.md)** → Troubleshooting section

#### Find an Endpoint
→ **[API Reference](api.md)** or **[Complete Features](features.md)**

---

## 📚 Documentation Structure

```
docs/
├── NAVIGATOR.md (this file)
├── quick-reference.md ..................... Start here! Commands & scenarios
├── integration-guide.md ................... Apparatus + VulnLab integration
├── architecture.md ........................ System design & technical details
├── diagrams.md ............................ Visual flowcharts & network topology
├── features.md ............................ Feature inventory (58+)
├── api.md ................................ API endpoint reference
│
├── tutorial-cli.md ........................ Command-line tool & scripting
├── tutorial-dashboard.md .................. Web UI & real-time monitoring
├── tutorial-webhooks.md ................... Webhook integration
├── tutorial-chaos-engineering.md .......... Chaos features
├── tutorial-defense-rules.md .............. Defense mechanisms & WAF
├── tutorial-autopilot.md .................. AI red team automation
├── tutorial-monitoring.md ................. Metrics & observability
├── tutorial-scenarios.md .................. Multi-step scenarios
├── tutorial-live-payload-fuzzer.md ........ Interactive API & payload testing
├── tutorial-testing-lab.md ................ Unified security testing hub
├── tutorial-attacker-fingerprinting.md .... Real-time threat monitoring
│
└── DOCUMENTATION_ROADMAP.md .............. Future documentation plans
```

---

## 🔥 Most Visited Sections

1. **[Quick Reference](quick-reference.md)** — Commands & Docker setup
2. **[Tutorial: Dashboard](tutorial-dashboard.md)** — Real-time monitoring UI
3. **[Architecture Guide](architecture.md)** — How it works
4. **[Visual Diagrams](diagrams.md)** — Flowcharts & network topology
5. **[Integration Guide](integration-guide.md)** — Apparatus + VulnLab workflow

---

## 💡 Common Starting Points

### For Security Testers
1. Read: [Quick Reference](quick-reference.md)
2. Launch: `docker-compose up`
3. Open: http://localhost:8090/dashboard
4. Learn: [Tutorial: Dashboard](tutorial-dashboard.md)

### For Developers
1. Read: [Architecture Guide](architecture.md) + [Visual Diagrams](diagrams.md)
2. Setup: `pnpm install && pnpm build`
3. Start: `pnpm start` or `pnpm dev:server`
4. Test: `pnpm test`

### For DevOps/SRE
1. Read: [Integration Guide](integration-guide.md)
2. Deploy: `docker-compose up`
3. Monitor: [Tutorial: Monitoring](tutorial-monitoring.md)
4. Scale: See "Performance Tuning" in [Integration Guide](integration-guide.md)

### For Security Research
1. Read: [Tutorial: Autopilot](tutorial-autopilot.md)
2. Explore: [Tutorial: Chaos Engineering](tutorial-chaos-engineering.md)
3. Deep dive: [Complete Features](features.md)
4. Understand flows: [Visual Diagrams](diagrams.md)

---

## 🔍 Key Concepts at a Glance

| Concept | Learn More |
|---------|-----------|
| **MTD (Moving Target Defense)** | Architecture → Defense Architecture, or Features → DEFENSE section |
| **Autopilot (AI Red Team)** | Tutorial: Autopilot, or Features → RED TEAM AUTOMATION |
| **Scenarios (Multi-step tests)** | Tutorial: Scenarios, or Features → SCENARIO AUTOMATION |
| **Deception (Honeypot)** | Features → DECEPTION & HONEYPOTS |
| **Tarpit Defense** | Features → DEFENSE & MITIGATION |
| **Middleware Stack** | Architecture → Middleware Stack, or Visual Diagrams → Request Flow |
| **Protocol Servers** | Architecture → Protocol Servers, or Visual Diagrams → Protocol Architecture |
| **Self-Healing** | Features → DEFENSE & MITIGATION or Architecture → Core Systems |

---

## 🎓 Recommended Learning Path

### Level 1: Getting Started (30 minutes)
- [ ] [Quick Reference](quick-reference.md) — Commands & services
- [ ] Start docker-compose and explore dashboard
- [ ] Try 2-3 common testing scenarios

### Level 2: Understanding Architecture (1 hour)
- [ ] [Architecture Guide](architecture.md) — Read overview sections
- [ ] [Visual Diagrams](diagrams.md) — Study the 10 key diagrams
- [ ] [Integration Guide](integration-guide.md) — How components work together

### Level 3: Deep Dive Features (2 hours)
- [ ] Pick a feature area: Chaos, Deception, Autopilot, Defense
- [ ] Read corresponding tutorial
- [ ] Read corresponding feature catalog section
- [ ] Try hands-on examples

### Level 4: Advanced Usage (Variable)
- [ ] Read all remaining tutorials
- [ ] Explore [Complete Features](features.md)
- [ ] Review [API Reference](api.md)
- [ ] Create custom scenarios and automations

---

## 🤝 Need Help?

- **Questions about a feature?** → Search [Complete Features](features.md)
- **How do I...?** → Check "I want to..." section above
- **Technical question?** → Start with [Architecture Guide](architecture.md)
- **Not sure where to start?** → Read [Quick Reference](quick-reference.md)
- **Found an issue?** → Check Troubleshooting in [Quick Reference](quick-reference.md)

---

## 📖 Document Status

| Document | Purpose | Target Audience | Status |
|----------|---------|-----------------|--------|
| quick-reference.md | Quick commands & help | Everyone | ✅ Current |
| integration-guide.md | Component integration | Testers & DevOps | ✅ Current |
| architecture.md | Technical design | Developers | ✅ Current |
| diagrams.md | Visual architecture | Everyone | ✅ Current |
| features.md | Feature inventory | Everyone | ✅ Current |
| api.md | API endpoints | Developers | ✅ Current |
| tutorial-cli.md | CLI tool guide | Developers | ✅ Current |
| tutorial-dashboard.md | Web UI guide | Testers | ✅ Current |
| tutorial-webhooks.md | Webhook integration | Developers | ✅ Current |
| tutorial-chaos-engineering.md | Chaos features | Security team | ✅ Current |
| tutorial-defense-rules.md | Defense setup | Security team | ✅ Current |
| tutorial-autopilot.md | AI red team | Advanced users | ✅ Current |
| tutorial-monitoring.md | Monitoring & metrics | DevOps/SRE | ✅ Current |
| tutorial-scenarios.md | Scenario creation | Advanced users | ✅ Current |
| tutorial-live-payload-fuzzer.md | API/payload testing | Security testers | ✅ New |
| tutorial-testing-lab.md | Unified testing (k6/Nuclei) | QA/Security engineers | ✅ New |
| tutorial-attacker-fingerprinting.md | Threat monitoring & response | SOC/Incident response | ✅ New |

---

**Last Updated:** 2026-02-22

For documentation roadmap and planned improvements, see [DOCUMENTATION_ROADMAP.md](DOCUMENTATION_ROADMAP.md).
