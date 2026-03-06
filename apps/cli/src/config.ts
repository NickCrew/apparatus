/**
 * CLI Configuration
 * Config file loading and management
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface ApparatusConfig {
  baseUrl: string;
  timeout?: number;
  debug?: boolean;
  defaultFormat?: 'json' | 'table' | 'raw';
}

const CONFIG_DIR = join(homedir(), '.apparatus');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const HISTORY_FILE = join(CONFIG_DIR, 'history');

/**
 * Default configuration with environment variable support
 * Priority: env vars > config file > defaults
 */
const DEFAULT_CONFIG: ApparatusConfig = {
  baseUrl: process.env.APPARATUS_URL || 'http://localhost:8090',
  timeout: parseInt(process.env.APPARATUS_TIMEOUT || '30000', 10),
  debug: process.env.APPARATUS_DEBUG === 'true' || process.env.DEBUG === 'true',
  defaultFormat: (process.env.APPARATUS_FORMAT as 'json' | 'table' | 'raw') || 'table',
};

/**
 * Ensure config directory exists
 */
export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load configuration from file
 * Priority: env vars > config file > defaults
 */
export function loadConfig(): ApparatusConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content);
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (err) {
    // Log warning for config parse errors so users know their config is being ignored
    console.error(`Warning: Could not parse config file ${CONFIG_FILE}: ${(err as Error).message}`);
    console.error('Using default configuration (set APPARATUS_URL env var or fix config file)');
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Save configuration to file
 */
export function saveConfig(config: ApparatusConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Get config file path
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Get history file path
 */
export function getHistoryPath(): string {
  ensureConfigDir();
  return HISTORY_FILE;
}

/**
 * Load command history
 */
export function loadHistory(): string[] {
  try {
    if (existsSync(HISTORY_FILE)) {
      const content = readFileSync(HISTORY_FILE, 'utf-8');
      return content.split('\n').filter(line => line.trim());
    }
  } catch {
    // Ignore errors
  }
  return [];
}

/**
 * Append command to history
 */
export function appendHistory(command: string): void {
  ensureConfigDir();
  const history = loadHistory();
  // Avoid duplicates of last command
  if (history[history.length - 1] !== command) {
    history.push(command);
    // Keep last 1000 commands
    const trimmed = history.slice(-1000);
    writeFileSync(HISTORY_FILE, trimmed.join('\n'));
  }
}
