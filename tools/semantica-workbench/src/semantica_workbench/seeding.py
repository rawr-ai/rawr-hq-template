from __future__ import annotations

import re
from typing import Any

from .extraction import stable_id
from .manifest import Manifest, Source

CODE_RE = re.compile(r"`([^`\n]+)`")
PATH_RE = re.compile(r"\b(?:packages|resources|services|plugins|apps)/[A-Za-z0-9_./*-]+")

LIFECYCLE = [
    "definition",
    "selection",
    "derivation",
    "compilation",
    "provisioning",
    "mounting",
    "observation",
]

OWNERSHIP_LAWS = [
    ("Services", "truth"),
    ("Plugins", "runtime projection"),
    ("Apps", "selection"),
    ("Resources", "capability contracts"),
    ("Providers", "capability implementation"),
    ("SDK", "runtime plans"),
    ("Runtime", "realization"),
    ("Harnesses", "native mounting"),
    ("Diagnostics", "observation"),
]

KNOWN_TYPES = {
    "@rawr/sdk": "PackageSurface",
    "startApp(...)": "Operation",
    "defineApp(...)": "Operation",
    "RuntimeAccess": "RuntimeArtifact",
    "ProcessRuntimeAccess": "RuntimeArtifact",
    "RoleRuntimeAccess": "RuntimeArtifact",
    "RuntimeCatalog": "Diagnostic",
    "AppDefinition": "RuntimeArtifact",
    "RuntimeProfile": "RuntimeArtifact",
    "RuntimeResource": "ResourceCapability",
    "RuntimeProvider": "Provider",
    "ProviderSelection": "Provider",
    "RuntimeSchema": "SchemaContract",
    "WorkflowDispatcher": "RuntimeArtifact",
    "FunctionBundle": "RuntimeArtifact",
    "Bootgraph": "RuntimeArtifact",
    "ProcessRuntime": "RuntimeArtifact",
}

FORBIDDEN_TYPE_HINTS = (
    "packages/runtime",
    "packages/hq-sdk",
    "@rawr/hq-sdk",
    "@rawr/runtime",
    "startAppRole",
    "startAppRoles",
    "RuntimeView",
    "ProcessView",
    "RoleView",
    "Shutdown",
)


def build_seed_graph(manifest: Manifest) -> dict[str, Any]:
    seeds: dict[str, dict[str, Any]] = {}
    relations: dict[str, dict[str, Any]] = {}

    for source in manifest.sources:
        document_id = seed_entity(
            seeds,
            source,
            source.title,
            "Document",
            source.status,
            "source-document",
            1,
            1,
            aliases=[source.id],
            summary=f"Manifest source {source.title}",
        )
        authority_id = seed_entity(
            seeds,
            source,
            source.authority,
            "AuthoritySource",
            source.status,
            "authority-source",
            1,
            1,
            aliases=[source.role],
            summary=f"Authority source for {source.title}",
        )
        seed_relation(
            relations,
            authority_id,
            "is_authority_for",
            document_id,
            source,
            None,
            1,
            1,
            confidence=1.0,
            qualifiers={"scope": source.authority_scope},
        )

        text = source.path.read_text(encoding="utf-8")
        lines = text.splitlines()
        if source.id == "alignment-authority":
            seed_alignment_authority(seeds, relations, source, lines)
        elif source.id == "runtime-realization-spec":
            seed_runtime_spec(seeds, relations, source, lines)
        elif source.id == "integrated-architecture-under-revision":
            seed_under_revision_architecture(seeds, relations, source, lines)

    return {
        "version": 1,
        "manifest": {
            "project": manifest.project,
            "path": str(manifest.path),
            "source_count": len(manifest.sources),
        },
        "seeds": sorted(seeds.values(), key=lambda item: (item["type"], item["name"].lower())),
        "relations": sorted(relations.values(), key=lambda item: item["id"]),
        "summary": {"seed_count": len(seeds), "relation_count": len(relations)},
    }


