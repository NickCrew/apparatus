# Tutorial: Scenario Builder – Multi-Step Automated Attack & Defense Sequences

> Design, build, and execute complex multi-step testing sequences that automate attack campaigns or defense validations.

---

## What You'll Learn

- ✅ Understand scenarios and when to use them
- ✅ Build a scenario from scratch in the dashboard
- ✅ Write scenarios in YAML/JSON
- ✅ Execute scenarios and monitor progress
- ✅ Understand tool constraints and safety limits
- ✅ Debug scenario failures
- ✅ Create reusable scenario templates

## Prerequisites

- **Apparatus running** — Server accessible at `http://localhost:8090`
- **Web dashboard open** — Navigate to http://localhost:8090/dashboard
- **CLI familiarity** — Understanding of curl or similar tools (optional but helpful)

## Time Estimate

~25 minutes (planning + building + executing)

## What You'll Build

By the end, you'll be able to:
1. **Design multi-step attack sequences** that run autonomously
2. **Create scenarios** via UI or REST API
3. **Execute scenarios** and monitor each step
4. **Understand execution status** (running, completed, failed)
5. **Troubleshoot failures** and debug step issues
6. **Reuse scenarios** across multiple testing campaigns

---

## Section 1: Understanding Scenarios

### What is a Scenario?

A **Scenario** is a **multi-step automation sequence** that executes tool actions in a defined order with optional delays between steps.

Think of it as a **test script** or **attack playbook** — recipes for testing that run hands-free.

### When to Use Scenarios

| Use Case | Why Scenario |
|----------|-------------|
| **Automated red team attack** | Run 10 tools in sequence overnight |
| **Stress test** | Gradually increase chaos, measure impact |
| **Defense validation** | Run same test sequence multiple times |
| **CI/CD security gate** | Automated pre-deployment checks |
| **Incident recreation** | Replay exact same attack that happened |
| **Compliance testing** | Run standardized test suites |

### Scenario Structure

Every scenario has:

```
Scenario:
├─ Name: "Stress Test Attack"
├─ Steps: [Step 1, Step 2, Step 3, ...]
│  ├─ Step 1:
│  │  ├─ ID: "1"
│  │  ├─ Action: "cluster.attack"
│  │  ├─ Params: { target, rate, duration }
│  │  └─ DelayAfter: 2000 ms
│  │
│  ├─ Step 2:
│  │  ├─ ID: "2"
│  │  ├─ Action: "delay"
│  │  ├─ Params: { duration: 5000 }
│  │  └─ DelayAfter: 0 ms
│  │
│  └─ Step 3:
│     ├─ ID: "3"
│     ├─ Action: "chaos.cpu"
│     ├─ Params: { duration: 10000 }
│     └─ DelayAfter: 0 ms
│
└─ Result: COMPLETED with findings
```

### Scenario Limits

| Constraint | Limit | Why |
|-----------|-------|-----|
| Steps per scenario | 50 | Prevent runaway sequences |
| Concurrent scenarios | Unlimited | JavaScript event loop handles it |
| Scenario storage | 200 max | Memory management |
| Execution history | 1000 max | Memory management |
| Step delay | 0–300,000 ms | (0 to 5 minutes per step) |

---

## Section 2: Available Scenario Tools

### Allowed Tools

Scenarios can execute these tools:

| Tool | Purpose | Example Params |
|------|---------|-----------------|
| **delay** | Pause between steps | `{ duration: 5000 }` |
| **chaos.cpu** | CPU spike | `{ duration: 5000 }` |
| **chaos.memory** | Memory allocate/clear | `{ action: "allocate", amount: 256 }` |
| **cluster.attack** | Coordinated attack | `{ target: "...", rate: 100 }` |
| **mtd.rotate** | Rotate polymorphic prefix | `{ newPrefix: "xyz123" }` |

### Tool Parameter Validation

Parameters are **sanitized** before execution:

```
chaos.cpu:
  duration: clamped to 250–120000 ms
  (you can't trigger 1ms spike or 1-day spike)

chaos.memory:
  amount: clamped to 1–4096 MB
  action: must be "allocate" or "clear"

cluster.attack:
  rate: clamped to 1–10000 req/sec
  target: validated as URL
```

### Blocked Tools

These tools are **NOT** allowed in scenarios (security):
- ❌ `chaos.crash` — Can't crash via scenario (manual only)
- ❌ `process.exit` — Can't terminate process
- ❌ Any tool ending with `.delete` or `.destroy` — Can't destroy data

**Why?** Scenarios are automated; destructive actions need human approval.

---

## Section 3: Creating a Scenario via Dashboard

### Try It: Build Your First Scenario

**Scenario Goal:** Gradually stress-test the system

**Steps we'll create:**
1. Start light cluster attack
2. Wait 3 seconds
3. Spike CPU for 5 seconds
4. Wait 2 seconds
5. Spike memory for 3 seconds

### Step-by-Step

#### Step 1: Navigate to Scenario Console

1. Open dashboard: `http://localhost:8090/dashboard`
2. Click **Scenarios** in the left sidebar (or search for it)
3. You'll see:
   - List of existing scenarios (if any)
   - [Create New Scenario] button
   - Scenario details panel

#### Step 2: Create New Scenario

1. Click **[Create New Scenario]** or **[+ New]**
2. Fill in the basic info:
   ```
   Name: Gradual Stress Test
   Description: Light cluster attack, followed by chaos (CPU, memory)
   ```

#### Step 3: Add Step 1 (Cluster Attack)

1. Click **[Add Step]**
2. Fill in:
   ```
   Step ID: 1
   Action: cluster.attack
   Params:
     target: http://localhost:8090/echo
     rate: 50
   Delay After: 3000 (wait 3 seconds)
   ```
3. Click **[Save Step]**

#### Step 4: Add Step 2 (CPU Spike)

1. Click **[Add Step]**
2. Fill in:
   ```
   Step ID: 2
   Action: chaos.cpu
   Params:
     duration: 5000 (spike for 5 seconds)
   Delay After: 2000 (wait 2 seconds)
   ```
3. Click **[Save Step]**

#### Step 5: Add Step 3 (Memory Spike)

1. Click **[Add Step]**
2. Fill in:
   ```
   Step ID: 3
   Action: chaos.memory
   Params:
     action: allocate
     amount: 256 (MB)
   Delay After: 0
   ```
3. Click **[Save Step]**

#### Step 6: Review and Save

1. Review the scenario:
   ```
   Gradual Stress Test
   ├─ Step 1: cluster.attack (target: ..., rate: 50) → wait 3s
   ├─ Step 2: chaos.cpu (duration: 5000) → wait 2s
   └─ Step 3: chaos.memory (action: allocate, amount: 256) → wait 0s
   ```
2. Click **[Save Scenario]**
3. You should see:
   ```
   ✅ Scenario saved successfully
   Scenario ID: sc-gradual-stress-test
   ```

### Checkpoint

- [ ] Created a scenario via dashboard
- [ ] Added multiple steps
- [ ] Understood action and params
- [ ] Saved successfully

---

## Section 4: Creating a Scenario via REST API

### Alternative: Build Scenario with curl

If you prefer scripting or automation, create scenarios via REST API:

```bash
curl -X POST http://localhost:8090/scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "name": "WAF Validation Test",
    "description": "Test that WAF blocks common attack vectors",
    "steps": [
      {
        "id": "1",
        "action": "delay",
        "params": { "duration": 1000 },
        "delayAfter": 0
      },
      {
        "id": "2",
        "action": "cluster.attack",
        "params": {
          "target": "http://localhost:8090/echo",
          "rate": 100,
          "duration": 5000
        },
        "delayAfter": 3000
      },
      {
        "id": "3",
        "action": "mtd.rotate",
        "params": { "newPrefix": "secure-testing" },
        "delayAfter": 2000
      }
    ]
  }'
```

