/**
 * ApparatusClient - Main API client for Apparatus
 *
 * Provides access to 50+ Apparatus endpoints organized into logical categories.
 * Uses lazy loading to instantiate category APIs only when accessed.
 *
 * @example
 * ```typescript
 * import { ApparatusClient } from 'apparatus-client';
 *
 * const client = new ApparatusClient({ baseUrl: 'http://localhost:8080' });
 *
 * // Health check
 * const health = await client.core.health();
 *
 * // Chaos engineering
 * await client.chaos.cpuSpike({ duration: 5000 });
 *
 * // Security testing
 * const results = await client.security.redteam({ target: 'https://api.example.com' });
 *
 * // Real-time events
 * client.realtime.connect();
 * client.realtime.onRequest((event) => console.log(event));
 * ```
 */

import { HttpClient } from './http.js';
import type { ApparatusClientOptions, EchoResponse, HealthResponse, SSEClientOptions } from './types.js';

// Category API imports
import { CoreApi } from './categories/core.js';
import { NetworkApi } from './categories/network.js';
import { IdentityApi } from './categories/identity.js';
import { SecurityApi } from './categories/security.js';
import { ChaosApi } from './categories/chaos.js';
import { DataApi } from './categories/data.js';
import { StorageApi } from './categories/storage.js';
import { TrafficApi } from './categories/traffic.js';
import { DefenseApi } from './categories/defense.js';
import { ForensicsApi } from './categories/forensics.js';
import { ClusterApi } from './categories/cluster.js';
import { MtdApi } from './categories/mtd.js';
import { VictimApi } from './categories/victim.js';
import { WebhooksApi } from './categories/webhooks.js';
import { GraphQLApi } from './categories/graphql.js';
import { RealtimeApi } from './categories/realtime.js';
import { ScenariosApi } from './categories/scenarios.js';
import { DrillsApi } from './categories/drills.js';
import { AutopilotApi } from './categories/autopilot.js';

export class ApparatusClient {
  private readonly http: HttpClient;
  private readonly baseUrl: string;
  private readonly sseOptions: SSEClientOptions;

  // Lazy-loaded category instances
  private _core?: CoreApi;
  private _network?: NetworkApi;
  private _identity?: IdentityApi;
  private _security?: SecurityApi;
  private _chaos?: ChaosApi;
  private _data?: DataApi;
  private _storage?: StorageApi;
  private _traffic?: TrafficApi;
  private _defense?: DefenseApi;
  private _forensics?: ForensicsApi;
  private _cluster?: ClusterApi;
  private _mtd?: MtdApi;
  private _victim?: VictimApi;
  private _webhooks?: WebhooksApi;
  private _graphql?: GraphQLApi;
  private _realtime?: RealtimeApi;
  private _scenarios?: ScenariosApi;
  private _drills?: DrillsApi;
  private _autopilot?: AutopilotApi;

  constructor(options: ApparatusClientOptions) {
    this.http = new HttpClient(options);
    this.baseUrl = options.baseUrl.endsWith('/') ? options.baseUrl.slice(0, -1) : options.baseUrl;
    this.sseOptions = {
      autoReconnect: true,
      reconnectDelay: 3000,
      maxReconnectAttempts: 10,
    };
  }

  // ============================================================================
  // Category API Accessors (Lazy Loading)
  // ============================================================================

  /**
   * Core API - Health, echo, metrics, history
   */
  get core(): CoreApi {
    if (!this._core) {
      this._core = new CoreApi(this.http);
    }
    return this._core;
  }

  /**
   * Network API - DNS, ping, sysinfo, rate limiting
   */
  get network(): NetworkApi {
    if (!this._network) {
      this._network = new NetworkApi(this.http);
    }
    return this._network;
  }

  /**
   * Identity API - JWKS, OIDC, tokens, JWT debugging
   */
  get identity(): IdentityApi {
    if (!this._identity) {
      this._identity = new IdentityApi(this.http);
    }
    return this._identity;
  }

  /**
   * Security API - Red team, Sentinel rules, proxy
   */
  get security(): SecurityApi {
    if (!this._security) {
      this._security = new SecurityApi(this.http);
    }
    return this._security;
  }

