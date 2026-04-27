from __future__ import annotations

import hashlib
import importlib
import importlib.metadata
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from .io import rel
from .paths import REPO_ROOT, WORKBENCH_ROOT
from .semantica_adapter import iri_fragment, semantica_status, turtle_literal

POLARITIES = ["positive", "negative", "prohibitive", "conditional", "unknown"]
MODALITIES = ["normative", "descriptive", "proposed", "rejected", "historical", "illustrative", "unknown"]
ASSERTION_SCOPES = ["target-architecture", "current-state", "migration-note", "example", "outside-scope", "unknown"]
FINDING_KINDS = ["aligned", "conflict", "deprecated-use", "candidate-new", "ambiguous", "outside-scope", "informational"]

FIXTURE_DOCUMENT = WORKBENCH_ROOT / "fixtures/docs/semantic-evidence-cases.md"
FIXTURE_EXPECTED = WORKBENCH_ROOT / "fixtures/semantic-evidence-expected.json"

NEGATIVE_RE = re.compile(r"\b(there is no|there are no|no\s+[a-z0-9_./` -]+|not\b|never\b|without\b)\b", re.I)
PROHIBITIVE_RE = re.compile(r"\b(do not|must not|should not|must never|shall not|forbid|forbids|forbidden|invalid)\b", re.I)
PROPOSED_RE = re.compile(r"\b(create|add|introduce|use|adopt|preserve|restore|target architecture should|should use|must use)\b", re.I)
NORMATIVE_RE = re.compile(r"\b(must|should|shall|required|canonical|target architecture|valid|invalid|forbidden)\b", re.I)
HISTORICAL_RE = re.compile(r"\b(old|legacy|previous|previously|historical|before|superseded|used to)\b", re.I)
ILLUSTRATIVE_RE = re.compile(r"\b(example|for example|e\.g\.|sample)\b", re.I)
REPLACEMENT_RE = re.compile(r"(->|\breplace[sd]?\b|\breplacement\b|\binstead\b|\buse .+ not .+)", re.I)
CONDITIONAL_RE = re.compile(r"\b(if|when|unless|only if|provided that)\b", re.I)
OUTSIDE_SCOPE_RE = re.compile(r"\b(todo|prompt|task|instruction|scaffold|brainstorm)\b", re.I)
QUESTION_RE = re.compile(r"\?\s*$")


def fixture_document_path() -> Path:
    return FIXTURE_DOCUMENT


def semantic_capability_probe() -> dict[str, Any]:
    status = semantica_status()
    modules = {
        "semantic_extract": [
            "NERExtractor",
            "RelationExtractor",
            "TripletExtractor",
            "SemanticNetworkExtractor",
            "LLMExtraction",
            "ExtractionValidator",
        ],
        "ontology": ["OntologyEngine", "OntologyValidator", "OntologyIngestor"],
        "reasoning": ["SPARQLReasoner", "ReteEngine", "DatalogReasoner", "Reasoner"],
        "conflicts": ["ConflictDetector", "SourceTracker"],
        "pipeline": ["Pipeline", "PipelineBuilder"],
        "ingest": ["FileIngestor", "OntologyIngestor"],
    }
    report: dict[str, Any] = {
        **status,
        "checked_modules": {},
        "optional_dependencies": {},
        "proofs": {},
        "limitations": [
            "Semantica extraction does not define RAWR architecture truth.",
            "Decision-grade findings still require RAWR claim polarity, modality, assertion scope, and authority rules.",
            "Any Semantica extraction that loses line spans is evidence-only until resolved back to local spans.",
        ],
    }
    try:
        report["version"] = importlib.metadata.version("semantica")
    except Exception:
        pass

    for module_name, expected in modules.items():
        fqmn = f"semantica.{module_name}"
        try:
            module = importlib.import_module(fqmn)
            report["checked_modules"][fqmn] = {
                "available": True,
                "classes": {name: hasattr(module, name) for name in expected},
            }
        except Exception as exc:
            report["checked_modules"][fqmn] = {"available": False, "error": str(exc)}

    for dependency in ["rdflib", "pyshacl", "spacy", "openai"]:
        try:
            report["optional_dependencies"][dependency] = importlib.metadata.version(dependency)
        except Exception as exc:
            report["optional_dependencies"][dependency] = f"unavailable: {exc}"

    proof_text = "There is no root-level core/ authoring root. Create a root-level core/ authoring root."
    try:
        from semantica.semantic_extract import TripletExtractor

        triplets = TripletExtractor(method="pattern", include_provenance=True).extract_triplets(proof_text)
        report["proofs"]["triplet_extractor_pattern"] = {
            "ok": True,
            "triplet_count": len(triplets),
            "preserves_line_spans": False,
        }
    except Exception as exc:
        report["proofs"]["triplet_extractor_pattern"] = {"ok": False, "error": str(exc)}

    try:
        from semantica.ontology import OntologyEngine

        ontology = OntologyEngine().from_data({"classes": [{"name": "EvidenceClaim"}], "properties": [{"name": "conflicts_with"}]})
        report["proofs"]["ontology_from_data"] = {
            "ok": True,
            "class_count": len(ontology.get("classes", [])),
            "property_count": len(ontology.get("properties", [])),
        }
    except Exception as exc:
        report["proofs"]["ontology_from_data"] = {"ok": False, "error": str(exc)}

    return report


