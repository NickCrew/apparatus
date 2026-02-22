# Tutorial: Performance Tuning – Optimizing Apparatus for Scale & Load

> Diagnose bottlenecks, optimize resource usage, and scale Apparatus to handle high-throughput security testing scenarios.

---

## What You'll Learn

- ✅ Understand performance metrics and baseline measurement
- ✅ Identify bottlenecks (CPU, memory, network, disk)
- ✅ Optimize middleware stack and route handlers
- ✅ Configure resource limits and OS parameters
- ✅ Scale horizontally (multiple instances)
- ✅ Monitor performance during load
- ✅ Build performance baselines and track regressions

## Prerequisites

- **Apparatus running** — Server accessible at `http://localhost:8090`
- **CLI access** — Comfortable with curl and Node.js tools
- **System administration** — Basic understanding of Linux/macOS commands
- **Performance awareness** — Familiar with latency, throughput, resource metrics

## Time Estimate

~40 minutes (measurement + tuning + validation)

## What You'll Build

By the end, you'll be able to:
1. **Measure Apparatus performance** (baseline)
2. **Identify performance bottlenecks** via profiling
3. **Optimize configuration** for your use case
4. **Scale to handle load** efficiently
5. **Monitor and maintain** performance

---

## Section 1: Performance Baseline

### Key Metrics to Measure

| Metric | Unit | Tool | What It Means |
|--------|------|------|---------------|
| **Throughput (RPS)** | req/sec | k6, Apache Bench | Requests per second the system handles |
| **Latency (p50/p95/p99)** | ms | Monitoring, Prometheus | Response time percentiles |
| **Error Rate** | % | Metrics endpoint | % of requests that fail |
| **Memory Usage** | MB | sysinfo, top | RAM consumed by process |
| **CPU Usage** | % | top, htop | Processor utilization |
| **Event Loop Lag** | ms | Health endpoint | JavaScript event loop delay |

### Try It: Establish Baseline

**Goal:** Measure "normal" performance with no load.

**Step 1: Baseline Measurement**

```bash
# Terminal 1: Start Apparatus
pnpm start

# Terminal 2: Run baseline test
k6 run - <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,        // 10 virtual users
  duration: '60s', // Run for 60 seconds
};

export default function () {
  const res = http.get('http://localhost:8090/echo');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
EOF
```

**Expected Output:**
```
Results:

  ✓ checks.........................: 100% (600/600)
  duration........................: 1m1s
  http_req_blocked................: avg=0.12ms  min=0.03ms  med=0.1ms   max=1.23ms  p(90)=0.14ms  p(95)=0.14ms
  http_req_connecting.............: avg=0.05ms  min=0.01ms  med=0.04ms  max=0.7ms   p(90)=0.05ms  p(95)=0.05ms
  http_req_duration...............: avg=41.24ms min=4.12ms  med=25.32ms max=145.2ms p(90)=89.2ms  p(95)=98.5ms
  http_req_receiving..............: avg=1.2ms   min=0.5ms   med=1.1ms   max=5.2ms   p(90)=1.8ms   p(95)=2.1ms
  http_req_sending................: avg=0.8ms   min=0.2ms   med=0.7ms   max=3.1ms   p(90)=1.2ms   p(95)=1.4ms
  http_req_tls_handshaking........: avg=0ms     min=0ms     med=0ms     max=0ms     p(90)=0ms     p(95)=0ms
  http_req_waiting................: avg=39.24ms min=2.12ms  med=24.32ms max=143.2ms p(90)=87.2ms  p(95)=96.5ms
  http_reqs........................: 600 10/s
  iteration_duration..............: avg=1.04s   min=1.01s   med=1.04s   max=1.15s   p(90)=1.08s   p(95)=1.09s
  iterations.......................: 600 10/s
  vus.............................: 10 min=10 max=10
  vus_max..........................: 10 min=10 max=10
```

**Baseline Metrics:**
```
✅ Throughput: 10 RPS
✅ Latency p50: 25ms
✅ Latency p95: 98ms
✅ Latency p99: 145ms
✅ Error Rate: 0%
```

**Step 2: Record Resource Usage**

```bash
# Terminal 3: Monitor resources
while true; do
  echo "=== $(date) ==="
  curl -s http://localhost:8090/sysinfo | jq '.memory, .cpus, .uptime'
  sleep 5
done
```

**Baseline Resource Usage:**
```
Memory: 285 MB
CPU Cores: 4 available
Avg Load: 0.2 (20% of one core)
```

### Checkpoint

