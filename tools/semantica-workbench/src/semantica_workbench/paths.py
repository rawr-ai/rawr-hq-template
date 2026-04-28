from __future__ import annotations

from pathlib import Path


WORKBENCH_ROOT = Path(__file__).resolve().parents[2]


def repo_root() -> Path:
    current = WORKBENCH_ROOT
    while current != current.parent:
        if (current / "package.json").exists() and (current / "docs/process/GRAPHITE.md").exists():
            return current
        current = current.parent
    raise RuntimeError(f"Unable to find repo root from {WORKBENCH_ROOT}")


REPO_ROOT = repo_root()
STATE_ROOT = REPO_ROOT / ".semantica"
RUNS_ROOT = STATE_ROOT / "runs"
CURRENT_ROOT = STATE_ROOT / "current"
DEFAULT_MANIFEST = REPO_ROOT / "docs/projects/rawr-final-architecture-migration/semantic-source-manifest.yaml"
FIXTURE_MANIFEST = WORKBENCH_ROOT / "fixtures/semantic-source-manifest.yaml"
CONTENT_ONTOLOGY = WORKBENCH_ROOT / "ontologies/software-architecture-content-v1.json"
AUTHORITY_ONTOLOGY = WORKBENCH_ROOT / "ontologies/authority-overlay-v1.json"
RAWR_CORE_ONTOLOGY_ROOT = WORKBENCH_ROOT / "ontologies/rawr-core-architecture"
RAWR_CORE_ONTOLOGY_CONTRACT = RAWR_CORE_ONTOLOGY_ROOT / "ontology-contract-v1.yaml"
RAWR_CORE_ONTOLOGY_LAYERS = [
    RAWR_CORE_ONTOLOGY_ROOT / "core-architecture-ontology-v1.yaml",
    RAWR_CORE_ONTOLOGY_ROOT / "runtime-realization-overlay-v1.yaml",
    RAWR_CORE_ONTOLOGY_ROOT / "authority-document-overlay-v1.yaml",
    RAWR_CORE_ONTOLOGY_ROOT / "verification-policy-overlay-v1.yaml",
    RAWR_CORE_ONTOLOGY_ROOT / "classifier-readiness-overlay-v1.yaml",
]
RAWR_CORE_CANDIDATE_QUEUE = RAWR_CORE_ONTOLOGY_ROOT / "candidate-queue-v1.yaml"
PROMPTS_ROOT = WORKBENCH_ROOT / "prompts"
QUERIES_ROOT = WORKBENCH_ROOT / "queries"
VIEWER_ROOT = WORKBENCH_ROOT / "viewer"
SCHEMAS_ROOT = WORKBENCH_ROOT / "schemas"
ARCHITECTURE_CHANGE_FRAME_SCHEMA = SCHEMAS_ROOT / "architecture-change-frame.schema.json"
AUTHORITY_CLAIM_PROMPT = PROMPTS_ROOT / "authority-claim-extraction.md"
ENTITY_RESOLUTION_PROMPT = PROMPTS_ROOT / "entity-resolution.md"
RELATION_EDGE_PROMPT = PROMPTS_ROOT / "relation-edge-extraction.md"
QUALITY_REVIEW_PROMPT = PROMPTS_ROOT / "quality-review.md"
SEMANTIC_EVIDENCE_PROMPT = PROMPTS_ROOT / "semantic-evidence-extraction.md"
