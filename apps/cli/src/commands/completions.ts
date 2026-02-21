/**
 * Completions Command
 * Generate shell completion scripts for bash, zsh, and fish
 */

import type { Command, Option } from 'commander';

interface OptionInfo {
  long: string;
  short?: string;
  description: string;
  takesValue: boolean;
}

interface CommandInfo {
  name: string;
  description: string;
  options: OptionInfo[];
  subcommands: CommandInfo[];
}

/**
 * Recursively walk a Commander command tree and extract completion metadata.
 */
function walkCommand(cmd: Command): CommandInfo {
  const options: OptionInfo[] = (cmd.options as Option[]).map((opt) => ({
    long: opt.long ?? '',
    short: opt.short,
    description: opt.description ?? '',
    takesValue: opt.required || opt.optional || false,
  }));

  const subcommands: CommandInfo[] = cmd.commands
    .filter((sub: Command) => !sub.name().startsWith('_'))
    .map((sub: Command) => walkCommand(sub));

  return {
    name: cmd.name(),
    description: cmd.description(),
    options,
    subcommands,
  };
}

// ---------------------------------------------------------------------------
// Bash
// ---------------------------------------------------------------------------

function generateBash(tree: CommandInfo): string {
  const lines: string[] = [];

  lines.push('# bash completion for apparatus / aps');
  lines.push('# eval "$(apparatus completions bash)"');
  lines.push('');
  lines.push('_apparatus() {');
  lines.push('  local cur prev words cword');
  lines.push('  _init_completion || return');
  lines.push('');
  lines.push('  # Walk COMP_WORDS to find the deepest matching subcommand');
  lines.push('  local cmd_path=""');
  lines.push('  local i=1');
  lines.push('  while [[ $i -lt $cword ]]; do');
  lines.push('    case "${words[$i]}" in');
  lines.push('      -*) ;; # skip flags');
  lines.push('      *) cmd_path="${cmd_path:+${cmd_path} }${words[$i]}" ;;');
  lines.push('    esac');
  lines.push('    (( i++ ))');
  lines.push('  done');
  lines.push('');

  // Build a case statement mapping command paths to their subcommands + options
  const cases = new Map<string, { subs: string[]; flags: string[] }>();

  function collect(info: CommandInfo, path: string): void {
    const subs = info.subcommands.map((s) => s.name);
    const flags = info.options.map((o) => o.long).filter(Boolean);
    if (info.options.some((o) => o.short)) {
      flags.push(...info.options.filter((o) => o.short).map((o) => o.short!));
    }
    cases.set(path, { subs, flags });
    for (const sub of info.subcommands) {
      collect(sub, path ? `${path} ${sub.name}` : sub.name);
    }
  }
  collect(tree, '');

  lines.push('  case "$cmd_path" in');
  for (const [path, { subs, flags }] of cases) {
    const pattern = path === '' ? '""' : `"${path}"`;
    const words = [...subs, ...flags].join(' ');
    lines.push(`    ${pattern})`);
    lines.push(`      COMPREPLY=( $(compgen -W "${words}" -- "$cur") )`);
    lines.push('      return ;;');
  }
  lines.push('  esac');
  lines.push('}');
  lines.push('');
  lines.push('complete -F _apparatus apparatus');
  lines.push('complete -F _apparatus aps');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Zsh
// ---------------------------------------------------------------------------

function generateZsh(tree: CommandInfo): string {
  const lines: string[] = [];

  lines.push('#compdef apparatus aps');
  lines.push('# zsh completion for apparatus / aps');
  lines.push('# eval "$(apparatus completions zsh)"');
  lines.push('');

  // Emit helper functions for each command node
  function emitFunction(info: CommandInfo, fnName: string): void {
    lines.push(`${fnName}() {`);

    // Flags via _arguments
    const argSpecs: string[] = [];
    for (const opt of info.options) {
      const flag = opt.short ? `{${opt.short},${opt.long}}` : opt.long;
      const desc = opt.description.replace(/'/g, "''");
      if (opt.takesValue) {
        argSpecs.push(`'${flag}[${desc}]:value:'`);
      } else {
        argSpecs.push(`'${flag}[${desc}]'`);
      }
    }

    if (info.subcommands.length > 0) {
      // Subcommand dispatch
      lines.push('  local -a subcmds');
      lines.push('  subcmds=(');
      for (const sub of info.subcommands) {
        const desc = sub.description.replace(/'/g, "''");
        lines.push(`    '${sub.name}:${desc}'`);
      }
      lines.push('  )');
      lines.push('');

      if (argSpecs.length > 0) {
        lines.push(`  _arguments -C \\`);
        for (const spec of argSpecs) {
          lines.push(`    ${spec} \\`);
        }
        lines.push("    '1:command:->cmd' \\");
        lines.push("    '*::arg:->args'");
      } else {
        lines.push("  _arguments -C \\");
        lines.push("    '1:command:->cmd' \\");
        lines.push("    '*::arg:->args'");
      }
      lines.push('');
      lines.push('  case "$state" in');
      lines.push('    cmd)');
      lines.push("      _describe 'command' subcmds ;;");
      lines.push('    args)');
      lines.push('      case "$words[1]" in');
      for (const sub of info.subcommands) {
        const subFn = `${fnName}-${sub.name}`;
        lines.push(`        ${sub.name}) ${subFn} ;;`);
      }
      lines.push('      esac ;;');
      lines.push('  esac');
    } else if (argSpecs.length > 0) {
      // Leaf command — just flags
      lines.push('  _arguments \\');
      lines.push(`    ${argSpecs.join(' \\\n    ')}`);
    }

    lines.push('}');
    lines.push('');

    // Recurse into subcommands
    for (const sub of info.subcommands) {
      emitFunction(sub, `${fnName}-${sub.name}`);
    }
  }

  emitFunction(tree, '_apparatus');

  lines.push('_apparatus "$@"');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Fish
// ---------------------------------------------------------------------------

function generateFish(tree: CommandInfo): string {
  const lines: string[] = [];

  lines.push('# fish completion for apparatus / aps');
  lines.push('# apparatus completions fish | source');
  lines.push('');

  // Emit completions for both binary names
  const binNames = ['apparatus', 'aps'];

  function emit(info: CommandInfo, ancestors: string[]): void {
    for (const bin of binNames) {
      // Condition: no subcommand yet (top-level) or specific subcommand path seen
      let condition: string;
      if (ancestors.length === 0) {
        condition = '__fish_use_subcommand';
      } else {
        condition = `__fish_seen_subcommand_from ${ancestors[ancestors.length - 1]}`;
      }

      // Options for this command
      for (const opt of info.options) {
        const long = opt.long.replace(/^--/, '');
        const desc = opt.description.replace(/'/g, "\\'");
        let parts = `complete -c ${bin} -n '${condition}' -l ${long}`;
        if (opt.short) {
          parts += ` -s ${opt.short.replace(/^-/, '')}`;
        }
        if (opt.takesValue) {
          parts += ' -r';
        }
        parts += ` -d '${desc}'`;
        lines.push(parts);
      }

      // Subcommands
      for (const sub of info.subcommands) {
        const desc = sub.description.replace(/'/g, "\\'");
        lines.push(`complete -c ${bin} -n '${condition}' -a '${sub.name}' -d '${desc}'`);
      }
    }

    // Recurse
    for (const sub of info.subcommands) {
      emit(sub, [...ancestors, sub.name]);
    }
  }

  emit(tree, []);
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const generators: Record<string, (tree: CommandInfo) => string> = {
  bash: generateBash,
  zsh: generateZsh,
  fish: generateFish,
};

export function registerCompletionsCommand(program: Command): void {
  program
    .command('completions')
    .description('Generate shell completion scripts')
    .argument('<shell>', 'Shell type: bash, zsh, or fish')
    .action((shell: string) => {
      const gen = generators[shell];
      if (!gen) {
        console.error(`Unknown shell: ${shell}. Supported: bash, zsh, fish`);
        process.exit(1);
      }
      const tree = walkCommand(program);
      // Exclude the completions command itself from the output
      tree.subcommands = tree.subcommands.filter((c) => c.name !== 'completions');
      process.stdout.write(gen(tree));
    });
}
