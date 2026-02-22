# Tutorial: Chaos Console – Safe Fault Injection & Resilience Testing

> Inject controlled failures into your system to test recovery mechanisms, measure MTTR (Mean Time To Recovery), and validate resilience patterns.

---

## What You'll Learn

- ✅ Understand chaos engineering principles and safety considerations
- ✅ Use the Chaos Console to trigger CPU spikes, memory stress, and crashes
- ✅ Measure system response to failures (latency, error rate, recovery time)
- ✅ Conduct safe experiments without affecting production
- ✅ Validate auto-recovery mechanisms
- ✅ Interpret chaos results and findings
- ✅ Design resilience testing workflows

## Prerequisites

- **Apparatus running** — Server accessible at `http://localhost:8090`
- **Web dashboard open** — Navigate to http://localhost:8090/dashboard
- **Understanding of chaos engineering** — Basic familiarity with resilience testing (helpful but not required)
- **Baseline metrics** — Know your system's normal performance

## Time Estimate

~30 minutes (overview + hands-on experiments)

## What You'll Build

By the end, you'll be able to:
1. **Conduct safe chaos experiments** on your system
2. **Measure system response** to failures
3. **Validate recovery** mechanisms work correctly
4. **Compare before/after** metrics to measure resilience
5. **Design repeatable** chaos workflows

---

## Section 1: Chaos Engineering Fundamentals

### What is Chaos Engineering?

**Chaos Engineering** is the discipline of **intentionally injecting failures** into systems to:
- ✅ Discover hidden weaknesses before customers find them
- ✅ Test auto-recovery and failover mechanisms
- ✅ Measure recovery time (MTTR)
- ✅ Build confidence in system resilience
- ✅ Validate monitoring and alerting

**NOT about:**
- ❌ Breaking production systems
- ❌ Causing customer harm
- ❌ Random experiments
- ❌ Uncontrolled chaos

### Chaos Engineering Principles

| Principle | Why | How |
|-----------|-----|-----|
| **Steady State** | Know what "normal" looks like | Measure baseline metrics first |
| **Hypothesis** | Have a testable prediction | "System recovers within 5 minutes" |
| **Blast Radius** | Limit the blast | Start small, expand gradually |
| **Automation** | Make it repeatable | Use scenarios for recurring tests |
| **Analysis** | Learn from failures | Document findings and fixes |

### Chaos vs. Production

```
🔴 NEVER: Random chaos on production
   → Uncontrolled blast radius
   → Unknown impact on customers
   → Can't reproduce findings

🟢 DO: Controlled chaos in staging/lab
   → Bounded system (Apparatus)
   → No customer impact
   → Repeatable and measurable
   → Safe failure mode
```

---

## Section 2: Opening the Chaos Console

### Try It: Navigate to Chaos Console

1. Open dashboard: `http://localhost:8090/dashboard`
2. Click **Chaos Console** in the left sidebar (or search for it)
3. You should see:
   - CPU Spike controls
   - Memory Spike controls
   - Crash controls
   - Status indicators
   - Action history

### The Chaos Console Layout

<img src="/dashboard/assets/diagrams/diagram-14-chaos-console-layout.svg" alt="Chaos console layout showing safety warning, CPU controls, memory controls, crash controls, and recent action history." width="940" style="max-width: 100%; height: auto;" />

### Checkpoint

- [ ] Chaos Console visible and accessible
- [ ] All three control sections visible (CPU, Memory, Crash)
- [ ] Status indicators showing current state
- [ ] Action history showing past experiments

---

## Section 3: CPU Spike Testing

### What is a CPU Spike?

A **CPU spike** intentionally maxes out CPU utilization to simulate:
- Compute-heavy operations (complex calculations)
- Runaway processes
- Unexpected traffic spikes requiring processing
- Third-party library performance issues

### Understanding CPU Impact

