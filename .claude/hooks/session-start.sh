#!/bin/bash
# SessionStart: resolve the profile and pull a clean tree. Never fails.
cd "${CLAUDE_PROJECT_DIR:-$PWD}" 2>/dev/null || exit 0

if ! node process/engine.ts profile 2>&1; then
  echo "WARNING: profile did not resolve. Stop and report."
fi

if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  :  # no upstream: nothing to pull
elif [ -z "$(git status --porcelain 2>/dev/null)" ]; then
  PULL="$(git pull --rebase --autostash 2>&1)" || echo "WARNING: pull failed."
  echo "$PULL" | tail -2
else
  echo "Working tree dirty: skipped pull."
fi
exit 0
