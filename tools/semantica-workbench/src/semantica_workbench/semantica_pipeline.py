from __future__ import annotations

import contextlib
import io
from typing import Any

SWEEP_PIPELINE_STEPS = [
    "discover-documents",
    "extract-evidence",
    "compare-evidence",
    "recommend-review-action",
    "write-review-artifacts",
]


def semantica_pipeline_probe(
    document_count: int, skipped_count: int, recommendations: dict[str, int]
) -> dict[str, Any]:
    proof: dict[str, Any] = {
        "schema_version": "rawr-semantica-pipeline-proof-v1",
        "status": {
            "available": False,
            "classification": "blocked",
        },
        "planned_steps": SWEEP_PIPELINE_STEPS,
        "sweep_shape": {
            "document_count": document_count,
            "skipped_count": skipped_count,
            "recommendations": recommendations,
        },
        "rawr_policy": {
            "recommendation_categories_owned_by_rawr": True,
            "review_queues_owned_by_rawr": True,
            "source_authority_policy_owned_by_rawr": True,
        },
        "fallback": {
            "current_sweep_loop_retained": True,
            "removal_trigger": "Move orchestration mechanics only after semantica pipeline proves checkpoint/retry/run-state behavior without changing RAWR recommendation semantics.",
        },
    }
    try:
        from semantica.pipeline import ExecutionEngine, PipelineBuilder

        stream = io.StringIO()
        with contextlib.redirect_stdout(stream), contextlib.redirect_stderr(stream):
            builder = PipelineBuilder()
            for step in SWEEP_PIPELINE_STEPS:
                builder.add_step(step, f"rawr.{step}")
            for before, after in zip(SWEEP_PIPELINE_STEPS, SWEEP_PIPELINE_STEPS[1:], strict=False):
                builder.connect_steps(before, after)
            pipeline = builder.build("rawr_document_sweep_probe")
            engine = ExecutionEngine()
            result = engine.execute_pipeline(
                pipeline,
                data={
                    "document_count": document_count,
                    "skipped_count": skipped_count,
                    "recommendations": recommendations,
                },
            )
            pipeline_status = engine.get_pipeline_status(pipeline.name)
            pipeline_progress = engine.get_progress(pipeline.name)
        proof["status"] = {
            "available": True,
            "classification": "partial-dag-execution-proof",
            "pipeline_builder_available": True,
            "execution_engine_available": True,
            "checkpoint_support": False,
            "retry_api_present": hasattr(engine, "failure_handler"),
            "run_state_api_present": hasattr(engine, "get_pipeline_status") and hasattr(engine, "get_progress"),
            "limitation": "No checkpoint/resume persistence was proven in this phase.",
        }
        proof["execution"] = {
            "success": bool(getattr(result, "success", False)),
            "steps_executed": getattr(result, "metrics", {}).get("steps_executed"),
            "steps_failed": getattr(result, "metrics", {}).get("steps_failed"),
            "pipeline_name": pipeline.name,
            "step_count": len(pipeline.steps),
            "step_statuses": [{"name": step.name, "status": str(step.status)} for step in pipeline.steps],
            "pipeline_status": str(pipeline_status),
            "pipeline_progress": pipeline_progress,
        }
        proof["stdout"] = stream.getvalue().strip()[:1000]
    except Exception as exc:
        proof["status"] = {
            "available": False,
            "classification": "blocked",
            "error": str(exc),
        }
    return proof
