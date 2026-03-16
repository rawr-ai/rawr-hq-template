#!/usr/bin/env python3

from __future__ import annotations

import hashlib
import json
import math
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
WORK_DIR = ROOT / "work"
GENERATED_DIR = WORK_DIR / "generated"
CORPUS_DIR = GENERATED_DIR / "corpus"
REPORTS_DIR = GENERATED_DIR / "reports"
NORMALIZED_DIR = CORPUS_DIR / "normalized-threads"
RAW_JSON_DIR = ROOT / "source-material" / "conversations" / "raw-json"
SOURCE_DOCS_DIR = WORK_DIR / "docs" / "source"


FAMILY_SUMMARIES = {
    "encore-integration-with-rawr": (
        "Exploratory thread about whether Encore should sit beneath RAWR as an"
        " infrastructure substrate, with the conclusion that Railway + Nx is the"
        " more pragmatic near-term path while host contracts stay RAWR-owned."
    ),
    "inngest-plugin-api-strategy": (
        "Workflow architecture thread that settles on a reusable workflow shell:"
        " public oRPC/OpenAPI control surfaces on one side, Inngest durable"
        " execution on the other, with private service clients providing business"
        " capability inside workflow steps."
    ),
    "server-sidecar-process-model": (
        "Deep host/runtime model family covering the distinction between hosts,"
        " processes, services, sidecars, runtime roles, service-centric capability"
        " ownership, and the eventual minimal assembly-entrypoint shape."
    ),
    "telemetry-vs-logging-nx-rawr-evolution": (
        "Conversation family that starts with observability tooling distinctions,"
        " then pivots into a broader architecture and repo-evolution sequence for"
        " RAWR, including document creation and service-internal structure."
    ),
}


BRANCH_CURATION = {
    "encore-integration-with-rawr": {
        "Encore Integration with RAWR.json": {
            "semantic_name": "encore/infra-substrate-evaluation",
            "status": "active",
            "rationale": (
                "Standalone exploration; relevant as a substrate decision record,"
                " but not itself the canonical architecture snapshot."
            ),
        }
    },
    "inngest-plugin-api-strategy": {
        "Inngest Plugin API Strategy Branch 00.json": {
            "semantic_name": "inngest/workflow-shell-over-function-mirroring",
            "status": "active",
            "rationale": (
                "Defines the durable workflow shell stance: control-plane API"
                " surfaces outside, Inngest runtime inside."
            ),
        },
        "Inngest Plugin API Strategy Branch 01.json": {
            "semantic_name": "inngest/workflow-shell-over-function-mirroring/duplicate-export",
            "status": "duplicate",
            "rationale": "Exact duplicate export of Branch 00 with the same conversation link.",
        },
    },
    "server-sidecar-process-model": {
        "Server Sidecar Process Model Branch 00.json": {
            "semantic_name": "server-sidecar/runtime-layering-foundation",
            "status": "superseded",
            "rationale": (
                "Introduces the basic layering between machine, process, server,"
                " service, and sidecar, but later branches sharpen the ontology."
            ),
        },
        "Server Sidecar Process Model Branch 01.json": {
            "semantic_name": "server-sidecar/steward-agent-host-divergence",
            "status": "dead",
            "rationale": (
                "Branches into steward/NanoClaw agent-host modeling rather than"
                " continuing the server-sidecar host taxonomy."
            ),
        },
        "Server Sidecar Process Model Branch 02.json": {
            "semantic_name": "server-sidecar/async-host-taxonomy",
            "status": "superseded",
            "rationale": (
                "Sharpens async-host versus worker-host semantics, then gets"
                " refined by later service-centric and host-bundle branches."
            ),
        },
        "Server Sidecar Process Model Branch 03.json": {
            "semantic_name": "server-sidecar/service-centric-runtime-model",
            "status": "active",
            "rationale": (
                "Locks services as capability truth and plugins as runtime"
                " projections; this remains foundational to the later memo."
            ),
        },
        "Server Sidecar Process Model Branch 04.json": {
            "semantic_name": "server-sidecar/app-folder-topology-draft",
            "status": "incomplete",
            "rationale": (
                "Explores app/host-bundle folder topology but ends with blank"
                " responses and an unfinished doc-writing attempt."
            ),
        },
        "Server Sidecar Process Model Branch 05.json": {
            "semantic_name": "server-sidecar/assembly-entrypoint-minimalism",
            "status": "active",
            "rationale": (
                "Carries the folder-topology discussion forward into the minimal"
                " assembly-entrypoint rule and is part of the current canonical view."
            ),
        },
    },
    "telemetry-vs-logging-nx-rawr-evolution": {
        "Telemetry vs Logging.json": {
            "semantic_name": "telemetry-vs-logging/observability-stack-foundations",
            "status": "superseded",
            "rationale": (
                "Provides the shared trunk on observability and telemetry layers,"
                " then the longer branch absorbs and extends the conversation."
            ),
        },
        "RAWR NX Evolution Sequence.json": {
            "semantic_name": "telemetry-vs-logging/architecture-evolution-sequence",
            "status": "active",
            "rationale": (
                "Continues the shared observability trunk into the broader RAWR"
                " architecture sequence and document-authoring work."
            ),
        },
    },
}


SEMANTIC_EVENTS = {
    "inngest-plugin-api-strategy": [
        {
            "source_name": "Inngest Plugin API Strategy Branch 00.json",
            "source_message_index": 5,
            "type": "canonicalization",
            "summary": (
                "The thread locks the workflow-shell model: control-plane APIs"
                " should not mirror raw Inngest function graphs."
            ),
            "confidence": 0.96,
            "evidence": [
                "Concludes with a direct recommendation for a workflow descriptor + router generator.",
                "Rejects one-function-equals-one-procedure mirroring as the wrong abstraction.",
            ],
        }
    ],
    "server-sidecar-process-model": [
        {
            "source_name": "Server Sidecar Process Model Branch 01.json",
            "source_message_index": 26,
            "type": "divergence",
            "summary": (
                "The family temporarily diverges into steward and agent-host modeling"
                " instead of continuing the server/sidecar/runtime-role axis."
            ),
            "confidence": 0.9,
            "evidence": [
                "The prompt references NanoClaw, steward docs, and agent-host concerns.",
                "Later branches resume host/runtime ontology rather than this steward track.",
            ],
        },
        {
            "source_name": "Server Sidecar Process Model Branch 02.json",
            "source_message_index": 16,
            "type": "inflection",
            "summary": (
                "The discussion sharpens into async-host taxonomy and rejects"
                " splitting worker host from async host without operational need."
            ),
            "confidence": 0.93,
            "evidence": [
                "Explicit question about worker host versus general async host semantics.",
                "Response positions async host as the umbrella runtime role.",
            ],
        },
        {
            "source_name": "Server Sidecar Process Model Branch 03.json",
            "source_message_index": 52,
            "type": "inflection",
            "summary": (
                "The ontology shifts from runtime shape alone to a service-centric"
                " model where services own capability truth and plugins project it."
            ),
            "confidence": 0.95,
            "evidence": [
                "Prompt explicitly says services are where capability logic lives directly.",
                "Response locks services/plugins/host-bundles/roles into a new hierarchy.",
            ],
        },
        {
            "source_name": "Server Sidecar Process Model Branch 04.json",
            "source_message_index": 75,
            "type": "abandonment",
            "summary": (
                "The folder-topology/doc-writing branch stalls out with blank"
                " responses before the next export resumes the thread."
            ),
            "confidence": 0.97,
            "evidence": [
                "Final two assistant responses are blank.",
                "The next export continues the same line of inquiry and completes it.",
            ],
        },
        {
            "source_name": "Server Sidecar Process Model Branch 05.json",
            "source_message_index": 75,
            "type": "merge_contribution",
            "summary": (
                "The family converges on minimal assembly entrypoints, which later"
                " aligns with the host/runtime memo rather than conflicting with it."
            ),
            "confidence": 0.9,
            "evidence": [
                "The branch states that app role folders should stay boring and thin.",
                "This is consistent with the memo's host-bundle/runtime-role split.",
            ],
        },
    ],
    "telemetry-vs-logging-nx-rawr-evolution": [
        {
            "source_name": "RAWR NX Evolution Sequence.json",
            "source_message_index": 8,
            "type": "inflection",
            "summary": (
                "The conversation pivots from observability-tool distinctions into"
                " a broader architecture and autonomous buildout sequence."
            ),
            "confidence": 0.95,
            "evidence": [
                "The prompt changes from telemetry tooling to the architecture-buildout question.",
                "The title of the longer export reflects the later architecture framing.",
            ],
        },
        {
            "source_name": "RAWR NX Evolution Sequence.json",
            "source_message_index": 70,
            "type": "merge_contribution",
            "summary": (
                "The family materializes into the service-internal-structure"
                " document, turning conversation content into a durable artifact."
            ),
            "confidence": 0.99,
            "evidence": [
                "The assistant explicitly states that it created the second doc in canvas.",
                "A later failed edit contains the document text inline.",
            ],
        },
    ],
}