def seed_alignment_authority(
    seeds: dict[str, dict[str, Any]], relations: dict[str, dict[str, Any]], source: Source, lines: list[str]
) -> None:
    authority_id = entity_id("AuthoritySource", source.authority)

    runtime_spec_id = seed_entity(
        seeds,
        source,
        "Runtime Realization System Specification",
        "Document",
        "canonical",
        "authority-lock",
        10,
        16,
        aliases=["02-runtime-realization-system-specification.md"],
        summary="Binding source of truth for overlapping runtime realization decisions.",
    )
    under_revision_id = seed_entity(
        seeds,
        source,
        "Integrated Architecture Document",
        "Document",
        "candidate",
        "authority-lock",
        10,
        18,
        aliases=["03-integrated-canonical-architecture-document-under-revision.md"],
        summary="Canonical architecture document under revision; stale in runtime overlap zones.",
    )
    seed_relation(
        relations,
        runtime_spec_id,
        "supersedes",
        under_revision_id,
        source,
        None,
        16,
        16,
        confidence=1.0,
        qualifiers={"scope": "runtime-realization-overlap"},
    )

    for number, line in enumerate(lines, start=1):
        for name in CODE_RE.findall(line):
            if name in KNOWN_TYPES:
                seed_entity(seeds, source, name, KNOWN_TYPES[name], "canonical", "authority-lock", number, number)
            elif any(hint in name for hint in FORBIDDEN_TYPE_HINTS):
                entity = seed_entity(seeds, source, name, "ForbiddenPattern", "forbidden", "forbidden-target", number, number)
                seed_relation(relations, authority_id, "forbids", entity, source, None, number, number, confidence=1.0)

        if line.startswith("| `") and " | `" in line and " --- " not in line:
            cells = [cell.strip().strip("`") for cell in line.strip("|").split("|")]
            if len(cells) >= 2 and cells[0] and cells[1]:
                stale, replacement = cells[0], cells[1]
                stale_id = seed_entity(seeds, source, stale, "ForbiddenPattern", "forbidden", "replacement-rule", number, number)
                replacement_id = seed_entity(
                    seeds,
                    source,
                    replacement,
                    infer_entity_type(replacement),
                    "canonical",
                    "replacement-rule",
                    number,
                    number,
                )
                rule_id = seed_entity(
                    seeds,
                    source,
                    f"{stale} -> {replacement}",
                    "ReplacementRule",
                    "canonical",
                    "replacement-rule",
                    number,
                    number,
                    aliases=[stale, replacement],
                )
                seed_relation(
                    relations,
                    replacement_id,
                    "replaces",
                    stale_id,
                    source,
                    None,
                    number,
                    number,
                    confidence=1.0,
                    qualifiers={"replacement_rule_id": rule_id},
                )

    for owner, owned in OWNERSHIP_LAWS:
        owner_id = seed_entity(seeds, source, owner, infer_entity_type(owner), "canonical", "ownership-law", 108, 120)
        owned_id = seed_entity(seeds, source, owned, "Boundary", "canonical", "ownership-law", 108, 120)
        seed_relation(relations, owner_id, "owns", owned_id, source, None, 108, 120, confidence=1.0)

    seed_lifecycle(seeds, relations, source, line_start=77, line_end=81)


