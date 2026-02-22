# Tutorial: Webhooks & Event-Driven Integration

> Capture, filter, replay, and integrate webhook events into your security testing workflow.

---

## What You'll Learn

- ✅ Capture inbound webhooks from external services
- ✅ Filter and search webhook payloads in real-time
- ✅ Replay webhooks to test failure scenarios
- ✅ Integrate webhooks with attack scenarios
- ✅ Set up webhook signing and authentication
- ✅ Forward webhooks to external services (Slack, Discord, PagerDuty)
- ✅ Archive and audit webhook events

## Prerequisites

- **Apparatus running** — Server at `http://localhost:8090`
- **curl** — For webhook testing
- **jq** — For JSON parsing (optional)
- **Webhook service account** — For auth tokens (optional)
- **Slack/Discord account** — For forwarding examples (optional)

## Time Estimate

~40 minutes (webhook basics → filtering → replay → integration)

## What You'll Build

By the end, you'll have:
1. **A webhook receiver** capturing events from GitHub, Slack, or custom sources
2. **Filtering rules** for webhook routing
3. **Replay workflows** to test failure handling
4. **Integration with scenarios** to trigger attacks on webhook events
5. **Forwarding setup** to send Apparatus events to external tools

---

## Section 1: Webhook Basics

### What are Webhooks?

Webhooks are HTTP POST requests sent by external services to Apparatus when events occur. Instead of polling for changes, Apparatus receives instant notifications.

**Real-world flow:**
```
GitHub release published → GitHub sends POST to Apparatus /webhooks/github
  ↓
Apparatus receives payload → Parses event type (release, push, etc.)
  ↓
Apparatus triggers action → Run security test on new release
```

### Enable Webhook Receiver

By default, webhooks are captured at:

```
POST /webhooks/{service}
```

**Supported services:** `github`, `gitlab`, `slack`, `discord`, `generic`, `custom`

Start Apparatus (it automatically enables webhook capture):

```bash
curl http://localhost:8090/health
```

Expected output:
```json
{
  "status": "healthy",
  "features": {
    "webhooks": "enabled"
  }
}
```

### Send Your First Webhook

Test the webhook receiver with a simple POST:

```bash
curl -X POST http://localhost:8090/webhooks/generic \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test.received",
    "timestamp": "2026-02-21T10:00:00Z",
    "data": {
      "message": "Hello from webhook"
    }
  }'
```

Expected response:
```json
{
  "id": "webhook-abc123",
  "received_at": "2026-02-21T10:00:00.123Z",
  "service": "generic",
  "status": "received"
}
```

### View Received Webhooks

Query all captured webhooks:

```bash
curl http://localhost:8090/api/webhooks/list \
  -H "Accept: application/json"
```

Expected output:
```json
{
  "webhooks": [
    {
      "id": "webhook-abc123",
      "service": "generic",
      "event": "test.received",
      "received_at": "2026-02-21T10:00:00Z",
      "payload": {
        "message": "Hello from webhook"
      },
      "status": "received"
    }
  ],
  "total": 1
}
```

### Checkpoint

- [ ] Apparatus health check returns `"webhooks": "enabled"`
- [ ] Sent a test webhook to `/webhooks/generic`
- [ ] Received a webhook ID in response
- [ ] Listed webhooks via `/api/webhooks/list`

---

## Section 2: GitHub Integration

### GitHub → Apparatus Webhook Flow

GitHub can notify Apparatus when:
- Code is pushed (branch, tag, release)
- Pull requests open, merge, or close
- Issues are created or updated
- Releases are published

### Set Up GitHub Repository Webhook

1. **Go to GitHub repository settings** → Webhooks
2. **Click "Add webhook"**
3. **Enter payload URL:** `http://your-server.com:8090/webhooks/github`
4. **Content type:** `application/json`
5. **Secret:** Generate a random string (e.g., `your-secret-key-here`)
6. **Events to send:** Select `Let me select individual events` → Check:
   - `push`
   - `release`
   - `pull_request`
7. **Click "Add webhook"**

### Test GitHub Webhook Locally

For local testing, use a tunnel service. Install ngrok:

```bash
# macOS
brew install ngrok

# Start tunnel to localhost:8090
ngrok http 8090
```

