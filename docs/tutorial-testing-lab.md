# Tutorial: Testing Lab – Unified Security Testing Hub

> Orchestrate load testing, vulnerability scanning, and egress validation from a single dashboard interface.

---

## What You'll Learn

- ✅ Navigate the Testing Lab unified interface
- ✅ Run k6 load testing scenarios (pre-configured test scripts)
- ✅ Execute Nuclei vulnerability templates (automated security scanning)
- ✅ Validate egress channels with Escape Artist
- ✅ Interpret and compare results across all three tools
- ✅ Build a multi-tool testing workflow
- ✅ Troubleshoot common testing issues

## Prerequisites

- **Apparatus running** — Server accessible at `http://localhost:8090`
- **Web dashboard open** — Navigate to http://localhost:8090/dashboard
- **Basic security knowledge** — Familiarity with load testing, vulnerability scanning, and security concepts
- **Optional:** CLI knowledge for advanced usage (k6 CLI, nuclei CLI)

## Time Estimate

~30 minutes (overview + hands-on with all three tools)

## What You'll Build

By the end, you'll be able to:
1. **Run load tests** against services to measure performance under stress
2. **Execute vulnerability scans** to find known security issues
3. **Validate egress capabilities** to understand data exfiltration paths
4. **Combine results** from all tools for comprehensive security assessment

---

## Section 1: Testing Lab Overview

### What is the Testing Lab?

The **Testing Lab** is a **unified security testing dashboard** that combines three powerful tools:

| Tool | Purpose | Use When |
|------|---------|----------|
| **Live Payload Fuzzer** | Interactive request builder & payload testing | Manual security testing, API exploration |
| **k6 Scenarios** | Automated load testing & performance measurement | Testing scalability, stress testing, load profiles |
| **Nuclei Templates** | Automated vulnerability scanning | Security audits, compliance checks, CVE detection |
| **Escape Artist** | Egress channel validation | Testing data exfiltration, command & control validation |

Think of it as your **security testing command center** — everything happens here in one place.

### The Testing Lab Layout

```
┌─ Testing Lab Dashboard ─────────────────────────────┐
│                                                      │
│ [Live Payload Fuzzer]                              │
│ ┌────────────────────────────────────────────────┐ │
│ │ Request builder, headers, body, send button    │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ [k6 Scenarios]              [Nuclei Templates]     │
│ ┌──────────────────┐       ┌──────────────────┐   │
│ │ Scenario list    │       │ Template list    │   │
│ │ [Run]            │       │ [Run]            │   │
│ └──────────────────┘       └──────────────────┘   │
│                                                      │
│ [Lab Operations Output]                            │
│ ┌────────────────────────────────────────────────┐ │
│ │ Combined results from all tools                 │ │
│ │ (Load test metrics, vulnerability findings,    │ │
│ │  egress validation, payload fuzz results)      │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Try It: Navigate to Testing Lab

1. Open the dashboard: `http://localhost:8090/dashboard`
2. Click **Testing Lab** in the left sidebar (or press Cmd+K and type "Lab")
3. You should see:
   - Live Payload Fuzzer at the top
   - k6 Scenarios section on the left
   - Nuclei Templates section in the middle
   - Lab Operations Output at the bottom

### Checkpoint

- [ ] Testing Lab visible and responsive
- [ ] All three tool sections visible
- [ ] Lab Operations Output panel empty (no results yet)
- [ ] Tool selector dropdowns populated or ready to load

**Troubleshooting:**

**Testing Lab not loading?**
→ Refresh the page (F5). If selectors stay empty, the backend may be initializing the tools.

**Tool lists empty (no k6 scenarios or Nuclei templates)?**
→ Check Apparatus server logs: `curl http://localhost:8090/api/lab/k6/scenarios`
→ If it returns an error, the tools may not be configured. See [Integration Guide](integration-guide.md) for setup.

---

## Section 2: Running k6 Load Tests

### What is k6?

**k6** is a modern load testing tool that simulates user traffic against your application. It measures:
- **Throughput** — requests per second
- **Response time** — latency under load
- **Error rate** — percentage of failed requests
- **Scalability** — how the system behaves as load increases

**Why use it:**
- Performance validation before production
- Stress testing to find breaking points
- Soak testing (long-running tests)
- Load profiling to detect degradation

### Understanding k6 Scenarios

The dashboard comes with **pre-configured k6 scenarios**. Each represents a different load profile:

