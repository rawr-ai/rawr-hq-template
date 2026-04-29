from __future__ import annotations

# ruff: noqa: F401

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
from semantica_workbench.document_sweep import (
    discover_documents,
    document_slug,
    effective_exclude_segments,
    review_queue_records,
    run_document_sweep,
)
from semantica_workbench.evidence_index import (
    build_sweep_evidence_index,
    evidence_index_turtle,
    write_sweep_evidence_index,
)
from semantica_workbench.extraction import heuristic_extract
from semantica_workbench.io import read_json, rel, write_json
import semantica_workbench.llm_augmentation as augmentation_module
from semantica_workbench.manifest import load_manifest
from semantica_workbench.paths import FIXTURE_MANIFEST, REPO_ROOT
from semantica_workbench.seeding import build_seed_graph
from semantica_workbench.semantica_extraction import semantica_extraction_pilot
import semantica_workbench.semantica_llm_extraction as llm_module
from semantica_workbench.llm_augmentation import write_llm_evidence_augmentation
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

from support import (
    FakeEntity,
    FakeTriplet,
    WorkbenchTestCase,
    frame_evidence_ref,
    minimal_architecture_change_frame,
    write_reference_geometry_bundle,
)


class CoreOntologyTests(WorkbenchTestCase):
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
        verification_entity = next(
            entity for entity in ontology["entities"] if entity["type"] == "VerificationPolicyConcept"
        )
        verification_entity["status"] = "locked"
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        for view_name in ["canonical_graph"]:
            self.assertFalse(
                any(entity["type"] == "VerificationPolicyConcept" for entity in graph[view_name]["entities"])
            )
        self.assertFalse(
            any(
                entity["type"] == "VerificationPolicyConcept"
                for entity in graph["layered_graph"]["canonical_view"]["entities"]
            )
        )
        self.assertFalse(
            any(
                entity["type"] == "VerificationPolicyConcept"
                for entity in graph["layered_graph"]["target_architecture_view"]["entities"]
            )
        )

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
        self.assertTrue(
            all(
                targets[relation["object"]]["type"] == "VerificationPolicyConcept"
                for relation in testing_authority_edges
            )
        )

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
        self.assertTrue(
            all(edge["data"]["source"] in node_ids and edge["data"]["target"] in node_ids for edge in edges)
        )
        candidate_nodes = [node for node in nodes if node["data"]["status"] == "candidate"]
        self.assertGreater(len(candidate_nodes), 0)
        self.assertTrue(all(not node["data"]["isCanonical"] for node in candidate_nodes))

    def test_named_query_forbidden_terms(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            (run_dir / CORE_GRAPH_FILENAMES["layered_graph"]).write_text(
                json.dumps(graph["layered_graph"]), encoding="utf-8"
            )
            (run_dir / CORE_GRAPH_FILENAMES["candidate_queue"]).write_text(
                json.dumps(graph["candidate_queue"]), encoding="utf-8"
            )
            result = run_named_query(str(run_dir), "forbidden-terms")
        self.assertEqual("forbidden-terms", result["query"])
        self.assertGreater(len(result["entities"]), 0)
        self.assertTrue(
            all(item["status"] == "forbidden" or item["type"] == "ForbiddenPattern" for item in result["entities"])
        )
