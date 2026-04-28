from __future__ import annotations

import re
from dataclasses import dataclass

from .manifest import Source

HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")


@dataclass(frozen=True)
class Chunk:
    id: str
    source_id: str
    source_path: str
    title: str
    authority: str
    status: str
    role: str
    authority_rank: int
    authority_scope: str
    heading_path: list[str]
    line_start: int
    line_end: int
    text: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "source_id": self.source_id,
            "source_path": self.source_path,
            "title": self.title,
            "authority": self.authority,
            "status": self.status,
            "role": self.role,
            "authority_rank": self.authority_rank,
            "authority_scope": self.authority_scope,
            "heading_path": self.heading_path,
            "line_start": self.line_start,
            "line_end": self.line_end,
            "text": self.text,
        }


def chunk_markdown(source: Source, max_chars: int = 6000) -> list[Chunk]:
    lines = source.path.read_text(encoding="utf-8").splitlines()
    chunks: list[Chunk] = []
    heading_stack: list[str] = []
    buffer: list[str] = []
    buffer_start = 1
    buffer_heading: list[str] = []

    def flush(end_line: int) -> None:
        nonlocal buffer, buffer_start, buffer_heading
        text = "\n".join(buffer).strip()
        if not text:
            buffer = []
            buffer_start = end_line + 1
            buffer_heading = heading_stack.copy()
            return
        index = len(chunks) + 1
        chunks.append(
            Chunk(
                id=f"{source.id}::chunk-{index:04d}",
                source_id=source.id,
                source_path=source.rel_path,
                title=source.title,
                authority=source.authority,
                status=source.status,
                role=source.role,
                authority_rank=source.authority_rank,
                authority_scope=source.authority_scope,
                heading_path=buffer_heading,
                line_start=buffer_start,
                line_end=end_line,
                text=text,
            )
        )
        buffer = []
        buffer_start = end_line + 1
        buffer_heading = heading_stack.copy()

    for number, line in enumerate(lines, start=1):
        match = HEADING_RE.match(line)
        if match and buffer and sum(len(item) + 1 for item in buffer) >= max_chars // 2:
            flush(number - 1)
        if match:
            level = len(match.group(1))
            heading_stack = heading_stack[: level - 1] + [match.group(2).strip()]
        if not buffer:
            buffer_start = number
            buffer_heading = heading_stack.copy()
        buffer.append(line)
        if sum(len(item) + 1 for item in buffer) >= max_chars:
            flush(number)

    if buffer:
        flush(len(lines))

    return chunks
