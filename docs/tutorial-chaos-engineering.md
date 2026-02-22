# Tutorial: Chaos Engineering Playbook – Test Your Resilience

> Inject faults into your systems and measure recovery. Master resilience testing with Apparatus chaos tools.

---

## What You'll Learn

- ✅ Understand chaos engineering principles and why it matters
- ✅ Inject CPU spikes, memory exhaustion, and network latency
- ✅ Measure system behavior under stress (MTTR, degradation)
- ✅ Design resilience test scenarios
- ✅ Run chaos campaigns across clusters
- ✅ Analyze results and identify weak points
- ✅ Build resilience into your architecture

## Prerequisites

- **Apparatus running** — Server at `http://localhost:8090`
- **Target application** — App you want to test (running and healthy)
- **Monitoring tools** (optional) — APM, dashboards, logs to watch system behavior
- **curl installed** — For running chaos experiments
- **Understanding of:** Response time, availability, graceful degradation

## Time Estimate

~40 minutes (setup → run experiments → analyze results)

## What You'll Build

By the end, you'll have:
1. **A chaos experiment** that stresses your system
2. **Measurement of recovery time** (MTTR)
3. **Evidence of graceful degradation** (or failures to fix)
4. **A reusable chaos playbook** for recurring tests

---

## Section 1: Chaos Engineering Fundamentals

### What is Chaos Engineering?

**Chaos engineering** is the practice of **deliberately breaking things in production** (or production-like environments) to find weaknesses before they cause real outages.

**The Principle:**
> "Break things on purpose to understand how they break, then fix it before it matters."

### Why It Matters

Most companies discover their system is fragile **during real disasters**, not during testing. Chaos engineering lets you find problems safely:

- ❌ **Before chaos engineering:** App crashes unexpectedly, users are affected
- ✅ **With chaos engineering:** You find and fix the crash in a controlled test first

### Real-World Scenarios

**Netflix's Chaos Monkey:**
- Randomly kills servers in production (in non-peak hours)
- If users don't notice, resilience is good
- If users do notice, they fix it before a real failure happens

**AWS's Game Days:**
- Teams simulate outages (network down, database unreachable)
- Teams respond as if it's a real incident
- They learn what breaks and practice recovery

### Chaos Experiment Pattern

Every chaos experiment follows this pattern:

```
1. Measure baseline (system performing normally)
2. Inject fault (CPU spike, latency, memory allocation)
3. Observe impact (response time increases? Errors? Timeouts?)
4. Stop fault (system recovers?)
5. Measure recovery (how long until normal? Graceful or crash?)
6. Analyze (what broke? How can we fix it?)
```

---

## Section 2: Types of Chaos Experiments

### CPU Spike (Processing Overload)

**What it does:** Consumes 80%+ of CPU cycles

**When to use:** Test if app handles CPU-bound bottlenecks

**Expected behavior:**
- Response times increase (more contention)
- Throughput decreases
- Error rate stays ~same (if properly queued)

**Real-world scenario:**
- Batch job starts unexpectedly
- Traffic spike from marketing campaign
- Runaway process consumes CPU

### Memory Exhaustion (OOM Scenarios)

**What it does:** Allocates N MB of RAM, making less available to app

**When to use:** Test memory pressure and caching behavior

**Expected behavior:**
- GC (garbage collection) pauses increase
- Response times become erratic (worse under load)
- May see OutOfMemory errors if too aggressive

**Real-world scenario:**
- Memory leak gradually consumes heap
- Caching layer fills up
- Multiple processes compete for RAM

### Network Latency (Slow Connections)

**What it does:** Adds N milliseconds delay to all network calls

**When to use:** Test timeout handling and retry logic

**Expected behavior:**
- Requests take longer
- Some timeouts may occur
- Fallbacks/circuit-breakers should activate

**Real-world scenario:**
- WAN latency (slow intercontinental link)
- Database over network becomes slow
- Third-party API responds slowly

### Packet Loss (Unreliable Networks)

**What it does:** Randomly drops N% of packets

**When to use:** Test recovery from connection failures

**Expected behavior:**
- Some requests fail
- Retries should handle gracefully
- If no retry logic, app breaks

