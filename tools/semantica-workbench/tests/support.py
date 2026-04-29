from __future__ import annotations

import re
import unittest
from pathlib import Path
from urllib.parse import unquote, urlparse

from semantica_workbench.architecture_change_frame import FRAME_SCHEMA_VERSION


def frame_evidence_ref() -> dict:
    return {
        "id": "evidence-claim-1",
        "source_path": "tools/semantica-workbench/fixtures/docs/semantic-evidence-cases.md",
        "heading_path": ["Target Architecture"],
        "context": "Target Architecture",
        "line_start": 7,
        "line_end": 7,
        "char_start": 0,
        "char_end": 73,
        "char_span_kind": "line-offset",
        "text": "Create a root-level `core/` authoring root for shared platform machinery.",
        "extraction_method": "semantica-llm-pilot",
        "confidence": 0.82,
        "review_state": "evidence-only",
        "promotion_allowed": False,
    }


def minimal_architecture_change_frame() -> dict:
    return {
        "schema_version": FRAME_SCHEMA_VERSION,
        "frame_id": "fixture-frame",
        "document": {
            "source_path": "tools/semantica-workbench/fixtures/docs/semantic-evidence-cases.md",
            "title": "Semantic Evidence Cases",
            "authority_context": "fixture",
            "authority_rank": 99,
            "source_scope": "fixture",
        },
        "proposal_summary": "Fixture frame for a proposed root-level core authoring root.",
        "extraction": {
            "method": "semantica-llm-pilot",
            "extractor": "architecture-change-frame-pilot",
            "status": "pilot",
            "llm_provider_status": "available",
            "semantica_version": "0.4.0",
            "deterministic_oracle": "rawr-semantic-heuristic-v1",
            "promotion_allowed": False,
        },
        "governance": {
            "truth_authority": "rawr-reviewed-ontology",
            "semantica_output_authoritative": False,
            "reference_geometry_status": "comparison-only",
            "requires_human_promotion": True,
            "promotion_allowed": False,
        },
        "claims": [
            {
                "id": "claim-root-core-authoring-root",
                "claim_type": "forbidden-risk",
                "subject": "root-level core authoring root",
                "predicate": "introduces",
                "object": "core authoring surface",
                "polarity": "positive",
                "modality": "proposed",
                "assertion_scope": "target-architecture",
                "authority_context": "fixture",
                "mapping_state": "resolved",
                "evidence_refs": [frame_evidence_ref()],
                "confidence": 0.78,
                "review_state": "evidence-only",
                "verdict": "not-evaluated",
                "review_action": "none",
                "promotion_allowed": False,
            }
        ],
        "noun_mappings": [],
        "comparison": {
            "status": "extraction-only",
            "overall_verdict": "not-evaluated",
            "recommended_next_action": "none",
            "ruleset": "rawr-frame-pilot-unresolved",
            "explanation_chain_complete": False,
        },
    }


def write_reference_geometry_bundle(directory: Path) -> Path:
    bundle_path = directory / "reference-geometry.zip"
    ttl = """@prefix dct: <http://purl.org/dc/terms/> .
@prefix rawr: <https://rawr.dev/ontology/instances#> .
@prefix rg: <https://rawr.dev/ontology/reference-geometry#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

rawr:diagnosticsExtensionSlot a rg:ExtensionSlot ;
  dct:description "New read model, catalog, topology, or telemetry concern attaches under diagnostics/observation." ;
  skos:prefLabel "diagnostics extension slot" .

rawr:comparisonVocabularyExtensionSlot a rg:ExtensionSlot ;
  dct:description "New analysis vocabulary attaches as comparison/change-frame layer, not as product architecture kind." ;
  skos:prefLabel "comparison vocabulary extension slot" .

rawr:laneAgentTools a rg:ProjectionLane ;
  skos:prefLabel "agent/tools" ;
  rg:pathPattern "plugins/agent/tools/<capability>" .

rawr:bindPhase a rg:RuntimePhase ;
  skos:prefLabel "bind" .
"""
    import zipfile

    with zipfile.ZipFile(bundle_path, "w") as archive:
        archive.writestr("rawr-reference-geometry-v0.2/README.md", "# RAWR Reference Geometry v0.2\n")
        archive.writestr("rawr-reference-geometry-v0.2/rawr-reference-geometry-core.ttl", ttl)
    return bundle_path


class FakeEntity:
    def __init__(self, text: str, label: str, start_char: int, end_char: int, confidence: float = 0.9):
        self.text = text
        self.label = label
        self.start_char = start_char
        self.end_char = end_char
        self.confidence = confidence
        self.metadata = {}


class FakeTriplet:
    def __init__(self, subject: str, predicate: str, object_: str, source_sentence: str, confidence: float = 0.8):
        self.subject = subject
        self.predicate = predicate
        self.object = object_
        self.confidence = confidence
        self.metadata = {"source_sentence": source_sentence}


