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
from semantica_workbench.core_config import CORE_GRAPH_FILENAMES, NAMED_QUERY_DESCRIPTIONS
from semantica_workbench.core_viewer import build_cytoscape_payload, write_html_viewer
from semantica_workbench.core_query import render_query_text, run_named_query
from semantica_workbench.document_sweep import discover_documents, effective_exclude_segments, review_queue_records, run_document_sweep
from semantica_workbench.extraction import heuristic_extract
from semantica_workbench.io import read_json, rel, write_json
from semantica_workbench.manifest import load_manifest
from semantica_workbench.paths import FIXTURE_MANIFEST, REPO_ROOT
from semantica_workbench.seeding import build_seed_graph
from semantica_workbench.semantica_intake import map_semantica_chunk_to_span, semantica_intake_probe
from semantica_workbench.semantic_evidence import (
    compare_evidence_to_ontology,
    extract_evidence_claims,
    fixture_document_path,
    load_fixture_expectations,
    semantic_capability_probe,
)


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

    def test_target_architecture_view_excludes_constraints_and_candidates(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        target_entities = graph["layered_graph"]["target_architecture_view"]["entities"]
        excluded_types = {"DeprecatedTerm", "EvidenceClaim", "ForbiddenPattern", "ReviewFinding", "CandidateEntity"}
        self.assertTrue(target_entities)
        self.assertFalse(any(entity["type"] in excluded_types for entity in target_entities))

    def test_verification_policy_stays_out_of_canonical_views(self) -> None:
        ontology = deepcopy(load_core_ontology())
        verification_entity = next(entity for entity in ontology["entities"] if entity["type"] == "VerificationPolicyConcept")
        verification_entity["status"] = "locked"
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        for view_name in ["canonical_graph"]:
            self.assertFalse(any(entity["type"] == "VerificationPolicyConcept" for entity in graph[view_name]["entities"]))
        self.assertFalse(any(entity["type"] == "VerificationPolicyConcept" for entity in graph["layered_graph"]["canonical_view"]["entities"]))
        self.assertFalse(any(entity["type"] == "VerificationPolicyConcept" for entity in graph["layered_graph"]["target_architecture_view"]["entities"]))

    def test_testing_plan_authority_only_targets_verification_policy(self) -> None:
        ontology = load_core_ontology()
        testing_authority_edges = [
            relation
            for relation in ontology["relations"]
            if relation["subject"] == "authority.doc.canonical-testing-plan"
            and relation["predicate"] == "is_authority_for"
        ]
        self.assertGreaterEqual(len(testing_authority_edges), 1)
        targets = {entity["id"]: entity for entity in ontology["entities"]}
        self.assertTrue(all(targets[relation["object"]]["type"] == "VerificationPolicyConcept" for relation in testing_authority_edges))

    def test_forbidden_patterns_have_structured_constraints(self) -> None:
        ontology = load_core_ontology()
        forbidden = [entity for entity in ontology["entities"] if entity["type"] == "ForbiddenPattern"]
        self.assertGreater(len(forbidden), 0)
        self.assertTrue(all(isinstance(entity.get("constraint"), dict) for entity in forbidden))
        self.assertTrue(all(entity["constraint"].get("prohibited_action") for entity in forbidden))

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
        if not any(report["optional_dependencies"][name]["available"] for name in ["openai", "anthropic", "litellm", "ollama"]):
            self.assertEqual("blocked-missing-extra", gates["semantic_extraction_llm"]["status"])
        if not (report["optional_dependencies"]["fastapi"]["available"] and report["optional_dependencies"]["uvicorn"]["available"]):
            self.assertEqual("blocked-missing-extra", gates["rest_explorer_interface"]["status"])
        if report["checked_modules"]["semantica.export"]["available"] and not report["optional_dependencies"]["pyshacl"]["available"]:
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

    def test_semantic_evidence_fixture_verdicts(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True)
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

    def test_semantic_opposite_claims_do_not_collapse(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True)
        compare = compare_evidence_to_ontology(evidence, graph["layered_graph"], graph["candidate_queue"])
        line3 = [finding for finding in compare["findings"] if finding["line_start"] == 3 and finding["entity_id"] == "forbidden.pattern.root-core-authoring-root"]
        line7 = [finding for finding in compare["findings"] if finding["line_start"] == 7 and finding["entity_id"] == "forbidden.pattern.root-core-authoring-root"]
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
        findings = [item for item in compare["findings"] if item.get("entity_id") == "forbidden.pattern.root-core-authoring-root"]
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
        evidence = extract_evidence_claims(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True)
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

    def test_semantic_extraction_suppresses_scaffold_and_records_ledger(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True)
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

    def test_semantic_query_names_execute(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        evidence = extract_evidence_claims(fixture_document_path(), graph["layered_graph"], graph["candidate_queue"], fixture=True)
        compare = compare_evidence_to_ontology(evidence, graph["layered_graph"], graph["candidate_queue"])
        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            (run_dir / CORE_GRAPH_FILENAMES["layered_graph"]).write_text(json.dumps(graph["layered_graph"]), encoding="utf-8")
            (run_dir / CORE_GRAPH_FILENAMES["candidate_queue"]).write_text(json.dumps(graph["candidate_queue"]), encoding="utf-8")
            (run_dir / CORE_GRAPH_FILENAMES["semantic_compare"]).write_text(json.dumps(compare), encoding="utf-8")
            for query_name in NAMED_QUERY_DESCRIPTIONS:
                if query_name.startswith("sweep-"):
                    continue
                result = run_named_query(str(run_dir), query_name)
                self.assertEqual(query_name, result["query"])
            ambiguity = run_named_query(str(run_dir), "ambiguity-summary")
            self.assertEqual(compare["summary"]["ambiguous_by_bucket"], {row["bucket"]: row["count"] for row in ambiguity["buckets"]})
            decision_queue = run_named_query(str(run_dir), "decision-review-queue")
            text = render_query_text(decision_queue)
            self.assertIn("artifact:", text)
            self.assertIn("document:", text)

    def test_semantic_query_requires_semantic_artifact(self) -> None:
        ontology = load_core_ontology()
        validation = validate_loaded_core_ontology(ontology)
        graph = build_graph_payload(ontology, validation)
        with tempfile.TemporaryDirectory() as directory:
            run_dir = Path(directory)
            (run_dir / CORE_GRAPH_FILENAMES["layered_graph"]).write_text(json.dumps(graph["layered_graph"]), encoding="utf-8")
            (run_dir / CORE_GRAPH_FILENAMES["candidate_queue"]).write_text(json.dumps(graph["candidate_queue"]), encoding="utf-8")
            with self.assertRaises(FileNotFoundError):
                run_named_query(str(run_dir), "decision-review-queue")

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
        self.assertEqual("aligned-active", by_path["tools/semantica-workbench/fixtures/docs/sweep/active.md"]["recommendation"])
        self.assertEqual("outside-scope", by_path["tools/semantica-workbench/fixtures/docs/sweep/no-signal.md"]["recommendation"])
        self.assertEqual(sum(record["counts"]["claims"] for record in sweep["documents"]), sweep["summary"]["total_claims"])
        self.assertTrue((run_dir / CORE_GRAPH_FILENAMES["doc_sweep_report"]).exists())
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


if __name__ == "__main__":
    unittest.main()
