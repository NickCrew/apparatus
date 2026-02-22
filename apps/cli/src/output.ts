/**
 * CLI Output Formatting
 * Rich output with chalk and tables
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import ora, { type Ora } from 'ora';

export type OutputFormat = 'json' | 'table' | 'raw';

/**
 * Print JSON output
 */
export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Print raw output
 */
export function printRaw(data: unknown): void {
  if (typeof data === 'string') {
    console.log(data);
  } else {
    console.log(JSON.stringify(data));
  }
}

/**
 * Print success message
 */
export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Print error message
 */
export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

/**
 * Print warning message
 */
export function warning(message: string): void {
  console.log(chalk.yellow('⚠'), message);
}

/**
 * Print info message
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Print a labeled value
 */
export function labelValue(label: string, value: unknown): void {
  console.log(chalk.gray(label + ':'), value);
}

/**
 * Print a header
 */
export function header(text: string): void {
  console.log();
  console.log(chalk.bold.cyan(text));
  console.log(chalk.gray('─'.repeat(text.length)));
}

/**
 * Print a subheader
 */
export function subheader(text: string): void {
  console.log(chalk.bold(text));
}

/**
 * Print a key-value table
 */
export function printKeyValue(data: Record<string, unknown>): void {
  const table = new Table({
    chars: {
      'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
      'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
      'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '',
      'right': '', 'right-mid': '', 'middle': ' │ '
    },
    style: { 'padding-left': 0, 'padding-right': 1 }
  });

  for (const [key, value] of Object.entries(data)) {
    table.push([
      chalk.gray(key),
      formatValue(value)
    ]);
  }

  console.log(table.toString());
}

/**
 * Print a table with headers
 */
export function printTable(headers: string[], rows: unknown[][]): void {
  const table = new Table({
    head: headers.map(h => chalk.cyan(h)),
    style: { head: [], border: [] }
  });

  for (const row of rows) {
    table.push(row.map(formatValue));
  }

  console.log(table.toString());
}

/**
 * Print array of objects as table
 */
export function printObjectTable(objects: Record<string, unknown>[], columns?: string[]): void {
  if (objects.length === 0) {
    info('No data');
    return;
  }

  const keys = columns ?? Object.keys(objects[0]);
  const headers = keys.map(k => k.charAt(0).toUpperCase() + k.slice(1));
  const rows = objects.map(obj => keys.map(k => obj[k]));

  printTable(headers, rows);
}

/**
 * Format a value for display
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return chalk.gray('null');
  }
  if (typeof value === 'boolean') {
    return value ? chalk.green('true') : chalk.red('false');
  }
  if (typeof value === 'number') {
    return chalk.yellow(String(value));
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return chalk.gray('[]');
    return value.map(String).join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Create a spinner
 * Automatically disabled when not in a TTY (e.g., when piped)
 */
export function spinner(text: string): Ora {
  return ora({
    text,
    spinner: 'dots',
    // Disable spinner in non-TTY mode (piping, CI, etc.)
    isEnabled: process.stdout.isTTY ?? false,
  });
}

/**
 * Format status code
 */
export function formatStatus(status: number): string {
  if (status >= 200 && status < 300) {
    return chalk.green(status);
  }
  if (status >= 300 && status < 400) {
    return chalk.yellow(status);
  }
  if (status >= 400 && status < 500) {
    return chalk.red(status);
  }
  if (status >= 500) {
    return chalk.bgRed.white(status);
  }
  return String(status);
}

/**
 * Format latency
 */
export function formatLatency(ms: number | undefined): string {
  if (ms === undefined) return chalk.gray('-');
  if (ms < 100) return chalk.green(`${ms}ms`);
  if (ms < 500) return chalk.yellow(`${ms}ms`);
  return chalk.red(`${ms}ms`);
}

/**
 * Format bytes
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/**
 * Format health status
 */
export function formatHealth(status: string): string {
  switch (status) {
    case 'ok':
      return chalk.green('● healthy');
    case 'degraded':
      return chalk.yellow('◐ degraded');
    case 'error':
      return chalk.red('○ error');
    default:
      return chalk.gray('? unknown');
  }
}

/**
 * Handle command errors with consistent formatting
 */
export function handleError(error: unknown, context: string): never {
  if (error instanceof Error) {
    error(`${context}: ${error.message}`);
  } else if (typeof error === 'string') {
    error(`${context}: ${error}`);
  } else {
    error(`${context}: ${JSON.stringify(error)}`);
  }
  process.exit(1);
}

/**
 * Confirm destructive action with user
 */
export async function confirm(message: string, defaultYes = false): Promise<boolean> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const prompt = defaultYes ? `${message} (yes/no) [yes]: ` : `${message} (yes/no) [no]: `;
    rl.question(prompt, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      const isYes = normalized === 'yes' || normalized === 'y';
      const isNo = normalized === 'no' || normalized === 'n';

      if (isYes) resolve(true);
      else if (isNo) resolve(false);
      else resolve(defaultYes);
    });
  });
}

/**
 * Output data as JSON with proper formatting
 */
export function outputJson(data: unknown, options?: { jsonOnly?: boolean }): void {
  if (options?.jsonOnly) {
    console.log(JSON.stringify(data));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
