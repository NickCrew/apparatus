# Tutorial: Overview Dashboard – Real-Time System Monitoring & Incident Feed

> Monitor system health, track security incidents, and respond to threats in real-time through the main dashboard overview.

---

## What You'll Learn

- ✅ Understand the Overview dashboard layout and key panels
- ✅ Interpret real-time metrics (throughput, latency, error rate)
- ✅ Read and act on the incident feed
- ✅ Understand the pressure gauge and health status indicators
- ✅ Monitor protocol activity and active threat sources
- ✅ Respond to critical incidents from the overview
- ✅ Filter and drill down into specific incidents

## Prerequisites

- **Apparatus running** — Server accessible at `http://localhost:8090`
- **Web dashboard open** — Navigate to http://localhost:8090/dashboard
- **Active traffic** — Some traffic/attacks hitting the system (real or simulated)

## Time Estimate

~20 minutes (walkthrough + hands-on incident response)

## What You'll Build

By the end, you'll be able to:
1. **Monitor system health** at a glance
2. **Understand real-time metrics** and what they indicate
3. **Interpret the incident feed** and prioritize threats
4. **Respond quickly** to critical incidents
5. **Drill down** into specific events for analysis

---

## Section 1: The Overview Dashboard Layout

### What is the Overview?

The **Overview Dashboard** is the **main landing page** of Apparatus. It provides a holistic view of system health, active threats, and incident timeline in real-time.

Think of it as your **24/7 monitoring console** — a single pane of glass to understand what's happening on your system right now.

### Main Sections

<img src="/dashboard/assets/diagrams/diagram-15-overview-sections.svg" alt="Overview dashboard section map showing pressure gauge, key metrics, protocol activity, and incident feed." width="940" style="max-width: 100%; height: auto;" />

### Try It: Open the Overview

1. Open the dashboard: `http://localhost:8090/dashboard`
2. By default, you'll see the **Overview console**
3. If not, click **Overview** in the left sidebar

### Checkpoint

- [ ] Overview dashboard visible
- [ ] Key metrics section showing (Throughput, Error Rate, Latency)
- [ ] Pressure gauge visible at top
- [ ] Incident feed visible (may be empty if no traffic yet)
- [ ] Protocol activity chart showing

---

## Section 2: Understanding Key Metrics

### Real-Time Metrics Explained

The dashboard displays four key metrics updated in real-time:

#### 1. **Throughput (Requests Per Second - RPS)**

```
Throughput: 145 RPS ↑ Normal
```

**What it is:** Number of requests being processed per second.

**What's good:**
- 🟢 **Stable** — Stays consistent (e.g., 100-120 RPS)
- ↑ Slightly rising — Increased legitimate traffic
- ↓ Slightly falling — Normal variation

**What's concerning:**
- 🔴 **Drops to 0** — System not responding
- 🔴 **Spikes > 2x normal** — Possible attack or load surge
- 🟠 **Gradual decline** — System degradation under load

**Action:**
- Dropping? Check if services are running
- Spiking? Look at Attacker Fingerprinting console
- If normal but error rate high? Look at incident feed

#### 2. **Error Rate (%)**

```
Error Rate: 2.3% ↓ Decreasing
```

**What it is:** Percentage of requests that returned error status (4xx, 5xx).

**What's good:**
- 🟢 **< 0.1%** — Excellent (only occasional errors)
- 🟡 **0.1–1%** — Normal (expected transient errors)
- 🟡 **1–5%** — Acceptable (some issues but manageable)

**What's concerning:**
- 🔴 **> 5%** — High error rate, system struggling
- 🔴 **Rising sharply** — Degradation detected
- 🔴 **All requests failing (100%)** — Complete outage

**Action:**
- Rising? Check incident feed for reasons
- High? Review defense logs (WAF blocking legitimate traffic?)
- Erratic? Look for chaos engineering events

#### 3. **Average Latency (Response Time)**

```
Latency: avg 87ms ↑ Rising
```

**What it is:** Average time to respond to a request, measured in milliseconds.

**What's good:**
- 🟢 **< 100ms** — Excellent (fast)
- 🟡 **100–350ms** — Good (acceptable)
- 🟠 **350–750ms** — Degraded (slow but functional)

**What's concerning:**
- 🔴 **> 750ms** — Critical slowdown (users frustrated)
- 🔴 **Spiking suddenly** — Possible attack (tarpit, chaos)
- 🔴 **Gradually increasing** — Resource exhaustion

