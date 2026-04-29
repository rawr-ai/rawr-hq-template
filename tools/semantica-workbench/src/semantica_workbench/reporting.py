from __future__ import annotations

from .io import read_json


def render_report(run_dir) -> str:
    metadata = read_json(run_dir / "metadata.json")
    seeds = read_json(run_dir / "seeds.json")
    ontology = read_json(run_dir / "ontology.json")
    diff = read_json(run_dir / "semantic-diff.json")
    semantica = ontology.get("semantica", {})
    validation = diff.get("validation", {})

    lines = [
        "# Semantica Workbench Report",
        "",
        f"- Project: `{metadata['manifest']['project']}`",
        f"- Run: `{metadata['run_id']}`",
        f"- Git SHA: `{metadata['git_sha']}`",
        f"- Model: `{metadata.get('model')}`",
        f"- Extraction modes: `{', '.join(metadata.get('extraction_modes', []))}`",
        f"- Semantica available: `{semantica.get('available')}`",
        "",
        "## Summary",
        "",
        f"- Sources: {metadata['manifest']['source_count']}",
        f"- Chunks: {metadata['chunk_count']}",
        f"- Seed entities: {seeds['summary']['seed_count']}",
        f"- Seed relations: {seeds['summary']['relation_count']}",
        f"- Entities: {ontology['summary']['entity_count']}",
        f"- Relations: {ontology['summary']['relation_count']}",
        f"- Claims: {ontology['summary']['claim_count']}",
        f"- Replacement rules: {diff['summary']['replacement_rule_count']}",
        f"- Forbidden terms: {diff['summary']['forbidden_term_count']}",
        f"- Supersession edges: {diff['summary']['supersession_edge_count']}",
        f"- Stale overlap candidates: {diff['summary']['stale_overlap_candidate_count']}",
        f"- Validation issues: {diff['summary']['validation_issue_count']}",
        "",
        "## Quality Gates",
        "",
    ]
    for name, passed in validation.get("checks", {}).items():
        marker = "PASS" if passed else "FAIL"
        lines.append(f"- {marker}: `{name}`")

    lines.extend(["", "## Predicate Distribution", ""])
    for predicate, count in validation.get("predicate_counts", {}).items():
        lines.append(f"- `{predicate}`: {count}")
    if not validation.get("predicate_counts"):
        lines.append("- No relation predicates emitted.")

    append_relation_section(lines, "Supersession Edges", diff.get("supersession_edges", []), limit=12)
    append_relation_section(lines, "Replacement Rules", diff.get("replacement_rules", []), limit=20)
    append_entity_section(lines, "Forbidden Target Terms", diff.get("forbidden_terms", []), limit=25)
    append_relation_section(lines, "Ownership Edges", diff.get("ownership_edges", []), limit=20)
    append_claim_section(lines, "Stale Overlap Candidates", diff.get("stale_overlap_candidates", []), limit=20)
    append_entity_section(
        lines, "Preserved Broad Architecture Concepts", diff.get("preserved_broad_concepts", []), limit=20
    )

    lines.extend(["", "## Recommended Next Actions", ""])
    for action in diff.get("recommended_next_actions", []):
        lines.append(f"- {action}")

    if validation.get("issues"):
        lines.extend(["", "## Validation Issues", ""])
        for issue in validation["issues"][:20]:
            lines.append(f"- `{issue['kind']}`: {issue}")

    return "\n".join(lines) + "\n"


def append_relation_section(lines: list[str], title: str, items: list[dict], limit: int) -> None:
    lines.extend(["", f"## {title}", ""])
    if not items:
        lines.append("- None found.")
        return
    for relation in items[:limit]:
        prov = relation["provenance"]
        lines.append(
            f"- `{relation['subject']}` `{relation['predicate']}` `{relation['object']}` "
            f"({prov['path']}:{prov['line_start']}, rank {relation['authority_rank']})"
        )


def append_entity_section(lines: list[str], title: str, items: list[dict], limit: int) -> None:
    lines.extend(["", f"## {title}", ""])
    if not items:
        lines.append("- None found.")
        return
    for entity in items[:limit]:
        lines.append(
            f"- `{entity['name']}` ({entity['type']}, {entity['authority_status']}, "
            f"scope `{entity['authority_scope']}`, rank {entity['authority_rank']})"
        )


def append_claim_section(lines: list[str], title: str, items: list[dict], limit: int) -> None:
    lines.extend(["", f"## {title}", ""])
    if not items:
        lines.append("- None found.")
        return
    for claim in items[:limit]:
        prov = claim["provenance"]
        lines.append(
            f"- `{claim['authority_status']}` `{claim['claim_type']}` "
            f"{prov['path']}:{prov['line_start']} - {claim['text'][:260]}"
        )