Output:
```
Forwarding                    https://abc123.ngrok.io -> http://localhost:8090
```

Use `https://abc123.ngrok.io/webhooks/github` as your GitHub webhook URL.

### Receive a GitHub Push Event

Push to your repository:

```bash
git add .
git commit -m "test webhook"
git push origin main
```

GitHub sends a POST to Apparatus:

```json
{
  "ref": "refs/heads/main",
  "before": "abc123...",
  "after": "def456...",
  "repository": {
    "name": "myapp",
    "full_name": "username/myapp"
  },
  "pusher": {
    "name": "username"
  },
  "commits": [
    {
      "message": "test webhook"
    }
  ]
}
```

### View GitHub Webhook in Apparatus

List webhooks filtered by service:

```bash
curl "http://localhost:8090/api/webhooks/list?service=github" | jq .
```

Extract GitHub event details:

```bash
curl "http://localhost:8090/api/webhooks/list?service=github" | \
  jq '.webhooks[] | {
    id,
    repository: .payload.repository.full_name,
    event_type: .payload.ref,
    commits: .payload.commits | length
  }'
```

### Checkpoint

- [ ] GitHub webhook URL configured in repository settings
- [ ] ngrok tunnel running (for local testing)
- [ ] Pushed code to repository
- [ ] GitHub webhook appeared in `/api/webhooks/list`
- [ ] Extracted repository name and commit count with jq

---

## Section 3: Webhook Filtering & Search

### Filter Webhooks by Criteria

Apparatus supports filtering by:
- **service** — github, gitlab, slack, etc.
- **event** — push, release, pull_request, etc.
- **status** — received, processing, failed
- **timestamp** — time range

**Example: List only GitHub push events**

```bash
curl "http://localhost:8090/api/webhooks/list?service=github&event=push" | jq .
```

**Example: List webhooks from last 1 hour**

```bash
curl "http://localhost:8090/api/webhooks/list?since=1h" | jq .
```

**Example: Search webhook payload by content**

```bash
curl "http://localhost:8090/api/webhooks/search" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "query": "main",
    "fields": ["payload"]
  }'
```

Returns webhooks containing "main" in their payload.

### Real-time Webhook Stream

Subscribe to webhook events in real-time via SSE:

```bash
curl -N http://localhost:8090/api/webhooks/stream
```

As webhooks arrive, you'll see:

```
event: webhook.received
data: {"id": "webhook-xyz789", "service": "github", "event": "push"}

event: webhook.received
data: {"id": "webhook-abc123", "service": "slack", "event": "message"}
```

Parse webhook stream with jq:

```bash
curl -N http://localhost:8090/api/webhooks/stream | \
  jq -R 'select(startswith("data:")) | .[6:] | fromjson'
```

### Filter Webhooks on Client-Side

Combine curl + jq to filter received webhooks:

```bash
# Get all GitHub release events
curl "http://localhost:8090/api/webhooks/list" | \
  jq '.webhooks[] |
    select(.service == "github" and .event == "release") |
    {id, repository: .payload.repository.full_name, tag: .payload.release.tag_name}'
```

Output:
```json
{
  "id": "webhook-123",
  "repository": "username/myapp",
  "tag": "v1.2.0"
}
```

### Archive Old Webhooks

Clean up old webhooks to save disk space:

```bash
# Delete webhooks older than 7 days
curl -X DELETE \
  "http://localhost:8090/api/webhooks/cleanup?older_than=7d"
```

Response:
```json
{
  "deleted": 42,
  "freed_space_mb": 1.2
}
```

### Checkpoint

- [ ] Filtered webhooks by service (github, slack)
- [ ] Subscribed to webhook stream with `curl -N`
- [ ] Extracted repository name and tag from GitHub release webhooks
- [ ] Tested search with custom query
- [ ] Cleaned up old webhooks

---

## Section 4: Replay Webhooks

### Why Replay?

Replaying webhooks helps you:
- Test failure handling (what if webhook arrived late?)
- Debug integrations (reproduce exact payload)
- Simulate external service behavior
- Load test your handlers

### Replay a Single Webhook

Get a webhook ID, then replay it:

```bash
# List webhooks to get an ID
WEBHOOK_ID=$(curl "http://localhost:8090/api/webhooks/list" | \
  jq -r '.webhooks[0].id')

# Replay that webhook
curl -X POST "http://localhost:8090/api/webhooks/$WEBHOOK_ID/replay"
```

Response:
```json
{
  "id": "webhook-abc123",
  "replay_id": "replay-xyz789",
  "original_timestamp": "2026-02-21T10:00:00Z",
  "replayed_at": "2026-02-21T10:05:30Z",
  "status": "replayed"
}
```

### Replay with Modifications

Modify the payload before replaying (simulate a failure scenario):

```bash
curl -X POST "http://localhost:8090/api/webhooks/$WEBHOOK_ID/replay" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": {
      "payload.status": "failed",
      "payload.error": "Connection timeout"
    }
  }'
```

This simulates the webhook being sent during a failure state.

### Bulk Replay

Replay all webhooks matching a filter:

```bash
# Replay all GitHub push events
curl -X POST "http://localhost:8090/api/webhooks/replay-bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "service": "github",
      "event": "push"
    }
  }'
```

Response:
```json
{
  "replayed": 15,
  "batch_id": "batch-qrs123",
  "status": "in_progress"
}
```

### Monitor Replay Status

Check the status of a replay operation:

```bash
curl "http://localhost:8090/api/webhooks/replay/batch-qrs123" | jq .
```

Output:
```json
{
  "batch_id": "batch-qrs123",
  "total": 15,
  "completed": 12,
  "failed": 0,
  "in_progress": 3,
  "status": "in_progress"
}
```

### Checkpoint

- [ ] Replayed a single webhook by ID
- [ ] Modified webhook payload during replay
- [ ] Bulk-replayed webhooks matching a service filter
- [ ] Monitored replay operation status

---

## Section 5: Webhook Signing & Authentication

### Verify Webhook Signatures

GitHub, GitLab, and Slack sign their webhooks with a secret. Verify signatures to ensure requests came from the service.

### GitHub Webhook Signature

GitHub includes an `X-Hub-Signature-256` header:

```bash
# Example webhook with signature
curl -X POST http://localhost:8090/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=abcd1234..." \
  -d '{"event": "push"}'
```

Configure GitHub secret in Apparatus:

```bash
curl -X POST http://localhost:8090/api/webhooks/config \
  -H "Content-Type: application/json" \
  -d '{
    "service": "github",
    "secret": "your-webhook-secret-from-github"
  }'
```

Apparatus automatically verifies signatures on incoming GitHub webhooks.

### Slack Webhook Verification

Slack includes `X-Slack-Request-Timestamp` and `X-Slack-Signature` headers.

Configure Slack signing secret:

```bash
curl -X POST http://localhost:8090/api/webhooks/config \
  -H "Content-Type: application/json" \
  -d '{
    "service": "slack",
    "signing_secret": "your-slack-signing-secret"
  }'
```

Apparatus verifies all incoming Slack webhooks.

### Custom Webhook Authentication

For generic webhooks, use Bearer tokens or API keys:

```bash
# Configure custom auth
curl -X POST http://localhost:8090/api/webhooks/config \
  -H "Content-Type: application/json" \
  -d '{
    "service": "custom",
    "auth_method": "bearer",
    "auth_token": "your-secret-token"
  }'

# Send webhook with authentication
curl -X POST http://localhost:8090/webhooks/custom \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"event": "test"}'
```

### View Webhook Security Status

Check which services have verified signatures:

```bash
curl http://localhost:8090/api/webhooks/security-status | jq .
```

Output:
```json
{
  "github": {
    "configured": true,
    "verified_count": 42,
    "failed_count": 0,
    "last_verified": "2026-02-21T10:05:00Z"
  },
  "slack": {
    "configured": true,
    "verified_count": 18,
    "failed_count": 0
  },
  "custom": {
    "configured": false,
    "note": "No custom webhooks received"
  }
}
```

### Checkpoint

- [ ] Configured GitHub webhook secret
- [ ] Configured Slack signing secret
- [ ] Set up custom Bearer token auth
- [ ] Verified webhook security status shows successful verifications

---

## Section 6: Webhook Forwarding

