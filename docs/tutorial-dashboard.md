# Tutorial: Web Dashboard User Guide – Navigating Apparatus

> Master the Apparatus control center and monitor security testing in real-time.

---

## What You'll Learn

- ✅ Navigate the dashboard layout and open any console
- ✅ Use the command palette (Cmd/Ctrl+K) to access features instantly
- ✅ Monitor attacks in real-time via the Autopilot console
- ✅ Configure and deploy WAF rules via the Defense console
- ✅ Filter, analyze, and export traffic data
- ✅ Understand the 10+ available consoles and when to use each one
- ✅ Customize dashboard settings and preferences
- ✅ Troubleshoot common dashboard issues

## Prerequisites

- **Apparatus running** — Server accessible at `http://localhost:8090`
- **Web browser** — Chrome, Firefox, Safari, or Edge (latest version)
- **Basic familiarity** — Understanding of security testing concepts (optional but helpful)
- **Keyboard** — To use shortcuts (Cmd on Mac, Ctrl on Windows/Linux)

## Time Estimate

~25 minutes (full walkthrough + exploring consoles)

## What You'll Experience

By the end, you'll be able to:
1. **Open the dashboard** and understand its layout
2. **Quickly navigate** using keyboard shortcuts
3. **Launch attacks** and monitor them in real-time
4. **Deploy defenses** and see blocks happen live
5. **Export findings** for reporting and analysis

---

## Section 1: Dashboard Overview

### What is the Dashboard?

The **Apparatus Dashboard** is a **real-time control center** for security testing. It shows:
- 🎯 **Live attack campaigns** (Autopilot running against targets)
- 🛡️ **Defense mechanisms** (WAF rules, rate limiting, honeypots)
- 📊 **Traffic analysis** (requests, response times, errors)
- 🪝 **Webhooks** (captured and replayed)
- ⚙️ **Chaos experiments** (CPU/memory/network faults)
- 🎬 **Scenarios** (multi-step attack sequences)
- 🗺️ **Cluster monitoring** (distributed node status)
- 🎭 **Deception events** (honeypot interactions)

Think of it as **your war room dashboard** — everything happens here in real-time.

### The Layout

<img src="/dashboard/assets/diagrams/diagram-8-dashboard-layout.svg" alt="Dashboard layout showing header, sidebar navigation, and main console workspace." width="680" style="max-width: 100%; height: auto;" />

### Try It: Open the Dashboard

Open your browser and navigate to:
```
http://localhost:8090/dashboard
```

**What you should see:**
- Dashboard loads within 3-5 seconds
- Left sidebar shows list of consoles
- Main area shows the "Overview" console by default
- Top header shows system health status (green = healthy)
- Background has subtle grid pattern and scanline effect (CRT aesthetic)

### Checkpoint

- [ ] Dashboard opened in browser (no errors)
- [ ] Sidebar visible with list of consoles
- [ ] Header shows system status
- [ ] Overview console displayed in main area

**Troubleshooting:**

**Blank page or spinning loader?**
→ Apparatus server not responding. Check: `curl http://localhost:8090/health`

**Dashboard shows but looks broken (misaligned text)?**
→ Browser didn't load CSS properly. Press F5 (refresh) and wait 5 seconds.

---

## Section 2: Keyboard Shortcuts & Command Palette

### The Power of Keyboard Navigation

The dashboard is **optimized for keyboard power users**. You can do almost everything without clicking.

### Master Shortcut: Command Palette (Cmd+K)

The **command palette** is your fastest way to navigate:

**Try it now:**
1. Press **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux)
2. A search box appears at the top of the screen
3. Type any word (e.g., "autopilot", "traffic", "defense")
4. Results appear below
5. Press **Enter** to select

**Examples:**

| What you want | Type this | Result |
|---------------|-----------|--------|
| Open Autopilot console | `autopilot` | Jumps to Autopilot |
| Search help docs | `/help chaos` | Shows chaos-related docs |
| Toggle theme | `theme` | Switches light/dark mode |
| Open settings | `settings` | Navigates to settings |
| View help | `?` | Shows all available commands |

### Essential Shortcuts