def seed_runtime_spec(
    seeds: dict[str, dict[str, Any]], relations: dict[str, dict[str, Any]], source: Source, lines: list[str]
) -> None:
    for phase in LIFECYCLE:
        seed_entity(seeds, source, phase, "LifecyclePhase", "canonical", "runtime-lifecycle", 10, 43)
    seed_lifecycle(seeds, relations, source, line_start=10, line_end=43)

    for number, line in enumerate(lines, start=1):
        for path in PATH_RE.findall(line):
            seed_entity(seeds, source, path.strip(".,);"), "ComponentArtifact", "canonical", "topology", number, number)
        for code in CODE_RE.findall(line):
            if len(code) > 120:
                continue
            if code in KNOWN_TYPES:
                seed_entity(seeds, source, code, KNOWN_TYPES[code], "canonical", "runtime-artifact", number, number)
            elif code in {"server", "async", "web", "cli", "agent", "desktop"}:
                seed_entity(seeds, source, code, "Role", "canonical", "runtime-role", number, number)
            elif code.startswith("@rawr/"):
                seed_entity(seeds, source, code, "PackageSurface", "canonical", "package-surface", number, number)
            elif code.startswith(("packages/", "resources/", "services/", "plugins/", "apps/")):
                seed_entity(seeds, source, code, "ComponentArtifact", "canonical", "topology", number, number)

        if line.startswith("| `") and number >= 3385:
            cells = [cell.strip().strip("`") for cell in line.strip("|").split("|")]
            if len(cells) >= 8 and cells[0] and cells[0] != "Component":
                component, owner, placement, producer, consumer, phase, diagnostic, gate = cells[:8]
                component_id = seed_entity(
                    seeds,
                    source,
                    component,
                    "RuntimeArtifact",
                    "canonical",
                    "component-contract",
                    number,
                    number,
                    summary=f"{component} runtime component contract row.",
                )
                owner_id = seed_entity(seeds, source, owner, infer_entity_type(owner), "canonical", "component-contract", number, number)
                placement_id = seed_entity(
                    seeds, source, placement, "ComponentArtifact", "canonical", "component-contract", number, number
                )
                producer_id = seed_entity(seeds, source, producer, "RuntimeArtifact", "canonical", "component-contract", number, number)
                consumer_id = seed_entity(seeds, source, consumer, "RuntimeArtifact", "canonical", "component-contract", number, number)
                phase_id = seed_entity(seeds, source, phase, "LifecyclePhase", "canonical", "component-contract", number, number)
                diagnostic_id = seed_entity(seeds, source, diagnostic, "Diagnostic", "canonical", "component-contract", number, number)
                gate_id = seed_entity(seeds, source, gate, "ValidationGate", "canonical", "component-contract", number, number)
                seed_relation(relations, owner_id, "owns", component_id, source, None, number, number, confidence=1.0)
                seed_relation(relations, component_id, "located_at", placement_id, source, None, number, number, confidence=1.0)
                seed_relation(relations, producer_id, "produces", component_id, source, None, number, number, confidence=1.0)
                seed_relation(relations, component_id, "consumes", consumer_id, source, None, number, number, confidence=1.0)
                seed_relation(relations, component_id, "requires", phase_id, source, None, number, number, confidence=1.0)
                seed_relation(relations, component_id, "emits_diagnostic", diagnostic_id, source, None, number, number, confidence=1.0)
                seed_relation(relations, gate_id, "validates", component_id, source, None, number, number, confidence=1.0)


def seed_under_revision_architecture(
    seeds: dict[str, dict[str, Any]], relations: dict[str, dict[str, Any]], source: Source, lines: list[str]
) -> None:
    broad_names = {
        "support matter": "ArchitectureKind",
        "semantic capability truth": "ArchitectureKind",
        "runtime projection": "ArchitectureKind",
        "app-level composition authority": "ArchitectureKind",
        "app": "ArchitectureKind",
        "manifest": "ArchitectureKind",
        "role": "Role",
        "surface": "Surface",
        "service": "ArchitectureKind",
        "plugin": "ArchitectureKind",
        "resource": "ResourceCapability",
        "provider": "Provider",
    }
    for number, line in enumerate(lines, start=1):
        lower = line.lower()
        for name, entity_type in broad_names.items():
            if name in lower:
                seed_entity(seeds, source, name, entity_type, "candidate", "broad-architecture", number, number)
        if "packages/runtime" in line or "@rawr/hq-sdk" in line or "startAppRole" in line:
            for code in CODE_RE.findall(line):
                if any(hint in code for hint in FORBIDDEN_TYPE_HINTS):
                    seed_entity(seeds, source, code, "ForbiddenPattern", "superseded", "stale-overlap", number, number)


