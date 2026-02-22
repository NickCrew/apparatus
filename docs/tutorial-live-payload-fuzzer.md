# Tutorial: Live Payload Fuzzer – Exploratory API & Payload Testing

> Test API endpoints and security defenses with interactive, single-request payload crafting and real-time response analysis.

---

## What You'll Learn

- ✅ Open the Live Payload Fuzzer in the Testing Lab
- ✅ Craft HTTP requests with custom headers, parameters, and body content
- ✅ Execute payloads and interpret defense classifications
- ✅ Diagnose API behavior under edge cases and attack vectors
- ✅ Use preset payloads for XSS, SQLi, command injection, and more
- ✅ Measure response latency and identify defense triggers
- ✅ Export results for security reporting

## Prerequisites

- **Apparatus running** — Server accessible at `http://localhost:8090`
- **Web dashboard open** — Navigate to http://localhost:8090/dashboard
- **Familiarity with HTTP** — Understand request methods (GET, POST, PUT) and headers
- **Basic security testing knowledge** — Awareness of common attack vectors (optional but helpful)

## Time Estimate

~20 minutes (interactive walkthrough + hands-on exercises)

## What You'll Build

By the end, you'll be able to:
1. **Launch exploratory payloads** against running services
2. **Interpret defense classifications** (blocked vs. passed)
3. **Measure attack detection latency** and effectiveness
4. **Diagnose API behavior** without needing a separate HTTP client
5. **Validate WAF/defense rules** are triggering correctly

---

## Section 1: Opening the Live Payload Fuzzer

### What is the Live Payload Fuzzer?

The **Live Payload Fuzzer** is a **web-based HTTP request builder** that lives in the Testing Lab. It allows you to:
- Craft requests with custom methods, paths, headers, query parameters, and body content
- Execute them against a target in real-time
- See classified defense responses (blocked/passed) immediately
- Measure round-trip latency and inspect response telemetry

**Why you'd use it:**
- **API exploration** — Test endpoint behavior before writing production clients
- **Defense validation** — Verify WAF rules trigger on malicious payloads
- **Attack research** — Safely test payloads without needing Postman or curl
- **Incident triage** — Reproduce attack payloads captured in logs

### Try It: Navigate to Testing Lab

1. Open the dashboard: `http://localhost:8090/dashboard`
2. Click **Testing Lab** in the left sidebar (or press Cmd+K and type "Lab")
3. You should see three main sections:
   - **Live Payload Fuzzer** (top) — The request builder
   - **Lab Operations Output** (bottom) — Results from all lab tools
   - **Tool Selection** panels (left) — For k6 scenarios and Nuclei templates

### The Fuzzer Interface

The **Live Payload Fuzzer** form has these fields:

