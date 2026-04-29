from __future__ import annotations

import hashlib
import json
import os
import re
import urllib.error
import urllib.request
from typing import Any

from .chunking import Chunk

CODE_RE = re.compile(r"`([^`\n]{2,160})`")
PATH_RE = re.compile(r"\b(?:apps|packages|resources|services|plugins|docs|scripts|tools)/[A-Za-z0-9_./:*-]+")
CLAIM_RE = re.compile(
    r"\b(?:must|should|canonical|authority|authoritative|supersedes|superseded|forbidden|replace|"
    r"runtime|owns|ownership|lifecycle|gate|validates|boundary|resource|provider|diagnostic|"
    r"finalization|mount|provision|compile|derive|select|declare)\b",
    re.IGNORECASE,
)

CLAIM_TYPES = [
    "normative",
    "ownership",
    "lifecycle",
    "placement",
    "boundary",
    "replacement",
    "forbidden",
    "gate",
    "definition",
    "separation",
    "reserved_detail",
    "diagnostic",
    "candidate",
]

AUTHORITY_STATUSES = ["canonical", "superseded", "transitional", "legacy", "forbidden", "observed", "candidate"]

ENTITY_TYPES = [
    "Document",
    "AuthoritySource",
    "ArchitectureLayer",
    "ArchitectureKind",
    "ComponentArtifact",
    "PackageSurface",
    "Operation",
    "RuntimeArtifact",
    "Boundary",
    "LifecyclePhase",
    "Role",
    "Surface",
    "ResourceCapability",
    "Provider",
    "SchemaContract",
    "Diagnostic",
    "ValidationGate",
    "ForbiddenPattern",
    "ReplacementRule",
    "ReservedDetailBoundary",
    "Claim",
    "Concept",
]

PREDICATES = [
    "is_authority_for",
    "supersedes",
    "replaces",
    "forbids",
    "owns",
    "does_not_own",
    "declares",
    "implements",
    "selects",
    "derives",
    "compiles_to",
    "provisions",
    "binds",
    "lowers_to",
    "mounts",
    "observes",
    "finalizes",
    "produces",
    "consumes",
    "requires",
    "depends_on",
    "classified_by",
    "located_at",
    "published_as",
    "validates",
    "emits_diagnostic",
    "reserved_for",
    "separate_from",
    "precedes",
]

CLAIM_EXTRACTION_SCHEMA: dict[str, Any] = {
    "name": "authority_claim_extraction",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "claims": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "text": {"type": "string"},
                        "claim_type": {"type": "string", "enum": CLAIM_TYPES},
                        "authority_status": {"type": "string", "enum": AUTHORITY_STATUSES},
                        "confidence": {"type": "number"},
                        "line_start": {"type": "integer"},
                        "line_end": {"type": "integer"},
                        "entity_names": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": [
                        "text",
                        "claim_type",
                        "authority_status",
                        "confidence",
                        "line_start",
                        "line_end",
                        "entity_names",
                    ],
                },
            },
            "candidate_entities": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "name": {"type": "string"},
                        "entity_type": {"type": "string", "enum": ENTITY_TYPES},
                        "aliases": {"type": "array", "items": {"type": "string"}},
                        "confidence": {"type": "number"},
                    },
                    "required": ["name", "entity_type", "aliases", "confidence"],
                },
            },
        },
        "required": ["claims", "candidate_entities"],
    },
}


def stable_id(*parts: str) -> str:
    raw = "::".join(part for part in parts if part)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def provenance(chunk: Chunk) -> dict[str, Any]:
    return {
        "source_id": chunk.source_id,
        "path": chunk.source_path,
        "line_start": chunk.line_start,
        "line_end": chunk.line_end,
        "heading_path": chunk.heading_path,
        "authority_rank": chunk.authority_rank,
        "authority_scope": chunk.authority_scope,
        "source_authority": chunk.authority,
    }


def request_params_for_model(model: str) -> dict[str, Any]:
    params: dict[str, Any] = {
        "response_format": {"type": "json_schema", "json_schema": CLAIM_EXTRACTION_SCHEMA},
    }
    if not model.startswith("gpt-5."):
        params["temperature"] = 0
    return params


