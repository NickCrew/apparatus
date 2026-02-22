# Tutorial: Setting Up Defense Rules & WAF

> Configure Active Shield (WAF), tarpit, and rate limiting to protect your applications.

---

## What You'll Learn

- ✅ Create WAF rules to block XSS, SQLi, and other payloads
- ✅ Deploy tarpit defenses to trap attackers in slow connections
- ✅ Configure rate limiting to prevent brute force and DoS
- ✅ Test defenses against attack campaigns
- ✅ Monitor what your defenses are blocking

## Prerequisites

- **Apparatus running** — Server at `http://localhost:8090`
- **curl installed** — For API commands
- **Basic WAF knowledge** — Regex patterns, rule matching (optional but helpful)
- **Target app running** — App to protect (VulnWeb or your own)

## Time Estimate

~15 minutes (setup + testing + verification)

## What You'll Build

By the end, you'll have:
1. **Active WAF rules** blocking common attacks
2. **Tarpit defenses** catching attackers in slow-response traps
3. **Rate limiting** preventing brute force attacks
4. **Dashboard visibility** showing blocked requests
5. **Confidence** that basic protections are in place

---

## Section 1: Understanding Apparatus Defenses

### Three Defense Layers

Apparatus provides three complementary protection mechanisms:

| Defense | How It Works | Best For |
|---------|-------------|----------|
| **Active Shield (WAF)** | Blocks requests matching regex patterns | Payload attacks (XSS, SQLi) |
| **Tarpit** | Holds attackers in slow connections | Reconnaissance, brute force |
| **Rate Limiting** | Limits requests per IP per time window | DoS, API abuse |

### Defense Flow

```
Incoming Request
     ↓
[Rate Limiter] → If exceeded, return 429
     ↓
[WAF (Active Shield)] → If matches block rule, return 403
     ↓
[Tarpit] → If matches trap path, hold connection
     ↓
Application (Protected!)
```

---

## Section 2: Add Your First WAF Rule

### What WAF Does

WAF (Web Application Firewall) examines requests and **blocks** those matching dangerous patterns:
- XSS payloads: `<script>`, `onerror=`, `javascript:`
- SQLi: `UNION SELECT`, `--`, `'OR'1'='1`
- Path traversal: `../`, `..\\`
- Command injection: `; rm -rf`, `| cat`

### Add a Rule (Block XSS)

Let's create a rule that blocks XSS payloads:

```bash
curl -X POST http://localhost:8090/sentinel/rules \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "<script|javascript:|onerror|onload",
    "action": "block",
    "description": "Block basic XSS attempts"
  }'
```

**What happens:**
- Apparatus checks every request body and URL
- If the pattern matches (case-insensitive), the request is blocked
- Client gets HTTP 403 (Forbidden)

**Expected response:**
```json
{
  "ruleId": "rule-1708514500123",
  "status": "active",
  "pattern": "<script|javascript:|onerror|onload",
  "action": "block",
  "description": "Block basic XSS attempts",
  "timestamp": "2026-02-21T10:30:45.123Z"
}
```

**Save your `ruleId`** — you'll use it to update or delete the rule later.

### Test the Rule

Now try to send an XSS payload through:

```bash
curl "http://localhost:8090/search?q=<script>alert('xss')</script>"
```

**Expected:**
```
403 Forbidden
```

**Without the rule**, you'd get a 200 response. Now you're protected!

### Checkpoint

- [ ] WAF rule created successfully (got back `ruleId`)
- [ ] Test curl returned HTTP 403 (forbidden)
- [ ] Rule is marked as `"status": "active"`

---

## Section 3: Add More WAF Rules

### Rule 2: Block SQLi Attempts

```bash
curl -X POST http://localhost:8090/sentinel/rules \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "UNION.*SELECT|--.*|'\''.*OR.*'\'='\'",
    "action": "block",
    "description": "Block SQL injection attempts"
  }'
```

### Rule 3: Block Path Traversal

