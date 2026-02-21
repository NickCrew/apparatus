# Architecture Guide

## Repository Structure

Apparatus is designed to work alongside VulnLab as a complete security testing ecosystem:

```
~/Developer/
├── apparatus/                          # This repository
│   ├── apps/
│   │   ├── apparatus/                 # Main testing platform (Node.js/Express)
│   │   │   ├── src/
│   │   │   │   ├── app.ts            # Express server + all route handlers
│   │   │   │   ├── chaos.ts          # CPU/memory/crash chaos
│   │   │   │   ├── deception.ts      # AI-powered honeypot
│   │   │   │   ├── tarpit.ts         # Tarpit defense
│   │   │   │   ├── sentinel.ts       # Active Shield (WAF)
│   │   │   │   ├── scenarios.ts      # Scenario engine
│   │   │   │   ├── ai/               # AI autopilot & chat
│   │   │   │   ├── server-http1.ts   # HTTP/1.1 server
│   │   │   │   ├── server-http2.ts   # HTTP/2 TLS server
│   │   │   │   ├── server-grpc.ts    # gRPC server
│   │   │   │   ├── server-ws.ts      # WebSocket server
│   │   │   │   ├── server-redis.ts   # Redis mock
│   │   │   │   ├── server-mqtt.ts    # MQTT server
│   │   │   │   ├── server-smtp.ts    # SMTP server
│   │   │   │   ├── server-syslog.ts  # Syslog server
│   │   │   │   └── dashboard/        # React SPA (Vite)
│   │   │   ├── test/                 # Integration tests (39+ tests)
│   │   │   └── dist/                 # Compiled output
│   │   └── cli/                      # CLI application (12 command categories)
│   ├── docs/
│   │   ├── features.md               # Complete feature catalog (58+)
│   │   ├── quick-reference.md        # This quick start guide
│   │   ├── architecture.md           # System design (this file)
│   │   └── api.md                    # API endpoint reference
│   ├── docker-compose.yml            # Orchestrates Apparatus + VulnLab
│   ├── README.md                     # Main documentation
│   └── justfile                      # Task runner
│
└── VulnLab/                          # Separate monorepo (vulnerable apps)
    ├── apps/
    │   ├── vuln-web/                # Vulnerable web app (12 UIs, 450+ endpoints)
    │   └── vuln-api/                # Vulnerable REST API
    └── README.md
```

---

## System Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Tester                          │
│                  (Human or AI Agent)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP/gRPC/WebSocket
                     ▼
    ┌────────────────────────────────────────┐
    │    APPARATUS TESTING PLATFORM          │
    │                                        │
    │  ┌──────────────────────────────────┐  │
    │  │   11+ Protocol Servers           │  │
    │  │ HTTP/1.1, HTTP/2, gRPC, WS, etc │  │
    │  └──────────┬───────────────────────┘  │
    │             │                          │
    │  ┌──────────▼───────────────────────┐  │
    │  │   Middleware Stack               │  │
    │  │ 1. MTD (polymorphic routing)     │  │
    │  │ 2. Self-healing (load shedding)  │  │
    │  │ 3. Deception (honeypot)          │  │
    │  │ 4. Tarpit (slow trap)            │  │
    │  │ 5. Metrics collection            │  │
    │  │ 6. Body parsing & WAF            │  │
    │  └──────────┬───────────────────────┘  │
    │             │                          │
    │  ┌──────────▼───────────────────────┐  │
    │  │   Feature Handlers               │  │
    │  │ - Red Team Tools                 │  │
    │  │ - Chaos Engineering              │  │
    │  │ - Network Tools                  │  │
    │  │ - Security Testing               │  │
    │  │ - Real-time Broadcast (SSE)      │  │
    │  └──────────┬───────────────────────┘  │
    │             │                          │
    │  ┌──────────▼───────────────────────┐  │
    │  │   Dashboards                     │  │
    │  │ - Web Dashboard (React/Vite)     │  │
    │  │ - Terminal UI (Blessed)          │  │
    │  │ - Metrics (Prometheus)           │  │
    │  └──────────────────────────────────┘  │
    └────────────────┬───────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌──────────┐
    │ VulnWeb │ │ VulnAPI │ │ External │
    │         │ │         │ │ Targets  │
    │ (3000)  │ │ (5000)  │ │          │
    └─────────┘ └─────────┘ └──────────┘
```

### Request Flow Through Middleware

```
Incoming Request
       │
       ▼
