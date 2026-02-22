/**
 * Traffic Commands
 * Ghost traffic generator
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@apparatus/client';
import chalk from 'chalk';
import * as output from '../output.js';

export function registerTrafficCommands(program: Command, getClient: () => ApparatusClient): void {
  const traffic = program
    .command('traffic')
    .description('Ghost traffic generator');

  traffic
    .command('status')
    .description('Get ghost traffic status')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Getting status...');
      spin.start();

      try {
        const status = await client.traffic.status();
        spin.stop();

        output.header('Ghost Traffic Status');
        output.printKeyValue({
          Running: status.running ? chalk.green('yes') : chalk.gray('no'),
        });

        if (status.config) {
          output.subheader('\nConfiguration:');
          output.printKeyValue({
            RPS: status.config.rps,
            Duration: status.config.duration ? `${status.config.duration}ms` : 'unlimited',
            Endpoints: status.config.endpoints?.join(', ') || 'default',
          });
        }

        if (status.stats) {
          output.subheader('\nStatistics:');
          output.printKeyValue({
            'Requests Sent': status.stats.requestsSent,
            Errors: status.stats.errors,
            'Started At': new Date(status.stats.startedAt).toLocaleString(),
          });
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to get status: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  traffic
    .command('start')
    .description('Start ghost traffic')
    .option('-r, --rps <n>', 'Requests per second', '10')
    .option('-d, --duration <ms>', 'Duration in milliseconds')
    .option('-e, --endpoints <paths>', 'Comma-separated endpoint paths')
    .action(async (options) => {
      const client = getClient();
      const rps = parseInt(options.rps);
      const spin = output.spinner(`Starting ghost traffic at ${rps} RPS...`);
      spin.start();

      try {
        const status = await client.traffic.start({
          rps,
          duration: options.duration ? parseInt(options.duration) : undefined,
          endpoints: options.endpoints?.split(','),
        });
        spin.stop();

        if (status.running) {
          output.success(`Ghost traffic started at ${rps} RPS`);
        } else {
          output.warning('Traffic did not start');
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to start traffic: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  traffic
    .command('stop')
    .description('Stop ghost traffic')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Stopping ghost traffic...');
      spin.start();

      try {
        const status = await client.traffic.stop();
        spin.stop();

        if (!status.running) {
          output.success('Ghost traffic stopped');
          if (status.stats) {
            output.info(`Total requests: ${status.stats.requestsSent}, Errors: ${status.stats.errors}`);
          }
        } else {
          output.warning('Traffic did not stop');
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to stop traffic: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  traffic
    .command('toggle')
    .description('Toggle ghost traffic on/off')
    .option('-r, --rps <n>', 'RPS for start', '10')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Toggling traffic...');
      spin.start();

      try {
        const currentStatus = await client.traffic.status();
        let status;

        if (currentStatus.running) {
          status = await client.traffic.stop();
          spin.stop();
          output.success('Ghost traffic stopped');
        } else {
          status = await client.traffic.start({ rps: parseInt(options.rps) });
          spin.stop();
          output.success(`Ghost traffic started at ${options.rps} RPS`);
        }
      } catch (err) {
        spin.stop();
        output.error(`Toggle failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Ghost instances management
  const ghosts = traffic
    .command('ghosts')
    .description('Manage individual ghost instances');

  ghosts
    .command('list')
    .alias('ls')
    .description('List all ghost instances')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching ghost instances...');
      spin.start();

      try {
        const res = await fetch(`${client.getBaseUrl()}/ghosts`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const result = await res.json() as { ghosts?: Array<{ id: string; name: string; status: string; rps?: number; createdAt?: string }> };

        spin.stop();
        output.header(`Ghost Instances (${result.ghosts?.length || 0})`);

        if (!result.ghosts || result.ghosts.length === 0) {
          output.info('No ghost instances');
          return;
        }

        const rows = result.ghosts.map(g => [
          g.id,
          g.name || 'unnamed',
          g.status,
          g.rps?.toString() || '-',
          g.createdAt ? new Date(g.createdAt).toLocaleString() : '-',
        ]);
        output.printTable(['ID', 'Name', 'Status', 'RPS', 'Created'], rows);
      } catch (err) {
        spin.stop();
        output.error(`Failed to list ghosts: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  ghosts
    .command('create [name]')
    .description('Create a new ghost instance')
    .option('-r, --rps <n>', 'Requests per second', '10')
    .option('-e, --endpoints <paths>', 'Comma-separated endpoint paths')
    .action(async (name, options) => {
      const client = getClient();
      const spin = output.spinner('Creating ghost instance...');
      spin.start();

      try {
        const res = await fetch(`${client.getBaseUrl()}/ghosts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name || `ghost-${Date.now()}`,
            config: {
              rps: parseInt(options.rps),
              endpoints: options.endpoints?.split(','),
            },
          }),
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const result = await res.json() as { id: string; name: string };

        spin.stop();
        output.success(`Ghost instance created: ${result.id}`);
        output.labelValue('Name', result.name);
      } catch (err) {
        spin.stop();
        output.error(`Failed to create ghost: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  ghosts
    .command('delete <id>')
    .description('Delete a ghost instance')
    .action(async (id) => {
      const client = getClient();
      const spin = output.spinner(`Deleting ghost ${id}...`);
      spin.start();

      try {
        const res = await fetch(`${client.getBaseUrl()}/ghosts/${id}`, {
          method: 'DELETE',
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);

        spin.stop();
        output.success(`Ghost ${id} deleted`);
      } catch (err) {
        spin.stop();
        output.error(`Failed to delete ghost: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  ghosts
    .command('start [id]')
    .description('Start traffic on a ghost instance')
    .action(async (id) => {
      const client = getClient();
      const spin = output.spinner(`Starting ghost ${id || 'all'}...`);
      spin.start();

      try {
        const endpoint = id ? `/ghosts/${id}/start` : '/ghosts/start';
        const res = await fetch(`${client.getBaseUrl()}${endpoint}`, {
          method: 'POST',
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);

        spin.stop();
        output.success(`Ghost ${id || 'instances'} started`);
      } catch (err) {
        spin.stop();
        output.error(`Failed to start ghost: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  ghosts
    .command('stop [id]')
    .description('Stop traffic on a ghost instance')
    .action(async (id) => {
      const client = getClient();
      const spin = output.spinner(`Stopping ghost ${id || 'all'}...`);
      spin.start();

      try {
        const endpoint = id ? `/ghosts/${id}/stop` : '/ghosts/stop';
        const res = await fetch(`${client.getBaseUrl()}${endpoint}`, {
          method: 'POST',
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);

        spin.stop();
        output.success(`Ghost ${id || 'instances'} stopped`);
      } catch (err) {
        spin.stop();
        output.error(`Failed to stop ghost: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
