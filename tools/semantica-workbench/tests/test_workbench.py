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


if __name__ == "__main__":
    unittest.main()