| Scenario | Profile | Duration | VUs | Use Case |
|----------|---------|----------|-----|----------|
| **Smoke Test** | Light | 1 min | 1 user | Quick sanity check |
| **Load Test** | Moderate | 5 min | 10 users | Normal capacity test |
| **Stress Test** | Heavy | 10 min | 100 users | Find breaking point |
| **Soak Test** | Constant | 30 min | 5 users | Long-running stability |
| **Spike Test** | Sudden spike | 5 min | 100→1000 VUs | Sudden traffic burst |

**VU** = Virtual User (simulated user making requests)

### Try It: Run a Smoke Test (Light Load)

**Goal:** Execute a quick performance baseline test.

**Steps:**

1. In the **k6 Scenarios** section, open the scenario dropdown
2. Select **Smoke Test** (or the first available scenario)
3. Observe the configuration:
   ```
   VUs: 1
   Duration: 60 seconds
   ```
4. Click **Run** (or equivalent execute button)

**What happens:**
- Backend starts the k6 test
- Live output streams to **Lab Operations Output**
- Progress bar shows test duration
- Real-time metrics appear as requests complete

**Expected output (after ~90 seconds):**

```
k6 Test Results:

Requests: 145
  ✅ Passed: 142
  ❌ Failed: 3

Throughput: ~2.4 req/sec
Response Time:
  Average: 45ms
  Median: 38ms
  P95: 120ms
  P99: 250ms

Errors:
- timeout: 2
- 503 Service Unavailable: 1
```

### Interpreting k6 Results

**Key metrics explained:**

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| **Throughput (RPS)** | Stable, predictable | Decreasing over time | Drops to near-zero |
| **Avg Response Time** | <100ms | 100–500ms | >1000ms |
| **P95 Latency** | <200ms | 200–1000ms | >2000ms |
| **P99 Latency** | <500ms | 500–2000ms | >5000ms |
| **Error Rate** | <0.1% | 0.1–1% | >1% |

**Example interpretation:**

```
✅ Good test result:
RPS: 50 (stable)
Avg: 45ms, P95: 120ms, P99: 180ms
Errors: 0

Conclusion: System is healthy, responsive, handles load well
```

```
⚠️ Warning result:
RPS: 25 (decreased from 50)
Avg: 250ms, P95: 1200ms, P99: 3000ms
Errors: 0.5%

Conclusion: System degrading under load, latency increasing
```

```
🚨 Critical result:
RPS: 2 (nearly stopped)
Avg: 5000ms+
Errors: 25%

Conclusion: System at breaking point, needs optimization
```

### Try It: Run a Stress Test (Heavy Load)

**Goal:** Find the system's breaking point.

**Steps:**

1. Select **Stress Test** from the k6 Scenarios dropdown
2. Observe higher configuration:
   ```
   VUs: 100
   Duration: 10 minutes
   ```
3. Click **Run**

**What to look for:**
- At what point does throughput plateau?
- When do errors start appearing?
- How does latency increase with load?
- Does the system recover when load decreases?

### Checkpoint

- [ ] Successfully ran a k6 scenario
- [ ] Observed real-time metrics in Lab Operations Output
- [ ] Understand response time metrics (avg, P95, P99)
- [ ] Can interpret whether test results are "good" or "bad"

**Common Issues:**

**Test hangs or doesn't complete?**
→ k6 test may be running in background. Wait 10+ minutes, then refresh.
→ If output shows no progress, restart the server: `pnpm dev:server`

**Error: "k6 not found"?**
→ k6 may not be installed. This is a backend dependency issue.
→ See [Integration Guide](integration-guide.md) for k6 setup.

---

## Section 3: Running Nuclei Vulnerability Scans

### What is Nuclei?

**Nuclei** is an automated vulnerability scanner that uses templates to detect known security issues. It checks for:
- **CVEs** — Known vulnerabilities (CVE-2021-xyz, CVE-2022-abc)
- **Misconfigurations** — Exposed admin panels, weak protocols
- **Default credentials** — Common default passwords
- **Information disclosure** — Sensitive data in responses
- **Security headers** — Missing security-related HTTP headers

**Why use it:**
- Rapid vulnerability discovery
- Compliance scanning (OWASP Top 10, etc.)
- CI/CD integration for security gates
- Quick security audits before deployment

### Understanding Nuclei Templates

Each **Nuclei template** is a vulnerability check. Templates available include:

| Template Category | Examples | Severity |
|-------------------|----------|----------|
| **HTTP Headers** | Missing HSTS, CSP, X-Frame-Options | Low–High |
| **Default Credentials** | Admin:admin, root:root | Critical |
| **Misconfigurations** | Exposed .git, .env, sensitive endpoints | High |
| **CVEs** | Known vulnerabilities in frameworks | Critical–High |
| **Information Disclosure** | Version banners, debug endpoints | Medium |
| **CMS-specific** | WordPress, Joomla vulnerabilities | Varies |

