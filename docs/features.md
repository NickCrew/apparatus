# Apparatus: Complete Feature Catalog

Comprehensive inventory of all 58+ major features across Apparatus cybersecurity testing and simulation platform.

---

## DEFENSE & MITIGATION (4 features)

### Tarpit Defense
- **What it does**: Honeypot defense that traps attackers in slow-response connections, consuming their time and resources. Detects attempts to access common honeypot paths and holds connections open indefinitely.
- **Key files**: `apps/apparatus/src/tarpit.ts`
- **Handlers**: `tarpitMiddleware`, `tarpitListHandler`, `tarpitReleaseHandler`
- **Capabilities**:
  - Monitors trap paths: `/wp-admin`, `/.env`, `/.git`, `/admin.php`
  - Sends 1 byte every 10 seconds to keep attacker connections alive
  - Tracks IPs for time-in-tarpit metrics
  - Release individual IPs or all trapped IPs via API
  - Real-time broadcast of tarpit events

### Active Shield (Virtual Patching/WAF)
- **What it does**: Middleware-based WAF that blocks malicious requests based on regex pattern rules. Can auto-detect or manually define patterns.
- **Key files**: `apps/apparatus/src/sentinel.ts`
- **Handlers**: `activeShieldMiddleware`, `sentinelHandler`
- **Capabilities**:
  - Add/list/delete blocking rules via POST/GET/DELETE on `/sentinel/rules`
  - Pattern matching on both URL and request body
  - Dual action: "block" or "log"
  - Rules tracked with unique IDs and source (auto/manual)

### Self-Healing & QoS (Quality of Service)
- **What it does**: Autonomous health monitoring and load shedding. Monitors event loop lag and automatically sheds traffic when system is overloaded.
- **Key files**: `apps/apparatus/src/self-healing.ts`
- **Handlers**: `selfHealingMiddleware`, `getHealthStatus`
- **Capabilities**:
  - Real-time event loop lag monitoring (perf_hooks)
  - Three health states: healthy (<50ms lag), degraded (50-200ms), critical (>200ms)
  - Auto-shed heavy routes (e.g., `/generate`, `/chaos`) at degraded state
  - Total traffic rejection at critical state with retry-after headers
  - Health status endpoint at `/health/pro`

### Moving Target Defense (MTD) - Polymorphic Routing
- **What it does**: Dynamic API hiding. Requires a randomly-rotated prefix for all API calls, rendering static scanning useless.
- **Key files**: `apps/apparatus/src/mtd.ts`
- **Handlers**: `mtdHandler`, `polymorphicRouteMiddleware`
- **Capabilities**:
  - Rotate prefix via POST to `/mtd`
  - Rewrite URLs dynamically (e.g., `/abc123/echo` -> `/echo`)
  - Return 404 if prefix missing
  - Exception routes: `/mtd`, `/health` always accessible

---

## DECEPTION & HONEYPOTS (2 features)

### Deception Engine (AI-Powered Honeypot)
- **What it does**: Multi-layer honeypot that serves fake admin consoles, fake databases, and shell terminals with AI-driven responses. Detects and records attacker interactions.
- **Key files**: `apps/apparatus/src/deception.ts`
- **Handlers**: `deceptionHandler`, `deceptionHistoryHandler`, `deceptionClearHandler`
- **Deception Routes**:
  - `/admin` - Fake admin login console
  - `/console` - Interactive shell terminal (HTML)
  - `/console/api` - AI-driven shell command execution with Linux persona
  - `/phpmyadmin` - Database admin honeypot
  - `/.env` - Fake credentials file
  - `/etc/passwd` - Fake system file
  - SQLi detection - Returns fake DB schema on SQL keywords
- **Event Recording**:
  - Honeypot hits, shell commands, SQLi probes
  - IP tracking, timestamps, command details
  - Max 100 events stored in memory
  - Real-time SSE broadcast to dashboard
- **AI Features**:
  - Uses AI chat with "linux_terminal" persona for command execution
  - Contextual responses to attacker commands

