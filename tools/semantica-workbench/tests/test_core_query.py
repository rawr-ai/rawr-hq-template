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


class CoreQueryTests(WorkbenchTestCase):
    def test_semantic_query_names_execute(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(
            fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True
        )
        compare = compare_evidence_to_ontology(evidence, graph["layered_graph"], graph["candidate_queue"])
        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            (run_dir / CORE_GRAPH_FILENAMES["layered_graph"]).write_text(
                json.dumps(graph["layered_graph"]), encoding="utf-8"
            )
            (run_dir / CORE_GRAPH_FILENAMES["candidate_queue"]).write_text(
                json.dumps(graph["candidate_queue"]), encoding="utf-8"
            )
            (run_dir / CORE_GRAPH_FILENAMES["semantic_compare"]).write_text(json.dumps(compare), encoding="utf-8")
            for query_name in NAMED_QUERY_DESCRIPTIONS:
                if (
                    query_name.startswith("sweep-")
                    or query_name.startswith("proposal-")
                    or query_name.startswith("evidence-")
                ):
                    continue
                result = run_named_query(str(run_dir), query_name)
                self.assertEqual(query_name, result["query"])
            ambiguity = run_named_query(str(run_dir), "ambiguity-summary")
            self.assertEqual(
                compare["summary"]["ambiguous_by_bucket"], {row["bucket"]: row["count"] for row in ambiguity["buckets"]}
            )
            decision_queue = run_named_query(str(run_dir), "decision-review-queue")
            text = render_query_text(decision_queue)
            self.assertIn("artifact:", text)
            self.assertIn("document:", text)

    def test_semantica_review_surface_query_reports_mcp_export_and_boundaries(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(
            fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True
        )
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
            (run_dir / CORE_GRAPH_FILENAMES["layered_graph"]).write_text(
                json.dumps(graph["layered_graph"]), encoding="utf-8"
            )
            (run_dir / CORE_GRAPH_FILENAMES["candidate_queue"]).write_text(
                json.dumps(graph["candidate_queue"]), encoding="utf-8"
            )
            with self.assertRaises(FileNotFoundError):
                run_named_query(str(run_dir), "decision-review-queue")

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
            "evidence-agent-manifest",
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
        agent_manifest = run_named_query(str(run_dir), "evidence-agent-manifest")
        self.assertEqual("rawr-sweep-evidence-agent-manifest-v1", agent_manifest["manifest"]["schema_version"])
        self.assertIn("stable_interfaces", agent_manifest["manifest"])
        self.assertEqual(
            ["evidence-review-queue", "evidence-candidate-new", "evidence-by-entity"],
            [item["query"] for item in agent_manifest["manifest"]["question_map"][:3]],
        )
        entity_question = agent_manifest["manifest"]["question_map"][2]
        self.assertIn("resolved target concepts", entity_question["question"])
        self.assertIn("candidate", entity_question["authority_note"])
        self.assertEqual("not-wired", agent_manifest["manifest"]["mcp"]["rawr_evidence_access_status"])
        listed = run_named_query(str(run_dir), "evidence-summary")
        self.assertEqual(agent_manifest["summary"]["claim_count"], listed["summary"]["claim_count"])

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
