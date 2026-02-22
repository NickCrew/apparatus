# Tutorial: Building and Running Attack Scenarios

> Master multi-step attack sequences and complex security testing workflows.

---

## What You'll Learn

- ✅ Understand what scenarios are and when to use them
- ✅ Build a 3-step attack scenario from scratch
- ✅ Configure scenario parameters and conditions
- ✅ Execute scenarios and monitor execution
- ✅ Chain scenarios together for complex workflows
- ✅ Create reusable scenario templates
- ✅ Debug scenario failures and timing issues

## Prerequisites

- **Apparatus running** — Server at `http://localhost:8090`
- **Dashboard familiarity** — Basic knowledge from [Web Dashboard User Guide](tutorial-dashboard.md)
- **curl installed** — For API commands
- **Text editor** — To write scenario files (VS Code, etc.)
- **Basic YAML/JSON** — Understanding of structure (optional but helpful)

## Time Estimate

~45 minutes (design → build → execute → analyze)

## What You'll Build

By the end, you'll have:
1. **A working 3-step scenario** that attacks a target application
2. **Understanding of scenario sequencing** — how steps wait for each other
3. **Ability to chain conditions** — execute different steps based on previous results
4. **Reusable scenario templates** for future campaigns

---

## Section 1: Understanding Scenarios

### What Are Scenarios?

**Scenarios** are **multi-step attack sequences** that you define in advance. Instead of running tools one-by-one manually, you describe a workflow:

```
Step 1: Try XSS injection on login form
    ↓ (if successful: continue to step 2)
Step 2: Attempt SQL injection on search endpoint
    ↓ (if successful: continue to step 3)
Step 3: Trigger CPU spike to test resilience
    ↓
Finish: Generate report of findings
```

### When to Use Scenarios

**Use scenarios for:**
- ✅ **Reproducible tests** — Same sequence every time
- ✅ **Complex workflows** — Multi-step attack chains
- ✅ **Conditional logic** — "If attack succeeds, try next thing"
- ✅ **Parallelization** — Run multiple steps simultaneously
- ✅ **Automated testing** — Include in CI/CD pipelines
- ✅ **Documentation** — Describe attack patterns in detail

**Use Autopilot (not scenarios) for:**
- ❌ One-off testing
- ❌ Exploratory red teaming
- ❌ When you don't know what tools to use (AI figures it out)

### Scenario vs Autopilot

| Aspect | Scenario | Autopilot |
|--------|----------|-----------|
| **Control** | You define every step | AI chooses tools |
| **Repeatability** | Same every time | May vary (AI learning) |
| **Speed** | Fast (no thinking) | Slower (AI reasoning) |
| **Complexity** | Can be very complex | Simpler, linear |
| **Use case** | Reproducible tests | Exploratory testing |

---

## Section 2: Scenario Structure

### Anatomy of a Scenario

Every scenario has this structure:

```json
{
  "name": "My Test Scenario",
  "description": "Tests XSS and SQLi on VulnWeb",
  "target": "http://vuln-web:3000",
  "steps": [
    {
      "id": "step-1",
      "name": "Test XSS on search",
      "action": "redteam.xss",
      "params": {
        "path": "/search",
        "param": "q"
      },
      "timeout": 5000,
      "continueOnFailure": false
    },
    {
      "id": "step-2",
      "name": "Test SQLi on API",
      "action": "redteam.sqli",
      "params": {
        "path": "/api/users",
        "param": "id"
      },
      "timeout": 5000,
      "continueOnFailure": false
    },
    {
      "id": "step-3",
      "name": "Stress test with CPU spike",
      "action": "chaos.cpu",
      "params": {
        "duration": 5000
      },
      "timeout": 10000
    }
  ]
}
```

### Field Explanations

| Field | Meaning |
|-------|---------|
| `name` | Human-readable scenario name |
| `description` | What this scenario tests |
| `target` | Base URL of the app being tested |
| `steps` | Array of actions to perform (in order) |
| **Step fields:** | |
| `id` | Unique identifier (step-1, step-2, etc.) |
| `name` | What this step does |
| `action` | Tool to use (redteam.xss, chaos.cpu, etc.) |
| `params` | Tool-specific parameters (paths, durations) |
| `timeout` | Max milliseconds before step fails |
| `continueOnFailure` | If true, proceed even if step fails |

---

## Section 3: Available Actions

### What Tools Can You Use?

Scenarios support these actions:

**Payload Injection:**
- `redteam.xss` — Cross-site scripting
- `redteam.sqli` — SQL injection
- `redteam.commandInjection` — Shell command injection
- `redteam.pathTraversal` — Directory traversal
- `redteam.nosqli` — NoSQL injection