DOC_RELATIONS = [
    {
        "doc_name": "Inngest Plugin API Strategy.md",
        "target_family_id": "inngest-plugin-api-strategy",
        "type": "derived_from",
        "document_relation_type": "derived_from",
        "confidence": 0.98,
        "evidence": [
            "The document title matches the branch family title exactly.",
            "The document restates the workflow shell split between oRPC/OpenAPI, Inngest, and private service clients.",
        ],
        "notes": "Treat this Markdown file as the durable write-up of the Inngest strategy thread.",
    },
    {
        "doc_name": "Inngest Plugin API Strategy.md",
        "target_family_id": "inngest-plugin-api-strategy",
        "type": "canonicalizes",
        "document_relation_type": "canonicalizes",
        "confidence": 0.95,
        "evidence": [
            "The doc turns the thread's recommendation into a stable architectural shell.",
            "It defines the durable public contract and execution split more cleanly than the conversation export.",
        ],
        "notes": "Use the Markdown doc as the canonical reference for workflow-shell shape.",
    },
    {
        "doc_name": "RAWR HQ Internal Structure.md",
        "target_family_id": "telemetry-vs-logging-nx-rawr-evolution",
        "type": "derived_from",
        "document_relation_type": "derived_from",
        "confidence": 0.99,
        "evidence": [
            "The longer family explicitly says a second doc was created.",
            "A later failed edit includes the document body inline inside the conversation export.",
        ],
        "notes": "This document clearly emerged from the NX evolution family.",
    },
    {
        "doc_name": "RAWR HQ Internal Structure.md",
        "target_family_id": "telemetry-vs-logging-nx-rawr-evolution",
        "type": "embedded_in",
        "document_relation_type": "fully_embedded_in",
        "confidence": 0.99,
        "evidence": [
            "The export includes the heading 'Service internal structure and ownership'.",
            "The export contains a large inline copy of the document text.",
        ],
        "notes": "The conversation includes the document text substantially inline.",
    },
    {
        "doc_name": "RAWR HQ Model Architecture Memo.md",
        "target_family_id": "server-sidecar-process-model",
        "type": "canonicalizes",
        "document_relation_type": "canonicalizes",
        "confidence": 0.92,
        "evidence": [
            "The memo locks hosts, runtime roles, plugins, and host bundles into the same ontology explored in the family.",
            "The family's later branches converge on service-centric runtime projection and thin entrypoints, which the memo summarizes at higher level.",
        ],
        "notes": "This memo is the clearest canonical host/runtime snapshot for the server-sidecar family.",
    },
    {
        "doc_name": "RAWR HQ Model Architecture Memo.md",
        "target_family_id": "telemetry-vs-logging-nx-rawr-evolution",
        "type": "fills_gap_for",
        "document_relation_type": "fills_gap_for",
        "confidence": 0.79,
        "evidence": [
            "The NX evolution family creates the lower-level internal-structure doc but still needs a higher-level host/runtime snapshot.",
            "The memo provides that broader architecture layer without being directly embedded in the export.",
        ],
        "notes": "Link kept slightly lower confidence because the relationship is thematic rather than textually explicit.",
    },
]


FAMILY_CANONICALITY = {
    "encore-integration-with-rawr": {
        "status": "exploratory",
        "summary": (
            "Useful as a record of why Encore is not the immediate move, but not a"
            " canonical architecture spec."
        ),
        "canonical_sources": [],
        "secondary_sources": ["Encore Integration with RAWR.json"],
        "superseded_sources": [],
        "unresolved_conflicts": [
            "Whether a future cross-cloud substrate adapter should exist remains open.",
        ],
    },
    "inngest-plugin-api-strategy": {
        "status": "canonical",
        "summary": (
            "Canonical for workflow-shell design: control-plane APIs outside,"
            " Inngest execution inside, with service-owned business truth."
        ),
        "canonical_sources": [
            "Inngest Plugin API Strategy Branch 00.json",
            "Inngest Plugin API Strategy.md",
        ],
        "secondary_sources": [],
        "superseded_sources": [],
        "unresolved_conflicts": [
            "Exact generated router surface details remain an implementation question, not a resolved semantic conflict.",
        ],
    },
    "server-sidecar-process-model": {
        "status": "mixed",
        "summary": (
            "Canonical answer is composite: later branches plus the memo capture"
            " the current model, while early and divergent exports remain useful history."
        ),
        "canonical_sources": [
            "Server Sidecar Process Model Branch 03.json",
            "Server Sidecar Process Model Branch 05.json",
            "RAWR HQ Model Architecture Memo.md",
        ],
        "secondary_sources": [
            "Server Sidecar Process Model Branch 00.json",
            "Server Sidecar Process Model Branch 02.json",
        ],
        "superseded_sources": [
            "Server Sidecar Process Model Branch 01.json",
            "Server Sidecar Process Model Branch 04.json",
        ],
        "unresolved_conflicts": [
            "How much of the workflow trigger surface should stay inside workflow plugins versus a generic coordination layer still has some design-space ambiguity.",
        ],
    },
    "telemetry-vs-logging-nx-rawr-evolution": {
        "status": "mixed",
        "summary": (
            "The family is canonical for observability foundations and for the"
            " service-internal-structure document lineage, but the higher-level"
            " architecture snapshot lives partly outside the export in Markdown."
        ),
        "canonical_sources": [
            "RAWR NX Evolution Sequence.json",
            "RAWR HQ Internal Structure.md",
        ],
        "secondary_sources": [
            "Telemetry vs Logging.json",
            "RAWR HQ Model Architecture Memo.md",
        ],
        "superseded_sources": [],
        "unresolved_conflicts": [
            "No standalone canonical observability doc exists yet; observability guidance remains conversation-first.",
        ],
    },
}


