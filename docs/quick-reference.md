# Quick Reference Guide

## Starting Everything

### Full Lab (Apparatus + VulnLab)

```bash
cd apparatus
docker-compose up
```

Wait for all services to be healthy (30-60 seconds).

### Just Apparatus

```bash
cd apparatus
pnpm install
pnpm build
pnpm start
```

---

## Accessing Services

| Service | URL | Purpose |
|---------|-----|---------|
| **Apparatus Dashboard** | http://localhost:8090/dashboard | Real-time testing control & monitoring |
| **Apparatus API** | http://localhost:8090 | Testing platform endpoints |
| **VulnWeb** | http://localhost:3000 | Vulnerable web application (12 UIs) |
| **VulnAPI** | http://localhost:5000 | Vulnerable REST API (450+ endpoints) |
| **Apparatus Metrics** | http://localhost:8090/metrics | Prometheus metrics (Grafana-compatible) |
| **Apparatus Docs** | http://localhost:8090/docs | Swagger API documentation |

---

## Common Testing Scenarios

### 1. Launch AI Red Team Against VulnWeb

```bash
# Start autopilot
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -H "Content-Type: application/json" \
  -d '{
    "target": "http://vuln-web:3000",
    "config": {
      "interval": 2000,
      "maxIterations": 50,
      "allowedTools": ["chaos.cpu", "cluster.attack", "mtd.rotate"]
    }
  }'

# Check status
curl http://localhost:8090/api/redteam/autopilot/status

# Get results
curl http://localhost:8090/api/redteam/autopilot/reports | jq .

# Stop autopilot
curl -X POST http://localhost:8090/api/redteam/autopilot/stop
```

### 2. Validate Payload Detection

```bash
# Test XSS/SQLi/command injection against VulnAPI
curl "http://localhost:8090/redteam/validate?target=http://vuln-api:5000&path=/search&method=GET"

# Test against VulnWeb
curl "http://localhost:8090/redteam/validate?target=http://vuln-web:3000&path=/api/users&method=POST"
```

### 3. Monitor Real-Time Traffic

Open browser to: **http://localhost:8090/dashboard**

Features:
- Live request feed with SSE streaming
- Traffic heatmap and latency analysis
- Deception honeypot events
- Tarpit defense activity
- System health metrics

### 4. Run Chaos While Testing

```bash
# Trigger CPU spike
curl -X POST http://localhost:8090/chaos/cpu \
  -d '{"duration": 5000}'

# Allocate memory
curl -X POST http://localhost:8090/chaos/memory \
  -d '{"action": "allocate", "amount": 512}'

# Trigger distributed cluster attack
curl -X POST http://localhost:8090/cluster/attack \
  -d '{"target": "http://vuln-web:3000/", "rate": 50}'
```

### 5. Run Pre-Built Scenarios

```bash
# Create a scenario
curl -X POST http://localhost:8090/scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "name": "coordinated-chaos-test",
    "steps": [
      { "id": "1", "action": "chaos.cpu", "params": { "duration": 3000 } },
      { "id": "2", "action": "delay", "params": { "duration": 2000 } },
      { "id": "3", "action": "cluster.attack", "params": { "target": "http://vuln-web:3000/", "rate": 100 } }
    ]
  }'

# Extract scenario ID from response
SCENARIO_ID="sc-1708..."

# Run scenario
curl -X POST http://localhost:8090/scenarios/$SCENARIO_ID/run

# Get execution ID from response
EXECUTION_ID="run-..."

# Monitor execution
curl "http://localhost:8090/scenarios/$SCENARIO_ID/status?executionId=$EXECUTION_ID"
```

### 6. Activate Defense Mechanisms

```bash
# Add WAF rule (Active Shield)
curl -X POST http://localhost:8090/sentinel/rules \
  -H "Content-Type: application/json" \
  -d '{"pattern": "/admin", "action": "block"}'

# List rules
curl http://localhost:8090/sentinel/rules

# Enable Moving Target Defense (MTD)
curl -X POST http://localhost:8090/mtd \
  -d '{"prefix": "secure-xyz123"}'

# Verify MTD requires prefix
curl http://localhost:8090/echo      # Returns 404
curl http://localhost:8090/secure-xyz123/echo  # Returns 200
```

### 7. Capture and Inspect Traffic

```bash
# Capture PCAP for 30 seconds
curl "http://localhost:8090/capture.pcap?duration=30&iface=eth0" -o traffic.pcap

# Inspect via Wireshark
wireshark traffic.pcap

# View request history
curl http://localhost:8090/history | jq .

# Clear history
curl -X DELETE http://localhost:8090/history
```

### 8. Test DLP Detection

```bash
# Generate credit card numbers
curl "http://localhost:8090/dlp?type=cc"

# Generate SSNs
curl "http://localhost:8090/dlp?type=ssn"

# Generate fake SQL errors
curl "http://localhost:8090/dlp?type=sql"

# Test if your DLP system detects these
```

### 9. Webhook Testing