**Chaos Engineering:**
- `chaos.cpu` — Trigger CPU spike (duration in ms)
- `chaos.memory` — Allocate memory (size in MB)
- `chaos.latency` — Inject network latency (ms)

**Defense Testing:**
- `mtd.rotate` — Rotate API prefix
- `sentinel.addRule` — Add WAF rule

**Cluster Operations:**
- `cluster.attack` — Coordinate distributed attack

**Delay (Timing Control):**
- `delay` — Wait N milliseconds before next step

### Example: Available Parameters by Action

**For redteam.xss:**
```json
{
  "path": "/search",          // Endpoint to test
  "param": "q",               // Query parameter
  "payload": "<script>..."    // Custom payload (optional)
}
```

**For chaos.cpu:**
```json
{
  "duration": 5000,           // How long to stress (ms)
  "cores": 1                  // How many CPU cores (optional)
}
```

**For delay:**
```json
{
  "duration": 2000            // Wait 2 seconds
}
```

---

## Section 4: Create Your First Scenario

### Scenario 1: Simple Two-Step Attack

Let's create a scenario that:
1. Tests XSS on the search endpoint
2. If successful, tests SQLi on the API

**Step 1: Write the Scenario File**

Create a file called `scenario-basic.json`:

```json
{
  "name": "Basic XSS + SQLi Test",
  "description": "Tests reflected XSS on search, then SQLi on API",
  "target": "http://vuln-web:3000",
  "steps": [
    {
      "id": "step-1",
      "name": "XSS on /search endpoint",
      "action": "redteam.xss",
      "params": {
        "path": "/search",
        "param": "q"
      },
      "timeout": 5000,
      "continueOnFailure": false
    },
    {
      "id": "step-2",
      "name": "SQLi on /api/users",
      "action": "redteam.sqli",
      "params": {
        "path": "/api/users",
        "param": "id"
      },
      "timeout": 5000,
      "continueOnFailure": false
    }
  ]
}
```

**What this does:**
- Step 1: Injects XSS payloads at `/search?q=[payload]`
- If step 1 succeeds (finds vulnerability), step 2 runs
- Step 2: Injects SQL payloads at `/api/users?id=[payload]`
- Each step has 5-second timeout
- If step fails, entire scenario stops (`continueOnFailure: false`)

### Step 2: Upload the Scenario

Send it to Apparatus:

```bash
curl -X POST http://localhost:8090/scenarios \
  -H "Content-Type: application/json" \
  -d @scenario-basic.json
```

**Expected response:**
```json
{
  "scenarioId": "scenario-abc123",
  "name": "Basic XSS + SQLi Test",
  "status": "created",
  "steps": 2
}
```

**Save your `scenarioId`** — you'll use it to execute the scenario.

### Step 3: Execute the Scenario

Now run it:

```bash
curl -X POST http://localhost:8090/scenarios/scenario-abc123/run
```

**Expected response:**
```json
{
  "executionId": "exec-xyz789",
  "status": "running",
  "startedAt": "2026-02-21T20:00:00Z",
  "stepsTotal": 2,
  "stepsCompleted": 0
}
```

### Step 4: Monitor Execution

In real-time, check the progress:

```bash
curl http://localhost:8090/scenarios/scenario-abc123/status?executionId=exec-xyz789
```

**Sample output (while running):**
```json
{
  "executionId": "exec-xyz789",
  "status": "running",
  "currentStep": "step-1",
  "currentStepName": "XSS on /search endpoint",
  "progress": "1/2",
  "stepResults": [
    {
      "id": "step-1",
      "status": "running",
      "elapsed": 1234
    }
  ]
}
```

**Wait until status changes to `completed`:**

```bash
# Run this every 5 seconds until done
curl http://localhost:8090/scenarios/scenario-abc123/status?executionId=exec-xyz789 | jq '.status'
```

### Step 5: Get Results

Once execution completes:

```bash
curl http://localhost:8090/scenarios/scenario-abc123/execution/exec-xyz789
```

**Sample result:**
```json
{
  "executionId": "exec-xyz789",
  "status": "completed",
  "duration": 12450,
  "stepResults": [
    {
      "id": "step-1",
      "name": "XSS on /search endpoint",
      "status": "success",
      "vulnerable": true,
      "detail": "Payload reflected unescaped in response",
      "duration": 1234
    },
    {
      "id": "step-2",
      "name": "SQLi on /api/users",
      "status": "success",
      "vulnerable": true,
      "detail": "SQL error revealed table structure",
      "duration": 2345
    }
  ],
  "findings": 2
}
```

### Checkpoint

