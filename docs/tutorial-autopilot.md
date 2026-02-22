# Tutorial: Getting Started with Apparatus Red Team Autopilot

> Build and run your first automated attack campaign with AI-powered red team automation.

---

## What You'll Learn

- ✅ Launch an autopilot attack campaign against a target application
- ✅ Configure autopilot parameters for different attack strategies
- ✅ Monitor attack progress in real-time via the web dashboard
- ✅ Retrieve and interpret attack results and findings
- ✅ Debug common configuration issues and failures

## Prerequisites

- **Apparatus running** — Server accessible at `http://localhost:8090`
- **Target application accessible** — Your app or VulnWeb (`http://vuln-web:3000`)
- **curl installed** — For sending API commands
- **Web browser** — To view the real-time dashboard (Chrome, Firefox, Safari, Edge)
- **Basic HTTP knowledge** — Understanding of GET/POST, URLs, JSON

## Time Estimate

~20 minutes (including setup verification and first full attack campaign)

## What You'll Build

By the end, you'll have:
1. A **running autopilot instance** targeting a web application
2. Real-time **attack progress monitoring** in the dashboard
3. **Detailed attack reports** with findings and recommendations
4. Understanding of how to **configure autopilot parameters** for different scenarios

---

## Section 1: Understanding Autopilot

### What is Autopilot?

Autopilot is Apparatus's **AI-powered red team agent**. It autonomously:

- **Selects attack tools** based on target behavior and responses
- **Executes sequential attacks** (chaos, payloads, defenses)
- **Learns from failures** — adapts strategy when defenses block attacks
- **Reports findings** — creates detailed reports of discovered vulnerabilities

Think of it as an **intelligent, tireless penetration tester** that never gets bored and can run 24/7.

### Typical Workflow

```
Start Autopilot
     ↓
Attack Tool #1 (e.g., XSS payload)
     ↓
Evaluate response (blocked? vulnerable? no effect?)
     ↓
Select next tool based on result
     ↓
Attack Tool #2 (e.g., CPU spike)
     ↓
[Repeat for N iterations]
     ↓
Generate Report
```

### Key Concepts

| Term | Meaning |
|------|---------|
| **Target** | URL of the application to attack (e.g., `http://vuln-web:3000`) |
| **Iteration** | One attack cycle (select tool → execute → evaluate) |
| **maxIterations** | Total number of attack cycles before stopping |
| **Interval** | Milliseconds between iterations (default: 2000ms) |
| **allowedTools** | List of tools autopilot can use (e.g., `chaos.cpu`, `redteam.xss`) |
| **Report** | Final summary of all attacks, findings, and recommendations |

---

## Section 2: Prerequisites Check

### Step 1: Verify Apparatus is Running

Open your terminal and check if Apparatus responds:

```bash
curl http://localhost:8090/health
```

**Expected output:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-21T10:30:45.123Z",
  "uptime": 3600000
}
```

If you see a `connection refused` error, start Apparatus:
```bash
# Option 1: If you have the full lab
cd ~/Developer/apparatus && docker-compose up

# Option 2: If running standalone
cd ~/Developer/apparatus && pnpm start
```

Wait 10-15 seconds for the server to fully initialize.

### Step 2: Verify Target Application

If you're using VulnWeb as your target:

```bash
curl http://localhost:3000/ -s | head -20
```

You should see HTML content (the VulnWeb home page). If the target is on a different host, adjust the URL.

### Step 3: Verify API Access

Check that you can reach the autopilot status endpoint:

```bash
curl http://localhost:8090/api/redteam/autopilot/status
```

**Expected output (when no campaign is running):**
```json
{
  "running": false,
  "iterations": 0,
  "currentTool": null,
  "findings": []
}
```

### Checkpoint

You should have:
- [ ] Apparatus health check returned `"status": "healthy"`
- [ ] Target application responding (curl got HTML/JSON, not connection error)
- [ ] Autopilot status endpoint accessible (returned JSON response)

**Troubleshooting:**

**Error: `curl: (7) Failed to connect`**
→ Apparatus isn't running. Check logs with `docker-compose logs apparatus` or `pnpm start` output.

**Error: `Cannot GET /health`**
→ Wrong port or Apparatus started but not fully initialized. Wait 30 seconds and retry.

---

## Section 3: Start Your First Attack Campaign

### What We'll Do

Launch autopilot with a **basic configuration**:
- Target: VulnWeb (or your app)
- Iterations: 5 (short campaign to see results quickly)
- Tools: XSS/SQLi payloads and chaos attacks
- Interval: 2 seconds between attacks

### Command: Start Autopilot

Run this in your terminal:

```bash
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -H "Content-Type: application/json" \
  -d '{
    "target": "http://vuln-web:3000",
    "config": {
      "interval": 2000,
      "maxIterations": 5,
      "allowedTools": [
        "redteam.xss",
        "redteam.sqli",
        "chaos.cpu",
        "chaos.memory",
        "cluster.attack"
      ]
    }
  }'
