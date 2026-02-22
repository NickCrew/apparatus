/**
 * Apparatus Client Types
 * TypeScript types for all Apparatus API endpoints
 */

// ============================================================================
// Client Configuration
// ============================================================================

export interface ApparatusClientOptions {
  /** Base URL of Apparatus server (e.g., "http://localhost:8080") */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Additional headers to include in all requests */
  headers?: Record<string, string>;
  /** Enable debug logging */
  debug?: boolean;
}

// ============================================================================
// Core API Types
// ============================================================================

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp?: string;
  version?: string;
}

export interface HealthProResponse {
  status: 'ok' | 'degraded' | 'error';
  checks: Record<string, {
    status: 'ok' | 'error';
    message?: string;
    latencyMs?: number;
  }>;
  timestamp: string;
}

export interface EchoResponse {
  method: string;
  originalUrl: string;
  path: string;
  query: Record<string, unknown>;
  httpVersion: string;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  ips?: string[];
  body?: unknown;
  files?: FileInfo[];
  tls?: TlsInfo;
  timestamp: string;
  latencyMs?: number;
}

export interface FileInfo {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
}

export interface TlsInfo {
  alpnProtocol?: string;
  authorized?: boolean;
  authorizationError?: string;
  cipher?: {
    name: string;
    standardName?: string;
    version?: string;
  };
  protocol?: string;
  clientCert?: {
    subject: Record<string, string>;
    issuer: Record<string, string>;
    valid_from: string;
    valid_to: string;
    fingerprint: string;
    serialNumber: string;
  };
}

export interface HistoryEntry extends EchoResponse {
  id: string;
}

export interface HistoryResponse {
  count: number;
  entries: HistoryEntry[];
}

export interface MetricsResponse {
  raw: string;
  parsed?: Record<string, number>;
}

// ============================================================================
// Network API Types
// ============================================================================

export interface DnsResponse {
  hostname: string;
  addresses: string[];
  family?: number;
}

export interface PingResponse {
  host: string;
  port: number;
  status: 'open' | 'closed' | 'timeout' | 'error';
  latencyMs?: number;
  error?: string;
}

export interface SysInfoResponse {
  hostname: string;
  platform: string;
  arch: string;
  cpus: number;
  memory: {
    total: number;
    free: number;
    used: number;
  };
  uptime: number;
  loadAverage: number[];
  networkInterfaces: Record<string, NetworkInterface[]>;
}

export interface NetworkInterface {
  address: string;
  netmask: string;
  family: 'IPv4' | 'IPv6';
  mac: string;
  internal: boolean;
}

export interface RateLimitResponse {
  status: 'allowed' | 'limited';
  remaining: number;
  limit: number;
  resetAt: string;
}

// ============================================================================
// Identity API Types
// ============================================================================

export interface JwksResponse {
  keys: JwkKey[];
}

export interface JwkKey {
  kty: string;
  use?: string;
  kid?: string;
  alg?: string;
  n?: string;
  e?: string;
}

export interface OidcConfigResponse {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  response_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface TokenRequest {
  subject?: string;
  audience?: string;
  expiresIn?: string;
  claims?: Record<string, unknown>;
}

export interface JwtDebugResponse {
  valid: boolean;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  error?: string;
}

export interface JwtForgeRequest {
  sub?: string;
  role?: string;
  expiresIn?: string;
  claims?: Record<string, unknown>;
}

export interface JwtForgeResponse {
  token: string;
  token_type: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  hints: {
    weakKeys: string[];
    publicKey: string;
  };
}

export interface JwtVerifyRequest {
  token: string;
  vulnerabilities?: {
    allowNoneAlg?: boolean;
    allowWeakKey?: boolean;
    allowKeyConfusion?: boolean;
  };
}

export interface JwtVerifyResponse {
  valid: boolean;
  bypassed: boolean;
  mode: 'secure' | 'none_alg' | 'weak_key' | 'key_confusion' | 'invalid';
  message: string;
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  matchedKey?: string;
}

// ============================================================================
// Security API Types
// ============================================================================

export interface RedTeamRequest {
  target: string;
  tests?: string[];
  timeout?: number;
}

export interface RedTeamResponse {
  target: string;
  results: RedTeamResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  duration: number;
}

export interface RedTeamResult {
  test: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
  details?: Record<string, unknown>;
}

export interface SentinelRule {
  id: string;
  name: string;
  pattern: string;
  action: 'block' | 'log' | 'allow';
  priority: number;
  enabled: boolean;
  createdAt: string;
}

export interface SentinelRuleRequest {
  name: string;
  pattern: string;
  action: 'block' | 'log' | 'allow';
  priority?: number;
  enabled?: boolean;
}

export interface ProxyRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  latencyMs: number;
}