- [ ] Created scenario-basic.json with 2 steps
- [ ] Uploaded scenario via curl (got scenarioId back)
- [ ] Executed scenario (got executionId)
- [ ] Monitored progress until completion
- [ ] Retrieved results showing vulnerabilities found

**Troubleshooting:**

**Error: `"target": "Invalid target URL"`**
→ Target URL doesn't respond. Test: `curl http://vuln-web:3000/`

**Error: `"Unknown action: redteam.xss"`**
→ Tool name is wrong. See [Available Actions](#available-actions) section.

**Scenario runs but finds no vulnerabilities:**
→ Your target might be secure! Try testing against a known-vulnerable app (VulnWeb).

---

## Section 5: Advanced Scenario: Conditional Logic

### Building Smarter Scenarios

Let's create a **conditional scenario** that adapts based on results:

```json
{
  "name": "Adaptive Attack Scenario",
  "description": "If XSS found, escalate to data exfiltration",
  "target": "http://vuln-web:3000",
  "steps": [
    {
      "id": "step-1",
      "name": "Probe for XSS vulnerability",
      "action": "redteam.xss",
      "params": {
        "path": "/search",
        "param": "q"
      },
      "timeout": 5000
    },
    {
      "id": "step-2",
      "name": "If XSS found, escalate to cookie theft",
      "action": "redteam.xss",
      "params": {
        "path": "/search",
        "param": "q",
        "payload": "<script>alert(document.cookie)</script>"
      },
      "timeout": 5000,
      "dependsOn": "step-1",
      "runOnly": "if_vulnerable"
    },
    {
      "id": "step-3",
      "name": "Attempt data exfiltration",
      "action": "redteam.sqli",
      "params": {
        "path": "/api/users",
        "param": "id"
      },
      "timeout": 5000,
      "continueOnFailure": true
    },
    {
      "id": "step-4",
      "name": "Generate report",
      "action": "delay",
      "params": {
        "duration": 1000
      }
    }
  ]
}
```

### New Conditional Fields

| Field | Meaning |
|-------|---------|
| `dependsOn` | Only run if specified step succeeded |
| `runOnly` | When to execute: `"always"`, `"if_vulnerable"`, `"if_failed"` |
| `continueOnFailure` | Don't stop if this step fails |
| `parallel` | Run simultaneously with other steps (not sequential) |

### Try It: Create a Conditional Scenario

1. Save the scenario above as `scenario-conditional.json`
2. Upload: `curl -X POST http://localhost:8090/scenarios -H "Content-Type: application/json" -d @scenario-conditional.json`
3. Execute: `curl -X POST http://localhost:8090/scenarios/scenario-xxx/run`
4. Monitor and view results

---

## Section 6: Scenario Templates & Reuse

### Save Effective Scenarios as Templates

Once you've created a scenario that works well, save it as a **template** for future use:

```bash
curl -X POST http://localhost:8090/scenarios/scenario-abc123/save-template \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "Standard XSS+SQLi Test",
    "description": "Reusable template for testing XSS and SQLi"
  }'
```

### Use a Template for a New Target

When you want to run the same scenario against a different target:

```bash
curl -X POST http://localhost:8090/scenarios/templates/standard-xss-sqli/instantiate \
  -H "Content-Type: application/json" \
  -d '{
    "target": "https://different-app.example.com",
    "name": "XSS+SQLi Test - Different App"
  }'
```

This creates a new scenario with the same steps but different target.

---

## Section 7: Monitoring Scenario Execution

### Via API (For Scripts/Automation)

Poll status periodically:

```bash
# Check every 5 seconds
while true; do
  curl http://localhost:8090/scenarios/scenario-abc/status?executionId=exec-xyz \
    | jq '.status'
  [ "$(curl -s http://localhost:8090/scenarios/scenario-abc/status?executionId=exec-xyz | jq -r '.status')" = "completed" ] && break
  sleep 5
done
```

### Via Dashboard (For Real-Time Viewing)

1. Open Apparatus dashboard: `http://localhost:8090/dashboard`
2. Navigate to Scenarios console (Cmd+K → "scenarios")
3. Find your scenario execution
4. Watch progress in real-time as steps complete

**Dashboard shows:**
- Current step (highlighted)
- Step status (running, success, vulnerable, failed)
- Elapsed time per step
- Overall progress (Step 2 of 5)
- Live findings as they appear

---

## Section 8: Troubleshooting Scenarios

### Scenario Runs But Gets Stuck

**Symptom:** Scenario hangs at a step, progress doesn't advance

**Cause:** Target is slow or unresponsive, or timeout is too short

**Solution:**
1. Increase timeout in scenario definition:
   ```json
   "timeout": 10000  // Was 5000, now 10 seconds
   ```
2. Verify target is responding:
   ```bash
   curl http://vuln-web:3000/search
   ```
3. Try the step manually to measure actual time needed

---

### Step Results Say "Failed" But App Works Fine

**Symptom:** Scenario reports failure but target app is running

**Cause:** Step timeout too short, or tool couldn't parse response

**Solution:**
1. Run step manually with curl to check timing
2. Increase step timeout by 50%
3. Check if target changed (different response format, redirects, auth required)

---

### Conditional Step Never Runs (`dependsOn` not working)

**Symptom:** Step 2 should run only if Step 1 succeeds, but it doesn't

**Cause:** Field names wrong, or vulnerability not detected

**Solution:**
1. Verify `dependsOn` field is spelled correctly (case-sensitive)
2. Check `runOnly` is set to `"if_vulnerable"` (not `"if_success"`)
3. Verify Step 1 actually found a vulnerability by checking results

---

### Can't Upload Scenario (JSON Parse Error)

**Symptom:** `curl` returns JSON parse error

**Cause:** JSON syntax error in scenario file

**Solution:**
1. Validate JSON: `cat scenario.json | jq .`
2. If error, fix the JSON (missing comma, quote, bracket)
3. Retry upload

---

## Section 9: Real-World Scenario Examples

### Example 1: Login Brute Force → Privilege Escalation

```json
{
  "name": "Login → Admin Escalation",
  "target": "http://vulnerable-app:8080",
  "steps": [
    {
      "id": "enum-users",
      "name": "Enumerate valid usernames",
      "action": "redteam.sqli",
      "params": { "path": "/login", "param": "username" }
    },
    {
      "id": "password-spray",
      "name": "Try common passwords",
      "action": "chaos.attack",
      "params": { "pattern": "brute-force", "path": "/login" },
      "continueOnFailure": true
    },
    {
      "id": "escalate",
      "name": "Escalate to admin",
      "action": "redteam.pathTraversal",
      "params": { "path": "/admin", "param": "user_id" },
      "dependsOn": "password-spray",
      "runOnly": "if_vulnerable"
    }
  ]
}
```

### Example 2: API Security Testing

```json
{
  "name": "REST API Security Test",
  "target": "https://api.example.com",
  "steps": [
    {
      "id": "auth-bypass",
      "name": "Test authentication bypass",
      "action": "redteam.sqli",
      "params": { "path": "/api/users", "param": "token" }
    },
    {
      "id": "ratelimit-test",
      "name": "Test rate limiting",
      "action": "chaos.attack",
      "params": { "pattern": "high-frequency", "rate": 1000 }
    },
    {
      "id": "data-leak",
      "name": "Test for data leakage",
      "action": "redteam.pathTraversal",
      "params": { "path": "/api/admin", "param": "user_id" },
      "continueOnFailure": true
    }
  ]
}
```

### Example 3: Resilience Testing (Chaos Engineering)

```json
{
  "name": "Resilience Under Load",
  "target": "http://myapp:3000",
  "steps": [
    {
      "id": "spike-cpu",
      "name": "Spike CPU to 80%",
      "action": "chaos.cpu",
      "params": { "duration": 10000 }
    },
    {
      "id": "measure-degradation",
      "name": "Measure response time degradation",
      "action": "redteam.xss",
      "params": { "path": "/api/expensive-endpoint", "param": "q" }
    },
    {
      "id": "wait-recovery",
      "name": "Wait for recovery",
      "action": "delay",
      "params": { "duration": 5000 }
    },
    {
      "id": "verify-recovered",
      "name": "Verify app recovered",
      "action": "redteam.xss",
      "params": { "path": "/health", "param": "q" }
    }
  ]
}
```

---

## Summary

You've learned how to:
- ✅ Understand scenarios and when to use them (vs Autopilot)
- ✅ Build a working multi-step attack scenario
- ✅ Execute scenarios and monitor progress
- ✅ Create conditional logic (dependsOn, runOnly)
- ✅ Save and reuse scenario templates
- ✅ Troubleshoot common scenario issues
- ✅ Analyze findings from scenario execution

---

## Next Steps

1. **[Chaos Engineering Playbook](tutorial-chaos-engineering.md)** — Test resilience with fault injection
2. **[Red Team Autopilot](tutorial-autopilot.md)** — AI-driven attack campaigns
3. **[Defense Rules](tutorial-defense-rules.md)** — Protect against scenario attacks

Create a **scenario for your own application** and test it against your security controls!

---

**Made with ❤️ for security architects and red teamers**
