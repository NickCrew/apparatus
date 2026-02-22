# Tutorial: CLI Reference & Automation Workflows

> Master the Apparatus command-line tool for scripting, CI/CD integration, and headless operation.

---

## What You'll Learn

- ✅ Use the Apparatus CLI tool for command-line operations
- ✅ Execute tests without the web dashboard
- ✅ Parse JSON output for scripting and automation
- ✅ Create reusable test scripts
- ✅ Integrate with CI/CD pipelines
- ✅ Configure API authentication and endpoints
- ✅ Build monitoring and alerting workflows

## Prerequisites

- **Apparatus running** — Server at `http://localhost:8090`
- **Node.js 23+** — Required to run Apparatus CLI
- **curl** — For API examples
- **bash** or **zsh** — For shell scripting
- **jq** — For JSON parsing (optional but helpful)
- **git** — For CI/CD examples (optional)

## Time Estimate

~30 minutes (CLI basics → scripting → CI/CD integration)

## What You'll Build

By the end, you'll have:
1. **CLI commands** for all major operations
2. **A test script** that runs scenarios automatically
3. **CI/CD integration** for continuous security testing
4. **JSON parsing** for result analysis
5. **Reusable workflows** for your team

---

## Section 1: Apparatus CLI Basics

### Installing the CLI

The CLI is built-in to Apparatus. Run it with:

```bash
cd /path/to/apparatus
npx @apparatus/cli --help
```

Or if installed globally:

```bash
apparatus --help
```

### CLI Structure

All commands follow this pattern:

```
apparatus [COMMAND] [OPTIONS]
```

**Example commands:**

```bash
apparatus health                    # Check server health
apparatus attack launch             # Launch an attack
apparatus defense list-rules        # List WAF rules
apparatus scenarios run             # Run a scenario
apparatus export                    # Export data
```

---

## Section 2: Core Commands

### Health & Status

```bash
# Check if Apparatus is running
apparatus health

# Expected output:
# ✓ Apparatus server is healthy
# - Host: localhost:8090
# - Status: healthy
# - Uptime: 2 days 3 hours
```

### Launching Attacks

```bash
# Launch a simple attack
apparatus attack xss --target http://myapp:3000 --path /search --param q

# With options
apparatus attack sqli \
  --target http://myapp:3000 \
  --path /api/users \
  --param id \
  --timeout 5000 \
  --json
```

### Managing Defenses

```bash
# List all active WAF rules
apparatus defense rules list

# Add a new rule
apparatus defense rules add \
  --pattern "<script|javascript:" \
  --action block \
  --description "Block XSS attempts"

# Get statistics
apparatus defense stats
```

### Scenario Operations

```bash
# List scenarios
apparatus scenarios list

# Run a scenario
apparatus scenarios run --scenario-id scenario-abc123

# Get scenario status
apparatus scenarios status --execution-id exec-xyz789

# View results
apparatus scenarios results --execution-id exec-xyz789
```

### Exporting Data

```bash
# Export all findings
apparatus export findings --format json > findings.json

# Export with filters
apparatus export findings \
  --format csv \
  --severity high \
  --from 2026-02-20 \
  --to 2026-02-21 \
  --output report.csv

# Export metrics
apparatus export metrics --format prometheus > metrics.txt
```

---

## Section 3: Command-Line Options

### Global Options (Work with Any Command)

