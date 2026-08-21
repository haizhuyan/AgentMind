#!/usr/bin/env python3
"""Patch MediaCrawler for Linux Docker.

1. Remove channel=\"chrome\" (image has Chromium, not Google Chrome).
2. Inject --no-sandbox args into Playwright launch / launch_persistent_context.
3. sys.exit() without code → sys.exit(1) (QR 失败时原先会「假成功」).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "mindspider/DeepSentimentCrawling/MediaCrawler")
ARGS = (
    'args=["--no-sandbox", "--disable-dev-shm-usage", '
    '"--disable-gpu", "--disable-software-rasterizer"]'
)


def _is_launch_call(line: str) -> bool:
    return (
        "launch_persistent_context(" in line
        or "chromium.launch(" in line
        or "browser_type.launch(" in line
    )


def patch_text(text: str) -> str:
    text = re.sub(r",[ \t]*channel\s*=\s*\"chrome\"", "", text)
    text = re.sub(r"channel\s*=\s*\"chrome\"[ \t]*,[ \t]*", "", text)
    # Bare sys.exit() exits 0 and fools our bridge into thinking crawl succeeded.
    text = re.sub(r"\bsys\.exit\(\s*\)", "sys.exit(1)", text)

    # Weibo：旧 miniblog 登录页常无二维码，换成带二维码的通行证页
    text = text.replace(
        "https://passport.weibo.com/sso/signin?entry=miniblog&source=miniblog",
        "https://passport.weibo.com/sso/signin?entry=account&source=sinassopage&url=https%3A%2F%2Fmy.sina.com.cn",
    )

    lines = text.splitlines(keepends=True)
    out: list[str] = []
    in_launch = False
    saw_args = False
    depth = 0
    last_param_indent = "                "

    for line in lines:
        if not in_launch and _is_launch_call(line):
            in_launch = True
            saw_args = "args=" in line
            depth = line.count("(") - line.count(")")
            if depth <= 0:
                if not saw_args and ")" in line:
                    line = re.sub(r"\)\s*$", f", {ARGS})", line.rstrip("\n")) + (
                        "\n" if line.endswith("\n") else ""
                    )
                in_launch = False
                saw_args = False
                out.append(line)
                continue
            out.append(line)
            continue

        if in_launch:
            if "args=" in line:
                saw_args = True
            m = re.match(r"^(\s+)\w+\s*=", line)
            if m:
                last_param_indent = m.group(1)
            depth += line.count("(") - line.count(")")
            if depth <= 0:
                if not saw_args:
                    out.append(f"{last_param_indent}{ARGS},\n")
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
            compile(updated, str(path), "exec")
            path.write_text(updated, encoding="utf-8")
            changed += 1
            print(f"patched {path.relative_to(ROOT)}")
    print(f"done, {changed} files updated")


if __name__ == "__main__":
    main()