```
┌─ Live Payload Fuzzer ──────────────────────────┐
│                                                 │
│ Target Host: [localhost ↓]   Target Port: [8090]
│                                                 │
│ Method: [GET ↓]   Path: [/health]             │
│                                                 │
│ Headers (JSON):                                 │
│ { "Content-Type": "application/json" }         │
│                                                 │
│ Query Parameters (JSON):                        │
│ { "version": "2" }                             │
│                                                 │
│ Body (JSON or raw text):                        │
│ { "data": "test" }                             │
│                                                 │
│ Timeout (ms): [5000]  [Send] [Reset]          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Checkpoint

- [ ] Testing Lab visible and ready
- [ ] Live Payload Fuzzer form displayed
- [ ] All input fields are empty or have defaults
- [ ] "Send" button is clickable and active

**Troubleshooting:**

**Testing Lab not showing?**
→ Click "Testing Lab" in the console list. If it's not there, try refreshing the dashboard (F5).

**Form fields disabled or greyed out?**
→ Try refreshing the page. Rarely, the component doesn't mount properly on first load.

---

## Section 2: Crafting Your First Request

### Understanding the Input Fields

| Field | Purpose | Example | Notes |
|-------|---------|---------|-------|
| **Target Host** | Server hostname or IP | `localhost`, `10.0.0.1` | Default is localhost |
| **Target Port** | Server port | `8090`, `443` | Default is 8090 (HTTP/1) |
| **Method** | HTTP verb | `GET`, `POST`, `PUT`, `DELETE` | Most common: GET, POST |
| **Path** | URL path | `/health`, `/api/users`, `/admin` | Must start with `/` |
| **Headers** | Request headers as JSON | `{"Authorization": "Bearer token"}` | Optional |
| **Query Parameters** | URL query string as JSON | `{"filter": "active"}` | Becomes `?filter=active` |
| **Body** | Request body (JSON or raw) | `{"name": "test"}` or `raw text` | Only for POST, PUT, PATCH |
| **Timeout** | Max wait time in ms | `5000` (default) | Range: 250–20,000 ms |

### Try It: Test a Healthy Endpoint

**Goal:** Send a simple GET request to the health check endpoint.

**Steps:**

1. Leave defaults for Host (`localhost`) and Port (`8090`)
2. Set **Method** to `GET`
3. Set **Path** to `/health`
4. Leave Headers, Query Parameters, and Body empty
5. Leave Timeout at `5000`
6. **Click "Send"**

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-02-22T15:30:45.123Z",
  "uptime": 3600
}
```

You should see in the **Lab Operations Output** panel:

```
Status: 200 OK
Blocked: false (Passed)
Latency: 12ms
Response Size: 124 bytes
```

### Checkpoint

- [ ] Request sent successfully (no error)
- [ ] Response shows Status 200
- [ ] Defense classification shows "Passed" (not blocked)
- [ ] Latency is under 100ms
- [ ] Response body visible in Lab Output

---

## Section 3: Crafting Attack Payloads

### What are Preset Attack Payloads?

Attack payloads are malicious inputs designed to test security defenses. Common categories include:

| Category | Purpose | Example | Risk |
|----------|---------|---------|------|
| **XSS** | Cross-Site Scripting | `<script>alert('xss')</script>` | Web app injection |
| **SQLi** | SQL Injection | `' OR '1'='1` | Database bypass |
| **Command Injection** | OS command execution | `; rm -rf /` | Remote code execution |
| **Path Traversal** | Directory escape | `../../../etc/passwd` | File access |
| **NoSQL Injection** | NoSQL bypass | `{"$ne": null}` | Data access |

### Try It: Test an XSS Payload

**Goal:** Send a payload that triggers the WAF, then observe the blocked classification.

**Steps:**

1. Set **Method** to `POST`
2. Set **Path** to `/api/feedback`
3. Set **Headers** to: `{"Content-Type": "application/json"}`
4. Set **Body** to:
   ```json
   {"message": "<script>alert('xss')</script>"}
   ```
5. Click "Send"

**Expected Response:**

```
Status: 403 Forbidden
Blocked: true
Latency: 45ms
Response: {"error": "Malicious payload detected"}
```

### Understanding the "Blocked" Classification

When a payload is classified as **Blocked**, it means:
- ✅ The defense middleware (WAF, tarpit, deception) triggered
- ✅ The request was rejected or tarpitted (slowed down)
- ✅ The payload matched a known attack signature

When classified as **Passed**:
- ⚠️ The payload made it through defenses
- ⚠️ This might be a bypass, or the endpoint accepts that input
- ✅ For benign payloads, "Passed" is expected

### Try It: Test a SQLi Payload

**Steps:**

1. Set **Method** to `POST`
2. Set **Path** to `/api/users`
3. Set **Headers** to: `{"Content-Type": "application/json"}`
4. Set **Body** to:
   ```json
   {"id": "1' OR '1'='1"}
   ```
5. Click "Send"

**Observe:**
- Does it get blocked? (Should be, if WAF is active)
- What's the response status?
- How long did it take?

### Checkpoint