| Shortcut | Action |
|----------|--------|
| **Cmd+K** / **Ctrl+K** | Open command palette |
| **Cmd+?** / **Ctrl+?** | Show help & all shortcuts |
| **Esc** | Close command palette or modal |
| **↑↓** | Navigate search results (in palette) |
| **Enter** | Select highlighted item |
| **Cmd+T** / **Ctrl+T** | Toggle light/dark theme |
| **Cmd+S** / **Ctrl+S** | Open settings |

### Exercise: Master the Command Palette

**Part 1: Navigation**
1. Press Cmd+K (open palette)
2. Type "traffic"
3. Press Enter (jump to Traffic console)
4. You should now see traffic monitoring in main area

**Part 2: Help Search**
1. Press Cmd+K
2. Type "/help autopilot"
3. Results show documentation for autopilot
4. Click a result to open in doc viewer

**Part 3: Theme Toggle**
1. Press Cmd+T to switch theme (light ↔ dark)
2. Notice colors change, but layout stays same

### Checkpoint

- [ ] Successfully opened command palette (Cmd+K)
- [ ] Navigated to Traffic console using palette
- [ ] Toggled theme with Cmd+T
- [ ] Found a help document about autopilot

---

## Section 3: Navigating Consoles

### What Are Consoles?

Each **console** is a dedicated workspace for a specific feature:
- **Autopilot Console** → Launch and monitor attack campaigns
- **Defense Console** → Configure WAF rules and defenses
- **Traffic Console** → Real-time request monitoring
- **Webhooks Console** → Capture and replay webhooks
- **Chaos Console** → Trigger CPU/memory/network faults
- **Scenarios Console** → Build and run multi-step sequences
- **Cluster Console** → Monitor distributed nodes
- **Deception Console** → View honeypot interactions
- **Network Console** → DNS/TCP/connectivity testing
- **Settings Console** → Configure preferences
- **Overview** → Dashboard summary and status

### Opening Consoles

**Method 1: Click in Sidebar**
1. Look at the left sidebar
2. Find the console name (e.g., "Autopilot")
3. Click it
4. Main area switches to that console

**Method 2: Command Palette (Faster!)**
1. Press Cmd+K
2. Type console name (e.g., "autopilot")
3. Press Enter
4. Instantly jumps to that console

**Method 3: Direct URL**
Each console has a direct URL:
```
http://localhost:8090/dashboard/autopilot
http://localhost:8090/dashboard/defense
http://localhost:8090/dashboard/traffic
```

### Try It: Open Multiple Consoles

**Navigate between consoles:**
1. Open Autopilot (click sidebar or Cmd+K → autopilot)
2. Wait 2 seconds, notice it loads
3. Open Traffic (Cmd+K → traffic)
4. Back to Autopilot (Cmd+K → autopilot)

Notice how **console state is preserved** — when you return to Autopilot, your previous filters are still there.

### Console Parts (Standard Layout)

Every console has these elements:

<img src="/dashboard/assets/diagrams/diagram-18-console-panel-structure.svg" alt="Standard console panel structure showing header, controls, filters, data area, and export section." width="940" style="max-width: 100%; height: auto;" />

### Checkpoint

- [ ] Opened at least 3 different consoles
- [ ] Used both click (sidebar) and keyboard (Cmd+K) methods
- [ ] Noticed console state preserved when switching back
- [ ] Identified the main sections of a console

---

## Section 4: Deep Dive – Autopilot Console

### What Autopilot Does (Quick Recap)

AI red team agent that autonomously attacks your target application.

### Autopilot Console Walkthrough

**Location:** Sidebar → "Autopilot" or Cmd+K → "autopilot"

**What you see:**

<img src="/dashboard/assets/diagrams/diagram-45-autopilot-console-layout.svg" alt="Autopilot console layout with campaign status, controls, attack history, findings, and export/report actions." width="940" style="max-width: 100%; height: auto;" />

### Key Controls

| Control | What it does |
|---------|------------|
| **START** | Launch new attack campaign (opens config dialog) |
| **STOP** | Halt running campaign (preserves current findings) |
| **CLEAR** | Erase all events and findings (careful!) |
| **EXPORT** | Download findings as JSON |

### Exercise: Monitor an Attack