┌─────────────────────────────┐
│ 1. MTD Check                │ ← Verify polymorphic prefix
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 2. Self-Healing Monitor     │ ← Measure event loop lag
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 3. Deception Handler        │ ← Check honeypot paths
│    /.env, /admin, /console  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 4. Tarpit Middleware        │ ← Trap suspicious requests
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 5. Metrics Timer Start      │ ← Begin latency measurement
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 6. Body Parsing             │ ← Parse JSON/form/raw
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 7. Active Shield (WAF)      │ ← Apply blocking rules
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 8. Route Handler            │ ← Execute endpoint logic
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 9. Response Generation      │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 10. Metrics Timer End       │ ← Record latency & status
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 11. SSE Broadcast           │ ← Push to dashboard clients
└──────────┬──────────────────┘
           │
           ▼
        Response to Client
```

---

## Component Architecture

### Core Systems

#### 1. Middleware Stack
Located in `src/app.ts` (lines 59-392)

Executes in critical order:
- **MTD** (`src/mtd.ts`) - Routes blocked without polymorphic prefix
- **Self-Healing** (`src/self-healing.ts`) - Monitors event loop, sheds traffic at degraded/critical
- **Deception** (`src/deception.ts`) - Traps honeypot paths, records events
- **Tarpit** (`src/tarpit.ts`) - Holds connections open slowly for trapped IPs
- **Metrics** (`src/metrics.ts`) - Prometheus counters and histograms
- **Active Shield** (`src/sentinel.ts`) - Pattern-based request blocking

#### 2. Protocol Servers
Multiple independent servers bound to different ports:

| Server | Port | File | Protocol |
|--------|------|------|----------|
| HTTP/1.1 | 8090 | `server-http1.ts` | HTTP/1.1 |
| HTTP/2 TLS | 8443 | `server-http2.ts` | HTTP/2 over TLS |
| h2c | 8091 | `server-http2.ts` | HTTP/2 cleartext |
| gRPC | 50051 | `server-grpc.ts` | gRPC |
| Redis | 6379 | `server-redis.ts` | RESP protocol |
| MQTT | 1883 | `server-mqtt.ts` | MQTT |
| SMTP | 2525 | `server-smtp.ts` | SMTP |
| Syslog | 5140, 5514 | `server-syslog.ts` | RFC 3164 |
| ICAP | 1344 | `server-icap.ts` | ICAP |
| TCP Echo | 9000 | `server-l4.ts` | TCP |
| UDP Echo | 9001 | `server-l4.ts` | UDP |
| WebSocket | /ws | `server-ws.ts` | WebSocket over HTTP/1.1 |

#### 3. Feature Modules

**Chaos Engineering** (`src/chaos.ts`)
- `triggerCpuSpike()` - Module-level flag prevents overlapping spikes
- `allocateMemorySpike()` - Buffers stored in module-level array
- Supports both GET query and POST body parameters

**Deception** (`src/deception.ts`)
- AI honeypot with contextual responses
- Max 100 events in memory
- Real-time SSE broadcast via `broadcastDeception()`
- Persona-based responses for different honeypot routes

**Scenarios** (`src/scenarios.ts` + `src/tool-executor.ts`)
- Max 200 scenarios stored in-memory Map
- 50 steps per scenario
- Per-step delay support
- Execution tracking with status: running/completed/failed
- Tool action allowlist prevents dangerous actions (e.g., `chaos.crash`)

**Red Team AI** (`src/ai/redteam.ts`)
- Autonomous agent making tool selections
- Session persistence with execution snapshots
- Configurable tool allowlist and iteration limits
- Reports with timeline of findings

#### 4. Real-Time Broadcasting

**SSE Broadcaster** (`src/sse-broadcast.ts`)
```typescript
// Single global instance
export const sseBroadcaster = new SSEBroadcaster();

// Max 100 clients (DoS protection)
const MAX_SSE_CLIENTS = 100;

// Events pushed from multiple sources:
broadcastRequest()        // Echo handler
broadcastDeception()      // Deception engine
broadcastTarpit()         // Tarpit middleware
broadcastClusterAttack()  // Cluster coordination
broadcastWebhook()        // Webhook receiver
```

Events streamed to dashboard via `GET /sse`

#### 5. Dashboard
Located in `src/dashboard/`

**Frontend Stack**:
- React 18 with React Router
- Vite build system
- Tailwind CSS styling
- Context API for state management

**UI Components**:
- Overview page with system metrics
- Real-time traffic visualizer
- Autopilot control panel
- Scenario builder and executor
- Deception event feed
- Tarpit monitoring
- Webhook inspector
- Settings/configuration

**Build Output**: `dist-dashboard/` (static files served at `/dashboard` via Express)

#### 6. Terminal UI
Located in `src/tui/`

**Tech**: Blessed + blessed-contrib

**Widgets**:
- Real-time traffic graph
- Request/response inspector
- Event feeds (18 types)
- System metrics (CPU, memory, event loop lag)
- Scenario control
- API status monitoring

**Command**: `pnpm tui`

---

## Storage & State Management

### In-Memory Storage

All data stored in RAM (no persistence):

```typescript
// Deception events (max 100)
const deceptionEvents: DeceptionEvent[] = [];