```

**What each parameter does:**

- `"target": "http://vuln-web:3000"` — Application to attack
- `"interval": 2000` — Wait 2 seconds between attacks (adjust to 5000 for slower apps)
- `"maxIterations": 5` — Run 5 attack cycles
- `"allowedTools"` — Which attack methods to use (we're including XSS, SQLi, CPU, memory, and clustering)

**Expected output:**
```json
{
  "status": "started",
  "campaignId": "autopilot-1708514400123",
  "message": "Autopilot campaign initiated"
}
```

**Save your `campaignId`** — you'll use it to track progress.

### Try It

Replace `http://vuln-web:3000` with your actual target URL if different. For example:
- Local app: `http://localhost:3000`
- Remote app: `https://myapp.example.com`
- Another Docker service: `http://app-service:8080`

### Checkpoint

After running the command:
- [ ] Autopilot returned a `campaignId`
- [ ] Status shows `"started"`
- [ ] No error messages in response

**If you got an error:**
- `"Error: Target unreachable"` → Your target URL is wrong or not accessible
- `"Invalid tool names"` → One of the tool names is misspelled (check the list below for valid tools)
- `"Campaign already running"` → Another autopilot instance is active. Stop it first with the stop command (see Section 5)

---

## Section 4: Monitor in Real-Time via Dashboard

### Open the Dashboard

In your web browser, go to:
```
http://localhost:8090/dashboard
```

You should see the Apparatus control center with multiple consoles.

### Navigate to Autopilot Console

1. **Open the Command Palette**: Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)
2. **Search for "autopilot"**: Type the word in the search box
3. **Select "Autopilot Console"** from results

You'll see:
- **Campaign Status** — Current iteration, running state
- **Attack History** — List of recent attacks with results
- **Findings** — Vulnerabilities discovered so far
- **Real-time Updates** — New attacks appear as they happen

### What to Look For

**While the campaign is running:**

| Status | What It Means | Expected? |
|--------|---------------|-----------|
| 🟢 **RUNNING** | Autopilot is attacking | Yes, at first |
| 🟡 **IDLE** | Waiting between iterations | Normal |
| 🔴 **BLOCKED** | Target rejected request | Common for defended apps |
| ✅ **VULNERABLE** | Attack succeeded (vulnerability found) | Good! Indicates weak spots |
| ❌ **FAILED** | Attack crashed or timed out | Sometimes happens |

### Real-Time Monitoring Tips