**Response:**
```json
{
  "id": "sc-waf-validation",
  "name": "WAF Validation Test",
  "steps": 3,
  "saved": true
}
```

### Checkpoint

- [ ] Can create scenarios via curl/REST API
- [ ] Understand JSON structure
- [ ] Can validate params

---

## Section 5: Executing Scenarios

### Running a Scenario

#### Via Dashboard

1. Open **Scenarios** console
2. Click on your scenario: "Gradual Stress Test"
3. Click **[Execute]** or **[Run]**
4. System shows:
   ```
   ✅ Scenario started
   Execution ID: run-2026-02-22-143045-xyz
   Status: RUNNING
   Current step: 1 / 3
   ```

#### Via REST API

```bash
SCENARIO_ID="sc-gradual-stress-test"
curl -X POST "http://localhost:8090/scenarios/$SCENARIO_ID/run"
```

**Response:**
```json
{
  "executionId": "run-2026-02-22-143045-xyz",
  "scenarioId": "sc-gradual-stress-test",
  "status": "running",
  "currentStepId": "1"
}
```

### Monitoring Execution

#### Via Dashboard (Real-Time)

Dashboard shows:
```
Scenario Execution: Gradual Stress Test
├─ Status: RUNNING
├─ Progress: Step 1 / 3
├─ Current Action: cluster.attack (50 req/sec)
├─ Elapsed Time: 0:15
├─ Est. Remaining: 0:08
│
└─ Step Timeline:
   ✓ Step 1: cluster.attack (completed in 3020ms)
   ⧗ Step 2: chaos.cpu (running, 4s remaining)
   ○ Step 3: chaos.memory (pending)
```

#### Via REST API (Poll)

```bash
SCENARIO_ID="sc-gradual-stress-test"
EXECUTION_ID="run-2026-02-22-143045-xyz"
curl "http://localhost:8090/scenarios/$SCENARIO_ID/status?executionId=$EXECUTION_ID"
```

**Response:**
```json
{
  "executionId": "run-2026-02-22-143045-xyz",
  "scenarioId": "sc-gradual-stress-test",
  "status": "running",
  "currentStepId": "2",
  "stepsCompleted": 1,
  "totalSteps": 3,
  "stepResults": [
    {
      "stepId": "1",
      "action": "cluster.attack",
      "status": "completed",
      "durationMs": 3020,
      "result": { "requestsSent": 150 }
    }
  ],
  "elapsedMs": 5020,
  "errors": null
}
```

### Try It: Execute and Monitor

1. Execute the scenario you created (see "Running a Scenario" above)
2. Keep the Overview dashboard open
3. Watch the metrics change as the scenario runs:
   - RPS jumps (cluster attack)
   - Latency increases (CPU spike)
   - Error rate may rise
4. In Scenarios console, watch progress
5. When complete, scenario shows final status

### Checkpoint

- [ ] Can execute scenarios
- [ ] Can monitor execution via dashboard
- [ ] Can check status via API
- [ ] Understand the step timeline

---

## Section 6: Scenario Status & Results

### Execution States

Each execution can be in one of these states:

| State | Meaning |
|-------|---------|
| **pending** | Queued, waiting to start |
| **running** | Steps currently executing |
| **completed** | All steps finished successfully |
| **failed** | At least one step failed |
| **stopped** | User manually stopped execution |

### Step Results

Each step has a result:

```
Step 1: cluster.attack
├─ Status: completed
├─ Duration: 3020 ms
├─ Result: {
│    "requestsSent": 150,
│    "successRate": 98.2%
│  }
└─ Errors: none
```

vs.

```
Step 3: chaos.memory
├─ Status: failed
├─ Duration: 1200 ms
├─ Error: "Memory amount 5000 MB exceeds maximum (4096 MB)"
└─ Recommendation: Reduce to 4096 MB or less
```

### Understanding Failures

**When a step fails:**
1. Error message is captured
2. Subsequent steps are NOT executed
3. Execution marked as `failed`
4. You can fix and retry

