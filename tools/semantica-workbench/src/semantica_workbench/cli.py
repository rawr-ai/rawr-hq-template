from __future__ import annotations

import argparse
import hashlib
import http.server
import json
import os
import socketserver
import subprocess
import threading
import urllib.request
from pathlib import Path

from .chunking import chunk_markdown
from .core_ontology import (
    TESTING_PLAN,
    build_core_ontology_run,
    diff_document_against_core_ontology,
    export_core_ontology,
    validate_core_ontology,
    visualize_core_ontology,
)
from .core_config import CORE_GRAPH_FILENAMES, DEFAULT_CORE_VIEWER_HOST, DEFAULT_CORE_VIEWER_PORT
from .core_query import list_queries, render_query_text, run_named_query, run_sparql_query
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

    core_validate = sub.add_parser("core:validate")
    core_validate.set_defaults(func=cmd_core_validate)

    core_build = sub.add_parser("core:build")
    core_build.set_defaults(func=cmd_core_build)

    core_export = sub.add_parser("core:export")
    core_export.add_argument("--run", default="latest")
    core_export.set_defaults(func=cmd_core_export)

    core_visualize = sub.add_parser("core:visualize")
    core_visualize.add_argument("--run", default="latest")
    core_visualize.set_defaults(func=cmd_core_visualize)

    core_serve = sub.add_parser("core:serve")
    core_serve.add_argument("--run", default="latest")
    core_serve.add_argument("--host", default=DEFAULT_CORE_VIEWER_HOST)
    core_serve.add_argument("--port", type=int, default=DEFAULT_CORE_VIEWER_PORT)
    core_serve.add_argument("--smoke", action="store_true")
    core_serve.set_defaults(func=cmd_core_serve)

    core_query = sub.add_parser("core:query")
    core_query.add_argument("--run", default="latest")
    core_query.add_argument("--list", action="store_true")
    core_query.add_argument("--named", default="summary")
    core_query.add_argument("--sparql", default=None)
    core_query.add_argument("--format", choices=["json", "text"], default="json")
    core_query.set_defaults(func=cmd_core_query)

    doc_diff = sub.add_parser("doc:diff")
    doc_diff.add_argument("--run", default="latest")
    doc_diff.add_argument("--document", default=str(TESTING_PLAN))
    doc_diff.set_defaults(func=cmd_doc_diff)

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


def cmd_core_validate(_args) -> int:
    report = validate_core_ontology()
    print(
        "core_ontology_valid="
        f"{report['valid']} entities={report['summary']['entity_count']} "
        f"relations={report['summary']['relation_count']} "
        f"errors={report['summary']['error_count']} warnings={report['summary']['warning_count']}"
    )
    if report["errors"]:
        for error in report["errors"][:10]:
            print(f"error={error}")
        raise RuntimeError(f"Core ontology validation failed with {len(report['errors'])} errors")
    return 0


def cmd_core_build(_args) -> int:
    run_dir = build_core_ontology_run()
    print(f"core_graph={rel(run_dir)}")
    return 0


def cmd_core_export(args) -> int:
    run_dir = export_core_ontology(args.run)
    print(f"core_export={rel(run_dir)}")
    return 0


def cmd_core_visualize(args) -> int:
    run_dir = visualize_core_ontology(args.run)
    print(f"core_visualization={rel(run_dir / CORE_GRAPH_FILENAMES['viewer'])}")
    return 0


def cmd_core_serve(args) -> int:
    run_dir = resolve_run(args.run)
    viewer = run_dir / CORE_GRAPH_FILENAMES["viewer"]
    if not viewer.exists():
        run_dir = visualize_core_ontology(args.run)
    handler = lambda *handler_args, **handler_kwargs: http.server.SimpleHTTPRequestHandler(
        *handler_args,
        directory=str(run_dir),
        **handler_kwargs,
    )
    with socketserver.ThreadingTCPServer((args.host, args.port), handler) as server:
        host, port = server.server_address
        url = f"http://{host}:{port}/{CORE_GRAPH_FILENAMES['viewer']}"
        print(f"core_viewer_url={url}")
        if args.smoke:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            with urllib.request.urlopen(url, timeout=5) as response:
                body = response.read().decode("utf-8", errors="replace")
            server.shutdown()
            thread.join(timeout=5)
            if "cytoscape" not in body.lower() and "graph-data" not in body:
                raise RuntimeError("Viewer smoke check did not find expected HTML markers")
            print("core_viewer_smoke=ok")
            return 0
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            return 0


def cmd_core_query(args) -> int:
    if args.list:
        result = list_queries()
    elif args.sparql:
        result = run_sparql_query(args.run, Path(args.sparql))
    else:
        result = run_named_query(args.run, args.named)
    if args.format == "json":
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        print(render_query_text(result))
    return 0


def cmd_doc_diff(args) -> int:
    document = Path(args.document)
    run_dir = diff_document_against_core_ontology(document, args.run)
    print(f"document_diff={rel(run_dir / CORE_GRAPH_FILENAMES['document_diff_report'])}")
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