### Ghost Traffic Generation
- **What it does**: Generates synthetic legitimate-looking traffic to confuse attribution and analytics.
- **Key files**: `apps/apparatus/src/ghosting.ts`
- **Handlers**: `ghostHandler`
- **Capabilities**:
  - Start/stop ghost traffic on demand
  - Random user agents (Chrome, Firefox, Safari)
  - Random endpoints (`/echo`, `/healthz`, `/docs`, `/`, `/history`)
  - Configurable delay between requests
  - Target any URL (default: localhost)

---

## CHAOS ENGINEERING (4 features)

### CPU Spike
- **What it does**: Intentionally triggers high CPU utilization for testing system resilience.
- **Key files**: `apps/apparatus/src/chaos.ts`
- **Handlers**: `cpuSpikeHandler`, `triggerCpuSpike`, `stopCpuSpike`
- **Capabilities**:
  - Duration configurable (default 5000ms, range 250-120000ms)
  - Supports both GET query param and POST body
  - Prevents overlapping spikes (409 conflict response)
  - Can be stopped via tool executor

### Memory Spike
- **What it does**: Allocates large buffers to simulate memory exhaustion attacks and test OOM handling.
- **Key files**: `apps/apparatus/src/chaos.ts`
- **Handlers**: `memorySpikeHandler`, `allocateMemorySpike`, `clearMemorySpike`
- **Capabilities**:
  - Allocate: 1-4096 MB (default 100MB)
  - Action: `allocate` or `clear`
  - Manual garbage collection trigger (`--expose-gc`)
  - Tracks cumulative allocated chunks

### Crash Handler
- **What it does**: Gracefully triggers process exit to test restart mechanisms.
- **Key files**: `apps/apparatus/src/chaos.ts`
- **Handlers**: `crashHandler`, `scheduleCrash`
- **Capabilities**:
  - 1-second graceful shutdown window
  - Scheduled via `process.exit(1)`

### EICAR Test File
- **What it does**: Serves the standard EICAR antivirus test string for AV/DLP testing.
- **Key files**: `apps/apparatus/src/chaos.ts`
- **Handlers**: `eicarHandler`
- **Endpoint**: `/malicious`

---

## NETWORK & DIAGNOSTICS (7 features)

### DNS Resolver
- **What it does**: Performs various DNS queries (A, AAAA, MX, TXT, SRV, NS, CNAME) for network diagnostics.
- **Key files**: `apps/apparatus/src/infra-debug.ts`
- **Handlers**: `dnsHandler`
- **Endpoint**: `/dns?target=example.com&type=A`
- **Capabilities**: Comprehensive DNS record type support, error reporting

### TCP Port Ping
- **What it does**: Checks connectivity to remote hosts via TCP socket.
- **Key files**: `apps/apparatus/src/infra-debug.ts`
- **Handlers**: `pingHandler`
- **Endpoint**: `/ping?target=host:port`
- **Capabilities**: 2-second timeout, latency measurement

### Bandwidth/Load Generator
- **What it does**: Generates arbitrary amounts of data (1B to 1GB) for bandwidth testing.
- **Key files**: `apps/apparatus/src/generator.ts`
- **Handlers**: `generatorHandler`
- **Endpoint**: `/generate?size=100mb&chunked=true`
- **Modes**:
  - Non-chunked: Content-Length header, buffered streaming
  - Chunked: No Content-Length, 500ms chunks (10% per chunk)

### Data Sink
- **What it does**: Discards uploaded data and reports throughput metrics.
- **Key files**: `apps/apparatus/src/sink.ts`
- **Handlers**: `sinkHandler`
- **Endpoint**: `POST /sink`
- **Metrics**: Bytes received, duration, Mbps throughput

### Network Packet Capture (PCAP)
- **What it does**: Captures network traffic via tcpdump for forensic analysis.
- **Key files**: `apps/apparatus/src/forensics.ts`
- **Handlers**: `pcapHandler`
- **Endpoint**: `/capture.pcap?duration=30&iface=eth0`
- **Requirements**: tcpdump binary, NET_ADMIN capability
- **Output**: Binary PCAP file, auto-stops after duration

