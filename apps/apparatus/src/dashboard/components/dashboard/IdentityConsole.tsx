import { useMemo, useState } from 'react';
import { Fingerprint, ShieldAlert, ShieldCheck, Wand2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useClient } from '../../hooks/useClient';
import { isApiError, type JwtVerifyResponse } from '@apparatus/client';

type JsonRecord = Record<string, unknown>;
type AttackMode = 'none' | 'none_alg' | 'weak_key' | 'key_confusion';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const ATTACK_OPTIONS: Array<{ value: AttackMode; label: string }> = [
  { value: 'none', label: 'No Attack' },
  { value: 'none_alg', label: 'None Algorithm' },
  { value: 'weak_key', label: 'Weak HMAC Key' },
  { value: 'key_confusion', label: 'RS256 → HS256 Confusion' },
];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function stringToBase64Url(value: string): string {
  return bytesToBase64Url(textEncoder.encode(value));
}

function base64UrlToString(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return textDecoder.decode(bytes);
}

function decodeToken(token: string): { header: JsonRecord; payload: JsonRecord; signature: string } | null {
  const parts = token.trim().split('.');
  if (parts.length < 2) return null;

  try {
    const parsedHeader = JSON.parse(base64UrlToString(parts[0]));
    const parsedPayload = JSON.parse(base64UrlToString(parts[1]));
    if (!isRecord(parsedHeader) || !isRecord(parsedPayload)) {
      return null;
    }

    return {
      header: parsedHeader,
      payload: parsedPayload,
      signature: parts[2] ?? '',
    };
  } catch {
    return null;
  }
}

async function signHs256(header: JsonRecord, payload: JsonRecord, secret: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Browser crypto.subtle is unavailable');
  }

  const encodedHeader = stringToBase64Url(JSON.stringify(header));
  const encodedPayload = stringToBase64Url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, textEncoder.encode(unsigned)));
  return `${unsigned}.${bytesToBase64Url(signature)}`;
}

function toPrettyJson(value: JsonRecord): string {
  return JSON.stringify(value, null, 2);
}

function resolveVerificationMessage(result: JwtVerifyResponse | null): string {
  if (!result) return 'No verification run yet.';
  return result.message;
}

