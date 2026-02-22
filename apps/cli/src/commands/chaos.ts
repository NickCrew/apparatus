/**
 * Chaos Commands
 * CPU spike, memory spike, crash, EICAR
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@apparatus/client';
import * as output from '../output.js';

export function registerChaosCommands(program: Command, getClient: () => ApparatusClient): void {
  const chaos = program
    .command('chaos')
    .description('Chaos engineering - CPU, memory, crash tests');

  // CPU Spike
  chaos
    .command('cpu')
    .description('Trigger CPU spike')
    .option('-d, --duration <ms>', 'Duration in milliseconds', '5000')
    .option('-i, --intensity <n>', 'Intensity (1-10)')
    .action(async (options) => {
      const client = getClient();
      const duration = parseInt(options.duration);
      const spin = output.spinner(`Triggering CPU spike for ${duration}ms...`);
      spin.start();

      try {
        const result = await client.chaos.cpuSpike({
          duration,
          intensity: options.intensity ? parseInt(options.intensity) : undefined,
        });
        spin.stop();
        output.success(result.message || `CPU spike completed (${result.duration}ms)`);
      } catch (err) {
        spin.stop();
        output.error(`CPU spike failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Memory Spike
  chaos
    .command('memory')
    .description('Trigger memory spike')
    .option('-s, --size <bytes>', 'Size in bytes', '104857600') // 100MB default
    .option('-d, --duration <ms>', 'Duration in milliseconds')
    .option('--clear', 'Clear allocated memory')
    .action(async (options) => {
      const client = getClient();

      if (options.clear) {
        const spin = output.spinner('Clearing allocated memory...');
        spin.start();
        try {
          const result = await client.chaos.memoryClear();
          spin.stop();
          output.success(`${result.message} (freed: ${output.formatBytes(result.freed)})`);
        } catch (err) {
          spin.stop();
          output.error(`Memory clear failed: ${(err as Error).message}`);
          process.exit(1);
        }
        return;
      }

      const size = parseInt(options.size);
      const spin = output.spinner(`Allocating ${output.formatBytes(size)}...`);
      spin.start();

      try {
        const result = await client.chaos.memorySpike({
          size,
          duration: options.duration ? parseInt(options.duration) : undefined,
        });
        spin.stop();
        output.success(`${result.message} (allocated: ${output.formatBytes(result.allocated)})`);
      } catch (err) {
        spin.stop();
        output.error(`Memory spike failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Crash
  chaos
    .command('crash')
    .description('Trigger server crash (use with caution!)')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options) => {
      if (!options.force) {
        output.warning('This will crash the server! Use --force to confirm.');
        process.exit(1);
      }

      const client = getClient();
      output.warning('Triggering server crash...');

      try {
        await client.chaos.crash();
        output.success('Crash triggered - server should be down');
      } catch (err) {
        // Connection error is expected after crash
        if ((err as Error).message.includes('connect') || (err as Error).message.includes('ECONNREFUSED')) {
          output.success('Server crashed successfully');
        } else {
          output.error(`Unexpected error: ${(err as Error).message}`);
        }
      }
    });

  // EICAR
  chaos
    .command('eicar')
    .description('Get EICAR antivirus test file')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching EICAR test file...');
      spin.start();

      try {
        const result = await client.chaos.eicar();
        spin.stop();
        output.header('EICAR Test File');
        output.printKeyValue({
          Filename: result.filename,
          'Content-Type': result.contentType,
        });
        output.subheader('\nContent:');
        console.log(result.content);
      } catch (err) {
        spin.stop();
        output.error(`EICAR fetch failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Quick test alias
  chaos
    .command('test')
    .description('Run a quick chaos test (5s CPU spike)')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Running quick chaos test (5s CPU spike)...');
      spin.start();

      try {
        const result = await client.chaos.quickTest();
        spin.stop();
        output.success(result.message || 'Quick test completed');
      } catch (err) {
        spin.stop();
        output.error(`Quick test failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Chaos status
  chaos
    .command('status')
    .description('Get status of active chaos experiments')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Fetching chaos status...');
      spin.start();

      try {
        const res = await fetch(`${client.getBaseUrl()}/chaos/status`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const result = await res.json() as {
          active: boolean;
          experiments?: Array<{ type: string; duration: number; startTime: string; config?: Record<string, unknown> }>;
          count?: number;
        };

        spin.stop();

        if (options.json) {
          output.outputJson(result);
        } else {
          output.header('Chaos Experiments Status');
          output.labelValue('Active Experiments', result.count || result.experiments?.length || 0);

          if (!result.experiments || result.experiments.length === 0) {
            output.info('No active chaos experiments');
            return;
          }

          output.subheader('\nActive Experiments:');
          const rows = result.experiments.map((exp, idx) => [
            idx + 1,
            exp.type,
            `${exp.duration}ms`,
            new Date(exp.startTime).toLocaleTimeString(),
          ]);
          output.printTable(['#', 'Type', 'Duration', 'Started'], rows);
        }
      } catch (err) {
        spin.stop();
        output.handleError(err, 'Failed to fetch chaos status');
      }
    });
}
