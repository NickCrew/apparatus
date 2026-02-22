# Tutorial: Advanced Red Team Workflows – Multi-Target Campaigns & Complex Strategies

> Design and execute sophisticated multi-target red team campaigns, combining payloads, chaos, and defense evasion for comprehensive security testing.

---

## What You'll Learn

- ✅ Design multi-target attack campaigns
- ✅ Combine payload testing with chaos engineering
- ✅ Evade defenses (MTD rotation, WAF bypass research)
- ✅ Measure attack effectiveness across multiple vectors
- ✅ Build reusable attack templates
- ✅ Coordinate attacks via scenarios and automation
- ✅ Analyze campaign results and findings

## Prerequisites

- **Apparatus running** — Server accessible at `http://localhost:8090`
- **Dashboard & CLI access** — Comfortable with both interfaces
- **Familiarity with basic tools** — Read [Live Payload Fuzzer](tutorial-live-payload-fuzzer.md) and [Testing Lab](tutorial-testing-lab.md)
- **Understanding of scenarios** — Read [Scenario Builder](tutorial-scenario-builder.md)

## Time Estimate

~40 minutes (planning + design + execution)

## What You'll Build

By the end, you'll be able to:
1. **Plan complex campaigns** with multiple attack vectors
2. **Coordinate attacks** across multiple tools and endpoints
3. **Research defense bypass** techniques
4. **Measure campaign effectiveness** with metrics and incident correlation
5. **Create reusable attack templates** for recurring assessments

---

## Section 1: Campaign Design Fundamentals

### What is a Red Team Campaign?

A **campaign** is a **coordinated series of attacks** designed to:
- Test multiple security layers (network, app, system)
- Measure overall security posture
- Combine attacks for maximum coverage
- Simulate realistic adversary behavior
- Find system-level vulnerabilities (not just single issues)

### Campaign vs. Individual Tests

| Aspect | Individual Test | Campaign |
|--------|-----------------|----------|
| **Scope** | Single endpoint, single vector | Multiple endpoints, multiple vectors |
| **Duration** | Seconds to minutes | Minutes to hours |
| **Tools** | One tool (fuzzer, scanner) | Multiple tools (fuzzer, chaos, scenarios) |
| **Goal** | Find one bug | Comprehensive security assessment |
| **Realism** | Isolated | Simulates real attacker |

### Campaign Structure

<img src="/dashboard/assets/diagrams/diagram-17-campaign-phases.svg" alt="Five-phase attack campaign sequence from reconnaissance through analysis with time estimates." width="940" style="max-width: 100%; height: auto;" />

---

## Section 2: Multi-Vector Attack Campaigns

### Attack Vector Strategy

Prioritize attacks based on impact:

```
CRITICAL vectors (test first):
  1. Authentication bypass (RCE risk)
  2. Injection attacks (SQLi, command injection)
  3. Privilege escalation (admin access)

HIGH vectors (test next):
  1. XSS (session hijacking)
  2. CSRF (unauthorized actions)
  3. Path traversal (file access)

MEDIUM vectors (test after):
  1. Information disclosure
  2. Rate limiting bypass
  3. Deserialization attacks
```

<img src="/dashboard/assets/diagrams/diagram-24-multivector-campaign-flow.svg" alt="Multi-vector campaign flow from reconnaissance through exploitation, persistence, escalation, and analysis." width="940" style="max-width: 100%; height: auto;" />

### Try It: Design a Multi-Vector Campaign

**Campaign: "API Security Assessment"**

**Target:** http://localhost:8090/echo

**Phases:**

#### Phase 1: Reconnaissance (Manual, 2 min)
```
Tools: Live Payload Fuzzer
Actions:
  1. GET /echo → Understand request reflection
  2. POST /echo with various content types
  3. Test with large payloads
  4. Test with special characters

Findings:
  - All input reflected in response
  - No encoding detected
  - Accepts arbitrary content types
```

#### Phase 2: XSS Testing (5 min)
```
Tools: Live Payload Fuzzer
Payloads:
  1. <script>alert('xss')</script>
  2. <img src=x onerror="alert(1)">
  3. "><script>alert(1)</script>
  4. <svg onload=alert(1)>
  5. Data URI: data:text/html,<script>alert(1)</script>

Expected: All blocked by WAF
Success: 0% bypass rate
```

#### Phase 3: SQLi Testing (5 min)
```
Tools: Live Payload Fuzzer
Payloads:
  1. ' OR '1'='1
  2. ' UNION SELECT NULL,NULL
  3. 1; DROP TABLE users--
  4. admin'--
  5. {$gt: null}  (NoSQL)

Expected: All blocked by WAF
Success: 0% bypass rate
```

