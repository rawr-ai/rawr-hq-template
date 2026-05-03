from __future__ import annotations

import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .paths import CURRENT_ROOT, REPO_ROOT, RUNS_ROOT


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row, sort_keys=True) + "\n" for row in rows), encoding="utf-8")


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def rel(path: Path) -> str:
    return str(path.resolve().relative_to(REPO_ROOT))


def git_sha(short: bool = False) -> str:
    args = ["git", "rev-parse"]
    if short:
        args.append("--short=12")
    args.append("HEAD")
    return subprocess.check_output(args, cwd=REPO_ROOT, text=True).strip()


def new_run_dir(prefix: str = "run") -> Path:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    base = RUNS_ROOT / f"{timestamp}-{git_sha(short=True)}-{prefix}"
    candidate = base
    index = 1
    while candidate.exists():
        index += 1
        candidate = RUNS_ROOT / f"{base.name}-{index}"
    candidate.mkdir(parents=True, exist_ok=False)
    return candidate


def resolve_run(run: str | None) -> Path:
    if run in (None, "latest"):
        pointer = CURRENT_ROOT / "run.json"
        if not pointer.exists():
            raise FileNotFoundError("No current Semantica run exists yet. Run extract first.")
        data = read_json(pointer)
        return REPO_ROOT / data["run_dir"]
    run_path = Path(run)
    if not run_path.is_absolute():
        run_path = REPO_ROOT / run_path
    if not run_path.exists():
        raise FileNotFoundError(f"Run directory does not exist: {run_path}")
    return run_path


def mark_current(run_dir: Path, files: list[str] | None = None) -> None:
    CURRENT_ROOT.mkdir(parents=True, exist_ok=True)
    write_json(CURRENT_ROOT / "run.json", {"run_dir": rel(run_dir), "git_sha": git_sha()})
    for name in files or []:
        src = run_dir / name
        if src.exists():
            shutil.copyfile(src, CURRENT_ROOT / name)
