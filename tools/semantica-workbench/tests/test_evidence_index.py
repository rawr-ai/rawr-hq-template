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
from semantica_workbench.artifact_models import validate_artifact_schema, validate_evidence_authority_boundary
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
    synthetic_evidence_index,
    write_reference_geometry_bundle,
)


class EvidenceIndexTests(WorkbenchTestCase):
    def test_evidence_index_artifact_schema_validates_authority_boundary(self) -> None:
        index = synthetic_evidence_index()
        self.assertEqual([], validate_artifact_schema(index, "sweep-evidence-index"))
        self.assertEqual([], validate_evidence_authority_boundary(index))
        index["authority_boundary"]["generated_evidence_is_truth"] = True
        self.assertTrue(validate_artifact_schema(index, "sweep-evidence-index"))
        self.assertEqual("authority_boundary_mismatch", validate_evidence_authority_boundary(index)[0]["kind"])
        index = synthetic_evidence_index()
        index["findings"][0]["promotion_allowed"] = True
        self.assertTrue(validate_artifact_schema(index, "sweep-evidence-index"))
        self.assertEqual("generated_row_promotable", validate_evidence_authority_boundary(index)[0]["kind"])
        index = synthetic_evidence_index()
        index["findings"][0]["claim_index_id"] = None
        index["findings"][0]["char_start"] = None
        index["findings"][0]["char_end"] = None
        index["findings"][0]["char_span_kind"] = None
        index["findings"][0]["source_span"]["char_start"] = None
        index["findings"][0]["source_span"]["char_end"] = None
        index["findings"][0]["source_span"]["char_span_kind"] = None
        self.assertEqual([], validate_artifact_schema(index, "sweep-evidence-index"))
        index = synthetic_evidence_index()
        del index["findings"][0]["source_span"]
        self.assertTrue(validate_artifact_schema(index, "sweep-evidence-index"))
        index = synthetic_evidence_index()
        del index["findings"][0]["review_action"]
        self.assertTrue(validate_artifact_schema(index, "sweep-evidence-index"))

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
                        '  rawr:findingKind "candidate-new" ;',
                        "  rawr:partOfSweepRecord evidence:legacy-sweep ;",
                        "  rawr:derivedFrom evidence:legacy-claim ;",
                        '  rawr:sourcePath "docs/a-b.md" ;',
                        '  rawr:lineStart "10" .',
                        "",
                    ]
                ),
                encoding="utf-8",
            )
            graph = Graph()
            graph.parse(evidence_ttl, format="turtle")
            rawr = Namespace("https://rawr.dev/ontology/")
            self.assertEqual(2, len(list(graph.subjects(RDF.type, rawr.IndexedDocument))))
            candidate_rows = run_sparql_query(
                str(run_dir), Path("tools/semantica-workbench/queries/evidence-candidate-new.rq")
            )
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
                        '  rawr:findingKind "aligned" ;',
                        "  rawr:derivedFrom evidence:claim-1 ;",
                        '  rawr:rule "synthetic_rule" .',
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