class WorkbenchTestCase(unittest.TestCase):
    def assert_report_links_resolve(self, html_path: Path) -> None:
        html_text = html_path.read_text(encoding="utf-8")
        hrefs = re.findall(r'<a class="report-link" href="([^"]+)"', html_text)
        self.assertTrue(hrefs)
        for href in hrefs:
            parsed = urlparse(href)
            if parsed.scheme == "file":
                target = Path(unquote(parsed.path))
            elif Path(unquote(href)).is_absolute():
                target = Path(unquote(href))
            else:
                target = (html_path.parent / unquote(href)).resolve()
            self.assertTrue(target.exists(), f"{href} from {html_path} resolved to missing {target}")


def synthetic_evidence_index() -> dict:
    rows = [
        {
            "index_id": "docs/proposal.md#finding-candidate",
            "finding_id": "finding-candidate",
            "claim_id": "claim-candidate",
            "kind": "candidate-new",
            "rule": "in_scope_unresolved_operational_concept",
            "source_path": "docs/proposal.md",
            "document_path": "docs/proposal.md",
            "sweep_document_path": "docs/proposal.md",
            "line_start": 10,
            "line_end": 10,
            "char_start": 0,
            "char_end": 42,
            "char_span_kind": "line-offset",
            "heading_path": ["Proposal"],
            "text": "Introduce an architecture proposal graph.",
            "confidence": 0.8,
            "review_action": "Review as candidate; do not promote.",
            "resolution_state": "resolved-candidate",
        },
        {
            "index_id": "docs/proposal.md#finding-unresolved",
            "finding_id": "finding-unresolved",
            "claim_id": "claim-unresolved",
            "kind": "ambiguous",
            "rule": "no_resolved_decision_target",
            "source_path": "docs/proposal.md",
            "document_path": "docs/proposal.md",
            "sweep_document_path": "docs/proposal.md",
            "line_start": 20,
            "line_end": 20,
            "char_start": 0,
            "char_end": 37,
            "char_span_kind": "line-offset",
            "heading_path": ["Proposal"],
            "text": "The proposal may add an adapter.",
            "confidence": 0.6,
            "review_action": "Map to an existing ontology entity.",
            "resolution_state": "unresolved",
            "ambiguity_bucket": "unresolved-target",
        },
        {
            "index_id": "docs/proposal.md#finding-weak",
            "finding_id": "finding-weak",
            "claim_id": "claim-weak",
            "kind": "ambiguous",
            "rule": "no_resolved_decision_target",
            "source_path": "docs/proposal.md",
            "document_path": "docs/proposal.md",
            "sweep_document_path": "docs/proposal.md",
            "line_start": 30,
            "line_end": 30,
            "char_start": 0,
            "char_end": 32,
            "char_span_kind": "line-offset",
            "heading_path": ["Proposal"],
            "text": "This could improve review flow.",
            "confidence": 0.5,
            "review_action": "Clarify assertion scope.",
            "resolution_state": "resolved-canonical",
            "ambiguity_bucket": "weak-modality",
        },
        {
            "index_id": "docs/proposal.md#finding-aligned",
            "finding_id": "finding-aligned",
            "claim_id": "claim-aligned",
            "kind": "aligned",
            "rule": "claim_resolves_to_canonical_ontology_entity",
            "source_path": "docs/proposal.md",
            "document_path": "docs/proposal.md",
            "sweep_document_path": "docs/proposal.md",
            "line_start": 40,
            "line_end": 40,
            "char_start": 0,
            "char_end": 20,
            "char_span_kind": "line-offset",
            "heading_path": ["Proposal"],
            "text": "Use reviewed ontology.",
            "confidence": 0.9,
            "review_action": "No action required.",
            "resolution_state": "resolved-canonical",
        },
    ]
    for row in rows:
        row["source_span"] = {
            "source_path": row["source_path"],
            "line_start": row["line_start"],
            "line_end": row["line_end"],
            "char_start": row["char_start"],
            "char_end": row["char_end"],
            "char_span_kind": row["char_span_kind"],
            "heading_path": row["heading_path"],
            "text": row["text"],
        }
    return {
        "schema_version": "rawr-sweep-evidence-index-v1",
        "run_id": "synthetic-run",
        "git_sha": "test",
        "authority_boundary": {
            "generated_evidence_is_truth": False,
            "reviewed_rawr_ontology_remains_authority": True,
            "promotion_requires_human_review": True,
            "llm_output_is_evidence_only": True,
        },
        "summary": {"documents_indexed": 1, "claim_count": 4, "finding_count": 4, "warning_count": 0},
        "findings": rows,
    }
