# Threat Intel Apparatus Feature Reference

Complete reference of all Threat Intel Apparatus capabilities, endpoints, and companion tools.

## Quick Stats

- **50+ HTTP Endpoints**
- **13 Protocol Servers** (HTTP/1.1, HTTP/2, H2C, WebSocket, gRPC, MQTT, TCP, UDP, Redis, SMTP, Syslog, ICAP, Bad SSL)
- **4 Companion Tools** (Wire Tap, Cloud Metadata Mock, Chaos Proxy, LLM Honeypot)
- **5 Defense Modules** (Tarpit, Deception, MTD, Sentinel, Self-Healing)

---

## HTTP Endpoints

### Core Echo & Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/*` | ALL | Echo handler - returns request details (headers, body, query, TLS) |
| `/healthz` | GET | Simple health check (`{"status":"ok"}`) |
| `/health/pro` | GET | Detailed health with self-healing status |
| `/metrics` | GET | Prometheus metrics (request counts, latency histograms) |
| `/history` | GET | Request history buffer (last N requests) |
| `/history` | DELETE | Clear request history |
| `/sse` | GET | Server-Sent Events stream for real-time request monitoring |
| `/sysinfo` | GET | System information (hostname, platform, CPU, memory) |

### Dashboard & Documentation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dashboard` | GET | Quarterdeck web UI (HTML dashboard) |
| `/docs` | GET | Swagger/OpenAPI interactive documentation |

### Identity & Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/jwks.json` | GET | JWKS endpoint for JWT verification |
| `/.well-known/openid-configuration` | GET | OIDC discovery document |
| `/auth/token` | ALL | Mint JWT tokens with custom claims |
| `/debug/jwt` | GET | Decode and analyze JWT tokens |

### GraphQL

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/graphql` | ALL | GraphQL endpoint with echo query and introspection |

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/hooks/:id` | ALL | Webhook sink - receive any payload at unique ID |
| `/hooks/:id/inspect` | GET | View requests received at webhook |

### Network & Infrastructure

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dns` | GET | DNS resolver (`?target=google.com&type=A`) |
| `/ping` | GET | TCP connectivity check (`?target=host:port`) |
| `/proxy` | ALL | SSRF/Egress proxy (forwards to `?url=`) |
| `/ratelimit` | GET | Rate limit status and configuration |

### Data Generation & Testing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/generate` | GET | Stream random data for download testing |
| `/sink` | POST | Throughput test (discards data, measures speed) |
| `/dlp` | GET | DLP test data (`?type=cc\|ssn\|email`) |
| `/malicious` | GET | EICAR test file for AV testing |

### Chaos Engineering

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chaos/cpu` | GET | CPU spike (`?duration=5000&intensity=8`) |
| `/chaos/memory` | GET | Memory allocation (`?size=104857600&duration=30000`) |
| `/chaos/crash` | POST | Crash the server (requires confirmation) |

### Key-Value Store & Scripting

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/kv/:key` | GET | Get value by key |
| `/kv/:key` | PUT/POST | Set value for key |
| `/kv/:key` | DELETE | Delete key |
| `/script` | POST | Execute sandboxed JavaScript |

### Forensics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/capture.pcap` | GET | Download PCAP capture |
| `/replay` | POST | Replay HAR file requests |

### Security Testing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/redteam/validate` | GET | Run security scan against target URL |
| `/victim/*` | ALL | Intentionally vulnerable endpoints (see Victim section) |

### Defense Modules

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tarpit` | GET | List tarpitted IPs |
| `/tarpit/release` | POST | Release IP from tarpit |
| `/deception/history` | GET | View honeypot trigger history |
| `/deception/history` | DELETE | Clear deception history |
| `/sentinel/rules` | GET | List Active Shield rules |
| `/sentinel/rules` | POST | Add virtual patching rule |
| `/sentinel/rules/:id` | DELETE | Remove rule |
| `/mtd` | ALL | Moving Target Defense control |
| `/threat-intel/status` | GET | Risk Server integration status |

### Cluster Coordination

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cluster/members` | GET | List cluster members |
| `/cluster/attack` | POST | Coordinated attack across cluster |
| `/cluster/attack/stop` | POST | Stop coordinated cluster attack |

### Ghosts (Traffic + API Mocker)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ghosts` | GET | Ghost state + virtual mocks list (`{ status, ghosts }`) |
| `/ghosts` | POST | Create a virtual Ghost endpoint |
| `/ghosts/:id` | DELETE | Remove a virtual Ghost endpoint |
| `/ghosts/start` | POST | Start synthetic ghost traffic |
| `/ghosts/stop` | POST | Stop synthetic ghost traffic |