```bash
curl -X POST http://localhost:8090/sentinel/rules \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "\\.\\./|\\.\\./\\./",
    "action": "block",
    "description": "Block directory traversal attempts"
  }'
```

### Rule 4: Block Command Injection

```bash
curl -X POST http://localhost:8090/sentinel/rules \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": ";.*rm|;.*cat|\\|.*cat",
    "action": "block",
    "description": "Block command injection attempts"
  }'
```

### Rule 5: Restrict Admin Access

If your app has an admin panel, lock it down:

```bash
curl -X POST http://localhost:8090/sentinel/rules \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "/admin|/dashboard|/config",
    "action": "block",
    "description": "Block unauthorized admin access"
  }'
```

**Note:** If your admin panel is at `http://localhost:3000/admin-panel`, adjust the pattern.

### View All Active Rules

```bash
curl http://localhost:8090/sentinel/rules
```

**Expected output:**
```json
{
  "ruleCount": 5,
  "rules": [
    {
      "ruleId": "rule-1708514500123",
      "pattern": "<script|javascript:|onerror|onload",
      "action": "block",
      "description": "Block basic XSS attempts",
      "created": "2026-02-21T10:30:45.123Z",
      "status": "active"
    },
    ...
  ]
}
```

### Checkpoint

- [ ] Created at least 3 WAF rules
- [ ] Rules list shows all created rules
- [ ] Each rule has `"status": "active"`

---

## Section 4: Set Up Tarpit Defense

### What Tarpit Does

Tarpit is a **honeypot that traps attackers**. When they access suspicious paths, they get stuck in a slow connection that consumes their time.

**How it works:**
1. Attacker requests `/.env` or `/.git`
2. Apparatus accepts the connection
3. Sends 1 byte every 10 seconds indefinitely
4. Attacker waits thinking the request might finish
5. Actually, they're trapped and their time is wasted

### Enable Tarpit (It's On By Default)

Tarpit is enabled by default and monitors these paths:
- `/.env` — Fake environment file
- `/.git` — Git repository
- `/wp-admin` — WordPress admin
- `/admin.php` — Admin login

To verify tarpit is working, try accessing a trap path:

```bash
timeout 5 curl http://localhost:8090/.env
```

**Expected:** The curl command times out after 5 seconds (trapped by tarpit).

**Without timeout**, it would hang indefinitely.

### View Trapped IPs

See which IPs are currently trapped:

```bash
curl http://localhost:8090/api/tarpit/trapped
```

**Sample output:**
```json
{
  "trapped": [
    {
      "ip": "192.168.1.100",
      "trapPath": "/.env",
      "timeTrapped": 45000,
      "trappedAt": "2026-02-21T10:30:45.123Z"
    }
  ],
  "count": 1
}
```

### Release a Trapped IP

If you accidentally trap yourself:

```bash
curl -X POST http://localhost:8090/api/tarpit/release \
  -H "Content-Type: application/json" \
  -d '{"ip": "192.168.1.100"}'
```

### Release All Trapped IPs

```bash
curl -X POST http://localhost:8090/api/tarpit/release-all
```

### Checkpoint

- [ ] Tarpit is responding (trap path hung for 5 seconds)
- [ ] Trapped IPs endpoint returns JSON (even if list is empty)
- [ ] Release command succeeds if you were trapped

---

## Section 5: Configure Rate Limiting

### What Rate Limiting Does

Rate limiting **prevents brute force and DoS attacks** by limiting requests per IP:
- Too many requests from one IP → Returns HTTP 429 (Too Many Requests)
- Prevents credential stuffing, API abuse, resource exhaustion

### Enable Rate Limiting

Send a command to activate rate limiting:

```bash
curl -X POST http://localhost:8090/api/defense/rate-limit/enable \
  -H "Content-Type: application/json" \
  -d '{
    "requestsPerWindow": 100,
    "windowMs": 60000,
    "description": "Max 100 requests per IP per minute"
  }'
```

**Parameters:**
- `requestsPerWindow`: 100 — Allow 100 requests
- `windowMs`: 60000 — Per 60 seconds (1 minute)
- `description`: Label for the rule