// ============================================================================
// Chaos API Types
// ============================================================================

export interface CpuSpikeRequest {
  duration?: number;
  intensity?: number;
}

export interface CpuSpikeResponse {
  message: string;
  duration: number;
  intensity?: number;
}

export interface MemorySpikeRequest {
  size?: number;
  duration?: number;
}

export interface MemorySpikeResponse {
  message: string;
  allocated: number;
  duration?: number;
}

export interface MemoryClearResponse {
  message: string;
  freed: number;
}

export interface CrashResponse {
  message: string;
}

export interface EicarResponse {
  filename: string;
  contentType: string;
  content: string;
}

// ============================================================================
// Data API Types
// ============================================================================

export interface GenerateRequest {
  type: 'json' | 'csv' | 'xml' | 'binary';
  size?: number;
  count?: number;
  schema?: Record<string, unknown>;
}

export interface SinkResponse {
  received: number;
  contentType: string;
  timestamp: string;
}

export interface DlpScanRequest {
  content: string;
  rules?: string[];
}

export interface DlpScanResponse {
  matches: DlpMatch[];
  summary: {
    total: number;
    byType: Record<string, number>;
  };
}

export interface DlpMatch {
  type: string;
  value: string;
  location: {
    start: number;
    end: number;
  };
  confidence: number;
}

// ============================================================================
// Storage API Types
// ============================================================================