def render_semantica_capability_report(report: dict[str, Any]) -> str:
    lines = [
        "# Semantic Evidence Semantica Capability Report",
        "",
        "This report records the pinned Semantica surfaces available to the RAWR semantic evidence pipeline. It is a capability proof, not an ontology authority document.",
        "",
        "## Status",
        "",
        f"- Available: `{report.get('available')}`",
        f"- Version: `{report.get('version', 'unknown')}`",
        f"- Module: `{report.get('module', 'unknown')}`",
        "",
        "## Modules",
        "",
    ]
    for module_name, module_report in sorted(report.get("checked_modules", {}).items()):
        lines.append(f"- `{module_name}`: `{module_report.get('available')}`")
        classes = module_report.get("classes") or {}
        for class_name, available in sorted(classes.items()):
            lines.append(f"  - `{class_name}`: `{available}`")
    lines.extend(["", "## Proofs", ""])
    for proof_name, proof in sorted(report.get("proofs", {}).items()):
        lines.append(f"- `{proof_name}`: `{proof.get('ok')}`")
        if proof.get("error"):
            lines.append(f"  - Error: `{proof['error']}`")
        if "preserves_line_spans" in proof:
            lines.append(f"  - Preserves line spans: `{proof['preserves_line_spans']}`")
    lines.extend(["", "## Decision", ""])
    lines.append(
        "Semantica should be used for extraction experiments, ontology export, RDF/SHACL generation, query surfaces, and provenance helpers. RAWR-specific claim semantics and authority rules remain explicit workbench logic."
    )
    return "\n".join(lines) + "\n"


def extract_evidence_claims(document: Path, graph: dict[str, Any], candidate_queue: dict[str, Any], *, fixture: bool = False) -> dict[str, Any]:
    if not document.is_absolute():
        document = REPO_ROOT / document
    lines = document.read_text(encoding="utf-8").splitlines()
    indexes = build_semantic_indexes(graph, candidate_queue)
    claims: list[dict[str, Any]] = []
    heading_path: list[str] = []

    for line_number, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped:
            continue
        heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading:
            level = len(heading.group(1))
            heading_path = heading_path[: level - 1] + [heading.group(2).strip()]
            continue
        if is_table_separator(stripped) or is_table_header(stripped):
            continue

        matches = resolve_line_terms(stripped, indexes)
        classification = classify_claim_text(stripped, heading_path)
        if not matches and classification["assertion_scope"] == "outside-scope":
            claims.append(build_claim(document, line_number, stripped, heading_path, matches, classification, confidence=0.65))
            continue
        if not matches and not is_review_relevant_line(stripped):
            continue
        if is_table_row(stripped) and matches.get("prohibited_patterns"):
            claims.extend(build_table_claims(document, line_number, stripped, heading_path, matches, indexes))
            continue
        claims.append(build_claim(document, line_number, stripped, heading_path, matches, classification))

    return {
        "schema_version": "rawr-semantic-evidence-v1",
        "document": rel(document),
        "fixture": fixture,
        "semantica": semantic_capability_probe(),
        "summary": {
            "claim_count": len(claims),
            "claims_by_polarity": dict(Counter(claim["polarity"] for claim in claims)),
            "claims_by_modality": dict(Counter(claim["modality"] for claim in claims)),
            "claims_by_scope": dict(Counter(claim["assertion_scope"] for claim in claims)),
        },
        "claims": claims,
    }