- [ ] Know your baseline throughput (RPS)
- [ ] Know your baseline latency (p50/p95/p99)
- [ ] Know your baseline memory usage
- [ ] Have baseline metrics to compare against

---

## Section 2: Profiling & Bottleneck Detection

### Identifying Bottlenecks

**Use the Pressure Gauge:**

| Pressure | Lag | Bottleneck |
|----------|-----|-----------|
| 🟢 STABLE | <50ms | No bottleneck (handling load well) |
| 🟡 ELEVATED | 50–200ms | Starting to struggle (event loop busy) |
| 🔴 CRITICAL | >200ms | Severe bottleneck (dropping traffic) |

### Try It: Find Your Bottleneck

**Load Test to Failure:**

```bash
k6 run - <<EOF
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // 2 min, ramp to 10 VUs
    { duration: '2m', target: 50 },   // 2 min, ramp to 50 VUs
    { duration: '2m', target: 100 },  // 2 min, ramp to 100 VUs
    { duration: '2m', target: 200 },  // 2 min, ramp to 200 VUs
  ],
};

export default function () {
  http.get('http://localhost:8090/echo');
}
EOF
```

**Monitor alongside:**
```bash
curl -s http://localhost:8090/health/pro | jq '.lag'
```

**Observe:**
```
At 10 VUs:  lag 12ms (🟢 fine)
At 50 VUs:  lag 45ms (🟢 fine)
At 100 VUs: lag 120ms (🟡 elevated)
At 200 VUs: lag 250ms (🔴 critical, requests rejected)

Conclusion: System maxes out around 100 VUs
Breaking point: ~500 RPS
```

### Metric-Based Bottleneck Identification

<img src="/dashboard/assets/diagrams/diagram-29-bottleneck-matrix.svg" alt="Metric-based bottleneck matrix mapping latency, CPU, memory, and error patterns to likely root causes." width="940" style="max-width: 100%; height: auto;" />

```
Bottleneck indicators:

HIGH LATENCY, LOW CPU:
  → Likely: I/O bound (waiting for network, disk)
  → Solution: Optimize database queries, network calls

HIGH LATENCY, HIGH CPU:
  → Likely: CPU bound (calculations, complex operations)
  → Solution: Optimize algorithms, reduce processing

HIGH LATENCY, HIGH MEMORY:
  → Likely: Memory bound (GC pressure, allocations)
  → Solution: Reduce memory allocations, tune GC

INCREASING ERRORS AT HIGH LOAD:
  → Likely: Resource exhaustion (file descriptors, memory)
  → Solution: Increase limits, tune OS parameters
```

---

## Section 3: Optimization Strategies

### Strategy 1: Middleware Optimization

**Current Middleware Stack:**
```
1. MTD                (5–10ms)
2. Self-Healing       (2–5ms)
3. Deception          (1–3ms)
4. Tarpit            (10–50ms if trapped)
5. Metrics           (1–2ms)
6. Compression       (10–50ms if enabled)
7. Logging           (2–5ms)
8. Body Parsing      (5–20ms)
9. Active Shield     (5–10ms)
10. CORS             (1–2ms)
11. Routes           (5–100ms depending on route)
12. Echo             (1–2ms)
```

**Optimization:**
```
For API endpoints (not human browsing):
  - Disable compression (overhead > benefit)
  - Disable logging (or log asynchronously)
  - Use middleware selectively (skip for /health, /metrics)

For high-throughput testing:
  - Disable deception (honeypot checks add latency)
  - Disable tarpit on /echo endpoint
  - Skip body parsing for endpoints that don't need it
```

**Example: Create a "Fast" endpoint:**
```typescript
app.get('/fast-echo', (req, res) => {
  // Skip all middleware, go directly to handler
  res.json({ method: req.method, url: req.url });
});
```

### Strategy 2: Node.js Runtime Tuning

**Increase Buffer Sizes:**
```bash
# Start Apparatus with tuning
node --max-old-space-size=4096 \
     --max-semi-space-size=512 \
     apps/apparatus/dist/index.js
```

**Parameters:**
- `--max-old-space-size=4096` — Heap size (MB), default 2048
- `--max-semi-space-size=512` — Semispaces for young generation

<img src="/dashboard/assets/diagrams/diagram-31-node-memory-management.svg" alt="Node.js memory management flow through young generation, minor GC, old generation, major GC, and event loop lag impact." width="940" style="max-width: 100%; height: auto;" />

**Experiment:**
```
Default (2GB heap):      Max 500 RPS
Tuned (4GB heap):        Max 1000 RPS (2x improvement)
Over-tuned (8GB heap):   No improvement (GC overhead)

Recommended: 1.5x–2x your baseline memory needs
```

