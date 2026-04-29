from __future__ import annotations

import unittest
from copy import deepcopy
import json
import re
import tempfile
from pathlib import Path
from urllib.parse import unquote, urlparse

from semantica_workbench.architecture_change_frame import (
    FRAME_SCHEMA_VERSION,
    REQUIRED_EVIDENCE_REF_FIELDS,
    build_architecture_change_frame_package,
    frame_schema_summary,
    fixture_frame_document_path,
    load_architecture_change_frame_schema,
    validate_frame_policy_shape,
)
from semantica_workbench.chunking import chunk_markdown
from semantica_workbench.core_ontology import (
    TESTING_PLAN,
    build_document_diff,
    build_graph_payload,
    compare_architecture_proposal,
    load_core_ontology,
    validate_loaded_core_ontology,
    write_architecture_change_frame,
)
from semantica_workbench.core_config import CORE_GRAPH_FILENAMES, NAMED_QUERY_DESCRIPTIONS
from semantica_workbench.core_viewer import build_cytoscape_payload, write_html_viewer
from semantica_workbench.core_query import render_query_text, run_named_query, run_sparql_query
from semantica_workbench.document_sweep import discover_documents, document_slug, effective_exclude_segments, review_queue_records, run_document_sweep
from semantica_workbench.evidence_index import build_sweep_evidence_index, evidence_index_turtle, write_sweep_evidence_index
from semantica_workbench.extraction import heuristic_extract
from semantica_workbench.io import read_json, rel, write_json
from semantica_workbench.manifest import load_manifest
from semantica_workbench.paths import FIXTURE_MANIFEST, REPO_ROOT
from semantica_workbench.seeding import build_seed_graph
from semantica_workbench.semantica_extraction import semantica_extraction_pilot
import semantica_workbench.semantica_llm_extraction as llm_module
from semantica_workbench.semantica_graph import semantica_graph_probe
from semantica_workbench.semantica_intake import map_semantica_chunk_to_span, semantica_intake_probe
from semantica_workbench.semantic_evidence import (
    compare_evidence_to_ontology,
    extract_evidence_claims,
    fixture_document_path,
    load_fixture_expectations,
    semantic_capability_probe,
)
from semantica_workbench.source_model import span_text_for_ref
from semantica_workbench.text_normalization import normalize_match_text, normalize_text, term_in_normalized_text


def frame_evidence_ref() -> dict:
    return {
        "id": "evidence-claim-1",
        "source_path": "tools/semantica-workbench/fixtures/docs/semantic-evidence-cases.md",
        "heading_path": ["Target Architecture"],
        "context": "Target Architecture",
        "line_start": 7,
        "line_end": 7,
        "char_start": 0,
        "char_end": 73,
        "char_span_kind": "line-offset",
        "text": "Create a root-level `core/` authoring root for shared platform machinery.",
        "extraction_method": "semantica-llm-pilot",
        "confidence": 0.82,
        "review_state": "evidence-only",
        "promotion_allowed": False,
    }


def minimal_architecture_change_frame() -> dict:
    return {
        "schema_version": FRAME_SCHEMA_VERSION,
        "frame_id": "fixture-frame",
        "document": {
            "source_path": "tools/semantica-workbench/fixtures/docs/semantic-evidence-cases.md",
            "title": "Semantic Evidence Cases",
            "authority_context": "fixture",
            "authority_rank": 99,
            "source_scope": "fixture",
        },
        "proposal_summary": "Fixture frame for a proposed root-level core authoring root.",
        "extraction": {
            "method": "semantica-llm-pilot",
            "extractor": "architecture-change-frame-pilot",
            "status": "pilot",
            "llm_provider_status": "available",
            "semantica_version": "0.4.0",
            "deterministic_oracle": "rawr-semantic-heuristic-v1",
            "promotion_allowed": False,
        },
        "governance": {
            "truth_authority": "rawr-reviewed-ontology",
            "semantica_output_authoritative": False,
            "reference_geometry_status": "comparison-only",
            "requires_human_promotion": True,
            "promotion_allowed": False,
        },
        "claims": [
            {
                "id": "claim-root-core-authoring-root",
                "claim_type": "forbidden-risk",
                "subject": "root-level core authoring root",
                "predicate": "introduces",
                "object": "core authoring surface",
                "polarity": "positive",
                "modality": "proposed",
                "assertion_scope": "target-architecture",
                "authority_context": "fixture",
                "mapping_state": "resolved",
                "evidence_refs": [frame_evidence_ref()],
                "confidence": 0.78,
                "review_state": "evidence-only",
                "verdict": "not-evaluated",
                "review_action": "none",
                "promotion_allowed": False,
            }
        ],
        "noun_mappings": [],
        "comparison": {
            "status": "extraction-only",
            "overall_verdict": "not-evaluated",
            "recommended_next_action": "none",
            "ruleset": "rawr-frame-pilot-unresolved",
            "explanation_chain_complete": False,
        },
    }


def write_reference_geometry_bundle(directory: Path) -> Path:
    bundle_path = directory / "reference-geometry.zip"
    ttl = """@prefix dct: <http://purl.org/dc/terms/> .
@prefix rawr: <https://rawr.dev/ontology/instances#> .
@prefix rg: <https://rawr.dev/ontology/reference-geometry#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

rawr:diagnosticsExtensionSlot a rg:ExtensionSlot ;
  dct:description "New read model, catalog, topology, or telemetry concern attaches under diagnostics/observation." ;
  skos:prefLabel "diagnostics extension slot" .

rawr:comparisonVocabularyExtensionSlot a rg:ExtensionSlot ;
  dct:description "New analysis vocabulary attaches as comparison/change-frame layer, not as product architecture kind." ;
  skos:prefLabel "comparison vocabulary extension slot" .

rawr:laneAgentTools a rg:ProjectionLane ;
  skos:prefLabel "agent/tools" ;
  rg:pathPattern "plugins/agent/tools/<capability>" .

rawr:bindPhase a rg:RuntimePhase ;
  skos:prefLabel "bind" .
"""
    import zipfile

    with zipfile.ZipFile(bundle_path, "w") as archive:
        archive.writestr("rawr-reference-geometry-v0.2/README.md", "# RAWR Reference Geometry v0.2\n")
        archive.writestr("rawr-reference-geometry-v0.2/rawr-reference-geometry-core.ttl", ttl)
    return bundle_path


class FakeEntity:
    def __init__(self, text: str, label: str, start_char: int, end_char: int, confidence: float = 0.9):
        self.text = text
        self.label = label
        self.start_char = start_char
        self.end_char = end_char
        self.confidence = confidence
        self.metadata = {}


class FakeTriplet:
    def __init__(self, subject: str, predicate: str, object_: str, source_sentence: str, confidence: float = 0.8):
        self.subject = subject
        self.predicate = predicate
        self.object = object_
        self.confidence = confidence
        self.metadata = {"source_sentence": source_sentence}