### HAR Replay
- **What it does**: Replays HTTP requests from HAR (HTTP Archive) files.
- **Key files**: `apps/apparatus/src/forensics.ts`
- **Handlers**: `harReplayHandler`
- **Endpoint**: `POST /replay`
- **Input**: HAR JSON structure with request details
- **Output**: Status codes and errors for each replayed request

### Proxy/SSRF Tester
- **What it does**: Proxies requests to arbitrary URLs for testing SSRF vulnerabilities and proxy behavior.
- **Key files**: `apps/apparatus/src/proxy.ts`
- **Handlers**: `proxyHandler`
- **Endpoint**: `/proxy?url=http://target.com/path`
- **Security**: 5-second timeout, localhost-only (via securityGate)

---

## SECURITY TESTING & RED TEAM (2 features)

### Red Team Payload Validator
- **What it does**: Tests target application's resilience to common injection attacks (XSS, SQLi, path traversal, command injection, NoSQL injection).
- **Key files**: `apps/apparatus/src/redteam.ts`
- **Handlers**: `redTeamValidateHandler`
- **Endpoint**: `/redteam/validate?target=http://app&path=/api/search&method=GET`
- **Payloads**:
  - XSS: script tags, JavaScript handlers, img onerror
  - SQLi: UNION SELECT, OR '1'='1', admin --, DROP TABLE
  - Path traversal: ../, URL-encoded variants
  - Command injection: pipes, backticks, $()
  - NoSQL: {$gt}, {$ne}
- **Response**: Detailed report with per-payload blocks/passes

### AI Autopilot (Red Team Agent)
- **What it does**: Autonomous AI agent that explores and tests a target application in a controlled loop, making decisions about which tools to execute.
- **Key files**: `apps/apparatus/src/ai/redteam.ts`
- **Endpoints**:
  - `GET /api/redteam/autopilot/config` - Get current config
  - `POST /api/redteam/autopilot/start` - Start new session
  - `POST /api/redteam/autopilot/stop` - Graceful stop
  - `POST /api/redteam/autopilot/kill` - Immediate terminate
  - `GET /api/redteam/autopilot/status` - Current status
  - `GET /api/redteam/autopilot/reports` - Historical reports
- **Capabilities**:
  - AI-driven tool selection (cluster attack, CPU/memory chaos, MTD rotation)
  - Thoughts, findings, and actions tracking
  - Session persistence with execution snapshots
  - Configurable interval, max iterations, allowed tools
  - Blocked endpoints (security gates)
  - Reports with timeline of actions and findings

---

## SCENARIO ENGINE (1 feature)

### Scenario Engine
- **What it does**: Template-based automation for multi-step attack or defense sequences.
- **Key files**: `apps/apparatus/src/scenarios.ts`, `apps/apparatus/src/tool-executor.ts`
- **Endpoints**:
  - `GET /scenarios` - List all scenarios
  - `POST /scenarios` - Save/update scenario
  - `POST /scenarios/:id/run` - Execute scenario
  - `GET /scenarios/:id/status` - Execution status
- **Features**:
  - Store up to 200 scenarios
  - 50 steps per scenario max
  - Sanitized tool params
  - Execution IDs for tracking
  - Status: running, completed, failed
  - Per-step delay support
  - Tools: chaos.cpu, chaos.memory, cluster.attack, mtd.rotate, delay

---

## IDENTITY & AUTHENTICATION (2 features)

### OIDC/OAuth Discovery & Token Minting
- **What it does**: Simulates an OIDC provider for testing OAuth/OIDC flows.
- **Key files**: `apps/apparatus/src/oidc.ts`
- **Endpoints**:
  - `GET /.well-known/openid-configuration` - OIDC discovery
  - `GET /.well-known/jwks.json` - JWKS endpoint
  - `POST /auth/token` - Token generation
