from __future__ import annotations

import re
import xml.sax.saxutils
from collections import Counter, defaultdict
from copy import deepcopy
from pathlib import Path
from typing import Any

import yaml

from .io import git_sha, mark_current, new_run_dir, read_json, rel, resolve_run, write_json
from .architecture_change_frame import build_architecture_change_frame_package, fixture_frame_document_path
from .core_config import CORE_CURRENT_FILES, CORE_GRAPH_FILENAMES, default_testing_plan
from .core_viewer import write_html_viewer
from .paths import (
    RAWR_CORE_CANDIDATE_QUEUE,
    RAWR_CORE_ONTOLOGY_CONTRACT,
    RAWR_CORE_ONTOLOGY_LAYERS,
    REPO_ROOT,
)
from .report_html import write_proposal_review_html, write_semantic_compare_report_html
from .semantica_adapter import export_semantica_ontology, semantica_status
from .semantica_graph import semantica_graph_probe
from .text_normalization import normalize_match_text, normalize_section_text, term_in_normalized_text
from .semantic_evidence import (
    compare_evidence_to_ontology,
    extract_evidence_claims,
    fixture_document_path,
    render_semantic_compare_report,
    render_semantica_capability_report,
    semantic_capability_probe,
    semantic_compare_turtle,
)

TESTING_PLAN = default_testing_plan()


def load_core_ontology() -> dict[str, Any]:
    contract = read_yaml(RAWR_CORE_ONTOLOGY_CONTRACT)
    layers = [read_yaml(path) for path in RAWR_CORE_ONTOLOGY_LAYERS]
    candidate_queue = read_yaml(RAWR_CORE_CANDIDATE_QUEUE)
    entities: list[dict[str, Any]] = []
    relations: list[dict[str, Any]] = []
    for layer in layers:
        entities.extend(deepcopy(layer.get("entities", [])))
        relations.extend(deepcopy(layer.get("relations", [])))
    return {
        "contract": contract,
        "layers": layers,
        "candidate_queue": candidate_queue,
        "entities": entities,
        "relations": relations,
    }


def validate_core_ontology() -> dict[str, Any]:
    ontology = load_core_ontology()
    return validate_loaded_core_ontology(ontology)