CANONICALITY_MATRIX = [
    {
        "topic": "host_runtime_plugin_model",
        "status": "canonical",
        "canonical_items": [
            "RAWR HQ Model Architecture Memo.md",
            "Server Sidecar Process Model Branch 03.json",
            "Server Sidecar Process Model Branch 05.json",
        ],
        "secondary_items": [
            "Server Sidecar Process Model Branch 02.json",
            "Encore Integration with RAWR.json",
        ],
        "non_canonical_items": [
            "Server Sidecar Process Model Branch 01.json",
            "Server Sidecar Process Model Branch 04.json",
        ],
        "notes": (
            "Canonical stance: services own capability truth, plugins project to"
            " runtime roles, host bundles compose deployable assemblies, and app"
            " role folders stay thin."
        ),
    },
    {
        "topic": "service_internal_structure_and_db_ownership",
        "status": "canonical",
        "canonical_items": [
            "RAWR HQ Internal Structure.md",
            "RAWR NX Evolution Sequence.json",
        ],
        "secondary_items": [
            "RAWR HQ Model Architecture Memo.md",
        ],
        "non_canonical_items": [],
        "notes": (
            "Canonical stance: module-local first, service-shared second, package"
            " extraction last; shared DB infrastructure is acceptable, shared write"
            " authority is not the default."
        ),
    },
    {
        "topic": "workflow_plugin_shell",
        "status": "canonical",
        "canonical_items": [
            "Inngest Plugin API Strategy.md",
            "Inngest Plugin API Strategy Branch 00.json",
        ],
        "secondary_items": [
            "Server Sidecar Process Model Branch 02.json",
        ],
        "non_canonical_items": [
            "Inngest Plugin API Strategy Branch 01.json",
        ],
        "notes": (
            "Canonical stance: workflow plugins expose durable control surfaces"
            " rather than mirroring raw function trees."
        ),
    },
    {
        "topic": "observability_stack_framing",
        "status": "partially_canonical",
        "canonical_items": [
            "Telemetry vs Logging.json",
            "RAWR NX Evolution Sequence.json",
        ],
        "secondary_items": [],
        "non_canonical_items": [],
        "notes": (
            "The family is authoritative within this folder, but no dedicated"
            " Markdown doc has yet replaced the conversation as the canonical artifact."
        ),
    },
    {
        "topic": "encore_infrastructure_substrate",
        "status": "non_canonical",
        "canonical_items": [],
        "secondary_items": [
            "Encore Integration with RAWR.json",
        ],
        "non_canonical_items": [],
        "notes": (
            "Useful decision record: Encore is deferred in favor of Railway + Nx,"
            " but this is an exploratory substrate thread rather than a binding spec."
        ),
    },
]


README_TEXT = """# Active Workspace

This directory is the active working workspace derived from the raw source material in the sibling provenance tree.

Raw source material now lives in:

- `../source-material/conversations/raw-json/`

Active docs:
- `docs/source/*.md`
- `docs/canonical/*.md`

Generated corpus outputs:
- `generated/corpus/inventory.json`
- `generated/corpus/family-graphs.json`
- `generated/corpus/intermediate-graph.json`
- `generated/corpus/corpus-manifest.json`
- `generated/corpus/normalized-threads/*.json`

Generated reports:
- `generated/reports/anomalies.json`
- `generated/reports/ambiguity-flags.json`
- `generated/reports/canonicality-summary.md`
- `generated/reports/decision-log.md`
- `generated/reports/validation-report.json`

Supporting outputs:
- `retained-notes/*.md`

Working surfaces:

- `docs/` for active source-reading, current canon, and retained doc history
- `generated/` for corpus data and derived reports
- `retained-notes/` for the small number of still-useful working notes
- `scripts/` for workspace derivation tooling
"""


@dataclass
class SourceRecord:
    source_id: str
    path: Path
    type: str
    hash: str
    size_bytes: int
    title: str
    summary: str
    created: str | None = None
    updated: str | None = None
    exported: str | None = None
    link: str | None = None
    messages: list[dict[str, Any]] | None = None
    messages_hash: str | None = None
    normalized_title: str | None = None
    branch_depth: int = 0
    line_count: int | None = None
    headings: list[str] | None = None


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    return value or "item"


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def short_summary(text: str, limit: int = 180) -> str:
    collapsed = re.sub(r"\s+", " ", text).strip()
    if len(collapsed) <= limit:
        return collapsed
    return collapsed[: limit - 3] + "..."


def parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    for fmt in ("%m/%d/%Y %H:%M:%S", "%m/%d/%Y %H:%M", "%m/%d/%Y %I:%M:%S"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def branch_depth_from_title(title: str) -> int:
    return title.count("Branch ·")


def normalize_title(title: str) -> str:
    return re.sub(r"^(Branch ·\s*)+", "", title).strip()


def normalize_message_text(text: str) -> str:
    text = text or ""
    text = re.sub(r"Thought for \d+[smh](?: \d+[smh])?", " ", text)
    text = text.replace("Called tool", " ").replace("Received app response", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip().lower()


def shared_prefix(
    left: list[dict[str, Any]],
    right: list[dict[str, Any]],
    fuzzy: bool = False,
) -> int:
    count = 0
    for l_msg, r_msg in zip(left, right):
        if fuzzy:
            same = (
                l_msg.get("role") == r_msg.get("role")
                and normalize_message_text(l_msg.get("say", ""))
                == normalize_message_text(r_msg.get("say", ""))
            )
        else:
            same = l_msg == r_msg
        if not same:
            break
        count += 1
    return count


def ensure_dirs() -> None:
    WORK_DIR.mkdir(exist_ok=True)
    GENERATED_DIR.mkdir(exist_ok=True)
    CORPUS_DIR.mkdir(exist_ok=True)
    REPORTS_DIR.mkdir(exist_ok=True)
    NORMALIZED_DIR.mkdir(exist_ok=True)


def load_sources() -> list[SourceRecord]:
    records: list[SourceRecord] = []
    for path in sorted(RAW_JSON_DIR.glob("*.json")):
        data = json.loads(path.read_text())
        metadata = data["metadata"]
        title = metadata["title"]
        messages = data["messages"]
        source_id = f"src-json-{slugify(path.stem)}"
        first_prompt = next((m.get("say", "") for m in messages if m.get("role") == "Prompt"), "")
        last_response = ""
        for msg in reversed(messages):
            if msg.get("role") == "Response":
                last_response = msg.get("say", "")
                break
        summary = short_summary(first_prompt or last_response or title)
        records.append(
            SourceRecord(
                source_id=source_id,
                path=path,
                type="json_conversation",
                hash=file_sha256(path),
                size_bytes=path.stat().st_size,
                title=title,
                summary=summary,
                created=metadata.get("dates", {}).get("created"),
                updated=metadata.get("dates", {}).get("updated"),
                exported=metadata.get("dates", {}).get("exported"),
                link=metadata.get("link"),
                messages=messages,
                messages_hash=sha256_text(json.dumps(messages, sort_keys=True)),
                normalized_title=normalize_title(title),
                branch_depth=branch_depth_from_title(title),
            )
        )

    for path in sorted(SOURCE_DOCS_DIR.glob("*.md")):
        text = path.read_text()
        lines = text.splitlines()
        headings = [line.lstrip("# ").strip() for line in lines if line.startswith("#")]
        source_id = f"src-md-{slugify(path.stem)}"
        summary = short_summary(" ".join(line.strip() for line in lines[:10] if line.strip()) or path.stem)
        records.append(
            SourceRecord(
                source_id=source_id,
                path=path,
                type="markdown_document",
                hash=file_sha256(path),
                size_bytes=path.stat().st_size,
                title=path.stem,
                summary=summary,
                line_count=len(lines),
                headings=headings[:8],
            )
        )
    return records


def build_inventory(records: list[SourceRecord]) -> list[dict[str, Any]]:
    inventory = []
    for record in records:
        item = {
            "source_id": record.source_id,
            "type": record.type,
            "path": str(record.path.resolve()),
            "filename": record.path.name,
            "hash_sha256": record.hash,
            "size_bytes": record.size_bytes,
            "title": record.title,
            "summary": record.summary,
        }
        if record.type == "json_conversation":
            item.update(
                {
                    "normalized_title": record.normalized_title,
                    "branch_depth": record.branch_depth,
                    "message_count": len(record.messages or []),
                    "messages_hash": record.messages_hash,
                    "created": record.created,
                    "updated": record.updated,
                    "exported": record.exported,
                    "link": record.link,
                    "first_prompt": next(
                        (m.get("say", "") for m in record.messages or [] if m.get("role") == "Prompt"),
                        "",
                    ),
                    "last_response": next(
                        (
                            m.get("say", "")
                            for m in reversed(record.messages or [])
                            if m.get("role") == "Response"
                        ),
                        "",
                    ),
                }
            )
        else:
            item.update(
                {
                    "line_count": record.line_count,
                    "headings": record.headings or [],
                }
            )
        inventory.append(item)
    return inventory


def detect_anomalies(json_records: list[SourceRecord]) -> list[dict[str, Any]]:
    anomalies: list[dict[str, Any]] = []
    by_hash: dict[str, list[SourceRecord]] = defaultdict(list)
    by_messages_hash: dict[str, list[SourceRecord]] = defaultdict(list)
    by_link: dict[str, list[SourceRecord]] = defaultdict(list)

    for record in json_records:
        by_hash[record.hash].append(record)
        if record.messages_hash:
            by_messages_hash[record.messages_hash].append(record)
        if record.link:
            by_link[record.link].append(record)

        last_response = next(
            (m.get("say", "") for m in reversed(record.messages or []) if m.get("role") == "Response"),
            "",
        )
        if not (last_response or "").strip():
            anomalies.append(
                {
                    "anomaly_id": f"anomaly-{slugify(record.path.stem)}-blank-final-response",
                    "type": "blank_final_response",
                    "source_ids": [record.source_id],
                    "severity": "medium",
                    "notes": "Final assistant response is blank in this export.",
                }
            )

        if any("tokens truncated" in (m.get("say", "") or "").lower() for m in record.messages or []):
            anomalies.append(
                {
                    "anomaly_id": f"anomaly-{slugify(record.path.stem)}-truncated-message",
                    "type": "truncated_message",
                    "source_ids": [record.source_id],
                    "severity": "medium",
                    "notes": "At least one message contains exporter truncation text.",
                }
            )

    for hash_value, members in by_hash.items():
        if len(members) > 1:
            anomalies.append(
                {
                    "anomaly_id": f"anomaly-duplicate-hash-{hash_value[:12]}",
                    "type": "duplicate_hash",
                    "source_ids": [member.source_id for member in members],
                    "severity": "low",
                    "notes": "Files share the same content hash.",
                }
            )

    for hash_value, members in by_messages_hash.items():
        if len(members) > 1:
            anomalies.append(
                {
                    "anomaly_id": f"anomaly-duplicate-messages-{hash_value[:12]}",
                    "type": "duplicate_messages",
                    "source_ids": [member.source_id for member in members],
                    "severity": "low",
                    "notes": "Exports share identical message content even if exporter metadata differs.",
                }
            )

    for link, members in by_link.items():
        if len(members) > 1:
            anomalies.append(
                {
                    "anomaly_id": f"anomaly-same-link-{slugify(link.split('/c/')[-1])}",
                    "type": "same_conversation_link",
                    "source_ids": [member.source_id for member in members],
                    "severity": "low",
                    "notes": "Multiple exports share the same ChatGPT conversation link.",
                }
            )

    return anomalies


def curated_family_id_for_members(member_names: set[str]) -> str:
    if member_names == {"Encore Integration with RAWR.json"}:
        return "encore-integration-with-rawr"
    if member_names == {
        "Inngest Plugin API Strategy Branch 00.json",
        "Inngest Plugin API Strategy Branch 01.json",
    }:
        return "inngest-plugin-api-strategy"
    if member_names == {
        "Server Sidecar Process Model Branch 00.json",
        "Server Sidecar Process Model Branch 01.json",
        "Server Sidecar Process Model Branch 02.json",
        "Server Sidecar Process Model Branch 03.json",
        "Server Sidecar Process Model Branch 04.json",
        "Server Sidecar Process Model Branch 05.json",
    }:
        return "server-sidecar-process-model"
    if member_names == {
        "Telemetry vs Logging.json",
        "RAWR NX Evolution Sequence.json",
    }:
        return "telemetry-vs-logging-nx-rawr-evolution"
    return slugify(sorted(member_names)[0].replace(".json", ""))


def confidence_for_edge(
    exact_prefix_len: int,
    fuzzy_prefix_len: int,
    child_len: int,
    parent_len: int,
    same_title: bool,
    same_link: bool,
    same_first_prompt: bool,
    exact_duplicate: bool,
) -> float:
    if exact_duplicate:
        return 1.0
    ratio = exact_prefix_len / max(1, min(child_len, parent_len))
    confidence = 0.4 + ratio * 0.35
    if fuzzy_prefix_len >= exact_prefix_len:
        confidence += 0.08
    if same_title:
        confidence += 0.1
    if same_link:
        confidence += 0.1
    if same_first_prompt:
        confidence += 0.22
    return round(min(0.99, confidence), 2)


def build_family_graphs(json_records: list[SourceRecord]) -> list[dict[str, Any]]:
    pair_metrics: dict[tuple[str, str], dict[str, Any]] = {}
    names_to_record = {record.path.name: record for record in json_records}

    for left in json_records:
        for right in json_records:
            if left.path.name >= right.path.name:
                continue
            left_messages = left.messages or []
            right_messages = right.messages or []
            left_first_prompt = next(
                (m.get("say", "") for m in left_messages if m.get("role") == "Prompt"),
                "",
            )
            right_first_prompt = next(
                (m.get("say", "") for m in right_messages if m.get("role") == "Prompt"),
                "",
            )
            exact_prefix_len = shared_prefix(left_messages, right_messages)
            fuzzy_prefix_len = shared_prefix(left_messages, right_messages, fuzzy=True)
            pair_metrics[(left.path.name, right.path.name)] = {
                "exact_prefix_len": exact_prefix_len,
                "fuzzy_prefix_len": fuzzy_prefix_len,
                "same_link": left.link and left.link == right.link,
                "same_normalized_title": left.normalized_title == right.normalized_title,
                "same_first_prompt": left_first_prompt == right_first_prompt,
                "exact_duplicate": left.messages_hash == right.messages_hash,
            }

    parent = {record.path.name: record.path.name for record in json_records}

    def find(name: str) -> str:
        while parent[name] != name:
            parent[name] = parent[parent[name]]
            name = parent[name]
        return name

    def union(left: str, right: str) -> None:
        left_root = find(left)
        right_root = find(right)
        if left_root != right_root:
            parent[right_root] = left_root

    for (left_name, right_name), metrics in pair_metrics.items():
        if metrics["same_normalized_title"]:
            union(left_name, right_name)
        elif metrics["same_first_prompt"] and metrics["exact_prefix_len"] >= 4:
            union(left_name, right_name)

    groups: dict[str, list[str]] = defaultdict(list)
    for name in parent:
        groups[find(name)].append(name)

    family_graphs: list[dict[str, Any]] = []
    for member_names in sorted(groups.values(), key=lambda items: sorted(items)[0]):
        members = sorted(member_names)
        family_id = curated_family_id_for_members(set(members))
        member_records = [names_to_record[name] for name in members]
        non_duplicates = []
        duplicates: dict[str, str] = {}

        root_record = min(
            member_records,
            key=lambda item: (
                item.branch_depth,
                parse_date(item.created) or datetime.max,
                len(item.messages or []),
                item.path.name,
            ),
        )

        for record in sorted(
            member_records,
            key=lambda item: (
                item.branch_depth,
                parse_date(item.created) or datetime.max,
                len(item.messages or []),
                item.path.name,
            ),
        ):
            dup_target = None
            for existing in non_duplicates:
                names = tuple(sorted((record.path.name, existing.path.name)))
                metrics = pair_metrics.get(names)
                if metrics and metrics["exact_duplicate"]:
                    dup_target = existing
                    break
            if dup_target is None:
                non_duplicates.append(record)
            else:
                duplicates[record.path.name] = dup_target.path.name

        edges = []
        classification = {}
        if len(non_duplicates) == 1 and not duplicates:
            classification[non_duplicates[0].path.name] = "standalone"
        else:
            classification[root_record.path.name] = "root"

        placed = [root_record]
        for record in non_duplicates:
            if record.path.name == root_record.path.name:
                continue
            best_parent = None
            best_metrics = None
            best_score = -1
            for candidate in placed:
                metrics = pair_metrics.get(tuple(sorted((record.path.name, candidate.path.name))))
                if not metrics:
                    continue
                score = (
                    metrics["exact_prefix_len"] * 100
                    + metrics["fuzzy_prefix_len"] * 10
                    + int(bool(metrics["same_link"])) * 5
                    + int(bool(metrics["same_normalized_title"])) * 3
                )
                if score > best_score:
                    best_score = score
                    best_parent = candidate
                    best_metrics = metrics
            placed.append(record)
            classification[record.path.name] = "branch"
            confidence = confidence_for_edge(
                exact_prefix_len=best_metrics["exact_prefix_len"],
                fuzzy_prefix_len=best_metrics["fuzzy_prefix_len"],
                child_len=len(record.messages or []),
                parent_len=len(best_parent.messages or []),
                same_title=best_metrics["same_normalized_title"],
                same_link=bool(best_metrics["same_link"]),
                same_first_prompt=best_metrics["same_first_prompt"],
                exact_duplicate=best_metrics["exact_duplicate"],
            )
            evidence = [
                f"exact_shared_prefix_messages={best_metrics['exact_prefix_len']}",
                f"fuzzy_shared_prefix_messages={best_metrics['fuzzy_prefix_len']}",
            ]
            if best_metrics["same_normalized_title"]:
                evidence.append(f"normalized_title_match={record.normalized_title}")
            if best_metrics["same_first_prompt"]:
                evidence.append("same_first_prompt=true")
            if best_metrics["same_link"]:
                evidence.append("same_export_link=true")
            relation_type = "branches_from"
            if (
                record.normalized_title != best_parent.normalized_title
                and best_metrics["same_first_prompt"]
                and best_metrics["exact_prefix_len"] >= 4
            ):
                relation_type = "same_root_as"
            edges.append(
                {
                    "from_source_id": next(item.source_id for item in member_records if item.path.name == record.path.name),
                    "to_source_id": next(item.source_id for item in member_records if item.path.name == best_parent.path.name),
                    "type": relation_type,
                    "confidence": confidence,
                    "shared_prefix_len": best_metrics["exact_prefix_len"],
                    "evidence": evidence,
                }
            )

        for dup_name, canonical_name in duplicates.items():
            classification[dup_name] = "duplicate"
            metrics = pair_metrics[tuple(sorted((dup_name, canonical_name)))]
            edges.append(
                {
                    "from_source_id": names_to_record[dup_name].source_id,
                    "to_source_id": names_to_record[canonical_name].source_id,
                    "type": "duplicate_of",
                    "confidence": 1.0,
                    "shared_prefix_len": metrics["exact_prefix_len"],
                    "evidence": [
                        "exact_duplicate_hash=true",
                        f"same_export_link={bool(metrics['same_link'])}",
                    ],
                }
            )

        family_graphs.append(
            {
                "family_id": family_id,
                "canonical_title": {
                    "encore-integration-with-rawr": "Encore Integration with RAWR",
                    "inngest-plugin-api-strategy": "Inngest Plugin API Strategy",
                    "server-sidecar-process-model": "Server Sidecar Process Model",
                    "telemetry-vs-logging-nx-rawr-evolution": (
                        "Telemetry vs Logging -> NX + RAWR Evolution Sequence"
                    ),
                }.get(family_id, root_record.normalized_title),
                "summary": FAMILY_SUMMARIES.get(family_id, root_record.summary),
                "member_source_ids": [record.source_id for record in member_records],
                "member_filenames": members,
                "root_source_id": root_record.source_id,
                "classification": {
                    names_to_record[name].source_id: classification[name]
                    for name in members
                },
                "edges": edges,
            }
        )
    return family_graphs


def build_unified_thread(
    family: dict[str, Any],
    json_records_by_id: dict[str, SourceRecord],
    anomalies: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
) -> dict[str, Any]:
    family_id = family["family_id"]
    source_ids = family["member_source_ids"]
    family_records = [json_records_by_id[source_id] for source_id in source_ids]
    classification_by_source_id = family["classification"]
    edges_by_source_id = {
        edge["from_source_id"]: edge for edge in family["edges"] if edge["type"] != "duplicate_of"
    }
    duplicate_edges_by_source_id = {
        edge["from_source_id"]: edge for edge in family["edges"] if edge["type"] == "duplicate_of"
    }

    source_lookup = {record.source_id: record for record in family_records}
    source_by_name = {record.path.name: record for record in family_records}

    root_source_id = family["root_source_id"]
    root_record = source_lookup[root_source_id]

    order = []
    visited = set()

    def visit(source_id: str) -> None:
        if source_id in visited:
            return
        edge = edges_by_source_id.get(source_id)
        if edge:
            visit(edge["to_source_id"])
        visited.add(source_id)
        order.append(source_id)

    for source_id in source_ids:
        if source_id not in duplicate_edges_by_source_id:
            visit(source_id)

    representative_node_id: dict[tuple[str, int], str] = {}
    source_path_nodes: dict[str, list[str]] = {}
    nodes: list[dict[str, Any]] = []
    graph_edges: list[dict[str, Any]] = []
    branch_points: list[dict[str, Any]] = []
    branches: list[dict[str, Any]] = []
    semantic_events: list[dict[str, Any]] = []

    def add_message_nodes(
        record: SourceRecord,
        divergence_index: int,
        parent_source_id: str | None,
        branch_point_id: str | None,
    ) -> tuple[str | None, str | None]:
        branch_nodes: list[str] = []
        for index, message in enumerate(record.messages or []):
            if parent_source_id and index < divergence_index:
                representative_node_id[(record.source_id, index)] = representative_node_id[(parent_source_id, index)]
                branch_nodes.append(representative_node_id[(parent_source_id, index)])
                continue

            node_id = f"{family_id}__msg__{slugify(record.path.stem)}__{index:03d}"
            representative_node_id[(record.source_id, index)] = node_id
            branch_nodes.append(node_id)
            nodes.append(
                {
                    "node_id": node_id,
                    "type": "message",
                    "role": message.get("role"),
                    "say": message.get("say", ""),
                    "source_file_id": record.source_id,
                    "source_message_index": index,
                    "source_title": record.title,
                    "source_link": record.link,
                }
            )
            if parent_source_id and index == divergence_index and branch_point_id:
                graph_edges.append(
                    {
                        "from_node_id": branch_point_id,
                        "to_node_id": node_id,
                        "type": "starts_branch_path",
                    }
                )
            elif index > 0:
                previous_node_id = representative_node_id[(record.source_id, index - 1)]
                if previous_node_id != node_id:
                    graph_edges.append(
                        {
                            "from_node_id": previous_node_id,
                            "to_node_id": node_id,
                            "type": "next_message",
                        }
                    )
        source_path_nodes[record.source_id] = branch_nodes
        unique_nodes = [node for i, node in enumerate(branch_nodes) if i == 0 or node != branch_nodes[i - 1]]
        return (
            unique_nodes[0] if unique_nodes else None,
            unique_nodes[-1] if unique_nodes else None,
        )

    root_start, root_end = add_message_nodes(root_record, divergence_index=0, parent_source_id=None, branch_point_id=None)
    branches.append(
        {
            "branch_id": f"{family_id}__branch__{slugify(root_record.path.stem)}",
            "parent_branch_point_id": None,
            "semantic_name": BRANCH_CURATION[family_id][root_record.path.name]["semantic_name"],
            "status": BRANCH_CURATION[family_id][root_record.path.name]["status"],
            "source_file_ids": [root_record.source_id],
            "start_node_id": root_start,
            "end_node_id": root_end,
            "confidence": 1.0,
            "rationale": BRANCH_CURATION[family_id][root_record.path.name]["rationale"],
        }
    )

    for source_id in order:
        if source_id == root_source_id:
            continue
        record = source_lookup[source_id]
        edge = edges_by_source_id[source_id]
        parent_source_id = edge["to_source_id"]
        parent_record = source_lookup[parent_source_id]
        divergence_index = edge["shared_prefix_len"]
        anchor_node_id = (
            representative_node_id[(parent_source_id, divergence_index - 1)]
            if divergence_index > 0
            else None
        )
        branch_point_id = f"{family_id}__branch-point__{slugify(record.path.stem)}"
        branch_point = {
            "branch_point_id": branch_point_id,
            "type": "branch_point",
            "parent_source_id": parent_source_id,
            "child_source_id": source_id,
            "shared_prefix_len": divergence_index,
            "anchor_node_id": anchor_node_id,
            "evidence": edge["evidence"],
            "confidence": edge["confidence"],
        }
        branch_points.append(branch_point)
        nodes.append(
            {
                "node_id": branch_point_id,
                "type": "branch_point",
                "parent_source_id": parent_source_id,
                "child_source_id": source_id,
                "shared_prefix_len": divergence_index,
                "anchor_node_id": anchor_node_id,
                "evidence": edge["evidence"],
                "confidence": edge["confidence"],
            }
        )
        if anchor_node_id:
            graph_edges.append(
                {
                    "from_node_id": anchor_node_id,
                    "to_node_id": branch_point_id,
                    "type": "branches_at",
                }
            )
        start_node_id, end_node_id = add_message_nodes(
            record,
            divergence_index=divergence_index,
            parent_source_id=parent_source_id,
            branch_point_id=branch_point_id,
        )
        curation = BRANCH_CURATION[family_id][record.path.name]
        branches.append(
            {
                "branch_id": f"{family_id}__branch__{slugify(record.path.stem)}",
                "parent_branch_point_id": branch_point_id,
                "semantic_name": curation["semantic_name"],
                "status": curation["status"],
                "source_file_ids": [source_id],
                "start_node_id": start_node_id,
                "end_node_id": end_node_id,
                "confidence": edge["confidence"],
                "rationale": curation["rationale"],
            }
        )

    for source_id, edge in duplicate_edges_by_source_id.items():
        record = source_lookup[source_id]
        canonical_source_id = edge["to_source_id"]
        canonical_path_nodes = source_path_nodes.get(canonical_source_id, [])
        source_path_nodes[source_id] = list(canonical_path_nodes)
        curation = BRANCH_CURATION[family_id][record.path.name]
        branches.append(
            {
                "branch_id": f"{family_id}__branch__{slugify(record.path.stem)}",
                "parent_branch_point_id": None,
                "semantic_name": curation["semantic_name"],
                "status": curation["status"],
                "source_file_ids": [source_id],
                "start_node_id": canonical_path_nodes[0] if canonical_path_nodes else None,
                "end_node_id": canonical_path_nodes[-1] if canonical_path_nodes else None,
                "confidence": 1.0,
                "rationale": curation["rationale"],
            }
        )

    for event_spec in SEMANTIC_EVENTS.get(family_id, []):
        record = source_by_name[event_spec["source_name"]]
        anchor_node_id = representative_node_id[(record.source_id, event_spec["source_message_index"])]
        branch_id = f"{family_id}__branch__{slugify(record.path.stem)}"
        event_id = f"{family_id}__semantic-event__{slugify(record.path.stem)}__{event_spec['source_message_index']:03d}__{event_spec['type']}"
        semantic_event = {
            "event_id": event_id,
            "type": event_spec["type"],
            "anchor_node_id": anchor_node_id,
            "branch_id": branch_id,
            "summary": event_spec["summary"],
            "evidence": event_spec["evidence"],
            "confidence": event_spec["confidence"],
        }
        semantic_events.append(semantic_event)
        nodes.append(
            {
                "node_id": event_id,
                "type": "semantic_event",
                **semantic_event,
            }
        )
        graph_edges.append(
            {
                "from_node_id": anchor_node_id,
                "to_node_id": event_id,
                "type": "annotates",
            }
        )

    document_relations = [relation for relation in relationships if relation["to_id"] == family_id]
    documents = []
    for relation in document_relations:
        doc_record = next(
            record
            for record in load_sources()
            if record.source_id == relation["from_id"]
        )
        node_id = f"{family_id}__document-link__{slugify(doc_record.path.stem)}__{relation['type']}"
        documents.append(
            {
                "document_id": doc_record.source_id,
                "title": doc_record.title,
                "path": str(doc_record.path.resolve()),
                "relation_type": relation["document_relation_type"],
                "manifest_relationship_type": relation["type"],
                "confidence": relation["confidence"],
                "evidence": relation["evidence"],
                "notes": relation["notes"],
            }
        )
        nodes.append(
            {
                "node_id": node_id,
                "type": "document_link",
                "document_id": doc_record.source_id,
                "relation_type": relation["document_relation_type"],
                "target_family_id": family_id,
                "confidence": relation["confidence"],
                "evidence": relation["evidence"],
            }
        )

    family_anomalies = [
        anomaly
        for anomaly in anomalies
        if any(source_id in family["member_source_ids"] for source_id in anomaly["source_ids"])
    ]

    root_path_order = source_path_nodes[root_source_id]
    branch_orders = {
        branch["branch_id"]: source_path_nodes.get(branch["source_file_ids"][0], [])
        for branch in branches
        if branch["source_file_ids"]
    }
    default_reading_order = []
    seen = set()
    for source_id in order:
        for node_id in source_path_nodes.get(source_id, []):
            if node_id not in seen:
                default_reading_order.append(node_id)
                seen.add(node_id)

    human_outline = [
        {
            "branch_id": branch["branch_id"],
            "semantic_name": branch["semantic_name"],
            "status": branch["status"],
            "source_file_ids": branch["source_file_ids"],
        }
        for branch in branches
    ]

    canonicality = FAMILY_CANONICALITY[family_id]

    return {
        "schema_version": "rawr.conversation-thread.v1",
        "thread_id": family_id,
        "canonical_title": family["canonical_title"],
        "root_source_ids": [root_source_id],
        "source_files": [
            {
                "source_id": record.source_id,
                "filename": record.path.name,
                "path": str(record.path.resolve()),
                "title": record.title,
                "classification": classification_by_source_id[record.source_id],
                "link": record.link,
                "message_count": len(record.messages or []),
            }
            for record in family_records
        ],
        "source_links": sorted({record.link for record in family_records if record.link}),
        "summary": family["summary"],
        "nodes": nodes,
        "edges": graph_edges,
        "branch_points": branch_points,
        "branches": branches,
        "semantic_events": semantic_events,
        "documents": documents,
        "canonicality": canonicality,
        "views": {
            "default_reading_order": default_reading_order,
            "root_path_order": root_path_order,
            "branch_orders": branch_orders,
            "human_outline": human_outline,
        },
        "anomalies": family_anomalies,
    }


def build_relationships(records: list[SourceRecord], family_graphs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    filename_to_source_id = {record.path.name: record.source_id for record in records}
    relationships = []

    for family in family_graphs:
        for edge in family["edges"]:
            relationships.append(
                {
                    "from_id": edge["from_source_id"],
                    "to_id": edge["to_source_id"],
                    "type": edge["type"],
                    "confidence": edge["confidence"],
                    "evidence": edge["evidence"],
                    "notes": f"Shared prefix length: {edge['shared_prefix_len']}",
                }
            )

    for relation in DOC_RELATIONS:
        source_id = filename_to_source_id[relation["doc_name"]]
        relationships.append(
            {
                "from_id": source_id,
                "to_id": relation["target_family_id"],
                "type": relation["type"],
                "document_relation_type": relation["document_relation_type"],
                "confidence": relation["confidence"],
                "evidence": relation["evidence"],
                "notes": relation["notes"],
            }
        )
    return relationships


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=False) + "\n")


def write_markdown(path: Path, text: str) -> None:
    path.write_text(text.rstrip() + "\n")


def build_intermediate_graph(normalized_threads: list[dict[str, Any]], relationships: list[dict[str, Any]]) -> dict[str, Any]:
    nodes = []
    edges = []
    for thread in normalized_threads:
        nodes.extend(
            [
                {
                    "thread_id": thread["thread_id"],
                    **node,
                }
                for node in thread["nodes"]
            ]
        )
        edges.extend(
            [
                {
                    "thread_id": thread["thread_id"],
                    **edge,
                }
                for edge in thread["edges"]
            ]
        )
    return {
        "schema_version": "rawr.conversation-intermediate-graph.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "nodes": nodes,
        "edges": edges,
        "relationships": relationships,
    }


def build_manifest(
    inventory: list[dict[str, Any]],
    family_graphs: list[dict[str, Any]],
    normalized_threads: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
    anomalies: list[dict[str, Any]],
) -> dict[str, Any]:
    documents = [
        {
            "source_id": item["source_id"],
            "title": item["title"],
            "path": item["path"],
            "summary": item["summary"],
            "relations": [
                relation
                for relation in relationships
                if relation["from_id"] == item["source_id"]
            ],
        }
        for item in inventory
        if item["type"] == "markdown_document"
    ]

    open_questions = []
    for family_id, canonicality in FAMILY_CANONICALITY.items():
        for question in canonicality["unresolved_conflicts"]:
            open_questions.append(
                {
                    "family_id": family_id,
                    "question": question,
                }
            )

    return {
        "manifest_version": "rawr.conversation-corpus.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "corpus_summary": {
            "source_count": len(inventory),
            "json_conversation_count": sum(1 for item in inventory if item["type"] == "json_conversation"),
            "markdown_document_count": sum(1 for item in inventory if item["type"] == "markdown_document"),
            "family_count": len(family_graphs),
            "normalized_thread_count": len(normalized_threads),
            "anomaly_count": len(anomalies),
        },
        "source_items": inventory,
        "thread_families": family_graphs,
        "normalized_threads": [
            {
                "thread_id": thread["thread_id"],
                "canonical_title": thread["canonical_title"],
                "path": str((NORMALIZED_DIR / f"{thread['thread_id']}.json").resolve()),
                "branch_count": len(thread["branches"]),
                "document_count": len(thread["documents"]),
                "canonicality_status": thread["canonicality"]["status"],
            }
            for thread in normalized_threads
        ],
        "documents": documents,
        "relationships": relationships,
        "anomalies": anomalies,
        "canonicality_matrix": CANONICALITY_MATRIX,
        "open_questions": open_questions,
    }


