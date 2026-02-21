/**
 * Apparatus CLI - Entry Point
 * CLI and REPL for Apparatus API
 */

import { createProgram } from './cli.js';
import { startRepl } from './repl.js';
import { registerCompletionsCommand } from './commands/completions.js';

async function main(): Promise<void> {
  const program = createProgram();

  // Add REPL command
  program
    .command('repl')
    .description('Start interactive REPL mode')
    .option('-u, --url <url>', 'Base URL')
    .option('-v, --verbose', 'Verbose output')
    .action(async (options) => {
      await startRepl(options);
    });

  // Register completions last so the full command tree is available
  registerCompletionsCommand(program);

  // If no arguments, show help
  if (process.argv.length <= 2) {
    program.help();
  }

  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    // Errors are handled by individual commands
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
