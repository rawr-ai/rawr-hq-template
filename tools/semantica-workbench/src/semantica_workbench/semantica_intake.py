from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .chunking import HEADING_RE, chunk_markdown
from .manifest import Source


@dataclass(frozen=True)
class SpanMapping:
    line_start: int
    line_end: int
    text: str


def semantica_intake_probe(source: Source, max_chars: int = 6000) -> dict[str, Any]:
    """Probe semantica-backed split output while preserving RAWR source metadata."""
    raw_text = source.path.read_text(encoding="utf-8")
    local_chunks = chunk_markdown(source, max_chars=max_chars)
    status = semantica_intake_status()
    chunks: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    try:
        from semantica.split import StructuralChunker

        semantica_chunks = StructuralChunker(chunk_size=max_chars).chunk(raw_text)
    except Exception as exc:
        semantica_chunks = []
        errors.append({"kind": "semantica_split_failed", "error": str(exc)})

    for index, semantica_chunk in enumerate(semantica_chunks, start=1):
        mapping = map_semantica_chunk_to_span(
            raw_text,
            getattr(semantica_chunk, "start_index", None),
            getattr(semantica_chunk, "end_index", None),
        )
        if mapping is None:
            errors.append({"kind": "unmapped_semantica_chunk", "index": str(index)})
            continue
        heading_path = heading_path_at_line(raw_text, mapping.line_start)
        chunks.append(
            {
                "id": f"{source.id}::semantica-chunk-{index:04d}",
                "source_id": source.id,
                "source_path": source.rel_path,
                "title": source.title,
                "authority": source.authority,
                "status": source.status,
                "role": source.role,
                "authority_rank": source.authority_rank,
                "authority_scope": source.authority_scope,
                "heading_path": heading_path,
                "line_start": mapping.line_start,
                "line_end": mapping.line_end,
                "text": mapping.text,
                "semantica": {
                    "chunker": semantica_chunk.__class__.__name__,
                    "start_index": getattr(semantica_chunk, "start_index", None),
                    "end_index": getattr(semantica_chunk, "end_index", None),
                    "metadata": getattr(semantica_chunk, "metadata", {}),
                },
                "provenance": source_reference(source, mapping, heading_path),
            }
        )

    exact_spans = bool(chunks) and not errors and all(chunk["line_start"] <= chunk["line_end"] for chunk in chunks)
    return {
        "schema_version": "rawr-semantica-intake-v1",
        "source": source_metadata(source),
        "status": status,
        "chunks": chunks,
        "errors": errors,
        "parity": {
            "local_chunk_count": len(local_chunks),
            "semantica_chunk_count": len(chunks),
            "exact_line_spans": exact_spans,
            "source_identity_preserved": all(
                chunk["source_path"] == source.rel_path and chunk["source_id"] == source.id for chunk in chunks
            ),
            "authority_preserved": all(
                chunk["authority_rank"] == source.authority_rank and chunk["authority_scope"] == source.authority_scope
                for chunk in chunks
            ),
        },
        "fallback": {
            "chunk_markdown_retained": True,
            "decision_grade_source": "semantica-intake"
            if exact_spans and status["markdown_parser_available"]
            else "chunk_markdown",
            "removal_trigger": "Switch decision-grade intake only after semantica Markdown parsing and span parity are both proven.",
        },
    }


def semantica_intake_status() -> dict[str, Any]:
    try:
        from semantica import ingest, parse, provenance, split

        markdown_parser_available = hasattr(parse, "MarkdownParser")
        return {
            "available": True,
            "classification": "probe-ready" if markdown_parser_available else "partial",
            "ingest_available": hasattr(ingest, "FileIngestor"),
            "split_available": hasattr(split, "StructuralChunker"),
            "provenance_available": hasattr(provenance, "SourceReference"),
            "markdown_parser_available": markdown_parser_available,
            "limitation": ""
            if markdown_parser_available
            else "Pinned semantica package lacks MarkdownParser; RAWR span adapter and chunk_markdown remain required.",
        }
    except Exception as exc:
        return {
            "available": False,
            "classification": "blocked",
            "error": str(exc),
            "ingest_available": False,
            "split_available": False,
            "provenance_available": False,
            "markdown_parser_available": False,
        }


def map_semantica_chunk_to_span(text: str, start_index: int | None, end_index: int | None) -> SpanMapping | None:
    if start_index is None or end_index is None:
        return None
    if start_index < 0 or end_index < start_index or end_index > len(text):
        return None
    segment = text[start_index:end_index]
    leading = len(segment) - len(segment.lstrip())
    trailing = len(segment.rstrip())
    trimmed_start = start_index + leading
    trimmed_end = start_index + trailing
    if trimmed_end <= trimmed_start:
        return None
    return SpanMapping(
        line_start=line_number_for_offset(text, trimmed_start),
        line_end=line_number_for_offset(text, trimmed_end - 1),
        text=text[trimmed_start:trimmed_end],
    )


def line_number_for_offset(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def heading_path_at_line(text: str, line_number: int) -> list[str]:
    headings: list[str] = []
    for current_line, line in enumerate(text.splitlines(), start=1):
        if current_line > line_number:
            break
        match = HEADING_RE.match(line)
        if match:
            level = len(match.group(1))
            headings = headings[: level - 1] + [match.group(2).strip()]
    return headings


def source_metadata(source: Source) -> dict[str, Any]:
    return {
        "id": source.id,
        "path": source.rel_path,
        "title": source.title,
        "authority": source.authority,
        "status": source.status,
        "role": source.role,
        "authority_rank": source.authority_rank,
        "authority_scope": source.authority_scope,
    }


def source_reference(source: Source, mapping: SpanMapping, heading_path: list[str]) -> dict[str, Any]:
    try:
        from semantica.provenance import SourceReference

        reference = SourceReference(
            document=source.rel_path,
            section=" > ".join(heading_path) if heading_path else None,
            line=mapping.line_start,
            confidence=1.0,
            metadata={
                "line_end": mapping.line_end,
                "source_id": source.id,
                "authority_rank": source.authority_rank,
                "authority_scope": source.authority_scope,
            },
        )
        return {
            "document": reference.document,
            "section": reference.section,
            "line": reference.line,
            "confidence": reference.confidence,
            "metadata": reference.metadata,
        }
    except Exception:
        return {
            "document": source.rel_path,
            "section": " > ".join(heading_path) if heading_path else None,
            "line": mapping.line_start,
            "confidence": 1.0,
            "metadata": {
                "line_end": mapping.line_end,
                "source_id": source.id,
                "authority_rank": source.authority_rank,
                "authority_scope": source.authority_scope,
            },
        }