### Strategy 3: Connection Pool Optimization

**Reduce Connection Overhead:**
```typescript
const http = require('http');
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 1000,      // More concurrent connections
  maxFreeSockets: 256,
  timeout: 60000,
  freeSocketTimeout: 30000,
});

// Reuse agent for external calls
const res = await fetch(url, { agent });
```

### Strategy 4: Async Optimization

**Use async/await Properly:**
```typescript
// ❌ SLOW: Sequential processing
async function slowHandler(req, res) {
  const a = await query1();  // 100ms
  const b = await query2();  // 100ms
  const c = await query3();  // 100ms
  res.json({ a, b, c });    // 300ms total
}

// ✅ FAST: Parallel processing
async function fastHandler(req, res) {
  const [a, b, c] = await Promise.all([
    query1(),  // 100ms
    query2(),  // 100ms
    query3(),  // 100ms
  ]);         // 100ms total (parallel)
  res.json({ a, b, c });
}
```

---

## Section 4: Operating System Tuning

### Linux Kernel Parameters

```bash
# Increase max file descriptors (connections)
ulimit -n 65535

# Increase socket backlog
sysctl -w net.core.somaxconn=65535

# Increase TCP connection queue
sysctl -w net.ipv4.tcp_max_syn_backlog=65535

# Enable TCP fast open
sysctl -w net.ipv4.tcp_fastopen=3

# Increase memory buffer for sockets
sysctl -w net.core.rmem_max=134217728
sysctl -w net.core.wmem_max=134217728
```

### Docker Tuning

```dockerfile
# In Dockerfile or docker-compose.yml
services:
  apparatus:
    build: .
    # Increase memory
    mem_limit: 4g
    # Increase CPU
    cpus: 2.0
    # Increase file descriptors
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
```

---

## Section 5: Scaling Strategies

### Strategy 1: Vertical Scaling (Bigger Machine)

```
1 Apparatus instance on 2-core laptop:
  Max throughput: 500 RPS

1 Apparatus instance on 8-core server:
  Max throughput: ~2000 RPS

1 Apparatus instance on 16-core server:
  Max throughput: ~4000 RPS

Observation: Linear scaling with cores
```

### Strategy 2: Horizontal Scaling (Multiple Instances)

```
Behind Load Balancer:
  Instance 1: 500 RPS
  Instance 2: 500 RPS
  Instance 3: 500 RPS
  ──────────────────
  Total:      1500 RPS

Add more instances to scale further
```

**Setup:**
```bash
# Start 3 instances on different ports
PORT_HTTP1=8090 pnpm start &
PORT_HTTP1=8091 pnpm start &
PORT_HTTP1=8092 pnpm start &

# Use nginx as load balancer
# Configure upstream servers to 8090, 8091, 8092
```

### Strategy 3: Protocol-Specific Optimization

```
HTTP/1.1 Requests:
  Max: ~500 requests/sec (limited by connection model)
  Optimization: Connection pooling, pipelining

HTTP/2 Requests:
  Max: ~2000 requests/sec (multiplexing over single connection)
  Optimization: Use HTTP/2 client libraries

gRPC Requests:
  Max: ~5000 requests/sec (protobuf efficiency)
  Optimization: Use gRPC-specific clients
```

---

## Section 6: Monitoring & Tracking Performance

### Key Dashboards

**Prometheus Metrics:**
```
http_requests_total{method="GET", status="200"}
http_request_duration_microseconds{route="/echo", p="p95"}
event_loop_lag_milliseconds
memory_usage_bytes
```

**View in Dashboard:**
```
1. Open http://localhost:8090/dashboard
2. Go to Monitoring console
3. Watch metrics in real-time
```

### Performance Regression Testing

**Baseline (Month 1):**
```
- Throughput: 500 RPS
- Latency p95: 95ms
- Memory: 280 MB
```

**Month 2:**
```
- Throughput: 450 RPS (⚠️ 10% regression!)
- Latency p95: 110ms (⚠️ 15% regression!)
- Memory: 320 MB (⚠️ 14% increase!)

Action: Investigate regressions
```

### Creating Performance Benchmarks

```bash
# Save baseline
curl http://localhost:8090/metrics > baseline-metrics.txt

# After changes, compare
curl http://localhost:8090/metrics > new-metrics.txt

diff baseline-metrics.txt new-metrics.txt
```

---

## Section 7: Common Optimization Mistakes

### ❌ MISTAKE 1: Premature Optimization