  /**
   * Chaos API - CPU spike, memory spike, crash, EICAR
   */
  get chaos(): ChaosApi {
    if (!this._chaos) {
      this._chaos = new ChaosApi(this.http);
    }
    return this._chaos;
  }

  /**
   * Data API - Generate, sink, DLP scanning
   */
  get data(): DataApi {
    if (!this._data) {
      this._data = new DataApi(this.http);
    }
    return this._data;
  }

  /**
   * Storage API - Key-value store, script execution
   */
  get storage(): StorageApi {
    if (!this._storage) {
      this._storage = new StorageApi(this.http);
    }
    return this._storage;
  }

  /**
   * Traffic API - Ghost (background) traffic generator
   */
  get traffic(): TrafficApi {
    if (!this._traffic) {
      this._traffic = new TrafficApi(this.http);
    }
    return this._traffic;
  }

  /**
   * Defense API - Tarpit, deception/honeypot
   */
  get defense(): DefenseApi {
    if (!this._defense) {
      this._defense = new DefenseApi(this.http);
    }
    return this._defense;
  }

  /**
   * Forensics API - PCAP capture, HAR replay
   */
  get forensics(): ForensicsApi {
    if (!this._forensics) {
      this._forensics = new ForensicsApi(this.http);
    }
    return this._forensics;
  }

  /**
   * Cluster API - Members, distributed attacks
   */
  get cluster(): ClusterApi {
    if (!this._cluster) {
      this._cluster = new ClusterApi(this.http);
    }
    return this._cluster;
  }

  /**
   * MTD API - Moving target defense
   */
  get mtd(): MtdApi {
    if (!this._mtd) {
      this._mtd = new MtdApi(this.http);
    }
    return this._mtd;
  }

  /**
   * Victim API - Intentionally vulnerable endpoints
   */
  get victim(): VictimApi {
    if (!this._victim) {
      this._victim = new VictimApi(this.http);
    }
    return this._victim;
  }

  /**
   * Webhooks API - Webhook receivers and inspection
   */
  get webhooks(): WebhooksApi {
    if (!this._webhooks) {
      this._webhooks = new WebhooksApi(this.http);
    }
    return this._webhooks;
  }

  /**
   * GraphQL API - GraphQL query execution
   */
  get graphql(): GraphQLApi {
    if (!this._graphql) {
      this._graphql = new GraphQLApi(this.http);
    }
    return this._graphql;
  }

  /**
   * Realtime API - SSE streaming
   */
  get realtime(): RealtimeApi {
    if (!this._realtime) {
      this._realtime = new RealtimeApi(this.baseUrl, this.sseOptions);
    }
    return this._realtime;
  }

  /**
   * Scenarios API - Multi-step attack scenario orchestration
   */
  get scenarios(): ScenariosApi {
    if (!this._scenarios) {
      this._scenarios = new ScenariosApi(this.http);
    }
    return this._scenarios;
  }

  /**
   * Drills API - Breach protocol drills
   */
  get drills(): DrillsApi {
    if (!this._drills) {
      this._drills = new DrillsApi(this.http);
    }
    return this._drills;
  }

  /**
   * Autopilot API - AI-driven red team autopilot
   */
  get autopilot(): AutopilotApi {
    if (!this._autopilot) {
      this._autopilot = new AutopilotApi(this.http);
    }
    return this._autopilot;
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Check if the Apparatus server is healthy
   */
  async isHealthy(): Promise<boolean> {
    return this.core.isHealthy();
  }

  /**
   * Get health status
   */
  async health(): Promise<HealthResponse> {
    return this.core.health();
  }

  /**
   * Echo a request (main catch-all endpoint)
   */
  async echo(path = '/'): Promise<EchoResponse> {
    return this.core.echo(path);
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Set a custom header for all requests
   */
  setHeader(key: string, value: string): void {
    this.http.setHeader(key, value);
  }

  /**
   * Remove a custom header
   */
  removeHeader(key: string): void {
    this.http.removeHeader(key);
  }
}

/**
 * Create a new ApparatusClient instance
 *
 * @example
 * ```typescript
 * const client = createClient({ baseUrl: 'http://localhost:8080' });
 * ```
 */
export function createClient(options: ApparatusClientOptions): ApparatusClient {
  return new ApparatusClient(options);
}
