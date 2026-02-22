/**
 * Apparatus Client - TypeScript API Client for Apparatus
 *
 * A comprehensive client library for Apparatus's 50+ endpoints,
 * organized into logical categories for ease of use.
 *
 * @packageDocumentation
 */

// Main client
export { ApparatusClient, createClient } from './client.js';

// HTTP and SSE clients
export { HttpClient } from './http.js';
export { SSEClient } from './sse.js';
export type { SSEEventHandler, SSEErrorHandler, SSEStateHandler, SSEConnectionState } from './sse.js';

// Errors
export {
  ApparatusError,
  NetworkError,
  ApiError,
  TimeoutError,
  ValidationError,
  SSEError,
  ConfigurationError,
  isApparatusError,
  isApiError,
  isNetworkError,
  isTimeoutError,
} from './errors.js';

// Category APIs
export { CoreApi } from './categories/core.js';
export { NetworkApi } from './categories/network.js';
export { IdentityApi } from './categories/identity.js';
export { SecurityApi } from './categories/security.js';
export { ChaosApi } from './categories/chaos.js';
export { DataApi } from './categories/data.js';
export { StorageApi } from './categories/storage.js';
export { TrafficApi } from './categories/traffic.js';
export { DefenseApi } from './categories/defense.js';
export { ForensicsApi } from './categories/forensics.js';
export { ClusterApi } from './categories/cluster.js';
export { MtdApi } from './categories/mtd.js';
export { VictimApi } from './categories/victim.js';
export { WebhooksApi } from './categories/webhooks.js';
export { GraphQLApi, GraphQLQueryError } from './categories/graphql.js';
export { RealtimeApi } from './categories/realtime.js';
export { ScenariosApi } from './categories/scenarios.js';
export { DrillsApi } from './categories/drills.js';
export { AutopilotApi } from './categories/autopilot.js';

// Types - Client Configuration
export type { ApparatusClientOptions, SSEClientOptions } from './types.js';

// Types - Core
export type {
  HealthResponse,
  HealthProResponse,
  EchoResponse,
  FileInfo,
  TlsInfo,
  HistoryEntry,
  HistoryResponse,
  MetricsResponse,
  ThreatIntelStatus,
} from './types.js';

// Types - Network
export type {
  DnsResponse,
  PingResponse,
  SysInfoResponse,
  NetworkInterface,
  RateLimitResponse,
} from './types.js';

// Types - Identity
export type {
  JwksResponse,
  JwkKey,
  OidcConfigResponse,
  TokenResponse,
  TokenRequest,
  JwtDebugResponse,
  JwtForgeRequest,
  JwtForgeResponse,
  JwtVerifyRequest,
  JwtVerifyResponse,
} from './types.js';

// Types - Security
export type {
  RedTeamRequest,
  RedTeamResponse,
  RedTeamResult,
  SentinelRule,
  SentinelRuleRequest,
  ProxyRequest,
  ProxyResponse,
} from './types.js';

// Types - Chaos
export type {
  CpuSpikeRequest,
  CpuSpikeResponse,
  MemorySpikeRequest,
  MemorySpikeResponse,
  MemoryClearResponse,
  CrashResponse,
  EicarResponse,
} from './types.js';

// Types - Data
export type {
  GenerateRequest,
  SinkResponse,
  DlpScanRequest,
  DlpScanResponse,
  DlpMatch,
} from './types.js';

// Types - Storage
export type {
  KvEntry,
  KvSetRequest,
  ScriptRequest,
  ScriptResponse,
} from './types.js';

// Types - Traffic
export type { GhostStatus, GhostConfig } from './types.js';

// Types - Defense
export type {
  TarpitEntry,
  TarpitListResponse,
  TarpitReleaseResponse,
  DeceptionEvent,
  DeceptionHistoryResponse,
} from './types.js';

// Types - Forensics
export type {
  PcapOptions,
  HarReplayRequest,
  HarReplayResponse,
  HarReplayEntry,
} from './types.js';

// Types - Cluster
export type {
  ClusterMember,
  ClusterMembersResponse,
  ClusterAttackRequest,
  ClusterAttackResponse,
} from './types.js';

// Types - MTD
export type { MtdStatus, MtdRotateResponse } from './types.js';

// Types - Victim
export type { SqliResponse, RceResponse, XssResponse } from './types.js';

// Types - Webhooks
export type {
  WebhookInfo,
  WebhookInspectResponse,
  WebhookRequest,
} from './types.js';

// Types - GraphQL
export type {
  GraphQLRequest,
  GraphQLResponse,
  GraphQLError,
} from './types.js';

// Types - Scenarios
export type {
  Scenario,
  ScenarioStep,
  ScenarioSaveRequest,
  ScenarioRunResponse,
  ScenarioRunStatus,
} from './types.js';

// Types - Drills
export type {
  DrillDifficulty,
  DrillStatus,
  DrillDefinition,
  DrillTimelineEvent,
  DrillSnapshot,
  DrillScore,
  DrillRun,
  DrillRunResponse,
  DrillMarkDetectedResponse,
  DrillDebrief,
} from './types.js';

// Types - Autopilot
export type {
  AutopilotConfig,
  AutopilotStartRequest,
  AutopilotSession,
  AutopilotStartResponse,
  AutopilotStopResponse,
  AutopilotKillResponse,
  AutopilotStatusResponse,
  AutopilotReportsResponse,
} from './types.js';

// Types - SSE
export type { SSEEventType, SSEEvent } from './types.js';