**If you have a campaign running:**
1. Open Autopilot console
2. Watch the "Attack History" section — new attacks appear in real-time
3. Filter by "Vulnerable" to see only successful attacks
4. Click on a finding to see details
5. Click "View Report" to see the full analysis

**If no campaign is running:**
1. Open Autopilot console
2. Click **[START]** button
3. Configure target (use a test target or VulnWeb)
4. Click "Launch Campaign"
5. Watch attacks execute in real-time

### Advanced: Real-Time Filtering

**Filter by status:**
- `All` — Show every attack attempt
- `Vulnerable` — Only successful attacks (security issues found)
- `Blocked` — Only requests your defenses rejected
- `Timeout` — Requests that took too long

**Search events:**
- Type in the search box to find specific attacks
- Example: search "xss" shows only XSS-related events

### Checkpoint

- [ ] Opened Autopilot console
- [ ] Understood the layout (status, controls, findings)
- [ ] Viewed at least one attack event
- [ ] Used filters to view specific attack types

---

## Section 5: Deep Dive – Defense Console

### What Defense Does

Configure WAF rules, rate limiting, tarpit, and other defenses.

### Defense Console Walkthrough

**Location:** Sidebar → "Defense" or Cmd+K → "defense"

**What you see:**

<img src="/dashboard/assets/diagrams/diagram-46-defense-console-layout.svg" alt="Defense console layout showing rule controls, active rule list, defense statistics, and supporting panels." width="940" style="max-width: 100%; height: auto;" />

Also visible in this console:
- **Tarpit Status** — IPs currently trapped
- **Rate Limit Stats** — Requests per IP
- **Recent Blocks** — Last 20 blocked requests

### Key Controls

| Control | What it does |
|---------|------------|
| **+ ADD RULE** | Create new WAF rule (pattern + action) |
| **ENABLE/DISABLE** | Toggle all defenses on/off |
| **Edit** | Modify existing rule |
| **Delete** | Remove a rule |
| **View Blocks** | Show all requests blocked by this rule |

### Exercise: Create a Rule

**Part 1: Add a Rule**
1. Click **[+ ADD RULE]** button
2. Enter pattern: `eval\(|exec\(` (catch eval/exec calls)
3. Select action: **Block**
4. Enter description: "Block dangerous eval/exec"
5. Click **[Create Rule]**

**Part 2: Test It**
1. In another terminal, try to trigger the rule:
   ```bash
   curl "http://localhost:8090/test?code=eval(dangerous)"
   ```
2. Return to Defense console
3. Notice in "Recent Blocks" — your request appears with status **BLOCKED**

**Part 3: Delete the Rule**
1. Find your new rule in the list
2. Click **[Delete]**
3. Rule is removed

### Checkpoint

- [ ] Opened Defense console
- [ ] Viewed active WAF rules
- [ ] Created and tested a new rule
- [ ] Deleted the test rule
- [ ] Saw blocked requests in the statistics

---

## Section 6: Deep Dive – Traffic Console

### What Traffic Shows

Real-time HTTP requests and responses flowing through Apparatus.

### Traffic Console Walkthrough

**Location:** Sidebar → "Traffic" or Cmd+K → "traffic"

**What you see:**

<img src="/dashboard/assets/diagrams/diagram-47-traffic-console-layout.svg" alt="Traffic console layout showing controls, traffic stats, filters, request feed, and row actions." width="940" style="max-width: 100%; height: auto;" />

Each row shows:
- **Timestamp** — When request arrived
- **Method + Path** — GET /api/users
- **Status Code** — 200 (success), 403 (forbidden), 500 (error)
- **Latency** — How long request took

### Filter Traffic

**By Status Code:**
- `All` — Show everything
- `2xx` — Successful requests (200, 201, etc.)
- `4xx` — Client errors (403 blocked, 404 not found)
- `5xx` — Server errors (500, 503)

**By Search:**
Type in the search box:
- `/admin` — Find all admin requests
- `POST` — Find only POST requests
- `timeout` — Find requests that timed out

### Exercise: Monitor Traffic

**Part 1: Observe Real Traffic**
1. Open Traffic console
2. Launch an autopilot campaign (if not already running)
3. Watch requests appear in the feed — new ones at the top
4. Notice status codes change color (green=2xx, red=4xx/5xx)