### Try It: Run a Security Header Scan

**Goal:** Check if the server has basic security headers configured.

**Steps:**

1. In the **Nuclei Templates** section, open the template dropdown
2. Select a template like **"Security Headers"** or **"Info Disclosure"**
   (or use the first available template)
3. Review the template description:
   ```
   Checks for HTTP security headers (HSTS, CSP, X-Frame-Options)
   Severity: Low–High
   ```
4. Click **Run**

**What happens:**
- Backend executes Nuclei with the selected template
- Scans are sent against the target
- Results appear in **Lab Operations Output**
- Findings show severity levels and remediation advice

**Expected output (after ~30–60 seconds):**

```
Nuclei Scan Results:

Scan Target: localhost:8090
Templates Executed: 1

Findings:
[HIGH] Missing HSTS Header
  Path: All endpoints
  Description: HTTP Strict-Transport-Security header not found
  Severity: High
  Remediation: Add "Strict-Transport-Security: max-age=31536000" header

[MEDIUM] Missing X-Frame-Options
  Path: All endpoints
  Description: X-Frame-Options header missing (vulnerable to clickjacking)
  Severity: Medium
  Remediation: Add "X-Frame-Options: DENY" header

Scan Complete: 2 findings
```

### Interpreting Nuclei Results

**Severity levels:**

| Level | Impact | Action |
|-------|--------|--------|
| **Critical** | Immediate exploitation risk | Fix immediately, block in CI/CD |
| **High** | Easy exploitation, significant impact | Fix before production |
| **Medium** | Potential impact, requires effort | Fix before production |
| **Low** | Minor impact, defense-in-depth | Track, fix when possible |
| **Info** | Informational only | Document for compliance |

**Example remediation workflow:**

```
Finding: Missing HSTS Header (High)

1. Review: HSTS forces HTTPS-only connections
2. Impact: Attackers can intercept HTTP traffic
3. Fix: Add header in Express middleware
   app.use((req, res, next) => {
     res.setHeader('Strict-Transport-Security', 'max-age=31536000');
     next();
   });
4. Retest: Run Nuclei scan again
5. Verify: Finding gone ✅
```

### Try It: Run Multiple Templates (Full Scan)

**Goal:** Execute a comprehensive security scan.

**Steps:**

1. Select a template category like **"Full Scan"** or **"All"** if available
2. Or manually select multiple templates:
   - Security Headers
   - Default Credentials
   - Misconfigurations
3. Click **Run**

**What to observe:**
- Which findings appear?
- What are the severity levels?
- How long does the full scan take?
- Are there any unexpected vulnerabilities?

### Checkpoint

- [ ] Successfully ran a Nuclei template
- [ ] Observed findings in Lab Operations Output
- [ ] Understand severity levels (Critical, High, Medium, Low)
- [ ] Can read remediation suggestions
- [ ] Know which findings require immediate action

**Common Issues:**

**Template list empty?**
→ Nuclei may not have templates loaded. Check server logs.
→ See [Integration Guide](integration-guide.md) for Nuclei installation.

**Scan returns "No vulnerabilities found"?**
→ Good news! The system may be secure.
→ But verify by running a known-vulnerable endpoint or template.

**Scan timeout or hangs?**
→ Large scans can take 5+ minutes. Wait longer before refreshing.

---

## Section 4: Validating Egress with Escape Artist

### What is Escape Artist?

**Escape Artist** validates **egress channels** — outbound connections from the application. It tests whether the system can:
- Make HTTP/HTTPS requests to external hosts
- DNS queries to external domains
- TCP/UDP connections to remote ports

**Why validate egress:**
- Detect data exfiltration capabilities
- Find C2 (Command & Control) communication channels
- Identify rogue outbound connections
- Test incident response (e.g., blocking egress during breach)

### Understanding Egress Paths

Egress channels can be used for:

| Channel | Use Case | Risk |
|---------|----------|------|
| **HTTP to external API** | Legitimate integrations | Malware C2 exfiltration |
| **DNS queries** | Domain resolution | DNS tunneling exfiltration |
| **TCP connections** | Custom protocols | Data exfiltration, C2 |
| **TLS/HTTPS** | Encrypted outbound | Hidden command channels |

### Try It: Validate HTTP Egress

**Goal:** Test if the system can make outbound HTTP requests.

**Steps:**

1. In the **Escape Artist** section (if visible), configure:
   ```
   Target Host: example.com
   Target Port: 80
   Protocol: HTTP
   ```