def schema_hash() -> str:
    payload = json.dumps(CLAIM_EXTRACTION_SCHEMA, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def heuristic_extract(chunk: Chunk, seeds: dict[str, Any]) -> dict[str, Any]:
    raw_claims: list[dict[str, Any]] = []
    candidate_entities: list[dict[str, Any]] = []

    for offset, line in enumerate(chunk.text.splitlines(), start=chunk.line_start):
        text = line.strip()
        if not text:
            continue
        for name in sorted(set(CODE_RE.findall(text) + PATH_RE.findall(text))):
            candidate_entities.append(
                {
                    "name": name.strip(".,);"),
                    "entity_type": infer_entity_type(name),
                    "aliases": [],
                    "confidence": 0.72,
                }
            )
        if CLAIM_RE.search(text):
            raw_claims.append(
                {
                    "text": text[:800],
                    "claim_type": infer_claim_type(text),
                    "authority_status": infer_status(text, chunk.status),
                    "confidence": 0.62,
                    "line_start": offset,
                    "line_end": offset,
                    "entity_names": sorted(set(CODE_RE.findall(text) + PATH_RE.findall(text))),
                }
            )

    return finalize_extraction(chunk, "heuristic", None, seeds, raw_claims, candidate_entities, [])


def llm_extract(chunk: Chunk, prompts: dict[str, str], model: str, seeds: dict[str, Any]) -> dict[str, Any]:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")

    payload = {
        "chunk": chunk.to_dict(),
        "seed_catalog_excerpt": seed_catalog_excerpt(seeds, chunk.text),
        "allowed_claim_types": CLAIM_TYPES,
        "allowed_authority_statuses": AUTHORITY_STATUSES,
    }
    body: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": prompts["authority_claim"]},
            {"role": "user", "content": json.dumps(payload, indent=2)},
        ],
    }
    body.update(request_params_for_model(model))

    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI API request failed: HTTP {exc.code}: {detail[:500]}") from exc

    content = response_payload["choices"][0]["message"]["content"]
    extracted = json.loads(content)
    return finalize_extraction(
        chunk,
        "llm",
        model,
        seeds,
        extracted.get("claims", []),
        extracted.get("candidate_entities", []),
        [],
    )


def finalize_extraction(
    chunk: Chunk,
    mode: str,
    model: str | None,
    seeds: dict[str, Any],
    raw_claims: list[dict[str, Any]],
    candidate_entities: list[dict[str, Any]],
    diagnostics: list[str],
) -> dict[str, Any]:
    claims = [normalize_claim(chunk, raw) for raw in raw_claims if str(raw.get("text") or "").strip()]
    mentions = resolve_entity_mentions(chunk, claims, candidate_entities, seeds)
    relations = build_relations(chunk, claims, mentions, seeds)

    row = {
        "chunk": chunk.to_dict(),
        "mode": mode,
        "claims": claims,
        "entity_mentions": mentions,
        "relations": relations,
        "diagnostics": diagnostics,
    }
    if model:
        row["model"] = model
    return row


def normalize_claim(chunk: Chunk, raw: dict[str, Any]) -> dict[str, Any]:
    text = " ".join(str(raw.get("text") or "").strip().split())
    line_start = clamp_line(raw.get("line_start"), chunk.line_start, chunk.line_end)
    line_end = clamp_line(raw.get("line_end"), line_start, chunk.line_end)
    claim_type = str(raw.get("claim_type") or "candidate")
    if claim_type not in CLAIM_TYPES:
        claim_type = "candidate"
    authority_status = str(raw.get("authority_status") or chunk.status)
    if authority_status not in AUTHORITY_STATUSES:
        authority_status = chunk.status if chunk.status in AUTHORITY_STATUSES else "observed"
    return {
        "id": stable_id("claim", chunk.source_id, str(line_start), str(line_end), text),
        "text": text,
        "claim_type": claim_type,
        "authority_status": authority_status,
        "confidence": bounded_float(raw.get("confidence"), 0.5),
        "line_start": line_start,
        "line_end": line_end,
        "authority_rank": chunk.authority_rank,
        "authority_scope": chunk.authority_scope,
        "entity_names": sorted({str(name).strip() for name in raw.get("entity_names", []) if str(name).strip()}),
    }