def build_core_ontology_run() -> Path:
    ontology = load_core_ontology()
    validation = validate_loaded_core_ontology(ontology)
    if validation["errors"]:
        run_dir = new_run_dir("core-invalid")
        write_json(run_dir / CORE_GRAPH_FILENAMES["validation_report"], validation)
        mark_current(run_dir, [CORE_GRAPH_FILENAMES["validation_report"]])
        raise RuntimeError(f"Core ontology validation failed with {len(validation['errors'])} errors")

    graph = build_graph_payload(ontology, validation)
    run_dir = new_run_dir("core")
    metadata = {
        "run_id": run_dir.name,
        "git_sha": git_sha(),
        "kind": "rawr-core-ontology",
        "source": rel(RAWR_CORE_ONTOLOGY_CONTRACT.parent),
        "semantica": semantica_status(),
    }
    write_json(run_dir / CORE_GRAPH_FILENAMES["metadata"], metadata)
    write_json(run_dir / CORE_GRAPH_FILENAMES["validation_report"], validation)
    write_json(run_dir / CORE_GRAPH_FILENAMES["canonical_graph"], graph["canonical_graph"])
    write_json(run_dir / CORE_GRAPH_FILENAMES["layered_graph"], graph["layered_graph"])
    write_json(run_dir / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
    write_json(run_dir / CORE_GRAPH_FILENAMES["summary"], graph["summary"])
    render_core_report(run_dir, graph, validation)
    mark_current(run_dir, CORE_CURRENT_FILES)
    return run_dir


def export_core_ontology(run: str | None = "latest") -> Path:
    run_dir = resolve_run(run)
    graph = read_json(run_dir / CORE_GRAPH_FILENAMES["layered_graph"])
    export_result = export_semantica_ontology(graph["entities"], graph["relations"], run_dir)
    write_json(run_dir / CORE_GRAPH_FILENAMES["semantica_export"], export_result)
    write_graphml(run_dir / CORE_GRAPH_FILENAMES["graphml"], graph["canonical_view"]["entities"], graph["canonical_view"]["relations"])
    mark_current(run_dir, CORE_CURRENT_FILES)
    return run_dir


def visualize_core_ontology(run: str | None = "latest") -> Path:
    run_dir = resolve_run(run)
    graph = read_json(run_dir / CORE_GRAPH_FILENAMES["layered_graph"])
    candidate_queue_path = run_dir / CORE_GRAPH_FILENAMES["candidate_queue"]
    document_diff_path = run_dir / CORE_GRAPH_FILENAMES["document_diff"]
    semantic_compare_path = run_dir / CORE_GRAPH_FILENAMES["semantic_compare"]
    doc_sweep_path = run_dir / CORE_GRAPH_FILENAMES["doc_sweep"]
    candidate_queue = read_json(candidate_queue_path) if candidate_queue_path.exists() else {}
    diff = read_json(semantic_compare_path) if semantic_compare_path.exists() else read_json(document_diff_path) if document_diff_path.exists() else {}
    if doc_sweep_path.exists():
        diff = {**diff, "sweep": read_json(doc_sweep_path)}
    write_html_viewer(run_dir / CORE_GRAPH_FILENAMES["viewer"], graph, candidate_queue, diff)
    mark_current(run_dir, CORE_CURRENT_FILES)
    return run_dir


def diff_document_against_core_ontology(document: Path, run: str | None = "latest") -> Path:
    run_dir = resolve_run(run)
    graph = read_json(run_dir / CORE_GRAPH_FILENAMES["layered_graph"])
    candidate_queue = read_json(run_dir / CORE_GRAPH_FILENAMES["candidate_queue"])
    diff = build_document_diff(document, graph, candidate_queue)
    write_json(run_dir / CORE_GRAPH_FILENAMES["document_diff"], diff)
    report = render_document_diff_report(diff)
    (run_dir / CORE_GRAPH_FILENAMES["document_diff_report"]).write_text(report, encoding="utf-8")
    mark_current(run_dir, CORE_CURRENT_FILES)
    return run_dir


def write_semantica_capability_report(run: str | None = "latest") -> Path:
    run_dir = resolve_run(run)
    report = semantic_capability_probe()
    write_json(run_dir / CORE_GRAPH_FILENAMES["semantic_capability"], report)
    (run_dir / CORE_GRAPH_FILENAMES["semantic_capability_report"]).write_text(
        render_semantica_capability_report(report),
        encoding="utf-8",
    )
    mark_current(run_dir, CORE_CURRENT_FILES)
    return run_dir


def extract_document_evidence(
    document: Path | None,
    run: str | None = "latest",
    *,
    fixture: bool = False,
    semantica_pilot: bool = False,
    extraction_mode: str = "deterministic",
    llm_provider: str = "openai",
    llm_model: str | None = None,
) -> Path:
    run_dir = resolve_run(run)
    graph = read_json(run_dir / CORE_GRAPH_FILENAMES["layered_graph"])
    candidate_queue = read_json(run_dir / CORE_GRAPH_FILENAMES["candidate_queue"])
    document_path = fixture_document_path() if fixture else document
    if document_path is None:
        document_path = TESTING_PLAN
    if not document_path.is_absolute():
        document_path = REPO_ROOT / document_path
    if not document_path.exists() and document_path.name == TESTING_PLAN.name and TESTING_PLAN.exists():
        document_path = TESTING_PLAN
    evidence = extract_evidence_claims(
        document_path,
        graph,
        candidate_queue,
        fixture=fixture,
        semantica_pilot_enabled=semantica_pilot,
        extraction_mode=extraction_mode,
        llm_provider=llm_provider,
        llm_model=llm_model,
    )
    write_json(run_dir / CORE_GRAPH_FILENAMES["evidence_claims_json"], evidence)
    chunks = [
        {
            "document": evidence["document"],
            "line_start": claim["line_start"],
            "line_end": claim["line_end"],
            "heading_path": claim["heading_path"],
            "text": claim["text"],
            "claim_id": claim["id"],
        }
        for claim in evidence["claims"]
    ]
    from .io import write_jsonl

    write_jsonl(run_dir / CORE_GRAPH_FILENAMES["document_chunks"], chunks)
    write_jsonl(run_dir / CORE_GRAPH_FILENAMES["evidence_claims"], evidence["claims"])
    write_json(run_dir / CORE_GRAPH_FILENAMES["suppressed_lines"], {"document": evidence["document"], "items": evidence.get("suppressed_lines", [])})
    mark_current(run_dir, CORE_CURRENT_FILES)
    return run_dir


def compare_document_evidence(
    document: Path | None,
    run: str | None = "latest",
    *,
    fixture: bool = False,
    semantica_pilot: bool = False,
    extraction_mode: str = "deterministic",
    llm_provider: str = "openai",
    llm_model: str | None = None,
) -> Path:
    run_dir = extract_document_evidence(
        document,
        run,
        fixture=fixture,
        semantica_pilot=semantica_pilot,
        extraction_mode=extraction_mode,
        llm_provider=llm_provider,
        llm_model=llm_model,
    )
    graph = read_json(run_dir / CORE_GRAPH_FILENAMES["layered_graph"])
    candidate_queue = read_json(run_dir / CORE_GRAPH_FILENAMES["candidate_queue"])
    evidence = read_json(run_dir / CORE_GRAPH_FILENAMES["evidence_claims_json"])
    compare = compare_evidence_to_ontology(evidence, graph, candidate_queue)
    write_json(run_dir / CORE_GRAPH_FILENAMES["resolved_evidence"], {"claims": compare["claims"], "findings": compare["findings"]})
    write_json(run_dir / CORE_GRAPH_FILENAMES["semantic_compare"], compare)
    (run_dir / CORE_GRAPH_FILENAMES["semantic_compare_report"]).write_text(render_semantic_compare_report(compare), encoding="utf-8")
    write_semantic_compare_report_html(run_dir / CORE_GRAPH_FILENAMES["semantic_compare_report_html"], compare)
    (run_dir / CORE_GRAPH_FILENAMES["semantic_evidence_ttl"]).write_text(semantic_compare_turtle(compare), encoding="utf-8")
    mark_current(run_dir, CORE_CURRENT_FILES)
    return run_dir


def write_architecture_change_frame(
    document: Path | None,
    run: str | None = "latest",
    *,
    fixture: bool = False,
    semantica_pilot: bool = False,
    extraction_mode: str = "deterministic",
    llm_provider: str = "openai",
    llm_model: str | None = None,
    reference_bundle: Path | None = None,
) -> Path:
    return write_architecture_proposal_package(
        document,
        run,
        fixture=fixture,
        semantica_pilot=semantica_pilot,
        extraction_mode=extraction_mode,
        llm_provider=llm_provider,
        llm_model=llm_model,
        reference_bundle=reference_bundle,
        evaluate=False,
    )


def compare_architecture_proposal(
    document: Path | None,
    run: str | None = "latest",
    *,
    fixture: bool = False,
    semantica_pilot: bool = False,
    extraction_mode: str = "deterministic",
    llm_provider: str = "openai",
    llm_model: str | None = None,
    reference_bundle: Path | None = None,
) -> Path:
    return write_architecture_proposal_package(
        document,
        run,
        fixture=fixture,
        semantica_pilot=semantica_pilot,
        extraction_mode=extraction_mode,
        llm_provider=llm_provider,
        llm_model=llm_model,
        reference_bundle=reference_bundle,
        evaluate=True,
    )


def write_architecture_proposal_package(
    document: Path | None,
    run: str | None,
    *,
    fixture: bool,
    semantica_pilot: bool,
    extraction_mode: str,
    llm_provider: str,
    llm_model: str | None,
    reference_bundle: Path | None,
    evaluate: bool,
) -> Path:
    run_dir = resolve_run(run)
    graph = read_json(run_dir / CORE_GRAPH_FILENAMES["layered_graph"])
    candidate_queue = read_json(run_dir / CORE_GRAPH_FILENAMES["candidate_queue"])
    document_path = fixture_frame_document_path() if fixture else document
    if document_path is None:
        document_path = TESTING_PLAN
    if not document_path.is_absolute():
        document_path = REPO_ROOT / document_path
    package = build_architecture_change_frame_package(
        document_path,
        graph,
        candidate_queue,
        fixture=fixture,
        semantica_pilot_enabled=semantica_pilot,
        extraction_mode=extraction_mode,
        llm_provider=llm_provider,
        llm_model=llm_model,
        evaluate=evaluate,
        reference_bundle=reference_bundle,
    )
    write_json(run_dir / CORE_GRAPH_FILENAMES["evidence_claims_json"], package["evidence"])
    write_json(run_dir / CORE_GRAPH_FILENAMES["semantic_compare"], package["semantic_compare"])
    (run_dir / CORE_GRAPH_FILENAMES["semantic_compare_report"]).write_text(render_semantic_compare_report(package["semantic_compare"]), encoding="utf-8")
    write_semantic_compare_report_html(run_dir / CORE_GRAPH_FILENAMES["semantic_compare_report_html"], package["semantic_compare"])
    (run_dir / CORE_GRAPH_FILENAMES["semantic_evidence_ttl"]).write_text(semantic_compare_turtle(package["semantic_compare"]), encoding="utf-8")
    write_json(run_dir / CORE_GRAPH_FILENAMES["architecture_change_frame"], package["frame"])
    write_json(run_dir / CORE_GRAPH_FILENAMES["architecture_change_frame_validation"], package["validation"])
    write_json(run_dir / CORE_GRAPH_FILENAMES["noun_mappings"], package["noun_mappings"])
    (run_dir / CORE_GRAPH_FILENAMES["proposal_graph_ttl"]).write_text(package["proposal_graph_ttl"], encoding="utf-8")
    write_json(run_dir / CORE_GRAPH_FILENAMES["claim_comparisons"], package["claim_comparisons"])
    write_json(run_dir / CORE_GRAPH_FILENAMES["verdict_repair"], package["verdict_repair"])
    (run_dir / CORE_GRAPH_FILENAMES["proposal_review_report"]).write_text(package["review_report"], encoding="utf-8")
    write_proposal_review_html(run_dir / CORE_GRAPH_FILENAMES["proposal_review_report_html"], package)
    write_json(run_dir / CORE_GRAPH_FILENAMES["proposal_provenance"], package["provenance"])
    mark_current(run_dir, CORE_CURRENT_FILES)
    return run_dir


def read_yaml(path: Path) -> dict[str, Any]:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def validate_loaded_core_ontology(ontology: dict[str, Any]) -> dict[str, Any]:
    contract = ontology["contract"]
    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    allowed_layers = {item["id"] for item in contract["layers"]}
    allowed_statuses = {item["id"] for item in contract["statuses"]}
    allowed_types = {item["id"] for item in contract["entity_types"]}
    allowed_predicates = {item["id"] for item in contract["predicates"]}
    canonical_statuses = set(contract["canonical_view_statuses"])
    canonical_excluded_types = set(contract.get("canonical_graph_excluded_types", []))
    candidate_statuses = set(contract["candidate_statuses"])

    validate_contract_shape(contract, errors, warnings)
    validate_no_cloud_filecite_markers(ontology, errors)

    entities = ontology["entities"]
    relations = ontology["relations"]
    entity_ids: dict[str, dict[str, Any]] = {}
    source_refs: list[dict[str, Any]] = []
    candidate_queue_ids = {item.get("id") for item in ontology["candidate_queue"].get("candidates", []) if item.get("id")}
    exclusion_ids = {item.get("id") for item in ontology["candidate_queue"].get("exclusions", []) if item.get("id")}

    for layer in ontology["layers"]:
        declared_layer = layer.get("layer")
        if declared_layer not in allowed_layers:
            errors.append({"kind": "unknown_layer_file", "layer": declared_layer, "layer_id": layer.get("id")})
        for entity in layer.get("entities", []):
            if entity.get("layer") != declared_layer:
                errors.append({"kind": "entity_layer_mismatch", "id": entity.get("id"), "layer": entity.get("layer"), "file_layer": declared_layer})
        for relation in layer.get("relations", []):
            if relation.get("layer") != declared_layer:
                errors.append({"kind": "relation_layer_mismatch", "id": relation.get("id"), "layer": relation.get("layer"), "file_layer": declared_layer})

    for entity in entities:
        entity_id = entity.get("id")
        if not entity_id:
            errors.append({"kind": "entity_missing_id", "entity": entity})
            continue
        if entity_id in entity_ids:
            errors.append({"kind": "duplicate_entity_id", "id": entity_id})
        entity_ids[entity_id] = entity
        if entity.get("type") not in allowed_types:
            errors.append({"kind": "unknown_entity_type", "id": entity_id, "type": entity.get("type")})
        if entity.get("layer") not in allowed_layers:
            errors.append({"kind": "unknown_entity_layer", "id": entity_id, "layer": entity.get("layer")})
        if entity.get("status") not in allowed_statuses:
            errors.append({"kind": "unknown_entity_status", "id": entity_id, "status": entity.get("status")})
        if entity_id in candidate_queue_ids:
            errors.append({"kind": "candidate_queue_entity_leaked_into_layer", "id": entity_id})
        if entity_id in exclusion_ids:
            errors.append({"kind": "exclusion_leaked_into_layer", "id": entity_id})
        if entity_id.startswith("authority.doc.") and entity.get("type") != "DocumentAuthority":
            errors.append({"kind": "authority_document_wrong_type", "id": entity_id, "type": entity.get("type")})
        if entity.get("type") == "DocumentAuthority" and entity.get("layer") != "authority-and-document-overlay":
            errors.append({"kind": "authority_document_wrong_layer", "id": entity_id, "layer": entity.get("layer")})
        if entity.get("type") == "ForbiddenPattern":
            constraint = entity.get("constraint")
            if not isinstance(constraint, dict) or not constraint.get("kind") or not constraint.get("prohibited_action"):
                errors.append({"kind": "forbidden_pattern_missing_structured_constraint", "id": entity_id})
            elif not (constraint.get("terms") or constraint.get("semantic_keys")):
                errors.append({"kind": "forbidden_pattern_missing_constraint_terms", "id": entity_id})
        refs = entity.get("source_refs", [])
        if entity.get("status") in canonical_statuses and not refs:
            errors.append({"kind": "canonical_entity_missing_source_refs", "id": entity_id})
        if entity.get("status") in canonical_statuses and not entity.get("operational_consequence"):
            errors.append({"kind": "canonical_entity_missing_operational_consequence", "id": entity_id})
        classifier_readiness = entity.get("classifier_readiness")
        if classifier_readiness:
            readiness_status = classifier_readiness.get("status")
            if readiness_status not in allowed_statuses:
                errors.append({"kind": "unknown_classifier_readiness_status", "id": entity_id, "status": readiness_status})
        source_refs.extend(
            validate_source_refs(
                refs,
                errors,
                warnings,
                owner_kind="entity",
                owner_id=entity_id,
                owner_status=entity.get("status"),
                strict_statuses=canonical_statuses,
            )
        )

    relation_ids: set[str] = set()
    for relation in relations:
        relation_id = relation.get("id")
        if not relation_id:
            errors.append({"kind": "relation_missing_id", "relation": relation})
            continue
        if relation_id in relation_ids:
            errors.append({"kind": "duplicate_relation_id", "id": relation_id})
        relation_ids.add(relation_id)
        predicate = relation.get("predicate")
        if predicate not in allowed_predicates:
            errors.append({"kind": "unknown_relation_predicate", "id": relation_id, "predicate": predicate})
        else:
            validate_relation_signature(relation, entity_ids, contract["predicates"], errors)
        subject = entity_ids.get(relation.get("subject"))
        object_ = entity_ids.get(relation.get("object"))
        if subject is None:
            errors.append({"kind": "unresolved_relation_subject", "id": relation_id, "subject": relation.get("subject")})
        if object_ is None:
            errors.append({"kind": "unresolved_relation_object", "id": relation_id, "object": relation.get("object")})
        if relation.get("status") in canonical_statuses:
            if subject and subject.get("status") not in canonical_statuses:
                errors.append(
                    {
                        "kind": "canonical_relation_noncanonical_subject",
                        "id": relation_id,
                        "subject": relation.get("subject"),
                        "subject_status": subject.get("status"),
                    }
                )
            if object_ and object_.get("status") not in canonical_statuses:
                errors.append(
                    {
                        "kind": "canonical_relation_noncanonical_object",
                        "id": relation_id,
                        "object": relation.get("object"),
                        "object_status": object_.get("status"),
                    }
                )
        if relation.get("layer") not in allowed_layers:
            errors.append({"kind": "unknown_relation_layer", "id": relation_id, "layer": relation.get("layer")})
        if relation.get("status") not in allowed_statuses:
            errors.append({"kind": "unknown_relation_status", "id": relation_id, "status": relation.get("status")})
        refs = relation.get("source_refs", [])
        if relation.get("status") in canonical_statuses and not refs:
            errors.append({"kind": "canonical_relation_missing_source_refs", "id": relation_id})
        if relation.get("status") in canonical_statuses and not relation.get("operational_consequence"):
            errors.append({"kind": "canonical_relation_missing_operational_consequence", "id": relation_id})
        source_refs.extend(
            validate_source_refs(
                refs,
                errors,
                warnings,
                owner_kind="relation",
                owner_id=relation_id,
                owner_status=relation.get("status"),
                strict_statuses=canonical_statuses,
            )
        )

    for candidate in ontology["candidate_queue"].get("candidates", []):
        candidate_id = candidate.get("id")
        if not candidate_id:
            errors.append({"kind": "candidate_missing_id", "candidate": candidate})
        if candidate_id in entity_ids:
            errors.append({"kind": "candidate_id_collides_with_entity", "id": candidate_id})
        candidate_status = candidate.get("status", "candidate")
        if candidate_status not in candidate_statuses:
            errors.append({"kind": "candidate_invalid_status", "id": candidate_id, "status": candidate_status})
        source_refs.extend(
            validate_source_refs(
                candidate.get("source_span_suggests_it", []),
                errors,
                warnings,
                owner_kind="candidate",
                owner_id=candidate_id or "",
                owner_status=candidate_status,
                strict_statuses=canonical_statuses,
            )
        )
    for exclusion in ontology["candidate_queue"].get("exclusions", []):
        exclusion_id = exclusion.get("id")
        if not exclusion_id:
            errors.append({"kind": "exclusion_missing_id", "exclusion": exclusion})
        if exclusion_id in entity_ids:
            errors.append({"kind": "exclusion_id_collides_with_entity", "id": exclusion_id})
        source_refs.extend(
            validate_source_refs(
                exclusion.get("source_refs", []),
                errors,
                warnings,
                owner_kind="exclusion",
                owner_id=exclusion_id or "",
                owner_status=exclusion.get("status", "evidence-only"),
                strict_statuses=canonical_statuses,
            )
        )

    canonical_entities = [
        entity
        for entity in entities
        if entity.get("status") in canonical_statuses
        and entity.get("type") not in canonical_excluded_types
    ]
    canonical_entity_ids = {entity["id"] for entity in canonical_entities}
    canonical_relations = [
        relation
        for relation in relations
        if relation.get("status") in canonical_statuses
        and relation.get("subject") in canonical_entity_ids
        and relation.get("object") in canonical_entity_ids
    ]
    leaked = [
        item["id"]
        for item in canonical_entities + canonical_relations
        if item.get("status") in candidate_statuses
    ]
    if leaked:
        errors.append({"kind": "candidate_status_in_canonical_view", "ids": leaked})
    leaked_ids = canonical_entity_ids & (candidate_queue_ids | exclusion_ids)
    if leaked_ids:
        errors.append({"kind": "candidate_or_exclusion_id_in_canonical_view", "ids": sorted(leaked_ids)})

    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "summary": {
            "entity_count": len(entities),
            "relation_count": len(relations),
            "canonical_entity_count": len(canonical_entities),
            "canonical_relation_count": len(canonical_relations),
            "candidate_count": len(ontology["candidate_queue"].get("candidates", [])),
            "exclusion_count": len(ontology["candidate_queue"].get("exclusions", [])),
            "source_ref_count": len(source_refs),
            "resolved_source_ref_count": sum(1 for ref in source_refs if ref.get("resolved")),
            "error_count": len(errors),
            "warning_count": len(warnings),
        },
    }