### Forward Webhooks to External Services

Automatically forward Apparatus webhook events to Slack, Discord, PagerDuty, etc.

### Forward to Slack

Create a Slack webhook URL (Incoming Webhooks integration):

```bash
# Configure forwarding to Slack
curl -X POST http://localhost:8090/api/webhooks/forward \
  -H "Content-Type: application/json" \
  -d '{
    "destination_service": "slack",
    "destination_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "trigger": {
      "service": "github",
      "event": "release"
    },
    "format": "slack"
  }'
```

Now every GitHub release webhook triggers a Slack message:

```
🚀 Release Published
Repository: username/myapp
Tag: v1.2.0
Author: username
Time: 2026-02-21 10:00 UTC
```

### Forward to Discord

Set up Discord webhook and configure forwarding:

```bash
curl -X POST http://localhost:8090/api/webhooks/forward \
  -H "Content-Type: application/json" \
  -d '{
    "destination_service": "discord",
    "destination_url": "https://discordapp.com/api/webhooks/YOUR/WEBHOOK/URL",
    "trigger": {
      "service": "github",
      "event": "push"
    },
    "format": "discord"
  }'
```

Discord message:
```
📝 Code Pushed
Branch: main
Commits: 3
Latest: "update security rules"
```

### Forward to PagerDuty

Trigger incidents in PagerDuty when critical webhooks arrive:

```bash
curl -X POST http://localhost:8090/api/webhooks/forward \
  -H "Content-Type: application/json" \
  -d '{
    "destination_service": "pagerduty",
    "destination_url": "https://events.pagerduty.com/v2/enqueue",
    "integration_key": "your-pagerduty-integration-key",
    "trigger": {
      "service": "apparatus",
      "event": "critical_vulnerability_detected"
    }
  }'
```

### Forward with Custom Filtering

Only forward webhooks matching criteria:

```bash
curl -X POST http://localhost:8090/api/webhooks/forward \
  -H "Content-Type: application/json" \
  -d '{
    "destination_service": "slack",
    "destination_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "trigger": {
      "service": "github",
      "event": "release"
    },
    "filter": {
      "repository": "myapp",
      "branch": "main"
    }
  }'
```

Only forward releases from the `myapp` repository on the `main` branch.

### List Configured Forwards

View all active forwarding rules:

```bash
curl http://localhost:8090/api/webhooks/forwards | jq .
```

Output:
```json
{
  "forwards": [
    {
      "id": "forward-123",
      "destination": "slack",
      "trigger_service": "github",
      "trigger_event": "release",
      "last_forward": "2026-02-21T10:05:00Z",
      "status": "active"
    },
    {
      "id": "forward-456",
      "destination": "discord",
      "trigger_service": "github",
      "trigger_event": "push",
      "last_forward": "2026-02-21T10:03:00Z",
      "status": "active"
    }
  ]
}
```

### Disable a Forward

Stop forwarding without deleting the rule:

```bash
curl -X POST http://localhost:8090/api/webhooks/forward/forward-123/disable
```

### Checkpoint

- [ ] Created Slack Incoming Webhook URL
- [ ] Configured forwarding for GitHub releases to Slack
- [ ] Set up Discord forwarding for push events
- [ ] Added custom filter to forward only from specific repository
- [ ] Listed all active forwarding rules

---

## Section 7: Integrate Webhooks with Scenarios

### Trigger Attack Scenarios on Webhooks

Automatically run security tests when external events occur (e.g., new release, deployment).

### Webhook-Triggered Scenario

Create a scenario that runs on GitHub release:

```bash
curl -X POST http://localhost:8090/api/scenarios/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Release Security Test",
    "description": "Run security tests on every GitHub release",
    "trigger": {
      "type": "webhook",
      "service": "github",
      "event": "release"
    },
    "actions": [
      {
        "type": "redteam.xss",
        "target": "http://myapp:3000",
        "path": "/",
        "param": "q"
      },
      {
        "type": "redteam.sqli",
        "target": "http://myapp:3000",
        "path": "/api/search",
        "param": "query"
      },
      {
        "type": "chaos.cpu",
        "duration_seconds": 60,
        "percentage": 80
      }
    ]
  }'
```