**Percentiles shown:**
- **P95** — 95% of requests faster than this
- **P99** — 99% of requests faster than this

**Example:**
```
Avg: 87ms | P95: 220ms | P99: 450ms
→ Most requests fast, but slowest 1% take 450ms
```

**Action:**
- Rising? Check Chaos Console (CPU/memory spike?)
- Tarpit active? Check Attacker Fingerprinting
- Gradual increase? Performance degradation, investigate

#### 4. **Active Sources (IP Count)**

```
Active Sources: 42
```

**What it is:** Number of unique IP addresses that have made requests in the last 5 minutes.

**What's good:**
- 🟢 **Stable count** — Consistent user base
- 🟢 **Slow growth** — Normal organic growth

**What's concerning:**
- 🔴 **Sharp spike** — Possible DDoS attack
- 🔴 **Many unknown external IPs** — Investigate in Attacker Fingerprinting

**Action:**
- Spike detected? Go to Attacker Fingerprinting console
- High unknown external? Check risk scores

---

## Section 3: Reading the Pressure Gauge

### What is the Pressure Gauge?

The **Pressure Gauge** shows overall system health on a scale from STABLE → ELEVATED → CRITICAL.

```
🟢 STABLE      🟡 ELEVATED    🔴 CRITICAL
━━━━━━━━       ━━━━━━━━       ━━━━━━━━
Lag < 50ms     50-200ms       > 200ms
All routes OK  Heavy routes   Request shedding
                 shedding
```

<img src="/dashboard/assets/diagrams/diagram-33-pressure-state-transitions.svg" alt="Pressure gauge state transitions between Stable, Elevated, and Critical based on event loop lag thresholds." width="940" style="max-width: 100%; height: auto;" />

### Pressure Calculation

The gauge is calculated from **event loop lag**:

- **Event loop lag** = How long JavaScript takes to process each tick
- High lag means system is struggling to keep up
- Too much traffic or CPU-intensive operations increase lag

### Interpreting Pressure States

#### 🟢 **STABLE (Green)**
```
Pressure: STABLE | Lag: 12ms
```
- System running smoothly
- All routes responding normally
- No load shedding

**Action:** All good! Continue monitoring.

#### 🟡 **ELEVATED (Yellow)**
```
Pressure: ELEVATED | Lag: 95ms
```
- System starting to struggle
- Heavier routes (like `/generate`) may shed traffic
- SSE connections may be delayed

**Likely causes:**
- High traffic spike
- CPU spike (chaos engineering)
- Memory pressure
- Complex computations

**Action:**
- Monitor trends
- If worsening, activate mitigation
- Check Active Resources

#### 🔴 **CRITICAL (Red)**
```
Pressure: CRITICAL | Lag: 250ms+
```
- System heavily overloaded
- All heavy routes shed traffic
- Requests may be rejected with 503

**Likely causes:**
- Sustained DDoS attack
- Runaway CPU/memory chaos
- Cascade failure

**Action:** IMMEDIATE
1. Check Attacker Fingerprinting for active threats
2. Check Chaos Console for active experiments
3. Activate rate limiting or Tarpit
4. Blackhole malicious IPs if necessary

### Try It: Monitor Pressure Under Load

**Goal:** Observe pressure gauge change as load increases.

**Steps:**

1. Note current pressure (probably 🟢 STABLE)
2. Trigger a CPU spike:
   ```bash
   curl -X POST http://localhost:8090/chaos/cpu -d '{"duration": 15000}'
   ```
3. Watch the Overview dashboard as pressure changes:
   - Lag increases
   - Gauge moves toward 🟡 ELEVATED
   - Metrics may show higher latency
4. After spike completes, pressure returns to 🟢 STABLE

### Checkpoint

- [ ] Understand pressure gauge meaning
- [ ] Know the three pressure states
- [ ] Understand event loop lag concept
- [ ] Can read current pressure from dashboard

---

## Section 4: Interpreting the Incident Feed

### What is the Incident Feed?

The **Incident Feed** is a real-time timeline of security events, anomalies, and system state changes. Each incident is color-coded by severity:

| Color | Level | Meaning |
|-------|-------|---------|
| 🔴 Red | CRITICAL | Immediate threat or system failure |
| 🟠 Orange | ERROR | Errors or potential issues |
| 🟡 Yellow | WARNING | Anomaly or degradation detected |
| 🟢 Green | INFO | Normal activity, status updates |

### Incident Types

