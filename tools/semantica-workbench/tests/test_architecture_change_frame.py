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


class ArchitectureChangeFrameTests(WorkbenchTestCase):
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
        self.assertEqual(
            ["comparison-only", "not-used"],
            schema["$defs"]["governance"]["properties"]["reference_geometry_status"]["enum"],
        )
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
        external_slot = next(
            item for item in comparisons if "comparison vocabulary extension slot" in item["source_claim"]["text"]
        )
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
            self.assertEqual(
                claim["text"],
                span_text_for_ref(
                    claim["source_path"], claim["line_start"], claim["line_end"], claim["char_start"], claim["char_end"]
                ),
            )
            package = build_architecture_change_frame_package(
                document, graph["layered_graph"], graph["candidate_queue"]
            )
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