def resolve_entity_mentions(
    chunk: Chunk, claims: list[dict[str, Any]], candidate_entities: list[dict[str, Any]], seeds: dict[str, Any]
) -> list[dict[str, Any]]:
    index = seed_index(seeds)
    mentions: dict[str, dict[str, Any]] = {}
    candidate_names = {
        str(item.get("name") or "").strip(): item for item in candidate_entities if str(item.get("name") or "").strip()
    }
    for claim in claims:
        names = set(claim.get("entity_names", []))
        names.update(CODE_RE.findall(claim["text"]))
        names.update(PATH_RE.findall(claim["text"]))
        for seed in seeds.get("seeds", []):
            if seed["name"] and seed["name"] in claim["text"]:
                names.add(seed["name"])
            for alias in seed.get("aliases", []):
                if alias and alias in claim["text"]:
                    names.add(alias)
        for name in names:
            clean = normalize_display_name(name)
            if not clean:
                continue
            seed = index.get(normalize_name(clean))
            candidate = candidate_names.get(clean, {})
            if seed:
                entity_id = seed["id"]
                entity_type = seed["type"]
                status = "seeded"
                authority_status = seed["authority_status"]
                confidence = max(0.7, float(candidate.get("confidence") or 0.0))
            else:
                entity_type = str(candidate.get("entity_type") or infer_entity_type(clean))
                if entity_type not in ENTITY_TYPES:
                    entity_type = "Concept"
                entity_id = stable_id("candidate-entity", entity_type.lower(), normalize_name(clean))
                status = "candidate"
                authority_status = claim["authority_status"]
                confidence = bounded_float(candidate.get("confidence"), 0.55)
            mentions[entity_id] = {
                "id": stable_id("mention", entity_id, chunk.id, claim["id"]),
                "entity_id": entity_id,
                "name": clean,
                "type": entity_type,
                "resolution_status": status,
                "authority_status": authority_status,
                "confidence": confidence,
                "claim_id": claim["id"],
                "line_start": claim["line_start"],
                "line_end": claim["line_end"],
                "authority_rank": chunk.authority_rank,
                "authority_scope": chunk.authority_scope,
            }
    return sorted(mentions.values(), key=lambda item: (item["type"], item["name"].lower()))


def build_relations(
    chunk: Chunk, claims: list[dict[str, Any]], mentions: list[dict[str, Any]], seeds: dict[str, Any]
) -> list[dict[str, Any]]:
    relations: dict[str, dict[str, Any]] = {}
    name_to_id = seed_index(seeds)
    mention_ids = {mention["entity_id"] for mention in mentions}
    mention_by_name = {normalize_name(mention["name"]): mention["entity_id"] for mention in mentions}
    mention_by_id = {mention["entity_id"]: mention for mention in mentions}

    for claim in claims:
        text = claim["text"]
        lower = text.lower()
        ids = [mention_by_name[name] for name in mention_by_name if name and name in lower]
        ids = [entity_id for entity_id in ids if entity_id in mention_ids]

        if claim["claim_type"] == "forbidden" or "forbidden" in lower or "must not" in lower:
            authority = seed_value_id(
                name_to_id.get("binding-alignment-authority")
                or name_to_id.get("integrated architecture alignment authority")
            )
            fragment = forbidden_fragment(text)
            for entity_id in ids:
                mention = mention_by_id.get(entity_id, {})
                mention_name = normalize_name(mention.get("name", ""))
                is_forbidden_target = mention.get("type") == "ForbiddenPattern" or (
                    fragment and mention_name and mention_name in normalize_name(fragment)
                )
                if authority and entity_id != authority and is_forbidden_target:
                    add_relation(
                        relations, authority, "forbids", entity_id, claim, chunk, confidence=claim["confidence"]
                    )

        if claim["claim_type"] == "ownership" or " owns " in lower or " own " in lower:
            predicate = "does_not_own" if "does not own" in lower or "do not own" in lower else "owns"
            if len(ids) >= 2:
                add_relation(relations, ids[0], predicate, ids[1], claim, chunk, confidence=claim["confidence"])

        lifecycle_ids = [
            seed_value_id(name_to_id.get(phase))
            for phase in [
                "definition",
                "selection",
                "derivation",
                "compilation",
                "provisioning",
                "mounting",
                "observation",
            ]
        ]
        lifecycle_ids = [entity_id for entity_id in lifecycle_ids if entity_id]
        if claim["claim_type"] == "lifecycle" or "definition -> selection" in lower:
            for left, right in zip(lifecycle_ids, lifecycle_ids[1:]):
                add_relation(relations, left, "precedes", right, claim, chunk, confidence=claim["confidence"])

        if claim["claim_type"] == "separation" and len(ids) >= 2:
            for other in ids[1:]:
                add_relation(relations, ids[0], "separate_from", other, claim, chunk, confidence=claim["confidence"])

        if claim["claim_type"] == "gate" and len(ids) >= 2:
            add_relation(relations, ids[0], "validates", ids[1], claim, chunk, confidence=claim["confidence"])

    return sorted(relations.values(), key=lambda item: item["id"])


