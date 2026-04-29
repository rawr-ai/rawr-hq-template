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


class SemanticCapabilityTests(WorkbenchTestCase):
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
        if not any(
            report["optional_dependencies"][name]["available"] for name in ["openai", "anthropic", "litellm", "ollama"]
        ):
            self.assertEqual("blocked-missing-extra", gates["semantic_extraction_llm"]["status"])
        if not (
            report["optional_dependencies"]["fastapi"]["available"]
            and report["optional_dependencies"]["uvicorn"]["available"]
        ):
            self.assertEqual("blocked-missing-extra", gates["rest_explorer_interface"]["status"])
        if (
            report["checked_modules"]["semantica.export"]["available"]
            and not report["optional_dependencies"]["pyshacl"]["available"]
        ):
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