- **Features**:
  - RS256 JWT signing with in-memory key pair
  - Custom claims support (via request body)
  - 1-hour token expiration
  - Realistic OIDC response format

### JWT Debug
- **What it does**: Decodes and inspects JWT tokens for debugging.
- **Key files**: `apps/apparatus/src/jwt-debug.ts`
- **Endpoint**: `/debug/jwt`

---

## DATA LOSS PREVENTION & SENSITIVE DATA (1 feature)

### DLP Generator
- **What it does**: Generates realistic samples of sensitive data (credit cards, SSNs, emails) and fake SQL errors for testing DLP systems.
- **Key files**: `apps/apparatus/src/dlp.ts`
- **Endpoint**: `/dlp?type=cc|ssn|email|sql`
- **Outputs**:
  - Credit Card: Valid Luhn checksum, Visa-like (16 digits)
  - SSN: Valid format
  - Email: Comma-separated list
  - SQL: HTML-formatted error with DROP TABLE syntax

---

## RATE LIMITING & TRAFFIC CONTROL (1 feature)

### Rate Limiter
- **What it does**: Demonstrates rate limiting behavior (10 requests per minute per IP).
- **Key files**: `apps/apparatus/src/ratelimit.ts`
- **Endpoint**: `/ratelimit`
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Response**: 429 when exceeded

---

## API & QUERY INTERFACES (3 features)

### GraphQL Endpoint
- **What it does**: Full GraphQL API for testing GraphQL-specific attacks (depth attacks, introspection).
- **Key files**: `apps/apparatus/src/graphql.ts`
- **Endpoint**: `/graphql`
- **Queries**:
  - `echo(message)` - Recursive type with arbitrary depth nesting
  - `complexData` - Introspection-heavy field

### Echo Handler (Universal Reflection)
- **What it does**: Reflects back all request details for debugging and analysis.
- **Key files**: `apps/apparatus/src/echoHandler.ts`
- **Endpoint**: `/*` (catch-all)
- **Reflected Data**:
  - Method, URL, path, query, HTTP version
  - Headers, client IP, IPs list
  - Body (JSON, binary as base64)
  - Multipart file metadata
  - TLS/HTTPS details (protocol, cipher, client cert)
  - Latency measurement
- **Injection Params**:
  - `?delay=1000` - Add latency
  - `?status=500` - Custom status code
  - `X-Echo-Set-Header` - Inject response headers
  - Broadcasted to all SSE clients

### SSE (Server-Sent Events) Broadcasting
- **What it does**: Real-time push of request/event data to connected dashboard clients.
- **Key files**: `apps/apparatus/src/sse-broadcast.ts`, `apps/apparatus/src/echoHandler.ts`
- **Endpoint**: `GET /sse`
- **Events**:
  - Request reflections (every non-SSE request)
  - Deception hits, tarpit events, cluster attacks
  - Webhook receptions, metrics
- **Features**:
  - Max 1000 SSE clients (DoS protection)
  - Heartbeat every 30 seconds
  - Automatic reconnect capability (client-side)

---

## WEBHOOKS & EVENTS (1 feature)

### Webhook Sink
- **What it does**: Captures incoming webhooks for testing and inspection.
- **Key files**: `apps/apparatus/src/webhook.ts`
- **Endpoints**:
  - `POST /hooks/:id` - Receive webhook
  - `GET /hooks/:id/inspect` - View stored webhooks
- **Storage**: 50 webhooks per hook ID
- **Data**: Timestamp, method, headers, body, query, IP

---

## SYSTEM & INFRASTRUCTURE (4 features)

### System Info Endpoint
- **What it does**: Reports system and process information.
- **Key files**: `apps/apparatus/src/sysinfo.ts`
- **Endpoint**: `/sysinfo`
- **Returns**: Hostname, OS, CPUs, memory (total/free/process), load avg, network interfaces, node version, sanitized env vars