- [ ] Successfully sent multiple payloads
- [ ] Understand the difference between "Blocked" and "Passed"
- [ ] Observed latency changes (blocked payloads may be slower due to tarpit)
- [ ] Response bodies visible and readable

**Common Issues:**

**Payload sent but Body is empty in request?**
→ Ensure Headers include `"Content-Type": "application/json"` so the server parses the body.

**Getting Status 500 errors?**
→ The target endpoint might not exist. Try `/api/test` or check available endpoints in the API documentation.

---

## Section 4: Advanced Fuzzing Techniques

### Testing Query Parameters

**Use case:** Bypass URL-based filtering or trigger parameter pollution attacks.

**Steps:**

1. Set **Method** to `GET`
2. Set **Path** to `/api/search`
3. Set **Query Parameters** to:
   ```json
   {"q": "<img src=x onerror=alert('xss')>", "filter": "all"}
   ```
4. Click "Send"

**Result:** The URL becomes:
```
GET /api/search?q=%3Cimg%20src%3Dx%20onerror%3Dalert('xss')%3E&filter=all
```

The query string is automatically URL-encoded. Observe if the WAF detects it.

### Testing Custom Headers

**Use case:** Bypass origin checks, header injection attacks, or test auth bypass.

**Steps:**

1. Set **Method** to `GET`
2. Set **Path** to `/api/admin`
3. Set **Headers** to:
   ```json
   {
     "X-Forwarded-For": "127.0.0.1",
     "X-Admin": "true",
     "Authorization": "Bearer fake-token"
   }
   ```
4. Click "Send"

**What to look for:**
- Does the server accept the forged headers?
- Does it treat `X-Admin` as legitimate?
- Are defense headers like `X-Rate-Limit` applied?

### Testing Large Payloads

**Use case:** Test rate limiting, timeout behavior, or buffer overflow defenses.

**Steps:**

1. Set **Method** to `POST`
2. Set **Path** to `/api/data`
3. Set **Body** to a large JSON object:
   ```json
   {"data": "aaaa...aaaa"}
   ```
   (Create a string of 100,000+ characters)
4. Click "Send"

**What to observe:**
- Does it timeout (default 5 seconds)?
- Does the server reject it?
- Is it tarpitted (slow response)?

### Try It: Timeout Behavior

**Steps:**

1. Set **Timeout** to `500` ms (short)
2. Set **Path** to `/chaos/sleep?ms=2000` (causes server to sleep for 2 seconds)
3. Set **Method** to `GET`
4. Click "Send"

**Expected:**
```
Status: (timeout)
Error: Request aborted after 500ms
Latency: 500ms (or close to it)
```

### Checkpoint

- [ ] Successfully tested query parameters
- [ ] Tested custom headers
- [ ] Tested timeout behavior
- [ ] Understand how payload encoding works

---

## Section 5: Interpreting Results & Reporting

### Reading the Lab Operations Output

After each request, you'll see classified telemetry:

```
┌─ Lab Operations Output ─────────────────┐
│                                         │
│ Live Payload Fuzzer Results:           │
│                                         │
│ Status: 403 Forbidden                  │
│ Blocked: true (Defense triggered)      │
│ Latency: 47ms                          │
│ Response Headers:                      │
│   X-Rate-Limit: 10/min                │
│   Content-Type: application/json      │
│                                         │
│ Response Body Preview (8KB):            │
│ {"error": "Malicious payload..."}      │
│                                         │
│ Full Size: 156 bytes                   │
│                                         │
└─────────────────────────────────────────┘
```

### What Each Field Means

| Field | Interpretation |
|-------|-----------------|
| **Status** | HTTP status code (200, 403, 500, etc.) |
| **Blocked** | `true` = defense middleware triggered; `false` = passed through |
| **Latency** | Round-trip time in milliseconds |
| **Response Headers** | Server's response headers (useful for rate limit info) |
| **Response Body Preview** | First 8KB of response (truncated for large responses) |
| **Full Size** | Total response body size in bytes |

### Interpreting Defense Classifications