def seed_lifecycle(
    seeds: dict[str, dict[str, Any]], relations: dict[str, dict[str, Any]], source: Source, line_start: int, line_end: int
) -> None:
    for left, right in zip(LIFECYCLE, LIFECYCLE[1:]):
        left_id = seed_entity(seeds, source, left, "LifecyclePhase", "canonical", "runtime-lifecycle", line_start, line_end)
        right_id = seed_entity(seeds, source, right, "LifecyclePhase", "canonical", "runtime-lifecycle", line_start, line_end)
        seed_relation(relations, left_id, "precedes", right_id, source, None, line_start, line_end, confidence=1.0)


def entity_id(entity_type: str, name: str) -> str:
    return stable_id("seed-entity", entity_type.lower(), normalize_name(name))


def seed_entity(
    seeds: dict[str, dict[str, Any]],
    source: Source,
    name: str,
    entity_type: str,
    authority_status: str,
    seed_kind: str,
    line_start: int,
    line_end: int,
    aliases: list[str] | None = None,
    summary: str = "",
) -> str:
    clean = normalize_display_name(name)
    if not clean:
        return ""
    key = entity_id(entity_type, clean)
    existing = seeds.get(key)
    prov = source_provenance(source, line_start, line_end)
    if existing:
        existing["aliases"] = sorted(set(existing.get("aliases", []) + (aliases or [])))
        existing["provenance"].append(prov)
        existing["authority_rank"] = min(existing["authority_rank"], source.authority_rank)
        return key
    seeds[key] = {
        "id": key,
        "name": clean,
        "type": entity_type,
        "aliases": sorted(set(aliases or [])),
        "summary": summary or f"Seeded {entity_type} from {source.title}.",
        "authority_status": authority_status,
        "authority_rank": source.authority_rank,
        "authority_scope": source.authority_scope,
        "seed_kind": seed_kind,
        "confidence": 1.0,
        "provenance": [prov],
        "sources": [source.id],
    }
    return key


def seed_relation(
    relations: dict[str, dict[str, Any]],
    subject_id: str,
    predicate: str,
    object_id: str,
    source: Source,
    claim_id: str | None,
    line_start: int,
    line_end: int,
    confidence: float,
    qualifiers: dict[str, Any] | None = None,
) -> None:
    if not subject_id or not object_id:
        return
    key = stable_id("seed-relation", subject_id, predicate, object_id, source.id, str(line_start), str(line_end))
    relations[key] = {
        "id": key,
        "subject_id": subject_id,
        "predicate": predicate,
        "object_id": object_id,
        "claim_id": claim_id,
        "confidence": confidence,
        "authority_rank": source.authority_rank,
        "authority_scope": source.authority_scope,
        "qualifiers": qualifiers or {},
        "provenance": source_provenance(source, line_start, line_end),
    }


def source_provenance(source: Source, line_start: int, line_end: int) -> dict[str, Any]:
    return {
        "source_id": source.id,
        "path": source.rel_path,
        "line_start": line_start,
        "line_end": line_end,
        "heading_path": [],
        "authority_rank": source.authority_rank,
        "authority_scope": source.authority_scope,
        "source_authority": source.authority,
    }


def infer_entity_type(name: str) -> str:
    clean = normalize_display_name(name)
    if clean in KNOWN_TYPES:
        return KNOWN_TYPES[clean]
    if clean in {"Services", "Plugins", "Apps", "Resources", "Providers", "SDK", "Runtime", "Harnesses", "Diagnostics"}:
        return "ArchitectureKind"
    if clean in LIFECYCLE:
        return "LifecyclePhase"
    if clean.startswith("@rawr/"):
        return "PackageSurface"
    if clean.startswith(("packages/", "resources/", "services/", "plugins/", "apps/")):
        return "ComponentArtifact"
    if clean.endswith("(...)"):
        return "Operation"
    if any(hint in clean for hint in FORBIDDEN_TYPE_HINTS):
        return "ForbiddenPattern"
    return "Concept"


def normalize_name(value: str) -> str:
    return normalize_display_name(value).lower()


def normalize_display_name(value: str) -> str:
    return " ".join(str(value).strip().strip("`").split())