**Real-world scenario:**
- WiFi in coffee shop (2-5% packet loss)
- Cellular network congestion
- Poor intercontinental connectivity

---

## Section 3: CPU Spike Experiment

### Experiment 1: Simple CPU Spike

**Goal:** See how your app responds to sudden CPU spike

**Setup:** Run a CPU spike for 5 seconds and measure response times

### Step 1: Measure Baseline

Before causing chaos, measure normal performance:

```bash
# Measure response time under normal load
time curl http://myapp:3000/api/users
```

**Record the result:**
- Response time: ___ ms
- Status: 200 OK
- Timestamp: 10:30:00

### Step 2: Trigger CPU Spike

```bash
curl -X POST http://localhost:8090/api/chaos/cpu-spike \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 5000,
    "target": "http://myapp:3000"
  }'
```

**Response:**
```json
{
  "experimentation_id": "chaos-cpu-001",
  "status": "running",
  "message": "CPU spike initiated",
  "startedAt": "2026-02-21T20:30:00Z"
}
```

### Step 3: Monitor During the Spike

While the chaos is running (5 seconds), repeatedly measure response time:

```bash
# Run this in a loop while chaos is happening
for i in {1..5}; do
  echo "Attempt $i at $(date +%H:%M:%S)"
  time curl http://myapp:3000/api/users
  sleep 1
done
```

**You should see:**
- Attempt 1: 50ms (normal)
- Attempt 2: 150ms (degraded)
- Attempt 3: 250ms (worse)
- Attempt 4: 300ms (peak degradation)
- Attempt 5: 100ms (starting to recover)

### Step 4: Measure Recovery

After the 5-second spike ends, continue measuring:

```bash
# Measure recovery over next 10 seconds
for i in {1..10}; do
  echo "Recovery check $i at $(date +%H:%M:%S)"
  time curl http://myapp:3000/api/users
  sleep 1
done
```

**What to look for:**
- How long before response time returns to baseline?
- Any lingering errors?
- Any cascading failures?

### Step 5: Analyze Results

**Create a recovery chart:**

```
Time    | Response | Status | Notes
--------|----------|--------|----------
10:30:00| 50ms    | 200    | Baseline
10:30:01| 50ms    | 200    | Spike starts
10:30:02| 150ms   | 200    | CPU busy
10:30:03| 250ms   | 200    | Degraded
10:30:04| 300ms   | 200    | Peak impact
10:30:05| 250ms   | 200    | Still under load
10:30:06| 100ms   | 200    | Recovering
10:30:07| 50ms    | 200    | ✅ Recovered
```

**Calculate metrics:**
- **Response time increase:** (300 - 50) / 50 = 500% degradation
- **MTTR (Mean Time To Recovery):** 7:30:07 - 7:30:01 = 6 seconds

---

## Section 4: Memory Exhaustion Experiment

### Experiment 2: Memory Pressure

**Goal:** See how app behaves when memory becomes scarce

### Step 1: Baseline Memory State

Check system memory:

```bash
free -h  # On Linux
# or
vm_stat  # On Mac
```

Record available memory: _______ GB

### Step 2: Trigger Memory Spike

Allocate 50% of available memory:

```bash
curl -X POST http://localhost:8090/api/chaos/memory-spike \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 10000,
    "memoryMB": 2048,
    "target": "http://myapp:3000"
  }'
```

### Step 3: Monitor Behavior

During memory spike, watch for:
- Response time increase
- Error rate increase
- GC (garbage collection) pauses
- Out-of-Memory errors

```bash
# Monitor response times every 2 seconds
watch -n 2 'curl -s -w "%{time_total}\n" -o /dev/null http://myapp:3000/api/users'
```

### Step 4: Measure Recovery

After spike ends, check:
- Memory released immediately?
- Any lingering slowness?
- Did anything crash?

```bash
free -h  # Check if memory freed
curl http://myapp:3000/health  # Check if app still responsive
```

### Step 5: Results

**Memory experiment expected outcomes:**

| Outcome | What It Means |
|---------|---------------|
| ✅ Response time stable | App has good memory management |
| ⚠️ Temporary slowness | GC pauses are normal, recovers quickly |
| ❌ Out-of-Memory errors | App not resilient to memory pressure |
| ❌ App crash | Memory management broken, needs fixing |

---