**Flow:**
```
GitHub release published
  ↓
Webhook sent to Apparatus
  ↓
Apparatus matches trigger (service=github, event=release)
  ↓
Scenario starts automatically
  ↓
XSS test + SQLi test + CPU chaos executed
  ↓
Results saved and forwarded to Slack
```

### Conditional Webhook Scenarios

Use webhook payload data to condition actions:

```bash
curl -X POST http://localhost:8090/api/scenarios/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tag-Based Testing",
    "trigger": {
      "type": "webhook",
      "service": "github",
      "event": "release"
    },
    "actions": [
      {
        "type": "redteam.xss",
        "target": "http://myapp:3000",
        "runOnly": {
          "tagMatch": "v.*"
        }
      },
      {
        "type": "chaos.cpu",
        "duration_seconds": 120,
        "runOnly": {
          "tagMatch": "v[0-9]+\\.[0-9]+\\.0"
        }
      }
    ]
  }'
```

Run CPU chaos only on major releases (v1.0.0, v2.0.0, etc.).

### Extract Webhook Data in Actions

Pass webhook payload to attack parameters:

```bash
curl -X POST http://localhost:8090/api/scenarios/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Released Version",
    "trigger": {
      "type": "webhook",
      "service": "github",
      "event": "release"
    },
    "variables": {
      "repository": "${webhook.repository.full_name}",
      "tag": "${webhook.release.tag_name}",
      "target_url": "http://${webhook.repository.name}:3000"
    },
    "actions": [
      {
        "type": "redteam.xss",
        "target": "${target_url}",
        "path": "/",
        "param": "search"
      }
    ]
  }'
```

Apparatus replaces variables with actual webhook data.

### Monitor Webhook-Triggered Scenarios

Query scenario status filtered by webhook trigger:

```bash
curl "http://localhost:8090/api/scenarios/executions?trigger_type=webhook" | jq .
```

Output:
```json
{
  "executions": [
    {
      "id": "exec-123",
      "scenario": "Release Security Test",
      "triggered_by": {
        "webhook_id": "webhook-abc123",
        "service": "github",
        "event": "release"
      },
      "status": "completed",
      "started_at": "2026-02-21T10:00:00Z",
      "completed_at": "2026-02-21T10:05:45Z",
      "findings": 3
    }
  ]
}
```

### Checkpoint

- [ ] Created a scenario triggered by GitHub webhooks
- [ ] Set up conditional actions based on tag pattern
- [ ] Extracted webhook data into scenario variables
- [ ] Monitored webhook-triggered scenario execution status

---

## Section 8: Advanced Patterns

### Pattern 1: Catch-All Error Handler

Forward failed webhook processing to Slack:

```bash
curl -X POST http://localhost:8090/api/webhooks/forward \
  -H "Content-Type: application/json" \
  -d '{
    "destination_service": "slack",
    "destination_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "trigger": {
      "service": "apparatus",
      "event": "webhook_processing_failed"
    },
    "format": "slack"
  }'
```

Slack alert:
```
⚠️ Webhook Processing Failed
Webhook ID: webhook-xyz789
Service: github
Error: Invalid signature
Time: 2026-02-21 10:05:00 UTC
```

### Pattern 2: Multi-Step Approval Workflow

Require approval before replay:

```bash
# Create approval rule
curl -X POST http://localhost:8090/api/webhooks/approval-rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Release Approval",
    "trigger": {
      "service": "github",
      "event": "release"
    },
    "action": "replay",
    "approvers": ["security-team@company.com"],
    "timeout_hours": 24
  }'
```

Now, any release webhook requires approval before being replayed.

### Pattern 3: Webhook Deduplication

Prevent duplicate webhooks from triggering multiple times:

```bash
# Configure deduplication
curl -X POST http://localhost:8090/api/webhooks/config \
  -H "Content-Type: application/json" \
  -d '{
    "deduplication": {
      "enabled": true,
      "window_seconds": 300,
      "key": ["service", "event", "payload.repository", "payload.commits[0].id"]
    }
  }'
```

If identical webhooks arrive within 5 minutes, only process the first one.

### Pattern 4: Webhook Rate Limiting

Prevent webhook flooding:

