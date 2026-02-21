# Integration Guide: Apparatus + VulnLab

This guide explains how Apparatus and VulnLab work together as a complete security testing ecosystem.

## Overview

**Apparatus** and **VulnLab** are two separate monorepos designed to work together:

| Component | Purpose | Location |
|-----------|---------|----------|
| **Apparatus** | Security testing platform (59+ features) | `/Users/nferguson/Developer/apparatus` |
| **VulnLab** | Vulnerable web app + API targets | `/Users/nferguson/Developer/VulnLab` |

Together they form a **complete attack/defense simulation lab**.

---

## Quick Start

```bash
# Navigate to Apparatus root
cd ~/Developer/apparatus

# Start everything with docker-compose
docker-compose up
```

Services will be available at:
- **Apparatus Dashboard**: http://localhost:8090/dashboard
- **VulnWeb**: http://localhost:3000
- **VulnAPI**: http://localhost:5000

---

## Architecture

### Docker Compose Network

```
┌─────────────────────────────────┐
│   Docker Network (security-lab) │
├─────────────────────────────────┤
│                                 │
│  ┌─────────┐  ┌─────────────┐  │
│  │Apparatus├─→│  VulnWeb    │  │
│  └─────────┘  └──────┬──────┘  │
│       │               │         │
│       └──────┬────────┘         │
│              │                  │
│         ┌────▼─────┐            │
│         │ VulnAPI  │            │
│         └──────────┘            │
│                                 │
└─────────────────────────────────┘
```

All containers run on isolated network `security-lab`:
- **Apparatus** can reach VulnWeb at `http://vuln-web:3000`
- **Apparatus** can reach VulnAPI at `http://vuln-api:5000`
- **VulnWeb** can reach VulnAPI at `http://vuln-api:5000`

---

## Typical Workflows

### 1. Red Team Testing Against VulnWeb

```bash
# Start full lab
docker-compose up

# In another terminal, launch autopilot against VulnWeb
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -H "Content-Type: application/json" \
  -d '{
    "target": "http://vuln-web:3000",
    "config": {
      "interval": 2000,
      "maxIterations": 50
    }
  }'

# Monitor in dashboard
open http://localhost:8090/dashboard

# Check results
curl http://localhost:8090/api/redteam/autopilot/reports | jq .
```

### 2. Payload Validation Against VulnAPI

```bash
# Test if VulnAPI detects XSS, SQLi, command injection
curl "http://localhost:8090/redteam/validate?target=http://vuln-api:5000&path=/search&method=GET"
```

### 3. Chaos Engineering While Testing

```bash
# Start baseline load against VulnWeb
for i in {1..10}; do
  curl http://localhost:3000/api/endpoint &
done

# Inject CPU spike via Apparatus
curl -X POST http://localhost:8090/chaos/cpu \
  -d '{"duration": 5000}'

# Monitor impact on VulnWeb response times
curl http://localhost:8090/dashboard
```

### 4. Scenario-Based Testing

```bash
# Create multi-step scenario targeting VulnLab
curl -X POST http://localhost:8090/scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "name": "vuln-app-stress-test",
    "steps": [
      {
        "id": "1",
        "action": "cluster.attack",
        "params": {
          "target": "http://vuln-web:3000/",
          "rate": 100
        }
      },
      {
        "id": "2",
        "action": "delay",
        "params": { "duration": 3000 }
      },
      {
        "id": "3",
        "action": "chaos.cpu",
        "params": { "duration": 5000 }
      }
    ]
  }'

# Run scenario
SCENARIO_ID="sc-..."  # from response
curl -X POST http://localhost:8090/scenarios/$SCENARIO_ID/run

# Monitor
curl "http://localhost:8090/scenarios/$SCENARIO_ID/status?executionId=run-..."
```

### 5. Defense Validation

```bash
# Activate MTD on Apparatus
curl -X POST http://localhost:8090/mtd \
  -d '{"prefix": "secure-xyz"}'

# Test if VulnWeb can still reach Apparatus (it will fail without prefix)
docker-compose exec vuln-web curl http://apparatus:8090/echo     # 404
docker-compose exec vuln-web curl http://apparatus:8090/secure-xyz/echo  # 200

# Add WAF rule to block certain paths
curl -X POST http://localhost:8090/sentinel/rules \
  -d '{"pattern": "/admin", "action": "block"}'

# Test blocking works
curl http://localhost:8090/secure-xyz/admin  # 403 Forbidden
```

---

## Development Workflow

### Making Changes to Apparatus

```bash
# Stop docker-compose
docker-compose down

# Make changes to src/
vi apps/apparatus/src/myfeature.ts

# Rebuild
pnpm build

# Start again
docker-compose up --build
```

### Making Changes to VulnLab

```bash
# Stop docker-compose
docker-compose down

# Navigate to VulnLab and make changes
cd ../VulnLab
vi apps/vuln-web/src/index.ts

# Build from VulnLab directory
pnpm build

# Back to Apparatus, restart
cd ../apparatus
docker-compose up --build
```

### Debugging

```bash
# View Apparatus logs
docker-compose logs -f apparatus

# View VulnWeb logs
docker-compose logs -f vuln-web

# View VulnAPI logs
docker-compose logs -f vuln-api

# Execute command in container
docker-compose exec apparatus pnpm test
docker-compose exec vuln-web npm test
```

---

## Key Endpoints for Integration

### Apparatus → VulnLab Testing

From **Apparatus**, attack or test VulnLab targets:

```bash
# Red team VulnWeb
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -d '{"target": "http://vuln-web:3000"}'

# Test payloads against VulnAPI
curl "http://localhost:8090/redteam/validate?target=http://vuln-api:5000&path=/api/users"

# Proxy requests through Apparatus to VulnWeb
curl "http://localhost:8090/proxy?url=http://vuln-web:3000/admin"

# Generate load against VulnWeb
curl -X POST http://localhost:8090/scenarios \
  -d '{
    "name": "load-test",
    "steps": [
      {
        "id": "1",
        "action": "cluster.attack",
        "params": {"target": "http://vuln-web:3000/", "rate": 50}
      }
    ]
  }'
```

### VulnLab → Apparatus Communication

If VulnLab needs to report findings or trigger events in Apparatus:

```javascript
// From VulnLab backend
const response = await fetch('http://apparatus:8090/webhooks/vuln-lab-events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'vulnerability_detected',
    type: 'xss',
    path: '/search',
    severity: 'high'
  })
});
```

Monitor webhook in Apparatus:
```bash
curl http://localhost:8090/hooks/vuln-lab-events/inspect
```

---

## Monitoring & Metrics

### Real-Time Dashboard

Open http://localhost:8090/dashboard to see:
- All requests hitting both Apparatus and (reflected via echo) VulnLab
- Real-time traffic heatmap
- Autopilot findings and progress
- Deception honeypot events
- System metrics

### Prometheus Metrics

```bash
# Get Prometheus metrics
curl http://localhost:8090/metrics

# Example metrics:
# http_requests_total{method="POST",route="/api/redteam/autopilot/start",status_code="202"} 1
# http_request_duration_microseconds_bucket{le="1000", method="GET", route="/echo"} 42
```

### Request History

```bash
# View recent requests
curl http://localhost:8090/history | jq .

# Clear history
curl -X DELETE http://localhost:8090/history
```

---

## Performance Tuning

### Docker Compose Resource Limits

Edit `docker-compose.yml` to add limits:

```yaml
services:
  apparatus:
    mem_limit: 512m
    cpus: 2

  vuln-web:
    mem_limit: 256m
    cpus: 1

  vuln-api:
    mem_limit: 256m
    cpus: 1
```

### Reduce Event Storage

Apparatus stores events in memory. To prevent bloat:

```bash
# Clear deception events
curl -X DELETE http://localhost:8090/deception/history

# Clear request history
curl -X DELETE http://localhost:8090/history

# Clear webhooks
docker-compose exec apparatus rm -rf /tmp/webhooks
```

### Run Services Separately

If you only need one component:

```bash
# Just Apparatus
docker-compose up apparatus

# Just VulnLab (from VulnLab repo)
cd ../VulnLab
docker-compose up

# Just run source (no Docker)
cd apparatus
pnpm build && pnpm start
```

---

## Troubleshooting

### Containers won't start

```bash
# Check logs
docker-compose logs

# Verify images built correctly
docker images | grep -E "apparatus|vuln"

# Clean and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Network connectivity issues

```bash
# Check network exists
docker network ls | grep security-lab

# Inspect network
docker network inspect apparatus_security-lab

# Test connectivity from Apparatus
docker-compose exec apparatus curl http://vuln-web:3000/health
docker-compose exec apparatus curl http://vuln-api:5000/health
```

### Services unhealthy

```bash
# Check health status
docker-compose ps

# View startup logs
docker-compose logs --tail=100 apparatus

# Give containers more time to start
docker-compose up --wait  # Waits for healthchecks
```

### Dashboard not loading

```bash
# Verify Apparatus is running
curl http://localhost:8090/healthz

# Check browser console for errors (F12)
# Try hard refresh: Cmd+Shift+R or Ctrl+Shift+R

# Clear browser cache and try again
```

### Autopilot not connecting to target

```bash
# Verify target is reachable
docker-compose exec apparatus curl http://vuln-web:3000/health

# Check network configuration
docker-compose ps  # Verify all containers are running

# View autopilot logs
docker-compose logs apparatus | grep -i autopilot
```

---

## Advanced: Custom Integration

### Add Your Own Target

Edit `docker-compose.yml`:

```yaml
services:
  my-app:
    build:
      context: ../my-vulnerable-app
    ports:
      - "8000:8000"
    networks:
      - security-lab
```

Then test against it from Apparatus:

```bash
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -d '{"target": "http://my-app:8000"}'
```

### Custom Scenario for VulnLab

```bash
curl -X POST http://localhost:8090/scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "name": "comprehensive-vuln-lab-test",
    "steps": [
      { "id": "1", "action": "delay", "params": { "duration": 1000 } },
      { "id": "2", "action": "chaos.memory", "params": { "action": "allocate", "amount": 256 } },
      { "id": "3", "action": "cluster.attack", "params": { "target": "http://vuln-web:3000/", "rate": 75 } },
      { "id": "4", "action": "delay", "params": { "duration": 3000 } },
      { "id": "5", "action": "chaos.cpu", "params": { "duration": 5000 } }
    ]
  }'
```

### Monitor Traffic in Terminal UI

```bash
# Run Terminal UI in Apparatus
docker-compose exec apparatus pnpm tui

# Watch real-time metrics while testing VulnLab
```

---

## Next Steps

- **[Quick Reference](quick-reference.md)** - Common commands and scenarios
- **[Features](features.md)** - All 58+ features explained
- **[Architecture](architecture.md)** - System design and data flow
- **[VulnLab Documentation](../../VulnLab)** - Vulnerable app details

---

## Support

- 📖 Apparatus docs: See `/docs/` folder
- 🐛 Issues: Report in respective repository
- 💬 Questions: Check integration examples above

---

**Last Updated**: 2026-02-18
