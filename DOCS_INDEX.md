# Apparatus Documentation Index

Quick navigation guide to all Apparatus documentation.

## 📖 Core Documentation

### [README.md](README.md) - START HERE
Main project overview with:
- Project purpose and use cases
- 58+ feature highlights
- Quick start (3 options: full lab, just Apparatus, Docker)
- Technology stack
- Security notice

### [docs/quick-reference.md](docs/quick-reference.md) - COMMON TASKS
Fast lookup for:
- Starting services
- Accessing endpoints (table)
- 10 common testing scenarios with curl examples
- Docker Compose commands
- Troubleshooting
- Useful aliases

### [docs/features.md](docs/features.md) - COMPLETE FEATURE CATALOG
Comprehensive reference of all 58+ features:
- Defense & Mitigation (4)
- Deception & Honeypots (2)
- Chaos Engineering (4)
- Network & Diagnostics (7)
- Security Testing & Red Team (2)
- Scenario Engine (1)
- Identity & Authentication (2)
- Data Protection (1)
- Rate Limiting (1)
- API & Query Interfaces (3)
- Webhooks (1)
- System & Infrastructure (4)
- Health Checks (1)
- Distributed Systems (1)
- Multi-Protocol Servers (11+)
- Advanced Features (8)
- State Management (1)
- Dashboard & UI (2)
- CLI Application (12 command categories)
- Architecture highlights

### [docs/architecture.md](docs/architecture.md) - SYSTEM DESIGN
Deep dive into how Apparatus works:
- Repository structure
- High-level data flow diagram
- Request flow through middleware
- Component architecture (6 major systems)
- Storage & state management
- Network topology in Docker Compose
- Execution models (sync, async, event streaming, agents)
- Key design patterns
- Performance characteristics
- Security architecture
- Extensibility points
- Deployment architectures
- Future improvements

### [docs/integration-guide.md](docs/integration-guide.md) - APPARATUS + VULNLAB
How to use Apparatus with VulnLab:
- Overview of both projects
- Quick start (docker-compose up)
- Architecture diagram
- 5 typical workflows with examples
- Development workflow
- Key endpoints for integration
- Monitoring & metrics
- Performance tuning
- Troubleshooting
- Advanced customization

### [docker-compose.yml](docker-compose.yml) - FULL LAB SETUP
Docker Compose configuration that orchestrates:
- Apparatus testing platform
- VulnLab web application
- VulnLab REST API
- Networking and health checks

---

## 🚀 Getting Started

