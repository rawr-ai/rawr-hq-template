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


class DocumentSweepTests(WorkbenchTestCase):
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
        self.assertEqual(
            "aligned-active", by_path["tools/semantica-workbench/fixtures/docs/sweep/active.md"]["recommendation"]
        )
        self.assertEqual(
            "outside-scope", by_path["tools/semantica-workbench/fixtures/docs/sweep/no-signal.md"]["recommendation"]
        )
        self.assertEqual(
            sum(record["counts"]["claims"] for record in sweep["documents"]), sweep["summary"]["total_claims"]
        )
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
        self.assertEqual(
            sum(record["counts"]["claims"] for record in sweep["documents"]), index["summary"]["claim_count"]
        )
        self.assertEqual(
            sum(record["counts"]["findings"] for record in sweep["documents"]), index["summary"]["finding_count"]
        )
        self.assertEqual(sweep["summary"]["decision_grade_findings"], index["summary"]["decision_grade_finding_count"])
        self.assertEqual(0, index["summary"]["warning_count"])
        self.assertFalse(index["authority_boundary"]["generated_evidence_is_truth"])
        self.assertTrue(index["authority_boundary"]["reviewed_rawr_ontology_remains_authority"])
        self.assertTrue(index["authority_boundary"]["promotion_requires_human_review"])
        self.assertTrue(index["authority_boundary"]["llm_output_is_evidence_only"])
        self.assertEqual(
            index["authority_boundary"],
            read_json(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_summary"])["authority_boundary"],
        )
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
        jsonl_rows = (
            (run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_jsonl"]).read_text(encoding="utf-8").splitlines()
        )
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
        sparql = run_sparql_query(
            str(run_dir), Path("tools/semantica-workbench/queries/evidence-prohibited-patterns.rq")
        )
        self.assertEqual(
            run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_ttl"], REPO_ROOT / sparql["evidence_index_graph"]
        )
        prohibited_count = sum(
            1
            for row in index["findings"]
            if "forbidden_pattern" in str(row.get("entity_id") or "") or "prohibited" in str(row.get("rule") or "")
        )
        self.assertEqual(prohibited_count, sparql["row_count"])
        candidate_rows = run_sparql_query(
            str(run_dir), Path("tools/semantica-workbench/queries/evidence-candidate-new.rq")
        )
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
        agent_manifest_path = run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_agent_manifest"]
        self.assertTrue(agent_manifest_path.exists())
        agent_manifest = read_json(agent_manifest_path)
        self.assertEqual("rawr-sweep-evidence-agent-manifest-v1", agent_manifest["schema_version"])
        self.assertFalse(agent_manifest["authority_boundary"]["generated_evidence_is_truth"])
        self.assertTrue(agent_manifest["authority_boundary"]["agent_outputs_are_review_aids"])
        self.assertIn(
            "evidence-review-queue", [item["name"] for item in agent_manifest["stable_interfaces"]["named_queries"]]
        )
        self.assertIn(
            "tools/semantica-workbench/queries/evidence-candidate-new.rq",
            [item["path"] for item in agent_manifest["stable_interfaces"]["sparql_examples"]],
        )
        self.assertEqual("evidence-index", agent_manifest["stable_interfaces"]["sparql_examples"][0]["graph_mode"])
        self.assertTrue(agent_manifest["stable_interfaces"]["sparql_examples"][0]["preserves_review_context"])
        aggregate_examples = [
            item for item in agent_manifest["stable_interfaces"]["sparql_examples"] if item["usage"] == "aggregate_only"
        ]
        self.assertTrue(aggregate_examples)
        self.assertFalse(aggregate_examples[0]["preserves_review_context"])
        self.assertIn("mcp", agent_manifest)
        self.assertIn(agent_manifest["mcp"]["generic_semantica_mcp_status"], {"available", "blocked"})
        self.assertEqual("not-wired", agent_manifest["mcp"]["rawr_evidence_access_status"])
        self.assertNotIn(".semantica/current", json.dumps(agent_manifest["stable_interfaces"]["named_queries"]))
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
        self.assertTrue(
            (
                run_dir
                / "documents"
                / document_slug(Path(active_record["document_path"]))
                / CORE_GRAPH_FILENAMES["semantic_compare_report_html"]
            ).exists()
        )
        self.assertIn("semantic-compare-report.html", html_text)
        self.assertTrue((run_dir / "documents").exists())
        viewer_text = (run_dir / CORE_GRAPH_FILENAMES["viewer"]).read_text(encoding="utf-8")
        match = re.search(r'<script id="graph-data" type="application/json">(.*?)</script>', viewer_text, re.S)
        self.assertIsNotNone(match)
        payload = json.loads(match.group(1))
        self.assertEqual(2, payload["sweep"]["summary"]["documents_analyzed"])

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
