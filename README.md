<div align="center">

![Apparatus Banner](docs/assets/apparatus-banner.png)

![Node.js](https://img.shields.io/badge/Node.js-v23-green)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)
![Multi-Protocol](https://img.shields.io/badge/Protocols-13%2B-orange)
![Open Source](https://img.shields.io/badge/License-MIT-black)

All-in-one cybersecurity testing and simulation lab platform for red teams, chaos engineering, defense validation, and security tool testing.

</div>

---

## What is Apparatus?

Apparatus is a **comprehensive security testing platform** that simulates real-world attacks, defense mechanisms, and infrastructure chaos in a controlled, sandboxed environment. It's designed for:

- 🎯 **Red Teams** - Autonomous AI-driven exploitation and payload testing
- 🛡️ **Blue Teams** - Defense validation, WAF testing, deception engineering
- ⚙️ **Chaos Engineers** - Resilience testing, fault injection, system recovery
- 🔬 **Security Researchers** - Protocol fuzzing, vulnerability simulation, attack pattern modeling
- 📚 **Training** - Security tool evaluation, incident response drills, threat intelligence

Think of it as **OWASP WebGoat meets Chaos Monkey meets a full-featured security lab**—all in one platform.

---

## Key Features

### 🎭 Deception & Honeypots
- **AI-Powered Honeypot** - Fake admin consoles, shell terminals, and databases with contextual AI responses
- **Ghost Traffic** - Generate synthetic legitimate-looking traffic to confuse attribution
- **Deception Events** - Real-time tracking and streaming of honeypot interactions
- **Multi-Layer Traps** - Fake `.env` files, `/etc/passwd`, SQLi detection honeypots

### 🔴 Red Team & Exploitation
- **AI Autopilot** - Autonomous red team agent that intelligently selects and executes tools
- **Payload Validator** - Test app resilience to XSS, SQLi, path traversal, command injection, NoSQL injection
- **Scenario Engine** - Template-based multi-step attack/defense sequences
- **SSRF/Proxy Testing** - Test for request-based vulnerabilities

### 🛡️ Defense & Mitigation
- **Active Shield (WAF)** - Pattern-based request blocking with rule management
- **Tarpit Defense** - Honeypot that traps attackers in slow-response connections
- **Moving Target Defense (MTD)** - Dynamic API hiding with rotating prefixes
- **Self-Healing QoS** - Autonomous load shedding and event loop monitoring
- **Rate Limiting** - Per-IP rate limit enforcement with 429 responses

### ⚙️ Chaos Engineering
- **CPU Spike** - Trigger high CPU utilization for resilience testing
- **Memory Spike** - Allocate memory to simulate OOM scenarios
- **Crash Scenarios** - Test graceful shutdown and recovery
- **Cluster Attacks** - Coordinate chaos across distributed nodes via UDP gossip

### 🌐 Network & Diagnostics
- **DNS Resolver** - Query A/AAAA/MX/TXT/SRV/NS/CNAME records
- **TCP Ping** - Connectivity testing to remote hosts
- **Bandwidth Generator** - 1B to 1GB data streaming for load testing
- **Packet Capture (PCAP)** - tcpdump-based traffic recording
- **HAR Replay** - Replay HTTP requests from archive files

### 🔐 Security Testing
- **Data Exfiltration Testing** - DLP generator with credit cards, SSNs, emails, fake SQL errors
- **Container Escape Testing** - Egress channel and escape vector validation
- **Cloud Credential Harvesting** - Simulated AWS/GCP/Azure metadata endpoints
- **Supply Chain Attacks** - Package manager poisoning simulation
- **Victim App** - Intentionally vulnerable application with XSS, SQLi, CSRF, auth bypass

### 📡 Multi-Protocol Support
- **HTTP/1.1** (port 8090)
- **HTTP/2 TLS** (port 8443)
- **HTTP/2 Cleartext (h2c)** (port 8091)
- **WebSocket** (/ws)
- **gRPC** (port 50051) with 4 RPC methods
- **Redis Mock** (port 6379) with full RESP protocol
- **MQTT** (port 1883)
- **SMTP** (port 2525)
- **Syslog** (ports 5140/5514)
- **ICAP** (port 1344)
- **TCP/UDP Echo** (ports 9000/9001)

### 📊 Real-Time Monitoring
- **Web Dashboard** - React-based UI with real-time SSE streaming
- **Terminal UI** - 18+ widget types for terminal-based monitoring
- **SSE Broadcasting** - Push events to all connected clients
- **Request History** - Store and inspect recent requests
- **Prometheus Metrics** - Request duration histograms and counters

### 🧠 Advanced Features
- **AI Chat API** - LLM-powered context-aware responses
- **Identity Testing** - OIDC/OAuth provider simulation, JWT debugging
- **GraphQL Endpoint** - Full GraphQL API with introspection attacks
- **JavaScript Execution** - Sandboxed VM for custom code testing
- **Echo Handler** - Reflect all request details for debugging
- **Webhook Sink** - Capture and inspect incoming webhooks

---

## Quick Start

### Prerequisites
- Node.js 23+
- pnpm (or npm/yarn)
- Optional: tcpdump (for PCAP capture), Docker (for containerized deployment)

### Option 1: Full Lab with Chimera (Recommended for Testing)

```bash
# Clone both repositories
cd ~/Developer
git clone https://github.com/NickCrew/apparatus.git
git clone https://github.com/NickCrew/Chimera.git

# Start complete testing environment (Apparatus + Chimera)
cd apparatus
docker compose --profile chimera up

# Or start Apparatus only
docker compose up
```

This starts:
- **Apparatus**: http://localhost:8090/dashboard (testing platform)
- **VulnWeb**: http://localhost:3000 (vulnerable web app) — `chimera` profile only
- **VulnAPI**: http://localhost:5000 (vulnerable API) — `chimera` profile only

→ See [Quick Reference Guide](docs/quick-reference.md) for usage examples

### Option 2: Just Apparatus

```bash
# Clone the repository
git clone https://github.com/NickCrew/apparatus.git
cd apparatus

# Install dependencies
pnpm install

# Generate TLS certificates (self-signed)
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -keyout certs/server.key \
  -out certs/server.crt -days 365 -nodes -subj "/CN=localhost"

# Build the project
pnpm build

# Start the server
pnpm start
```

The server will start on:
- **HTTP/1.1**: http://localhost:8090
- **Dashboard**: http://localhost:8090/dashboard
- **HTTP/2 TLS**: https://localhost:8443
- **gRPC**: localhost:50051
- **WebSocket**: ws://localhost:8090/ws

### Option 3: Docker (Apparatus Only)

```bash
# Build Docker image
docker build -t apparatus:latest ./apps/apparatus

# Run container
docker run -p 8090:8090 -p 8443:8443 -p 50051:50051 apparatus:latest

# Access dashboard at http://localhost:8090/dashboard
```

---

## Usage Examples

### 1. Test Your Web App with the Red Team AI

```bash
# Start autopilot against your app
curl -X POST http://localhost:8090/api/redteam/autopilot/start \
  -H "Content-Type: application/json" \
  -d '{
    "target": "http://myapp.local",
    "config": {
      "interval": 2000,
      "maxIterations": 20,
      "allowedTools": ["chaos.cpu", "cluster.attack", "mtd.rotate"]
    }
  }'

# Check status
curl http://localhost:8090/api/redteam/autopilot/status

# Get results
curl http://localhost:8090/api/redteam/autopilot/reports
```

### 2. Validate Payload Detection

```bash
# Test if your app blocks XSS/SQLi/command injection
curl "http://localhost:8090/redteam/validate?target=http://myapp&path=/search&method=GET"
```

### 3. Run a Chaos Scenario

```bash
# Create a multi-step attack scenario
curl -X POST http://localhost:8090/scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "name": "distributed-attack",
    "steps": [
      { "id": "1", "action": "chaos.cpu", "params": { "duration": 5000 } },
      { "id": "2", "action": "delay", "params": { "duration": 2000 } },
      { "id": "3", "action": "cluster.attack", "params": { "target": "http://127.0.0.1:8090/echo", "rate": 100 } }
    ]
  }'

# Get scenario ID from response, then run it
curl -X POST http://localhost:8090/scenarios/{scenario_id}/run

# Monitor execution
curl http://localhost:8090/scenarios/{scenario_id}/status?executionId={execution_id}
```

### 4. Activate Defense Mechanisms

```bash
# Add WAF rule to block admin panel access
curl -X POST http://localhost:8090/sentinel/rules \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "/admin",
    "action": "block"
  }'

# Enable tarpit for suspicious IPs
# Automatically traps access to /.env, /.git, /wp-admin, /admin.php

# Activate Moving Target Defense
curl -X POST http://localhost:8090/mtd -d '{"prefix": "xyz123"}'
# Now all APIs require xyz123 prefix: /xyz123/echo, /xyz123/healthz, etc.
```

### 5. Monitor Real-Time Traffic

```bash
# Open web dashboard
open http://localhost:8090/dashboard

# Or use terminal UI
pnpm tui

# Or connect SSE client for raw events
curl http://localhost:8090/sse
```

### 6. Capture and Replay Traffic

```bash
# Capture network traffic for 30 seconds
curl "http://localhost:8090/capture.pcap?duration=30&iface=eth0" -o traffic.pcap

# Replay HAR (HTTP Archive) file
curl -X POST http://localhost:8090/replay \
  -H "Content-Type: application/json" \
  -d @requests.har
```

---

## Architecture

### Monorepo Structure

```
apparatus/
├── apps/
│   ├── apparatus/              # Main server
│   │   ├── src/
│   │   │   ├── app.ts          # Express app with all routes
│   │   │   ├── chaos.ts        # CPU/memory/crash chaos handlers
│   │   │   ├── deception.ts    # AI honeypot engine
│   │   │   ├── tarpit.ts       # Tarpit defense
│   │   │   ├── sentinel.ts     # Active Shield (WAF)
│   │   │   ├── scenarios.ts    # Scenario engine
│   │   │   ├── ai/             # AI autopilot and chat
│   │   │   ├── server-*.ts     # Protocol servers (HTTP/2, gRPC, Redis, etc.)
│   │   │   └── dashboard/      # React dashboard (Vite)
│   │   ├── test/               # Integration tests (39+ tests)
│   │   └── dist/               # Compiled output
│   └── cli/                    # CLI application
└── libs/                       # Shared libraries
```

### Middleware Execution Order

1. **MTD** - Polymorphic route hiding
2. **Self-Healing** - Load shedding
3. **Deception** - Honeypot trap
4. **Tarpit** - Slow-down trap
5. **Metrics** - Collection
6. **Compression** - Response compression
7. **Logging** - Pino logger
8. **Body Parsing** - JSON/URL/raw/text
9. **Active Shield** - WAF
10. **CORS** - Cross-origin handling
11. **Routes** - Endpoint handlers
12. **Echo** - Catch-all reflection

---

## Configuration

### Environment Variables

```bash
# Server
PORT_HTTP1=8090                 # HTTP/1.1 port
PORT_HTTP2=8443                 # HTTP/2 TLS port
HOST=0.0.0.0                    # Bind address

# TLS Certificates
TLS_KEY=certs/server.key        # Private key path
TLS_CRT=certs/server.crt        # Certificate path

# Features
DEMO_MODE=true                  # Enable all dangerous endpoints
ENABLE_COMPRESSION=true         # Enable gzip compression
BODY_LIMIT=50mb                 # Request body size limit
CLUSTER_SHARED_SECRET=mysecret  # Cluster auth token

# AI/LLM (for honeypot and autopilot)
ANTHROPIC_API_KEY=sk-...       # Claude API key
```

### Feature Toggles

```bash
# Toggle demo mode (enables all features without localhost check)
curl -X POST http://localhost:8090/_sensor/demo/toggle

# View configuration
curl http://localhost:8090/_sensor/config/integrations

# Update integrations
curl -X PUT http://localhost:8090/_sensor/config/integrations \
  -H "Content-Type: application/json" \
  -d '{"tunnel_url": "https://ngrok.io/...", "tunnel_api_key": "..."}'
```

---

## Testing

### Run All Tests

```bash
pnpm test                       # Run all tests
pnpm test -- --reporter=verbose # Verbose output
pnpm test -- test/chaos.test.ts # Run specific test file
```

### Coverage

Tests cover:
- ✅ Scenario validation (unknown actions, SQL injection patterns, param sanitization)
- ✅ Chaos operations (CPU spike, memory allocation, concurrent spike detection)
- ✅ Webhook capture and trimming (50 webhook limit per hook ID)
- ✅ Attack scenario execution and failure tracking
- ✅ Multi-protocol echo and SSE broadcasting
- ✅ 38+ integration tests across all major features

---

## Use Cases

### 🎓 Security Training
- Simulate realistic attack scenarios for incident response drills
- Train teams on detection and mitigation techniques
- Safe environment for learning security concepts

### 🔒 Defense Validation
- Test WAF/IDS/IPS effectiveness against known attack patterns
- Validate SIEM detection rules
- Measure incident response time

### 🧪 Tool Testing
- Evaluate security scanning tools (Burp, OWASP ZAP, Nessus)
- Test SIEMs, DLP systems, log aggregation
- Benchmark performance under chaos conditions

### 🚀 Chaos Engineering
- Inject faults to test application resilience
- Validate auto-recovery mechanisms
- Measure system performance degradation

### 🔍 Security Research
- Model attack vectors and defense patterns
- Test novel security concepts
- Develop and validate exploitation techniques

### 🏢 Red Team Operations
- Run automated red team campaigns with AI autopilot
- Generate realistic attack scenarios
- Validate security controls comprehensively

---

## Technology Stack

| Component | Tech |
|-----------|------|
| **Runtime** | Node.js 23+ |
| **Language** | TypeScript (strict) |
| **Framework** | Express.js |
| **Protocols** | HTTP/1.1, HTTP/2, gRPC, WebSocket, Redis, MQTT, SMTP, Syslog, ICAP |
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Terminal UI** | Blessed + blessed-contrib |
| **Monitoring** | Prometheus metrics, Pino logging |
| **Testing** | Vitest + Supertest |
| **Build** | Nx monorepo, TypeScript compiler, Vite |
| **Package Manager** | pnpm |

---

## Security Notice

⚠️ **Apparatus is designed for testing and lab environments only.** It is NOT suitable for production use:

- All data is stored in-memory (no persistence)
- No authentication/authorization on most endpoints
- Deliberately vulnerable features (victim app, honeypots, chaos)
- No audit trails or compliance features
- Run only on isolated networks or localhost

Use Apparatus in:
- ✅ Development environments
- ✅ Lab networks
- ✅ Isolated test systems
- ✅ Docker containers
- ✅ VMs on your machine

Do NOT use in:
- ❌ Production systems
- ❌ Public-facing networks
- ❌ Shared infrastructure
- ❌ Systems with real data

---

## Contributing

Contributions are welcome! Areas for expansion:

- [ ] Additional protocol servers
- [ ] More chaos engineering scenarios
- [ ] Enhanced AI models for autopilot
- [ ] Persistence layer (PostgreSQL)
- [ ] Kubernetes operator
- [ ] Additional defense mechanisms
- [ ] CLI enhancements
- [ ] Dashboard visualizations

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Related Projects

Apparatus is designed to work seamlessly with **Chimera**:

- **[Chimera](../Chimera)** - Vulnerable web application and REST API with 450+ endpoints and 12 UIs
  - Provides realistic attack targets for security testing
  - Includes XSS, SQLi, CSRF, auth bypass, insecure deserialization vulnerabilities
  - Runs alongside Apparatus via `docker compose --profile chimera up`
  - Independent monorepo for separate development and deployment

Use `docker compose --profile chimera up` in Apparatus to run both platforms together. Without the profile, only Apparatus starts.

---

## License

MIT License - See [LICENSE](LICENSE) for details

---

## Documentation

- **[Quick Reference](docs/quick-reference.md)** - Common commands, endpoints, and scenarios
- **[Features](docs/features.md)** - Complete catalog of 58+ features
- **[Architecture](docs/architecture.md)** - System design, data flow, and components
- **[API Reference](docs/api.md)** - Detailed endpoint documentation
- **[Related: Chimera](../Chimera)** - Vulnerable web app and API (450+ endpoints, 12 UIs)

---

## Support

- 📖 [Full Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/NickCrew/apparatus/issues)
- 💬 [Discussions](https://github.com/NickCrew/apparatus/discussions)
- 📧 Contact: nick@atlascrew.dev

---

## Acknowledgments

Apparatus builds on ideas from:
- OWASP WebGoat (intentional vulnerabilities)
- Chaos Monkey (fault injection)
- Gremlin (chaos engineering)
- Honeypots and deception research
- Red team methodology and tools

---

**Made with ❤️ for the security community**