- **Refresh rate**: Dashboard updates every 1-2 seconds (via SSE)
- **Pause campaign**: Click the pause button to stop briefly (don't lose progress)
- **Clear findings**: Click "Clear Logs" to reset for a clean report
- **Export data**: Use "Export" button to save findings as JSON

---

## Section 5: Check Status and Stop Campaign

### Check Current Status (while running)

While autopilot is attacking, periodically check progress:

```bash
curl http://localhost:8090/api/redteam/autopilot/status
```

**Sample output (campaign running):**
```json
{
  "running": true,
  "campaignId": "autopilot-1708514400123",
  "iterations": 3,
  "maxIterations": 5,
  "currentTool": "redteam.xss",
  "targetUrl": "http://vuln-web:3000",
  "findings": [
    {
      "tool": "redteam.xss",
      "path": "/search",
      "vulnerable": true,
      "detail": "Unescaped user input reflected in response",
      "timestamp": "2026-02-21T10:30:47.234Z"
    }
  ]
}
```

### Stop Campaign (before maxIterations)

If you want to stop early:

```bash
curl -X POST http://localhost:8090/api/redteam/autopilot/stop
```

**Expected output:**
```json
{
  "status": "stopped",
  "message": "Autopilot campaign stopped",
  "iterations": 3,
  "totalFindings": 1
}
```

### Checkpoint

- [ ] Status command returned attack progress and findings
- [ ] Campaign either completed (status: `"running": false`) or stopped manually
- [ ] Findings array shows at least one attack (even if not vulnerable)

---

## Section 6: Analyze Results and Reports

### Get Full Report

Once the campaign finishes (or after you stop it), retrieve the complete report:

```bash
curl http://localhost:8090/api/redteam/autopilot/reports
```

**Sample output (excerpted):**
```json
{
  "campaignId": "autopilot-1708514400123",
  "target": "http://vuln-web:3000",
  "startTime": "2026-02-21T10:30:45.123Z",
  "endTime": "2026-02-21T10:30:59.456Z",
  "duration": 14333,
  "iterationCount": 5,
  "totalAttacks": 23,
  "totalVulnerabilities": 2,
  "findingsByTool": {
    "redteam.xss": {
      "attackCount": 5,
      "vulnerabilities": 1,
      "avgResponseTime": 145,
      "severity": "high"
    },
    "redteam.sqli": {
      "attackCount": 6,
      "vulnerabilities": 1,
      "avgResponseTime": 234,
      "severity": "high"
    },
    "chaos.cpu": {
      "attackCount": 4,
      "vulnerabilities": 0,
      "avgResponseTime": 512,
      "severity": "medium"
    }
  },
  "vulnerabilities": [
    {
      "id": "vuln-001",
      "tool": "redteam.xss",
      "path": "/search",
      "parameter": "q",
      "evidence": "<script>alert('xss')</script> was reflected unescaped",
      "severity": "high",
      "recommendation": "Sanitize user input using DOMPurify or similar library"
    },
    {
      "id": "vuln-002",
      "tool": "redteam.sqli",
      "path": "/api/users",
      "evidence": "SQL error revealed: Table 'users' not found",
      "severity": "high",
      "recommendation": "Use parameterized queries and hide database errors"
    }
  ],
  "recommendations": [
    "Enable input validation on all user-facing endpoints",
    "Implement WAF rules for XSS and SQLi patterns",
    "Run security scanning on database error messages"
  ]
}
```

### Understanding the Report

**Key metrics:**

| Metric | What It Tells You |
|--------|------------------|
| `totalAttacks` | How many payloads/tools were tried |
| `totalVulnerabilities` | Number of weaknesses discovered |
| `duration` | How long the campaign took (milliseconds) |
| `findingsByTool` | Which tools were most effective |

**For each vulnerability:**

| Field | Explanation |
|-------|-------------|
| `severity` | high/medium/low risk |
| `path` | Which endpoint was vulnerable |
| `evidence` | Proof of the vulnerability |
| `recommendation` | How to fix it |

### Exercise: Analyze Your Report

Answer these questions about your report:

1. **Which tool found the most vulnerabilities?** Look at `findingsByTool` and count non-zero `vulnerabilities` entries.
2. **What's the highest-severity finding?** Sort vulnerabilities by `severity: "high"`.
3. **What endpoint was attacked most?** Count how many vulnerabilities mention the same `path`.
4. **Did the app defend itself?** If `totalVulnerabilities` is 0, the app blocked all payloads.

### Checkpoint

- [ ] Report contains `campaignId`, `target`, and `duration`
- [ ] `vulnerabilities` array lists at least one finding (or is empty if app is secure)
- [ ] You can read and understand a vulnerability entry

---

## Section 7: Advanced Configurations

### Configuration 1: Aggressive Attack (More Tools, More Time)

For a thorough security assessment:

```bash
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -H "Content-Type: application/json" \
  -d '{
    "target": "http://vuln-web:3000",
    "config": {
      "interval": 3000,
      "maxIterations": 20,
      "allowedTools": [
        "redteam.xss",
        "redteam.sqli",
        "redteam.commandInjection",
        "redteam.pathTraversal",
        "redteam.nosqli",
        "chaos.cpu",
        "chaos.memory",
        "cluster.attack",
        "mtd.rotate"
      ]
    }
  }'
```

**What's different:**
- 20 iterations (vs 5) — more attacks
- 3-second interval (vs 2) — slower, safer pacing
- 9 tools (vs 5) — broader attack surface
- Includes `nosqli`, `commandInjection`, `pathTraversal` — advanced payload types
- Includes `mtd.rotate` — tests defense rotation

**Use this for:**
- Production-like apps with good security
- Security assessments before launch
- Compliance testing

### Configuration 2: Stealth Mode (Slow, Targeted)

For apps with strong monitoring/alerting:

```bash
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -H "Content-Type: application/json" \
  -d '{
    "target": "http://vuln-web:3000",
    "config": {
      "interval": 10000,
      "maxIterations": 10,
      "allowedTools": [
        "redteam.xss",
        "redteam.sqli"
      ]
    }
  }'
```

**What's different:**
- 10-second interval — very slow (10 seconds between attacks)
- Only 2 tools — fewer IDS/WAF triggers
- 10 iterations — moderate coverage
- Fewer concurrent attacks

**Use this for:**
- Systems with active monitoring/alerting
- Learning what defenders can detect
- Avoiding triggering security incidents

### Configuration 3: Chaos-Only Testing

Test resilience without payloads:

```bash
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -H "Content-Type: application/json" \
  -d '{
    "target": "http://vuln-web:3000",
    "config": {
      "interval": 5000,
      "maxIterations": 15,
      "allowedTools": [
        "chaos.cpu",
        "chaos.memory",
        "chaos.latency",
        "cluster.attack"
      ]
    }
  }'
```

**What's different:**
- Only chaos tools — no injection payloads
- Focuses on: CPU, memory, latency impacts

**Use this for:**
- Resilience testing (does app recover?)
- Performance degradation assessment
- Load balancer testing

---

## Section 8: Troubleshooting

### Campaign Won't Start

**Error: `"Campaign already running"`**

Another autopilot instance is still active. Stop it:
```bash
curl -X POST http://localhost:8090/api/redteam/autopilot/stop
```

Wait 5 seconds, then retry the start command.

---

**Error: `"Target unreachable"`**

The URL you provided doesn't respond. Test it:
```bash
curl -I http://vuln-web:3000/
```

Common causes:
- **Wrong hostname** — use `vuln-web` (not `localhost`) inside Docker
- **Port wrong** — check if app runs on a different port
- **App not running** — make sure target is started: `docker-compose up`
- **Network issue** — if containers, ensure they're on the same network

---

**Error: `"Invalid tool: redteam.badname"`**

You used a tool name that doesn't exist. Valid tools include:
- **Payloads**: `redteam.xss`, `redteam.sqli`, `redteam.commandInjection`, `redteam.pathTraversal`, `redteam.nosqli`
- **Chaos**: `chaos.cpu`, `chaos.memory`, `chaos.latency`
- **Cluster**: `cluster.attack`
- **Defense**: `mtd.rotate`, `sentinel.addRule`

---

### Campaign Finds No Vulnerabilities

**Is the app actually vulnerable?**

Test manually:
```bash
# Try an obvious XSS payload
curl "http://vuln-web:3000/search?q=<script>alert('xss')</script>"
```

If the payload appears unescaped in the HTML, the app is vulnerable. If autopilot didn't find it, the tool may need tuning (e.g., different parameter names).

---

**App is defended (WAF blocks everything)**

Check the findings — if all attacks show `"blocked": true`, your WAF is working. This is good! Autopilot will try to bypass it via different techniques in future iterations.

---

### Dashboard Not Showing Updates

**Refresh the page** — SSE events may not connect on first load:
```
Press F5 or Cmd+R
```

**Check browser console** — Open DevTools (F12) → Console tab. Look for connection errors. If you see CORS or SSL errors, restart Apparatus.

---

### Command Hangs or Times Out

If `curl` command takes >60 seconds:

**Press Ctrl+C to cancel**, then check if Apparatus is still responsive:
```bash
curl http://localhost:8090/health
```

If health check fails, Apparatus may have crashed. Restart it.

---

## Section 9: Next Steps

### 1. Run Against Your Own App

Replace the target URL with your application:
```bash
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -H "Content-Type: application/json" \
  -d '{
    "target": "https://myapp.example.com",
    "config": {
      "interval": 2000,
      "maxIterations": 5,
      "allowedTools": ["redteam.xss", "redteam.sqli", "chaos.cpu"]
    }
  }'
```

### 2. Create Custom Scenarios

Build multi-step attack sequences that go beyond autopilot:
→ See [Tutorial: Building Attack Scenarios](tutorial-scenarios.md)

### 3. Set Up Defense Rules

Protect your app using WAF and tarpit:
→ See [Guide: Defense Rules & WAF](guide-defense-rules.md)

### 4. Monitor with Metrics

Export findings to Prometheus/Grafana for dashboard visualization:
→ See [Monitoring & Observability](guide-monitoring.md)

### 5. Integrate with CI/CD

Automate security testing in your deployment pipeline:
→ See [CI/CD Integration](guide-ci-cd.md)

---

## Glossary

| Term | Definition |
|------|-----------|
| **Autopilot** | AI red team agent that autonomously selects and executes attacks |
| **Campaign** | Single run of autopilot with defined parameters |
| **Finding** | Evidence of vulnerability (with severity and recommendation) |
| **Iteration** | One attack cycle (select tool → execute → evaluate) |
| **Payload** | Attack string injected into request (e.g., SQL or XSS code) |
| **Target** | Application URL being tested |
| **Tool** | Individual attack method (e.g., `redteam.xss`, `chaos.cpu`) |
| **Vulnerability** | Security weakness confirmed by autopilot |

---

## Summary

You've learned how to:
- ✅ Launch autopilot campaigns with real curl commands
- ✅ Monitor attacks in real-time via the dashboard
- ✅ Configure autopilot for different scenarios (aggressive, stealth, chaos-only)
- ✅ Retrieve and analyze detailed attack reports
- ✅ Troubleshoot common issues and configuration errors

---

**Made with ❤️ for red teamers and security engineers**