class WorkbenchTests(unittest.TestCase):
    def test_fixture_manifest_chunks_and_normalizes(self) -> None:
        manifest = load_manifest(FIXTURE_MANIFEST)
        chunks = [chunk for source in manifest.sources for chunk in chunk_markdown(source)]
        self.assertGreaterEqual(len(chunks), 2)

    def test_heuristic_extracts_entities(self) -> None:
        manifest = load_manifest(FIXTURE_MANIFEST)
        seeds = build_seed_graph(manifest)
        chunk = chunk_markdown(manifest.sources[0])[0]
        extraction = heuristic_extract(chunk, seeds)
        self.assertGreater(len(extraction["entity_mentions"]), 1)
        self.assertGreater(len(extraction["claims"]), 0)
        self.assertTrue(all(relation["predicate"] != "mentions" for relation in extraction["relations"]))

    def test_manifest_sources_carry_authority_rank(self) -> None:
        manifest = load_manifest(FIXTURE_MANIFEST)
        self.assertEqual(manifest.sources[0].authority_rank, 99)

    def test_core_ontology_validates(self) -> None:
        ontology = load_core_ontology()
        report = validate_loaded_core_ontology(ontology)
        self.assertEqual([], report["errors"])
        self.assertGreaterEqual(report["summary"]["canonical_entity_count"], 50)
        self.assertLessEqual(report["summary"]["canonical_entity_count"], 150)

    def test_core_ontology_rejects_unknown_predicates(self) -> None:
        ontology = deepcopy(load_core_ontology())
        ontology["relations"][0]["predicate"] = "produced_by"
        report = validate_loaded_core_ontology(ontology)
        self.assertIn("unknown_relation_predicate", {error["kind"] for error in report["errors"]})

    def test_core_ontology_rejects_unresolved_relation_endpoint(self) -> None:
        ontology = deepcopy(load_core_ontology())
        ontology["relations"][0]["object"] = "missing.entity"
        report = validate_loaded_core_ontology(ontology)
        self.assertIn("unresolved_relation_object", {error["kind"] for error in report["errors"]})

    def test_core_ontology_rejects_relation_signature_drift(self) -> None:
        ontology = deepcopy(load_core_ontology())
        relation = next(item for item in ontology["relations"] if item["predicate"] == "owns_truth")
        ontology["entities"].append(
            {
                "id": "test.runtime.artifact",
                "label": "Test Runtime Artifact",
                "type": "RuntimeArtifact",
                "layer": "runtime-realization-overlay",
                "status": "locked",
                "definition": "Test-only entity used to prove relation signature validation rejects type drift.",
                "source_refs": relation["source_refs"],
                "operational_consequence": ["Test-only operational consequence."],
                "classifier_readiness": {"status": "locked"},
            }
        )
        relation["subject"] = "test.runtime.artifact"
        report = validate_loaded_core_ontology(ontology)
        self.assertIn("relation_subject_type_outside_domain", {error["kind"] for error in report["errors"]})

    def test_core_ontology_rejects_locked_candidate_leakage(self) -> None:
        ontology = deepcopy(load_core_ontology())
        leaked_entity = deepcopy(ontology["entities"][0])
        leaked_entity["id"] = "test.candidate.entity"
        leaked_entity["status"] = "candidate"
        ontology["entities"].append(leaked_entity)
        ontology["relations"][0]["object"] = leaked_entity["id"]
        ontology["relations"][0]["status"] = "locked"
        report = validate_loaded_core_ontology(ontology)
        self.assertIn("canonical_relation_noncanonical_object", {error["kind"] for error in report["errors"]})

    def test_core_ontology_rejects_weak_locked_source_ref(self) -> None:
        ontology = deepcopy(load_core_ontology())
        ontology["entities"][0]["source_refs"] = [{"path": "/tmp/not-repo-relative.md", "section": "Missing"}]
        report = validate_loaded_core_ontology(ontology)
        kinds = {error["kind"] for error in report["errors"]}
        self.assertIn("source_ref_not_repo_relative", kinds)
        self.assertIn("source_ref_missing_file", kinds)

    def test_core_graph_excludes_candidate_statuses(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        candidate_statuses = set(ontology["contract"]["candidate_statuses"])
        for item in graph["canonical_graph"]["entities"] + graph["canonical_graph"]["relations"]:
            self.assertNotIn(item["status"], candidate_statuses)

    def test_target_architecture_view_excludes_constraints_and_candidates(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        target_entities = graph["layered_graph"]["target_architecture_view"]["entities"]
        excluded_types = {"DeprecatedTerm", "EvidenceClaim", "ForbiddenPattern", "ReviewFinding", "CandidateEntity"}
        self.assertTrue(target_entities)
        self.assertFalse(any(entity["type"] in excluded_types for entity in target_entities))

    def test_semantica_graph_probe_preserves_rawr_target_boundaries(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        proof = graph["semantica_graph"]
        self.assertEqual("rawr-semantica-graph-proof-v1", proof["schema_version"])
        self.assertFalse(proof["candidate_handling"]["promotion_allowed"])
        self.assertTrue(proof["fallback"]["rawr_id_authority"])
        self.assertTrue(proof["fallback"]["rawr_predicate_authority"])
        guards = proof["rawr_guards"]
        self.assertTrue(guards["stable_ids_preserved"])
        self.assertTrue(guards["candidate_ids_excluded_from_target"])
        self.assertTrue(guards["evidence_types_excluded_from_target"])
        self.assertTrue(guards["target_relations_resolve_inside_target"])

    def test_semantica_graph_probe_does_not_promote_candidates(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        target_ids = {entity["id"] for entity in graph["layered_graph"]["target_architecture_view"]["entities"]}
        candidate_ids = set(graph["semantica_graph"]["candidate_handling"]["candidate_ids"])
        self.assertTrue(candidate_ids)
        self.assertFalse(target_ids & candidate_ids)

    def test_semantica_graph_probe_uses_contract_predicate_allow_list(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        allowed = {predicate["id"] for predicate in ontology["contract"]["predicates"]}
        mutated = deepcopy(graph["layered_graph"])
        mutated["relations"] = deepcopy(mutated["relations"])
        mutated["relations"][0]["predicate"] = "mentions"
        proof = semantica_graph_probe(mutated, graph["candidate_queue"], allowed)
        self.assertFalse(proof["rawr_guards"]["controlled_predicates_preserved"])

    def test_verification_policy_stays_out_of_canonical_views(self) -> None:
        ontology = deepcopy(load_core_ontology())
        verification_entity = next(entity for entity in ontology["entities"] if entity["type"] == "VerificationPolicyConcept")
        verification_entity["status"] = "locked"
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        for view_name in ["canonical_graph"]:
            self.assertFalse(any(entity["type"] == "VerificationPolicyConcept" for entity in graph[view_name]["entities"]))
        self.assertFalse(any(entity["type"] == "VerificationPolicyConcept" for entity in graph["layered_graph"]["canonical_view"]["entities"]))
        self.assertFalse(any(entity["type"] == "VerificationPolicyConcept" for entity in graph["layered_graph"]["target_architecture_view"]["entities"]))

    def test_testing_plan_authority_only_targets_verification_policy(self) -> None:
        ontology = load_core_ontology()
        testing_authority_edges = [
            relation
            for relation in ontology["relations"]
            if relation["subject"] == "authority.doc.canonical-testing-plan"
            and relation["predicate"] == "is_authority_for"
        ]
        self.assertGreaterEqual(len(testing_authority_edges), 1)
        targets = {entity["id"]: entity for entity in ontology["entities"]}
        self.assertTrue(all(targets[relation["object"]]["type"] == "VerificationPolicyConcept" for relation in testing_authority_edges))

    def test_forbidden_patterns_have_structured_constraints(self) -> None:
        ontology = load_core_ontology()
        forbidden = [entity for entity in ontology["entities"] if entity["type"] == "ForbiddenPattern"]
        self.assertGreater(len(forbidden), 0)
        self.assertTrue(all(isinstance(entity.get("constraint"), dict) for entity in forbidden))
        self.assertTrue(all(entity["constraint"].get("prohibited_action") for entity in forbidden))

    def test_testing_plan_diff_has_review_signal(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        diff = build_document_diff(TESTING_PLAN, graph["layered_graph"], graph["candidate_queue"])
        self.assertEqual(rel(TESTING_PLAN), diff["document"])
        self.assertGreater(diff["summary"]["aligned_count"], 0)

    def test_graph_viewer_embeds_parseable_json(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        diff = build_document_diff(TESTING_PLAN, graph["layered_graph"], graph["candidate_queue"])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "graph-viewer.html"
            write_html_viewer(path, graph["layered_graph"], graph["candidate_queue"], diff)
            text = path.read_text(encoding="utf-8")
        match = re.search(r'<script id="graph-data" type="application/json">(.*?)</script>', text, re.S)
        self.assertIsNotNone(match)
        self.assertNotIn("&quot;", match.group(1))
        payload = json.loads(match.group(1))
        self.assertIn("cytoscape", text)
        self.assertIn('id="cy"', text)
        self.assertIn("viewerConfig", payload)
        self.assertGreater(len(payload["elements"]), 0)

    def test_cytoscape_payload_resolves_edges_and_hides_candidates_by_default(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        payload = build_cytoscape_payload(graph["layered_graph"], graph["candidate_queue"])
        nodes = [element for element in payload["elements"] if element["group"] == "nodes"]
        edges = [element for element in payload["elements"] if element["group"] == "edges"]
        node_ids = {node["data"]["id"] for node in nodes}
        self.assertTrue(all(edge["data"]["source"] in node_ids and edge["data"]["target"] in node_ids for edge in edges))
        candidate_nodes = [node for node in nodes if node["data"]["status"] == "candidate"]
        self.assertGreater(len(candidate_nodes), 0)
        self.assertTrue(all(not node["data"]["isCanonical"] for node in candidate_nodes))

    def test_named_query_forbidden_terms(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            (run_dir / CORE_GRAPH_FILENAMES["layered_graph"]).write_text(json.dumps(graph["layered_graph"]), encoding="utf-8")
            (run_dir / CORE_GRAPH_FILENAMES["candidate_queue"]).write_text(json.dumps(graph["candidate_queue"]), encoding="utf-8")
            result = run_named_query(str(run_dir), "forbidden-terms")
        self.assertEqual("forbidden-terms", result["query"])
        self.assertGreater(len(result["entities"]), 0)
        self.assertTrue(all(item["status"] == "forbidden" or item["type"] == "ForbiddenPattern" for item in result["entities"]))

    def test_semantic_capability_probe_records_semantica_surface(self) -> None:
        report = semantic_capability_probe()
        self.assertTrue(report["checked_modules"]["semantica.semantic_extract"]["available"])
        self.assertIn("triplet_extractor_pattern", report["proofs"])
        self.assertEqual("rawr-semantica-capability-v2", report["schema_version"])

    def test_semantic_capability_probe_records_feature_gates(self) -> None:
        report = semantic_capability_probe()
        gates = report["feature_gates"]
        self.assertIn("semantic_extraction_llm", gates)
        self.assertIn("mcp_agent_interface", gates)
        self.assertIn(gates["semantic_extraction_llm"]["status"], {"probe-ready", "blocked-missing-extra"})
        self.assertIn(gates["document_ingest_parse_split"]["status"], {"probe-ready", "partial", "blocked"})
        self.assertTrue(gates["semantic_extraction_llm"]["rawr_adapter_required"])
        self.assertTrue(report["optional_dependencies"]["openai"]["enables"])
        if not report["checked_modules"]["semantica.parse"]["classes"].get("MarkdownParser"):
            self.assertEqual("partial", gates["document_ingest_parse_split"]["status"])
        if not any(report["optional_dependencies"][name]["available"] for name in ["openai", "anthropic", "litellm", "ollama"]):
            self.assertEqual("blocked-missing-extra", gates["semantic_extraction_llm"]["status"])
        if not (report["optional_dependencies"]["fastapi"]["available"] and report["optional_dependencies"]["uvicorn"]["available"]):
            self.assertEqual("blocked-missing-extra", gates["rest_explorer_interface"]["status"])
        if report["checked_modules"]["semantica.export"]["available"] and not report["optional_dependencies"]["pyshacl"]["available"]:
            self.assertEqual("partial", gates["export_validation"]["status"])

    def test_semantic_capability_probe_records_mcp_inventory(self) -> None:
        report = semantic_capability_probe()
        mcp = report["mcp_server"]
        self.assertTrue(mcp["available"])
        self.assertIn("extract_entities", mcp["tool_names"])
        self.assertIn("run_reasoning", mcp["tool_names"])
        self.assertIn("semantica://graph/summary", mcp["resource_uris"])

    def test_semantic_capability_probe_records_replacement_matrix_and_fixtures(self) -> None:
        report = semantic_capability_probe()
        matrix = report["replacement_matrix"]
        fixture_ids = {item["id"] for item in report["adversarial_fixtures"]}
        self.assertGreaterEqual(len(matrix), 5)
        self.assertTrue(all(item["target"] and item["keep"] for item in matrix))
        self.assertIn("negated-prohibited-pattern", fixture_ids)
        self.assertIn("positive-prohibited-pattern", fixture_ids)

    def test_architecture_change_frame_schema_requires_structured_evidence_refs(self) -> None:
        schema = load_architecture_change_frame_schema()
        summary = frame_schema_summary()
        self.assertEqual(FRAME_SCHEMA_VERSION, summary["schema_version"])
        self.assertIn("ownership", summary["claim_types"])
        self.assertIn("compatible-extension", summary["verdicts"])
        self.assertIn("not-evaluated", summary["verdicts"])
        self.assertTrue(REQUIRED_EVIDENCE_REF_FIELDS.issubset(set(summary["evidence_ref_required"])))
        self.assertEqual(1, schema["$defs"]["claim"]["properties"]["evidence_refs"]["minItems"])
        self.assertEqual(1, schema["$defs"]["noun_mapping"]["properties"]["evidence_refs"]["minItems"])
        self.assertFalse(schema["$defs"]["governance"]["properties"]["semantica_output_authoritative"]["const"])
        self.assertFalse(schema["$defs"]["governance"]["properties"]["promotion_allowed"]["const"])

    def test_architecture_change_frame_policy_accepts_evidence_only_frame(self) -> None:
        frame = minimal_architecture_change_frame()
        self.assertEqual([], validate_frame_policy_shape(frame))

    def test_architecture_change_frame_policy_rejects_truth_and_evidence_leaks(self) -> None:
        frame = minimal_architecture_change_frame()
        frame["governance"]["semantica_output_authoritative"] = True
        frame["governance"]["reference_geometry_status"] = "candidate-input"
        frame["comparison"]["overall_verdict"] = "compatible"
        frame["claims"][0]["verdict"] = "compatible"
        frame["claims"][0]["review_action"] = "accept"
        frame["claims"][0]["review_state"] = "accepted"
        frame["claims"][0]["evidence_refs"] = []
        frame["noun_mappings"] = [
            {
                "id": "mapping-plugin",
                "proposed_noun": "Plugin Truth",
                "mapping_state": "candidate",
                "evidence_refs": [deepcopy(frame_evidence_ref())],
                "confidence": 0.7,
                "review_state": "candidate",
                "promotion_allowed": True,
            }
        ]
        frame["noun_mappings"][0]["evidence_refs"][0].pop("char_end")
        errors = validate_frame_policy_shape(frame)
        kinds = {error["kind"] for error in errors}
        self.assertIn("frame_governance_violation", kinds)
        self.assertIn("reference_geometry_candidate_input_not_allowed", kinds)
        self.assertIn("extraction_only_frame_has_verdict", kinds)
        self.assertIn("extraction_only_claim_has_verdict", kinds)
        self.assertIn("extraction_only_claim_has_review_action", kinds)
        self.assertIn("machine_frame_review_state_accepted", kinds)
        self.assertIn("missing_structured_evidence_ref", kinds)
        self.assertIn("frame_item_promotion_allowed", kinds)
        self.assertIn("evidence_ref_missing_required_fields", kinds)

    def test_architecture_change_frame_schema_keeps_geometry_and_review_state_non_authoritative(self) -> None:
        schema = load_architecture_change_frame_schema()
        self.assertEqual(["comparison-only", "not-used"], schema["$defs"]["governance"]["properties"]["reference_geometry_status"]["enum"])
        self.assertNotIn("accepted", schema["$defs"]["review_state"]["enum"])

    def test_architecture_change_frame_package_produces_evidence_only_fixture_frame(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        with tempfile.TemporaryDirectory() as directory:
            reference_bundle = write_reference_geometry_bundle(Path(directory))
            package = build_architecture_change_frame_package(
                fixture_frame_document_path(),
                graph["layered_graph"],
                graph["candidate_queue"],
                fixture=True,
                reference_bundle=reference_bundle,
            )
        frame = package["frame"]
        self.assertTrue(package["validation"]["valid"], package["validation"]["errors"])
        self.assertEqual("extraction-only", frame["comparison"]["status"])
        self.assertEqual("not-evaluated", frame["comparison"]["overall_verdict"])
        self.assertEqual("comparison-only", frame["governance"]["reference_geometry_status"])
        self.assertFalse(frame["governance"]["semantica_output_authoritative"])
        self.assertTrue(all(claim["verdict"] == "not-evaluated" for claim in frame["claims"]))
        self.assertTrue(all(claim["review_action"] == "none" for claim in frame["claims"]))
        claim_types = {claim["claim_type"] for claim in frame["claims"]}
        self.assertIn("ownership", claim_types)
        self.assertIn("projection", claim_types)
        self.assertIn("runtime-realization", claim_types)
        self.assertIn("resource-provider", claim_types)
        self.assertIn("forbidden-risk", claim_types)
        self.assertIn("verification", claim_types)
        mapping_categories = {item["mapping_category"] for item in package["noun_mappings"]["mappings"]}
        self.assertIn("accepted", mapping_categories)
        self.assertIn("candidate", mapping_categories)
        self.assertIn("external-reference-geometry-only", mapping_categories)
        self.assertIn("rejected", mapping_categories)
        for claim in frame["claims"]:
            ref = claim["evidence_refs"][0]
            self.assertEqual(claim["evidence_refs"][0]["source_path"], frame["document"]["source_path"])
            self.assertGreaterEqual(ref["line_start"], 1)
            self.assertGreaterEqual(ref["char_end"], ref["char_start"])
            self.assertFalse(ref["promotion_allowed"])

    def test_architecture_proposal_compare_generates_verdict_repair_package(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        with tempfile.TemporaryDirectory() as directory:
            reference_bundle = write_reference_geometry_bundle(Path(directory))
            package = build_architecture_change_frame_package(
                fixture_frame_document_path(),
                graph["layered_graph"],
                graph["candidate_queue"],
                fixture=True,
                reference_bundle=reference_bundle,
                evaluate=True,
            )
        frame = package["frame"]
        verdict_repair = package["verdict_repair"]
        comparisons = package["claim_comparisons"]["comparisons"]
        self.assertTrue(package["validation"]["valid"], package["validation"]["errors"])
        self.assertEqual("evaluated", frame["comparison"]["status"])
        self.assertEqual(verdict_repair["overall_verdict"], frame["comparison"]["overall_verdict"])
        verdicts = {item["verdict"] for item in comparisons}
        self.assertIn("conflicts", verdicts)
        self.assertIn("needs-canonical-addendum", verdicts)
        self.assertIn("unclear", verdicts)
        self.assertTrue(verdicts & {"compatible", "compatible-extension"})
        external_slot = next(item for item in comparisons if "comparison vocabulary extension slot" in item["source_claim"]["text"])
        self.assertEqual("compatible-extension", external_slot["verdict"])
        self.assertEqual("accept-with-mapping", external_slot["review_action"])
        self.assertGreaterEqual(len(verdict_repair["repair_steps"]), 1)
        for item in comparisons:
            self.assertFalse(item["promotion_allowed"])
            self.assertTrue(item["source_claim"]["document_path"])
        self.assertIn("rawr:ArchitectureChangeFrame", package["proposal_graph_ttl"])
        self.assertIn("RAWR reviewed ontology remains truth authority", package["review_report"])

    def test_architecture_change_frame_commands_write_expected_outputs(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        base_root = REPO_ROOT / ".semantica" / "test-runs"
        base_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base_root) as directory:
            base_run = Path(directory)
            write_json(base_run / CORE_GRAPH_FILENAMES["layered_graph"], graph["layered_graph"])
            write_json(base_run / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
            reference_bundle = write_reference_geometry_bundle(base_run)
            run_dir = write_architecture_change_frame(
                fixture_frame_document_path(),
                run=str(base_run),
                fixture=True,
                reference_bundle=reference_bundle,
            )
            self.assertTrue((run_dir / CORE_GRAPH_FILENAMES["architecture_change_frame"]).exists())
            frame = read_json(run_dir / CORE_GRAPH_FILENAMES["architecture_change_frame"])
            self.assertEqual("extraction-only", frame["comparison"]["status"])
            run_dir = compare_architecture_proposal(
                fixture_frame_document_path(),
                run=str(base_run),
                fixture=True,
                reference_bundle=reference_bundle,
            )
            self.assertTrue((run_dir / CORE_GRAPH_FILENAMES["proposal_review_report"]).exists())
            proposal_html = run_dir / CORE_GRAPH_FILENAMES["proposal_review_report_html"]
            self.assertTrue(proposal_html.exists())
            self.assertIn("Architecture Proposal Review", proposal_html.read_text(encoding="utf-8"))
            semantic_html = run_dir / CORE_GRAPH_FILENAMES["semantic_compare_report_html"]
            self.assertTrue(semantic_html.exists())
            self.assertIn("Semantic Compare Report", semantic_html.read_text(encoding="utf-8"))
            self.assertTrue((run_dir / CORE_GRAPH_FILENAMES["verdict_repair"]).exists())
            summary = run_named_query(str(run_dir), "proposal-review-summary")
            self.assertEqual("proposal-review-summary", summary["query"])
            repair_queue = run_named_query(str(run_dir), "proposal-repair-queue")
            self.assertGreaterEqual(len(repair_queue["items"]), 1)

    def test_semantica_intake_probe_preserves_source_authority_and_spans(self) -> None:
        manifest = load_manifest(FIXTURE_MANIFEST)
        source = manifest.sources[0]
        probe = semantica_intake_probe(source)
        self.assertEqual("rawr-semantica-intake-v1", probe["schema_version"])
        self.assertEqual(source.rel_path, probe["source"]["path"])
        self.assertTrue(probe["fallback"]["chunk_markdown_retained"])
        self.assertIn(probe["fallback"]["decision_grade_source"], {"chunk_markdown", "semantica-intake"})
        self.assertGreaterEqual(probe["parity"]["local_chunk_count"], 1)
        self.assertTrue(probe["parity"]["source_identity_preserved"])
        self.assertTrue(probe["parity"]["authority_preserved"])
        for chunk in probe["chunks"]:
            self.assertEqual(source.rel_path, chunk["source_path"])
            self.assertEqual(source.authority_rank, chunk["authority_rank"])
            self.assertEqual(source.authority_scope, chunk["authority_scope"])
            self.assertGreaterEqual(chunk["line_start"], 1)
            self.assertGreaterEqual(chunk["line_end"], chunk["line_start"])
            self.assertEqual(source.rel_path, chunk["provenance"]["document"])
            self.assertEqual(chunk["line_start"], chunk["provenance"]["line"])

    def test_semantica_intake_marks_markdown_parser_gap_as_partial(self) -> None:
        manifest = load_manifest(FIXTURE_MANIFEST)
        probe = semantica_intake_probe(manifest.sources[0])
        if not probe["status"]["markdown_parser_available"]:
            self.assertEqual("partial", probe["status"]["classification"])
            self.assertEqual("chunk_markdown", probe["fallback"]["decision_grade_source"])
            self.assertIn("MarkdownParser", probe["status"]["limitation"])

    def test_semantica_span_adapter_rejects_unmapped_offsets(self) -> None:
        text = "# Heading\n\nBody\n"
        self.assertIsNone(map_semantica_chunk_to_span(text, None, 5))
        self.assertIsNone(map_semantica_chunk_to_span(text, 8, 2))
        self.assertIsNone(map_semantica_chunk_to_span(text, 0, len(text) + 1))
        mapping = map_semantica_chunk_to_span(text, 0, len(text))
        self.assertIsNotNone(mapping)
        assert mapping is not None
        self.assertEqual(1, mapping.line_start)
        self.assertEqual(3, mapping.line_end)

    def test_shared_normalization_handles_unicode_quotes_spaces_and_dashes(self) -> None:
        self.assertEqual("a b-c 'd' \"e\"", normalize_text("A\u00a0B\u2014C \u2018D\u2019 \u201cE\u201d"))
        normalized = normalize_match_text("Use a root\u2011level `core/` authoring root.")
        self.assertTrue(term_in_normalized_text("root-level core/", normalized))

    def test_external_document_paths_and_exact_line_spans_are_first_class(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        with tempfile.TemporaryDirectory() as directory:
            document = Path(directory) / "external-proposal.md"
            line = "  Create a root-level `core/` authoring root for shared platform machinery."
            document.write_text(f"# Target Architecture\n\n{line}\n", encoding="utf-8")
            evidence = extract_evidence_claims(document, graph["layered_graph"], graph["candidate_queue"])
            self.assertEqual(str(document.resolve()), evidence["document"])
            claim = next(item for item in evidence["claims"] if "root-level" in item["text"])
            self.assertEqual(3, claim["line_start"])
            self.assertEqual(2, claim["char_start"])
            self.assertEqual(len(line), claim["char_end"])
            self.assertEqual(claim["text"], span_text_for_ref(claim["source_path"], claim["line_start"], claim["line_end"], claim["char_start"], claim["char_end"]))
            package = build_architecture_change_frame_package(document, graph["layered_graph"], graph["candidate_queue"])
            self.assertTrue(package["validation"]["valid"], package["validation"]["errors"])
            self.assertEqual("external", package["frame"]["document"]["source_scope"])

    def test_manual_frame_validation_rejects_impossible_source_span(self) -> None:
        frame = minimal_architecture_change_frame()
        frame["claims"][0]["evidence_refs"][0]["char_start"] = 900
        frame["claims"][0]["evidence_refs"][0]["char_end"] = 901
        errors = validate_frame_policy_shape(frame)
        self.assertIn("evidence_ref_source_span_unmapped", {error["kind"] for error in errors})

    def test_manual_frame_validation_rejects_zero_length_real_evidence_ref(self) -> None:
        frame = minimal_architecture_change_frame()
        frame["claims"][0]["evidence_refs"][0]["char_start"] = 0
        frame["claims"][0]["evidence_refs"][0]["char_end"] = 0
        errors = validate_frame_policy_shape(frame)
        self.assertIn("evidence_ref_zero_length_nonempty_text", {error["kind"] for error in errors})

    def test_semantica_llm_mode_blocks_without_provider_and_no_fallback_claims(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(
            fixture_document_path(),
            graph["layered_graph"],
            graph["candidate_queue"],
            fixture=True,
            extraction_mode="semantica-llm",
            llm_provider="openai",
        )
        self.assertEqual("semantica-llm", evidence["extraction_mode"]["requested"])
        self.assertEqual("deterministic-with-blocked-semantica-llm-sidecar", evidence["extraction_mode"]["actual"])
        self.assertFalse(evidence["extraction_mode"]["deterministic_fallback_used"])
        self.assertIn(evidence["semantica_llm"]["status"]["blocked_reason"], {"blocked-missing-extra", "blocked-no-api-key", "blocked-provider-unavailable", "blocked-requires-model"})
        self.assertGreater(len(evidence["claims"]), 0)
        self.assertTrue(all(claim["extractor"] == "rawr-semantic-heuristic-v1" for claim in evidence["claims"]))

    def test_semantica_llm_fake_provider_outputs_evidence_only_source_anchored_claims(self) -> None:
        old_status = llm_module.semantica_llm_status
        old_call = llm_module.call_semantica_llm_methods

        def fake_status(provider: str = "openai", model: str | None = None) -> dict:
            return {
                "available": True,
                "classification": "ready",
                "provider": provider,
                "model": model,
                "provider_available": True,
                "llm_call_attempted": False,
                "fallback_used": False,
                "blocked_reason": None,
                "optional_dependency": {"package": "openai", "available": True, "version": "test"},
            }

        def fake_call(text: str, *, provider: str, model: str | None, max_text_length: int | None):
            entity_text = "root-level `core/` authoring root"
            if entity_text not in text:
                return [], []
            start = text.index(entity_text)
            sentence = "Create a root-level `core/` authoring root for shared platform machinery."
            return [FakeEntity(entity_text, "ARCHITECTURE_CONCEPT", start, start + len(entity_text))], [
                FakeTriplet("root-level `core/` authoring root", "forbids", "shared platform machinery", sentence)
            ]

        llm_module.semantica_llm_status = fake_status
        llm_module.call_semantica_llm_methods = fake_call
        try:
            result = llm_module.semantica_llm_extraction(fixture_document_path(), provider="openai", model="test-model")
        finally:
            llm_module.semantica_llm_status = old_status
            llm_module.call_semantica_llm_methods = old_call

        self.assertEqual("semantica-llm", result["actual_mode"])
        self.assertFalse(result["summary"]["fallback_used"])
        self.assertGreaterEqual(len(result["evidence_claims"]), 2)
        for claim in result["evidence_claims"]:
            self.assertEqual("semantica-llm-openai-v1", claim["extractor"])
            self.assertEqual("evidence-only", claim["review_state"])
            self.assertFalse(claim["promotion_allowed"])
            self.assertTrue(claim["heading_path"])
            self.assertEqual(claim["text"], span_text_for_ref(claim["source_path"], claim["line_start"], claim["line_end"], claim["char_start"], claim["char_end"]))

        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        llm_module.semantica_llm_status = fake_status
        llm_module.call_semantica_llm_methods = fake_call
        try:
            package = build_architecture_change_frame_package(
                fixture_frame_document_path(),
                graph["layered_graph"],
                graph["candidate_queue"],
                fixture=True,
                extraction_mode="semantica-llm",
                llm_model="test-model",
            )
        finally:
            llm_module.semantica_llm_status = old_status
            llm_module.call_semantica_llm_methods = old_call
        self.assertEqual("semantica-llm-pilot", package["frame"]["extraction"]["method"])
        self.assertEqual("pilot", package["frame"]["extraction"]["status"])
        self.assertEqual("available", package["frame"]["extraction"]["llm_provider_status"])

    def test_semantic_evidence_fixture_verdicts(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True)
        compare = compare_evidence_to_ontology(evidence, graph["layered_graph"], graph["candidate_queue"])
        expectations = load_fixture_expectations()["cases"]
        findings_by_line: dict[int, list[dict]] = {}
        for finding in compare["findings"]:
            findings_by_line.setdefault(finding["line_start"], []).append(finding)
        for case in expectations:
            findings = findings_by_line.get(case["line"], [])
            matching = [
                finding
                for finding in findings
                if finding["kind"] == case["expected_kind"]
                and finding["decision_grade"] == case["expected_decision_grade"]
                and (not case.get("expected_entity_id") or finding.get("entity_id") == case["expected_entity_id"])
            ]
            self.assertTrue(matching, f"missing expected finding for line {case['line']}: {findings}")
            finding = matching[0]
            if case.get("expected_polarity"):
                self.assertEqual(case["expected_polarity"], finding["polarity"])
            if case.get("expected_modality"):
                self.assertEqual(case["expected_modality"], finding["modality"])
            if case.get("expected_scope"):
                self.assertEqual(case["expected_scope"], finding["assertion_scope"])
            if case.get("expected_ambiguity_bucket"):
                self.assertEqual(case["expected_ambiguity_bucket"], finding["ambiguity_bucket"])

    def test_semantica_extraction_pilot_is_evidence_only(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        pilot = semantica_extraction_pilot(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"])
        self.assertEqual("rawr-semantica-extraction-pilot-v1", pilot["schema_version"])
        self.assertEqual("rawr-semantic-heuristic-v1", pilot["summary"]["decision_grade_source"])
        self.assertEqual("semantica-triplet-proof-with-rawr-evidence-line-adapter", pilot["summary"]["adapter_mode"])
        self.assertTrue(pilot["limitations"])
        self.assertFalse(pilot["summary"]["promotion_allowed"])
        self.assertEqual("rawr-semantic-heuristic-v1", pilot["fallback"]["deterministic_oracle"])
        self.assertGreaterEqual(pilot["summary"]["raw_item_count"], 0)
        for claim in pilot["evidence_claims"]:
            self.assertEqual("semantica-pilot-pattern-v1", claim["extractor"])
            self.assertEqual("evidence-only", claim["review_state"])
            self.assertFalse(claim["promotion_allowed"])
            self.assertTrue(claim["source_path"])
            self.assertGreaterEqual(claim["line_start"], 1)

    def test_semantic_evidence_records_semantica_pilot_without_changing_oracle(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(
            fixture_document_path(),
            graph["layered_graph"],
            graph["candidate_queue"],
            fixture=True,
            semantica_pilot_enabled=True,
        )
        self.assertIn("semantica_pilot", evidence)
        self.assertEqual("rawr-semantic-heuristic-v1", evidence["semantica_pilot"]["summary"]["decision_grade_source"])
        self.assertEqual("semantica-triplet-proof-with-rawr-evidence-line-adapter", evidence["semantica_pilot"]["summary"]["adapter_mode"])
        self.assertFalse(evidence["semantica_pilot"]["summary"]["promotion_allowed"])
        self.assertTrue(all(claim["extractor"] == "rawr-semantic-heuristic-v1" for claim in evidence["claims"]))

    def test_semantic_evidence_defaults_semantica_pilot_off(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True)
        self.assertEqual("disabled", evidence["semantica_pilot"]["status"]["classification"])
        self.assertFalse(evidence["semantica_pilot"]["summary"]["promotion_allowed"])

    def test_semantic_opposite_claims_do_not_collapse(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True)
        compare = compare_evidence_to_ontology(evidence, graph["layered_graph"], graph["candidate_queue"])
        line3 = [finding for finding in compare["findings"] if finding["line_start"] == 3 and finding["entity_id"] == "forbidden.pattern.root-core-authoring-root"]
        line7 = [finding for finding in compare["findings"] if finding["line_start"] == 7 and finding["entity_id"] == "forbidden.pattern.root-core-authoring-root"]
        self.assertTrue(any(finding["kind"] == "aligned" and finding["polarity"] == "negative" for finding in line3))
        self.assertTrue(any(finding["kind"] == "conflict" and finding["polarity"] == "positive" for finding in line7))

    def test_bare_match_heading_context_does_not_create_conflict(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        temp_root = REPO_ROOT / ".semantica" / "test-docs"
        temp_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=temp_root) as directory:
            document = Path(directory) / "bare-match.md"
            document.write_text("# Target Architecture\n\nroot-level `core/` authoring root.\n", encoding="utf-8")
            evidence = extract_evidence_claims(document, graph["layered_graph"], graph["candidate_queue"], fixture=True)
        compare = compare_evidence_to_ontology(evidence, graph["layered_graph"], graph["candidate_queue"])
        findings = [item for item in compare["findings"] if item.get("entity_id") == "forbidden.pattern.root-core-authoring-root"]
        self.assertTrue(findings)
        self.assertFalse(any(item["kind"] == "conflict" for item in findings))
        self.assertTrue(any(item["kind"] == "ambiguous" and item["assertion_scope"] == "unknown" for item in findings))

    def test_verification_policy_negation_is_not_aligned(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        temp_root = REPO_ROOT / ".semantica" / "test-docs"
        temp_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=temp_root) as directory:
            document = Path(directory) / "policy-negation.md"
            document.write_text("Testing MUST NOT preserve graph law.\n", encoding="utf-8")
            evidence = extract_evidence_claims(document, graph["layered_graph"], graph["candidate_queue"], fixture=True)
        compare = compare_evidence_to_ontology(evidence, graph["layered_graph"], graph["candidate_queue"])
        policy_findings = [item for item in compare["findings"] if item.get("claim_kind") == "verification-policy"]
        self.assertTrue(policy_findings)
        self.assertFalse(any(item["kind"] == "aligned" for item in policy_findings))
        self.assertTrue(any(item.get("ambiguity_bucket") == "subordinate-policy-negation" for item in policy_findings))

    def test_decision_grade_semantic_findings_have_claim_semantics(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True)
        compare = compare_evidence_to_ontology(evidence, graph["layered_graph"], graph["candidate_queue"])
        decision_grade = [finding for finding in compare["findings"] if finding["decision_grade"]]
        self.assertGreater(len(decision_grade), 0)
        for finding in decision_grade:
            self.assertTrue(finding["document_path"])
            self.assertGreaterEqual(finding["line_start"], 1)
            self.assertTrue(finding["text"])
            self.assertIn(finding["polarity"], {"positive", "negative", "prohibitive", "conditional"})
            self.assertNotEqual("unknown", finding["modality"])
            self.assertNotEqual("unknown", finding["assertion_scope"])
            self.assertTrue(finding.get("entity_id"))

    def test_semantic_findings_have_explanation_chain(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True)
        compare = compare_evidence_to_ontology(evidence, graph["layered_graph"], graph["candidate_queue"])
        self.assertEqual("rawr-semantica-reasoning-proof-v1", compare["semantica_reasoning"]["schema_version"])
        self.assertTrue(compare["semantica_reasoning"]["rawr_policy"]["review_actions_owned_by_rawr"])
        self.assertTrue(compare["semantica_reasoning"]["summary"]["explanation_chain_complete"])
        decision_grade = [finding for finding in compare["findings"] if finding["decision_grade"]]
        self.assertTrue(decision_grade)
        for finding in decision_grade:
            chain = finding["explanation_chain"]
            self.assertEqual(finding["claim_id"], chain["source_claim"]["claim_id"])
            self.assertEqual(finding["entity_id"], chain["resolved_target"]["entity_id"])
            self.assertEqual(finding["rule"], chain["rule_result"]["rule"])
            self.assertEqual(finding["kind"], chain["finding"]["kind"])
            self.assertEqual(finding["review_action"], chain["finding"]["review_action"])

    def test_semantic_extraction_suppresses_scaffold_and_records_ledger(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True)
        suppressed = evidence["suppressed_lines"]
        suppressed_by_line = {item["line_start"]: item for item in suppressed}
        self.assertIn(28, suppressed_by_line)
        self.assertIn(31, suppressed_by_line)
        self.assertIn(33, suppressed_by_line)
        self.assertIn(35, suppressed_by_line)
        self.assertIn(36, suppressed_by_line)
        claims_by_line = {claim["line_start"]: claim for claim in evidence["claims"]}
        self.assertNotIn(33, claims_by_line)
        self.assertGreater(evidence["summary"]["claim_retention"]["suppressed_line_count"], 0)

    def test_semantic_query_names_execute(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True)
        compare = compare_evidence_to_ontology(evidence, graph["layered_graph"], graph["candidate_queue"])
        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            (run_dir / CORE_GRAPH_FILENAMES["layered_graph"]).write_text(json.dumps(graph["layered_graph"]), encoding="utf-8")
            (run_dir / CORE_GRAPH_FILENAMES["candidate_queue"]).write_text(json.dumps(graph["candidate_queue"]), encoding="utf-8")
            (run_dir / CORE_GRAPH_FILENAMES["semantic_compare"]).write_text(json.dumps(compare), encoding="utf-8")
            for query_name in NAMED_QUERY_DESCRIPTIONS:
                if query_name.startswith("sweep-") or query_name.startswith("proposal-") or query_name.startswith("evidence-"):
                    continue
                result = run_named_query(str(run_dir), query_name)
                self.assertEqual(query_name, result["query"])
            ambiguity = run_named_query(str(run_dir), "ambiguity-summary")
            self.assertEqual(compare["summary"]["ambiguous_by_bucket"], {row["bucket"]: row["count"] for row in ambiguity["buckets"]})
            decision_queue = run_named_query(str(run_dir), "decision-review-queue")
            text = render_query_text(decision_queue)
            self.assertIn("artifact:", text)
            self.assertIn("document:", text)

    def test_semantica_review_surface_query_reports_mcp_export_and_boundaries(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True)
        compare = compare_evidence_to_ontology(evidence, graph["layered_graph"], graph["candidate_queue"])
        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            write_json(run_dir / CORE_GRAPH_FILENAMES["layered_graph"], graph["layered_graph"])
            write_json(run_dir / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
            write_json(run_dir / CORE_GRAPH_FILENAMES["semantic_compare"], compare)
            result = run_named_query(str(run_dir), "semantica-review-surface")
        self.assertEqual("semantica-review-surface", result["query"])
        surface = result["surface"]
        self.assertEqual("rawr-semantica-review-surface-v1", surface["schema_version"])
        self.assertTrue(surface["mcp"]["available"])
        self.assertIn("run_reasoning", surface["mcp"]["required_review_tools_present"])
        self.assertIn("semantica://graph/summary", surface["mcp"]["required_review_resources_present"])
        self.assertFalse(surface["review_affordances"]["scrape_semantica_current_required"])
        self.assertFalse(surface["review_affordances"]["semantica_output_authoritative"])
        self.assertEqual("present", surface["separation"]["semantic_compare_status"])
        self.assertIsNotNone(surface["separation"]["finding_count"])
        self.assertTrue(surface["separation"]["target_view_excludes_candidates"])
        self.assertFalse(surface["export"]["rawr_export_contract"]["preservation_validated"])
        text = render_query_text(result)
        self.assertIn("semantica review surface", text)
        self.assertIn("mcp_available: True", text)

    def test_semantica_review_surface_marks_missing_semantic_artifact(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            write_json(run_dir / CORE_GRAPH_FILENAMES["layered_graph"], graph["layered_graph"])
            write_json(run_dir / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
            result = run_named_query(str(run_dir), "semantica-review-surface")
        separation = result["surface"]["separation"]
        self.assertFalse(separation["semantic_compare_artifact_present"])
        self.assertEqual("missing-run-doc-compare-first", separation["semantic_compare_status"])
        self.assertIsNone(separation["finding_count"])
        self.assertIsNone(separation["decision_grade_finding_count"])

    def test_semantica_review_surface_detects_candidate_like_target_leakage(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        mutated = deepcopy(graph["layered_graph"])
        mutated["target_architecture_view"] = deepcopy(mutated["target_architecture_view"])
        mutated["target_architecture_view"]["entities"] = deepcopy(mutated["target_architecture_view"]["entities"])
        leaked = deepcopy(mutated["target_architecture_view"]["entities"][0])
        leaked["id"] = "leaked.candidate.not.in.queue"
        leaked["status"] = "candidate"
        mutated["target_architecture_view"]["entities"].append(leaked)
        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            write_json(run_dir / CORE_GRAPH_FILENAMES["layered_graph"], mutated)
            write_json(run_dir / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
            result = run_named_query(str(run_dir), "semantica-review-surface")
        self.assertFalse(result["surface"]["separation"]["target_view_excludes_candidates"])

    def test_semantic_query_requires_semantic_artifact(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            (run_dir / CORE_GRAPH_FILENAMES["layered_graph"]).write_text(json.dumps(graph["layered_graph"]), encoding="utf-8")
            (run_dir / CORE_GRAPH_FILENAMES["candidate_queue"]).write_text(json.dumps(graph["candidate_queue"]), encoding="utf-8")
            with self.assertRaises(FileNotFoundError):
                run_named_query(str(run_dir), "decision-review-queue")

    def test_document_sweep_discovery_excludes_quarantine_and_archive(self) -> None:
        root = REPO_ROOT / "tools/semantica-workbench/fixtures/docs/sweep"
        discovered, skipped = discover_documents([str(root)], ["**/*.md"], ["quarantine", "archive"])
        discovered_paths = {rel(item["path"]) for item in discovered}
        skipped_paths = {item["path"] for item in skipped}
        self.assertIn("tools/semantica-workbench/fixtures/docs/sweep/active.md", discovered_paths)
        self.assertIn("tools/semantica-workbench/fixtures/docs/sweep/no-signal.md", discovered_paths)
        self.assertIn("tools/semantica-workbench/fixtures/docs/sweep/quarantine/skipped.md", skipped_paths)
        self.assertIn("tools/semantica-workbench/fixtures/docs/sweep/archive/skipped.md", skipped_paths)

    def test_document_sweep_custom_excludes_extend_defaults(self) -> None:
        excludes = effective_exclude_segments(["custom-skip"])
        self.assertIn("custom-skip", excludes)
        self.assertIn("quarantine", excludes)
        self.assertIn("archive", excludes)
        self.assertIn(".context", excludes)
        self.assertIn("node_modules", excludes)

    def test_document_sweep_missing_explicit_document_fails(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        base_root = REPO_ROOT / ".semantica" / "test-runs"
        base_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base_root) as directory:
            base_run = Path(directory)
            write_json(base_run / CORE_GRAPH_FILENAMES["layered_graph"], graph["layered_graph"])
            write_json(base_run / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
            with self.assertRaises(FileNotFoundError):
                run_document_sweep(documents=["missing-doc.md"], run=str(base_run))

    def test_document_sweep_generates_aggregate_outputs(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        base_root = REPO_ROOT / ".semantica" / "test-runs"
        base_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base_root) as directory:
            base_run = Path(directory)
            write_json(base_run / CORE_GRAPH_FILENAMES["layered_graph"], graph["layered_graph"])
            write_json(base_run / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
            write_json(base_run / CORE_GRAPH_FILENAMES["metadata"], {"kind": "test-core", "source": "test"})
            run_dir = run_document_sweep(
                roots=["tools/semantica-workbench/fixtures/docs/sweep"],
                run=str(base_run),
            )
        sweep = read_json(run_dir / CORE_GRAPH_FILENAMES["doc_sweep"])
        self.assertEqual(2, sweep["summary"]["documents_analyzed"])
        self.assertEqual(2, sweep["summary"]["documents_skipped"])
        by_path = {record["document_path"]: record for record in sweep["documents"]}
        self.assertEqual("aligned-active", by_path["tools/semantica-workbench/fixtures/docs/sweep/active.md"]["recommendation"])
        self.assertEqual("outside-scope", by_path["tools/semantica-workbench/fixtures/docs/sweep/no-signal.md"]["recommendation"])
        self.assertEqual(sum(record["counts"]["claims"] for record in sweep["documents"]), sweep["summary"]["total_claims"])
        pipeline = sweep["semantica_pipeline"]
        self.assertEqual("rawr-semantica-pipeline-proof-v1", pipeline["schema_version"])
        self.assertTrue(pipeline["rawr_policy"]["recommendation_categories_owned_by_rawr"])
        self.assertTrue(pipeline["fallback"]["current_sweep_loop_retained"])
        self.assertEqual(sweep["summary"]["recommendations"], pipeline["sweep_shape"]["recommendations"])
        self.assertTrue(pipeline["status"]["available"])
        self.assertEqual("partial-dag-execution-proof", pipeline["status"]["classification"])
        self.assertTrue(pipeline["status"]["run_state_api_present"])
        self.assertTrue(pipeline["execution"]["success"])
        self.assertEqual(5, pipeline["execution"]["steps_executed"])
        self.assertIn("PipelineStatus.", pipeline["execution"]["pipeline_status"])
        self.assertTrue((run_dir / CORE_GRAPH_FILENAMES["doc_sweep_report"]).exists())
        index_path = run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"]
        self.assertTrue(index_path.exists())
        index = read_json(index_path)
        self.assertEqual("rawr-sweep-evidence-index-v1", index["schema_version"])
        self.assertEqual(2, index["summary"]["documents_indexed"])
        self.assertEqual(sum(record["counts"]["claims"] for record in sweep["documents"]), index["summary"]["claim_count"])
        self.assertEqual(sum(record["counts"]["findings"] for record in sweep["documents"]), index["summary"]["finding_count"])
        self.assertEqual(sweep["summary"]["decision_grade_findings"], index["summary"]["decision_grade_finding_count"])
        self.assertEqual(0, index["summary"]["warning_count"])
        self.assertFalse(index["authority_boundary"]["generated_evidence_is_truth"])
        self.assertTrue(index["authority_boundary"]["reviewed_rawr_ontology_remains_authority"])
        self.assertTrue(index["authority_boundary"]["promotion_requires_human_review"])
        self.assertTrue(index["authority_boundary"]["llm_output_is_evidence_only"])
        self.assertEqual(index["authority_boundary"], read_json(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_summary"])["authority_boundary"])
        document = index["documents"][0]
        for key in (
            "run_id",
            "document_path",
            "artifact_paths",
            "semantic_compare_artifact",
            "report_html_artifact",
            "index_status",
            "semantic_summary",
        ):
            self.assertIn(key, document)
        claim = index["claims"][0]
        for key in (
            "index_id",
            "run_id",
            "document_path",
            "source_path",
            "line_start",
            "line_end",
            "char_start",
            "char_end",
            "char_span_kind",
            "heading_path",
            "text",
            "source_span",
            "confidence",
            "review_state",
            "promotion_allowed",
            "report_html_artifact",
        ):
            self.assertIn(key, claim)
        self.assertFalse(claim["promotion_allowed"])
        self.assertEqual(claim["source_path"], claim["source_span"]["source_path"])
        self.assertEqual(claim["char_start"], claim["source_span"]["char_start"])
        claim_index_ids = {claim["index_id"] for claim in index["claims"]}
        self.assertTrue(index["findings"])
        finding = index["findings"][0]
        for key in (
            "index_id",
            "finding_id",
            "claim_id",
            "claim_index_id",
            "source_path",
            "line_start",
            "line_end",
            "char_start",
            "char_end",
            "char_span_kind",
            "heading_path",
            "text",
            "source_span",
            "kind",
            "rule",
            "review_action",
            "confidence",
            "promotion_allowed",
            "report_html_artifact",
        ):
            self.assertIn(key, finding)
        self.assertFalse(finding["promotion_allowed"])
        self.assertEqual(finding["source_path"], finding["source_span"]["source_path"])
        self.assertTrue(all(row["claim_index_id"] in claim_index_ids for row in index["findings"]))
        self.assertTrue((run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_summary"]).exists())
        jsonl_rows = (run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_jsonl"]).read_text(encoding="utf-8").splitlines()
        self.assertEqual(1 + len(index["documents"]) + len(index["claims"]) + len(index["findings"]), len(jsonl_rows))
        evidence_ttl = run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_ttl"]
        self.assertTrue(evidence_ttl.exists())
        from rdflib import Graph, Namespace, RDF

        rdf_graph = Graph()
        rdf_graph.parse(evidence_ttl, format="turtle")
        rawr = Namespace("https://rawr.dev/ontology/")
        self.assertEqual(len(index["documents"]), len(list(rdf_graph.subjects(RDF.type, rawr.IndexedDocument))))
        self.assertEqual(len(index["claims"]), len(list(rdf_graph.subjects(RDF.type, rawr.EvidenceClaim))))
        self.assertEqual(len(index["findings"]), len(list(rdf_graph.subjects(RDF.type, rawr.ReviewFinding))))
        self.assertEqual(
            len(index["documents"]) + len(index["claims"]) + len(index["findings"]),
            len(list(rdf_graph.subjects(rawr.partOfEvidenceIndex, None))),
        )
        sparql = run_sparql_query(str(run_dir), Path("tools/semantica-workbench/queries/evidence-prohibited-patterns.rq"))
        self.assertEqual(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_ttl"], REPO_ROOT / sparql["evidence_index_graph"])
        prohibited_count = sum(
            1
            for row in index["findings"]
            if "forbidden_pattern" in str(row.get("entity_id") or "") or "prohibited" in str(row.get("rule") or "")
        )
        self.assertEqual(prohibited_count, sparql["row_count"])
        candidate_rows = run_sparql_query(str(run_dir), Path("tools/semantica-workbench/queries/evidence-candidate-new.rq"))
        candidate_count = sum(1 for row in index["findings"] if row.get("kind") == "candidate-new")
        self.assertEqual(candidate_count, candidate_rows["row_count"])
        self.assertTrue(all(row.get("reviewAction") for row in candidate_rows["rows"]))
        with self.assertRaises(FileNotFoundError):
            run_sparql_query(str(run_dir), Path("tools/semantica-workbench/queries/relation-samples.rq"))
        evidence_html = run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_html"]
        self.assertTrue(evidence_html.exists())
        evidence_html_text = evidence_html.read_text(encoding="utf-8")
        self.assertIn("Corpus Evidence Index", evidence_html_text)
        self.assertIn("Review Queue", evidence_html_text)
        self.assertIn("Candidate New", evidence_html_text)
        self.assertIn("Per-Document Evidence", evidence_html_text)
        self.assertIn("Open report", evidence_html_text)
        for document in index["documents"]:
            report_html = document.get("report_html_artifact")
            if report_html:
                self.assertTrue((REPO_ROOT / report_html).exists(), report_html)
        self.assert_report_links_resolve(evidence_html)
        current_evidence_html = REPO_ROOT / ".semantica/current" / CORE_GRAPH_FILENAMES["sweep_evidence_index_html"]
        self.assertTrue(current_evidence_html.exists())
        self.assert_report_links_resolve(current_evidence_html)
        sweep_html = run_dir / CORE_GRAPH_FILENAMES["doc_sweep_report_html"]
        self.assertTrue(sweep_html.exists())
        html_text = sweep_html.read_text(encoding="utf-8")
        self.assertIn("Semantic Evidence Sweep", html_text)
        self.assertIn("Per-Document Detail", html_text)
        active_record = by_path["tools/semantica-workbench/fixtures/docs/sweep/active.md"]
        self.assertTrue(active_record["artifact_paths"]["report_html"].endswith("/semantic-compare-report.html"))
        self.assertTrue((run_dir / "documents" / document_slug(Path(active_record["document_path"])) / CORE_GRAPH_FILENAMES["semantic_compare_report_html"]).exists())
        self.assertIn("semantic-compare-report.html", html_text)
        self.assertTrue((run_dir / "documents").exists())
        viewer_text = (run_dir / CORE_GRAPH_FILENAMES["viewer"]).read_text(encoding="utf-8")
        match = re.search(r'<script id="graph-data" type="application/json">(.*?)</script>', viewer_text, re.S)
        self.assertIsNotNone(match)
        payload = json.loads(match.group(1))
        self.assertEqual(2, payload["sweep"]["summary"]["documents_analyzed"])

    def assert_report_links_resolve(self, html_path: Path) -> None:
        html_text = html_path.read_text(encoding="utf-8")
        hrefs = re.findall(r'<a class="report-link" href="([^"]+)"', html_text)
        self.assertTrue(hrefs)
        for href in hrefs:
            parsed = urlparse(href)
            if parsed.scheme == "file":
                target = Path(unquote(parsed.path))
            elif Path(unquote(href)).is_absolute():
                target = Path(unquote(href))
            else:
                target = (html_path.parent / unquote(href)).resolve()
            self.assertTrue(target.exists(), f"{href} from {html_path} resolved to missing {target}")

    def test_evidence_index_sparql_is_scoped_to_projection(self) -> None:
        from rdflib import Graph, Namespace, RDF

        base_root = REPO_ROOT / ".semantica" / "test-runs"
        base_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base_root) as directory:
            run_dir = Path(directory)
            index = {
                "schema_version": "rawr-sweep-evidence-index-v1",
                "run_id": "synthetic-evidence-index",
                "git_sha": "test",
                "summary": {"documents_indexed": 2, "claim_count": 1, "finding_count": 1},
                "documents": [
                    {
                        "document_path": "docs/a-b.md",
                        "path_class": "high",
                        "recommendation": "review-needed",
                        "confidence": "medium",
                    },
                    {
                        "document_path": "docs/a_b.md",
                        "path_class": "high",
                        "recommendation": "review-needed",
                        "confidence": "medium",
                    },
                ],
                "claims": [
                    {
                        "index_id": "docs/a-b.md#claim-1",
                        "claim_id": "claim-1",
                        "sweep_document_path": "docs/a-b.md",
                        "document_path": "docs/a-b.md",
                        "source_path": "docs/a-b.md",
                        "line_start": 10,
                        "line_end": 10,
                        "char_start": 0,
                        "char_end": 28,
                        "text": "Introduce a candidate concept.",
                        "resolution_state": "candidate-new",
                        "review_state": "evidence-only",
                    }
                ],
                "findings": [
                    {
                        "index_id": "docs/a-b.md#finding-1",
                        "finding_id": "finding-1",
                        "claim_id": "claim-1",
                        "claim_index_id": "docs/a-b.md#claim-1",
                        "sweep_document_path": "docs/a-b.md",
                        "document_path": "docs/a-b.md",
                        "source_path": "docs/a-b.md",
                        "line_start": 10,
                        "line_end": 10,
                        "char_start": 0,
                        "char_end": 28,
                        "kind": "candidate-new",
                        "rule": "candidate_concept_requires_review",
                        "review_action": "Review as candidate; do not promote.",
                        "resolution_state": "candidate-new",
                    }
                ],
            }
            evidence_ttl = run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_ttl"]
            evidence_ttl.write_text(evidence_index_turtle(index), encoding="utf-8")
            (run_dir / CORE_GRAPH_FILENAMES["doc_sweep_ttl"]).write_text(
                "\n".join(
                    [
                        "@prefix rawr: <https://rawr.dev/ontology/> .",
                        "@prefix evidence: <https://rawr.dev/evidence/> .",
                        "",
                        "evidence:legacy-finding a rawr:ReviewFinding ;",
                        "  rawr:findingKind \"candidate-new\" ;",
                        "  rawr:partOfSweepRecord evidence:legacy-sweep ;",
                        "  rawr:derivedFrom evidence:legacy-claim ;",
                        "  rawr:sourcePath \"docs/a-b.md\" ;",
                        "  rawr:lineStart \"10\" .",
                        "",
                    ]
                ),
                encoding="utf-8",
            )
            graph = Graph()
            graph.parse(evidence_ttl, format="turtle")
            rawr = Namespace("https://rawr.dev/ontology/")
            self.assertEqual(2, len(list(graph.subjects(RDF.type, rawr.IndexedDocument))))
            candidate_rows = run_sparql_query(str(run_dir), Path("tools/semantica-workbench/queries/evidence-candidate-new.rq"))
            self.assertEqual("evidence-index", candidate_rows["graph_mode"])
            self.assertEqual(1, candidate_rows["row_count"])
            self.assertEqual("Review as candidate; do not promote.", candidate_rows["rows"][0]["reviewAction"])

    def test_semantic_evidence_sparql_does_not_require_core_graph(self) -> None:
        base_root = REPO_ROOT / ".semantica" / "test-runs"
        base_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base_root) as directory:
            run_dir = Path(directory)
            (run_dir / CORE_GRAPH_FILENAMES["semantic_evidence_ttl"]).write_text(
                "\n".join(
                    [
                        "@prefix rawr: <https://rawr.dev/ontology/> .",
                        "@prefix evidence: <https://rawr.dev/evidence/> .",
                        "",
                        "evidence:finding-1 a rawr:ReviewFinding ;",
                        "  rawr:findingKind \"aligned\" ;",
                        "  rawr:derivedFrom evidence:claim-1 ;",
                        "  rawr:rule \"synthetic_rule\" .",
                        "",
                    ]
                ),
                encoding="utf-8",
            )
            result = run_sparql_query(str(run_dir), Path("tools/semantica-workbench/queries/semantic-findings.rq"))
            self.assertEqual("semantic-evidence", result["graph_mode"])
            self.assertEqual(1, result["row_count"])
            with self.assertRaises(FileNotFoundError):
                run_sparql_query(str(run_dir), Path("tools/semantica-workbench/queries/relation-samples.rq"))

    def test_document_sweep_evidence_index_reports_missing_artifacts(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        base_root = REPO_ROOT / ".semantica" / "test-runs"
        base_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base_root) as directory:
            base_run = Path(directory)
            write_json(base_run / CORE_GRAPH_FILENAMES["layered_graph"], graph["layered_graph"])
            write_json(base_run / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
            write_json(base_run / CORE_GRAPH_FILENAMES["metadata"], {"kind": "test-core", "source": "test"})
            run_dir = run_document_sweep(
                documents=["tools/semantica-workbench/fixtures/docs/sweep/active.md"],
                run=str(base_run),
            )
        sweep = read_json(run_dir / CORE_GRAPH_FILENAMES["doc_sweep"])
        semantic_path = REPO_ROOT / sweep["documents"][0]["artifact_paths"]["semantic_compare"]
        semantic_path.unlink()
        with self.assertRaises(FileNotFoundError):
            build_sweep_evidence_index(run_dir)
        index = write_sweep_evidence_index(run_dir, strict=False)
        self.assertEqual(0, index["summary"]["documents_indexed"])
        self.assertEqual(1, index["summary"]["documents_with_missing_artifacts"])
        self.assertEqual(1, index["summary"]["warning_count"])
        self.assertEqual("missing-semantic-compare-artifact", index["warnings"][0]["kind"])

    def test_document_sweep_evidence_index_rejects_dangling_finding_claims(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        base_root = REPO_ROOT / ".semantica" / "test-runs"
        base_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base_root) as directory:
            base_run = Path(directory)
            write_json(base_run / CORE_GRAPH_FILENAMES["layered_graph"], graph["layered_graph"])
            write_json(base_run / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
            write_json(base_run / CORE_GRAPH_FILENAMES["metadata"], {"kind": "test-core", "source": "test"})
            run_dir = run_document_sweep(
                documents=["tools/semantica-workbench/fixtures/docs/sweep/active.md"],
                run=str(base_run),
            )
        sweep = read_json(run_dir / CORE_GRAPH_FILENAMES["doc_sweep"])
        semantic_path = REPO_ROOT / sweep["documents"][0]["artifact_paths"]["semantic_compare"]
        compare = read_json(semantic_path)
        self.assertTrue(compare["findings"])
        compare["findings"][0]["claim_id"] = "claim.missing"
        write_json(semantic_path, compare)
        with self.assertRaisesRegex(RuntimeError, "integrity validation failed"):
            build_sweep_evidence_index(run_dir)
        index = write_sweep_evidence_index(run_dir, strict=False)
        self.assertEqual(1, index["summary"]["warning_count"])
        self.assertEqual("finding-references-missing-claim", index["warnings"][0]["kind"])
        self.assertIsNotNone(index["findings"][0]["source_span"])

    def test_document_sweep_evidence_index_rejects_malformed_claim_ids(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        base_root = REPO_ROOT / ".semantica" / "test-runs"
        base_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base_root) as directory:
            base_run = Path(directory)
            write_json(base_run / CORE_GRAPH_FILENAMES["layered_graph"], graph["layered_graph"])
            write_json(base_run / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
            write_json(base_run / CORE_GRAPH_FILENAMES["metadata"], {"kind": "test-core", "source": "test"})
            run_dir = run_document_sweep(
                documents=["tools/semantica-workbench/fixtures/docs/sweep/active.md"],
                run=str(base_run),
            )
        sweep = read_json(run_dir / CORE_GRAPH_FILENAMES["doc_sweep"])
        semantic_path = REPO_ROOT / sweep["documents"][0]["artifact_paths"]["semantic_compare"]
        compare = read_json(semantic_path)
        self.assertTrue(compare["claims"])
        compare["claims"].append(deepcopy(compare["claims"][0]))
        compare["findings"][0]["claim_id"] = ""
        write_json(semantic_path, compare)
        with self.assertRaisesRegex(RuntimeError, "integrity validation failed"):
            build_sweep_evidence_index(run_dir)
        index = write_sweep_evidence_index(run_dir, strict=False)
        warning_kinds = {warning["kind"] for warning in index["warnings"]}
        self.assertIn("duplicate-claim-index-id", warning_kinds)
        self.assertIn("finding-missing-claim-id", warning_kinds)

    def test_document_sweep_explicit_excluded_doc_is_tagged_and_compared(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        base_root = REPO_ROOT / ".semantica" / "test-runs"
        base_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base_root) as directory:
            base_run = Path(directory)
            write_json(base_run / CORE_GRAPH_FILENAMES["layered_graph"], graph["layered_graph"])
            write_json(base_run / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
            write_json(base_run / CORE_GRAPH_FILENAMES["metadata"], {"kind": "test-core", "source": "test"})
            run_dir = run_document_sweep(
                documents=["tools/semantica-workbench/fixtures/docs/sweep/quarantine/skipped.md"],
                run=str(base_run),
            )
        sweep = read_json(run_dir / CORE_GRAPH_FILENAMES["doc_sweep"])
        self.assertEqual(1, sweep["summary"]["documents_analyzed"])
        record = sweep["documents"][0]
        self.assertEqual("explicit-excluded-path", record["path_class"])
        self.assertEqual("quarantine-candidate", record["recommendation"])
        self.assertGreater(record["counts"]["conflict"], 0)

    def test_document_sweep_review_queue_includes_source_authority_regressions(self) -> None:
        sweep = {
            "documents": [
                {
                    "document_path": "source.md",
                    "recommendation": "source-authority",
                    "counts": {"decision_grade": 2},
                },
                {
                    "document_path": "aligned.md",
                    "recommendation": "source-authority",
                    "counts": {"decision_grade": 0},
                },
            ]
        }
        queue = review_queue_records(sweep)
        self.assertEqual(["source.md"], [item["document_path"] for item in queue])

    def test_sweep_named_queries_execute(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        base_root = REPO_ROOT / ".semantica" / "test-runs"
        base_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base_root) as directory:
            base_run = Path(directory)
            write_json(base_run / CORE_GRAPH_FILENAMES["layered_graph"], graph["layered_graph"])
            write_json(base_run / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
            write_json(base_run / CORE_GRAPH_FILENAMES["metadata"], {"kind": "test-core", "source": "test"})
            run_dir = run_document_sweep(
                roots=[],
                documents=["tools/semantica-workbench/fixtures/docs/sweep/quarantine/skipped.md"],
                run=str(base_run),
            )
        for query_name in [
            "sweep-summary",
            "sweep-review-queue",
            "sweep-quarantine-candidates",
            "sweep-update-candidates",
            "sweep-no-signal-documents",
            "sweep-high-ambiguity-docs",
        ]:
            result = run_named_query(str(run_dir), query_name)
            self.assertEqual(query_name, result["query"])
            text = render_query_text(result)
            self.assertIn("artifact:", text)

    def test_evidence_index_named_queries_execute(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        base_root = REPO_ROOT / ".semantica" / "test-runs"
        base_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base_root) as directory:
            base_run = Path(directory)
            write_json(base_run / CORE_GRAPH_FILENAMES["layered_graph"], graph["layered_graph"])
            write_json(base_run / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
            write_json(base_run / CORE_GRAPH_FILENAMES["metadata"], {"kind": "test-core", "source": "test"})
            run_dir = run_document_sweep(
                roots=["tools/semantica-workbench/fixtures/docs/sweep"],
                run=str(base_run),
            )
        index = read_json(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"])
        report_html = REPO_ROOT / index["documents"][0]["report_html_artifact"]
        if report_html.exists():
            report_html.unlink()
        query_names = [
            "evidence-summary",
            "evidence-review-queue",
            "evidence-candidate-new",
            "evidence-unresolved-targets",
            "evidence-source-authority-signals",
            "evidence-prohibited-pattern-mentions",
            "evidence-weak-modality-hotspots",
            "evidence-by-document",
            "evidence-by-entity",
        ]
        for query_name in query_names:
            result = run_named_query(str(run_dir), query_name)
            self.assertEqual(query_name, result["query"])
            self.assertIn("artifact", result)
            self.assertFalse(result["authority_boundary"]["generated_evidence_is_truth"])
            text = render_query_text(result)
            self.assertIn("artifact:", text)
        summary = run_named_query(str(run_dir), "evidence-summary")
        self.assertEqual(0, summary["summary"]["warning_count"])
        review_queue = run_named_query(str(run_dir), "evidence-review-queue")
        self.assertTrue(
            all(
                not str(item.get("review_action") or "").startswith("No action required")
                and not str(item.get("review_action") or "").startswith("No architecture action")
                for item in review_queue["items"]
            )
        )
        self.assertTrue(all("source_span" in item for item in review_queue["items"]))
        if review_queue["items"]:
            review_text = render_query_text(review_queue)
            self.assertIn("report=", review_text)
        candidates = run_named_query(str(run_dir), "evidence-candidate-new")
        self.assertTrue(all(item["kind"] == "candidate-new" for item in candidates["items"]))
        unresolved = run_named_query(str(run_dir), "evidence-unresolved-targets")
        self.assertTrue(
            all(
                item["resolution_state"] == "unresolved"
                or item.get("ambiguity_bucket") == "unresolved-target"
                or item["rule"] == "no_resolved_decision_target"
                for item in unresolved["items"]
            )
        )
        source_authority = run_named_query(str(run_dir), "evidence-source-authority-signals")
        self.assertTrue(all(document["path_class"] == "source-authority" for document in source_authority["documents"]))
        prohibited = run_named_query(str(run_dir), "evidence-prohibited-pattern-mentions")
        self.assertTrue(prohibited["items"])
        self.assertTrue(
            all(
                item["resolution_state"] == "resolved-prohibited-construction"
                or str(item.get("entity_id") or "").startswith("forbidden.pattern.")
                or "prohibited" in item["rule"]
                for item in prohibited["items"]
            )
        )
        self.assertIn("source_span", prohibited["items"][0])
        prohibited_text = render_query_text(prohibited)
        self.assertIn("negative_or_prohibitive_claim_rejects_prohibited_construction", prohibited_text)
        self.assertIn("forbidden.pattern", prohibited_text)
        self.assertIn("report=", prohibited_text)
        by_document = run_named_query(str(run_dir), "evidence-by-document")
        self.assertEqual(2, len(by_document["documents"]))
        self.assertIn("examples", by_document["documents"][0])
        weak_modality = run_named_query(str(run_dir), "evidence-weak-modality-hotspots")
        self.assertEqual([], weak_modality["hotspots"])
        by_entity = run_named_query(str(run_dir), "evidence-by-entity")
        self.assertTrue(by_entity["entities"])
        self.assertTrue(all("kind_counts" in entity for entity in by_entity["entities"]))

    def test_evidence_named_query_requires_index(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            write_json(run_dir / CORE_GRAPH_FILENAMES["layered_graph"], graph["layered_graph"])
            write_json(run_dir / CORE_GRAPH_FILENAMES["candidate_queue"], graph["candidate_queue"])
            with self.assertRaises(FileNotFoundError):
                run_named_query(str(run_dir), "evidence-summary")


if __name__ == "__main__":
    unittest.main()
