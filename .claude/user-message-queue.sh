#!/usr/bin/env bash
# Debug: dump raw stdin to see what Claude Code sends to UserPromptSubmit
QUEUE="/home/firstinstallusername/gridinstruments/.claude/message-queue.md"
TS=$(TZ=Europe/London date +"%Y-%m-%d %H:%M:%S")
RAW=$(timeout 1 cat 2>/dev/null || true)
if [ -n "$RAW" ]; then
  echo "- [$TS] INPUT: ${RAW:0:500}" >> "$QUEUE"
else
  echo "- [$TS] EMPTY_STDIN" >> "$QUEUE"
fi
echo '{"continue":true}'
