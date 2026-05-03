from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .paths import REPO_ROOT


@dataclass(frozen=True)
class SourceSpan:
    line_start: int
    line_end: int
    char_start: int
    char_end: int
    char_span_kind: str = "line-offset"


def source_path_id(path: Path) -> str:
    resolved = path.expanduser().resolve()
    try:
        return str(resolved.relative_to(REPO_ROOT))
    except ValueError:
        return str(resolved)


def source_ref_to_path(source_path: str) -> Path:
    path = Path(source_path).expanduser()
    return path if path.is_absolute() else REPO_ROOT / path


def source_scope_for_path(path: Path, *, fixture: bool = False) -> str:
    if fixture:
        return "fixture"
    resolved = path.expanduser().resolve()
    try:
        parts = resolved.relative_to(REPO_ROOT).parts
    except ValueError:
        return "external"
    if "quarantine" in parts:
        return "quarantine"
    if "archive" in parts or "_archive" in parts:
        return "archive"
    return "comparison-source"


def stripped_line_span(line: str) -> SourceSpan:
    stripped = line.strip()
    if not stripped:
        return SourceSpan(line_start=1, line_end=1, char_start=0, char_end=0)
    char_start = len(line) - len(line.lstrip())
    char_end = len(line.rstrip())
    return SourceSpan(line_start=1, line_end=1, char_start=char_start, char_end=char_end)


def span_text_for_ref(source_path: str, line_start: int, line_end: int, char_start: int, char_end: int) -> str | None:
    path = source_ref_to_path(source_path)
    if not path.exists() or line_start < 1 or line_end < line_start:
        return None
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    if line_end > len(lines):
        return None
    if line_start == line_end:
        line = lines[line_start - 1]
        if char_start < 0 or char_end < char_start or char_end > len(line):
            return None
        return line[char_start:char_end]
    selected = lines[line_start - 1 : line_end]
    if char_start < 0 or char_start > len(selected[0]) or char_end < 0 or char_end > len(selected[-1]):
        return None
    selected[0] = selected[0][char_start:]
    selected[-1] = selected[-1][:char_end]
    return "\n".join(selected)


def anchor_quote_to_source(text: str, quote: str) -> SourceSpan | None:
    if not quote:
        return None
    start = text.find(quote)
    if start < 0:
        return None
    end = start + len(quote)
    before = text[:start]
    selected = text[start:end]
    line_start = before.count("\n") + 1
    line_end = line_start + selected.count("\n")
    line_start_offset = before.rsplit("\n", 1)[-1]
    char_start = len(line_start_offset)
    if line_start == line_end:
        char_end = char_start + len(selected)
    else:
        char_end = len(selected.rsplit("\n", 1)[-1])
    return SourceSpan(line_start=line_start, line_end=line_end, char_start=char_start, char_end=char_end)


def span_from_offsets(text: str, start: int, end: int) -> SourceSpan | None:
    if start < 0 or end < start or end > len(text):
        return None
    before = text[:start]
    selected = text[start:end]
    line_start = before.count("\n") + 1
    line_end = line_start + selected.count("\n")
    char_start = len(before.rsplit("\n", 1)[-1])
    if line_start == line_end:
        char_end = char_start + len(selected)
    else:
        char_end = len(selected.rsplit("\n", 1)[-1])
    return SourceSpan(line_start=line_start, line_end=line_end, char_start=char_start, char_end=char_end)