def predicate_tokens(value: str) -> list[str]:
    return [token.strip() for token in str(value).split("|") if token.strip()]


def validate_contract_shape(contract: dict[str, Any], errors: list[dict[str, Any]], warnings: list[dict[str, Any]]) -> None:
    allowed_types = {item["id"] for item in contract.get("entity_types", [])}
    allowed_layers = {item["id"] for item in contract.get("layers", [])}
    allowed_statuses = {item["id"] for item in contract.get("statuses", [])}
    predicate_ids: set[str] = set()
    for collection_name in ["layers", "statuses", "entity_types", "predicates"]:
        seen: set[str] = set()
        for item in contract.get(collection_name, []):
            item_id = item.get("id")
            if not item_id:
                errors.append({"kind": "contract_item_missing_id", "collection": collection_name})
            elif item_id in seen:
                errors.append({"kind": "contract_duplicate_id", "collection": collection_name, "id": item_id})
            seen.add(item_id)
    for status in contract.get("canonical_view_statuses", []):
        if status not in allowed_statuses:
            errors.append({"kind": "contract_unknown_canonical_status", "status": status})
    for status in contract.get("candidate_statuses", []):
        if status not in allowed_statuses:
            errors.append({"kind": "contract_unknown_candidate_status", "status": status})
    for entity_type in contract.get("entity_types", []):
        if entity_type.get("layer") not in allowed_layers:
            errors.append({"kind": "contract_unknown_entity_type_layer", "id": entity_type.get("id"), "layer": entity_type.get("layer")})
    for predicate in contract.get("predicates", []):
        predicate_id = predicate.get("id")
        predicate_ids.add(str(predicate_id))
        for field in ["domain", "range"]:
            for token in predicate_tokens(predicate.get(field, "")):
                if token not in allowed_types:
                    warnings.append(
                        {
                            "kind": "predicate_signature_unknown_type",
                            "predicate": predicate_id,
                            "field": field,
                            "type": token,
                        }
                    )
    if "mentions" in predicate_ids:
        errors.append({"kind": "contract_forbidden_decision_predicate", "predicate": "mentions"})