## Section 5: Network Latency Experiment

### Experiment 3: Slow Database/API Calls

**Goal:** Test how app handles slow external services

**Scenario:** Your database becomes slow, all queries take 1 second instead of 10ms

### Step 1: Identify External Dependency

Find an external call your app makes:
- Database query (SELECT * FROM users)
- API call to third-party service
- Cache lookup (Redis)

### Step 2: Inject Latency

Simulate slow external service:

```bash
curl -X POST http://localhost:8090/api/chaos/latency-inject \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 10000,
    "latencyMs": 1000,
    "target": "http://myapp:3000",
    "affectPath": "/api/users"  # Only this endpoint
  }'
```

### Step 3: Test with Load

While latency is injected, send requests:

```bash
# Rapid fire requests to see timeout behavior
for i in {1..20}; do
  curl http://myapp:3000/api/users -m 5  # 5 second timeout
  echo ""
  sleep 0.5
done
```

**Watch for:**
- Requests timing out after 5 seconds?
- Circuit breaker kicking in?
- Fallback data returned?
- Error messages helpful?

### Step 4: Analyze Timeout Behavior

**Expected outcomes:**

| Behavior | Resilience Level |
|----------|------------------|
| ✅ Request times out after 5s, fallback returned | Excellent |
| ⚠️ Request hangs for 30s, then fails | Poor (timeout too long) |
| ❌ App becomes unresponsive | Bad (no timeout) |

---

## Section 6: Running a Chaos Scenario

### Build an Integrated Chaos Experiment

Instead of running experiments in isolation, create a **multi-step scenario**:

```json
{
  "name": "Resilience Under Stress",
  "target": "http://myapp:3000",
  "steps": [
    {
      "id": "baseline",
      "name": "Measure baseline (normal load)",
      "action": "redteam.xss",
      "params": { "path": "/api/users", "param": "q" }
    },
    {
      "id": "cpu-spike",
      "name": "Spike CPU to 80%",
      "action": "chaos.cpu",
      "params": { "duration": 10000 }
    },
    {
      "id": "measure-under-cpu",
      "name": "Measure performance during CPU spike",
      "action": "redteam.xss",
      "params": { "path": "/api/users", "param": "q" },
      "dependsOn": "cpu-spike"
    },
    {
      "id": "wait-recovery",
      "name": "Wait 5 seconds for recovery",
      "action": "delay",
      "params": { "duration": 5000 }
    },
    {
      "id": "verify-recovered",
      "name": "Verify normal performance restored",
      "action": "redteam.xss",
      "params": { "path": "/api/users", "param": "q" }
    }
  ]
}
```

**This scenario:**
1. Measures normal response time
2. Spikes CPU for 10 seconds
3. Measures response time under load
4. Waits for recovery
5. Verifies system recovered

---

## Section 7: Analyzing Chaos Results

### Key Metrics to Track

| Metric | How to Measure | Good Target |
|--------|---|---|
| **Response Time** | `time curl` or APM | +100% degradation max |
| **MTTR** | Time until status=200 | < 2 minutes |
| **Error Rate** | (failed requests / total) × 100 | < 5% during chaos |
| **Graceful Degradation** | Can app serve requests with reduced functionality? | Yes |
| **Auto-Recovery** | No manual intervention needed? | Yes |

### Example: Chaos Report

```
EXPERIMENT: CPU Spike for 10 seconds

BASELINE:
  - Response time: 50ms
  - Error rate: 0%
  - Throughput: 200 req/s

DURING SPIKE:
  - Response time: 500ms (10x increase)
  - Error rate: 2% (some timeouts)
  - Throughput: 50 req/s (75% reduction)

RECOVERY:
  - Time to 200ms response: 15 seconds
  - Time to 50ms response: 30 seconds
  - Time to 0% error rate: 20 seconds

FINDINGS:
  ⚠️ Response time increased too much (10x is too much, target: < 2x)
  ⚠️ MTTR is 30 seconds (target: < 10 seconds)
  ✅ No errors after 20 seconds
  ✅ Graceful degradation (requests still processed)

RECOMMENDATIONS:
  1. Add more CPU capacity (horizontal scaling)
  2. Implement request queuing (don't drop requests under load)
  3. Reduce timeout to 10 seconds (currently 30)
  4. Consider circuit breaker pattern
```