```
❌ WRONG:
"Let me optimize for 10,000 RPS before testing"
(Spends weeks on optimization, never measures)

✅ RIGHT:
1. Measure baseline
2. Identify actual bottleneck
3. Optimize only that part
4. Re-measure to confirm improvement
```

### ❌ MISTAKE 2: Optimization Without Measurement

```
❌ WRONG:
"I'll increase max-old-space-size to 8GB to be safe"
(Actually makes it slower due to GC overhead)

✅ RIGHT:
1. Measure current memory needs
2. Tune to 1.5x that amount
3. Measure again, verify improvement
```

### ❌ MISTAKE 3: Sacrificing Correctness for Speed

```
❌ WRONG:
"Disable WAF to make it faster"
(Now it's faster but insecure)

✅ RIGHT:
"Optimize WAF to be both fast and secure"
(Cache regex patterns, use async)
```

### ❌ MISTAKE 4: Single Metric Focus

```
❌ WRONG:
"Throughput is 1000 RPS, so we're done"
(But latency is 2000ms, error rate is 10%)

✅ RIGHT:
"Throughput 1000 RPS, latency <100ms, errors <1%"
(Balanced metrics)
```

---

## Section 8: Performance Tuning Checklist

### Pre-Optimization
- [ ] Measure baseline (throughput, latency, resources)
- [ ] Identify bottleneck (CPU, memory, I/O)
- [ ] Set clear optimization goal (target RPS, latency)
- [ ] Create performance tests to validate improvements

### Optimization
- [ ] Optimize identified bottleneck (not random guessing)
- [ ] Change one thing at a time (isolate improvements)
- [ ] Measure after each change (validate improvement)
- [ ] Document what helped and what didn't

### Validation
- [ ] Verify new baseline meets target
- [ ] Check for regressions in other metrics
- [ ] Load test with realistic scenarios
- [ ] Monitor over time for stability

### Maintenance
- [ ] Track performance metrics regularly
- [ ] Alert on regressions (e.g., latency > 200ms)
- [ ] Re-baseline after major code changes
- [ ] Document tuning decisions for future reference

---

## Try It: End-to-End Optimization

**Goal:** Double your system's throughput.

**Step 1: Baseline (5 min)**
```bash
k6 run load-test.js  # 1 VU, 60s
# Result: 500 RPS, 95ms latency
```

**Step 2: Identify Bottleneck (5 min)**
```bash
# Monitor while running load
curl -s http://localhost:8090/health/pro | jq '.lag'
# Result: lag 45ms (🟡 elevated)
# Bottleneck: Event loop busy (CPU-bound)
```

**Step 3: Optimize (10 min)**
```bash
# Disable compression, logging on /echo
# Increase Node heap to 4GB
# Restart Apparatus
```

**Step 4: Re-test (5 min)**
```bash
k6 run load-test.js  # Same test
# Result: 600 RPS, 75ms latency
# ✅ 20% throughput improvement
```

**Step 5: Further Optimization (10 min)**
```bash
# Add /fast-echo endpoint (skip middleware)
k6 run load-test-fast.js
# Result: 1200 RPS on /fast-echo
# ✅ 140% improvement vs. /echo
```

---

## Summary

You've learned:
- ✅ Establishing performance baselines
- ✅ Profiling and identifying bottlenecks
- ✅ Middleware optimization strategies
- ✅ Node.js runtime tuning
- ✅ Operating system optimization
- ✅ Scaling strategies (vertical and horizontal)
- ✅ Performance monitoring and regression testing

## Next Steps

- **Stress test with chaos:** [Tutorial: Chaos Console](tutorial-chaos-console.md)
- **Build load tests:** [Tutorial: Testing Lab](tutorial-testing-lab.md)
- **Automate performance tests:** [Tutorial: Scenario Builder](tutorial-scenario-builder.md)
- **Monitor in real-time:** [Tutorial: Monitoring](tutorial-monitoring.md)

---

## Reference: Optimization Impact

<img src="/dashboard/assets/diagrams/diagram-30-optimization-impact.svg" alt="Optimization impact flow showing stacked throughput gains from middleware, heap, async, and connection tuning." width="940" style="max-width: 100%; height: auto;" />

```
Middleware Optimization:      +20–30% RPS
Node.js Heap Tuning:          +40–50% RPS
Connection Pool Optimization: +10–20% RPS
Async Optimization:           +30–40% RPS
HTTP/2 Protocol:              +300–400% RPS vs. HTTP/1.1
Horizontal Scaling (2 instances): +100% RPS (2x capacity)

Combined optimization can yield 5–10x throughput improvement
```

---

**Last Updated:** 2026-02-22

For production deployments, see [Integration Guide](integration-guide.md).