// Scenarios (max 200)
const scenarioStore = new Map<string, Scenario>();

// Scenario runs (max 1000)
const scenarioRuns = new Map<string, ScenarioRunStatus>();

// Tarpit entries
const tarpitStore = new Map<string, TarpitEntry>();

// Webhooks per hook ID (max 50 each)
const webhookStore: Record<string, Webhook[]> = {};

// SSE clients (max 100)
private clients: Map<string, ClientInfo> = new Map();

// Request history (max 100)
let requestHistory: EchoResponse[] = [];

// Memory allocation tracking
let memoryHogs: Buffer[] = [];

// CPU spike state
let cpuSpikeRunning = false;
let cpuSpikeCancelled = false;

// Cluster members discovered
const members = new Map<string, number>();
```

### Limits & Quotas

| Resource | Limit | File |
|----------|-------|------|
| Deception events | 100 | `src/deception.ts` |
| Scenarios | 200 | `src/scenarios.ts` |
| Scenario runs | 1000 | `src/scenarios.ts` |
| Webhooks per ID | 50 | `src/webhook.ts` |
| SSE clients | 100 | `src/sse-broadcast.ts` |
| Request history | 100 | `src/history.ts` |
| Memory spike | 4096 MB max | `src/chaos.ts` |
| CPU spike duration | 250-120000 ms | `src/chaos.ts` |
| Tarpit connections | Unlimited | `src/tarpit.ts` |
| Cluster nodes | Unlimited | `src/cluster.ts` |

---

## Network Topology in Docker Compose

```
┌─────────────────────────────────────────┐
│        Docker Network: security-lab     │
│         (172.25.0.0/16)                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────┐  ┌──────────────┐   │
│  │  Apparatus    │  │  VulnWeb     │   │
│  │  Port 8090    │─→│  Port 3000   │   │
│  │  Port 8443    │  │              │   │
│  │  Port 50051   │  └──────┬───────┘   │
│  └───────────────┘         │           │
│                            │           │
│                   ┌────────▼────────┐  │
│                   │   VulnAPI       │  │
│                   │   Port 5000     │  │
│                   └─────────────────┘  │
│                                         │
│  Host Port Mapping:                     │
│  localhost:8090  → apparatus:8090       │
│  localhost:3000  → vuln-web:3000        │
│  localhost:5000  → vuln-api:5000        │
│                                         │
└─────────────────────────────────────────┘
```

Services communicate via hostname (not localhost):
- Apparatus → VulnWeb: `http://vuln-web:3000`
- Apparatus → VulnAPI: `http://vuln-api:5000`
- VulnWeb → VulnAPI: `http://vuln-api:5000`

---

## Execution Models

### 1. Synchronous Request/Response
Standard HTTP request-response cycle:
```
Client → Apparatus → Handler → Response
(immediate)
```

### 2. Asynchronous Execution (Scenarios)
```
Client → Apparatus
              → Schedule async execution
              → Return 202 (Accepted) with executionId
              → Background: Execute steps with delays
              → Client polls status endpoint
```

### 3. Event Streaming (SSE)
```
Client → Connect to /sse
       ← Heartbeat every 30s
       ← Events pushed as they occur
       (Automatic client-side reconnect)
```

### 4. Autonomous Agents (Red Team AI)
```
User → Start autopilot with config
     ← Return session ID
     → AI agent: evaluate state → select tool → execute
     → Record findings and metrics
     → Client polls status and reports
```

---

## Key Design Patterns

### 1. Middleware Pattern
Express middleware stack handles cross-cutting concerns (defense, monitoring, deception).

### 2. Pub/Sub Pattern
`SSEBroadcaster` acts as event hub:
```typescript
deceptionEngine.on('honeypot_hit', (event) => {
  sseBroadcaster.broadcast('deception', event);
});
```

### 3. Plugin Architecture
Feature handlers can be enabled/disabled via config and security gates.

### 4. State Machine Pattern
Scenarios use state transitions:
```
pending → running → completed/failed
```

### 5. Isolation Pattern
Each protocol server is independent, can fail without affecting others.

---

## Performance Characteristics

### Request Latency
- **Baseline**: 1-5ms (echo handler)
- **With deception**: 5-20ms (honeypot checks)
- **With tarpit**: 10+ seconds (intentional slowdown)
- **With chaos**: Variable (can spike to seconds under CPU stress)

### Memory Usage
- **Baseline**: ~150-200 MB (Node.js runtime)
- **Per SSE client**: ~5-10 KB
- **Per scenario**: ~10-50 KB
- **With memory spike**: +1-4096 MB allocated

