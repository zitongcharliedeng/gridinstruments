#!/usr/bin/env python3
"""Warn about code blocks longer than 50 lines without prose breaks."""
import os, sys

THRESHOLD = 50
warnings = 0
fence = "```"

for root, dirs, files in os.walk("literate"):
    for f in files:
        if not f.endswith(".lit.md"):
            continue
        path = os.path.join(root, f)
        lines = open(path).readlines()
        in_block = False
        block_start = 0
        block_len = 0
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith(fence) and not in_block:
                in_block = True
                block_start = i
                block_len = 0
            elif stripped.startswith(fence) and in_block:
                in_block = False
                if block_len > THRESHOLD:
                    print(f"[tangle] WARN: {path}:{block_start} — {block_len}-line code block without prose break")
                    warnings += 1
            elif in_block:
                block_len += 1

if warnings > 0:
    print(f"[tangle] {warnings} long code blocks found. Consider splitting with prose.")
