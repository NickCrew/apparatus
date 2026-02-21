#!/usr/bin/env bash
set -euo pipefail

# ── Symlink manager for apparatus tools ─────────────────────────
# Usage: scripts/link-tools.sh [--target DIR] [--unlink] [--list] [tool...]

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0" 2>/dev/null || realpath "$0")")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$REPO_DIR/bin"

# ── Manifest ────────────────────────────────────────────────────
declare -A TOOLS=(
  [aps]="aps"
  [apparatus]="apparatus"
  [apparatus-tui]="apparatus-tui"
  [apparatus-escape]="apparatus-escape"
  [apparatus-imposter]="apparatus-imposter"
  [apparatus-sidecar]="apparatus-sidecar"
  [apparatus-server]="apparatus-server"
)

# ── Defaults ────────────────────────────────────────────────────
TARGET_DIR="$HOME/bin"
UNLINK=false
LIST=false
SELECTED=()

# ── Parse args ──────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET_DIR="$2"
      shift 2
      ;;
    --unlink)
      UNLINK=true
      shift
      ;;
    --list)
      LIST=true
      shift
      ;;
    -h|--help)
      echo "Usage: $(basename "$0") [--target DIR] [--unlink] [--list] [tool...]"
      echo ""
      echo "Options:"
      echo "  --target DIR   Install symlinks into DIR (default: ~/bin)"
      echo "  --unlink       Remove symlinks that point to this repo's bin/"
      echo "  --list         List available tools and exit"
      echo "  -h, --help     Show this help"
      echo ""
      echo "Tools: ${!TOOLS[*]}"
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
    *)
      SELECTED+=("$1")
      shift
      ;;
  esac
done

# ── List mode ───────────────────────────────────────────────────
if $LIST; then
  for tool in $(printf '%s\n' "${!TOOLS[@]}" | sort); do
    wrapper="$BIN_DIR/${TOOLS[$tool]}"
    if [[ -x "$wrapper" ]]; then
      echo "  $tool  →  $wrapper"
    else
      echo "  $tool  →  $wrapper  (not found)"
    fi
  done
  exit 0
fi

# ── Resolve selection ───────────────────────────────────────────
if [[ ${#SELECTED[@]} -eq 0 ]]; then
  SELECTED=("${!TOOLS[@]}")
fi

# Validate selection
for tool in "${SELECTED[@]}"; do
  if [[ -z "${TOOLS[$tool]+x}" ]]; then
    echo "Unknown tool: $tool" >&2
    echo "Available: ${!TOOLS[*]}" >&2
    exit 1
  fi
done

# ── Ensure target directory exists ──────────────────────────────
if ! $UNLINK; then
  if [[ ! -d "$TARGET_DIR" ]]; then
    echo "Creating $TARGET_DIR"
    mkdir -p "$TARGET_DIR"
  fi
fi

# ── Link / unlink ──────────────────────────────────────────────
errors=0
for tool in $(printf '%s\n' "${SELECTED[@]}" | sort); do
  wrapper="$BIN_DIR/${TOOLS[$tool]}"
  link="$TARGET_DIR/$tool"

  if $UNLINK; then
    # Only remove symlinks that point back to our bin/
    if [[ -L "$link" ]]; then
      link_target="$(readlink -f "$link" 2>/dev/null || realpath "$link")"
      if [[ "$link_target" == "$BIN_DIR/"* ]]; then
        rm "$link"
        echo "  removed  $link"
      else
        echo "  skipped  $link  (points elsewhere)"
      fi
    else
      echo "  skipped  $link  (not a symlink or missing)"
    fi
  else
    # Refuse to overwrite regular files
    if [[ -e "$link" && ! -L "$link" ]]; then
      echo "  ERROR    $link exists and is not a symlink — refusing to overwrite" >&2
      errors=$((errors + 1))
      continue
    fi

    # Check wrapper exists
    if [[ ! -x "$wrapper" ]]; then
      echo "  ERROR    wrapper not found: $wrapper" >&2
      errors=$((errors + 1))
      continue
    fi

    # Idempotent: skip if already correct
    if [[ -L "$link" ]]; then
      existing="$(readlink -f "$link" 2>/dev/null || realpath "$link")"
      expected="$(readlink -f "$wrapper" 2>/dev/null || realpath "$wrapper")"
      if [[ "$existing" == "$expected" ]]; then
        echo "  ok       $link  (already correct)"
        continue
      fi
      # Symlink exists but points elsewhere — update it
      rm "$link"
    fi

    ln -s "$wrapper" "$link"
    echo "  linked   $link  →  $wrapper"
  fi
done

if [[ $errors -gt 0 ]]; then
  echo ""
  echo "$errors error(s) — see above" >&2
  exit 1
fi