**Scenario 1: Blocked = true, Status 403**
```
✅ Expected behavior
→ Your payload triggered the WAF
→ Defense is working correctly
```

**Scenario 2: Blocked = false, Status 200**
```
⚠️ Depends on the payload:
→ If it's a benign request: ✅ Correct
→ If it's an attack: 🚨 Possible bypass
```

**Scenario 3: Latency 2000ms+ (slow response)**
```
ℹ️ Possible causes:
→ Tarpit defense delaying malicious traffic
→ Server-side processing (database query, etc.)
→ Network congestion
```

### Try It: Document Your Findings

Conduct a 5-minute security test and document:

1. **Payload Sent:**
   ```
   Method: POST
   Path: /api/users/create
   Body: {"admin": true}
   ```

2. **Defense Response:**
   ```
   Status: 403
   Blocked: true
   Latency: 52ms
   ```

3. **Interpretation:**
   ```
   ✅ WAF correctly detected privilege escalation attempt
   ✅ Response time acceptable (not tarpitted excessively)
   ✅ Error message doesn't leak internal details
   ```

### Checkpoint

- [ ] You understand the output fields
- [ ] You can distinguish between blocked and passed responses
- [ ] You can interpret latency patterns
- [ ] You can document findings in a structured way

---

## Section 6: Common Workflows

### Workflow 1: Validate WAF Rule Coverage

**Objective:** Test if all major attack vectors are blocked.

**Steps:**

1. **Test XSS:**
   ```
   POST /api/feedback
   Body: {"msg": "<script>alert(1)</script>"}
   ```
   Expected: Blocked

2. **Test SQLi:**
   ```
   GET /api/user?id=1' OR '1'='1
   ```
   Expected: Blocked

3. **Test Command Injection:**
   ```
   POST /api/exec
   Body: {"cmd": "; rm -rf /"}
   ```
   Expected: Blocked

4. **Test Path Traversal:**
   ```
   GET /files?path=../../../etc/passwd
   ```
   Expected: Blocked

**Report:**
```
✅ 4/4 attack vectors blocked
✅ WAF coverage complete
Recommendation: Deploy to production
```

### Workflow 2: Debug API Endpoint Behavior

**Objective:** Understand how an endpoint handles edge cases.

**Steps:**

1. **Test normal request:**
   ```
   GET /api/search?q=test
   Status: 200 ✅
   ```

2. **Test with empty parameter:**
   ```
   GET /api/search?q=
   Status: ??? (document it)
   ```

3. **Test with null:**
   ```
   GET /api/search?q=null
   Status: ??? (document it)
   ```

4. **Test with very long parameter:**
   ```
   GET /api/search?q=aaa...aaa (1000+ chars)
   Status: ??? (document it)
   ```

**Outcome:** You've mapped the endpoint's behavior under various conditions.

### Workflow 3: Measure Defense Performance

**Objective:** Measure latency impact of defense mechanisms.

**Steps:**

1. **Benign request (baseline):**
   ```
   GET /api/users
   Latency: 15ms
   ```

2. **Malicious request (tarpitted):**
   ```
   POST /api/users/create
   Body: {"admin": true}
   Latency: 2500ms
   ```

3. **Analysis:**
   ```
   Tarpit impact: 2500 - 15 = 2485ms delay
   Conclusion: Tarpit is aggressive enough to disrupt attackers
   ```

---

## Section 7: Troubleshooting & Best Practices

### Common Issues

#### Issue: "Connection Refused"

```
Error: Unable to reach target
Status: Connection refused on localhost:8090
```

**Solution:**
1. Verify Apparatus is running: `curl http://localhost:8090/health`
2. If not running: `pnpm dev:server` (or docker-compose up)
3. Try a different port if you changed the config

#### Issue: "Invalid JSON in Body"

```
Error: Body is not valid JSON
```