def validate_no_cloud_filecite_markers(ontology: dict[str, Any], errors: list[dict[str, Any]]) -> None:
    for path, value in walk_values(ontology):
        if isinstance(value, str) and "filecite" in value:
            errors.append({"kind": "cloudpro_filecite_marker_in_machine_ontology", "path": path})


def walk_values(value: Any, prefix: str = "$") -> list[tuple[str, Any]]:
    if isinstance(value, dict):
        rows: list[tuple[str, Any]] = []
        for key, child in value.items():
            rows.extend(walk_values(child, f"{prefix}.{key}"))
        return rows
    if isinstance(value, list):
        rows = []
        for index, child in enumerate(value):
            rows.extend(walk_values(child, f"{prefix}[{index}]"))
        return rows
    return [(prefix, value)]


def validate_relation_signature(
    relation: dict[str, Any], entities_by_id: dict[str, dict[str, Any]], predicates: list[dict[str, Any]], errors: list[dict[str, Any]]
) -> None:
    predicate = next((item for item in predicates if item["id"] == relation.get("predicate")), None)
    if predicate is None:
        return
    subject = entities_by_id.get(relation.get("subject"))
    obj = entities_by_id.get(relation.get("object"))
    if subject and subject.get("type") not in predicate_tokens(predicate.get("domain", "")):
        errors.append(
            {
                "kind": "relation_subject_type_outside_domain",
                "id": relation.get("id"),
                "predicate": relation.get("predicate"),
                "subject": relation.get("subject"),
                "subject_type": subject.get("type"),
                "domain": predicate.get("domain"),
            }
        )
    if obj and obj.get("type") not in predicate_tokens(predicate.get("range", "")):
        errors.append(
            {
                "kind": "relation_object_type_outside_range",
                "id": relation.get("id"),
                "predicate": relation.get("predicate"),
                "object": relation.get("object"),
                "object_type": obj.get("type"),
                "range": predicate.get("range"),
            }
        )


