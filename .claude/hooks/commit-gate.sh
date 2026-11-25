#!/bin/bash
# PreToolUse on Bash: run engine.ts validate and npm run typecheck before any git commit. Exit 2 blocks.
INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log((JSON.parse(s).tool_input||{}).command||"")}catch{}})' 2>/dev/null)
case "$CMD" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac
cd "${CLAUDE_PROJECT_DIR:-$PWD}" 2>/dev/null || exit 0
OUT=$(node process/engine.ts validate 2>&1); RC=$?
if [ $RC -ne 0 ]; then
  echo "engine.ts validate failed (exit $RC). Fix before committing:" >&2
  printf '%s\n' "$OUT" | tail -30 >&2
  exit 2
fi
OUT=$(npm run typecheck 2>&1); RC=$?
if [ $RC -ne 0 ]; then
  echo "npm run typecheck failed (exit $RC). Fix before committing:" >&2
  printf '%s\n' "$OUT" | tail -30 >&2
  exit 2
fi
exit 0