### Concurrency
- **Max concurrent requests**: System-dependent (file descriptors)
- **SSE clients**: Hard-limited to 100
- **Concurrent scenarios**: Limited by JavaScript event loop

---

## Security Architecture

### Network Isolation
- All endpoints behind optional `securityGate` middleware
- Check: localhost-only or `DEMO_MODE=true`
- Protects: `/api/simulator`, `/api/redteam/autopilot`, `/_sensor`, `/proxy`

### Input Validation
- All user inputs sanitized via `sanitizeToolParams()`
- Scenario step validation: whitelist of allowed actions
- Param clamping: min/max bounds enforced
- Pattern matching in WAF: regex-based validation

### Intentional Vulnerabilities
- Victim app at `/victim/*` deliberately vulnerable
- Echo handler reflects all request details
- Proxy handler allows SSRF testing
- These are features, not bugs

---

## Extensibility Points

### Adding a New Protocol Server
1. Create `src/server-xyz.ts`
2. Implement server using Node.js net/dgram APIs
3. Register in `src/index.ts` via `startXyzServer()`
4. Update docker-compose.yml with port mapping

### Adding a New Chaos Tool
1. Create handler in `src/chaos.ts` or new file
2. Register in `src/tool-executor.ts` as tool action
3. Add route in `src/app.ts`
4. Update scenario allowlist in `src/scenarios.ts`

### Adding a New Defense Mechanism
1. Create middleware in new file
2. Insert into middleware stack in `src/app.ts`
3. Add configuration options
4. Document in README and features.md

### Adding Dashboard Features
1. Create React component in `src/dashboard/components/`
2. Add route in `src/dashboard/App.tsx`
3. Add sidebar navigation entry
4. Fetch data via HTTP or SSE

---

## Deployment Architecture

### Development
```bash
pnpm install && pnpm build && pnpm start
# Single process, all protocols, single machine
```

### Docker (Isolated)
```bash
docker build -t apparatus:latest .
docker run -p 8090:8090 apparatus:latest
# Single container, all services
```

### Docker Compose (Full Lab)
```bash
docker-compose up
# Multiple containers: apparatus + vuln-web + vuln-api
# Networked communication via hostnames
```

### Production (Not Recommended)
- Would require: persistence layer, clustering, load balancing, audit trails
- Apparatus is designed for testing, not production defense

---

## Future Architecture Improvements

Potential enhancements:

1. **Persistence Layer** - PostgreSQL backend for scenarios, events, metrics
2. **Clustering** - Multi-node Apparatus with shared state
3. **Rate Limiting** - Token bucket or sliding window algorithms
4. **Observability** - OpenTelemetry integration, distributed tracing
5. **Plugin System** - Load custom handlers at runtime
6. **API Versioning** - Multiple API versions for backward compatibility
7. **gRPC Streaming** - Bi-directional streaming for red team commands
8. **WebAssembly** - Sandbox for custom payload validation

---

## Reference Diagrams

### Scenario Execution Timeline
```
T0: POST /scenarios/{id}/run
    └─ Return 202 + executionId

T0+ε: Background thread starts
    ├─ Load scenario steps
    ├─ For each step:
    │  ├─ Update status: currentStepId=X
    │  ├─ Execute tool
    │  ├─ Wait delayMs
    │  └─ Broadcast progress via SSE
    └─ Update status: completed/failed

Tn: Client polls GET /scenarios/{id}/status?executionId=X
    └─ Returns: status, currentStepId, error, finishedAt
```

### Red Team Autopilot Loop
```
Start Session
    ↓
┌─→ Evaluate Target State
│   ├─ Send probe requests
│   ├─ Analyze responses
│   ├─ Assess system health
│   └─ Identify weak points
│   ↓
├─→ Select Tool
│   ├─ Consider previous findings
│   ├─ Choose next action
│   └─ With probability weighting
│   ↓
├─→ Execute Tool
│   ├─ CPU spike / memory spike
│   ├─ Cluster attack / MTD rotation
│   ├─ Record metrics
│   └─ Broadcast results
│   ↓
├─→ Wait Interval
│   └─ configurable delay
│   ↓
├─→ Check Stop Signal
│   └─ Max iterations reached?
│   ↓
└─ Continue? (Yes) ──────┘
                │ (No)
                ↓
         Session Complete
         Generate Report
```

---

This architecture ensures Apparatus is:
- ✅ **Modular** - Independent protocol servers, feature handlers
- ✅ **Scalable** - Horizontal via clustering, vertical via resources
- ✅ **Observable** - Metrics, logging, SSE streaming
- ✅ **Extensible** - Clear plugin points for new features
- ✅ **Testable** - 39+ integration tests, clear separation of concerns
- ✅ **Resilient** - Server isolation, graceful degradation
