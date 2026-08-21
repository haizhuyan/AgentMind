#!/usr/bin/env python3
"""Patch MediaCrawler for Linux Docker.

1. Remove channel=\"chrome\" (no Google Chrome in image; Playwright Chromium only).
2. Inject --no-sandbox args for standard Playwright launch path.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "mindspider/DeepSentimentCrawling/MediaCrawler")
ARGS_LINE = (
    '                args=["--no-sandbox", "--disable-dev-shm-usage", '
    '"--disable-gpu", "--disable-software-rasterizer"],\n'
)


def patch_text(text: str) -> str:
    text = re.sub(r",[ \t]*channel\s*=\s*\"chrome\"", "", text)
    text = re.sub(r"channel\s*=\s*\"chrome\"[ \t]*,[ \t]*", "", text)

    lines = text.splitlines(keepends=True)
    out: list[str] = []
    in_launch = False
    saw_args = False
    depth = 0
    for line in lines:
        stripped = line.lstrip()
        if (
            "launch_persistent_context(" in line
            or re.search(r"\blaunch\(", line)
        ) and not in_launch:
            in_launch = True
            saw_args = "args=" in line
            depth = line.count("(") - line.count(")")
            out.append(line)
            continue

        if in_launch:
            if "args=" in line:
                saw_args = True
            depth += line.count("(") - line.count(")")
            # Insert args before the closing of the call when we hit a line with only )
            if depth <= 0:
                if not saw_args:
                    out.append(ARGS_LINE)
                in_launch = False
                saw_args = False
            out.append(line)
            continue

        out.append(line)
    return "".join(out)


def main() -> None:
    if not ROOT.exists():
        raise SystemExit(f"MediaCrawler not found: {ROOT}")
    changed = 0
    for path in ROOT.rglob("*.py"):
        original = path.read_text(encoding="utf-8")
        updated = patch_text(original)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed += 1
            print(f"patched {path.relative_to(ROOT)}")
    print(f"done, {changed} files updated")


if __name__ == "__main__":
    main()
