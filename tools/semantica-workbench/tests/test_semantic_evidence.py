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


class SemanticEvidenceTests(WorkbenchTestCase):
    def test_semantic_evidence_fixture_verdicts(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(
            fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True
        )
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
        self.assertEqual(
            "semantica-triplet-proof-with-rawr-evidence-line-adapter",
            evidence["semantica_pilot"]["summary"]["adapter_mode"],
        )
        self.assertFalse(evidence["semantica_pilot"]["summary"]["promotion_allowed"])
        self.assertTrue(all(claim["extractor"] == "rawr-semantic-heuristic-v1" for claim in evidence["claims"]))

    def test_semantic_evidence_defaults_semantica_pilot_off(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(
            fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True
        )
        self.assertEqual("disabled", evidence["semantica_pilot"]["status"]["classification"])
        self.assertFalse(evidence["semantica_pilot"]["summary"]["promotion_allowed"])

    def test_semantic_opposite_claims_do_not_collapse(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(
            fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True
        )
        compare = compare_evidence_to_ontology(evidence, graph["layered_graph"], graph["candidate_queue"])
        line3 = [
            finding
            for finding in compare["findings"]
            if finding["line_start"] == 3 and finding["entity_id"] == "forbidden.pattern.root-core-authoring-root"
        ]
        line7 = [
            finding
            for finding in compare["findings"]
            if finding["line_start"] == 7 and finding["entity_id"] == "forbidden.pattern.root-core-authoring-root"
        ]
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
        findings = [
            item
            for item in compare["findings"]
            if item.get("entity_id") == "forbidden.pattern.root-core-authoring-root"
        ]
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
        evidence = extract_evidence_claims(
            fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True
        )
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
        evidence = extract_evidence_claims(
            fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True
        )
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
        evidence = extract_evidence_claims(
            fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True
        )
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