def validate_source_refs(
    refs: list[dict[str, Any]],
    errors: list[dict[str, Any]],
    warnings: list[dict[str, Any]],
    owner_kind: str,
    owner_id: str,
    owner_status: str | None = None,
    strict_statuses: set[str] | None = None,
) -> list[dict[str, Any]]:
    resolved_refs: list[dict[str, Any]] = []
    strict = bool(strict_statuses and owner_status in strict_statuses)
    if refs is None:
        return resolved_refs
    if not isinstance(refs, list):
        errors.append({"kind": "source_refs_not_list", "owner_kind": owner_kind, "owner_id": owner_id})
        return resolved_refs
    for ref in refs or []:
        if not isinstance(ref, dict):
            errors.append({"kind": "source_ref_not_mapping", "owner_kind": owner_kind, "owner_id": owner_id, "ref": ref})
            continue
        enriched = resolve_source_ref(ref)
        enriched.update({"owner_kind": owner_kind, "owner_id": owner_id})
        path_value = str(ref.get("path", ""))
        if not path_value:
            errors.append({"kind": "source_ref_missing_path", "owner_kind": owner_kind, "owner_id": owner_id})
        elif Path(path_value).is_absolute():
            issue = {"kind": "source_ref_not_repo_relative", "owner_kind": owner_kind, "owner_id": owner_id, "path": path_value}
            if strict:
                errors.append(issue)
            else:
                warnings.append(issue)
        if strict and not ref.get("section"):
            errors.append({"kind": "locked_source_ref_missing_section", "owner_kind": owner_kind, "owner_id": owner_id, "path": path_value})
        if not enriched["exists"]:
            issue = {"kind": "source_ref_missing_file", "owner_kind": owner_kind, "owner_id": owner_id, "path": ref.get("path")}
            if strict:
                errors.append(issue)
            else:
                warnings.append(issue)
        elif not enriched["resolved"]:
            issue = {
                "kind": "source_ref_unresolved_section",
                "owner_kind": owner_kind,
                "owner_id": owner_id,
                "path": ref.get("path"),
                "section": ref.get("section"),
            }
            if strict:
                errors.append(issue)
            else:
                warnings.append(issue)
        resolved_refs.append(enriched)
    return resolved_refs