### Request History
- **What it does**: Stores recent echoed requests for post-analysis.
- **Key files**: `apps/apparatus/src/history.ts`
- **Endpoints**:
  - `GET /history` - Retrieve history
  - `DELETE /history` - Clear history

### Prometheus Metrics
- **What it does**: Exposes operational metrics in Prometheus format.
- **Key files**: `apps/apparatus/src/metrics.ts`
- **Endpoint**: `/metrics`
- **Metrics**:
  - `http_request_duration_microseconds` - Request latency histogram
  - `http_requests_total` - Request count by method/route/status

### Configuration Management
- **What it does**: View and toggle demo mode and integration settings.
- **Key files**: `apps/apparatus/src/app.ts`
- **Endpoints**:
  - `GET /_sensor/demo` - View demo mode status
  - `POST /_sensor/demo/toggle` - Toggle demo mode
  - `GET /_sensor/config/integrations` - View tunnel config
  - `PUT /_sensor/config/integrations` - Update tunnel URL and API key

---

## HEALTH CHECKS (1 feature)

### Health Checks
- **Key files**: `apps/apparatus/src/app.ts`, `apps/apparatus/src/self-healing.ts`
- **Endpoints**:
  - `GET /healthz` - Basic health (always 200 OK)
  - `GET /health/pro` - Pro health with lag metrics

---

## DISTRIBUTED SYSTEMS & CLUSTERING (1 feature)

### Cluster Attack Orchestration
- **What it does**: Coordinates CPU/memory attacks across multiple nodes in a cluster using UDP gossip protocol.
- **Key files**: `apps/apparatus/src/cluster.ts`
- **Endpoints**:
  - `POST /cluster/attack` - Broadcast attack to cluster
  - `POST /cluster/attack/stop` - Stop cluster attack
  - `GET /cluster/members` - List discovered cluster members
- **Features**:
  - UDP gossip-based node discovery (port 7946)
  - HMAC-SHA256 auth (CLUSTER_SHARED_SECRET env var)
  - Beacon interval: 5 seconds
  - Node TTL: 15 seconds
  - Atomic attack coordination

---

## MULTI-PROTOCOL SERVERS (11 servers)

### HTTP/1.1 Server
- **Port**: 8090 (configurable via `PORT_HTTP1`)
- **Features**: Standard HTTP/1.1 with all above endpoints
- **Key file**: `apps/apparatus/src/server-http1.ts`

### HTTP/2 TLS Server
- **Port**: 8443 (configurable via `PORT_HTTP2`)
- **Protocol**: HTTP/2 over TLS
- **Key file**: `apps/apparatus/src/server-http2.ts`
- **Certificates**: Configurable via `TLS_KEY` and `TLS_CRT` env vars

### HTTP/2 Cleartext (h2c)
- **Port**: 8091 (PORT_HTTP1 + 1)
- **Protocol**: HTTP/2 without TLS (for testing h2c clients)
- **Key file**: `apps/apparatus/src/server-http2.ts`

### WebSocket Server
- **Endpoint**: `/ws` (on HTTP/1.1 server)
- **Key file**: `apps/apparatus/src/server-ws.ts`
- **Upgrade**: WebSocket handshake support

### gRPC Server
- **Port**: 50051
- **Methods**: UnaryEcho, ServerStreamingEcho, ClientStreamingEcho, BidirectionalStreamingEcho
- **Key file**: `apps/apparatus/src/server-grpc.ts`
- **Proto**: `src/../proto/echo.proto`

### Redis Mock Server
- **Port**: 6379
- **Key file**: `apps/apparatus/src/server-redis.ts`
- **Commands**: GET, SET, DEL, KEYS, LPUSH, LRANGE, LLEN, etc.
- **RESP Protocol**: Full Redis Serialization Protocol
- **Storage**: In-memory key-value store

### SMTP Server
- **Port**: 2525
- **Key file**: `apps/apparatus/src/server-smtp.ts`
- **Features**: Email message capture and inspection

### MQTT Server
- **Port**: 1883
- **Key file**: `apps/apparatus/src/server-mqtt.ts`
- **Protocol**: MQTT message broker