**Solution:**
1. Ensure your JSON is properly formatted (use a JSON validator: https://jsonlint.com)
2. Match your Body format to your Content-Type header
3. Use raw text if you're sending non-JSON data (XML, form-encoded, etc.)

#### Issue: "Timeout Always Occurring"

```
Latency: 5000ms (matches timeout)
```

**Solution:**
1. The request is taking too long. Either:
   - The endpoint is slow (check server logs)
   - The target is not responding
   - Network congestion
2. Increase timeout if you expect slow endpoints
3. Or: identify slow endpoints and investigate

#### Issue: "Empty Response Body"

```
Response Body Preview: (empty)
Full Size: 0 bytes
```

**Solution:**
1. Some endpoints return no body (normal for 204 No Content, 304 Not Modified)
2. Check the Status code to determine if it's intentional
3. If Status is 200 but body is empty, the endpoint might be broken

### Best Practices

#### ✅ DO: Test One Variable at a Time

```
❌ WRONG:
Change method + path + body at once
→ Can't tell which change caused the result

✅ RIGHT:
Change only the body, keep method/path constant
→ You know exactly what caused the change
```

#### ✅ DO: Document Your Tests

```
Keep a log:
- Date/time of test
- Payload sent
- Response received
- Classification (blocked/passed)
- Interpretation

This helps you track patterns and regressions.
```

#### ✅ DO: Use Comments in JSON for Clarity

```json
{
  // Testing XSS filter
  "message": "<img src=x onerror=alert(1)>",
  // Expected: Blocked by WAF
  "user_id": "123"
}
```

#### ❌ DON'T: Send Real Sensitive Data

```
❌ WRONG:
Password: "MyActualPassword123"
API Key: "sk_live_abc123def456"

✅ RIGHT:
Password: "[REDACTED]"
API Key: "[TEST_KEY]"
```

#### ❌ DON'T: Assume One Test is Enough

```
❌ WRONG:
Test XSS once, assume all XSS is blocked

✅ RIGHT:
Test multiple XSS vectors:
- <script> tags
- Event handlers (onerror, onclick)
- Data URIs
- SVG vectors
```

---

## Summary

You've learned how to:
- ✅ Open and use the Live Payload Fuzzer
- ✅ Craft HTTP requests with custom headers and parameters
- ✅ Send attack payloads and interpret defense responses
- ✅ Measure latency and identify defense mechanisms
- ✅ Document findings in a structured format
- ✅ Conduct security validation workflows

## Next Steps

- **Explore other lab tools:** Try **Testing Lab** → k6 scenarios and Nuclei templates
- **Learn defense rules:** Read [Tutorial: Defense Rules](tutorial-defense-rules.md) to understand what triggers WAF blocks
- **Automate testing:** Create reusable **scenarios** in [Tutorial: Scenarios](tutorial-scenarios.md)
- **Monitor results:** Check **real-time metrics** in [Tutorial: Monitoring](tutorial-monitoring.md)

---

## Exercises (Optional)

### Exercise 1: Test Authentication Bypass
Send requests with forged auth headers and measure response differences.

**Payload:**
```
GET /api/admin
Headers: {"Authorization": "Bearer admin-token-fake"}
```

**Questions:**
1. Does the server accept it?
2. Is the response different from an invalid token?
3. Could this bypass real authentication?

### Exercise 2: Test Rate Limiting
Send rapid requests and observe if they're rate-limited.

**Payload (repeat 10x):**
```
GET /api/check
```

**Questions:**
1. Do responses slow down?
2. Do you get 429 (Too Many Requests)?
3. When does rate limiting kick in?

### Exercise 3: Test Error Handling
Send malformed requests and see what error messages reveal.

**Payloads:**
- POST with invalid JSON body
- GET with invalid query parameter types
- Missing required headers

**Questions:**
1. What errors are revealed?
2. Do error messages leak internal details?
3. Is error handling consistent?

---

**Last Updated:** 2026-02-22

For more on red team automation, see [Tutorial: Autopilot](tutorial-autopilot.md).
For advanced payload techniques, see [Complete Features](features.md) → RED TEAM section.
