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


class LlmAugmentationTests(WorkbenchTestCase):
    def test_llm_evidence_augmentation_blocks_without_provider(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            index = synthetic_evidence_index()
            write_json(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"], index)
            original_index_text = (run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"]).read_text(encoding="utf-8")
            augmentation = write_llm_evidence_augmentation(
                run_dir,
                provider="openai",
                model=None,
                limit=2,
            )
            self.assertEqual("rawr-sweep-llm-evidence-augmentation-v1", augmentation["schema_version"])
            self.assertEqual("blocked", augmentation["status"]["actual_mode"])
            self.assertIn(augmentation["status"]["blocked_reason"], {"blocked-missing-extra", "blocked-requires-model"})
            self.assertEqual(2, augmentation["selection"]["selected_count"])
            self.assertEqual([], augmentation["suggestions"])
            self.assertFalse(augmentation["authority_boundary"]["augmentation_is_truth"])
            self.assertFalse(augmentation["authority_boundary"]["alters_deterministic_index"])
            self.assertEqual(
                original_index_text,
                (run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"]).read_text(encoding="utf-8"),
            )

    def test_llm_evidence_augmentation_mock_provider_writes_evidence_only_sidecar(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            index = synthetic_evidence_index()
            write_json(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"], index)
            augmentation = write_llm_evidence_augmentation(
                run_dir,
                provider="mock",
                model="mock-model",
                limit=3,
            )
            path = run_dir / CORE_GRAPH_FILENAMES["sweep_llm_evidence_augmentation"]
            self.assertTrue(path.exists())
            self.assertEqual("mock", augmentation["status"]["actual_mode"])
            self.assertEqual(3, augmentation["selection"]["selected_count"])
            self.assertEqual(3, augmentation["summary"]["suggestion_count"])
            first = augmentation["suggestions"][0]
            self.assertEqual("evidence-only", first["review_state"])
            self.assertFalse(first["promotion_allowed"])
            self.assertFalse(first["decision_grade"])
            self.assertIn("source_span", first["source_row"])
            self.assertEqual("mock-llm-evidence-augmentation-v1", first["extraction"]["method"])
            self.assertEqual([], validate_artifact_schema(augmentation, "sweep-llm-evidence-augmentation"))
            self.assertEqual([], validate_evidence_authority_boundary(augmentation))
            augmentation["authority_boundary"]["augmentation_is_truth"] = True
            augmentation["authority_boundary"]["alters_deterministic_verdicts"] = True
            augmentation["suggestions"][0]["promotion_allowed"] = True
            augmentation["suggestions"][0]["decision_grade"] = True
            self.assertTrue(validate_artifact_schema(augmentation, "sweep-llm-evidence-augmentation"))
            authority_errors = validate_evidence_authority_boundary(augmentation)
            self.assertIn("authority_boundary_mismatch", {error["kind"] for error in authority_errors})
            self.assertIn("generated_row_promotable", {error["kind"] for error in authority_errors})
            self.assertIn("generated_row_decision_grade", {error["kind"] for error in authority_errors})
            del augmentation["suggestions"][0]["source_row"]["source_span"]
            self.assertTrue(validate_artifact_schema(augmentation, "sweep-llm-evidence-augmentation"))
            augmentation = write_llm_evidence_augmentation(
                run_dir,
                provider="mock",
                model="mock-model",
                limit=1,
            )
            del augmentation["suggestions"][0]["extraction"]["method"]
            self.assertTrue(validate_artifact_schema(augmentation, "sweep-llm-evidence-augmentation"))

    def test_llm_evidence_augmentation_real_provider_failure_records_attempt(self) -> None:
        original_status = augmentation_module.semantica_llm_status
        original_call = augmentation_module.call_semantica_llm_methods

        def ready_status(provider: str, model: str | None) -> dict:
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

        def failing_call(*_args, **_kwargs):
            raise RuntimeError("boom")

        augmentation_module.semantica_llm_status = ready_status
        augmentation_module.call_semantica_llm_methods = failing_call
        try:
            with tempfile.TemporaryDirectory() as directory:
                run_dir = Path(directory)
                write_json(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"], synthetic_evidence_index())
                augmentation = write_llm_evidence_augmentation(
                    run_dir,
                    provider="openai",
                    model="test-model",
                    limit=1,
                )
        finally:
            augmentation_module.semantica_llm_status = original_status
            augmentation_module.call_semantica_llm_methods = original_call

        self.assertEqual("blocked", augmentation["status"]["actual_mode"])
        self.assertEqual("blocked-llm-call-failed", augmentation["status"]["blocked_reason"])
        self.assertTrue(augmentation["status"]["llm_call_attempted"])
        self.assertEqual([], augmentation["suggestions"])
        self.assertEqual("llm-call-failed", augmentation["diagnostics"][0]["kind"])

    def test_llm_evidence_augmentation_empty_real_output_records_diagnostic(self) -> None:
        original_status = augmentation_module.semantica_llm_status
        original_call = augmentation_module.call_semantica_llm_methods

        def ready_status(provider: str, model: str | None) -> dict:
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

        augmentation_module.semantica_llm_status = ready_status
        augmentation_module.call_semantica_llm_methods = lambda *_args, **_kwargs: ([], [])
        try:
            with tempfile.TemporaryDirectory() as directory:
                run_dir = Path(directory)
                write_json(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"], synthetic_evidence_index())
                augmentation = write_llm_evidence_augmentation(
                    run_dir,
                    provider="openai",
                    model="test-model",
                    limit=1,
                )
        finally:
            augmentation_module.semantica_llm_status = original_status
            augmentation_module.call_semantica_llm_methods = original_call

        self.assertEqual("semantica-llm-augmentation", augmentation["status"]["actual_mode"])
        self.assertTrue(augmentation["status"]["llm_call_attempted"])
        self.assertEqual(0, augmentation["summary"]["suggestion_count"])
        self.assertEqual([], augmentation["suggestions"])
        self.assertEqual("llm-empty-output", augmentation["diagnostics"][0]["kind"])

    def test_llm_evidence_augmentation_cli_keeps_deterministic_queries_unchanged(self) -> None:
        from semantica_workbench.cli import main as workbench_main

        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            write_json(run_dir / CORE_GRAPH_FILENAMES["layered_graph"], {"summary": {}})
            write_json(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"], synthetic_evidence_index())
            before = run_named_query(str(run_dir), "evidence-summary")
            original_index_text = (run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"]).read_text(encoding="utf-8")

            exit_code = workbench_main(
                [
                    "doc:augment-llm",
                    "--run",
                    str(run_dir),
                    "--llm-provider",
                    "mock",
                    "--llm-model",
                    "mock-model",
                    "--limit",
                    "2",
                ]
            )

            after = run_named_query(str(run_dir), "evidence-summary")
            sidecar = run_dir / CORE_GRAPH_FILENAMES["sweep_llm_evidence_augmentation"]
            self.assertEqual(0, exit_code)
            self.assertTrue(sidecar.exists())
            self.assertEqual(before, after)
            self.assertEqual(
                original_index_text,
                (run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"]).read_text(encoding="utf-8"),
            )
            self.assertTrue(
                (REPO_ROOT / ".semantica/current" / CORE_GRAPH_FILENAMES["sweep_llm_evidence_augmentation"]).exists()
            )