def add_relation(
    relations: dict[str, dict[str, Any]],
    subject_id: str,
    predicate: str,
    object_id: str,
    claim: dict[str, Any],
    chunk: Chunk,
    confidence: float,
) -> None:
    if predicate not in PREDICATES or subject_id == object_id:
        return
    key = stable_id("relation", subject_id, predicate, object_id, claim["id"])
    relations[key] = {
        "id": key,
        "subject_id": subject_id,
        "predicate": predicate,
        "object_id": object_id,
        "claim_id": claim["id"],
        "confidence": confidence,
        "authority_rank": chunk.authority_rank,
        "authority_scope": chunk.authority_scope,
        "qualifiers": {"source_authority": chunk.authority},
        "provenance": {
            "source_id": chunk.source_id,
            "path": chunk.source_path,
            "line_start": claim["line_start"],
            "line_end": claim["line_end"],
            "heading_path": chunk.heading_path,
            "authority_rank": chunk.authority_rank,
            "authority_scope": chunk.authority_scope,
            "source_authority": chunk.authority,
        },
    }


def extract_chunk(
    chunk: Chunk, prompts: dict[str, str], mode: str, model: str, seeds: dict[str, Any]
) -> dict[str, Any]:
    if mode == "heuristic":
        return heuristic_extract(chunk, seeds)
    if mode == "llm":
        return llm_extract(chunk, prompts, model, seeds)

    if os.environ.get("OPENAI_API_KEY"):
        try:
            return llm_extract(chunk, prompts, model, seeds)
        except Exception as exc:
            fallback = heuristic_extract(chunk, seeds)
            fallback["mode"] = "llm_error_fallback"
            fallback["model"] = model
            fallback["diagnostics"] = [str(exc)]
            return fallback
    return heuristic_extract(chunk, seeds)


def seed_catalog_excerpt(seeds: dict[str, Any], text: str, limit: int = 140) -> list[dict[str, Any]]:
    lower = text.lower()
    ranked: list[tuple[int, dict[str, Any]]] = []
    for seed in seeds.get("seeds", []):
        score = 0
        if seed["name"].lower() in lower:
            score += 4
        if any(str(alias).lower() in lower for alias in seed.get("aliases", [])):
            score += 3
        if seed["authority_rank"] <= 2:
            score += 1
        if seed["seed_kind"] in {"authority-lock", "replacement-rule", "forbidden-target", "ownership-law"}:
            score += 2
        if score:
            ranked.append((score, seed))
    if len(ranked) < 20:
        ranked.extend((1, seed) for seed in seeds.get("seeds", [])[:40])
    ranked.sort(key=lambda item: (-item[0], item[1]["authority_rank"], item[1]["name"]))
    excerpt = []
    seen: set[str] = set()
    for _, seed in ranked:
        if seed["id"] in seen:
            continue
        seen.add(seed["id"])
        excerpt.append(
            {
                "id": seed["id"],
                "name": seed["name"],
                "type": seed["type"],
                "aliases": seed.get("aliases", []),
                "authority_status": seed["authority_status"],
                "authority_rank": seed["authority_rank"],
                "authority_scope": seed["authority_scope"],
                "seed_kind": seed["seed_kind"],
            }
        )
        if len(excerpt) >= limit:
            break
    return excerpt


