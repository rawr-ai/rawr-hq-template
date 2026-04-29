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


class SemanticaLlmExtractionTests(WorkbenchTestCase):
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
        self.assertIn(
            evidence["semantica_llm"]["status"]["blocked_reason"],
            {"blocked-missing-extra", "blocked-no-api-key", "blocked-provider-unavailable", "blocked-requires-model"},
        )
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
            self.assertEqual(
                claim["text"],
                span_text_for_ref(
                    claim["source_path"], claim["line_start"], claim["line_end"], claim["char_start"], claim["char_end"]
                ),
            )

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