**Part 2: Filter by Status**
1. Click **[4xx]** filter
2. Feed shows only blocked/error requests
3. You should see requests blocked by your WAF rules
4. Click **[All]** to show everything again

**Part 3: Search for Specific Requests**
1. Type `/search` in search box
2. Feed filters to show only requests to /search endpoint
3. Clear search box to reset

### Advanced: Replay Requests

Some consoles let you **replay** requests:
1. Click a request row
2. Click **[Replay]** button
3. Request is sent again to the target
4. Watch the result appear at the top of the feed

### Checkpoint

- [ ] Opened Traffic console
- [ ] Watched requests appear in real-time
- [ ] Filtered by status code (2xx, 4xx, etc.)
- [ ] Searched for specific request paths
- [ ] Understood latency and error indicators

---

## Section 7: Overview of Other Consoles

### Quick Reference: All 11 Consoles

| Console | Purpose | Best For |
|---------|---------|----------|
| **Autopilot** | Launch AI attacks | Running attack campaigns |
| **Defense** | Manage WAF rules | Configuring protection |
| **Traffic** | Monitor requests | Real-time analysis |
| **Webhooks** | Capture webhooks | Testing integrations |
| **Chaos** | Inject faults | Resilience testing |
| **Scenarios** | Run multi-step sequences | Complex attack scenarios |
| **Cluster** | Monitor distributed nodes | Multi-node coordination |
| **Deception** | View honeypot events | Attacker tracking |
| **Network** | DNS/TCP testing | Connectivity diagnostics |
| **Settings** | Configure preferences | Customization |
| **Overview** | Dashboard summary | System health snapshot |

### When to Use Each

**You're a Red Teamer:**
- Start with **Autopilot** to launch attacks
- Check **Traffic** to see responses
- Use **Scenarios** to build complex attack chains

**You're a Defender:**
- Open **Defense** to create WAF rules
- Watch **Deception** for attacker patterns
- Monitor **Traffic** to see what's blocked

**You're a DevOps Engineer:**
- Use **Chaos** to test resilience
- Watch **Overview** for system health
- Use **Scenarios** for automated testing

**You're a Researcher:**
- Use **Cluster** to understand distributed behavior
- Create **Scenarios** for reproducible tests
- Monitor **Traffic** for detailed analysis

---

## Section 8: Exporting Data & Analysis

### Why Export?

Export findings to:
- Include in security reports
- Share with stakeholders
- Analyze in external tools (Excel, Python, Splunk)
- Integrate with CI/CD pipelines

### How to Export

**From most consoles:**
1. Click **[EXPORT]** button (usually in header)
2. Choose format: **JSON** or **CSV**
3. File downloads automatically

**Example: Export Autopilot Findings**
1. Open Autopilot console
2. Run an attack campaign (or use existing findings)
3. Click **[Export Findings]** button
4. File `autopilot-report-2026-02-21.json` downloads

**Example: Export Traffic Log**
1. Open Traffic console
2. Click **[EXPORT]** button
3. All requests in current view export as CSV
4. Open in Excel to analyze

### What You Get

**JSON Format (detailed):**
```json
{
  "campaignId": "autopilot-xxx",
  "target": "http://vulnerable-app:3000",
  "duration": 45000,
  "totalAttacks": 23,
  "vulnerabilities": [
    {
      "id": "vuln-001",
      "tool": "redteam.xss",
      "path": "/search",
      "severity": "high",
      "evidence": "payload reflected unescaped"
    }
  ]
}
```

**CSV Format (tabular):**
```
timestamp,method,path,status,latency_ms,blocked
2026-02-21T19:53:42Z,GET,/api/users,200,145
2026-02-21T19:53:41Z,POST,/search,403,18
```

### Checkpoint

- [ ] Opened a console with data
- [ ] Located the [EXPORT] button
- [ ] Exported data in JSON or CSV format
- [ ] Verified file downloaded successfully

---

## Section 9: Settings & Preferences

### What You Can Configure

**Location:** Sidebar → "Settings" or Cmd+K → "settings"

