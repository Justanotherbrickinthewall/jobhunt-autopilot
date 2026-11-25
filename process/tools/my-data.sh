#!/bin/sh
# Backs up the candidate's gitignored folders to their own private repo.
# A second git directory, .my-data.git, tracks only my-* and take-home/, so it never mixes with the engine's repo.
#   npm run my:init -- <private repo url>    once
#   npm run my:save                          whenever
set -eu
cd "$(dirname "$0")/../.."
G="git --git-dir=.my-data.git --work-tree=."

case "${1:-}" in
  init)
    url="${2:-}"
    [ -n "$url" ] || { echo "usage: npm run my:init -- <private repo url>" >&2; exit 2; }
    # Refuse a public repo: these folders hold the profile, the pay figures and every application.
    if command -v gh >/dev/null 2>&1; then
      vis=$(gh repo view "$url" --json visibility -q .visibility 2>/dev/null || echo UNKNOWN)
      [ "$vis" = PRIVATE ] || { echo "Refused: $url is $vis, and it must be PRIVATE." >&2; exit 2; }
    else
      echo "gh is not installed, so the repo's visibility was not checked. Make sure it is private." >&2
    fi
    [ -d .my-data.git ] || $G init -q -b main
    $G config status.showUntrackedFiles no
    $G remote remove origin 2>/dev/null || true
    $G remote add origin "$url"
    echo "Ready. Run: npm run my:save"
    ;;
  save)
    [ -d .my-data.git ] || { echo "Run npm run my:init -- <private repo url> first." >&2; exit 2; }
    # -f because the engine's .gitignore ignores these folders. Caches and environments stay out.
    for d in my-*/ take-home/; do
      [ -d "$d" ] && [ "$d" != "my-profile.example/" ] && set -- "$@" "$d"
    done
    shift
    $G add -f -A -- "$@" ':!my-phone/dist' ':!my-notebook/tts-cache' \
      ':!**/node_modules/**' ':!**/.venv/**' ':!**/__pycache__/**' ':!**/.DS_Store' ':!**/*.lock'
    if $G diff --cached --quiet; then echo "Nothing new to save."; exit 0; fi
    $G commit -q -m "save $(date '+%Y-%m-%d %H:%M')"
    $G push -q -u origin main
    echo "Saved."
    ;;
  *)
    echo "usage: my-data.sh init <private repo url> | save" >&2; exit 2 ;;
esac
