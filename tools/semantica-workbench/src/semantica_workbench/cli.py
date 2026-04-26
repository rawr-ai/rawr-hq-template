from __future__ import annotations

import argparse
import hashlib
import os
import subprocess
from pathlib import Path

from .chunking import chunk_markdown
from .diffing import build_diff
from .extraction import extract_chunk, request_params_for_model, schema_hash
from .io import git_sha, mark_current, new_run_dir, rel, resolve_run, write_json, write_jsonl
from .manifest import load_manifest
from .ontology import load_definitions, normalize_run
from .paths import (
    AUTHORITY_CLAIM_PROMPT,
    DEFAULT_MANIFEST,
    ENTITY_RESOLUTION_PROMPT,
    FIXTURE_MANIFEST,
    QUALITY_REVIEW_PROMPT,
    RELATION_EDGE_PROMPT,
    REPO_ROOT,
    STATE_ROOT,
    WORKBENCH_ROOT,
)
from .reporting import render_report
from .semantica_adapter import semantica_status
from .seeding import build_seed_graph

DEFAULT_MODEL = os.environ.get("SEMANTICA_WORKBENCH_MODEL", "gpt-5.4-mini")


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="semantica-workbench")
    sub = parser.add_subparsers(dest="command", required=True)

    check = sub.add_parser("check")
    check.set_defaults(func=cmd_check)

    extract = sub.add_parser("extract")
    add_extract_args(extract)
    extract.set_defaults(func=cmd_extract)

    ontology = sub.add_parser("ontology")
    ontology.add_argument("--run", default="latest")
    ontology.set_defaults(func=cmd_ontology)

    diff = sub.add_parser("diff")
    diff.add_argument("--run", default="latest")
    diff.set_defaults(func=cmd_diff)

    report = sub.add_parser("report")
    report.add_argument("--run", default="latest")
    report.set_defaults(func=cmd_report)

    run = sub.add_parser("run")
    add_extract_args(run)
    run.set_defaults(func=cmd_run)

    return parser


def add_extract_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    parser.add_argument("--fixture", action="store_true")
    parser.add_argument("--limit-chunks", type=int, default=None)
    parser.add_argument("--mode", choices=["auto", "heuristic", "llm"], default="auto")
    parser.add_argument("--model", default=DEFAULT_MODEL)


def cmd_check(_args) -> int:
    status = semantica_status()
    if not status.get("available"):
        raise RuntimeError(f"Semantica import failed: {status}")
    content, authority = load_definitions()
    fixture_manifest = load_manifest(FIXTURE_MANIFEST)
    fixture_chunks = [chunk for source in fixture_manifest.sources for chunk in chunk_markdown(source)]
    print(f"repo={REPO_ROOT}")
    print(f"workbench={WORKBENCH_ROOT}")
    print(f"state={STATE_ROOT}")
    print(f"semantica={status['version']}")
    print(f"content_ontology={content['id']}")
    print(f"authority_overlay={authority['id']}")
    print(f"fixture_sources={len(fixture_manifest.sources)} fixture_chunks={len(fixture_chunks)}")
    return 0


def cmd_extract(args) -> int:
    manifest_path = FIXTURE_MANIFEST if args.fixture else Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = REPO_ROOT / manifest_path
    manifest = load_manifest(manifest_path)
    prompts = load_prompts()
    run_dir = new_run_dir("fixture" if args.fixture else "extract")
    chunks = [chunk for source in manifest.sources for chunk in chunk_markdown(source)]
    if args.limit_chunks is not None:
        chunks = chunks[: args.limit_chunks]
    seeds = build_seed_graph(manifest)

    rows = [extract_chunk(chunk, prompts, "heuristic" if args.fixture else args.mode, args.model, seeds) for chunk in chunks]
    metadata = {
        "run_id": run_dir.name,
        "git_sha": git_sha(),
        "manifest": {
            "path": rel(manifest_path),
            "project": manifest.project,
            "version": manifest.version,
            "source_count": len(manifest.sources),
            "notes": manifest.notes,
        },
        "chunk_count": len(chunks),
        "extraction_modes": sorted({row["mode"] for row in rows}),
        "model": args.model if not args.fixture else None,
        "prompt_hashes": prompt_hashes(prompts),
        "schema_hash": schema_hash(),
        "request_params": request_params_for_model(args.model) if not args.fixture else {},
    }
    write_json(run_dir / "metadata.json", metadata)
    write_json(run_dir / "seeds.json", seeds)
    write_jsonl(run_dir / "chunks.jsonl", [chunk.to_dict() for chunk in chunks])
    write_jsonl(run_dir / "extraction.jsonl", rows)
    mark_current(run_dir, ["metadata.json", "seeds.json", "chunks.jsonl", "extraction.jsonl"])
    print(f"run={rel(run_dir)} chunks={len(chunks)} modes={','.join(metadata['extraction_modes'])}")
    return 0


def cmd_ontology(args) -> int:
    run_dir = resolve_run(args.run)
    ontology = normalize_run(run_dir)
    mark_current(run_dir, ["ontology.json"])
    print(f"ontology={rel(run_dir / 'ontology.json')} entities={ontology['summary']['entity_count']}")
    return 0


def cmd_diff(args) -> int:
    run_dir = resolve_run(args.run)
    diff = build_diff(run_dir)
    mark_current(run_dir, ["semantic-diff.json"])
    print(f"diff={rel(run_dir / 'semantic-diff.json')} shared={diff['summary']['shared_concept_count']}")
    return 0


def cmd_report(args) -> int:
    run_dir = resolve_run(args.run)
    report = render_report(run_dir)
    (run_dir / "report.md").write_text(report, encoding="utf-8")
    mark_current(run_dir, ["metadata.json", "seeds.json", "chunks.jsonl", "extraction.jsonl", "ontology.json", "semantic-diff.json", "report.md"])
    print(f"report={rel(run_dir / 'report.md')}")
    return 0


def cmd_run(args) -> int:
    cmd_extract(args)
    run_dir = resolve_run("latest")
    normalize_run(run_dir)
    build_diff(run_dir)
    report = render_report(run_dir)
    (run_dir / "report.md").write_text(report, encoding="utf-8")
    mark_current(run_dir, ["metadata.json", "seeds.json", "chunks.jsonl", "extraction.jsonl", "ontology.json", "semantic-diff.json", "report.md"])
    print(f"complete={rel(run_dir)}")
    return 0


def run_self_tests() -> None:
    subprocess.check_call(["python", "-m", "unittest", "discover", "-s", str(WORKBENCH_ROOT / "tests")], cwd=REPO_ROOT)


def load_prompts() -> dict[str, str]:
    return {
        "authority_claim": AUTHORITY_CLAIM_PROMPT.read_text(encoding="utf-8"),
        "entity_resolution": ENTITY_RESOLUTION_PROMPT.read_text(encoding="utf-8"),
        "relation_edge": RELATION_EDGE_PROMPT.read_text(encoding="utf-8"),
        "quality_review": QUALITY_REVIEW_PROMPT.read_text(encoding="utf-8"),
    }


def prompt_hashes(prompts: dict[str, str]) -> dict[str, str]:
    return {
        name: hashlib.sha256(value.encode("utf-8")).hexdigest()
        for name, value in sorted(prompts.items())
    }
