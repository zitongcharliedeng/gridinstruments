#!/usr/bin/env bash
# Enforce max line count per generated file (#221)
# Warns on files over 1000 lines, fails on files over 2500 lines
MAX_WARN=1000
MAX_FAIL=2500
EXIT=0

for f in _generated/*.ts _generated/**/*.ts; do
  [ -f "$f" ] || continue
  lines=$(wc -l < "$f")
  if [ "$lines" -gt "$MAX_FAIL" ]; then
    echo "FAIL: $f has $lines lines (max $MAX_FAIL)" >&2
    EXIT=1
  elif [ "$lines" -gt "$MAX_WARN" ]; then
    echo "WARN: $f has $lines lines (target <$MAX_WARN)"
  fi
done

exit $EXIT