```bash
curl -X POST http://localhost:8090/api/webhooks/config \
  -H "Content-Type: application/json" \
  -d '{
    "rate_limit": {
      "enabled": true,
      "per_service": {
        "github": {
          "requests_per_minute": 100,
          "burst": 10
        },
        "slack": {
          "requests_per_minute": 50,
          "burst": 5
        }
      }
    }
  }'
```

### Checkpoint

- [ ] Set up error forwarding to Slack
- [ ] Configured approval rules for release webhooks
- [ ] Enabled webhook deduplication
- [ ] Set rate limits per service

---

## Section 9: Troubleshooting

### Webhook Not Received

**Symptom:** Sent webhook but it doesn't appear in `/api/webhooks/list`

**Possible causes:**
1. Apparatus webhook receiver not enabled
2. Wrong endpoint URL
3. Network connectivity issue

**Solutions:**
```bash
# Check if webhooks are enabled
curl http://localhost:8090/health | jq '.features.webhooks'
# Should return: "enabled"

# Verify webhook endpoint is accessible
curl -X POST http://localhost:8090/webhooks/generic \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Should return: 200 with webhook ID

# Check server logs for errors
tail -f /var/log/apparatus.log | grep webhook
```

---

### Signature Verification Failed

**Symptom:** GitHub webhook rejected with "signature verification failed"

**Solution:**
```bash
# Verify secret is configured correctly
curl http://localhost:8090/api/webhooks/config | jq '.github'

# Get the secret from GitHub (Settings → Webhooks)
# Re-configure with correct secret
curl -X POST http://localhost:8090/api/webhooks/config \
  -H "Content-Type: application/json" \
  -d '{
    "service": "github",
    "secret": "whsec_your_actual_secret_here"
  }'
```

---

### Replay Not Triggering Scenario

**Symptom:** Webhook replayed but scenario didn't run

**Check webhook trigger config:**
```bash
# List webhook-triggered scenarios
curl http://localhost:8090/api/scenarios/list | \
  jq '.scenarios[] | select(.trigger.type == "webhook")'

# Verify the trigger matches your webhook
# service and event must match exactly
```

---

### Forwarding Destination Unreachable

**Symptom:** "Error forwarding to Slack: connection refused"

**Solutions:**
```bash
# Test Slack webhook URL manually
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message"}'

# Should return: "ok"

# If fails, verify URL is correct in Apparatus config
curl http://localhost:8090/api/webhooks/forwards | jq .

# Update if needed
curl -X POST http://localhost:8090/api/webhooks/forward/forward-123 \
  -H "Content-Type: application/json" \
  -d '{
    "destination_url": "https://hooks.slack.com/services/CORRECT/URL"
  }'
```

---

### High Disk Usage from Webhooks

**Symptom:** Disk usage growing rapidly due to webhook storage

**Solutions:**
```bash
# Check webhook storage usage
curl http://localhost:8090/api/webhooks/storage-stats | jq .

# Clean up old webhooks
curl -X DELETE "http://localhost:8090/api/webhooks/cleanup?older_than=7d"

# Configure automatic cleanup
curl -X POST http://localhost:8090/api/webhooks/config \
  -H "Content-Type: application/json" \
  -d '{
    "auto_cleanup": {
      "enabled": true,
      "age_days": 30
    }
  }'
```

---

## Summary

You've learned how to:
- ✅ Capture and view webhooks from GitHub, Slack, and custom sources
- ✅ Filter and search webhooks in real-time
- ✅ Replay webhooks with original or modified payloads
- ✅ Verify webhook signatures (GitHub, Slack, custom auth)
- ✅ Forward webhooks to external services (Slack, Discord, PagerDuty)
- ✅ Trigger scenarios automatically from webhooks
- ✅ Implement advanced patterns (approval workflows, deduplication, rate limiting)
- ✅ Troubleshoot common webhook issues

---

## Next Steps

1. **Set up webhooks for your services** — GitHub, GitLab, Slack, or custom
2. **Configure forwarding** to your team's communication channels
3. **Create webhook-triggered scenarios** for continuous security testing
4. **Archive and audit** webhooks for compliance

---

**Made with ❤️ for security engineers and DevOps practitioners**
