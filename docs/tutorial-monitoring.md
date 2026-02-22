# Tutorial: Monitoring & Observability – Watch Your Tests in Real-Time

> Collect metrics, stream events, and monitor security tests across logs, dashboards, and terminal UIs.

---

## What You'll Learn

- ✅ Enable and stream SSE (Server-Sent Events) for real-time updates
- ✅ Export Prometheus metrics and integrate with Grafana
- ✅ Tail logs and analyze attack events in real-time
- ✅ Use the terminal UI (blessed) to monitor from the command line
- ✅ Create custom dashboards to track security metrics
- ✅ Set up alerts when vulnerabilities are found
- ✅ Analyze metrics for performance and failure patterns

## Prerequisites

- **Apparatus running** — Server at `http://localhost:8090`
- **curl installed** — For API commands
- **Terminal access** — For CLI monitoring
- **Browser** — For dashboard viewing
- **Optional: Grafana** — For advanced dashboarding (we'll show setup)
- **Optional: jq** — For JSON parsing in terminal

## Time Estimate

~35 minutes (SSE setup → metrics export → dashboard → terminal UI)

## What You'll Build

By the end, you'll have:
1. **Real-time event streaming** from Apparatus
2. **Prometheus metrics** exported and queryable
3. **Grafana dashboard** showing attack trends
4. **Terminal UI** monitoring without browser
5. **Custom alerts** when security events occur

---

## Section 1: Understanding Monitoring in Apparatus

### Three Pillars of Observability

| Pillar | What It Shows | Tool |
|--------|---|---|
| **Logs** | What happened (events) | Terminal, dashboards |
| **Metrics** | How much (counts, rates, timing) | Prometheus, Grafana |
| **Traces** | How did it happen (flow) | SSE events |

### Apparatus Monitoring Architecture

<img src="/dashboard/assets/diagrams/diagram-7-monitoring.svg" alt="Monitoring architecture across SSE, Prometheus metrics, logs, dashboards, and analysis tools." width="680" style="max-width: 100%; height: auto;" />

### Metrics Apparatus Tracks

**Request Metrics:**
- Total requests
- Requests per second (RPS)
- Response time distribution
- Error rate
- Status code breakdown (2xx, 4xx, 5xx)

**Security Metrics:**
- Vulnerabilities found
- Requests blocked by WAF
- IPs trapped in tarpit
- Rate-limited requests
- Attack attempts by tool

**Performance Metrics:**
- Event loop lag
- CPU usage
- Memory consumption
- GC pause duration

---

## Section 2: SSE (Server-Sent Events) Streaming

### What SSE Does

**SSE** pushes events from server to client in real-time. Instead of polling ("Is there new data?"), the server automatically sends data when something happens.

**Use cases:**
- Dashboard updates as attacks happen
- Alerts when vulnerabilities found
- Real-time traffic monitoring
- Live scenario execution

### Connect to SSE Stream

**Step 1: Start the Stream**

```bash
curl -N http://localhost:8090/sse
```

**What it does:**
- `-N` disables buffering (immediate output)
- Stream stays open, receiving events indefinitely
- Press `Ctrl+C` to stop

**Expected output (starts immediately):**
```
data: {"type":"health","status":"healthy","timestamp":"2026-02-21T20:30:00Z"}

data: {"type":"request","method":"GET","path":"/api/users","status":200,"duration":45}

data: {"type":"defense","action":"blocked","pattern":"xss","ip":"192.168.1.42"}

data: {"type":"finding","vulnerability":"reflected_xss","severity":"high","path":"/search"}
```

**Each line is a JSON event.** Events keep coming as actions happen.

### Step 2: Filter Events by Type

You probably don't want ALL events. Filter for specific types:

```bash
# Only vulnerability findings
curl -N http://localhost:8090/sse | grep '"type":"finding"'

# Only requests that were blocked
curl -N http://localhost:8090/sse | grep '"action":"blocked"'

# Only security events (defense, findings)
curl -N http://localhost:8090/sse | grep -E '"type":"(finding|defense)"'
```

### Step 3: Parse and Pretty-Print Events

Use `jq` to parse JSON:

```bash
# Pretty-print all events
curl -N http://localhost:8090/sse | sed 's/^data: //' | jq .

# Show only vulnerabilities with severity
curl -N http://localhost:8090/sse | sed 's/^data: //' | jq 'select(.type=="finding") | {severity, vulnerability, path}'

# Count events by type
curl -N http://localhost:8090/sse | sed 's/^data: //' | jq -s 'group_by(.type) | map({type: .[0].type, count: length})'
```

### Exercise: Monitor an Attack Via SSE

**Part 1: Start SSE stream in one terminal**
```bash
curl -N http://localhost:8090/sse | sed 's/^data: //' | jq '.'
```

**Part 2: Launch attack in another terminal**
```bash
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -H "Content-Type: application/json" \
  -d '{
    "target": "http://vuln-web:3000",
    "config": {
      "interval": 2000,
      "maxIterations": 5,
      "allowedTools": ["redteam.xss", "redteam.sqli"]
    }
  }'
```

**Expected:** SSE terminal shows real-time attack events as they happen

### Checkpoint

- [ ] Connected to SSE stream successfully (got data flowing)
- [ ] Saw multiple event types (request, finding, defense)
- [ ] Filtered events for specific types
- [ ] Parsed JSON with jq
- [ ] Monitored a real attack via SSE

---

## Section 3: Prometheus Metrics

### What Prometheus Does

**Prometheus** collects metrics and stores them in a time-series database. Then tools like **Grafana** can query and visualize them.

### Step 1: Access Prometheus Metrics Endpoint

```bash
curl http://localhost:8090/metrics
```

**Output (text format):**
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1234
http_requests_total{method="GET",status="403"} 56
http_requests_total{method="POST",status="200"} 89

# HELP http_request_duration_ms HTTP request duration
# TYPE http_request_duration_ms histogram
http_request_duration_ms_bucket{le="10",path="/health"} 50
http_request_duration_ms_bucket{le="50",path="/health"} 120
http_request_duration_ms_bucket{le="100",path="/api/users"} 45
```

**Format explained:**
- `# HELP` — Description of the metric
- `# TYPE` — Metric type (counter, gauge, histogram)
- Lines with values — Actual data points

### Step 2: Query Metrics

**Sample queries:**

```bash
# Get request rate (requests per minute)
curl -s http://localhost:8090/metrics | grep 'http_requests_total'

# Get errors only
curl -s http://localhost:8090/metrics | grep 'status="[45][0-9][0-9]"'

# Get average response time
curl -s http://localhost:8090/metrics | grep 'http_request_duration_ms'
```

### Step 3: Set Up Prometheus Collection

Create a `prometheus.yml` config file:

```yaml
global:
  scrape_interval: 15s  # Collect metrics every 15 seconds

scrape_configs:
  - job_name: 'apparatus'
    static_configs:
      - targets: ['localhost:8090']
    metrics_path: '/metrics'
```

**Start Prometheus:**

```bash
# Using Docker
docker run -p 9090:9090 -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Or download binary from https://prometheus.io/download/
./prometheus --config.file=prometheus.yml
```

**Access Prometheus UI:**
```
http://localhost:9090
```

### Step 4: Query Metrics in Prometheus

In the Prometheus UI:
1. Go to "Graph" tab
2. Enter a query, e.g.: `rate(http_requests_total[5m])`
3. Click "Execute"
4. See request rate over time

**Useful queries:**

| Query | What It Shows |
|-------|---|
| `http_requests_total` | Total requests since startup |
| `rate(http_requests_total[5m])` | Requests per second (5-min average) |
| `http_request_duration_ms` | Response time histogram |
| `http_errors_total` | Errors only |

### Checkpoint

- [ ] Accessed `/metrics` endpoint
- [ ] Saw Prometheus-format metrics
- [ ] Parsed metrics with grep
- [ ] (Optional) Set up Prometheus and queried metrics

---

## Section 4: Grafana Dashboards

### What Grafana Does

**Grafana** visualizes Prometheus metrics in dashboards with graphs, tables, and alerts.

### Setup Grafana

**Using Docker:**

```bash
docker run -d -p 3000:3000 \
  -e "GF_SECURITY_ADMIN_PASSWORD=admin" \
  grafana/grafana

# Access at http://localhost:3000
# Login: admin / admin
```

### Create a Dashboard

**Step 1: Add Prometheus Data Source**

1. Go to http://localhost:3000
2. Settings (gear icon) → Data Sources
3. Click "Add data source"
4. Select "Prometheus"
5. URL: `http://localhost:8090` (if Prometheus is on Apparatus)
   OR `http://prometheus:9090` (if using Docker)
6. Click "Save & Test"

**Step 2: Create a Dashboard**

1. Click "+" → Dashboard
2. Click "Add panel"
3. Select "Graph"
4. Configure query:
   - Data source: Prometheus
   - Query: `rate(http_requests_total[5m])`
   - Legend: `{{method}} {{status}}`
5. Title: "Request Rate"
6. Click "Apply"

**Step 3: Add More Panels**

Repeat for each metric:

**Panel 2: Error Rate**
```
Query: rate(http_errors_total[5m])
Title: "Error Rate"
```

**Panel 3: Response Time**
```
Query: http_request_duration_ms
Title: "Response Time"
```

**Panel 4: Vulnerabilities Found**
```
Query: security_vulnerabilities_found_total
Title: "Vulnerabilities Discovered"
```

### View Real-Time Dashboard

1. Run an autopilot campaign or scenario
2. Watch Grafana dashboard update in real-time
3. See requests, errors, and vulnerabilities as they happen

### Checkpoint

- [ ] (Optional) Installed and accessed Grafana
- [ ] Created Prometheus data source
- [ ] Created at least one panel/graph
- [ ] Configured metrics queries

---

## Section 5: Terminal UI Monitoring

### The blessed Terminal UI

**Apparatus includes a terminal UI** built with blessed. Monitor everything from the command line!

### Start the Terminal UI

```bash
pnpm tui
```

OR from the Docker container:

```bash
docker exec apparatus-server npm run tui
```

**What you see:**

<img src="/dashboard/assets/diagrams/diagram-44-terminal-dashboard-layout.svg" alt="Terminal monitoring dashboard layout showing status and request metrics, events and vulnerability panels, and traffic graph." width="940" style="max-width: 100%; height: auto;" />

### Terminal UI Features

**18+ Widget Types Available:**
- System status (health, uptime, memory)
- Request metrics (RPS, latency, error rate)
- Event feeds (real-time request log)
- Vulnerability counter
- Traffic graphs
- Attack history
- Defense statistics
- Tarpit status

### Keyboard Controls

| Key | Action |
|-----|--------|
| `q` | Quit |
| `h` | Help |
| `1-9` | Switch tabs/views |
| `Space` | Pause/resume updates |
| `c` | Clear selected widget |
| `r` | Refresh all |

### Exercise: Monitor with Terminal UI

**Part 1: Start TUI**
```bash
pnpm tui
```

**Part 2: Launch attack in another terminal**
```bash
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -H "Content-Type: application/json" \
  -d '{
    "target": "http://vuln-web:3000",
    "config": {
      "interval": 1000,
      "maxIterations": 10,
      "allowedTools": ["redteam.xss", "redteam.sqli"]
    }
  }'
```

**Watch the TUI:**
- RPS increases (requests per second)
- Events stream in real-time
- Vulnerability counter increments
- Graphs update live

### Checkpoint

- [ ] Started terminal UI (`pnpm tui`)
- [ ] Saw multiple widgets/panels
- [ ] Understood keyboard controls
- [ ] Monitored a real attack in TUI

---

## Section 6: Log Aggregation (Advanced)

### Sending Logs to External Systems

### Send to Splunk

**Splunk** collects and indexes logs. Configure Apparatus to send logs:

```bash
# Configure Splunk HEC (HTTP Event Collector)
curl -X POST http://localhost:8090/_sensor/config/integrations \
  -H "Content-Type: application/json" \
  -d '{
    "splunk_hec_url": "https://splunk.example.com:8088",
    "splunk_hec_token": "your-token-here"
  }'
```

**Apparatus will now send logs to Splunk.** Query them:

```
index=apparatus vulnerability=found
| stats count by severity
```

### Send to ELK Stack (Elasticsearch + Logstash + Kibana)

**Elasticsearch** stores logs, **Kibana** visualizes:

```bash
# Docker Compose stack
docker-compose -f docker-compose.elk.yml up
```

**Configure Apparatus to send to Logstash:**

```bash
curl -X POST http://localhost:8090/_sensor/config/integrations \
  -H "Content-Type: application/json" \
  -d '{
    "logstash_host": "logstash",
    "logstash_port": 5000
  }'
```

---

## Section 7: Creating Alerts

### Alert When Vulnerabilities Found

**Create an alert using Prometheus AlertManager:**

```yaml
groups:
  - name: apparatus
    rules:
      - alert: VulnerabilityFound
        expr: security_vulnerabilities_found_total > 0
        for: 1m
        annotations:
          summary: "Vulnerability discovered in security test"
          description: "{{ $value }} vulnerabilities found"

      - alert: HighErrorRate
        expr: rate(http_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "Error rate high (>5%)"
```

**Receive alerts:**
- **Slack** — Post to #security-alerts channel
- **Email** — Send to security-team@company.com
- **PagerDuty** — Create incident for on-call engineer
- **Webhook** — POST to your API

---

## Section 8: Real-Time Dashboard Queries

### Common Monitoring Questions

**"How many vulnerabilities were found today?"**
```bash
curl -s http://localhost:8090/metrics | grep 'security_vulnerabilities' | tail -1
```

**"What's the error rate in the last 5 minutes?"**
```bash
# Using Prometheus
promql: rate(http_errors_total[5m]) / rate(http_requests_total[5m])
```

**"Which endpoints are slowest?"**
```bash
curl -s http://localhost:8090/metrics | grep 'http_request_duration' | sort -k2 -rn | head -10
```

**"How many requests blocked by WAF?"**
```bash
curl -s http://localhost:8090/metrics | grep 'waf_requests_blocked' | awk '{print $2}' | paste -sd+ | bc
```

---

## Section 9: Troubleshooting Monitoring

### Metrics Endpoint Returns Nothing

**Symptom:** `curl http://localhost:8090/metrics` returns empty

**Cause:** Metrics collection disabled or no requests have been made yet

**Solution:**
1. Send a request to Apparatus to generate metrics
2. Check if metrics collection is enabled: `curl http://localhost:8090/_sensor/config/metrics`
3. Enable if disabled

---

### SSE Stream Disconnects

**Symptom:** SSE stream stops receiving events after a few minutes

**Cause:** Network timeout or server restart

**Solution:**
```bash
# Reconnect automatically
while true; do
  curl -N http://localhost:8090/sse | process_events
  sleep 5
done
```

---

### Grafana Can't Connect to Prometheus

**Symptom:** "Unable to connect to Prometheus" error in Grafana

**Cause:** Wrong URL or Prometheus not running

**Solution:**
1. Verify Prometheus is running: `curl http://localhost:9090/api/v1/query?query=up`
2. Check Grafana data source URL (should be `http://prometheus:9090` in Docker)
3. Restart both services

---

## Summary

You've learned how to:
- ✅ Stream real-time events via SSE
- ✅ Export Prometheus metrics
- ✅ Set up Grafana dashboards
- ✅ Monitor from terminal UI
- ✅ Query and analyze metrics
- ✅ Create custom alerts
- ✅ Integrate with Splunk/ELK

---

## Next Steps

1. **Set up monitoring** for your own security tests
2. **Create custom dashboards** for your metrics
3. **Configure alerts** for critical events
4. **Integrate with your SIEM** (Splunk, ELK)
5. **Build reports** from historical metrics

---

**Made with ❤️ for operators and analysts**