#### Type 1: **Defense Blocks**
```
🔴 [CRITICAL] Defense block triggered
   192.168.1.50 (unknown_external, risk: 92)
   912 XSS attempts, 45 SQLi attempts
   Blocked rate: 98.7%
```

**What happened:** WAF detected and blocked malicious requests.

**What to do:**
1. Go to Attacker Fingerprinting
2. Find the IP
3. Review attack types
4. Consider tarpit or blackhole

#### Type 2: **High Latency**
```
🟡 [WARNING] High latency detected
   Avg response time: 850ms (>350ms threshold)
   P95: 2100ms (>750ms threshold)
   Affected routes: /generate, /redteam/validate
```

**What happened:** Response times exceeded normal thresholds.

**Likely causes:**
- Heavy load
- CPU/memory chaos active
- Database/external service slow
- Tarpit active on many requests

**What to do:**
1. Check pressure gauge
2. Check Chaos Console for active experiments
3. Check Attacker Fingerprinting (high tarpit activity?)
4. Check if load test is running (k6 scenario?)

#### Type 3: **Chaos Event**
```
🔴 [CRITICAL] Chaos event detected
   CPU spike: 5000ms duration active
   Memory spike: 256MB allocated
   Expected impact: 30–50% latency increase
```

**What happened:** Intentional chaos experiment is running.

**What to do:**
- Monitor effects on error rate and latency
- If chaos is unexpected, stop it via Chaos Console
- If expected, continue observing

#### Type 4: **Traffic Anomaly**
```
🟠 [ERROR] Traffic pattern anomaly
   RPS spike detected: 145 → 520 RPS (+259%)
   New sources: 18 unknown external IPs
   Possible attack: Check Attacker Fingerprinting
```

**What happened:** Unusual traffic pattern detected.

**What to do:**
1. Check Attacker Fingerprinting for new high-risk IPs
2. Review traffic patterns
3. Determine if legitimate (load test) or attack
4. Respond accordingly

#### Type 5: **Defense Activation**
```
🟡 [WARNING] Defense activated
   Moving Target Defense: Prefix rotated
   New prefix: "xyz-789-abc"
   All calls must use new prefix
```

**What happened:** A defense mechanism was activated.

**What to do:**
- If expected, update clients
- If unexpected, investigate who activated it

#### Type 6: **System Status**
```
🟢 [INFO] Traffic normal
   145 requests/sec, 2.3% error rate
   Avg latency: 87ms
   Active sources: 42
```

**What happened:** Periodic heartbeat showing system is healthy.

**What to do:**
- Just continue monitoring
- A good sign of system stability

### Try It: Generate an Incident

**Goal:** Trigger an incident and see it appear in the feed.

**Steps:**

1. Generate some traffic/attack (use Autopilot or payload fuzzer)
2. Watch the incident feed
3. You should see incidents like:
   ```
   🔴 [CRITICAL] Defense block triggered...
   🟡 [WARNING] High latency detected...
   ```

### Checkpoint

- [ ] Understand incident feed purpose
- [ ] Know the severity color coding
- [ ] Can identify incident types
- [ ] Understand what action to take for each type

---

## Section 5: Incident Response Workflow

### Scenario: Critical Incident During Monitoring

**You see this in the incident feed:**

```
🔴 [CRITICAL] Defense block triggered
   203.0.113.45 (unknown_external, risk: 88)
   847 XSS attempts in 30 seconds
   Blocked rate: 99.5%
   ...

Error Rate jumped from 2% to 8%
Latency spiked to 450ms (P99)
```

**What do you do?**

<img src="/dashboard/assets/diagrams/diagram-32-incident-response-workflow.svg" alt="Incident response workflow from severity assessment through source investigation, response choice, and verification." width="940" style="max-width: 100%; height: auto;" />

### Step-by-Step Response

#### Step 1: Assess Severity (30 seconds)

**Questions to ask:**
- Is error rate still rising? (check trend)
- Is latency still high? (check dashboard)
- Are new sources attacking? (check Attacker Fingerprinting)

**Expected outcome:**
- Understand if incident is ongoing or contained
- Determine urgency (ongoing crisis vs. past event)

#### Step 2: Investigate the Source (1 minute)

**Action:**
```
1. Go to Attacker Fingerprinting console
2. Find IP 203.0.113.45
3. Review:
   - Risk score (88 = high)
   - Category (unknown_external)
   - Attack types (XSS focus)
   - Success rate (0.5% bypassed!)
   - Protocol heatmap
```

**Key finding:** They bypassed WAF on 4 requests!

#### Step 3: Respond Immediately (1 minute)