def resolve_source_ref(ref: dict[str, Any]) -> dict[str, Any]:
    path_value = str(ref.get("path", ""))
    path = Path(path_value)
    if not path.is_absolute():
        path = REPO_ROOT / path
    enriched = dict(ref)
    enriched["exists"] = path.exists()
    enriched["resolved"] = False
    if not path.exists() or not ref.get("section"):
        return enriched
    line_start, line_end = resolve_section_span(path, str(ref.get("section", "")))
    if line_start:
        enriched["line_start"] = line_start
        enriched["line_end"] = line_end
        enriched["resolved"] = True
    return enriched


def resolve_section_span(path: Path, section: str) -> tuple[int | None, int | None]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except UnicodeDecodeError:
        return None, None
    needles = [part.strip() for part in re.split(r";|,", section) if part.strip()]
    if not needles:
        needles = [section.strip()]
    for needle in needles:
        normalized = normalize_section_text(needle)
        for index, line in enumerate(lines, start=1):
            if line.lstrip().startswith("#") and normalized in normalize_section_text(line.lstrip("# ")):
                return index, section_end(lines, index)
        for index, line in enumerate(lines, start=1):
            if normalized and normalized in normalize_section_text(line):
                return index, index
    return None, None


def section_end(lines: list[str], line_start: int) -> int:
    current = lines[line_start - 1]
    level = len(current) - len(current.lstrip("#"))
    for index in range(line_start + 1, len(lines) + 1):
        line = lines[index - 1]
        if line.lstrip().startswith("#"):
            next_level = len(line) - len(line.lstrip("#"))
            if next_level <= level:
                return index - 1
    return len(lines)


def build_graph_payload(ontology: dict[str, Any], validation: dict[str, Any]) -> dict[str, Any]:
    contract = ontology["contract"]
    canonical_statuses = set(contract["canonical_view_statuses"])
    canonical_excluded_types = set(contract.get("canonical_graph_excluded_types", []))
    target_statuses = set(contract.get("target_architecture_view_statuses", ["locked"]))
    target_excluded_types = set(contract.get("target_architecture_excluded_types", []))
    entities = [enrich_item_source_refs(entity) for entity in ontology["entities"]]
    relations = [enrich_item_source_refs(relation) for relation in ontology["relations"]]
    entities_by_id = {entity["id"]: entity for entity in entities}
    canonical_entities = [
        entity
        for entity in entities
        if entity["status"] in canonical_statuses
        and entity.get("type") not in canonical_excluded_types
    ]
    canonical_entity_ids = {entity["id"] for entity in canonical_entities}
    canonical_relations = [
        relation
        for relation in relations
        if relation["status"] in canonical_statuses
        and relation["subject"] in canonical_entity_ids
        and relation["object"] in canonical_entity_ids
    ]
    target_entities = [
        entity
        for entity in entities
        if entity["status"] in target_statuses
        and entity.get("type") not in target_excluded_types
    ]
    target_entity_ids = {entity["id"] for entity in target_entities}
    target_relations = [
        relation
        for relation in relations
        if relation["status"] in target_statuses
        and relation["subject"] in target_entity_ids
        and relation["object"] in target_entity_ids
    ]
    by_layer = defaultdict(lambda: {"entities": [], "relations": []})
    for entity in entities:
        by_layer[entity["layer"]]["entities"].append(entity)
    for relation in relations:
        by_layer[relation["layer"]]["relations"].append(relation)
    summary = {
        **validation["summary"],
        "entity_counts_by_layer": dict(Counter(entity["layer"] for entity in entities)),
        "entity_counts_by_status": dict(Counter(entity["status"] for entity in entities)),
        "entity_counts_by_type": dict(Counter(entity["type"] for entity in entities)),
        "relation_counts_by_layer": dict(Counter(relation["layer"] for relation in relations)),
        "relation_counts_by_status": dict(Counter(relation["status"] for relation in relations)),
        "relation_counts_by_predicate": dict(Counter(relation["predicate"] for relation in relations)),
    }
    candidate_queue = {
        **ontology["candidate_queue"],
        "candidates": [enrich_candidate_source_refs(item) for item in ontology["candidate_queue"].get("candidates", [])],
        "exclusions": [enrich_item_source_refs(item) for item in ontology["candidate_queue"].get("exclusions", [])],
    }
    return {
        "summary": summary,
        "canonical_graph": {
            "id": "rawr-core-architecture-canonical-view",
            "entities": sorted(canonical_entities, key=lambda item: item["id"]),
            "relations": sorted(canonical_relations, key=lambda item: item["id"]),
            "summary": {
                "entity_count": len(canonical_entities),
                "relation_count": len(canonical_relations),
            },
        },
        "layered_graph": {
            "id": "rawr-core-architecture-layered-graph",
            "entities": sorted(entities, key=lambda item: item["id"]),
            "relations": sorted(relations, key=lambda item: item["id"]),
            "canonical_view": {
                "entities": sorted(canonical_entities, key=lambda item: item["id"]),
                "relations": sorted(canonical_relations, key=lambda item: item["id"]),
            },
            "target_architecture_view": {
                "entities": sorted(target_entities, key=lambda item: item["id"]),
                "relations": sorted(target_relations, key=lambda item: item["id"]),
            },
            "constraint_overlay": {
                "entities": sorted(
                    [entity for entity in entities if entity.get("type") == "ForbiddenPattern"],
                    key=lambda item: item["id"],
                ),
                "relations": sorted(
                    [relation for relation in relations if relation.get("predicate") in {"forbids", "forbids_move"}],
                    key=lambda item: item["id"],
                ),
            },
            "vocabulary_overlay": {
                "entities": sorted(
                    [entity for entity in entities if entity.get("type") == "DeprecatedTerm" or entity.get("status") == "deprecated"],
                    key=lambda item: item["id"],
                ),
                "relations": sorted(
                    [relation for relation in relations if relation.get("predicate") in {"deprecates", "replaces"}],
                    key=lambda item: item["id"],
                ),
            },
            "layers": {layer: value for layer, value in sorted(by_layer.items())},
            "summary": summary,
        },
        "candidate_queue": candidate_queue,
        "semantica_graph": semantica_graph_probe(
            {
                "entities": sorted(entities, key=lambda item: item["id"]),
                "relations": sorted(relations, key=lambda item: item["id"]),
                "target_architecture_view": {
                    "entities": sorted(target_entities, key=lambda item: item["id"]),
                    "relations": sorted(target_relations, key=lambda item: item["id"]),
                },
            },
            candidate_queue,
            {predicate["id"] for predicate in contract.get("predicates", [])},
        ),
        "entities_by_id": entities_by_id,
    }


