#!/usr/bin/env python3
"""rick-portal-handoff validate: mechanical lint for HANDOFF.md.

Exit codes: 0 = clean, 1 = warnings, 2 = errors.
Usage: validate.py [path/to/HANDOFF.md]
Default path precedence: arg > $HANDOFF_PATH > $TMPDIR/<repo-slug>-HANDOFF.md
"""
import os
import re
import subprocess
import sys
from pathlib import Path

REQUIRED_SECTIONS = ["## Mission", "## State", "## Files", "## Next"]
OPTIONAL_SECTIONS = ["## Decisions", "## Fail"]
VALID_STATUS = {"planning", "implementing", "debugging", "testing", "review", "done"}
MAX_LINES = 120
MAX_CODE_BLOCK = 15

errors, warnings = [], []


def default_path() -> Path:
    """Mirror scripts/handoff-path.sh: $HANDOFF_PATH > $TMPDIR/<repo-slug>-HANDOFF.md."""
    env = os.environ.get("HANDOFF_PATH")
    if env:
        return Path(env)
    tmp = os.environ.get("TMPDIR", "/tmp").rstrip("/")
    try:
        root = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
    except Exception:
        root = ""
    slug = Path(root).name if root else Path.cwd().name
    return Path(tmp) / f"{slug}-HANDOFF.md"


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_path()
    if not path.exists():
        print(f"ERROR: {path} not found")
        return 2

    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    # --- size budget
    if len(lines) > MAX_LINES:
        errors.append(f"line budget: {len(lines)} > {MAX_LINES}. Cut Fail history, then Context. Keep Mission/Next/Files.")
    elif len(lines) > MAX_LINES * 0.85:
        warnings.append(f"line budget: {len(lines)}/{MAX_LINES} — near limit")

    # --- required sections
    for sec in REQUIRED_SECTIONS:
        if sec not in text:
            errors.append(f"missing section: {sec}")

    # --- status field
    m = re.search(r"^status:\s*(\S+)", text, re.M)
    if not m:
        errors.append("missing 'status:' field")
    elif m.group(1) not in VALID_STATUS:
        errors.append(f"invalid status '{m.group(1)}'. Valid: {sorted(VALID_STATUS)}")

    # --- updated field
    if not re.search(r"^updated:\s*\d{4}-\d{2}-\d{2}", text, re.M):
        warnings.append("missing/malformed 'updated: YYYY-MM-DD'")

    # --- code blocks too big (handoff should anchor, not embed)
    in_block, block_len, block_start = False, 0, 0
    for i, line in enumerate(lines, 1):
        if line.strip().startswith("```"):
            if in_block:
                if block_len > MAX_CODE_BLOCK:
                    warnings.append(f"code block at line {block_start}: {block_len} lines > {MAX_CODE_BLOCK}. Anchor (path+symbol), don't embed.")
                in_block = False
            else:
                in_block, block_len, block_start = True, 0, i
        elif in_block:
            block_len += 1

    # --- backtick paths must exist (skip commands/symbols: heuristics)
    candidates = set(re.findall(r"`([^`\s]+)`", text))
    for c in candidates:
        looks_like_path = ("/" in c or c.endswith((".ts", ".py", ".md", ".json", ".tsx", ".kt", ".sh", ".yml", ".yaml"))) \
            and not c.startswith(("http", "-", "git ", "npm", "bun", "npx"))
        if looks_like_path and not Path(c).exists():
            errors.append(f"path cited but not on disk: `{c}`")

    # --- Next items need verify criteria
    next_match = re.search(r"## Next\n(.*?)(?=\n## |\Z)", text, re.S)
    if next_match:
        items = [l for l in next_match.group(1).splitlines() if re.match(r"\s*\d+\.", l)]
        if not items:
            errors.append("## Next has no numbered actions")
        for it in items:
            if "verify" not in it.lower() and "→" not in it:
                warnings.append(f"Next item lacks verify criterion: {it.strip()[:60]}")

    # --- staleness vs git: changed files not mentioned anywhere
    try:
        changed = subprocess.run(
            ["git", "diff", "--name-only", "HEAD"],
            capture_output=True, text=True, timeout=10,
        ).stdout.split()
        missing = [f for f in changed if f not in text and not f.startswith("docs/ai/")]
        if missing:
            warnings.append(f"files changed in working tree but absent from handoff: {missing[:8]}")
    except Exception:
        pass  # not a repo / no git — staleness check skipped

    # --- report
    for e in errors:
        print(f"ERROR: {e}")
    for w in warnings:
        print(f"WARN:  {w}")
    if not errors and not warnings:
        print(f"OK: {path} clean ({len(lines)} lines)")
    return 2 if errors else (1 if warnings else 0)


if __name__ == "__main__":
    sys.exit(main())