**Expected response:**
```json
{
  "status": "enabled",
  "requestsPerWindow": 100,
  "windowMs": 60000,
  "message": "Rate limiting active"
}
```

### Test Rate Limiting

Send 150 requests rapidly to exceed the 100 limit:

```bash
for i in {1..150}; do
  curl http://localhost:8090/health -s -o /dev/null -w "%{http_code}\n"
done | sort | uniq -c
```

**Expected output:**
```
    100 200
     50 429
```

The first 100 requests return 200 (OK), the next 50 return 429 (Too Many Requests).

### View Rate Limit Status

```bash
curl http://localhost:8090/api/defense/rate-limit/status
```

**Sample output:**
```json
{
  "enabled": true,
  "requestsPerWindow": 100,
  "windowMs": 60000,
  "currentWindow": {
    "192.168.1.1": 145,
    "192.168.1.2": 32
  }
}
```

Shows request counts per IP in the current window.

### Checkpoint

- [ ] Rate limiting enabled with custom parameters
- [ ] Rate limit test shows 429 responses after limit exceeded
- [ ] Status endpoint returns enabled state

---

## Section 6: Test Defenses Against Autopilot

### Launch Autopilot With Minimal Tools

Now let's see if your defenses work by running autopilot against the protected app:

```bash
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -H "Content-Type: application/json" \
  -d '{
    "target": "http://localhost:8090",
    "config": {
      "interval": 2000,
      "maxIterations": 10,
      "allowedTools": [
        "redteam.xss",
        "redteam.sqli",
        "redteam.pathTraversal"
      ]
    }
  }'
```

**Note:** We're attacking `http://localhost:8090` (Apparatus itself) to test the defenses. In real scenarios, this would be your application.

### Monitor Defense Blocks

Open the dashboard and navigate to:
**Sentine (WAF) Console** → See requests blocked by your rules

You should see:
- 🛑 **Blocked**: Requests matching WAF rules
- ✅ **Allowed**: Requests that passed WAF
- ⏱️ **Tarpit**: Requests trapped by honeypot paths
- ⏭️ **Rate Limited**: Requests exceeding rate limit

### Check Defense Report

After autopilot finishes, get the report:

```bash
curl http://localhost:8090/api/redteam/autopilot/reports | jq '.vulnerabilities'
```

**Expected (with good defenses):**
```json
{
  "vulnerabilities": [],
  "message": "No vulnerabilities found - defenses are working!"
}
```

If autopilot found vulnerabilities despite your defenses, you may need to:
1. Add more specific WAF rules
2. Review the attack details to understand what bypassed defenses
3. Adjust rate limits if needed

### Checkpoint

- [ ] Autopilot campaign ran against your protected app
- [ ] Dashboard shows some requests blocked by WAF
- [ ] Report shows fewer (or zero) vulnerabilities

---

## Section 7: Advanced Rule Tuning

### More Sophisticated XSS Rule

The basic rule may miss obfuscated XSS. Add a comprehensive rule:

```bash
curl -X POST http://localhost:8090/sentinel/rules \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "<[^>]*(script|iframe|onload|onerror|onclick)[^>]*>|javascript:|data:text/html",
    "action": "block",
    "description": "Comprehensive XSS protection"
  }'
```

### Specific Endpoint Protection

Protect a specific endpoint (e.g., login) more strictly:

```bash
curl -X POST http://localhost:8090/sentinel/rules \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "/login.*(<|'\'|--|UNION)",
    "action": "block",
    "description": "Strict protection on /login endpoint"
  }'
```

### Logging Instead of Blocking

For rules you want to monitor but not block yet:

```bash
curl -X POST http://localhost:8090/sentinel/rules \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "eval\\(|exec\\(",
    "action": "log",
    "description": "Log suspicious eval/exec calls"
  }'
```

**Action: `"log"`** → Requests pass through but are logged for analysis.

### Delete a Rule

If a rule is too strict and causes false positives:

```bash
curl -X DELETE http://localhost:8090/sentinel/rules/rule-1708514500123
```

