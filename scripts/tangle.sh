#!/usr/bin/env bash
# scripts/tangle.sh — the ONLY way to generate source from .lit.md
# Targets: _generated/*.ts and index.html
# Pattern: delete → tangle → lock (chmod 444)
# Called by: npm run build (prebuild), npm test (pretest), nix develop (shellHook)
set -euo pipefail

FILEDB=".entangled/filedb.json"

# Step 1: Remove previously generated files AND clear filedb (prevents stale state)
# We must delete filedb.json too — entangled caches file hashes there and will skip
# re-creation of deleted targets if it thinks the hash is current.
if [ -f "$FILEDB" ] && command -v python3 &>/dev/null; then
  python3 -c "
import json, os
try:
    db = json.load(open('$FILEDB'))
    targets = db.get('targets', [])
    # Only use 'targets' array — 'files' dict contains ALL tracked files, not just generated ones
    for path in targets:
        if os.path.exists(path):
            os.chmod(path, 0o644)  # unlock first
            os.remove(path)
            print(f'[tangle] removed: {path}')
except Exception as e:
    print(f'[tangle] filedb parse note: {e}')
" 2>/dev/null || true
  # Clear filedb so entangled starts fresh — prevents "Nothing to be done" after target deletion
  rm -f "$FILEDB"
fi

# Step 1.5: Block build if literate code blocks contain comments
# Comments belong in prose BETWEEN blocks, not inside them.
violations=$(grep -rn '^\s*\(//\|/\*\|\*/\)' literate/ --include='*.lit.md' | grep -v 'http://' | grep -v 'https://' | wc -l || true)
if [ "$violations" -gt 0 ]; then
  echo "[tangle] ERROR: $violations comment violations in literate code blocks."
  echo "[tangle] Use prose between code blocks instead. Run:"
  echo "  grep -rn '^\s*\(//\|/\*\|\*/\)' literate/ --include='*.lit.md' | grep -v http | head -20"
  exit 1
fi

# Step 1.6: Warn about long code blocks without interweaved prose
if command -v python3 &>/dev/null; then
  python3 scripts/check-long-blocks.py 2>/dev/null || true
fi

# Step 2: Tangle from .lit.md source (no-op if no .lit.md files exist)
if ls literate/*.lit.md literate/**/*.lit.md &>/dev/null 2>&1; then
  echo "[tangle] Tangling from literate source..."
  entangled tangle --force
else
  echo "[tangle] No .lit.md files yet — tangle is a no-op"
  exit 0
fi

# Step 2.5: Strip entangled block markers from index.html
# Entangled inserts <!-- ~~ begin/end --> comments between multi-block targets.
# These are harmless in .ts files but break CSS inside <style> tags in HTML.
if [ -f "index.html" ]; then
  chmod 644 index.html 2>/dev/null || true
  sed -i '/^<!-- ~~.*-->$/d' index.html
  echo "[tangle] Stripped entangled markers from index.html"
fi

# Step 3: Lock generated files (chmod 444 — read-only)
if [ -f "$FILEDB" ] && command -v python3 &>/dev/null; then
  python3 -c "
import json, os, stat
try:
    db = json.load(open('$FILEDB'))
    targets = db.get('targets', [])
    # Only use 'targets' array — 'files' dict contains ALL tracked files, not just generated ones
    for path in targets:
        if os.path.exists(path):
            os.chmod(path, stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)  # 444
    print(len(targets))
except Exception as e:
    print(f'0')
" 2>/dev/null || echo "0"
fi

echo "[tangle] Done."