When CPU spikes:
- ⬆️ Event loop lag increases (system can't process other requests quickly)
- ⬆️ Response latency increases (users experience slower responses)
- ⬆️ Error rate may increase (queue overflow)
- ⬆️ Pressure gauge moves toward CRITICAL

<img src="/dashboard/assets/diagrams/diagram-26-cpu-impact-timeline.svg" alt="CPU spike impact timeline from baseline to spike window to recovery validation." width="940" style="max-width: 100%; height: auto;" />

### Try It: Measure CPU Impact

**Goal:** See how system responds to CPU stress.

**Baseline First:**
1. Open **Overview Dashboard**
2. Note current metrics:
   ```
   Throughput: ~100 RPS
   Latency: ~50ms avg
   Error Rate: <1%
   Pressure: 🟢 STABLE
   ```

**Trigger CPU Spike:**
1. Go to **Chaos Console**
2. Click **[Trigger 5s Spike]**
3. You'll see: `CPU spike triggered (5000ms)`
4. Watch the metrics in Overview dashboard change in real-time:
   ```
   Throughput: ~50 RPS (dropped)
   Latency: ~500ms (spiked)
   Error Rate: ~5% (increased)
   Pressure: 🟡 ELEVATED (yellow)
   ```

**During the Spike (first 5 seconds):**
- System struggles to process requests
- Some requests may fail with 503 (resource exhausted)
- Latency is very high (400–1000ms)
- Dashboard shows degradation

**After Spike Completes (5+ seconds):**
- Metrics gradually return to baseline
- Latency decreases
- Error rate drops
- Pressure returns to 🟢 STABLE

### Interpreting CPU Spike Results

**Good Recovery:**
```
Before:  Latency 50ms, Error 0.5%
During:  Latency 600ms, Error 8%
After:   Latency 60ms, Error 0.5%

Conclusion: ✅ System recovered normally
Recovery time: ~5 seconds after spike ended
```

**Poor Recovery:**
```
Before:  Latency 50ms, Error 0.5%
During:  Latency 600ms, Error 8%
After:   Latency 200ms, Error 3% (still high!)

Conclusion: ⚠️ Slow recovery
Next action: Investigate what's blocking recovery
```

### Advanced: Customized CPU Duration

You can trigger CPU spikes of different durations:

```
5 seconds (default):  [Trigger 5s Spike]
15 seconds (longer):  [Trigger 15s Spike]
Custom duration:      Set in input field (250-120000 ms)
```

**Strategies:**
- **5s** — Test quick recovery (normal case)
- **15s** — Test sustained load (how long can we handle?)
- **120s** — Stress test (extreme resilience)

### Checkpoint

- [ ] Can trigger CPU spikes
- [ ] Understand CPU impact on metrics
- [ ] Can measure recovery time
- [ ] Know the difference between good and poor recovery

---

## Section 4: Memory Spike Testing

### What is a Memory Spike?

A **memory spike** intentionally allocates large amounts of RAM to simulate:
- Memory leaks
- Buffer allocation gone wrong
- Caching systems consuming too much memory
- Third-party libraries with memory issues

### Understanding Memory Impact

When memory spikes:
- ⬆️ Process memory usage increases
- ⬆️ System may hit Out-Of-Memory (OOM) conditions
- ⬆️ Garbage collection pauses increase
- ⬆️ Latency may increase
- ⬆️ Error rate may increase if OOM killer triggers

<img src="/dashboard/assets/diagrams/diagram-27-memory-allocation-impact.svg" alt="Memory allocation impact stages from low allocation through high-pressure ranges and cleanup." width="940" style="max-width: 100%; height: auto;" />

### Memory Controls

```
Action: [allocate ▼]  Amount: [256]MB
                      Clear/Release

Allocate: Add memory in 256MB chunks (1–4096 MB max)
Clear:    Release all allocated memory
```

### Try It: Test Memory Stress

**Goal:** Allocate memory and observe impact.

**Step 1: Take Baseline**
1. Open Overview Dashboard
2. Note memory usage:
   ```
   Memory: 285 MB (from sysinfo)
   Throughput: ~100 RPS
   Latency: ~50ms
   ```

**Step 2: Allocate Memory**
1. Go to Chaos Console
2. Set **Action:** "allocate"
3. Set **Amount:** "512" (MB)
4. Click **[Allocate]**
5. Status shows: `✓ Allocated 512 MB (total: 512 MB)`

**Step 3: Observe Impact**
1. Memory usage in sysinfo should increase
2. Monitor latency (may increase slightly)
3. Error rate should stay normal (usually no impact from just memory allocation)

**Step 4: Allocate More**
1. Allocate another 512 MB (total: 1024 MB)
2. System still functioning normally
3. Throughput and latency stay stable

**Step 5: Release Memory**
1. Click **[Clear All]**
2. Status shows: `✓ Cleared all allocated memory`
3. Memory usage returns to normal
4. Metrics return to baseline

### Memory Allocation Strategies

| Amount | Duration | Use Case |
|--------|----------|----------|
| **256 MB** | Seconds | Mild stress (baseline test) |
| **512 MB** | Minutes | Medium stress (common scenarios) |
| **1024 MB** | Extended | High stress (resilience test) |
| **2048 MB** | Extreme | Severe memory pressure test |
| **4096 MB** | Maximum | OOM condition testing |

### Try It: Gradual Memory Allocation

**Goal:** Allocate memory gradually and measure impact.

**Scenario:**
1. Start with 512 MB allocation
2. Wait 30 seconds, observe metrics
3. Allocate another 512 MB (total: 1024 MB)
4. Wait 30 seconds, observe
5. Allocate another 512 MB (total: 1536 MB)
6. Wait 30 seconds, observe
7. Clear all

**Questions to answer:**
- At what memory level does latency increase?
- Does error rate spike at any point?
- Is there a "breaking point"?

### Checkpoint

- [ ] Can allocate and clear memory
- [ ] Understand memory impact on system
- [ ] Can measure performance degradation
- [ ] Know memory allocation limits

---

## Section 5: Process Crash Testing

### What is Crash Testing?

**Crash testing** gracefully terminates the Apparatus process to simulate:
- Unexpected service crashes
- Deployment gone wrong
- Out-of-Memory killer activating
- Catastrophic errors

### Important: Supervised Restart

⚠️ **Apparatus is supervised** — When it crashes:
1. Process exits (status 1)
2. Supervisor detects exit
3. **Supervisor restarts Apparatus** automatically
4. Service comes back online within 1–5 seconds

This is **intentional** — you're testing the **recovery mechanism**.

### Try It: Trigger Graceful Crash

**Goal:** Test that system recovers from a crash.

**Step 1: Baseline**
1. Note uptime in sysinfo: "Uptime: 3h 45m"
2. Note current processes are responding

**Step 2: Trigger Crash**
1. Go to Chaos Console
2. Read the warning: "⚠️  Will restart with supervisor"
3. Click **[Trigger Graceful Crash]**
4. System shows: `Process exit scheduled`

**Step 3: Observe Recovery**
1. Dashboard becomes unresponsive (service down)
2. Browser may show "Connection refused"
3. After 3–5 seconds, supervisor restarts Apparatus
4. Dashboard comes back online
5. Uptime in sysinfo: "Uptime: 0m 3s" (reset to 3 seconds)

**Step 4: Verify Recovery**
1. Check that all endpoints respond: `curl http://localhost:8090/health`
2. Verify metrics are functioning
3. Check that dashboard is fully responsive

### Impact of Crash

**During Crash (1–5 seconds):**
- All requests fail with connection error
- Dashboard shows "disconnected"
- Metrics stop updating

**After Restart (1–3 seconds):**
- Service recovers
- Dashboard reconnects
- Metrics resume

**Recovery Metrics:**
```
Crash initiated: 14:32:00
Service down: 14:32:01 → 14:32:04 (3 seconds)
Service up: 14:32:04
MTTR (Mean Time To Recovery): 3 seconds
```

### Checkpoint

- [ ] Understand crash testing purpose
- [ ] Know crash doesn't cause permanent damage
- [ ] Can trigger graceful crash
- [ ] Understand recovery time expectations
- [ ] Know this is safe (supervised restart)

---

## Section 6: Chaos Experiment Workflows

### Workflow 1: Simple Resilience Test

**Goal:** Verify system recovers from brief failures.

**Steps:**
```
1. Record baseline metrics (via Overview dashboard)
2. Trigger 5s CPU spike
3. Monitor during spike (watch latency/error)
4. Wait for recovery (5–10 seconds)
5. Verify metrics return to baseline
6. Record findings
```

**Expected Outcome:**
```
✅ Metrics return to baseline
✅ Recovery time < 10 seconds
✅ Error rate spikes < 5%
Conclusion: System resilient to brief CPU stress
```

### Workflow 2: Memory Pressure Test

**Goal:** Find the memory limit before degradation.

**Steps:**
```
1. Baseline: Record memory usage + latency
2. Allocate 256 MB, check latency
3. Allocate 256 MB (total 512 MB), check latency
4. Allocate 256 MB (total 768 MB), check latency
5. Continue until latency increases > 50%
6. Record the "breaking point"
7. Clear all
```

**Expected Outcome:**
```
256 MB:   Latency +0% (no impact)
512 MB:   Latency +0% (no impact)
768 MB:   Latency +2% (minimal impact)
1024 MB:  Latency +15% (notable impact)
1536 MB:  Latency +50% (significant degradation)

Breaking point: ~1200 MB
Recommendation: Set memory alerts at 800 MB
```

### Workflow 3: Combined Stress Test

**Goal:** Test system under multiple stressors.

**Steps (can use Scenario Builder):**
```
1. Allocate 512 MB memory
2. Trigger 10s CPU spike
3. Generate 500 RPS cluster attack (via Testing Lab)
4. Monitor all metrics during combined stress
5. Measure time to recovery
```

**Expected Outcome:**
```
During stress: Latency 800ms+, Error rate 10%+
After stress: Recovery within 30 seconds
Key finding: System handles combined stress well
```

### Workflow 4: Graceful Degradation Test

**Goal:** Verify system degrades gracefully (doesn't crash).

**Steps:**
```
1. Allocate 1024 MB
2. Trigger 15s CPU spike
3. Generate 1000 RPS attack
4. Monitor for crashes
5. Verify service remains responsive (slow but alive)
```

**Expected Outcome:**
```
❌ Server did NOT crash
✅ Service remained responsive
✅ Errors appropriately returned
✅ No cascading failures
Conclusion: Graceful degradation working
```

---

## Section 7: Safety & Best Practices

### ✅ DO: Plan Your Experiments

```
Before triggering chaos:
□ Know your baseline metrics
□ Have a hypothesis (e.g., "system recovers within 10s")
□ Know what you're testing
□ Have a way to measure success
```

### ✅ DO: Start Small

```
First experiment:  5s CPU spike (brief)
Second:           256 MB memory (small)
Third:            Combined (if small tests passed)
```

### ✅ DO: Monitor During Chaos

```
Keep Overview dashboard open
Watch for:
  - Pressure gauge changes
  - Latency spikes
  - Error rate increases
  - Any unexpected behavior
```

### ✅ DO: Document Results

```
Experiment: CPU Spike 5s
Baseline: Latency 50ms, Error 0.5%
During:   Latency 600ms, Error 8%
After:    Latency 65ms, Error 0.6%
Recovery: ~5 seconds
Finding: ✅ System recovered normally
```

### ❌ DON'T: Run Unlimited Chaos

```
❌ WRONG:
Allocate 4096 MB and leave it
CPU spike 120s indefinitely
Multiple overlapping experiments

✅ RIGHT:
One experiment at a time
Clear/release after each
Document and analyze
```

### ❌ DON'T: Ignore Results

```
❌ WRONG:
Trigger chaos, don't watch results
Assume it worked

✅ RIGHT:
Monitor during and after
Check metrics for proper recovery
Investigate anomalies
```

### ❌ DON'T: Skip Baseline

```
❌ WRONG:
Not knowing normal performance
Can't tell if chaos caused impact

✅ RIGHT:
Always record baseline first
Compare during/after to baseline
Measure the delta
```

---

## Section 8: Troubleshooting Chaos

### Issue: CPU Spike Doesn't Seem to Work

```
Triggered but no latency increase?
```

**Solutions:**
1. Check if CPU is already at 100% (from other sources)
2. Wait a few seconds for impact to show
3. Refresh Overview dashboard
4. Check browser console for errors (F12)

### Issue: Memory Allocation Fails

```
Error: "Memory amount exceeds maximum"
```

**Solution:**
- Maximum is 4096 MB
- Reduce your allocation amount
- Example: 3000 MB instead of 5000 MB

### Issue: System Doesn't Recover

```
After chaos ends, metrics still degraded
```

**Diagnosis:**
1. Is pressure gauge still high? (Check Overview)
2. Check if another chaos experiment is running
3. Wait longer (recovery can take 30+ seconds)
4. If still stuck after 5 min, restart Apparatus

<img src="/dashboard/assets/diagrams/diagram-28-chaos-recovery-decision-tree.svg" alt="Recovery decision tree for post-chaos degraded metrics and escalation paths." width="940" style="max-width: 100%; height: auto;" />

### Issue: Dashboard Disconnects During Crash

```
"Cannot reach server" message
```

**This is expected:**
- Crash terminates process briefly
- Dashboard loses connection
- Supervisor restarts Apparatus
- Dashboard auto-reconnects (wait 5–10 seconds)

---

## Summary

You've learned:
- ✅ Chaos engineering principles and safety
- ✅ CPU spike testing and recovery measurement
- ✅ Memory stress testing and allocation
- ✅ Process crash testing and supervised restart
- ✅ Experiment workflows (simple, gradual, combined)
- ✅ Safety best practices
- ✅ Troubleshooting common issues

## Next Steps

- **Automate chaos:** [Tutorial: Scenario Builder](tutorial-scenario-builder.md)
- **Monitor during chaos:** [Tutorial: Overview Dashboard](tutorial-overview-dashboard.md)
- **Measure results:** [Tutorial: Monitoring](tutorial-monitoring.md)
- **Defense validation:** [Tutorial: Defense Rules](tutorial-defense-rules.md)

---

## Quick Reference: Chaos Console Actions

### CPU Spike
```
Duration: 250–120,000 ms (250ms min, 2min max)
Quick: [5s Spike] or [15s Spike]
Custom: Set duration, click trigger
Impact: Latency ↑, RPS ↓, Errors ↑
```

### Memory Spike
```
Amount: 1–4,096 MB (1MB min, 4GB max)
Action: allocate | clear
Allocate: Adds to existing (cumulative)
Clear: Releases ALL memory
Impact: Usually minor unless very large
```

### Process Crash
```
Warning: ⚠️  Triggers graceful shutdown
Recovery: Automatic (supervisor restarts)
Impact: Service down 1–5 seconds
MTTR: Expected ~3 seconds
```

---

**Last Updated:** 2026-02-22

For automated chaos workflows, see [Tutorial: Scenario Builder](tutorial-scenario-builder.md).