---

## Section 8: Chaos Playbook Patterns

### Pattern 1: Database Failure

**Simulate:** Database becomes unavailable

```json
{
  "name": "Database Unavailability Test",
  "steps": [
    {
      "id": "kill-db",
      "name": "Stop database connection",
      "action": "chaos.connection-kill",
      "params": { "target": "mydb:5432" }
    },
    {
      "id": "measure-impact",
      "name": "Measure app behavior",
      "action": "redteam.xss",
      "params": { "path": "/api/users", "param": "q" },
      "timeout": 10000
    },
    {
      "id": "restore",
      "name": "Restore database",
      "action": "chaos.connection-restore",
      "params": { "target": "mydb:5432" }
    }
  ]
}
```

**Expect:**
- App returns 503 (Service Unavailable) quickly
- Or uses cache/fallback data
- **NOT:** App hangs for 30 seconds

---

### Pattern 2: Cascading Failure

**Simulate:** One service slow, causes others to back up

```json
{
  "name": "Cascading Failure Test",
  "steps": [
    {
      "id": "slow-cache",
      "name": "Slow down cache (Redis)",
      "action": "chaos.latency",
      "params": { "target": "redis:6379", "latencyMs": 2000 }
    },
    {
      "id": "measure-cascade",
      "name": "Measure if app is affected",
      "action": "redteam.xss",
      "params": { "path": "/api/users", "param": "q" },
      "timeout": 5000
    }
  ]
}
```

**Expect:**
- App uses fallback quickly (doesn't wait for slow cache)
- **NOT:** Entire app becomes slow

---

### Pattern 3: Peak Load

**Simulate:** 10x normal traffic suddenly

```json
{
  "name": "Peak Load Test",
  "steps": [
    {
      "id": "baseline",
      "name": "Normal traffic baseline",
      "action": "chaos.attack",
      "params": { "pattern": "normal", "rate": 100 }
    },
    {
      "id": "spike",
      "name": "10x traffic surge",
      "action": "chaos.attack",
      "params": { "pattern": "burst", "rate": 1000 }
    },
    {
      "id": "verify",
      "name": "Check if requests still handled",
      "action": "redteam.xss",
      "params": { "path": "/api/health", "param": "q" }
    }
  ]
}
```

---

## Section 9: Troubleshooting Chaos Experiments

### Experiment Doesn't Cause Expected Degradation

**Symptom:** CPU spike runs but response time doesn't change

**Causes:**
1. Apparatus CPU spike doesn't affect target app (on different machine)
2. CPU isn't the bottleneck (it's I/O, network, disk)
3. Duration too short to measure

**Solution:**
- Increase duration to 20+ seconds
- Run Apparatus and target app on same machine
- Try memory or latency experiments instead

---

### App Crashes During Experiment

**Symptom:** App crashes or restarts when chaos runs

**Good news:** You found a real problem! Your app isn't resilient.

**Solution:**
1. Document exactly what caused crash (which chaos experiment)
2. Fix the underlying issue (add error handling, timeouts, circuit breaker)
3. Re-run experiment to verify fix

---

### Can't Measure Results

**Symptom:** Response times all over the place, hard to see pattern

**Solution:**
1. Increase sample size (run 100 requests, not 10)
2. Average results: `(sum of times) / count`
3. Use monitoring tools (APM, Prometheus) for real data

---

## Summary

You've learned how to:
- ✅ Understand chaos engineering principles
- ✅ Design and run CPU spike experiments
- ✅ Test memory exhaustion and recovery
- ✅ Inject network latency to test timeout handling
- ✅ Build multi-step chaos scenarios
- ✅ Analyze results and measure MTTR
- ✅ Identify resilience gaps and fix them

---

## Next Steps

**Continue your chaos engineering journey:**

1. **Run against your own app** — Design experiments specific to your architecture
2. **Automate in CI/CD** — Run chaos tests on every deployment
3. **Game Days** — Invite your team to respond to chaos together
4. **Production Testing** — Once confident, run (safe) chaos in production
5. **Learn from Netflix** — Read "The Netflix Chaos Monkey Papers"

---

**Made with ❤️ for DevOps, SREs, and resilience engineers**
