/**
 * CLI Command Registration
 * Sets up all CLI commands with Commander.js
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { ApparatusClient } from '@apparatus/client';
import { loadConfig, type ApparatusConfig } from './config.js';
import * as output from './output.js';

// Package version (injected at build time or read from package.json)
const VERSION = '0.1.0';

// Command modules
import { registerCoreCommands } from './commands/core.js';
import { registerChaosCommands } from './commands/chaos.js';
import { registerSecurityCommands } from './commands/security.js';
import { registerDefenseCommands } from './commands/defense.js';
import { registerNetworkCommands } from './commands/network.js';
import { registerStorageCommands } from './commands/storage.js';
import { registerTrafficCommands } from './commands/traffic.js';
import { registerIdentityCommands } from './commands/identity.js';
import { registerLabsCommands } from './commands/labs.js';
import { registerGraphQLCommands } from './commands/graphql.js';
import { registerWebhooksCommands } from './commands/webhooks.js';
import { registerVictimCommands } from './commands/victim.js';
import { registerScenariosCommands } from './commands/scenarios.js';
import { registerDrillsCommands } from './commands/drills.js';
import { registerAutopilotCommands } from './commands/autopilot.js';
import { registerDataCommands } from './commands/data.js';
import { registerSimulatorCommands } from './commands/simulator.js';

export interface GlobalOptions {
  url?: string;
  json?: boolean;
  verbose?: boolean;
  config?: string;
}

let clientInstance: ApparatusClient | null = null;
let currentConfig: ApparatusConfig;
let globalOptions: GlobalOptions = {};

/**
 * Get or create the client instance
 */
export function getClient(): ApparatusClient {
  if (!clientInstance) {
    const baseUrl = globalOptions.url || currentConfig.baseUrl;
    clientInstance = new ApparatusClient({
      baseUrl,
      timeout: currentConfig.timeout,
      debug: currentConfig.debug || globalOptions.verbose,
    });
  }
  return clientInstance;
}

/**
 * Create and configure the CLI program
 */
export function createProgram(): Command {
  currentConfig = loadConfig();

  const program = new Command();

  program
    .name('apparatus')
    .description(`CLI for Apparatus API - 50+ endpoints at your fingertips

Examples:
  $ apparatus health                      # Quick health check
  $ apparatus echo /api/users             # Echo request to path
  $ apparatus chaos cpu --duration 5000   # Trigger 5s CPU spike
  $ apparatus security redteam --target https://example.com
  $ apparatus repl                        # Start interactive mode

Environment Variables:
  APPARATUS_URL       Base URL (default: http://localhost:8090)
  APPARATUS_TIMEOUT   Request timeout in ms (default: 30000)
  APPARATUS_DEBUG     Enable debug mode (true/false)
  NO_COLOR          Disable colored output`)
    .version(VERSION)
    .option('-u, --url <url>', 'Base URL (overrides APPARATUS_URL)')
    .option('-j, --json', 'Output as JSON')
    .option('-v, --verbose', 'Verbose output')
    .option('--no-color', 'Disable colored output')
    .option('--config <file>', 'Config file path')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      globalOptions = {
        url: opts.url,
        json: opts.json,
        verbose: opts.verbose,
        config: opts.config,
      };

      // Handle --no-color flag (Commander uses opts.color for --no-color)
      if (opts.color === false || process.env.NO_COLOR) {
        chalk.level = 0;
      }

      // Reset client if URL changed
      if (opts.url) {
        clientInstance = null;
      }
    });

  // Register all command modules
  registerCoreCommands(program, getClient);
  registerChaosCommands(program, getClient);
  registerSecurityCommands(program, getClient);
  registerDefenseCommands(program, getClient);
  registerNetworkCommands(program, getClient);
  registerStorageCommands(program, getClient);
  registerDataCommands(program, getClient);
  registerSimulatorCommands(program, getClient);
  registerTrafficCommands(program, getClient);
  registerIdentityCommands(program, getClient);
  registerLabsCommands(program, getClient);
  registerGraphQLCommands(program, getClient);
  registerWebhooksCommands(program, getClient);
  registerVictimCommands(program, getClient);
  registerScenariosCommands(program, getClient);
  registerDrillsCommands(program, getClient);
  registerAutopilotCommands(program, getClient);

  // Config command
  program
    .command('config')
    .description('Show current configuration')
    .action(() => {
      output.header('Current Configuration');
      output.printKeyValue({
        'Base URL': currentConfig.baseUrl,
        Timeout: `${currentConfig.timeout}ms`,
        Debug: currentConfig.debug,
        'Default Format': currentConfig.defaultFormat,
      });
    });

  // Quick health check at root level
  program
    .command('health')
    .description('Quick health check (alias for core health)')
    .action(async () => {
      const client = getClient();
      try {
        const healthy = await client.isHealthy();
        if (healthy) {
          output.success('Server is healthy');
        } else {
          output.error('Server is unhealthy');
          process.exit(1);
        }
      } catch (err) {
        output.error(`Health check failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Quick echo at root level
  program
    .command('echo [path]')
    .description('Quick echo (alias for core echo)')
    .action(async (path = '/') => {
      const client = getClient();
      try {
        const result = await client.echo(path);
        if (globalOptions.json) {
          output.printJson(result);
        } else {
          output.header('Echo Response');
          output.printKeyValue({
            Method: result.method,
            Path: result.path,
            Timestamp: result.timestamp,
            Latency: output.formatLatency(result.latencyMs),
          });
        }
      } catch (err) {
        output.error(`Echo failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  return program;
}

/**
 * Get the current configuration
 */
export function getConfig(): ApparatusConfig {
  return currentConfig;
}

/**
 * Get global options
 */
export function getGlobalOptions(): GlobalOptions {
  return globalOptions;
}
