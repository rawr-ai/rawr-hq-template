from __future__ import annotations

import unittest
from copy import deepcopy
import json
import re
import tempfile
from pathlib import Path

from semantica_workbench.chunking import chunk_markdown
from semantica_workbench.core_ontology import (
    TESTING_PLAN,
    build_document_diff,
    build_graph_payload,
    load_core_ontology,
    validate_loaded_core_ontology,
)
from semantica_workbench.core_config import CORE_GRAPH_FILENAMES
from semantica_workbench.core_viewer import build_cytoscape_payload, write_html_viewer
from semantica_workbench.core_query import run_named_query
from semantica_workbench.extraction import heuristic_extract
from semantica_workbench.io import rel
from semantica_workbench.manifest import load_manifest
from semantica_workbench.paths import FIXTURE_MANIFEST
from semantica_workbench.seeding import build_seed_graph
from semantica_workbench.semantic_evidence import (
    compare_evidence_to_ontology,
    extract_evidence_claims,
    fixture_document_path,
    load_fixture_expectations,
    semantic_capability_probe,
)


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


if __name__ == "__main__":
    unittest.main()