def enrich_item_source_refs(item: dict[str, Any]) -> dict[str, Any]:
    enriched = deepcopy(item)
    if "source_refs" in enriched:
        enriched["source_refs"] = [resolve_source_ref(ref) for ref in enriched.get("source_refs", [])]
    return enriched


def enrich_candidate_source_refs(item: dict[str, Any]) -> dict[str, Any]:
    enriched = deepcopy(item)
    if "source_span_suggests_it" in enriched:
        enriched["source_span_suggests_it"] = [resolve_source_ref(ref) for ref in enriched.get("source_span_suggests_it", [])]
    return enriched


def render_core_report(run_dir: Path, graph: dict[str, Any], validation: dict[str, Any]) -> None:
    summary = graph["summary"]
    lines = [
        "# RAWR Core Ontology Graph Report",
        "",
        f"- Run: `{run_dir.name}`",
        f"- Valid: `{validation['valid']}`",
        f"- Entities: `{summary['entity_count']}`",
        f"- Relations: `{summary['relation_count']}`",
        f"- Canonical entities: `{summary['canonical_entity_count']}`",
        f"- Canonical relations: `{summary['canonical_relation_count']}`",
        f"- Candidates: `{summary['candidate_count']}`",
        f"- Exclusions: `{summary['exclusion_count']}`",
        "",
        "## Layer Counts",
        "",
        table(summary["entity_counts_by_layer"], "Layer", "Entities"),
        "",
        "## Status Counts",
        "",
        table(summary["entity_counts_by_status"], "Status", "Entities"),
        "",
        "## Predicate Counts",
        "",
        table(summary["relation_counts_by_predicate"], "Predicate", "Relations"),
        "",
        "## Validation",
        "",
        f"- Errors: `{len(validation['errors'])}`",
        f"- Warnings: `{len(validation['warnings'])}`",
    ]
    if validation["errors"]:
        lines.extend(["", "### Errors", ""])
        lines.extend(f"- `{item['kind']}`: `{item}`" for item in validation["errors"][:25])
    if validation["warnings"]:
        lines.extend(["", "### Warnings", ""])
        lines.extend(f"- `{item['kind']}`: `{item}`" for item in validation["warnings"][:25])
    (run_dir / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def table(counts: dict[str, int], left: str, right: str) -> str:
    lines = [f"| {left} | {right} |", "| --- | ---: |"]
    for key, value in sorted(counts.items()):
        lines.append(f"| `{key}` | {value} |")
    return "\n".join(lines)


def write_graphml(path: Path, entities: list[dict[str, Any]], relations: list[dict[str, Any]]) -> None:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
        '  <key id="label" for="node" attr.name="label" attr.type="string"/>',
        '  <key id="type" for="node" attr.name="type" attr.type="string"/>',
        '  <key id="layer" for="node" attr.name="layer" attr.type="string"/>',
        '  <key id="predicate" for="edge" attr.name="predicate" attr.type="string"/>',
        '  <graph id="rawr-core-architecture" edgedefault="directed">',
    ]
    for entity in entities:
        node_id = xml.sax.saxutils.escape(entity["id"])
        label = xml.sax.saxutils.escape(str(entity.get("label") or entity["id"]))
        entity_type = xml.sax.saxutils.escape(str(entity.get("type", "")))
        layer = xml.sax.saxutils.escape(str(entity.get("layer", "")))
        lines.extend(
            [
                f'    <node id="{node_id}">',
                f'      <data key="label">{label}</data>',
                f'      <data key="type">{entity_type}</data>',
                f'      <data key="layer">{layer}</data>',
                "    </node>",
            ]
        )
    for relation in relations:
        edge_id = xml.sax.saxutils.escape(relation["id"])
        source = xml.sax.saxutils.escape(relation["subject"])
        target = xml.sax.saxutils.escape(relation["object"])
        predicate = xml.sax.saxutils.escape(relation["predicate"])
        lines.extend(
            [
                f'    <edge id="{edge_id}" source="{source}" target="{target}">',
                f'      <data key="predicate">{predicate}</data>',
                "    </edge>",
            ]
        )
    lines.extend(["  </graph>", "</graphml>"])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_document_diff(document: Path, graph: dict[str, Any], candidate_queue: dict[str, Any]) -> dict[str, Any]:
    if not document.is_absolute():
        document = REPO_ROOT / document
    lines = document.read_text(encoding="utf-8").splitlines()
    entities = graph["canonical_view"]["entities"]
    relations = graph["canonical_view"]["relations"]
    term_index = build_term_index(entities)
    candidate_index = build_candidate_index(candidate_queue.get("candidates", []))
    forbidden_terms = [entity for entity in entities if entity.get("status") == "forbidden"]
    gates = [entity for entity in entities if entity.get("type") == "ValidationGate"]

    aligned: list[dict[str, Any]] = []
    stale: list[dict[str, Any]] = []
    candidate_new: list[dict[str, Any]] = []
    review_needed: list[dict[str, Any]] = []
    mentioned_gate_ids: set[str] = set()

    for number, line in enumerate(lines, start=1):
        normalized = normalize_text(line)
        if not normalized:
            continue
        matched_entities = []
        for term, entity in term_index.items():
            if term_in_line(term, normalized):
                matched_entities.append(entity)
        for entity in unique_by_id(matched_entities):
            finding = document_finding("aligned", document, number, line, entity_id=entity["id"], label=entity.get("label", entity["id"]))
            aligned.append(finding)
            if entity.get("type") == "ValidationGate":
                mentioned_gate_ids.add(entity["id"])
        for entity in forbidden_terms:
            for term in entity_terms(entity):
                if term_in_line(term, normalized):
                    stale.append(document_finding("stale", document, number, line, entity_id=entity["id"], label=entity.get("label", entity["id"])))
                    break
        for term, candidate in candidate_index.items():
            if term_in_line(term, normalized):
                candidate_new.append(document_finding("candidate-new", document, number, line, entity_id=candidate["id"], label=candidate.get("label", candidate["id"])))
        if (
            re.search(r"\b(MUST|must|SHOULD|should|canonical|invariant|prove|proof|gate|ratchet)\b", line)
            and not matched_entities
            and not is_generic_normative_scaffold(line)
        ):
            review_needed.append(document_finding("review-needed", document, number, line, reason="normative testing claim did not resolve to ontology entity"))

    underrepresented_gates = [
        {
            "kind": "review-needed",
            "entity_id": gate["id"],
            "label": gate.get("label", gate["id"]),
            "reason": "validation gate not directly represented in testing plan terminology",
            "source_refs": gate.get("source_refs", []),
        }
        for gate in gates
        if gate["id"] not in mentioned_gate_ids
    ]

    return {
        "document": rel(document),
        "ontology_graph": graph["id"],
        "summary": {
            "aligned_count": len(aligned),
            "stale_count": len(stale),
            "candidate_new_count": len(candidate_new),
            "review_needed_count": len(review_needed),
            "underrepresented_gate_count": len(underrepresented_gates),
            "mentioned_gate_count": len(mentioned_gate_ids),
            "relation_count": len(relations),
        },
        "aligned": aligned[:80],
        "stale": stale[:80],
        "candidate_new": candidate_new[:80],
        "review_needed": review_needed[:80],
        "underrepresented_gates": underrepresented_gates,
    }