2. Click **Run** or **Validate**

**Expected output:**

```
Escape Artist Egress Validation:

Target: example.com:80 (HTTP)
Status: ✅ Reachable
Response: 200 OK
Latency: 145ms
Data Returned: 2048 bytes
Classification: HTTP egress allowed

Interpretation: System CAN reach external HTTP endpoints
```

**What this means:**
- ✅ Legitimate: Your app can fetch data from external APIs
- 🚨 Risk: Malware could exfiltrate data via HTTP

### Try It: Validate DNS Egress

**Goal:** Test DNS name resolution.

**Steps:**

1. Configure:
   ```
   Target Host: dns.google.com
   Protocol: DNS
   Query: example.com
   ```
2. Click **Run**

**Expected output:**

```
DNS Resolution Test:

Target: dns.google.com (8.8.8.8)
Query: example.com
Status: ✅ Resolved
Result: 93.184.216.34
Latency: 25ms
Classification: DNS egress allowed
```

### Checkpoint

- [ ] Understand egress paths (HTTP, DNS, TCP)
- [ ] Successfully ran an egress validation
- [ ] Know the difference between "good" and "concerning" egress findings
- [ ] Understand egress classification

---

## Section 5: Combining Results into a Security Report

### Multi-Tool Workflow: Comprehensive Security Assessment

**Scenario:** You need to audit a newly deployed API endpoint.

**Workflow:**

#### Step 1: Load Test (k6)
```
Objective: Measure baseline performance
Actions:
  1. Run "Load Test" scenario (10 VUs, 5 min)
  2. Record avg latency: 45ms
  3. Record throughput: 50 RPS
Result: ✅ Performance acceptable
```

#### Step 2: Vulnerability Scan (Nuclei)
```
Objective: Find security issues
Actions:
  1. Run "Security Headers" template
  2. Run "Default Credentials" template
  3. Run "Misconfigurations" template
Findings:
  [HIGH] Missing HSTS Header
  [MEDIUM] Missing X-Frame-Options
Result: ⚠️ 2 findings to remediate
```

#### Step 3: Manual Payload Testing (Live Payload Fuzzer)
```
Objective: Test API-specific attack vectors
Actions:
  1. Test XSS payload: <script>alert(1)</script>
  2. Test SQLi payload: ' OR '1'='1
  3. Test Auth bypass: forged JWT token
Results:
  XSS: ✅ Blocked
  SQLi: ✅ Blocked
  Auth bypass: ❌ Passed (potential issue)
Result: ⚠️ Auth bypass needs investigation
```

#### Step 4: Egress Validation (Escape Artist)
```
Objective: Check for unexpected outbound connections
Actions:
  1. Validate HTTP egress to known IPs
  2. Check DNS resolution
Results:
  HTTP to internal APIs: ✅ OK
  External HTTP: ❌ Blocked (expected)
  DNS: ✅ Normal
Result: ✅ Egress properly restricted
```

### Consolidating Into a Report

**Security Assessment Report:**

```markdown
# API Endpoint Security Audit
Date: 2026-02-22
Endpoint: POST /api/users/create
Assessed by: Security Team

## Executive Summary
✅ Endpoint ready for production with minor remediation required

## Findings by Category

### Performance (k6 Load Test)
✅ PASS - Acceptable performance
- Avg Response: 45ms
- Max RPS: 50
- Error Rate: 0%

### Vulnerabilities (Nuclei)
⚠️ 2 Medium findings
1. Missing HSTS Header [HIGH]
   - Fix: Add security headers middleware
2. Missing X-Frame-Options [MEDIUM]
   - Fix: Configure CORS headers

### Attack Resistance (Live Payload Fuzzer)
✅ 2/3 vectors blocked
- XSS: ✅ Blocked
- SQLi: ✅ Blocked
- Auth Bypass: ⚠️ Needs review

### Egress Control (Escape Artist)
✅ PASS - Proper isolation
- External HTTP: Blocked ✅
- DNS: Normal ✅

## Recommendations
1. Add missing security headers (1 hour)
2. Investigate auth bypass scenario (2 hours)
3. Retest after fixes
4. Deploy to production

## Sign-Off
[ ] Security approved
[ ] Performance approved
[ ] Ready for production
```

### Checkpoint

- [ ] Understand multi-tool workflow
- [ ] Can consolidate results from all four tools
- [ ] Know how to prioritize findings
- [ ] Can create actionable security report

---

## Section 6: Common Testing Scenarios

### Scenario 1: Pre-Production Security Audit

**Objective:** Full security check before deploying to production.

