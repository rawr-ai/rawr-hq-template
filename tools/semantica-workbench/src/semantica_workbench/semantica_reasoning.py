from __future__ import annotations

import contextlib
import importlib.util
import io
import os
from collections import Counter
from typing import Any

REASONING_PROBE_LIMIT = 5


def semantica_reasoning_probe(findings: list[dict[str, Any]]) -> dict[str, Any]:
    status = semantica_reasoning_status()
    decision_grade = [finding for finding in findings if finding.get("decision_grade")]
    explanation_complete = all(bool(finding.get("explanation_chain")) for finding in findings)
    probe_findings = (decision_grade or findings)[:REASONING_PROBE_LIMIT]
    proof = {
        "schema_version": "rawr-semantica-reasoning-proof-v1",
        "status": status,
        "summary": {
            "finding_count": len(findings),
            "decision_grade_finding_count": len(decision_grade),
            "probe_finding_count": len(probe_findings),
            "findings_by_kind": dict(Counter(finding.get("kind", "unknown") for finding in findings)),
            "explanation_chain_complete": explanation_complete,
        },
        "rawr_policy": {
            "review_actions_owned_by_rawr": True,
            "decision_grade_meaning_owned_by_rawr": True,
            "raw_phrase_hits_are_not_conflicts": True,
        },
        "fallback": {
            "rawr_rules_authoritative": True,
            "removal_trigger": "Move verdict execution only after semantica reasoning can preserve RAWR source claim, target, authority, rule, finding kind, and review action chain.",
        },
    }
    semantica_proof: dict[str, Any] = {
        "conflict_detector_available": status.get("conflicts_available", False),
        "conflict_detector_status": "not-run",
        "conflict_detector_result_count": 0,
        "graph_reasoner_available": status.get("reasoning_available", False),
        "graph_reasoner_status": status.get("graph_reasoner_execution_status", "not-run"),
    }
    try:
        from semantica.conflicts import ConflictDetector

        detector = ConflictDetector()
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            conflicts = detector.detect_conflicts(
                [
                    {
                        "id": finding["id"],
                        "type": finding.get("kind"),
                        "claim": finding.get("text"),
                        "target": finding.get("entity_id"),
                        "rule": finding.get("rule"),
                    }
                    for finding in probe_findings
                ]
            )
        semantica_proof.update(
            {
                "conflict_detector_available": True,
                "conflict_detector_status": "probe-ready",
                "conflict_detector_result_count": len(conflicts),
                "conflict_detector_probe_limit": REASONING_PROBE_LIMIT,
            }
        )
    except Exception as exc:
        semantica_proof.update({"conflict_detector_status": "blocked", "conflict_detector_error": str(exc)})
    proof["semantica"] = semantica_proof
    return proof


def semantica_reasoning_status() -> dict[str, Any]:
    try:
        from semantica import conflicts, reasoning

        provider_dependency_available = any(
            importlib.util.find_spec(name) is not None for name in ["openai", "anthropic", "litellm", "ollama"]
        )
        provider_env_available = any(
            os.environ.get(name)
            for name in [
                "OPENAI_API_KEY",
                "ANTHROPIC_API_KEY",
                "LITELLM_API_KEY",
                "OLLAMA_HOST",
            ]
        )
        graph_reasoner_execution_status = (
            "disabled-env-gated"
            if os.environ.get("SEMANTICA_ENABLE_LLM_REASONING_PROBE") != "1"
            else (
                "probe-ready"
                if provider_dependency_available and provider_env_available
                else "blocked-missing-provider"
            )
        )
        return {
            "available": True,
            "classification": "proof-ready",
            "conflicts_available": hasattr(conflicts, "ConflictDetector"),
            "reasoning_available": hasattr(reasoning, "GraphReasoner"),
            "provider_dependency_available": provider_dependency_available,
            "provider_env_available": provider_env_available,
            "graph_reasoner_execution_status": graph_reasoner_execution_status,
            "limitation": "RAWR still owns verdict rules and review-action semantics.",
        }
    except Exception as exc:
        return {
            "available": False,
            "classification": "blocked",
            "conflicts_available": False,
            "reasoning_available": False,
            "provider_dependency_available": False,
            "provider_env_available": False,
            "graph_reasoner_execution_status": "blocked",
            "error": str(exc),
        }