def build_term_index(entities: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    for entity in entities:
        for term in entity_terms(entity):
            if len(term) >= 4:
                index.setdefault(term, entity)
    return index


def build_candidate_index(candidates: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    for candidate in candidates:
        for value in [candidate.get("label"), candidate.get("hook")]:
            term = normalize_text(str(value or ""))
            if len(term) >= 4:
                index.setdefault(term, candidate)
    return index


def entity_terms(entity: dict[str, Any]) -> list[str]:
    values = [entity.get("id"), entity.get("label"), *(entity.get("aliases") or [])]
    terms = []
    for value in values:
        text = normalize_text(str(value or ""))
        if not text:
            continue
        terms.append(text)
        if "." in str(value):
            terms.append(normalize_text(str(value).split(".")[-1].replace("-", " ")))
    return sorted(set(terms), key=len, reverse=True)


def unique_by_id(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result: list[dict[str, Any]] = []
    for item in items:
        if item["id"] not in seen:
            seen.add(item["id"])
            result.append(item)
    return result


def term_in_line(term: str, normalized_line: str) -> bool:
    return term_in_normalized_text(term, normalized_line)


def document_finding(kind: str, document: Path, line: int, text: str, **extra: Any) -> dict[str, Any]:
    return {
        "kind": kind,
        "document_path": rel(document),
        "line_start": line,
        "line_end": line,
        "text": text.strip(),
        **extra,
    }


def is_generic_normative_scaffold(line: str) -> bool:
    stripped = line.strip().lower()
    return stripped in {"must prove:", "must not prove:"} or stripped.startswith("### ")


def render_document_diff_report(diff: dict[str, Any]) -> str:
    summary = diff["summary"]
    lines = [
        "# Phase 4 Testing Plan Semantic Diff Verification",
        "",
        f"- Document: `{diff['document']}`",
        f"- Ontology graph: `{diff['ontology_graph']}`",
        f"- Aligned findings: `{summary['aligned_count']}`",
        f"- Stale/forbidden findings: `{summary['stale_count']}`",
        f"- Candidate-new findings: `{summary['candidate_new_count']}`",
        f"- Review-needed findings: `{summary['review_needed_count']}`",
        f"- Underrepresented gates: `{summary['underrepresented_gate_count']}`",
        "",
        "## Verdict",
        "",
    ]
    if summary["stale_count"]:
        lines.append("The testing plan has stale or forbidden target-language findings that should be reviewed before Phase 5.")
    elif summary["underrepresented_gate_count"]:
        lines.append("The testing plan aligns with core ontology language, but several validation gates are underrepresented and should be reviewed before migration planning.")
    else:
        lines.append("The testing plan is aligned enough for this verification pass; no immediate ontology-driven edits are required.")
    append_findings(lines, "Stale Or Forbidden Findings", diff["stale"], limit=25)
    append_findings(lines, "Candidate-New Findings", diff["candidate_new"], limit=25)
    append_findings(lines, "Review-Needed Normative Claims", diff["review_needed"], limit=25)
    lines.extend(["", "## Underrepresented Gates", ""])
    if diff["underrepresented_gates"]:
        for gate in diff["underrepresented_gates"]:
            lines.append(f"- `{gate['entity_id']}`: {gate['label']} - {gate['reason']}")
    else:
        lines.append("None.")
    append_findings(lines, "Representative Aligned Findings", diff["aligned"], limit=30)
    return "\n".join(lines) + "\n"


def append_findings(lines: list[str], title: str, findings: list[dict[str, Any]], limit: int) -> None:
    lines.extend(["", f"## {title}", ""])
    if not findings:
        lines.append("None.")
        return
    for finding in findings[:limit]:
        entity = finding.get("entity_id") or finding.get("reason", "")
        text = finding.get("text", "")
        lines.append(f"- `{finding['document_path']}:{finding['line_start']}` `{entity}` - {text}")
    if len(findings) > limit:
        lines.append(f"- ... {len(findings) - limit} more omitted from this summary; see `document-diff.json` in the run output.")


def normalize_text(value: str) -> str:
    return normalize_match_text(value)