export function IdentityConsole() {
  const client = useClient();

  const [rawToken, setRawToken] = useState('');
  const [headerEditor, setHeaderEditor] = useState('{}');
  const [payloadEditor, setPayloadEditor] = useState('{}');
  const [forgedToken, setForgedToken] = useState('');

  const [attackMode, setAttackMode] = useState<AttackMode>('none');
  const [weakKey, setWeakKey] = useState('secret');
  const [publicKeySecret, setPublicKeySecret] = useState('');
  const [allowVulnerableMode, setAllowVulnerableMode] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verification, setVerification] = useState<JwtVerifyResponse | null>(null);

  const activeToken = useMemo(() => (forgedToken.trim() || rawToken.trim()), [forgedToken, rawToken]);

  const loadTokenIntoEditors = (token: string) => {
    const decoded = decodeToken(token);
    if (!decoded) {
      setError('Token is not valid JWT format (header.payload.signature).');
      return;
    }

    setHeaderEditor(toPrettyJson(decoded.header));
    setPayloadEditor(toPrettyJson(decoded.payload));
    setForgedToken(token);
    setError(null);
  };

  const mintStarterToken = async () => {
    if (!client) {
      setError('Connect to an Apparatus server before minting tokens.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await client.identity.forgeToken();
      setRawToken(result.token);
      setForgedToken(result.token);
      setWeakKey(result.hints.weakKeys[0] ?? 'secret');
      setPublicKeySecret(result.hints.publicKey ?? '');
      setVerification(null);
      loadTokenIntoEditors(result.token);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to mint token');
    } finally {
      setIsLoading(false);
    }
  };

  const buildAttackToken = async () => {
    setError(null);

    let header: JsonRecord;
    let payload: JsonRecord;

    try {
      const parsedHeader = JSON.parse(headerEditor);
      const parsedPayload = JSON.parse(payloadEditor);
      if (!isRecord(parsedHeader) || !isRecord(parsedPayload)) {
        throw new Error('Header and payload must be JSON objects.');
      }
      header = { ...parsedHeader };
      payload = { ...parsedPayload };
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Invalid JSON in header/payload editor');
      return;
    }

    try {
      let nextToken = '';
      const originalSignature = rawToken.split('.')[2] ?? '';

      if (attackMode === 'none') {
        const encodedHeader = stringToBase64Url(JSON.stringify(header));
        const encodedPayload = stringToBase64Url(JSON.stringify(payload));
        nextToken = `${encodedHeader}.${encodedPayload}.${originalSignature}`;
      }

      if (attackMode === 'none_alg') {
        header.alg = 'none';
        const encodedHeader = stringToBase64Url(JSON.stringify(header));
        const encodedPayload = stringToBase64Url(JSON.stringify(payload));
        nextToken = `${encodedHeader}.${encodedPayload}.`;
      }

      if (attackMode === 'weak_key') {
        header.alg = 'HS256';
        nextToken = await signHs256(header, payload, weakKey || 'secret');
      }

      if (attackMode === 'key_confusion') {
        header.alg = 'HS256';
        const secret = publicKeySecret.trim();
        if (!secret) {
          throw new Error('Public key secret is required for key confusion attack mode.');
        }
        nextToken = await signHs256(header, payload, secret);
      }

      setForgedToken(nextToken);
      setVerification(null);
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : 'Failed to forge token');
    }
  };

  const testToken = async () => {
    if (!client) {
      setError('Connect to an Apparatus server before verifying tokens.');
      return;
    }

    if (!activeToken) {
      setError('Provide or forge a token first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const vulnerabilities = {
      allowNoneAlg: allowVulnerableMode && attackMode === 'none_alg',
      allowWeakKey: allowVulnerableMode && attackMode === 'weak_key',
      allowKeyConfusion: allowVulnerableMode && attackMode === 'key_confusion',
    };

    try {
      const result = await client.identity.verifyToken({ token: activeToken, vulnerabilities });
      setVerification(result);
    } catch (requestError) {
      if (isApiError(requestError) && isRecord(requestError.body)) {
        const body = requestError.body;
        setVerification({
          valid: body.valid === true,
          bypassed: body.bypassed === true,
          mode: typeof body.mode === 'string' ? body.mode as JwtVerifyResponse['mode'] : 'invalid',
          message: typeof body.message === 'string' ? body.message : requestError.message,
          header: isRecord(body.header) ? body.header : undefined,
          payload: isRecord(body.payload) ? body.payload : undefined,
          matchedKey: typeof body.matchedKey === 'string' ? body.matchedKey : undefined,
        });
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Verification failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl text-neutral-100 type-heading flex items-center gap-2 ml-2">
            <Fingerprint className="h-6 w-6 text-primary-400" />
            Identity Token Forge
          </h1>
          <p className="text-neutral-400 text-sm mt-1 ml-2">Decode, mutate, and test JWTs against secure and intentionally vulnerable verification paths.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => loadTokenIntoEditors(rawToken)} disabled={!rawToken.trim() || isLoading}>
            Load Token
          </Button>
          <Button variant="default" onClick={mintStarterToken} isLoading={isLoading} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Mint Starter Token
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-danger-300 border border-danger-500/30 bg-danger-900/20 px-3 py-2 rounded-[3px] text-xs font-mono">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card variant="glass" glow="primary">
          <CardHeader>
            <CardTitle>Token Builder</CardTitle>
            <CardDescription>Paste any JWT, edit header/payload JSON, then apply an attack mode.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">Raw JWT</label>
              <textarea
                value={rawToken}
                onChange={(event) => setRawToken(event.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full min-h-[96px] bg-neutral-900/60 border border-neutral-800/70 rounded-[3px] px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:border-primary-500/40"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">Header JSON</label>
                <textarea
                  value={headerEditor}
                  onChange={(event) => setHeaderEditor(event.target.value)}
                  className="w-full min-h-[140px] bg-black/35 border border-neutral-800/70 rounded-[3px] px-3 py-2 text-xs text-cyan-100 font-mono focus:outline-none focus:border-primary-500/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">Payload JSON</label>
                <textarea
                  value={payloadEditor}
                  onChange={(event) => setPayloadEditor(event.target.value)}
                  className="w-full min-h-[160px] bg-black/35 border border-neutral-800/70 rounded-[3px] px-3 py-2 text-xs text-emerald-100 font-mono focus:outline-none focus:border-primary-500/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">Attack Mode</label>
                <Select value={attackMode} onValueChange={(value) => setAttackMode(value as AttackMode)}>
                  <SelectTrigger className="w-full bg-neutral-900 border-neutral-800 text-neutral-300 h-9 font-mono text-xs">
                    <SelectValue placeholder="Select attack mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-800">
                    {ATTACK_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-neutral-300 hover:bg-neutral-800 cursor-pointer font-mono text-xs">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">Weak Key</label>
                <input
                  value={weakKey}
                  onChange={(event) => setWeakKey(event.target.value)}
                  className="w-full h-9 bg-neutral-900 border border-neutral-800 rounded-[3px] px-3 text-xs text-neutral-100 font-mono focus:outline-none focus:border-primary-500/40"
                  placeholder="secret"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">Public Key (for key confusion mode)</label>
              <textarea
                value={publicKeySecret}
                onChange={(event) => setPublicKeySecret(event.target.value)}
                className="w-full min-h-[100px] bg-neutral-900/60 border border-neutral-800/70 rounded-[3px] px-3 py-2 text-[11px] text-neutral-300 font-mono focus:outline-none focus:border-primary-500/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-mono text-neutral-300">
                <input
                  type="checkbox"
                  checked={allowVulnerableMode}
                  onChange={(event) => setAllowVulnerableMode(event.target.checked)}
                />
                Enable vulnerable verification mode for selected attack
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="neon" onClick={buildAttackToken} leftIcon={<Wand2 className="h-4 w-4" />}>
                Forge Attack Token
              </Button>
              <Button variant="default" onClick={testToken} isLoading={isLoading} leftIcon={<ShieldCheck className="h-4 w-4" />}>
                Test Token
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card variant="panel" glow="primary">
          <CardHeader>
            <CardTitle>Analysis & Verification</CardTitle>
            <CardDescription>Generated token output and backend verification response.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">Active Token</label>
              <textarea
                value={activeToken}
                readOnly
                className="w-full min-h-[120px] bg-black/35 border border-neutral-800/70 rounded-[3px] px-3 py-2 text-[11px] text-neutral-200 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-[3px] border border-neutral-800/70 bg-neutral-900/50">
                <div className="text-[11px] uppercase text-neutral-500 font-mono">Verification State</div>
                <div className="mt-2 flex items-center gap-2">
                  {verification?.valid ? (
                    <ShieldCheck className="h-4 w-4 text-success-500" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-danger-400" />
                  )}
                  <span className="text-sm font-mono text-neutral-100">
                    {verification ? (verification.valid ? 'ACCEPTED' : 'REJECTED') : 'NOT RUN'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-[3px] border border-neutral-800/70 bg-neutral-900/50">
                <div className="text-[11px] uppercase text-neutral-500 font-mono">Mode</div>
                <div className="mt-2 text-sm font-mono text-neutral-100">
                  {verification?.mode?.toUpperCase() ?? '—'}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-[3px] border border-neutral-800/70 bg-black/30">
              <div className="text-[11px] uppercase text-neutral-500 font-mono">Message</div>
              <div className="mt-2 text-xs text-neutral-300 font-mono leading-relaxed">
                {resolveVerificationMessage(verification)}
              </div>
            </div>

            {verification && (
              <div className="p-3 rounded-[3px] border border-neutral-800/70 bg-black/30">
                <div className="text-[11px] uppercase text-neutral-500 font-mono mb-2">Verification Payload</div>
                <pre className="text-[11px] text-neutral-300 font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(verification.payload ?? {}, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