export interface KvEntry {
  key: string;
  value: unknown;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

export interface KvSetRequest {
  value: unknown;
  ttl?: number;
}

export interface ScriptRequest {
  code: string;
  timeout?: number;
  args?: unknown[];
}

export interface ScriptResponse {
  result: unknown;
  logs: string[];
  duration: number;
  error?: string;
}

// ============================================================================
// Traffic API Types
// ============================================================================

export interface GhostStatus {
  running: boolean;
  config?: GhostConfig;
  stats?: {
    requestsSent: number;
    errors: number;
    startedAt: string;
  };
}

export interface GhostConfig {
  rps: number;
  duration?: number;
  endpoints?: string[];
}

// ============================================================================
// Defense API Types
// ============================================================================

export interface TarpitEntry {
  ip: string;
  trappedAt: number;
  duration: number;
}

export interface TarpitListResponse {
  count: number;
  trapPaths: string[];
  trapped: TarpitEntry[];
}

export interface TarpitReleaseResponse {
  status: 'released' | 'cleared';
  ip?: string;
  count?: number;
}

export interface DeceptionEvent {
  timestamp: string;
  ip: string;
  type: 'honeypot_hit' | 'shell_command' | 'sqli_probe';
  route: string;
  details: Record<string, unknown>;
  sessionId?: string;
}

export interface DeceptionHistoryResponse {
  count: number;
  events: DeceptionEvent[];
}

// ============================================================================
// Forensics API Types
// ============================================================================

export interface PcapOptions {
  duration?: number;
  filter?: string;
  maxPackets?: number;
}

export interface HarReplayRequest {
  har: unknown;
  baseUrl?: string;
  delay?: number;
}

export interface HarReplayResponse {
  entries: HarReplayEntry[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface HarReplayEntry {
  url: string;
  method: string;
  status: number;
  latencyMs: number;
  error?: string;
}

// ============================================================================
// Cluster API Types
// ============================================================================

/** A member node in the distributed Apparatus cluster */
export interface ClusterMember {
  /** Unique identifier for this cluster member */
  id: string;
  /** Hostname of the cluster member */
  hostname: string;
  /** IP address of the cluster member */
  ip: string;
  /** Port the cluster member is listening on */
  port: number;
  /** Current health status of the member */
  status: 'healthy' | 'unhealthy' | 'unknown';
  /** Role in the cluster consensus (Raft-style leadership) */
  role: 'leader' | 'follower' | 'candidate';
  /** ISO timestamp of last successful health check */
  lastSeen: string;
}

/** Response containing all cluster members and current leader */
export interface ClusterMembersResponse {
  /** ID of the current cluster leader */
  leader: string;
  /** List of all cluster members */
  members: ClusterMember[];
}

/** Request to initiate a coordinated attack across the cluster */
export interface ClusterAttackRequest {
  /** Type of attack to execute (e.g., 'ddos', 'slowloris', 'flood') */
  type: string;
  /** Target URL or host for the attack */
  target?: string;
  /** Additional parameters for the attack type */
  params?: Record<string, unknown>;
}

/** Response from initiating a cluster-wide coordinated attack */
export interface ClusterAttackResponse {
  /** Unique identifier for tracking this attack run */
  id: string;
  /** Type of attack that was initiated */
  type: string;
  /** Current status of the attack execution */
  status: 'started' | 'running' | 'completed' | 'failed';
  /** ISO timestamp when the attack was started */
  startedAt?: string;
  /** Number of cluster nodes participating in the attack */
  nodesCount?: number;
  /** Results from each participating node */
  results?: Record<string, unknown>;
}

// ============================================================================
// MTD (Moving Target Defense) API Types
// ============================================================================

export interface MtdStatus {
  enabled: boolean;
  currentProfile: string;
  rotationInterval: number;
  lastRotation: string;
  nextRotation: string;
}

export interface MtdRotateResponse {
  previousProfile: string;
  newProfile: string;
  rotatedAt: string;
}

// ============================================================================
// Victim API Types (Intentionally Vulnerable Endpoints)
// ============================================================================

/** Response from SQL injection test endpoint */
export interface SqliResponse {
  /** The SQL query that was executed (may contain injected payload) */
  query: string;
  /** Whether the endpoint is vulnerable to SQL injection */
  vulnerable: boolean;
  /** Descriptive message about the vulnerability or error */
  message?: string;
  /** Server response status */
  status?: string;
  /** User role (if login succeeded) */
  role?: string;
  /** Flag returned on successful exploitation */
  flag?: string;
  /** Error message (if login failed) */
  error?: string;
}

/** Response from remote code execution test endpoint */
export interface RceResponse {
  /** The expression or payload that triggered execution */
  expression: string;
  /** Parsed result from expression evaluation */
  result: string;
  /** Raw output from evaluation (undefined if error) */
  output?: string;
  /** Whether the endpoint is vulnerable to RCE */
  vulnerable: boolean;
}

export interface XssResponse {
  input: string;
  rendered: string;
  vulnerable: boolean;
}

// ============================================================================
// Webhooks API Types
// ============================================================================

export interface WebhookInfo {
  /** Unique identifier for the webhook */
  id: string;
  /** ISO timestamp when webhook was created (optional - not set for client-generated IDs) */
  createdAt?: string;
  /** Number of requests received by this webhook */
  requestCount?: number;
  /** ISO timestamp of most recent request */
  lastRequest?: string;
}

/** Response from inspecting a webhook's captured requests */
export interface WebhookInspectResponse {
  /** List of captured requests sent to this webhook */
  requests: WebhookRequest[];
}

/** A captured HTTP request sent to a webhook endpoint */
export interface WebhookRequest {
  /** The webhook ID this request was sent to */
  id: string;
  /** HTTP method used (GET, POST, PUT, DELETE, etc.) */
  method: string;
  /** Request path (may be undefined depending on server version) */
  path?: string;
  /** HTTP headers from the request */
  headers: Record<string, string | string[] | undefined>;
  /** Request body (parsed JSON or raw string) */
  body: unknown;
  /** Query parameters from the request */
  query?: Record<string, string | string[] | undefined>;
  /** IP address of the client that sent the request */
  ip?: string;
  /** ISO timestamp when request was received */
  timestamp: string;
  /** Server-side ISO timestamp when request was received (alias for timestamp) */
  receivedAt?: string;
}

// ============================================================================
// GraphQL API Types
// ============================================================================

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
}

export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

// ============================================================================
// Threat Intel (Risk Server) Integration Types
// ============================================================================

/** Status of Threat Intel integration with Risk Server */
export interface ThreatIntelStatus {
  /** Whether connection to Risk Server is active */
  connected: boolean;
  /** Unique identifier for this sensor instance */
  sensorId: string;
  /** Base URL of the connected Risk Server */
  url: string;
  /** ISO timestamp of last successful sync with Risk Server */
  lastSync?: string;
  /** Number of threat entities currently tracked from Risk Server */
  entitiesCount?: number;
  /** Interval in milliseconds between blocklist sync operations */
  syncIntervalMs?: number;
  /** Total count of threats reported to Risk Server in this session */
  reportedThreats?: number;
}

// ============================================================================
// Scenarios API Types
// ============================================================================

export interface ScenarioStep {
  id: string;
  action: string;
  params: Record<string, unknown>;
  delayMs?: number;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  steps: ScenarioStep[];
  createdAt: string;
}

export interface ScenarioSaveRequest {
  id?: string;
  name: string;
  description?: string;
  steps: ScenarioStep[];
}

export interface ScenarioRunResponse {
  status: 'started';
  executionId: string;
  message: string;
}

export interface ScenarioRunStatus {
  executionId: string;
  scenarioId: string;
  scenarioName: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  currentStepId?: string;
  error?: string;
}

// ============================================================================
// Drills API Types
// ============================================================================

export type DrillDifficulty = 'junior' | 'senior' | 'principal';
export type DrillStatus = 'pending' | 'arming' | 'active' | 'stabilizing' | 'won' | 'failed' | 'cancelled';

export interface DrillDefinition {
  id: string;
  name: string;
  description: string;
  difficulty: DrillDifficulty;
  tags: string[];
  briefing: string;
  maxDurationSec: number;
  createdAt: string;
}

export interface DrillTimelineEvent {
  at: string;
  type: 'system' | 'metric' | 'hint' | 'user_action' | 'status_change';
  message: string;
  data?: Record<string, unknown>;
}

export interface DrillSnapshot {
  cpuPercent: number;
  errorRate: number;
  blockedSqliRatio: number;
  detectedMarked: boolean;
  clusterAttackActive: boolean;
  ghostTrafficActive: boolean;
}

export interface DrillScore {
  total: number;
  ttdSec: number;
  ttmSec: number;
  ttrSec: number;
  penalties: Array<{ code: string; points: number; reason: string }>;
  bonuses: Array<{ code: string; points: number; reason: string }>;
}

export interface DrillRun {
  runId: string;
  drillId: string;
  drillName: string;
  status: DrillStatus;
  startedAt: string;
  finishedAt?: string;
  detectedAt?: string;
  mitigatedAt?: string;
  failureReason?: string;
  timeline: DrillTimelineEvent[];
  lastSnapshot?: DrillSnapshot;
  score?: DrillScore;
  elapsedSec?: number;
}

export interface DrillRunResponse {
  status: 'started';
  runId: string;
  drillId: string;
  message: string;
}

export interface DrillMarkDetectedResponse {
  status: 'ok';
  run: DrillRun;
}

export interface DrillDebrief {
  runId: string;
  drillId: string;
  status: DrillStatus;
  score: DrillScore;
  detectedAt?: string;
  mitigatedAt?: string;
  startedAt: string;
  finishedAt?: string;
  timeline: DrillTimelineEvent[];
}

// ============================================================================
// Autopilot API Types
// ============================================================================

export interface AutopilotConfig {
  availableTools: string[];
  defaultAllowedTools: string[];
  safetyDefaults: {
    forbidCrash: boolean;
  };
}

export interface AutopilotStartRequest {
  objective: string;
  maxIterations?: number;
  intervalMs?: number;
  scope?: {
    allowedTools?: string[];
    forbidCrash?: boolean;
  };
}

export interface AutopilotSession {
  id: string;
  state: 'idle' | 'running' | 'stopping' | 'stopped' | 'completed' | 'failed';
  objective?: string;
  targetBaseUrl?: string;
  iteration?: number;
  startedAt?: string;
  endedAt?: string;
  error?: string;
}

export interface AutopilotStartResponse {
  success: boolean;
  sessionId: string;
  session: AutopilotSession;
}

export interface AutopilotStopResponse {
  success: boolean;
  sessionId: string;
}

export interface AutopilotKillResponse {
  success: boolean;
  killResult: Record<string, unknown>;
}

export interface AutopilotStatusResponse {
  active: boolean;
  session: AutopilotSession | null;
  latestReport: Record<string, unknown> | null;
}

export interface AutopilotReportsResponse {
  reports: Record<string, unknown>[];
}

// ============================================================================
// SSE (Server-Sent Events) Types
// ============================================================================

export type SSEEventType = 'request' | 'deception' | 'tarpit' | 'health' | 'threat-intel';

export interface SSEEvent<T = unknown> {
  type: SSEEventType;
  timestamp: string;
  data: T;
}

export interface SSEClientOptions {
  /** Reconnect automatically on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;
}