### ICAP Server
- **Port**: 1344 (Internet Content Adaptation Protocol)
- **Key file**: `apps/apparatus/src/server-icap.ts`
- **Use**: Content scanning simulation

### TCP/UDP Echo Servers
- **Ports**: 9000 (TCP), 9001 (UDP)
- **Key file**: `apps/apparatus/src/server-l4.ts`
- **Feature**: Layer 4 protocol testing

### Syslog Server
- **Ports**: 5140 (TCP), 5514 (UDP)
- **Key file**: `apps/apparatus/src/server-syslog.ts`
- **Protocol**: RFC 3164 Syslog

### Bad SSL Server
- **Port**: 8444
- **Key file**: `apps/apparatus/src/server-bad-ssl.ts`
- **Purpose**: Test TLS certificate validation

### Other Protocols
- **Key file**: `apps/apparatus/src/server-protocols.ts`
- **Includes**: Additional protocol implementations

---

## ADVANCED & EXPERIMENTAL FEATURES (8 features)

### AI Chat API
- **What it does**: LLM-powered chat for context-aware responses (used in honeypot console).
- **Endpoint**: `POST /api/ai/chat`
- **Input**: `{ sessionId, system, message }`
- **Output**: `{ response }`
- **Key file**: `apps/apparatus/src/ai/client.ts`

### Escape Artist (Container Escape Testing)
- **What it does**: Tests egress channels and container escape vectors.
- **Endpoint**: `POST /api/escape/scan`
- **Input**: Payload type config
- **Output**: Check results with status and latency
- **Key file**: `apps/apparatus/src/escape/index.ts`

### Cloud Imposter (Credential Harvester)
- **What it does**: Simulates AWS and GCP credential endpoints for testing cloud credential theft.
- **Endpoints**:
  - AWS: `GET /` (metadata server simulation)
  - GCP: `GET /` (token endpoint)
- **Key files**:
  - `apps/apparatus/src/imposter/index.ts`
  - `apps/apparatus/src/imposter/providers/` (AWS, GCP, Azure providers)
- **Outputs**:
  - AWS credentials JSON
  - GCP access token with expiration

### Supply Chain Attack Simulator
- **What it does**: Simulates package manager poisoning and dependency injection attacks.
- **Endpoint**: `POST /api/simulator/supply-chain`
- **Input**: `{ target }`
- **Output**: Attack logs
- **Key file**: `apps/apparatus/src/simulator/supply-chain.ts`

### Dependency Graph Injection
- **What it does**: Models application dependencies and allows injecting malware into the dependency graph.
- **Endpoints**:
  - `GET /api/simulator/dependencies` - View graph
  - `POST /api/simulator/dependencies/infect` - Inject malware
  - `POST /api/simulator/dependencies/reset` - Reset graph
- **Key file**: `apps/apparatus/src/simulator/dependency-graph.ts`

### Victim Application (Intentionally Vulnerable App)
- **What it does**: A deliberately vulnerable web application for testing security tools and techniques.
- **Endpoint**: `/victim/*`
- **Vulnerabilities**: XSS, SQLi, CSRF, auth bypass, insecure deserialization
- **Key file**: `apps/apparatus/src/victim/index.ts`

### Sidecar Chaos Proxy
- **What it does**: Runs as a sidecar proxy (port 8081) to inject chaos into downstream service calls.
- **Key file**: `apps/apparatus/src/sidecar/index.ts`
- **Features**: Request interception, latency injection, failure simulation

### JavaScript/VM Execution
- **What it does**: Execute arbitrary JavaScript in a sandboxed VM context for testing.
- **Endpoint**: `POST /script`
- **Input**: `{ code, input }`
- **Output**: `{ status, result, logs }`
- **Security**: 100ms timeout to prevent infinite loops
- **Key file**: `apps/apparatus/src/scripting.ts`

---

## STATE MANAGEMENT (1 feature)

