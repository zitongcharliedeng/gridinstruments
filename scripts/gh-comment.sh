#!/usr/bin/env bash
# Wrapper for gh issue comment that prefixes agent marker
# Usage: scripts/gh-comment.sh <issue-number> "comment body"
ISSUE="$1"
BODY="$2"
PREFIXED="🤖 **[Agent]** $BODY"
gh issue comment "$ISSUE" --body "$PREFIXED"