**Action:**
```
If < 1% bypass rate (acceptable):
  → Tarpit the IP
  → Monitor for continued activity

If > 1% bypass rate (concerning):
  → Blackhole immediately
  → Note the XSS payload that bypassed
  → Update WAF rules
```

**In this case:** Blackhole (4 requests bypassed the WAF).

#### Step 4: Investigate the Bypass (2–5 minutes)

**Action:**
```
1. Click [Details] on attacker profile
2. Review the 4 successful requests
3. Copy the XSS payloads
4. Analyze:
   - What made them bypass?
   - Is it a new technique?
   - Is it a known CVE?
5. Update WAF rule to prevent recurrence
```

**Example finding:**
```
Payload: <img src=x onerror="eval(String.fromCharCode(...))">
Issue: WAF didn't decode Unicode escapes
Fix: Update XSS rule to normalize Unicode
```

#### Step 5: Document & Monitor (ongoing)

**Action:**
```
Create incident report:
- Time: 14:32 UTC
- Attacker: 203.0.113.45
- Attack: XSS scanner (automated)
- Requests: 847 total, 4 bypassed
- Action: Blackhole
- Finding: WAF bypass via Unicode encoding
- Fix: Updated XSS rule
- Status: CONTAINED & FIXED
```

**Monitoring:**
- Watch if attacker tries again (they're blackholed)
- Monitor error rate (should return to normal)
- Verify latency recovers

### Try It: Simulate and Respond to an Incident

**Prerequisites:** Have Apparatus running with active traffic.

**Workflow:**

1. **Generate an attack:**
   ```bash
   curl -X POST http://localhost:8090/api/redteam/autopilot/start \
     -d '{"target": "http://localhost:8090"}'
   ```

2. **Monitor the Overview:**
   - Watch incident feed for events
   - Note metrics changes

3. **Respond:**
   - Go to Attacker Fingerprinting
   - Find top attacking IPs
   - Take response action (tarpit/blackhole)
   - Monitor effects on dashboard

4. **Document:**
   - Note what you found
   - Describe actions taken
   - Predict future similar incidents

### Checkpoint

- [ ] Understand incident response workflow
- [ ] Can quickly assess severity
- [ ] Know when to tarpit vs. blackhole
- [ ] Can investigate bypass attempts
- [ ] Can document findings

---

## Section 6: Monitoring Best Practices

### ✅ DO: Monitor Trends, Not Individual Data Points

```
❌ WRONG:
Latency is 150ms, that's high!
→ One data point, not enough context

✅ RIGHT:
Latency was 80ms, now 150ms, continuing to rise
→ Trend indicates degradation
→ Action: Investigate cause
```

### ✅ DO: Correlate Metrics

```
When you see:
  ↑ Error rate rising
  ↑ Latency rising
  ↑ RPS staying stable

Conclusion: System struggling, not attack
→ Check resource usage, not attacker logs
```

### ✅ DO: Act on Incidents Immediately

```
🔴 CRITICAL incident appears
→ Don't wait, investigate immediately
→ Blackhole if confirmed malicious
→ Document findings
```

### ❌ DON'T: Ignore Yellow Warnings

```
🟡 [WARNING] appears
→ Don't assume it's not important
→ Investigate the trend
→ Act before it becomes 🔴 CRITICAL
```

### ❌ DON'T: Trust Metrics Alone

```
Throughput looks normal (140 RPS)
Error rate looks normal (2%)
But latency is 1500ms
→ There's a hidden problem!
→ Investigate before declaring all-clear
```

---

## Summary

You've learned:
- ✅ Overview dashboard layout and main sections
- ✅ Understanding real-time metrics (throughput, error rate, latency, active sources)
- ✅ Reading the pressure gauge and system health states
- ✅ Interpreting the incident feed and incident types
- ✅ Incident response workflow (assess → investigate → respond → document)
- ✅ Monitoring best practices and common pitfalls

## Next Steps

- **Respond to threats:** [Tutorial: Attacker Fingerprinting](tutorial-attacker-fingerprinting.md)
- **Inject chaos:** [Tutorial: Chaos Engineering](tutorial-chaos-engineering.md)
- **Set up defenses:** [Tutorial: Defense Rules](tutorial-defense-rules.md)
- **Deep dive metrics:** [Tutorial: Monitoring](tutorial-monitoring.md)

---

**Last Updated:** 2026-02-22

For real-time security response, see [Tutorial: Attacker Fingerprinting](tutorial-attacker-fingerprinting.md).