#### Phase 4: Auth Testing (3 min)
```
Tools: Live Payload Fuzzer
Vectors:
  1. Forged JWT (admin: true)
  2. Empty Authorization header
  3. Bearer invalid-token
  4. X-Admin: true header

Expected: All rejected
Success: 0% bypass rate
```

#### Phase 5: Under Chaos (5 min)
```
Scenario:
  1. Allocate 512 MB memory
  2. Send XSS payloads (50 req/sec, 10s)
  3. Trigger 5s CPU spike
  4. Continue sending payloads
  5. Measure: Any bypass under stress?

Finding: Defense held even under chaos
Conclusion: ✅ Resilient WAF
```

---

## Section 3: Advanced Campaign Patterns

### Pattern 1: Defense Evasion Research

**Goal:** Find how to bypass security mechanisms.

**Methodology:**

```
1. Identify defense: WAF blocking XSS
2. Analyze: What patterns does it block?
   - <script> tags
   - Event handlers (onclick, onerror)
   - javascript: protocol
3. Research bypass vectors:
   - Unicode encoding: \x3c\x73\x63\x72\x69\x70\x74\x3e
   - HTML entities: &lt;script&gt;
   - CSS expressions: expression()
   - SVG vectors: <svg onload>
4. Test each against WAF
5. Document successful bypasses
6. Report to defense team for rule update
```

**Campaign Scenario:**
```
Step 1: Test standard XSS
  Payload: <script>alert(1)</script>
  Result: BLOCKED ✓

Step 2: Test Unicode encoding
  Payload: \x3c\x73\x63\x72\x69\x70\x74\x3e...
  Result: BLOCKED ✓

Step 3: Test HTML entities
  Payload: &lt;script&gt;alert(1)&lt;/script&gt;
  Result: PASSED ❌ (discovered bypass!)

Step 4: Report finding
  Recommendation: Update WAF rule to decode HTML entities
```

### Pattern 2: Multi-Endpoint Coordination

**Goal:** Test if attack can pivot between endpoints.

**Scenario:**
```
1. Compromise endpoint A: /api/endpoint1
   - Use SQLi to extract data
   - Capture session tokens

2. Use token at endpoint B: /api/endpoint2
   - Attempt privilege escalation
   - Test auth bypass

3. Lateral movement to endpoint C: /api/admin
   - Try stolen tokens
   - Attempt direct access

4. Chain attacks together
   Finding: Did attack chain work?
   Conclusion: Lateral movement possible/blocked?
```

### Pattern 3: Stress Testing Defenses

**Goal:** Test if defenses hold under load.

**Campaign:**
```
Phase 1: Baseline attack (normal load)
  - Send 100 XSS payloads
  - Measure: Block rate, latency, errors
  - Result: 100% blocked, 50ms latency

Phase 2: Under CPU stress
  - Trigger 10s CPU spike
  - Send 100 XSS payloads during spike
  - Measure: Block rate, latency, errors
  - Result: 98% blocked (2 bypassed!), 500ms latency

Phase 3: Under memory stress
  - Allocate 1024 MB
  - Send 100 XSS payloads
  - Measure: Block rate, latency, errors
  - Result: 100% blocked, 100ms latency

Finding: Defense slightly weakens under CPU stress
Recommendation: Monitor CPU load during attacks
```

### Pattern 4: Protocol-Level Testing

**Goal:** Test different protocol implementations.

**Campaign:**
```
1. Attack via HTTP/1.1
   Target: http://localhost:8090/echo
   Payload: XSS vectors
   Block rate: 100%

2. Attack via HTTP/2 TLS
   Target: https://localhost:8443/echo
   Payload: Same XSS vectors
   Block rate: 100%

3. Attack via gRPC
   Target: grpc://localhost:50051
   Payload: Serialized XSS
   Block rate: ?

Finding: gRPC endpoint has different handling
Conclusion: Needs separate WAF rules for gRPC
```

---

## Section 4: Building Campaign Automation

### Using Scenario Builder for Campaigns

**Create a Scenario: "Phase 2 - XSS Testing"**