### Local-Only Security Gate

The following mutation endpoints are protected by `securityGate` (localhost-only unless `DEMO_MODE=true`): cluster attack controls, ghost creation/deletion, ghost traffic start/stop, scenarios, drills, simulator, autopilot, and token forge/verify.

### Breaking Behavior Notes

- Default bind host is `127.0.0.1` (not `0.0.0.0`). For Docker/Kubernetes/remote access, set `HOST=0.0.0.0`.
- `/cluster/attack` and `/cluster/attack/stop` now require localhost access (or `DEMO_MODE=true`).
- Ghost mutation routes (`/ghosts`, `/ghosts/:id`, `/ghosts/start`, `/ghosts/stop`) require localhost access (or `DEMO_MODE=true`).
- Legacy `GET /ghosts?action=start|stop` remains for compatibility, but `POST /ghosts/start|stop` is preferred.

### Labs (Experimental)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/chat` | POST | AI chat interface |
| `/api/escape/scan` | POST | Escape Artist egress scan |
| `/api/simulator/supply-chain` | POST | Supply chain attack simulation |
| `/api/infra/imposter` | GET | Cloud Imposter status proxy |
| `/api/infra/sidecar` | GET | Toxic Sidecar status proxy |

---

## Victim Module (Vulnerable Endpoints)

Intentionally vulnerable endpoints for security testing:

| Endpoint | Vulnerability | Example |
|----------|--------------|---------|
| `/victim/login` | SQL Injection | `?user=admin' OR '1'='1` |
| `/victim/calc` | Remote Code Execution | `?expr=2+2` |
| `/victim/guestbook` | Reflected XSS | `?name=<script>alert(1)</script>` |

---

## Protocol Servers

| Protocol | Default Port | Description |
|----------|-------------|-------------|
| HTTP/1.1 | 8080 | Main Express server |
| HTTP/2 (TLS) | 8443 | Secure HTTP/2 with ALPN |
| HTTP/2 (H2C) | - | Cleartext HTTP/2 (optional, `H2C=true`) |
| WebSocket | 8080 | Attached to HTTP/1.1 server |
| gRPC | 50051 | Protocol buffers echo service |
| MQTT | 1883 | Aedes MQTT broker |
| TCP Echo | 9000 | Raw TCP echo |
| UDP Echo | 9001 | Raw UDP echo |
| Redis Mock | 6379 | RESP protocol (GET, SET, PING, INFO) |
| SMTP Sink | 2525 | Email receiver (HELO, MAIL FROM, RCPT TO, DATA) |
| Syslog | 5514 | UDP syslog receiver (RFC 3164) |
| ICAP | 1344 | AV/DLP integration (REQMOD, RESPMOD, EICAR detection) |
| Bad SSL | 8444 | Intentionally untrusted TLS for client testing |

---

## Companion Tools

### Egress Validator

**Codename**: Escape Artist
**Command**: `npm run escape`
**Port**: CLI tool (no server)

Tests egress filtering and data exfiltration paths:

| Method | Description |
|--------|-------------|
| ICMP | Ping to 8.8.8.8 |
| DNS | A/TXT resolution, subdomain exfiltration |
| HTTP/HTTPS | Public HTTP egress tests |
| TCP | Port connectivity (configurable ports) |
| UDP | UDP egress tests |
| WebSocket | WS/WSS connection tests |

**DLP Generators**: `cc` (credit card), `ssn`, `email`

### Cloud Imposter

**Codename**: Cloud Imposter
**Command**: `npm run imposter`
**Port**: 16925

Mocks cloud metadata services:

| Endpoint | Provider | Description |
|----------|----------|-------------|
| `/latest/api/token` | AWS | IMDSv2 token |
| `/latest/meta-data/*` | AWS | Instance metadata |
| `/latest/meta-data/iam/security-credentials/:role` | AWS | Honey credentials |
| `/computeMetadata/v1/*` | GCP | GCP metadata |
| `/computeMetadata/v1/instance/service-accounts/default/token` | GCP | Honey token |

### Chaos Proxy

**Codename**: Toxic Sidecar
**Command**: `npm run sidecar`
**Port**: 8081

Transparent proxy with fault injection:

| Mode | Header | Description |
|------|--------|-------------|
| `latency` | `X-Toxic-Mode: latency` | 500-2500ms delay |
| `error_500` | `X-Toxic-Mode: error_500` | Return 500 immediately |
| `slow_drip` | `X-Toxic-Mode: slow_drip` | 100ms per chunk |
| `corrupt_body` | `X-Toxic-Mode: corrupt_body` | 10% bit-flip corruption |

### Interactive Deception

**Codename**: AI Honeypot
**Access**: `/admin` → `/console`

LLM-powered interactive shell simulation:

| Provider | Config |
|----------|--------|
| Ollama | `OLLAMA_HOST` (default: `http://localhost:11434`) |
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |

---

## Defense Modules

### Tarpit

Slow-drip responses for suspicious IPs. Detected attackers receive 1 byte every 10 seconds.

**Triggers**: Honeypot routes, Risk Server sync

### Deception

Fake honeypot responses for trap routes (`/admin`, `/.env`, `/wp-admin`, etc.)

### Moving Target Defense (MTD)

Route obfuscation - periodically rotates endpoint paths.

### Active Shield (Sentinel)

Virtual patching with regex-based rules. Block requests matching attack patterns.

### Self-Healing

Circuit breaker and QoS controls. Automatically degrades under load.

---

## Risk Server Integration (Threat Intel)

Bidirectional integration with the Risk Server:

| Direction | Endpoint | Description |
|-----------|----------|-------------|
| Outbound | `POST /_sensor/report` | Report threat signals |
| Inbound | `GET /_sensor/entities` | Sync blocklist (every 30s) |

**Signal Types**: `honeypot_hit`, `trap_trigger`, `protocol_probe`, `dlp_match`

---

## Response Control

Control echo response behavior via headers or query params:

| Control | Header | Query | Example |
|---------|--------|-------|---------|
| Delay | `X-Echo-Delay` | `?delay=500` | Inject 500ms latency |
| Status | `X-Echo-Status` | `?status=418` | Force status code |
| Headers | `X-Echo-Set-Header` | - | Set response headers (JSON) |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Bind address |
| `PORT_HTTP1` | `8090` | HTTP/1.1 port |
| `PORT_HTTP2` | `8443` | HTTP/2 TLS port |
| `PORT_TCP` | `9000` | TCP echo port |
| `PORT_UDP` | `9001` | UDP echo port |
| `PORT_GRPC` | `50051` | gRPC port |
| `PORT_REDIS` | `6379` | Redis mock port |
| `PORT_SYSLOG_ALT` | `5140` | Alternate syslog port |
| `H2C` | `false` | Enable HTTP/2 cleartext |
| `CORS` | `true` | Enable CORS headers |
| `COMPRESSION` | `true` | Enable gzip |
| `BODY_LIMIT` | `20mb` | Max body size |
| `CLUSTER_SHARED_SECRET` | unset | Shared secret for signed cluster ATTACK/STOP commands |
| `CLUSTER_ATTACK_ALLOWLIST` | unset | Comma-separated host allowlist (exact or `.suffix`) for cluster attack targets |
| `GHOST_ALLOWED_PORTS` | unset | Extra comma-separated loopback ports allowed for ghost traffic targets |
| `RISK_SERVER_URL` | `http://localhost:4100` | Threat Intel URL |
| `SENSOR_ID` | Auto-generated | Sensor identifier |

When running in Docker/Kubernetes or from remote hosts, set `HOST=0.0.0.0` explicitly.

---

## CLI Access

All features accessible via [Apparatus CLI](../../apparatus-cli/README.md):

```bash
# Core
apparatus health
apparatus echo /api/test

# Chaos
apparatus chaos cpu --duration 5000
apparatus chaos memory --size 100mb

# Security
apparatus security redteam --target https://api.example.com
apparatus victim sqli "admin' OR '1'='1"

# Defense
apparatus defense tarpit list
apparatus defense mtd status
apparatus defense cluster members

# Labs
apparatus labs ai-chat "Hello"
apparatus labs escape-scan --dlp cc
apparatus labs imposter-creds
apparatus labs supply-chain
```

---

## TUI Access

Terminal dashboard: `npm run tui`

| Key | Action |
|-----|--------|
| `a` | AI Chat modal |
| `e` | Escape Artist modal |
| `f` | Filter requests |
| `x` | Release tarpit IP |
| `R` | Reconnect SSE |
| `q` | Quit |

---

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) - System diagrams
- [USER_GUIDE.md](USER_GUIDE.md) - Getting started guide