def build_canonicality_summary() -> str:
    return """# Canonicality Summary

## Canonical now

- **Host/runtime/plugin model**: [RAWR HQ Model Architecture Memo.md](../../docs/source/RAWR%20HQ%20Model%20Architecture%20Memo.md) plus the later `Server Sidecar Process Model` branches (`03` and `05`) are the best current statement of the runtime ontology.
- **Service internal structure and DB ownership**: [RAWR HQ Internal Structure.md](../../docs/source/RAWR%20HQ%20Internal%20Structure.md) is the durable artifact, with `RAWR NX Evolution Sequence.json` as the originating conversation family.
- **Workflow plugin shell**: [Inngest Plugin API Strategy.md](../../docs/source/Inngest%20Plugin%20API%20Strategy.md) is canonical, backed by `Inngest Plugin API Strategy Branch 00.json`.

## Still relevant but secondary

- `Server Sidecar Process Model Branch 00.json` and `Branch 02.json` remain useful precursor reasoning, but they have been refined by later branches and the memo.
- `Telemetry vs Logging.json` remains relevant as the observability trunk even though the larger architecture sequence overtook the export title.
- `Encore Integration with RAWR.json` is a valid decision record for deferring Encore, but it is not the canonical architecture snapshot.

## Not canonical / superseded / dead

- `Inngest Plugin API Strategy Branch 01.json` is a duplicate export.
- `Server Sidecar Process Model Branch 01.json` is a semantic dead branch into steward/agent-host modeling.
- `Server Sidecar Process Model Branch 04.json` is incomplete and was resumed by `Branch 05`.

## Remaining gaps

- Observability/logging guidance is still conversation-first; there is no dedicated canonical Markdown document for it in this folder.
- The exact implementation shape of generated workflow control surfaces remains open even though the semantic direction is settled.
- Future substrate questions beyond Railway + Nx are still exploratory rather than canonically resolved.
"""