(Replace the ID with the actual `ruleId`)

---

## Section 8: Troubleshooting

### Legitimate Requests Getting Blocked

**Symptom:** Your real users can't access certain features.

**Cause:** WAF rule is too broad and matches legitimate input.

**Solution:**
1. Check the blocked request in the dashboard
2. Identify the pattern that matched
3. Make the rule more specific:
   ```bash
   # Instead of:
   "pattern": "select"

   # Use:
   "pattern": "SELECT.*FROM|SELECT.*WHERE"
   ```

4. Test thoroughly before deploying to production

---

### Autopilot Still Finding Vulnerabilities

**Symptom:** After adding rules, autopilot still reports vulnerabilities.

**Causes:**
- Rule doesn't match the actual attack payload (regex needs tuning)
- Autopilot is using a tool not covered by your rules (e.g., chaos attacks bypass WAF)
- Rule is active but app endpoint doesn't go through WAF

**Solution:**
```bash
# Check active rules
curl http://localhost:8090/sentinel/rules

# Check what autopilot attacked
curl http://localhost:8090/api/redteam/autopilot/reports | jq '.findingsByTool'

# Identify which tool bypassed defenses, add rules for that
```

---

### Rate Limiting Too Strict

**Symptom:** Legitimate traffic is getting 429 errors.

**Cause:** `requestsPerWindow` is too low.

**Solution:**

Adjust the limit higher:
```bash
curl -X POST http://localhost:8090/api/defense/rate-limit/enable \
  -H "Content-Type: application/json" \
  -d '{
    "requestsPerWindow": 1000,
    "windowMs": 60000,
    "description": "Relaxed rate limit: 1000 req/min"
  }'
```

---

### Tarpit Not Catching Attackers

**Symptom:** Attackers aren't getting trapped.

**Cause:** They're not accessing trap paths. The trap paths are:
- `/.env`, `/.git`, `/wp-admin`, `/admin.php`

**Solution:**
These paths should only be accessed by attackers. If legitimate users access them, consider:
1. Moving your admin to a different path
2. Using HTTP authentication on admin paths (outside of Apparatus)
3. Accepting that honeypot hits are attacks

---

## Section 9: Next Steps

### 1. Review OWASP Top 10

Apparatus WAF rules can protect against OWASP Top 10 vulnerabilities. Create rules for:
- A01: Broken Access Control
- A03: Injection
- A07: Cross-Site Scripting

→ See [OWASP Top 10 Protection](guide-owasp-top-10.md)

### 2. Monitor Blocks in Production

Export blocked requests to your SIEM:
```bash
curl http://localhost:8090/api/defense/logs?format=siem
```

→ See [Monitoring & Observability](guide-monitoring.md)

### 3. Automate Rule Updates

Use a CI/CD pipeline to deploy WAF rules across environments:
→ See [CI/CD Integration](guide-ci-cd.md)

### 4. Run Comprehensive Scenarios

Build attack scenarios that test defense evasion:
→ See [Building Attack Scenarios](tutorial-scenarios.md)

---

## Glossary

| Term | Definition |
|------|-----------|
| **WAF (Web Application Firewall)** | Active Shield — blocks requests matching patterns |
| **Rule** | Pattern + action pair; blocks or logs matching requests |
| **Tarpit** | Honeypot defense that traps attackers in slow connections |
| **Rate Limiting** | Restricts requests per IP per time window |
| **Block** | Reject request with HTTP 403 |
| **Log** | Accept request but record it for analysis |
| **Pattern** | Regex used to match dangerous request content |
| **Trap Path** | Special path that activates tarpit (e.g., `/.env`) |

---

## Summary

You've learned how to:
- ✅ Create WAF rules blocking XSS, SQLi, path traversal, command injection
- ✅ Deploy and test tarpit defenses against reconnaissance
- ✅ Configure rate limiting for brute force prevention
- ✅ Validate defenses by running automated attacks
- ✅ Troubleshoot false positives and tuning issues

---

**Made with ❤️ for security defenders and DevSecOps teams**
