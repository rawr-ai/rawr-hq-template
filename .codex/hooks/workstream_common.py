#!/usr/bin/env python3
"""Shared helpers for workstream Codex hooks."""

from __future__ import annotations

import json
import os
import py_compile
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable


AGENT_FILES = [
    "workstream-opening-steward.toml",
    "workstream-proof-ledger-auditor.toml",
    "workstream-closure-steward.toml",
]

SKILL_FILES = [
    "workstream-runner/SKILL.md",
    "workstream-review-loops/SKILL.md",
]

HOOK_FILES = [
    "workstream_common.py",
    "workstream_startup.py",
    "workstream_report_health.py",
    "workstream_closure_guard.py",
]


def load_payload() -> dict:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


def repo_root(payload: dict | None = None) -> Path:
    cwd = None
    if payload:
        cwd = payload.get("cwd")
    start = Path(cwd or os.getcwd()).resolve()
    current = start
    while True:
        if (current / ".git").exists() or (current / ".codex").exists():
            return current
        if current.parent == current:
            return start
        current = current.parent


def is_workstream_repo(root: Path) -> bool:
    return (root / ".agents" / "skills" / "workstream-runner" / "SKILL.md").exists()


def rel(root: Path, path: Path) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def run(root: Path, args: list[str], timeout: int = 5) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
        check=False,
    )


def changed_files(root: Path) -> list[str]:
    files: set[str] = set()
    status = run(root, ["git", "status", "--short"], timeout=5)
    if status.returncode == 0:
        for line in status.stdout.splitlines():
            if not line:
                continue
            path = line[3:].strip()
            if " -> " in path:
                path = path.split(" -> ", 1)[1].strip()
            if path:
                files.add(path)
    diff = run(root, ["git", "diff", "--name-only"], timeout=5)
    if diff.returncode == 0:
        for line in diff.stdout.splitlines():
            if line.strip():
                files.add(line.strip())
    cached = run(root, ["git", "diff", "--cached", "--name-only"], timeout=5)
    if cached.returncode == 0:
        for line in cached.stdout.splitlines():
            if line.strip():
                files.add(line.strip())
    return sorted(files)


def workstream_related(files: Iterable[str]) -> list[str]:
    related: list[str] = []
    for path in files:
        lower = path.lower()
        if (
            path.startswith(".codex/")
            or "workstream" in lower
            or path.endswith("WORKSTREAM_REPORT.md")
        ):
            related.append(path)
    return related


def warn(message: str) -> None:
    print(
        json.dumps(
            {
                "continue": True,
                "systemMessage": message,
                "suppressOutput": False,
            }
        )
    )


def context(message: str, event: str = "SessionStart") -> None:
    print(
        json.dumps(
            {
                "continue": True,
                "systemMessage": message,
                "suppressOutput": False,
            }
        )
    )


def block(reason: str) -> None:
    print(
        json.dumps(
            {
                "continue": False,
                "stopReason": reason,
                "systemMessage": reason,
                "suppressOutput": False,
            }
        )
    )


def silent() -> None:
    return


def validate_runtime_bundle(root: Path, compile_hooks: bool = False) -> list[str]:
    issues: list[str] = []

    config = root / ".codex" / "config.toml"
    if not config.exists():
        issues.append(".codex/config.toml is missing")
    elif "codex_hooks = true" not in read_text(config):
        issues.append(".codex/config.toml must enable [features] codex_hooks = true")

    hooks_json = root / ".codex" / "hooks.json"
    if not hooks_json.exists():
        issues.append(".codex/hooks.json is missing")
    else:
        try:
            data = json.loads(read_text(hooks_json))
        except json.JSONDecodeError as exc:
            issues.append(f".codex/hooks.json is invalid JSON: {exc}")
        else:
            hooks = data.get("hooks") if isinstance(data, dict) else None
            if not isinstance(hooks, dict):
                issues.append(".codex/hooks.json must contain a hooks object")
            else:
                for event in ("SessionStart", "PostToolUse", "Stop"):
                    if event not in hooks:
                        issues.append(f".codex/hooks.json missing {event} hook")

    agents_dir = root / ".codex" / "agents"
    for name in AGENT_FILES:
        path = agents_dir / name
        text = read_text(path)
        if not path.exists():
            issues.append(f".codex/agents/{name} is missing")
            continue
        required = [
            "name = ",
            "description = ",
            "developer_instructions = ",
            'model = "inherit"',
            'sandbox_mode = "read-only"',
        ]
        for token in required:
            if token not in text:
                issues.append(f".codex/agents/{name} missing {token}")

    skills_dir = root / ".agents" / "skills"
    for name in SKILL_FILES:
        path = skills_dir / name
        text = read_text(path)
        if not path.exists():
            issues.append(f".agents/skills/{name} is missing")
            continue
        if not re.search(r"(?s)^---\s*\n.*?^name:\s*", text, re.MULTILINE):
            issues.append(f".agents/skills/{name} missing frontmatter name")
        if not re.search(r"(?s)^---\s*\n.*?^description:\s*", text, re.MULTILINE):
            issues.append(f".agents/skills/{name} missing frontmatter description")

    hooks_dir = root / ".codex" / "hooks"
    for name in HOOK_FILES:
        path = hooks_dir / name
        if not path.exists():
            issues.append(f".codex/hooks/{name} is missing")
            continue
        if compile_hooks:
            try:
                py_compile.compile(str(path), doraise=True)
            except py_compile.PyCompileError as exc:
                issues.append(f".codex/hooks/{name} does not compile: {exc.msg}")

    return issues


def workstream_report_issues(root: Path, files: Iterable[str]) -> list[str]:
    issues: list[str] = []
    required = [
        "## Frame",
        "## Opening Packet",
        "## Output Contract",
        "## Review",
        "## Final Output",
        "## Next Workstream Packet",
    ]
    for path_text in files:
        path = root / path_text
        if path.suffix.lower() != ".md" or path.name == "SKILL.md":
            continue
        text = read_text(path)
        if "workstream" not in text.lower():
            continue
        if "Status:" not in text and "## Frame" not in text:
            continue
        for heading in required:
            if heading not in text:
                issues.append(f"{path_text} missing {heading}")
    return issues


def diff_check(root: Path, files: Iterable[str]) -> list[str]:
    paths = [path for path in files if (root / path).exists()]
    if not paths:
        return []
    proc = run(root, ["git", "diff", "--check", "--", *paths], timeout=10)
    if proc.returncode == 0:
        return []
    output = "\n".join(part for part in [proc.stdout.strip(), proc.stderr.strip()] if part)
    return [f"git diff --check failed:\n{output}"]