| Option | Purpose |
|--------|---------|
| `--url URL` | Apparatus server URL (default: http://localhost:8090) |
| `--json` | Output in JSON format (for parsing) |
| `--quiet` | Suppress progress output |
| `--verbose` | Show detailed logs |
| `--help` | Show help for command |
| `--timeout MS` | Request timeout in milliseconds |

### Examples

```bash
# Connect to remote Apparatus server
apparatus health --url http://security-lab.example.com:8090

# Output as JSON for scripting
apparatus scenarios list --json | jq '.scenarios[] | .name'

# Verbose output for debugging
apparatus attack xss --target http://myapp --verbose

# Set timeout for slow networks
apparatus scenarios run --scenario-id scenario-abc --timeout 30000
```

---

## Section 4: JSON Output for Scripting

### Why JSON Output Matters

When you use `--json`, Apparatus outputs structured JSON that your scripts can parse.

**Example: List scenarios and extract IDs**

```bash
# Get all scenario IDs
apparatus scenarios list --json | jq '.scenarios[].id'

# Output:
# scenario-abc123
# scenario-xyz789
# scenario-def456
```

### Parsing with jq

**Extract specific fields:**

```bash
# Get scenario names and statuses
apparatus scenarios list --json | jq '.scenarios[] | {name, status}'

# Filter scenarios (only running ones)
apparatus scenarios list --json | jq '.scenarios[] | select(.status=="running")'

# Count total scenarios
apparatus scenarios list --json | jq '.scenarios | length'

# Get the latest findings
apparatus export findings --json | jq '.findings | sort_by(.timestamp) | last'
```

### Exercise: Parse Attack Results

Run an attack and extract findings:

```bash
# Run attack, output as JSON
apparatus attack xss \
  --target http://vuln-web:3000 \
  --path /search \
  --param q \
  --json > attack_result.json

# Extract vulnerabilities from result
cat attack_result.json | jq '.findings[] | {path, severity, detail}'

# Count by severity
cat attack_result.json | jq '.findings | group_by(.severity) | map({severity: .[0].severity, count: length})'
```

### Checkpoint

- [ ] Ran at least 3 different CLI commands
- [ ] Used `--json` flag and piped to jq
- [ ] Extracted specific fields from JSON output
- [ ] Parsed and counted results

---

## Section 5: Creating Test Scripts

### Script 1: Automated Security Test

Create a file `run-security-test.sh`:

```bash
#!/bin/bash
set -e  # Exit on error

TARGET="http://myapp:3000"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
REPORT="security-report-${TIMESTAMP}.json"

echo "🔒 Starting automated security test..."
echo "Target: $TARGET"

# Create temporary directory for results
mkdir -p results
cd results

# Run XSS test
echo "Testing XSS vulnerabilities..."
apparatus attack xss \
  --target "$TARGET" \
  --path /search \
  --param q \
  --json > xss_results.json

# Run SQLi test
echo "Testing SQL injection..."
apparatus attack sqli \
  --target "$TARGET" \
  --path /api/users \
  --param id \
  --json > sqli_results.json

# Aggregate findings
echo "Aggregating results..."
cat xss_results.json sqli_results.json | \
  jq -s '[.[].findings[]] | group_by(.severity) |
  map({severity: .[0].severity, count: length})' > summary.json

# Display results
echo ""
echo "📊 Summary:"
cat summary.json | jq .

# Return non-zero exit code if vulnerabilities found
VULN_COUNT=$(cat xss_results.json sqli_results.json | jq '[.findings[]?] | length')
if [ "$VULN_COUNT" -gt 0 ]; then
  echo "⚠️  Found $VULN_COUNT vulnerabilities!"
  exit 1
else
  echo "✅ No vulnerabilities found!"
  exit 0
fi
```

**Run the script:**

```bash
chmod +x run-security-test.sh
./run-security-test.sh
```

---

### Script 2: Continuous Monitoring

Create `continuous-monitor.sh`:

```bash
#!/bin/bash

TARGET="${1:-http://localhost:3000}"
INTERVAL="${2:-3600}"  # Default: every hour

echo "🔄 Starting continuous monitoring of $TARGET"
echo "Running tests every $INTERVAL seconds"

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$TIMESTAMP] Running test..."

  # Run quick security test
  RESULT=$(apparatus attack xss \
    --target "$TARGET" \
    --path /api/health \
    --param test \
    --json 2>/dev/null)

  # Check if vulnerable
  if echo "$RESULT" | jq -e '.vulnerable' > /dev/null 2>&1; then
    echo "⚠️  ALERT: Vulnerability found!"
    # Send alert (email, Slack, PagerDuty, etc.)
    # Example: send_slack_alert "$RESULT"
  else
    echo "✅ Test passed"
  fi

  echo "Sleeping $INTERVAL seconds until next test..."
  sleep "$INTERVAL"
done
```

**Run:**

```bash
./continuous-monitor.sh http://myapp:3000 3600
```

---

## Section 6: CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/security-test.yml`:

```yaml
name: Security Testing

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  security-test:
    runs-on: ubuntu-latest

    services:
      apparatus:
        image: apparatus:latest
        ports:
          - 8090:8090
      myapp:
        image: myapp:latest
        ports:
          - 3000:3000

    steps:
      - uses: actions/checkout@v3

      - name: Install Node
        uses: actions/setup-node@v3
        with:
          node-version: '23'

      - name: Install Apparatus CLI
        run: npm install -g @apparatus/cli

      - name: Wait for services
        run: |
          for i in {1..30}; do
            curl -f http://localhost:8090/health && break
            sleep 1
          done

      - name: Run security tests
        run: |
          apparatus attack xss \
            --target http://localhost:3000 \
            --path /search \
            --param q \
            --json > results.json

      - name: Check results
        run: |
          VULN=$(jq '.vulnerable' results.json)
          if [ "$VULN" = "true" ]; then
            echo "❌ Vulnerabilities found!"
            jq . results.json
            exit 1
          else
            echo "✅ Security tests passed"
          fi

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-test-results
          path: results.json
```

### GitLab CI Example

Create `.gitlab-ci.yml`:

```yaml
security_test:
  stage: test
  image: node:23
  services:
    - docker:dind
  script:
    - npm install -g @apparatus/cli
    - apparatus health --url http://apparatus:8090
    - apparatus attack xss
        --target http://myapp:3000
        --path /search
        --param q
        --json > results.json
    - jq '.vulnerable' results.json | grep -q false || exit 1
  artifacts:
    reports:
      dependency_scanning: results.json
```

---

## Section 7: Advanced Workflows

### Workflow 1: Pre-Deployment Security Gate

```bash
#!/bin/bash
# Runs before deployment - fails if vulnerabilities found

echo "🛡️  Security gate check..."

# Get deployed version
VERSION=$(curl -s http://staging:8090/_version)
echo "Testing version: $VERSION"

# Run comprehensive security test
apparatus scenarios run \
  --scenario-id comprehensive-security-test \
  --json > pre-deploy-results.json

# Extract findings
CRITICAL=$(jq '[.findings[] | select(.severity=="critical")] | length' pre-deploy-results.json)
HIGH=$(jq '[.findings[] | select(.severity=="high")] | length' pre-deploy-results.json)

echo "Critical findings: $CRITICAL"
echo "High findings: $HIGH"

# Block deployment if critical issues
if [ "$CRITICAL" -gt 0 ]; then
  echo "❌ DEPLOYMENT BLOCKED: Critical security issues found"
  jq '.findings[] | select(.severity=="critical")' pre-deploy-results.json
  exit 1
fi

# Warn if high issues
if [ "$HIGH" -gt 0 ]; then
  echo "⚠️  WARNING: High-severity issues found, proceed with caution"
  read -p "Continue with deployment? (y/n) " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

echo "✅ Security gate PASSED"
exit 0
```

---

### Workflow 2: Generate Compliance Report

```bash
#!/bin/bash
# Generate security report for compliance

REPORT_DATE=$(date +%Y-%m-%d)
REPORT_FILE="security-report-${REPORT_DATE}.md"

cat > "$REPORT_FILE" <<EOF
# Security Test Report
**Date:** $REPORT_DATE

## Summary
EOF

# Get metrics
FINDINGS=$(apparatus export findings --json | jq '.findings | length')
CRITICAL=$(apparatus export findings --json | jq '[.findings[] | select(.severity=="critical")] | length')
HIGH=$(apparatus export findings --json | jq '[.findings[] | select(.severity=="high")] | length')

cat >> "$REPORT_FILE" <<EOF
- Total Findings: $FINDINGS
- Critical: $CRITICAL
- High: $HIGH

## Details

EOF

# Add finding details
apparatus export findings --json | jq '.findings[] |
  "### \(.severity | ascii_upcase): \(.vulnerability)\n\n**Path:** \(.path)\n\n**Detail:** \(.detail)\n"' >> "$REPORT_FILE"

echo "✅ Report generated: $REPORT_FILE"
```

---

## Section 8: Configuration

### Config File

Store settings in `~/.apparatus/config.json`:

```json
{
  "server": {
    "url": "http://localhost:8090",
    "timeout": 30000
  },
  "defaults": {
    "target": "http://localhost:3000",
    "timeout": 5000
  },
  "output": {
    "format": "json",
    "color": true
  }
}
```

**Use config:**

```bash
# Settings from config file are applied automatically
apparatus attack xss --path /search --param q
# Uses target from config if not specified
```

### Environment Variables

```bash
export APPARATUS_URL=http://security-lab:8090
export APPARATUS_TIMEOUT=10000

apparatus health  # Uses env vars
```

---

## Section 9: Troubleshooting CLI

### CLI Command Not Found

**Symptom:** `command not found: apparatus`

**Solution:**
```bash
# Install globally
npm install -g @apparatus/cli

# Or use npx
npx @apparatus/cli --help
```

---

### JSON Output Parsing Fails

**Symptom:** `jq: command not found`

**Solution:**
```bash
# Install jq
# macOS:
brew install jq

# Ubuntu/Debian:
sudo apt-get install jq

# Or parse manually with bash
grep '"vulnerable"' results.json
```

---

### Network Timeout in CI/CD

**Symptom:** CLI commands timeout in GitHub Actions

**Solution:**
```bash
# Increase timeout
apparatus attack xss \
  --target http://myapp:3000 \
  --path /search \
  --param q \
  --timeout 30000  # 30 seconds

# Ensure services are running
curl -f http://myapp:3000/health || exit 1
```

---

## Summary

You've learned how to:
- ✅ Use Apparatus CLI for all major operations
- ✅ Parse JSON output with jq for scripting
- ✅ Create automated test scripts
- ✅ Integrate with CI/CD pipelines (GitHub, GitLab)
- ✅ Build continuous monitoring workflows
- ✅ Generate compliance reports

---

## Next Steps

1. **Create your own test script** for your application
2. **Integrate into CI/CD** pipeline
3. **Set up continuous monitoring** with cron jobs
4. **Generate automated reports** for compliance

---

**Made with ❤️ for DevOps engineers and automation builders**
