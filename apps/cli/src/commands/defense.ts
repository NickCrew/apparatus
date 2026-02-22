/**
 * Defense Commands
 * Tarpit and deception/honeypot
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@apparatus/client';
import chalk from 'chalk';
import * as output from '../output.js';

export function registerDefenseCommands(program: Command, getClient: () => ApparatusClient): void {
  const defense = program
    .command('defense')
    .description('Defense - tarpit and honeypot deception');

  // Tarpit commands
  const tarpit = defense
    .command('tarpit')
    .description('Manage tarpit (IP trapping)');

  tarpit
    .command('list')
    .alias('ls')
    .description('List trapped IPs')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching tarpit status...');
      spin.start();

      try {
        const result = await client.defense.listTrapped();
        spin.stop();

        output.header(`Tarpit Status (${result.count} trapped)`);

        output.subheader('Trap Paths:');
        for (const path of result.trapPaths) {
          console.log(`  ${chalk.yellow('•')} ${path}`);
        }

        if (result.trapped.length === 0) {
          output.info('\nNo IPs currently trapped');
        } else {
          output.subheader('\nTrapped IPs:');
          const rows = result.trapped.map(t => [
            t.ip,
            new Date(t.trappedAt).toLocaleString(),
            `${t.duration}s`,
          ]);
          output.printTable(['IP', 'Trapped At', 'Duration'], rows);
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch tarpit status: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  tarpit
    .command('release [ip]')
    .description('Release IP from tarpit (or all if no IP specified)')
    .action(async (ip) => {
      const client = getClient();
      const spin = output.spinner(ip ? `Releasing ${ip}...` : 'Releasing all IPs...');
      spin.start();

      try {
        const result = ip
          ? await client.defense.release(ip)
          : await client.defense.releaseAll();

        spin.stop();
        if (result.status === 'released') {
          output.success(`Released IP: ${result.ip}`);
        } else if (result.status === 'cleared') {
          output.success(`Released ${result.count} IPs`);
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to release: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  tarpit
    .command('count')
    .description('Get count of trapped IPs')
    .action(async () => {
      const client = getClient();
      try {
        const count = await client.defense.getTrappedCount();
        output.labelValue('Trapped IPs', count);
      } catch (err) {
        output.error(`Failed to get count: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Deception commands
  const deception = defense
    .command('deception')
    .description('Manage honeypot deception');

  deception
    .command('history')
    .alias('ls')
    .description('Show deception event history')
    .option('-n, --limit <n>', 'Limit results', '20')
    .option('-t, --type <type>', 'Filter by type (honeypot_hit, shell_command, sqli_probe)')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Fetching deception history...');
      spin.start();

      try {
        const result = await client.defense.deceptionHistory();
        spin.stop();

        let events = result.events;
        if (options.type) {
          events = events.filter(e => e.type === options.type);
        }
        events = events.slice(0, parseInt(options.limit));

        output.header(`Deception History (${result.count} total)`);

        if (events.length === 0) {
          output.info('No deception events');
          return;
        }

        const rows = events.map(e => {
          let typeIcon;
          switch (e.type) {
            case 'honeypot_hit': typeIcon = chalk.red('🍯'); break;
            case 'shell_command': typeIcon = chalk.yellow('💻'); break;
            case 'sqli_probe': typeIcon = chalk.magenta('💉'); break;
            default: typeIcon = '❓';
          }
          return [
            typeIcon + ' ' + e.type,
            e.ip,
            e.route,
            new Date(e.timestamp).toLocaleTimeString(),
          ];
        });
        output.printTable(['Type', 'IP', 'Route', 'Time'], rows);
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch history: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  deception
    .command('clear')
    .description('Clear deception history')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Clearing history...');
      spin.start();

      try {
        const result = await client.defense.clearDeceptionHistory();
        spin.stop();
        output.success(`Cleared ${result.count} events`);
      } catch (err) {
        spin.stop();
        output.error(`Failed to clear history: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  deception
    .command('shells')
    .description('Show shell command history from AI honeypot')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching shell commands...');
      spin.start();

      try {
        const commands = await client.defense.getShellCommandHistory();
        spin.stop();

        if (commands.length === 0) {
          output.info('No shell commands captured');
          return;
        }

        output.header(`Shell Command History (${commands.length})`);
        for (const cmd of commands) {
          console.log(`${chalk.gray(cmd.timestamp)} ${chalk.cyan(cmd.ip)}`);
          console.log(`  ${chalk.yellow('$')} ${(cmd.details as { command?: string }).command || 'unknown'}`);
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch shell commands: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // MTD (Moving Target Defense) commands
  const mtd = defense
    .command('mtd')
    .description('Moving Target Defense - route obfuscation');

  mtd
    .command('status')
    .description('Get MTD status')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching MTD status...');
      spin.start();

      try {
        const result = await client.mtd.status();
        spin.stop();

        output.header('MTD Status');
        output.printKeyValue({
          Enabled: result.enabled ? chalk.green('✓ Active') : chalk.red('✗ Disabled'),
          'Current Profile': result.currentProfile,
          'Next Rotation': result.nextRotation,
        });
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch MTD status: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  mtd
    .command('rotate')
    .description('Manually rotate to a new defense profile')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Rotating MTD profile...');
      spin.start();

      try {
        const result = await client.mtd.rotate();
        spin.stop();
        output.success(`Rotated to profile: ${result.newProfile}`);
        output.labelValue('Previous', result.previousProfile);
      } catch (err) {
        spin.stop();
        output.error(`MTD rotation failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  mtd
    .command('enable')
    .description('Enable MTD')
    .action(async () => {
      const client = getClient();
      try {
        await client.mtd.enable();
        output.success('MTD enabled');
      } catch (err) {
        output.error(`Failed to enable MTD: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  mtd
    .command('disable')
    .description('Disable MTD')
    .action(async () => {
      const client = getClient();
      try {
        await client.mtd.disable();
        output.success('MTD disabled');
      } catch (err) {
        output.error(`Failed to disable MTD: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  mtd
    .command('toggle')
    .description('Toggle MTD on/off')
    .action(async () => {
      const client = getClient();
      try {
        const result = await client.mtd.toggle();
        output.success(`MTD ${result.enabled ? 'enabled' : 'disabled'}`);
      } catch (err) {
        output.error(`Failed to toggle MTD: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  mtd
    .command('interval <ms>')
    .description('Set rotation interval in milliseconds')
    .action(async (ms) => {
      const client = getClient();
      try {
        const result = await client.mtd.setInterval(parseInt(ms));
        output.success(`Interval set to ${ms}ms`);
        output.labelValue('Next Rotation', result.nextRotation);
      } catch (err) {
        output.error(`Failed to set interval: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Cluster commands
  const cluster = defense
    .command('cluster')
    .description('Cluster coordination - distributed attacks');

  cluster
    .command('members')
    .description('List cluster members')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching cluster members...');
      spin.start();

      try {
        const result = await client.cluster.members();
        spin.stop();

        output.header(`Cluster Members (${result.members.length})`);
        output.labelValue('Leader', result.leader);

        if (result.members.length === 0) {
          output.info('\nNo members in cluster');
          return;
        }

        output.subheader('\nMembers:');
        const rows = result.members.map(m => [
          m.hostname,
          m.status === 'healthy' ? chalk.green('healthy') : chalk.red(m.status),
          m.role,
          m.lastSeen,
        ]);
        output.printTable(['Hostname', 'Status', 'Role', 'Last Seen'], rows);
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch cluster members: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  cluster
    .command('attack <type>')
    .description('Start a distributed cluster attack')
    .option('-t, --target <target>', 'Target URL or endpoint')
    .option('-p, --params <json>', 'Attack parameters as JSON')
    .action(async (type, options) => {
      const client = getClient();
      const spin = output.spinner(`Initiating ${type} attack...`);
      spin.start();

      try {
        const params = options.params ? JSON.parse(options.params) : undefined;
        const result = await client.cluster.attack({
          type,
          target: options.target,
          params,
        });
        spin.stop();

        output.success('Attack initiated');
        output.printKeyValue({
          'Attack ID': result.id,
          Type: result.type,
          Status: result.status,
          'Participating Nodes': result.nodesCount,
        });
      } catch (err) {
        spin.stop();
        output.error(`Attack failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  cluster
    .command('attack-status <id>')
    .description('Get status of a cluster attack')
    .action(async (id) => {
      const client = getClient();
      const spin = output.spinner('Fetching attack status...');
      spin.start();

      try {
        const result = await client.cluster.getAttackStatus(id);
        spin.stop();

        output.header(`Attack Status: ${id}`);
        output.printKeyValue({
          Type: result.type,
          Status: result.status,
          'Started At': result.startedAt,
          'Nodes Participating': result.nodesCount,
        });
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch attack status: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  cluster
    .command('attack-stop <id>')
    .description('Stop a cluster attack')
    .action(async (id) => {
      const client = getClient();
      const spin = output.spinner('Stopping attack...');
      spin.start();

      try {
        await client.cluster.stopAttack(id);
        spin.stop();
        output.success(`Attack ${id} stopped`);
      } catch (err) {
        spin.stop();
        output.error(`Failed to stop attack: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  cluster
    .command('count')
    .description('Get count of cluster members')
    .action(async () => {
      const client = getClient();
      try {
        const count = await client.cluster.getMemberCount();
        output.labelValue('Cluster Members', count);
      } catch (err) {
        output.error(`Failed to get count: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  cluster
    .command('leader')
    .description('Get cluster leader')
    .action(async () => {
      const client = getClient();
      try {
        const leader = await client.cluster.getLeader();
        output.labelValue('Leader', leader);
      } catch (err) {
        output.error(`Failed to get leader: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  cluster
    .command('healthy')
    .description('List healthy cluster members')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching healthy members...');
      spin.start();

      try {
        const members = await client.cluster.getHealthyMembers();
        spin.stop();

        output.header(`Healthy Members (${members.length})`);
        for (const m of members) {
          console.log(`  ${chalk.green('●')} ${m.hostname} (${m.role})`);
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch healthy members: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Blackhole commands
  const blackhole = defense
    .command('blackhole')
    .description('Blackhole defense - hard-drop all traffic from IP');

  blackhole
    .command('list')
    .alias('ls')
    .description('List IPs in blackhole')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching blackhole status...');
      spin.start();

      try {
        const res = await fetch(`${client.getBaseUrl()}/blackhole`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const result = await res.json() as { ips: Array<{ ip: string; timestamp: string; reason?: string }> };

        spin.stop();
        output.header(`Blackhole Status (${result.ips?.length || 0} blocked IPs)`);

        if (!result.ips || result.ips.length === 0) {
          output.info('No IPs currently blocked');
          return;
        }

        output.subheader('\nBlocked IPs:');
        const rows = result.ips.map(entry => [
          chalk.red('●'),
          entry.ip,
          new Date(entry.timestamp).toLocaleString(),
          entry.reason || '-',
        ]);
        output.printTable(['', 'IP Address', 'Blocked At', 'Reason'], rows);
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch blackhole status: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  blackhole
    .command('add <ip>')
    .description('Add IP to blackhole (drop all traffic)')
    .option('-r, --reason <reason>', 'Reason for blocking')
    .action(async (ip, options) => {
      const client = getClient();
      const spin = output.spinner(`Adding ${ip} to blackhole...`);
      spin.start();

      try {
        const res = await fetch(`${client.getBaseUrl()}/blackhole`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip,
            reason: options.reason,
          }),
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const result = await res.json() as { status: string; ip: string };

        spin.stop();
        output.success(`IP blocked: ${result.ip}`);
        output.labelValue('Status', result.status);
      } catch (err) {
        spin.stop();
        output.error(`Failed to add IP to blackhole: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  blackhole
    .command('release [ip]')
    .description('Release IP from blackhole (or all if no IP specified)')
    .action(async (ip) => {
      const client = getClient();
      const spin = output.spinner(ip ? `Releasing ${ip}...` : 'Releasing all IPs...');
      spin.start();

      try {
        const res = await fetch(`${client.getBaseUrl()}/blackhole/release`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip }),
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const result = await res.json() as { status: string; released?: number };

        spin.stop();
        if (result.status === 'released') {
          output.success(`Released IP: ${ip}`);
        } else {
          output.success(`Released ${result.released || 'all'} IP(s)`);
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to release IP: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
