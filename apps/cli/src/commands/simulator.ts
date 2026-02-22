/**
 * Simulator Commands
 * Supply chain attack simulation and dependency graph analysis
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@apparatus/client';
import * as output from '../output.js';

export function registerSimulatorCommands(program: Command, getClient: () => ApparatusClient): void {
  const simulator = program
    .command('simulator')
    .description('Supply chain and dependency graph simulation');

  // Supply chain command
  simulator
    .command('supply-chain')
    .description('Trigger a simulated supply chain attack')
    .option('-t, --target <url>', 'C2 target URL', 'http://attacker.com')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Triggering supply chain attack...');
      spin.start();

      try {
        const result = await client.simulator.triggerSupplyChainAttack(options.target);
        spin.stop();

        output.header('Supply Chain Attack Simulation');
        output.labelValue('Events', result.logs.length);

        output.subheader('\nAttack Timeline:');
        for (const log of result.logs) {
          console.log(`  ${log}`);
        }
      } catch (err) {
        spin.stop();
        output.error(`Supply chain attack failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Dependencies command group
  const deps = simulator
    .command('dependencies')
    .description('Analyze and manipulate dependency graph');

  // List dependencies
  deps
    .command('list')
    .alias('ls')
    .description('List all packages in dependency graph')
    .option('--filter <status>', 'Filter by status: clean|infected|compromised')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Fetching dependency graph...');
      spin.start();

      try {
        const graph = await client.simulator.getDependencyGraph();
        spin.stop();

        const nodes = Object.values(graph.nodes);
        let filteredNodes = nodes;

        if (options.filter) {
          filteredNodes = nodes.filter(n => n.status === options.filter);
        }

        output.header(`Dependency Graph (${nodes.length} total packages)`);
        output.labelValue('Clean', nodes.filter(n => n.status === 'clean').length);
        output.labelValue('Infected', nodes.filter(n => n.status === 'infected').length);
        output.labelValue('Compromised', nodes.filter(n => n.status === 'compromised').length);

        if (filteredNodes.length > 0) {
          output.subheader('\nPackages:');
          const rows = filteredNodes.slice(0, 50).map(node => {
            const statusIcon = node.status === 'clean' ? '✓' :
                              node.status === 'infected' ? '🔥' : '⚠️';
            return [
              statusIcon,
              node.id,
              node.name,
              node.version,
              `${node.dependencies.length} deps`,
            ];
          });
          output.printTable(['', 'ID', 'Name', 'Version', 'Dependencies'], rows);

          if (filteredNodes.length > 50) {
            output.info(`... and ${filteredNodes.length - 50} more`);
          }
        } else {
          output.info('No packages found matching filter');
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch graph: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Infect package
  deps
    .command('infect <package-id>')
    .description('Inject malware into a package (simulate infection)')
    .action(async (packageId) => {
      const client = getClient();
      const spin = output.spinner(`Infecting package ${packageId}...`);
      spin.start();

      try {
        const result = await client.simulator.infect(packageId);
        spin.stop();

        output.header('Infection Result');
        output.printKeyValue({
          Status: result.status,
          Package: result.node.name,
          Version: result.node.version,
          'Compromised Packages': result.impact,
        });

        output.success(`Package ${result.node.id} is now infected`);
      } catch (err) {
        spin.stop();
        output.error(`Infection failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Reset graph
  deps
    .command('reset')
    .description('Reset dependency graph to clean state')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (options) => {
      if (!options.confirm) {
        output.warning('This will reset the entire dependency graph to clean state');
        // For CLI, we could add prompt here if needed
      }

      const client = getClient();
      const spin = output.spinner('Resetting dependency graph...');
      spin.start();

      try {
        const graph = await client.simulator.reset();
        spin.stop();

        output.success('Dependency graph has been reset');
        output.labelValue('Total Packages', Object.keys(graph.nodes).length);
      } catch (err) {
        spin.stop();
        output.error(`Reset failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