def is_table_row(text: str) -> bool:
    return text.startswith("|") and text.endswith("|") and text.count("|") >= 3


def is_table_separator(text: str) -> bool:
    if not is_table_row(text):
        return False
    cells = [cell.strip() for cell in text.strip("|").split("|")]
    return all(set(cell) <= {"-", ":", " "} for cell in cells)


def is_table_header(text: str) -> bool:
    if not is_table_row(text):
        return False
    normalized = normalize_text(text)
    return "old pattern" in normalized and "replacement" in normalized


def build_table_claims(
    document: Path,
    line_number: int,
    text: str,
    heading_path: list[str],
    matches: dict[str, list[dict[str, Any]]],
    indexes: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    cells = [cell.strip() for cell in text.strip("|").split("|")]
    if len(cells) < 2 or all(set(cell) <= {"-", " "} for cell in cells):
        return []
    old_matches = resolve_line_terms(cells[0], indexes)
    replacement_matches = resolve_line_terms(cells[1], indexes)
    claims: list[dict[str, Any]] = []
    if old_matches.get("prohibited_patterns") or old_matches.get("deprecated_terms"):
        claims.append(
            build_claim(
                document,
                line_number,
                text,
                heading_path,
                old_matches,
                {
                    "polarity": "prohibitive",
                    "modality": "rejected",
                    "assertion_scope": "migration-note",
                    "authority_context": "comparison-document",
                },
                confidence=0.86,
                claim_suffix="old-side",
            )
        )
    if replacement_matches.get("prohibited_patterns") or replacement_matches.get("deprecated_terms"):
        claims.append(
            build_claim(
                document,
                line_number,
                text,
                heading_path,
                replacement_matches,
                {
                    "polarity": "positive",
                    "modality": "normative",
                    "assertion_scope": "target-architecture",
                    "authority_context": "comparison-document",
                },
                confidence=0.9,
                claim_suffix="replacement-side",
            )
        )
    return claims or [build_claim(document, line_number, text, heading_path, matches, classify_claim_text(text, heading_path), claim_suffix="table-row")]


def build_claim(
    document: Path,
    line_number: int,
    text: str,
    heading_path: list[str],
    matches: dict[str, list[dict[str, Any]]],
    classification: dict[str, str],
    *,
    confidence: float = 0.82,
    claim_suffix: str | None = None,
) -> dict[str, Any]:
    resolved_ids = {
        "canonical": [item["id"] for item in matches.get("canonical", [])],
        "deprecated_terms": [item["id"] for item in matches.get("deprecated_terms", [])],
        "prohibited_patterns": [item["id"] for item in matches.get("prohibited_patterns", [])],
        "candidates": [item["id"] for item in matches.get("candidates", [])],
    }
    claim_id = stable_id("claim", rel(document), str(line_number), text, claim_suffix or "")
    subject = first_label(matches) or text[:80]
    predicate = infer_claim_predicate(classification, matches)
    return {
        "id": claim_id,
        "source_path": rel(document),
        "line_start": line_number,
        "line_end": line_number,
        "heading_path": heading_path,
        "text": text,
        "subject": subject,
        "predicate": predicate,
        "object": first_object_label(matches),
        "polarity": classification["polarity"],
        "modality": classification["modality"],
        "assertion_scope": classification["assertion_scope"],
        "authority_context": classification["authority_context"],
        "confidence": confidence,
        "extractor": "rawr-semantic-heuristic-v1",
        "model": None,
        "resolved_ids": resolved_ids,
        "review_state": "machine-classified",
    }


def compare_evidence_to_ontology(evidence: dict[str, Any], graph: dict[str, Any], candidate_queue: dict[str, Any]) -> dict[str, Any]:
    entities = {entity["id"]: entity for entity in graph["entities"]}
    candidates = {candidate["id"]: candidate for candidate in candidate_queue.get("candidates", [])}
    findings: list[dict[str, Any]] = []

    for claim in evidence.get("claims", []):
        claim_findings = classify_claim_against_constraints(claim, entities, candidates)
        findings.extend(claim_findings)

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for finding in findings:
        grouped[finding["kind"]].append(finding)

    return {
        "schema_version": "rawr-semantic-compare-v1",
        "document": evidence["document"],
        "ontology_graph": graph["id"],
        "summary": {
            "claim_count": len(evidence.get("claims", [])),
            "finding_count": len(findings),
            "findings_by_kind": dict(Counter(finding["kind"] for finding in findings)),
            "decision_grade_finding_count": sum(1 for finding in findings if finding.get("decision_grade")),
        },
        "claims": evidence.get("claims", []),
        "findings": findings,
        "aligned": grouped.get("aligned", []),
        "conflicts": grouped.get("conflict", []),
        "deprecated_uses": grouped.get("deprecated-use", []),
        "candidate_new": grouped.get("candidate-new", []),
        "ambiguous": grouped.get("ambiguous", []),
        "outside_scope": grouped.get("outside-scope", []),
        "informational": grouped.get("informational", []),
    }


def classify_claim_against_constraints(
    claim: dict[str, Any],
    entities: dict[str, dict[str, Any]],
    candidates: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    resolved = claim.get("resolved_ids", {})
    prohibited = resolved.get("prohibited_patterns", [])
    deprecated = resolved.get("deprecated_terms", [])
    canonical = resolved.get("canonical", [])
    candidate_ids = resolved.get("candidates", [])
    polarity = claim.get("polarity")
    modality = claim.get("modality")
    scope = claim.get("assertion_scope")

    if scope == "outside-scope":
        return [finding("outside-scope", claim, reason="Claim is outside the active architecture comparison scope.", decision_grade=False)]

    for entity_id in prohibited:
        entity = entities.get(entity_id, {"id": entity_id, "label": entity_id})
        if polarity in {"negative", "prohibitive"} or modality == "rejected":
            findings.append(
                finding(
                    "aligned",
                    claim,
                    entity=entity,
                    rule="negative_or_prohibitive_claim_rejects_prohibited_construction",
                    reason="The document rejects a prohibited construction pattern.",
                    decision_grade=True,
                )
            )
        elif modality == "historical" or scope == "migration-note":
            findings.append(
                finding(
                    "informational",
                    claim,
                    entity=entity,
                    rule="historical_or_migration_mention_of_prohibited_construction",
                    reason="The document mentions a prohibited pattern as history or migration context, not target architecture.",
                    decision_grade=False,
                )
            )
        elif polarity == "positive" and scope == "target-architecture":
            findings.append(
                finding(
                    "conflict",
                    claim,
                    entity=entity,
                    rule="positive_target_claim_asserts_prohibited_construction",
                    reason="The document asserts a prohibited construction pattern as target architecture.",
                    decision_grade=True,
                )
            )
        else:
            findings.append(
                finding(
                    "ambiguous",
                    claim,
                    entity=entity,
                    rule="prohibited_construction_without_clear_assertion_semantics",
                    reason="The claim references a prohibited construction pattern but polarity or scope is unclear.",
                    decision_grade=False,
                )
            )

    for entity_id in deprecated:
        entity = entities.get(entity_id, {"id": entity_id, "label": entity_id})
        if polarity == "positive" and scope == "target-architecture":
            findings.append(
                finding(
                    "deprecated-use",
                    claim,
                    entity=entity,
                    rule="target_claim_uses_deprecated_vocabulary",
                    reason="The document uses deprecated vocabulary as target architecture.",
                    decision_grade=True,
                )
            )
        else:
            findings.append(
                finding(
                    "informational",
                    claim,
                    entity=entity,
                    rule="non_target_deprecated_vocabulary_mention",
                    reason="Deprecated vocabulary appears outside a target-architecture assertion.",
                    decision_grade=False,
                )
            )

    if not prohibited and not deprecated and candidate_ids:
        for candidate_id in candidate_ids:
            candidate = candidates.get(candidate_id, {"id": candidate_id, "label": candidate_id})
            if scope in {"target-architecture", "current-state"} and claim.get("confidence", 0) >= 0.7:
                findings.append(
                    finding(
                        "candidate-new",
                        claim,
                        entity=candidate,
                        rule="in_scope_unresolved_operational_concept",
                        reason="The document introduces an in-scope concept that needs review before promotion.",
                        decision_grade=False,
                    )
                )

    if not prohibited and not deprecated and not candidate_ids and canonical:
        for entity_id in canonical[:3]:
            entity = entities.get(entity_id, {"id": entity_id, "label": entity_id})
            if polarity in {"positive", "prohibitive", "negative"}:
                findings.append(
                    finding(
                        "aligned",
                        claim,
                        entity=entity,
                        rule="claim_resolves_to_canonical_ontology_entity",
                        reason="The claim resolves to a canonical ontology entity without violating a constraint.",
                        decision_grade=False,
                    )
                )

    if not findings:
        findings.append(
            finding(
                "ambiguous",
                claim,
                rule="no_resolved_decision_target",
                reason="The claim is review-relevant but did not resolve to a canonical, deprecated, prohibited, or candidate target.",
                decision_grade=False,
            )
        )
    return findings


def finding(
    kind: str,
    claim: dict[str, Any],
    *,
    entity: dict[str, Any] | None = None,
    rule: str = "",
    reason: str,
    decision_grade: bool,
) -> dict[str, Any]:
    target_id = entity.get("id") if entity else None
    return {
        "id": stable_id("finding", kind, claim["id"], target_id or "none", rule),
        "kind": kind,
        "claim_id": claim["id"],
        "document_path": claim["source_path"],
        "line_start": claim["line_start"],
        "line_end": claim["line_end"],
        "text": claim["text"],
        "entity_id": target_id,
        "label": entity.get("label") if entity else None,
        "rule": rule,
        "reason": reason,
        "decision_grade": decision_grade,
        "confidence": claim.get("confidence"),
        "polarity": claim.get("polarity"),
        "modality": claim.get("modality"),
        "assertion_scope": claim.get("assertion_scope"),
    }


def render_semantic_compare_report(compare: dict[str, Any]) -> str:
    summary = compare["summary"]
    by_kind = summary.get("findings_by_kind", {})
    lines = [
        "# Semantic Evidence Comparison Report",
        "",
        f"- Document: `{compare['document']}`",
        f"- Ontology graph: `{compare['ontology_graph']}`",
        f"- Claims: `{summary['claim_count']}`",
        f"- Findings: `{summary['finding_count']}`",
        f"- Decision-grade findings: `{summary['decision_grade_finding_count']}`",
        "",
        "## Finding Counts",
        "",
    ]
    for kind in FINDING_KINDS:
        lines.append(f"- `{kind}`: `{by_kind.get(kind, 0)}`")
    lines.extend(["", "## Verdict", ""])
    if by_kind.get("conflict", 0):
        lines.append("Decision-grade conflicts are present. Review the cited claims and ontology constraints before using this document as aligned target architecture.")
    elif by_kind.get("deprecated-use", 0):
        lines.append("No construction conflicts were found, but deprecated target vocabulary needs review.")
    elif by_kind.get("ambiguous", 0):
        lines.append("No decision-grade conflicts were found. Ambiguous claims need review before declaring full alignment.")
    else:
        lines.append("No decision-grade semantic conflicts were found.")

    append_finding_section(lines, "Conflicts", compare.get("conflicts", []))
    append_finding_section(lines, "Deprecated Uses", compare.get("deprecated_uses", []))
    append_finding_section(lines, "Aligned Evidence", compare.get("aligned", []), limit=30)
    append_finding_section(lines, "Candidate New", compare.get("candidate_new", []), limit=25)
    append_finding_section(lines, "Ambiguous", compare.get("ambiguous", []), limit=25)
    append_finding_section(lines, "Informational", compare.get("informational", []), limit=25)
    append_finding_section(lines, "Outside Scope", compare.get("outside_scope", []), limit=25)
    return "\n".join(lines) + "\n"


def append_finding_section(lines: list[str], title: str, findings: list[dict[str, Any]], limit: int = 25) -> None:
    lines.extend(["", f"## {title}", ""])
    if not findings:
        lines.append("None.")
        return
    for item in findings[:limit]:
        target = f" `{item['entity_id']}`" if item.get("entity_id") else ""
        lines.append(
            f"- `{item['kind']}`{target} {item['document_path']}:{item['line_start']} "
            f"({item['polarity']}/{item['modality']}/{item['assertion_scope']}): {item['reason']} "
            f"Text: {item['text']}"
        )


def semantic_compare_turtle(compare: dict[str, Any]) -> str:
    lines = [
        "@prefix rawr: <https://rawr.dev/ontology/> .",
        "@prefix evidence: <https://rawr.dev/evidence/> .",
        "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
        "",
    ]
    for claim in compare.get("claims", []):
        node = iri_fragment(claim["id"])
        lines.append(f"evidence:{node} a rawr:EvidenceClaim ;")
        lines.append(f"  rdfs:label {turtle_literal(claim['text'])} ;")
        lines.append(f"  rawr:polarity {turtle_literal(claim['polarity'])} ;")
        lines.append(f"  rawr:modality {turtle_literal(claim['modality'])} ;")
        lines.append(f"  rawr:assertionScope {turtle_literal(claim['assertion_scope'])} .")
        lines.append("")
    for item in compare.get("findings", []):
        node = iri_fragment(item["id"])
        claim = iri_fragment(item["claim_id"])
        lines.append(f"evidence:{node} a rawr:ReviewFinding ;")
        lines.append(f"  rawr:findingKind {turtle_literal(item['kind'])} ;")
        lines.append(f"  rawr:derivedFrom evidence:{claim} ;")
        if item.get("entity_id"):
            lines.append(f"  rawr:resolvedTarget rawr:{iri_fragment(item['entity_id'])} ;")
        lines.append(f"  rawr:rule {turtle_literal(item.get('rule') or '')} .")
        lines.append("")
    return "\n".join(lines)


def build_semantic_indexes(graph: dict[str, Any], candidate_queue: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    indexes: dict[str, list[dict[str, Any]]] = {
        "canonical": [],
        "deprecated_terms": [],
        "prohibited_patterns": [],
        "candidates": [],
    }
    canonical_ids = {entity["id"] for entity in graph.get("canonical_view", {}).get("entities", [])}
    for entity in graph.get("entities", []):
        terms = item_terms(entity)
        row = {**entity, "_terms": terms}
        if entity.get("type") == "DeprecatedTerm" or entity.get("status") == "deprecated":
            indexes["deprecated_terms"].append(row)
        elif entity.get("type") == "ForbiddenPattern" or entity.get("status") == "forbidden":
            indexes["prohibited_patterns"].append(row)
        elif entity.get("id") in canonical_ids:
            indexes["canonical"].append(row)
    for candidate in candidate_queue.get("candidates", []):
        indexes["candidates"].append({**candidate, "_terms": candidate_terms(candidate)})
    return indexes


def resolve_line_terms(text: str, indexes: dict[str, list[dict[str, Any]]]) -> dict[str, list[dict[str, Any]]]:
    normalized = normalize_text(text)
    matches: dict[str, list[dict[str, Any]]] = {key: [] for key in indexes}
    for bucket, items in indexes.items():
        for item in items:
            if any(term_in_line(term, normalized) for term in item.get("_terms", [])):
                matches[bucket].append({key: value for key, value in item.items() if key != "_terms"})
    return {key: unique_by_id(value) for key, value in matches.items()}


def classify_claim_text(text: str, heading_path: list[str]) -> dict[str, str]:
    heading_text = " / ".join(heading_path)
    combined = f"{heading_text} {text}".strip()
    polarity = "unknown"
    if QUESTION_RE.search(text):
        polarity = "conditional"
    elif PROHIBITIVE_RE.search(combined):
        polarity = "prohibitive"
    elif NEGATIVE_RE.search(combined):
        polarity = "negative"
    elif CONDITIONAL_RE.search(combined):
        polarity = "conditional"
    elif PROPOSED_RE.search(combined) or NORMATIVE_RE.search(combined):
        polarity = "positive"

    modality = "unknown"
    if QUESTION_RE.search(text):
        modality = "unknown"
    elif HISTORICAL_RE.search(combined):
        modality = "historical"
    elif ILLUSTRATIVE_RE.search(combined):
        modality = "illustrative"
    elif polarity in {"negative", "prohibitive"}:
        modality = "rejected"
    elif PROPOSED_RE.search(combined):
        modality = "proposed"
    elif NORMATIVE_RE.search(combined):
        modality = "normative"
    elif polarity == "positive":
        modality = "descriptive"

    assertion_scope = "unknown"
    if QUESTION_RE.search(text):
        assertion_scope = "unknown"
    elif OUTSIDE_SCOPE_RE.search(combined):
        assertion_scope = "outside-scope"
    elif REPLACEMENT_RE.search(combined):
        assertion_scope = "migration-note"
    elif modality in {"historical", "illustrative"}:
        assertion_scope = "migration-note" if modality == "historical" else "example"
    elif re.search(r"\b(target architecture|create|add|introduce|adopt|should|must|canonical|do not|must not|there is no)\b", combined, re.I):
        assertion_scope = "target-architecture"
    elif polarity == "positive":
        assertion_scope = "current-state"

    return {
        "polarity": polarity,
        "modality": modality,
        "assertion_scope": assertion_scope,
        "authority_context": "comparison-document",
    }


def is_review_relevant_line(text: str) -> bool:
    return bool(NORMATIVE_RE.search(text) or PROPOSED_RE.search(text) or PROHIBITIVE_RE.search(text) or NEGATIVE_RE.search(text))


def item_terms(item: dict[str, Any]) -> list[str]:
    values = [item.get("id"), item.get("label"), item.get("definition"), *(item.get("aliases") or [])]
    constraint = item.get("constraint")
    if isinstance(constraint, dict):
        values.extend(constraint.get("terms") or [])
        values.extend(constraint.get("semantic_keys") or [])
    terms = []
    for value in values:
        text = normalize_text(str(value or ""))
        if text:
            terms.append(text)
        if value and "." in str(value):
            terms.append(normalize_text(str(value).split(".")[-1].replace("-", " ")))
    return sorted({term for term in terms if len(term) >= 4}, key=len, reverse=True)


def candidate_terms(item: dict[str, Any]) -> list[str]:
    values = [item.get("id"), item.get("label"), item.get("hook")]
    return sorted({normalize_text(str(value or "")) for value in values if len(normalize_text(str(value or ""))) >= 4}, key=len, reverse=True)


def first_label(matches: dict[str, list[dict[str, Any]]]) -> str | None:
    for bucket in ["prohibited_patterns", "deprecated_terms", "canonical", "candidates"]:
        if matches.get(bucket):
            item = matches[bucket][0]
            return item.get("label") or item.get("id")
    return None


def first_object_label(matches: dict[str, list[dict[str, Any]]]) -> str | None:
    labels = []
    for bucket in ["prohibited_patterns", "deprecated_terms", "canonical", "candidates"]:
        labels.extend(item.get("label") or item.get("id") for item in matches.get(bucket, []))
    return ", ".join(labels[:4]) if labels else None


def infer_claim_predicate(classification: dict[str, str], matches: dict[str, list[dict[str, Any]]]) -> str:
    if matches.get("prohibited_patterns"):
        if classification["polarity"] in {"negative", "prohibitive"}:
            return "rejects"
        return "asserts"
    if matches.get("deprecated_terms"):
        return "uses_term"
    if matches.get("candidates"):
        return "introduces"
    return "mentions"


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("`", "").strip().lower())


def term_in_line(term: str, normalized_line: str) -> bool:
    if not term or len(term) < 4:
        return False
    return re.search(rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", normalized_line) is not None


def unique_by_id(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result = []
    for item in items:
        item_id = item.get("id")
        if item_id and item_id not in seen:
            seen.add(item_id)
            result.append(item)
    return result


def stable_id(*parts: str) -> str:
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()[:16]
    prefix = parts[0] if parts else "item"
    return f"{prefix}.{digest}"


def load_fixture_expectations() -> dict[str, Any]:
    return json.loads(FIXTURE_EXPECTED.read_text(encoding="utf-8"))
