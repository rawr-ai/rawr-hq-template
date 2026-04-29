from __future__ import annotations

SEMANTIC_NAMED_QUERIES = {
    "semantic-conflicts",
    "aligned-rejections",
    "deprecated-uses",
    "ambiguous-claims",
    "candidate-new",
    "ambiguity-summary",
    "entityless-findings",
    "verification-policy-gaps",
    "decision-review-queue",
}

SWEEP_NAMED_QUERIES = {
    "sweep-summary",
    "sweep-review-queue",
    "sweep-quarantine-candidates",
    "sweep-update-candidates",
    "sweep-no-signal-documents",
    "sweep-high-ambiguity-docs",
}

PROPOSAL_NAMED_QUERIES = {
    "proposal-review-summary",
    "proposal-repair-queue",
}

EVIDENCE_NAMED_QUERIES = {
    "evidence-summary",
    "evidence-review-queue",
    "evidence-candidate-new",
    "evidence-unresolved-targets",
    "evidence-source-authority-signals",
    "evidence-prohibited-pattern-mentions",
    "evidence-weak-modality-hotspots",
    "evidence-by-document",
    "evidence-by-entity",
    "evidence-agent-manifest",
}
