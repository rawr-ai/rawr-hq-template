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


class SemanticaIntakeTests(WorkbenchTestCase):
    def test_semantica_intake_probe_preserves_source_authority_and_spans(self) -> None:
        manifest = load_manifest(FIXTURE_MANIFEST)
        source = manifest.sources[0]
        probe = semantica_intake_probe(source)
        self.assertEqual("rawr-semantica-intake-v1", probe["schema_version"])
        self.assertEqual(source.rel_path, probe["source"]["path"])
        self.assertTrue(probe["fallback"]["chunk_markdown_retained"])
        self.assertIn(probe["fallback"]["decision_grade_source"], {"chunk_markdown", "semantica-intake"})
        self.assertGreaterEqual(probe["parity"]["local_chunk_count"], 1)
        self.assertTrue(probe["parity"]["source_identity_preserved"])
        self.assertTrue(probe["parity"]["authority_preserved"])
        for chunk in probe["chunks"]:
            self.assertEqual(source.rel_path, chunk["source_path"])
            self.assertEqual(source.authority_rank, chunk["authority_rank"])
            self.assertEqual(source.authority_scope, chunk["authority_scope"])
            self.assertGreaterEqual(chunk["line_start"], 1)
            self.assertGreaterEqual(chunk["line_end"], chunk["line_start"])
            self.assertEqual(source.rel_path, chunk["provenance"]["document"])
            self.assertEqual(chunk["line_start"], chunk["provenance"]["line"])

    def test_semantica_intake_marks_markdown_parser_gap_as_partial(self) -> None:
        manifest = load_manifest(FIXTURE_MANIFEST)
        probe = semantica_intake_probe(manifest.sources[0])
        if not probe["status"]["markdown_parser_available"]:
            self.assertEqual("partial", probe["status"]["classification"])
            self.assertEqual("chunk_markdown", probe["fallback"]["decision_grade_source"])
            self.assertIn("MarkdownParser", probe["status"]["limitation"])

    def test_semantica_span_adapter_rejects_unmapped_offsets(self) -> None:
        text = "# Heading\n\nBody\n"
        self.assertIsNone(map_semantica_chunk_to_span(text, None, 5))
        self.assertIsNone(map_semantica_chunk_to_span(text, 8, 2))
        self.assertIsNone(map_semantica_chunk_to_span(text, 0, len(text) + 1))
        mapping = map_semantica_chunk_to_span(text, 0, len(text))
        self.assertIsNotNone(mapping)
        assert mapping is not None
        self.assertEqual(1, mapping.line_start)
        self.assertEqual(3, mapping.line_end)

    def test_shared_normalization_handles_unicode_quotes_spaces_and_dashes(self) -> None:
        self.assertEqual("a b-c 'd' \"e\"", normalize_text("A\u00a0B\u2014C \u2018D\u2019 \u201cE\u201d"))
        normalized = normalize_match_text("Use a root\u2011level `core/` authoring root.")
        self.assertTrue(term_in_normalized_text("root-level core/", normalized))