Available settings:
- **Theme** — Light/Dark mode
- **Auto-refresh interval** — How often console data updates (1s, 5s, 10s)
- **SSE streaming** — Enable/disable real-time updates
- **Notifications** — Show alerts when attacks find vulnerabilities
- **Console preferences** — Default console on load, column visibility
- **Export format** — Default to JSON or CSV

### Theme Toggle

Fastest way to change theme:
```
Press Cmd+T (or Ctrl+T on Windows/Linux)
```

No need to open Settings!

### Checkpoint

- [ ] Opened Settings console
- [ ] Explored at least 2 setting options
- [ ] Toggled theme using Cmd+T shortcut

---

## Section 10: Troubleshooting Dashboard Issues

### Dashboard Loads But Looks Broken

**Symptom:** Text misaligned, buttons in wrong places, layout broken

**Solution:**
1. Refresh the page: **F5** or **Cmd+R**
2. Wait 5 seconds for CSS to load
3. If still broken, clear browser cache: **Cmd+Shift+Delete** (Chrome)

---

### Real-Time Updates Not Working (Console Stuck)

**Symptom:** Autopilot running but console doesn't show new attacks

**Cause:** SSE (Server-Sent Events) connection not established

**Solution:**
1. Refresh page (F5)
2. Check browser console (F12) for errors
3. Verify Apparatus server is running:
   ```bash
   curl http://localhost:8090/health
   ```
4. If server is down, restart it and refresh dashboard

---

### Command Palette Not Working

**Symptom:** Cmd+K doesn't open search box

**Cause:** Browser intercepted the keyboard shortcut

**Solution:**
1. Check if your browser or OS is using Cmd+K for something else
2. Try Ctrl+K instead (works on all platforms)
3. If still stuck, use the sidebar to navigate manually

---

### Export Button Missing or Grayed Out

**Symptom:** [EXPORT] button doesn't appear or is disabled

**Cause:** No data to export, or console doesn't support export

**Solution:**
1. Verify console has data (run an autopilot campaign first)
2. Check if console supports export (Autopilot, Traffic, Defense do)
3. Some consoles (Settings, Overview) don't export

---

### Slow Dashboard Performance

**Symptom:** Dashboard lags, clicking buttons takes 2+ seconds

**Cause:** Large data set (1000+ requests in Traffic) or slow network

**Solution:**
1. Clear old data: Click **[CLEAR]** button
2. Use filters to reduce displayed data
3. Increase auto-refresh interval (Settings → Auto-refresh)
4. Close other browser tabs to free memory

---

## Section 11: Keyboard Cheat Sheet

**Quick reference for power users:**

| Action | Keyboard |
|--------|----------|
| Open Command Palette | Cmd+K (Mac) / Ctrl+K (Windows) |
| Close Dialog/Palette | Esc |
| Navigate Up in Palette | ↑ Arrow Key |
| Navigate Down in Palette | ↓ Arrow Key |
| Select Item | Enter |
| Toggle Theme | Cmd+T / Ctrl+T |
| Open Settings | Cmd+S / Ctrl+S |
| Show Help | Cmd+? / Ctrl+? |
| Refresh Page | F5 or Cmd+R / Ctrl+R |
| Browser DevTools | F12 |
| Fullscreen | F11 |

---

## Summary

You've learned how to:
- ✅ Navigate the Apparatus dashboard and open any console
- ✅ Use keyboard shortcuts to work faster (Cmd+K, Cmd+T, Cmd+?)
- ✅ Monitor attacks in real-time via Autopilot console
- ✅ Configure defenses and view blocks
- ✅ Filter and analyze traffic data
- ✅ Export findings for reporting
- ✅ Troubleshoot common dashboard issues

---

## Next Steps

Now that you know the dashboard, try these tutorials:

1. **[Red Team Autopilot](tutorial-autopilot.md)** — Deep dive into launching attack campaigns
2. **[Defense Rules & WAF](tutorial-defense-rules.md)** — Configure protection rules
3. **[Scenario Creation](tutorial-scenarios.md)** — Build complex multi-step attacks (coming soon)
4. **[Chaos Engineering](tutorial-chaos-engineering.md)** — Test resilience with fault injection (coming soon)

---

**Made with ❤️ for security professionals and researchers**