```bash
# Send webhook to Apparatus
curl -X POST http://localhost:8090/hooks/my-webhook-id \
  -H "Content-Type: application/json" \
  -d '{"event": "deployment", "version": "1.0.0"}'

# Inspect webhooks received
curl http://localhost:8090/hooks/my-webhook-id/inspect
```

### 10. Terminal UI Monitoring

```bash
# In apparatus directory
pnpm tui
```

Features:
- Real-time traffic graph
- Request/response details
- Event streams (deception, tarpit, webhooks)
- System metrics (CPU, memory, event loop lag)
- Scenario control
- API status monitoring

---

## Useful Endpoints

### Reflection & Debugging
- `GET /echo` - Echo back all request details
- `GET /sysinfo` - System and process information
- `GET /metrics` - Prometheus metrics
- `GET /healthz` - Basic health check
- `GET /health/pro` - Advanced health with lag metrics
- `GET /history` - Recent request history

### Network Tools
- `GET /dns?target=example.com&type=A` - DNS queries
- `GET /ping?target=host:port` - TCP connectivity test
- `GET /generate?size=100mb` - Generate bandwidth
- `POST /sink` - Discard uploaded data

### Security Testing
- `GET /redteam/validate?target=...&path=...` - Payload validation
- `GET /debug/jwt?token=...` - JWT debugging
- `GET /dlp?type=cc|ssn|email|sql` - Sensitive data generation
- `GET /ratelimit` - Rate limit testing

### Defense & Deception
- `GET /deception/history` - Honeypot events
- `GET /tarpit` - Trapped IPs
- `POST /tarpit/release` - Release trapped IPs
- `GET /sentinel/rules` - Active Shield (WAF) rules
- `POST /mtd` - Rotate Moving Target Defense prefix

### Cluster & Distributed
- `POST /cluster/attack` - Broadcast attack to cluster
- `GET /cluster/members` - List cluster nodes

---

## Docker Compose Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f apparatus

# Stop all services
docker-compose down

# Rebuild images
docker-compose build

# Rebuild and restart
docker-compose up --build

# View service status
docker-compose ps

# Execute command in container
docker-compose exec apparatus pnpm test
```

---

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs apparatus
docker-compose logs vuln-web
docker-compose logs vuln-api

# Verify ports are free
lsof -i :8090
lsof -i :3000
lsof -i :5000

# Clean up and restart
docker-compose down -v
docker-compose up --build
```

### Dashboard not loading

```bash
# Verify Apparatus is running
curl http://localhost:8090/healthz

# Check for build errors
docker-compose logs apparatus | grep -i error

# Clear browser cache (Ctrl+Shift+Del) and refresh
```

### Tests failing

```bash
# Run tests in container
docker-compose exec apparatus pnpm test

# Run specific test
docker-compose exec apparatus pnpm test -- test/scenarios.test.ts

# Run with verbose output
docker-compose exec apparatus pnpm test -- --reporter=verbose
```

### Red team autopilot not connecting to target

```bash
# Verify target is reachable from Apparatus container
docker-compose exec apparatus curl http://vuln-web:3000/health

# Check network
docker network inspect apparatus_security-lab

# Verify firewall rules
```

---

## Performance Tips

### Reduce Memory Usage
```bash
# Limit Docker container memory
docker-compose.yml: `mem_limit: 512m`

# Clear old deception events
curl -X DELETE http://localhost:8090/deception/history

# Clear request history
curl -X DELETE http://localhost:8090/history
```

### Improve Dashboard Performance
- Close browser DevTools (F12) while monitoring
- Reduce SSE client count by refreshing fewer browser tabs
- Use TUI (`pnpm tui`) for lighter-weight monitoring

### Run Specific Services Only
```bash
# Just Apparatus
docker-compose up apparatus

# Just VulnLab
docker-compose up vuln-web vuln-api
```

---

## Useful Aliases

Add to `.bash_profile` or `.zshrc`:

```bash
# Start full lab
alias apparatus-lab='cd ~/Developer/apparatus && docker-compose up'

# Just Apparatus
alias apparatus-start='cd ~/Developer/apparatus && pnpm build && pnpm start'

# View dashboard
alias apparatus-dash='open http://localhost:8090/dashboard'

# Run tests
alias apparatus-test='cd ~/Developer/apparatus && pnpm test'

# Terminal UI
alias apparatus-tui='cd ~/Developer/apparatus && pnpm tui'

# Red team start
alias apparatus-redteam='curl -X POST http://localhost:8090/api/redteam/autopilot/start -H "Content-Type: application/json" -d'

# Check status
alias apparatus-status='curl http://localhost:8090/healthz && curl http://localhost:3000/health && curl http://localhost:5000/health'
```

---

## Next Steps

- **[View All Features](features.md)** - Complete feature catalog
- **[API Reference](api.md)** - Detailed endpoint documentation
- **[Architecture Guide](architecture.md)** - System design and flow
- **[VulnLab Docs](../../VulnLab)** - Vulnerable application details