**Workflow:**

1. **Nuclei Full Scan** (30 min)
   - Run comprehensive template set
   - Document all findings
   - Create remediation plan

2. **k6 Stress Test** (15 min)
   - Measure system under peak load
   - Identify bottlenecks
   - Ensure acceptable latency

3. **Live Payload Fuzzer** (15 min)
   - Test critical endpoints
   - Test auth mechanisms
   - Test error handling

4. **Create Report**
   - Consolidate all findings
   - Prioritize by severity
   - Assign remediation tasks

**Timeline:** 1–2 hours total

### Scenario 2: Compliance Validation

**Objective:** Verify compliance with security standards (OWASP, PCI-DSS, etc.).

**Tools:**
- **Nuclei:** Run compliance-specific templates
- **Live Payload Fuzzer:** Verify defense rules work
- **k6:** Ensure performance meets SLAs

**Output:** Compliance report with checklist

### Scenario 3: Post-Incident Validation

**Objective:** Verify defenses work after a security incident.

**Workflow:**

1. **Reproduce attack vector** (Live Payload Fuzzer)
   - Send the exact payload from logs
   - Verify it's now blocked

2. **Scan for vulnerabilities** (Nuclei)
   - Ensure the CVE is patched
   - Check for similar issues

3. **Stress test recovery** (k6)
   - Ensure system recovers from attack load
   - Verify no performance regressions

4. **Validate egress** (Escape Artist)
   - Ensure no exfiltration paths opened

---

## Section 7: Troubleshooting

### Issue: Tool Results Not Appearing

```
Lab Operations Output: (empty)
After clicking Run
```

**Solutions:**
1. Check server logs: `curl http://localhost:8090/api/lab/k6/scenarios`
2. Ensure tools are installed (k6, Nuclei)
3. Try a simpler scenario first
4. Refresh page and retry

### Issue: Timeouts on Long-Running Tests

```
k6 test runs but browser times out after 5 min
```

**Solution:**
- k6 tests can take 10+ minutes
- Keep browser tab open, don't refresh
- Check server logs to see test progress
- Or: use CLI tools directly for long tests

### Issue: "No Scenarios Available"

```
k6 Scenarios dropdown empty
```

**Solution:**
- k6 may not be initialized
- Check if Apparatus is running with k6 integration
- See [Integration Guide](integration-guide.md) for setup

### Issue: Nuclei Templates Not Loading

```
Nuclei Templates list: (empty)
```

**Solution:**
- Nuclei may not be installed
- Check backend: `curl http://localhost:8090/api/lab/nuclei/templates`
- Install Nuclei: See [Integration Guide](integration-guide.md)

---

## Best Practices

### ✅ DO: Test in Layers

```
1. Start with smoke tests (light load, quick scan)
2. Move to stress tests (heavy load)
3. Then manual fuzzing (targeted attacks)
4. Finally, full report generation
```

### ✅ DO: Document Baselines

```
Before deploying to production:
- Record k6 baseline (avg latency, RPS)
- Run Nuclei baseline (known findings)
- After deployment, compare to baseline
```

### ✅ DO: Use Results to Improve Defenses

```
If Nuclei finds a vulnerability:
  1. Remediate the issue
  2. Retest to confirm fix
  3. Add to CI/CD gate to prevent regression
```

### ❌ DON'T: Rely on a Single Tool

```
❌ WRONG:
Run only Nuclei scan, assume all is secure

✅ RIGHT:
Combine all four tools for comprehensive assessment
```

### ❌ DON'T: Ignore Performance Under Load

```
❌ WRONG:
System is secure, so it's ready
(But latency is 5000ms under load)

✅ RIGHT:
Both secure AND performant
```

---

## Summary

You've learned how to:
- ✅ Use k6 for load testing and performance measurement
- ✅ Use Nuclei for automated vulnerability scanning
- ✅ Use Escape Artist for egress validation
- ✅ Use Live Payload Fuzzer for manual security testing
- ✅ Combine results into a comprehensive security report
- ✅ Build multi-tool testing workflows

## Next Steps

- **Deep dive into payloads:** [Tutorial: Live Payload Fuzzer](tutorial-live-payload-fuzzer.md)
- **Learn defense rules:** [Tutorial: Defense Rules](tutorial-defense-rules.md)
- **Create automated scenarios:** [Tutorial: Scenarios](tutorial-scenarios.md)
- **Monitor results in real-time:** [Tutorial: Monitoring](tutorial-monitoring.md)

---

**Last Updated:** 2026-02-22

For integration and setup details, see [Integration Guide](integration-guide.md).