**Common failures:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid parameter: rate` | rate > 10000 or < 1 | Clamp to 1–10000 |
| `Memory amount exceeds maximum` | amount > 4096 | Reduce to ≤ 4096 MB |
| `Unknown action` | Typo in action name | Check spelling |
| `Invalid URL` | target not a valid URL | Provide full URL |
| `Parameter missing` | Required param not provided | Add required params |

### Try It: Create and Fix a Failed Scenario

**Goal:** Learn how to fix scenario failures.

**Steps:**

1. Create a scenario with an invalid param:
   ```
   Step 1: chaos.memory
   Params: action: "allocate", amount: 5000
   (5000 > 4096 max)
   ```

2. Execute it
3. It should fail with message about exceeding max
4. Edit the scenario:
   - Change amount to 4000
5. Execute again → should succeed

### Checkpoint

- [ ] Understand execution states
- [ ] Can read step results
- [ ] Know how to fix failed scenarios
- [ ] Can retry after fixing

---

## Section 7: Advanced Scenario Patterns

### Pattern 1: Gradual Load Increase

```
Goal: Test system under gradually increasing load

Scenario:
├─ Step 1: cluster.attack (rate: 10, duration: 10s) → wait 5s
├─ Step 2: cluster.attack (rate: 25, duration: 10s) → wait 5s
├─ Step 3: cluster.attack (rate: 50, duration: 10s) → wait 5s
├─ Step 4: cluster.attack (rate: 100, duration: 10s) → wait 5s
└─ Step 5: cluster.attack (rate: 200, duration: 10s) → wait 0s

Total duration: ~50 seconds
Observes: At what load level does system start degrading?
```

### Pattern 2: Chaos + Defense Validation

```
Goal: Verify that defenses work under chaos

Scenario:
├─ Step 1: chaos.cpu (duration: 5000) → wait 1000
├─ Step 2: cluster.attack (rate: 100, duration: 5000) → wait 0
├─ Step 3: delay (duration: 2000) → wait 0
└─ Step 4: mtd.rotate (newPrefix: "secure-xyz") → wait 0

Total duration: ~13 seconds
Observes: Does system still defend under CPU stress?
```

### Pattern 3: Automated Incident Recreation

```
Goal: Replay an incident for post-mortem analysis

Scenario:
├─ Step 1: cluster.attack (rate: 500, duration: 30s) → wait 2s
├─ Step 2: chaos.memory (action: "allocate", amount: 2048) → wait 3s
├─ Step 3: chaos.cpu (duration: 5000) → wait 0

Total duration: ~40 seconds
Observes: Exact same sequence as real incident
```

### Pattern 4: Defense Evasion Testing

```
Goal: Test if attacker can bypass MTD

Scenario:
├─ Step 1: mtd.rotate (newPrefix: "secret-123") → wait 1000
├─ Step 2: cluster.attack (target: "http://...secret-123/echo") → wait 2000
├─ Step 3: cluster.attack (target: "http://.../echo") → wait 0
           (no prefix, should fail)

Observes: Did attack fail without prefix? Good!
```

---

## Section 8: Best Practices

### ✅ DO: Name Scenarios Clearly

```
❌ WRONG:
test1, scenario, attack

✅ RIGHT:
gradual-load-stress-test
waf-bypass-validation
post-incident-recreation-2026-02-22
```

### ✅ DO: Add Delays Between Steps

```
❌ WRONG:
All steps with delayAfter: 0
→ Everything runs simultaneously
→ Can't tell which step caused what

✅ RIGHT:
Steps 1–3: delayAfter: 2000–5000 ms
→ Sequential execution
→ Easy to trace cause and effect
```

### ✅ DO: Document Complex Scenarios

```
Scenario Name: "WAF Validation - OWASP Top 10"
Description:
  Tests that WAF properly blocks OWASP Top 10 attacks:
  1. SQL Injection (cluster attack with SQLi payloads)
  2. Authentication Bypass (attempts with forged tokens)
  3. XSS (payloads in various vectors)
  ...

