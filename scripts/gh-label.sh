#!/usr/bin/env bash
# scripts/gh-label.sh — sanctioned way to add/remove labels on issues
# Usage: scripts/gh-label.sh <issue-number> add|remove <label>
set -euo pipefail

if [ $# -lt 3 ]; then
  echo "Usage: $0 <issue-number> add|remove <label>"
  exit 1
fi

ISSUE="$1"
ACTION="$2"
LABEL="$3"

if [ "$ACTION" = "add" ]; then
  gh issue edit "$ISSUE" --add-label "$LABEL"
  echo "Added '$LABEL' to #$ISSUE"
elif [ "$ACTION" = "remove" ]; then
  gh issue edit "$ISSUE" --remove-label "$LABEL"
  echo "Removed '$LABEL' from #$ISSUE"
else
  echo "Unknown action: $ACTION (use add or remove)"
  exit 1
fi