### Key-Value Store API
- **What it does**: Simple in-memory key-value store API for state management testing.
- **Endpoint**: `/kv/:key` (GET/POST/DELETE)
- **Key file**: `apps/apparatus/src/kv.ts`

---

## DASHBOARD & UI (2 interfaces)

### Web Dashboard (React SPA)
- **Path**: `/dashboard`
- **Tech**: Vite + Tailwind + React Router
- **Location**: `apps/apparatus/src/dashboard/`
- **Features**:
  - Real-time request monitoring via SSE
  - Traffic heatmap
  - Autopilot control panel
  - Scenario builder and executor
  - System health visualizations
  - Deception event feed
  - Tarpit activity monitor
  - Webhook inspector
  - Configuration management
- **Build Output**: `dist-dashboard/` (static files served at `/dashboard`)

### Terminal UI (TUI)
- **Tech**: Blessed + blessed-contrib
- **Location**: `apps/apparatus/src/tui/`
- **Command**: `pnpm tui`
- **Widgets** (18 types):
  - Real-time traffic graph
  - Request/response details
  - Event feeds (deception, tarpit, webhooks)
  - System metrics
  - Scenario control
  - API status monitoring

---

## CLI APPLICATION

The CLI (`apps/cli/`) provides command-line access to all Apparatus features organized into **12 command categories**:

### Core Commands
- `health`, `echo`, `metrics`, `history`

### Chaos Commands
- `cpu-spike`, `memory-spike`, `crash`, `eicar`

### Security Commands
- `validate-payloads`, `jwt-debug`, `rate-limit-test`

### Defense Commands
- `tarpit-list`, `tarpit-release`, `shield-add-rule`, `shield-list-rules`
- `mtd-rotate`, `mtd-status`

### Network Commands
- `dns-query`, `ping`, `proxy`, `generate-traffic`, `sink-data`

### Storage Commands
- `kv-get`, `kv-set`, `kv-delete`, `kv-list`

### Traffic Commands
- `capture-pcap`, `replay-har`, `ghost-start`, `ghost-stop`

### Identity Commands
- `mint-token`, `jwks`, `oidc-discovery`

### Labs Commands
- `ai-chat`, `escape-scan`, `supply-chain-attack`
- `imposter-creds`, `scenarios`, `autopilot-start/stop/status`

### GraphQL Commands
- `graphql-query`, `graphql-introspection`

### Webhooks Commands
- `webhook-inspect`, `webhook-listen`

### Victim Commands
- `victim-list-vulns`, `victim-exploit`, `victim-reset`

---

## ARCHITECTURE HIGHLIGHTS

### Middleware Stack Order (critical for understanding execution flow)
1. MTD (polymorphic route hiding)
2. Self-healing (load shedding)
3. Deception engine (honeypot trap)
4. Tarpit (slow-down trap)
5. Metrics collection
6. Compression
7. Logging (pino)
8. Body parsing (JSON/URL/raw/text)
9. Active Shield (WAF)
10. CORS
11. Routes
12. Echo catchall

### Key Technologies
- Express.js server framework
- TypeScript (strict mode)
- gRPC, WebSocket, Redis RESP, SMTP, MQTT protocols
- Prometheus metrics
- Pino logging
- Node.js crypto (JWT signing)
- Blessed TUI framework
- Vite + React + Tailwind dashboard

### Storage & Limits
- In-memory: Maps, Sets, Arrays
- No persistent database
- Config via environment variables
- Limits:
  - 100 deception events
  - 50 webhooks per ID
  - 200 scenarios
  - 1000 scenario runs
  - 1000 SSE clients

---

## SUMMARY

**Total: 58+ major features** spanning:
- ✅ Cybersecurity testing
- ✅ Chaos engineering
- ✅ Deception and honeypots
- ✅ Defense mechanisms
- ✅ Real-time monitoring
- ✅ 11+ different network protocols

Apparatus is a comprehensive platform for offensive and defensive security testing, red team operations, chaos engineering simulations, and system resilience validation.