Expected Result:
  All attacks blocked, error rate < 2%, latency < 500ms
```

### ❌ DON'T: Create Overly Complex Scenarios

```
❌ WRONG:
50-step scenario with 20 chaos events, 5 MTD rotations
→ Hard to debug
→ Unclear what's being tested
→ Fragile (one failure blocks rest)

✅ RIGHT:
Single-purpose scenarios:
  - test-waf-xss.json (XSS only)
  - test-chaos-resilience.json (chaos only)
  - test-mtd-effectiveness.json (MTD only)
→ Compose complex tests from simple parts
```

### ❌ DON'T: Forget to Review Results

```
❌ WRONG:
Run scenario, then ignore results
→ No visibility into what actually happened

✅ RIGHT:
Run scenario, then:
  1. Check final status
  2. Review each step result
  3. Compare metrics before/after
  4. Document findings
```

---

## Section 9: Troubleshooting Scenarios

### Issue: Scenario Won't Start

```
Status: stuck on "pending"
```

**Solutions:**
1. Refresh dashboard
2. Check if another scenario is running
3. Verify Apparatus is healthy: `curl http://localhost:8090/health`
4. Check browser console for errors (F12)

### Issue: Step Fails Immediately

```
Step 1: cluster.attack
Status: failed
Error: "Invalid URL: target"
```

**Solution:**
1. Check the `target` param is a valid full URL
2. Include protocol: `http://` not just `localhost`
3. Example: ✅ `http://localhost:8090/echo` not ❌ `localhost/echo`

### Issue: Scenario Runs Forever

```
Status: running (for > 10 minutes)
Current step: stuck on same step
```

**Solutions:**
1. Stop execution (click [Stop] button)
2. Check if a step has too long a delay
3. Verify chaos event didn't hang system
4. Restart Apparatus if needed

### Issue: Results Look Wrong

```
Step 1 shows requestsSent: 0
But cluster.attack should have sent requests
```

**Diagnosis:**
1. Was the target reachable?
2. Was the rate too high/low?
3. Check network connectivity: `curl http://target/health`
4. Review attack parameters in step details

### Issue: Can't Find Scenario After Creating

```
Created scenario, but not visible in list
```

**Solutions:**
1. Refresh the page
2. Check "All Scenarios" filter (might be filtering)
3. Check if scenario save actually succeeded (check response)
4. Use API to list: `curl http://localhost:8090/scenarios`

---

## Summary

You've learned:
- ✅ What scenarios are and when to use them
- ✅ Building scenarios via dashboard
- ✅ Building scenarios via REST API
- ✅ Executing and monitoring scenarios
- ✅ Understanding execution status and results
- ✅ Common scenario patterns
- ✅ Best practices and troubleshooting

## Next Steps

- **Run attacks manually:** [Tutorial: Live Payload Fuzzer](tutorial-live-payload-fuzzer.md)
- **Run automated tests:** [Tutorial: Testing Lab](tutorial-testing-lab.md)
- **Stress test system:** [Tutorial: Chaos Engineering](tutorial-chaos-engineering.md)
- **Monitor results:** [Tutorial: Monitoring](tutorial-monitoring.md)

---

## Reference: Scenario JSON Template

```json
{
  "name": "My Test Scenario",
  "description": "Description of what this scenario tests",
  "steps": [
    {
      "id": "1",
      "action": "delay",
      "params": { "duration": 1000 },
      "delayAfter": 0
    },
    {
      "id": "2",
      "action": "cluster.attack",
      "params": {
        "target": "http://localhost:8090/echo",
        "rate": 100,
        "duration": 5000
      },
      "delayAfter": 2000
    },
    {
      "id": "3",
      "action": "chaos.cpu",
      "params": { "duration": 5000 },
      "delayAfter": 0
    }
  ]
}
```

---

**Last Updated:** 2026-02-22

For advanced attack orchestration, see [Tutorial: Autopilot](tutorial-autopilot.md).