def build_decision_log() -> str:
    return """# Decision Log

## Confirmed decisions

- Raw source exports remain untouched; all derived outputs live under `work/`.
- The corpus has four unique thread families and therefore four canonical normalized thread JSONs.
- `Inngest Plugin API Strategy Branch 01.json` is treated as a duplicate export based on identical message content and identical conversation link.
- `Telemetry vs Logging.json` and `RAWR NX Evolution Sequence.json` are treated as one family because they share the same opening trunk and first prompt, after which the longer export continues the conversation.
- `RAWR HQ Internal Structure.md` is treated as both derived from and fully embedded in the NX evolution family because the conversation explicitly references creating the doc and later includes its text inline.
- `RAWR HQ Model Architecture Memo.md` is treated as the canonical high-level host/runtime snapshot and linked most strongly to the server-sidecar family.

## Explicit defaults

- When relationship confidence is lower because evidence is thematic rather than textual, the link is retained but flagged instead of being silently strengthened.
- Branch status is assigned per export artifact, not only per abstract idea, so duplicates and incomplete exports remain visible in the normalized corpus.
- Canonicality may be composite across a Markdown artifact and one or more conversation branches when no single item fully captures the settled view.
"""


def build_ambiguity_flags(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    flags = []
    for relation in manifest["relationships"]:
        if relation["confidence"] < 0.85:
            flags.append(
                {
                    "kind": "low_confidence_relationship",
                    "from_id": relation["from_id"],
                    "to_id": relation["to_id"],
                    "type": relation["type"],
                    "confidence": relation["confidence"],
                    "notes": relation["notes"],
                }
            )
    for item in manifest["open_questions"]:
        flags.append(
            {
                "kind": "open_question",
                "family_id": item["family_id"],
                "question": item["question"],
            }
        )
    return flags


def build_mental_map(family_graphs: list[dict[str, Any]]) -> str:
    lines = ["# Mental Map", "", "## Families", ""]
    for family in family_graphs:
        lines.append(f"- `{family['family_id']}`: {family['summary']}")
    lines.extend(
        [
            "",
            "## Confirmed",
            "",
            "- `server-sidecar-process-model`: explicit deep branch chain with later canonical branches `03` and `05`.",
            "- `inngest-plugin-api-strategy`: one canonical export plus one exact duplicate.",
            "- `telemetry-vs-logging-nx-rawr-evolution`: hidden-root family confirmed by shared opening messages and first prompt.",
            "- `RAWR HQ Internal Structure.md`: directly derived from and substantially embedded in the NX evolution family.",
            "",
            "## Ambiguities",
            "",
            "- `RAWR HQ Model Architecture Memo.md` clearly aligns with the server-sidecar family and fills a higher-level gap for the NX family, but it is not textually embedded in the exports.",
            "- Observability guidance is canonical only at conversation level; no dedicated Markdown artifact exists yet.",
        ]
    )
    return "\n".join(lines)


def validate_outputs(
    inventory: list[dict[str, Any]],
    family_graphs: list[dict[str, Any]],
    normalized_threads: list[dict[str, Any]],
    manifest: dict[str, Any],
) -> dict[str, Any]:
    validation = {
        "source_inventory_complete": len(inventory) == len(list(RAW_JSON_DIR.glob("*.json"))) + len(list(SOURCE_DOCS_DIR.glob("*.md"))),
        "every_json_in_one_family": all(
            item["source_id"] in {
                source_id
                for family in family_graphs
                for source_id in family["member_source_ids"]
            }
            for item in inventory
            if item["type"] == "json_conversation"
        ),
        "one_normalized_thread_per_family": len(normalized_threads) == len(family_graphs),
        "branch_points_have_evidence": all(
            all(point["evidence"] and point["confidence"] for point in thread["branch_points"])
            for thread in normalized_threads
        ),
        "markdown_relations_are_typed": all(
            relation["type"] and relation.get("document_relation_type")
            for relation in manifest["relationships"]
            if relation["from_id"].startswith("src-md-")
        ),
        "canonicality_claims_reference_support": all(
            item["canonical_items"] or item["secondary_items"]
            for item in manifest["canonicality_matrix"]
        ),
        "open_questions_are_explicit": len(manifest["open_questions"]) >= 1,
    }
    validation["all_passed"] = all(validation.values())
    return validation


def main() -> None:
    ensure_dirs()
    records = load_sources()
    json_records = [record for record in records if record.type == "json_conversation"]
    json_records_by_id = {record.source_id: record for record in json_records}

    inventory = build_inventory(records)
    anomalies = detect_anomalies(json_records)
    family_graphs = build_family_graphs(json_records)
    relationships = build_relationships(records, family_graphs)

    normalized_threads = []
    for family in family_graphs:
        unified_thread = build_unified_thread(
            family=family,
            json_records_by_id=json_records_by_id,
            anomalies=anomalies,
            relationships=relationships,
        )
        normalized_threads.append(unified_thread)
        write_json(NORMALIZED_DIR / f"{family['family_id']}.json", unified_thread)

    intermediate_graph = build_intermediate_graph(normalized_threads, relationships)
    manifest = build_manifest(inventory, family_graphs, normalized_threads, relationships, anomalies)
    ambiguity_flags = build_ambiguity_flags(manifest)
    validation = validate_outputs(inventory, family_graphs, normalized_threads, manifest)

    write_json(CORPUS_DIR / "inventory.json", inventory)
    write_json(REPORTS_DIR / "anomalies.json", anomalies)
    write_json(REPORTS_DIR / "ambiguity-flags.json", ambiguity_flags)
    write_json(CORPUS_DIR / "family-graphs.json", family_graphs)
    write_json(CORPUS_DIR / "intermediate-graph.json", intermediate_graph)
    write_json(CORPUS_DIR / "corpus-manifest.json", manifest)
    write_json(REPORTS_DIR / "validation-report.json", validation)
    write_markdown(REPORTS_DIR / "canonicality-summary.md", build_canonicality_summary())
    write_markdown(REPORTS_DIR / "decision-log.md", build_decision_log())
    write_markdown(WORK_DIR / "README.md", README_TEXT)

    if not validation["all_passed"]:
        raise SystemExit("Validation failed; see generated/reports/validation-report.json")


if __name__ == "__main__":
    main()
