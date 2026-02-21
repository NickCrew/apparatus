/**
 * Identity API
 * JWKS, OIDC, token, and JWT debugging endpoints
 */

import type { HttpClient } from '../http.js';
import type {
  JwksResponse,
  OidcConfigResponse,
  TokenResponse,
  TokenRequest,
  JwtDebugResponse,
  JwtForgeRequest,
  JwtForgeResponse,
  JwtVerifyRequest,
  JwtVerifyResponse,
} from '../types.js';

export class IdentityApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get JSON Web Key Set
   * GET /.well-known/jwks.json
   */
  async jwks(): Promise<JwksResponse> {
    return this.http.get<JwksResponse>('/.well-known/jwks.json');
  }

  /**
   * Get OpenID Connect configuration
   * GET /.well-known/openid-configuration
   */
  async oidc(): Promise<OidcConfigResponse> {
    return this.http.get<OidcConfigResponse>('/.well-known/openid-configuration');
  }

  /**
   * Mint a new token
   * POST /auth/token
   */
  async mintToken(request?: TokenRequest): Promise<TokenResponse> {
    return this.http.post<TokenResponse>('/auth/token', request);
  }

  /**
   * Debug/decode a JWT token
   * POST /debug/jwt
   */
  async decodeJwt(token: string): Promise<JwtDebugResponse> {
    return this.http.post<JwtDebugResponse>('/debug/jwt', { token });
  }

  /**
   * Forge a fresh JWT with configurable claims
   * POST /auth/forge
   */
  async forgeToken(request?: JwtForgeRequest): Promise<JwtForgeResponse> {
    return this.http.post<JwtForgeResponse>('/auth/forge', request);
  }

  /**
   * Verify a JWT against secure or intentionally vulnerable modes
   * POST /auth/verify
   */
  async verifyToken(request: JwtVerifyRequest): Promise<JwtVerifyResponse> {
    return this.http.post<JwtVerifyResponse>('/auth/verify', request);
  }

  /**
   * Validate a JWT token
   * Returns true if valid, false otherwise
   */
  async validateJwt(token: string): Promise<boolean> {
    try {
      const result = await this.decodeJwt(token);
      return result.valid;
    } catch {
      return false;
    }
  }

  /**
   * Get a fresh access token with default options
   */
  async getAccessToken(): Promise<string> {
    const response = await this.mintToken();
    return response.access_token;
  }

  /**
   * Get token with custom subject and audience
   */
  async getTokenFor(subject: string, audience?: string): Promise<string> {
    const response = await this.mintToken({ subject, audience });
    return response.access_token;
  }
}