def seed_index(seeds: dict[str, Any]) -> dict[str, dict[str, Any] | str]:
    index: dict[str, Any] = {}
    for seed in seeds.get("seeds", []):
        index[normalize_name(seed["name"])] = seed
        for alias in seed.get("aliases", []):
            index[normalize_name(alias)] = seed
    return index


def seed_value_id(value: Any) -> str | None:
    if isinstance(value, dict):
        return str(value.get("id") or "") or None
    if isinstance(value, str):
        return value
    return None


def infer_claim_type(text: str) -> str:
    lower = text.lower()
    if "forbidden" in lower or "must not" in lower:
        return "forbidden"
    if "replace" in lower or "replacement" in lower:
        return "replacement"
    if "own" in lower:
        return "ownership"
    if "lifecycle" in lower or "definition -> selection" in lower:
        return "lifecycle"
    if "gate" in lower or "validates" in lower or "proof" in lower:
        return "gate"
    if "boundary" in lower:
        return "boundary"
    if "separate" in lower or "!=" in lower:
        return "separation"
    if "diagnostic" in lower or "telemetry" in lower or "catalog" in lower:
        return "diagnostic"
    return "normative"


def forbidden_fragment(text: str) -> str:
    lower = text.lower()
    starts = [
        "do not preserve",
        "must not present",
        "must not copy",
        "must not rely on",
        "there is no canonical public",
        "not canonical",
    ]
    start_index = -1
    for start in starts:
        idx = lower.find(start)
        if idx != -1:
            start_index = idx + len(start)
            break
    if start_index == -1:
        return text
    fragment = text[start_index:]
    for delimiter in [" when ", " because ", "."]:
        idx = fragment.lower().find(delimiter)
        if idx != -1:
            fragment = fragment[:idx]
            break
    return fragment


def infer_status(text: str, default: str) -> str:
    lower = text.lower()
    if "forbidden" in lower or "must not" in lower:
        return "forbidden"
    if "superseded" in lower or "stale" in lower:
        return "superseded"
    if "legacy" in lower:
        return "legacy"
    if "transitional" in lower or "migration debt" in lower:
        return "transitional"
    if "canonical" in lower or "authoritative" in lower or "authority" in lower:
        return "canonical"
    return default if default in AUTHORITY_STATUSES else "observed"


def infer_entity_type(name: str) -> str:
    clean = normalize_display_name(name)
    if clean in {"server", "async", "web", "cli", "agent", "desktop"}:
        return "Role"
    if clean.startswith("@rawr/"):
        return "PackageSurface"
    if clean.startswith(("packages/", "resources/", "services/", "plugins/", "apps/")):
        return "ComponentArtifact"
    if clean.endswith("(...)"):
        return "Operation"
    if clean.endswith("Resource") or clean.startswith("RuntimeResource"):
        return "ResourceCapability"
    if clean.endswith("Provider") or "ProviderSelection" in clean:
        return "Provider"
    if clean.endswith("Schema") or "Schema" in clean:
        return "SchemaContract"
    if "Diagnostic" in clean or "Telemetry" in clean or "Catalog" in clean:
        return "Diagnostic"
    if "Gate" in clean or "gate" in clean:
        return "ValidationGate"
    if "Runtime" in clean or "Bootgraph" in clean or "FunctionBundle" in clean:
        return "RuntimeArtifact"
    return "Concept"


def normalize_name(value: str) -> str:
    return normalize_display_name(value).lower()


def normalize_display_name(value: str) -> str:
    return " ".join(str(value).strip().strip("`").split())


def bounded_float(value: Any, default: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return min(1.0, max(0.0, number))


def clamp_line(value: Any, lower: int, upper: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return lower
    return min(upper, max(lower, number))