### First Time Users
1. Read [README.md](README.md) - Understand what Apparatus is
2. Follow [Quick Start](README.md#quick-start) - Get it running
3. Check [Quick Reference](docs/quick-reference.md) - Try common commands
4. Explore [Dashboards](http://localhost:8090/dashboard) - See it in action

### For Testing VulnLab
1. Start with [Integration Guide](docs/integration-guide.md)
2. Run `docker-compose up` from Apparatus directory
3. Try the [5 typical workflows](docs/integration-guide.md#typical-workflows)
4. Monitor via [dashboard](http://localhost:8090/dashboard) or [terminal UI](docs/quick-reference.md#10-terminal-ui-monitoring)

### For Development
1. Read [Architecture](docs/architecture.md) - Understand the system
2. Check [docker-compose.yml](docker-compose.yml) - See service setup
3. Reference [Quick Ref - Development Workflow](docs/integration-guide.md#development-workflow)
4. Explore `apps/apparatus/src/` for feature implementations

### For Security Testing
1. Review [Features](docs/features.md) - Browse available tools
2. Check [Quick Ref - Common Scenarios](docs/quick-reference.md#common-testing-scenarios)
3. Customize scenarios using [Scenario Engine](docs/features.md#scenario-engine)
4. Monitor results on [dashboard](http://localhost:8090/dashboard)

---

## 📋 Documentation by Task

### "I want to..."

#### Run Everything
→ [README Quick Start - Full Lab](README.md#option-1-full-lab-with-vulnlab-recommended-for-testing)

#### Run Just Apparatus
→ [README Quick Start - Just Apparatus](README.md#option-2-just-apparatus)

#### Test Against VulnLab
→ [Integration Guide - Typical Workflows](docs/integration-guide.md#typical-workflows)

#### Find a Specific Feature
→ [Features Catalog](docs/features.md) - Use Ctrl+F to search

#### Understand the Architecture
→ [Architecture Guide](docs/architecture.md) - Read full system design

#### Troubleshoot Issues
→ [Quick Ref - Troubleshooting](docs/quick-reference.md#troubleshooting)
→ [Integration Guide - Troubleshooting](docs/integration-guide.md#troubleshooting)

#### Use the Dashboard
→ [Features - Dashboard & UI](docs/features.md#dashboard--ui-2-interfaces)

#### Create a Custom Scenario
→ [Features - Scenario Engine](docs/features.md#scenario-engine-1-feature)
→ [Quick Ref - Run Pre-Built Scenarios](docs/quick-reference.md#5-run-pre-built-scenarios)

#### Activate Defense Mechanisms
→ [Quick Ref - Activate Defense Mechanisms](docs/quick-reference.md#6-activate-defense-mechanisms)

#### Launch Red Team Testing
→ [Quick Ref - Launch AI Red Team](docs/quick-reference.md#1-launch-ai-red-team-against-vulnweb)

#### Monitor Traffic
→ [Quick Ref - Monitor Real-Time Traffic](docs/quick-reference.md#3-monitor-real-time-traffic)

#### Troubleshoot Docker
→ [Integration Guide - Troubleshooting](docs/integration-guide.md#troubleshooting)

---

## 🔗 Related Projects

**VulnLab** - Vulnerable web app and API targets
- Location: `../VulnLab`
- Purpose: Provides realistic attack targets for security testing
- Integrated via: docker-compose
- See: [Integration Guide](docs/integration-guide.md)

---

## 📊 Documentation Stats

| Document | Purpose | Length | Best For |
|-----------|---------|--------|----------|
| README.md | Project overview | ~800 lines | First-time understanding |
| quick-reference.md | Common tasks | ~400 lines | Copy-paste recipes |
| features.md | Feature catalog | ~2000 lines | Finding specific features |
| architecture.md | System design | ~1500 lines | Understanding internals |
| integration-guide.md | VulnLab integration | ~800 lines | Testing VulnLab |
| docker-compose.yml | Service orchestration | ~50 lines | Docker setup |

**Total: ~5500 lines of documentation**

---

## 🎯 Quick Links

| Task | Link |
|------|------|
| Start full lab | `cd apparatus && docker-compose up` |
| Access dashboard | http://localhost:8090/dashboard |
| View all endpoints | `curl http://localhost:8090/docs` |
| Get metrics | `curl http://localhost:8090/metrics` |
| Run tests | `pnpm test` |
| Terminal UI | `pnpm tui` |

---

## 💡 Tips

- **Overwhelmed?** Start with [README](README.md), then [Quick Reference](docs/quick-reference.md)
- **Learning architecture?** Read [Architecture](docs/architecture.md) section by section
- **Want examples?** Check [Quick Reference](docs/quick-reference.md) scenarios
- **Debugging?** Search [Troubleshooting](docs/quick-reference.md#troubleshooting) sections
- **Need help?** Search relevant doc with Ctrl+F

---

## 📝 Document Relationships

```
README.md (START HERE)
├── Features.md (WHAT you can do)
├── Architecture.md (HOW it works)
├── Quick-Reference.md (RECIPES)
├── Integration-Guide.md (WITH VulnLab)
└── docker-compose.yml (SETUP)
```

---

**Last Updated**: 2026-02-18

All documentation is maintained in sync with the codebase.
