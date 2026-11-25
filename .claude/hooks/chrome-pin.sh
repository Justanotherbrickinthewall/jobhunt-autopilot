#!/bin/bash
# Chrome pin. Usage: chrome-pin.sh post  (PostToolUse on mcp__claude-in-chrome__select_browser)
#                    chrome-pin.sh pre   (PreToolUse on mcp__claude-in-chrome__.*)
MODE="$1"
export HOOK_INPUT="$(cat)"
export PROJ="${CLAUDE_PROJECT_DIR:-$PWD}"
export MODE
exec node "$PROJ/.claude/hooks/chrome-pin.ts"