```json
{
  "name": "Phase 2 - Comprehensive XSS Testing",
  "description": "Tests all major XSS vectors against live endpoint",
  "steps": [
    {
      "id": "1",
      "action": "delay",
      "params": { "duration": 2000 },
      "delayAfter": 0
    },
    {
      "id": "2",
      "action": "cluster.attack",
      "params": {
        "target": "http://localhost:8090/echo",
        "rate": 50,
        "duration": 5000,
        "payload": "<script>alert('xss')</script>"
      },
      "delayAfter": 3000
    },
    {
      "id": "3",
      "action": "cluster.attack",
      "params": {
        "target": "http://localhost:8090/echo",
        "rate": 50,
        "duration": 5000,
        "payload": "<img src=x onerror=alert(1)>"
      },
      "delayAfter": 3000
    }
  ]
}
```

### Using REST API for Multi-Campaign Coordination

**Trigger Phase 1 (Reconnaissance):**
```bash
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -H "Content-Type: application/json" \
  -d '{
    "target": "http://localhost:8090",
    "config": {
      "interval": 2000,
      "maxIterations": 20,
      "allowedTools": ["redteam.validate", "echo"]
    }
  }'
```

**Monitor Campaign:**
```bash
curl http://localhost:8090/api/redteam/autopilot/status
```

**Get Campaign Report:**
```bash
curl http://localhost:8090/api/redteam/autopilot/reports | jq .
```

---

## Section 5: Campaign Analysis & Reporting

### Metrics to Collect

| Metric | Why | Example |
|--------|-----|---------|
| **Attack Success Rate** | % of payloads that bypassed defenses | 2% (2/100 bypassed) |
| **Detection Latency** | Time to block after attack | 5–50ms |
| **Defense Hold Time** | How long before defense weakened | Held for 10 min chaos |
| **Recovery Time** | Time to restore after bypass | 30s |
| **Correlation Score** | Likelihood attacks are coordinated | 0.8 (likely coordinated) |

<img src="/dashboard/assets/diagrams/diagram-25-attack-success-rate.svg" alt="Attack success rate calculation flow based on blocked versus bypassed payload outcomes and escalation thresholds." width="940" style="max-width: 100%; height: auto;" />

### Campaign Report Template

```markdown
# Campaign Report: API Security Assessment
Date: 2026-02-22
Duration: 45 minutes
Target: http://localhost:8090/

## Executive Summary
✅ Overall assessment: SECURE
- 99.8% attack success rate (2 bypasses out of 1000)
- All critical vectors blocked
- Defense held under stress
- Recovery mechanisms working

## Phases Executed
1. Reconnaissance: ✅ Complete (12 min)
2. XSS Testing: ✅ Complete (10 min)
3. SQLi Testing: ✅ Complete (8 min)
4. Auth Testing: ✅ Complete (5 min)
5. Chaos Resilience: ✅ Complete (10 min)

## Key Findings
### Critical (Fix immediately)
None detected ✅

### High (Fix soon)
None detected ✅

### Medium (Fix before production)
1. Unicode-encoded XSS bypass (1 case)
   - Payload: \x3c\x73\x63\x72\x69\x70\x74\x3e...
   - Impact: XSS possible if payload reaches frontend
   - Recommendation: Update WAF to decode Unicode

2. HTML entity XSS bypass (1 case)
   - Payload: &lt;script&gt;alert(1)&lt;/script&gt;
   - Impact: XSS possible if rendered in HTML context
   - Recommendation: Update WAF to normalize entities

### Low (Nice to have)
None detected ✅

## Defense Effectiveness
- XSS Defense: 99.9% effective (1/1000 bypass)
- SQLi Defense: 100% effective (0/100 bypass)
- Auth Defense: 100% effective (0/50 bypass)
- Under Chaos: 99.5% effective (held during stress)

## Recommendations
1. [HIGH] Update XSS WAF rules for Unicode/entity encoding
2. [MEDIUM] Add monitoring for attack coordination patterns
3. [LOW] Document defense capabilities for compliance

## Attack Timeline
14:00 - Phase 1 started
14:12 - Phase 2 started (Unicode bypass discovered)
14:22 - Phase 3 started
14:27 - Phase 4 started
14:32 - Phase 5 started (chaos + attacks)
14:45 - Campaign complete

## Conclusion
System demonstrates strong security posture. Address the two medium-severity findings and conduct follow-up assessment.

Sign-off: Security Team
Date: 2026-02-22
```

---

## Section 6: Campaign Patterns & Templates

### Template 1: "Quarterly Security Assessment"

Use for regular compliance checking.

```
Duration: 1 hour
Phases:
  1. Reconnaissance (10 min) - Map attack surface
  2. Injection Testing (15 min) - SQLi, XSS, command injection
  3. Auth Testing (15 min) - Bypass, escalation
  4. Chaos Resilience (15 min) - Defense under stress
  5. Analysis (5 min) - Compile findings

Expected Outcome:
  - Comprehensive security snapshot
  - Reusable for quarterly comparison
  - Tracks improvement/regression
```

