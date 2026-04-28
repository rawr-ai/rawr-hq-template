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
PROMPTS_ROOT = WORKBENCH_ROOT / "prompts"
AUTHORITY_CLAIM_PROMPT = PROMPTS_ROOT / "authority-claim-extraction.md"
ENTITY_RESOLUTION_PROMPT = PROMPTS_ROOT / "entity-resolution.md"
RELATION_EDGE_PROMPT = PROMPTS_ROOT / "relation-edge-extraction.md"
QUALITY_REVIEW_PROMPT = PROMPTS_ROOT / "quality-review.md"
