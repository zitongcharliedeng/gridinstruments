#!/usr/bin/env bash
# scripts/gh-read-issue.sh — the ONLY sanctioned way to read a GitHub issue
# Forces full thread output: title + body + ALL comments
# Usage: bash scripts/gh-read-issue.sh 260
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <issue-number>"
  exit 1
fi

ISSUE="$1"

echo "═══════════════════════════════════════════════════════"
echo "  FULL ISSUE THREAD: #${ISSUE}"
echo "═══════════════════════════════════════════════════════"
echo ""

TITLE=$(gh issue view "$ISSUE" --json title -q '.title' 2>/dev/null)
BODY=$(gh issue view "$ISSUE" --json body -q '.body' 2>/dev/null)

echo "TITLE: ${TITLE}"
echo ""
echo "BODY:"
echo "${BODY}"
echo ""
echo "───────────────────────────────────────────────────────"
echo "COMMENTS:"
echo ""

gh issue view "$ISSUE" --comments 2>/dev/null | tail -n +6

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  END OF ISSUE #${ISSUE}"
echo "═══════════════════════════════════════════════════════"