### Template 2: "Pre-Production Security Gate"

Use before production deployment.

```
Duration: 30 minutes
Phases:
  1. Endpoint Discovery (5 min)
  2. Critical Vector Testing (15 min)
  3. Chaos Validation (10 min)

Pass Criteria:
  ✅ 100% critical vectors blocked
  ✅ <1% overall bypass rate
  ✅ Defense holds under chaos
  ✅ <500ms latency spike

If any criterion fails: ❌ BLOCK DEPLOYMENT
```

### Template 3: "Post-Incident Recreation"

Use to verify incident remediation.

```
Duration: 20 minutes
Goal: Replay exact attack vector that caused incident

Steps:
  1. Load incident details (date, time, attacker IP, payloads)
  2. Reproduce exact conditions
  3. Verify attack is now blocked
  4. Measure defense response
  5. Confirm fix is effective

Expected: ✅ Attack now blocked
```

---

## Section 7: Advanced Techniques

### Technique 1: Side-Channel Attacks

**Goal:** Exploit timing differences to extract information.

```
Attack: Timing-based SQLi (inference-based)
  1. Test query: ' AND 1=1  → Fast response (true)
  2. Test query: ' AND 1=2  → Fast response (true, different logic)
  3. Measure timing differences
  4. Use timing to determine true/false conditions

Detection: WAF should block similar queries
```

### Technique 2: Polyglot Payloads

**Goal:** Create payloads that work across multiple contexts.

```
Polyglot Payload:
';DROP TABLE users;--
(Works in SQL, JavaScript comments, and more contexts)

Testing:
  1. Test in SQL context: ' → SQL injection
  2. Test in JavaScript context: // → Comment
  3. Test in HTML context: &quot; → Entity

Finding: Payload effectiveness across contexts
```

### Technique 3: Distributed Campaign

**Goal:** Attack from multiple sources simultaneously.

```
Coordination:
  1. Start Autopilot #1 on target
  2. Start Autopilot #2 on same target
  3. Measure defense response
  4. Does defense handle coordinated attacks?
  5. Can it distinguish coordinated vs. accidental?

Finding: Mitigation effectiveness
```

---

## Section 8: Best Practices

### ✅ DO: Plan Before Executing

```
Write down:
□ Campaign goal
□ Phases
□ Expected duration
□ Success criteria
□ Analysis plan
```

### ✅ DO: Measure Baseline First

```
Before campaign:
□ Record system metrics
□ Test one simple payload (verify setup)
□ Establish performance baseline
```

### ✅ DO: Correlate Findings

```
Don't: Look at XSS results alone
Do: Correlate with:
  - Network metrics
  - Defense logs
  - Incident timeline
  - Other vector results
```

### ✅ DO: Document Discoveries

```
For each bypass found:
□ Exact payload
□ Context (HTTP vs. HTTPS, method, endpoint)
□ Defense response (if any)
□ Impact (severity)
□ Remediation recommendation
```

### ❌ DON'T: Run Unplanned Campaigns

```
❌ WRONG:
"Let me try some random payloads..."

✅ RIGHT:
"Today's campaign tests:
 - XSS vectors on /api/users
 - SQLi on /api/search
 - Auth on /api/admin"
```

### ❌ DON'T: Ignore Unexpected Results

```
❌ WRONG:
"One bypass, probably a fluke"

✅ RIGHT:
"One bypass found, investigate:
 - Can reproduce? (yes/no)
 - Under what conditions?
 - Why did defense miss it?
 - Can fix it?"
```

---

## Summary

You've learned:
- ✅ Campaign design and planning
- ✅ Multi-vector attack coordination
- ✅ Advanced campaign patterns
- ✅ Campaign automation with scenarios
- ✅ Analysis and reporting
- ✅ Reusable campaign templates
- ✅ Advanced techniques

## Next Steps

- **Automate campaigns:** [Tutorial: Scenario Builder](tutorial-scenario-builder.md)
- **Monitor campaigns:** [Tutorial: Overview Dashboard](tutorial-overview-dashboard.md)
- **Test payloads:** [Tutorial: Live Payload Fuzzer](tutorial-live-payload-fuzzer.md)
- **Stress under chaos:** [Tutorial: Chaos Console](tutorial-chaos-console.md)

---

**Last Updated:** 2026-02-22

For autonomous campaigns, see [Tutorial: Autopilot](tutorial-autopilot.md).
