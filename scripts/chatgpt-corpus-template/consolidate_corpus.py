#!/usr/bin/env python3

raise SystemExit(
    "scripts/chatgpt-corpus-template/consolidate_corpus.py is no longer the canonical "
    "entry point.\n\n"
    "Use the TypeScript service + CLI projection instead:\n"
    "  rawr corpus init [path]\n"
    "  rawr corpus consolidate [path]\n\n"
    "Canonical sources of truth:\n"
    "  - services/chatgpt-corpus\n"
    "  - plugins/cli/chatgpt-corpus\n"
)
    by_messages_hash: dict[str, list[SourceRecord]] = defaultdict(list)
    by_link: dict[str, list[SourceRecord]] = defaultdict(list)

    for record in json_records:
        by_hash[record.hash].append(record)
        if record.messages_hash:
            by_messages_hash[record.messages_hash].append(record)
        if record.link:
            by_link[record.link].append(record)

        messages = record.messages or []
        if not messages:
            anomalies.append(
                {
                    "anomaly_id": f"anomaly-{slugify(record.path.stem)}-empty-conversation",
                    "type": "empty_conversation",
                    "source_ids": [record.source_id],
                    "severity": "high",
                    "notes": "Conversation export contains no messages.",
                }
            )
            continue

        last_response = next(
            (m.get("say", "") for m in reversed(messages) if m.get("role") == "Response"),
            "",
        )
        if not (last_response or "").strip():
            anomalies.append(
                {
                    "anomaly_id": f"anomaly-{slugify(record.path.stem)}-blank-final-response",
                    "type": "blank_final_response",
                    "source_ids": [record.source_id],
                    "severity": "medium",
                    "notes": "Final assistant response is blank in this export.",
                }
            )

        if any("tokens truncated" in (m.get("say", "") or "").lower() for m in messages):
            anomalies.append(
                {
                    "anomaly_id": f"anomaly-{slugify(record.path.stem)}-truncated-message",
                    "type": "truncated_message",
                    "source_ids": [record.source_id],
                    "severity": "medium",
                    "notes": "At least one message contains exporter truncation text.",
                }
            )

    for hash_value, members in by_hash.items():
        if len(members) > 1:
            anomalies.append(
                {
                    "anomaly_id": f"anomaly-duplicate-hash-{hash_value[:12]}",
                    "type": "duplicate_hash",
                    "source_ids": [member.source_id for member in members],
                    "severity": "low",
                    "notes": "Files share the same content hash.",
                }
            )

    for hash_value, members in by_messages_hash.items():
        if len(members) > 1:
            anomalies.append(
                {
                    "anomaly_id": f"anomaly-duplicate-messages-{hash_value[:12]}",
                    "type": "duplicate_messages",
                    "source_ids": [member.source_id for member in members],
                    "severity": "low",
                    "notes": "Exports share identical message content even if metadata differs.",
                }
            )

    for link, members in by_link.items():
        if len(members) > 1:
            anomalies.append(
                {
                    "anomaly_id": f"anomaly-same-link-{slugify(link.split('/c/')[-1])}",
                    "type": "same_conversation_link",
                    "source_ids": [member.source_id for member in members],
                    "severity": "low",
                    "notes": "Multiple exports share the same ChatGPT conversation link.",
                }
            )

    return anomalies


def confidence_for_edge(
    exact_prefix_len: int,
    fuzzy_prefix_len: int,
    child_len: int,
    parent_len: int,
    same_title: bool,
    same_link: bool,
    same_first_prompt: bool,
    exact_duplicate: bool,
) -> float:
    if exact_duplicate:
        return 1.0
    ratio = exact_prefix_len / max(1, min(child_len, parent_len))
    confidence = 0.4 + ratio * 0.35
    if fuzzy_prefix_len >= exact_prefix_len:
        confidence += 0.08
    if same_title:
        confidence += 0.1
    if same_link:
        confidence += 0.1
    if same_first_prompt:
        confidence += 0.12
    return round(min(0.99, confidence), 2)


def build_family_graphs(json_records: list[SourceRecord]) -> list[dict[str, Any]]:
    pair_metrics: dict[tuple[str, str], dict[str, Any]] = {}
    names_to_record = {record.path.name: record for record in json_records}

    for left in json_records:
        for right in json_records:
            if left.path.name >= right.path.name:
                continue
            left_messages = left.messages or []
            right_messages = right.messages or []
            left_first_prompt = next((m.get("say", "") for m in left_messages if m.get("role") == "Prompt"), "")
            right_first_prompt = next((m.get("say", "") for m in right_messages if m.get("role") == "Prompt"), "")
            pair_metrics[(left.path.name, right.path.name)] = {
                "exact_prefix_len": shared_prefix(left_messages, right_messages),
                "fuzzy_prefix_len": shared_prefix(left_messages, right_messages, fuzzy=True),
                "same_link": bool(left.link and left.link == right.link),
                "same_normalized_title": left.normalized_title == right.normalized_title,
                "same_first_prompt": bool(left_first_prompt and left_first_prompt == right_first_prompt),
                "exact_duplicate": left.messages_hash == right.messages_hash,
            }

    parent = {record.path.name: record.path.name for record in json_records}

    def find(name: str) -> str:
        while parent[name] != name:
            parent[name] = parent[parent[name]]
            name = parent[name]
        return name

    def union(left: str, right: str) -> None:
        left_root = find(left)
        right_root = find(right)
        if left_root != right_root:
            parent[right_root] = left_root

    for (left_name, right_name), metrics in pair_metrics.items():
        if metrics["same_normalized_title"]:
            union(left_name, right_name)
        elif metrics["same_first_prompt"] and metrics["exact_prefix_len"] >= 4:
            union(left_name, right_name)

    groups: dict[str, list[str]] = defaultdict(list)
    for name in parent:
        groups[find(name)].append(name)

    family_graphs: list[dict[str, Any]] = []
    for member_names in sorted(groups.values(), key=lambda items: sorted(items)[0]):
        members = sorted(member_names)
        member_records = [names_to_record[name] for name in members]
        root_record = min(
            member_records,
            key=lambda item: (
                item.branch_depth,
                parse_date(item.created) or datetime.max,
                len(item.messages or []),
                item.path.name,
            ),
        )

        non_duplicates: list[SourceRecord] = []
        duplicates: dict[str, str] = {}
        for record in sorted(
            member_records,
            key=lambda item: (
                item.branch_depth,
                parse_date(item.created) or datetime.max,
                len(item.messages or []),
                item.path.name,
            ),
        ):
            dup_target = None
            for existing in non_duplicates:
                metrics = pair_metrics.get(tuple(sorted((record.path.name, existing.path.name))))
                if metrics and metrics["exact_duplicate"]:
                    dup_target = existing
                    break
            if dup_target is None:
                non_duplicates.append(record)
            else:
                duplicates[record.path.name] = dup_target.path.name

        classification: dict[str, str] = {}
        edges: list[dict[str, Any]] = []
        if len(non_duplicates) == 1 and not duplicates:
            classification[non_duplicates[0].path.name] = "standalone"
        else:
            classification[root_record.path.name] = "root"

        placed = [root_record]
        for record in non_duplicates:
            if record.path.name == root_record.path.name:
                continue
            best_parent = None
            best_metrics = None
            best_score = -1
            for candidate in placed:
                metrics = pair_metrics.get(tuple(sorted((record.path.name, candidate.path.name))))
                if not metrics:
                    continue
                score = (
                    metrics["exact_prefix_len"] * 100
                    + metrics["fuzzy_prefix_len"] * 10
                    + int(metrics["same_link"]) * 5
                    + int(metrics["same_normalized_title"]) * 3
                )
                if score > best_score:
                    best_score = score
                    best_parent = candidate
                    best_metrics = metrics
            if best_parent is None or best_metrics is None:
                best_parent = root_record
                best_metrics = {
                    "exact_prefix_len": 0,
                    "fuzzy_prefix_len": 0,
                    "same_link": False,
                    "same_normalized_title": False,
                    "same_first_prompt": False,
                    "exact_duplicate": False,
                }
            placed.append(record)
            classification[record.path.name] = "branch"
            confidence = confidence_for_edge(
                exact_prefix_len=best_metrics["exact_prefix_len"],
                fuzzy_prefix_len=best_metrics["fuzzy_prefix_len"],
                child_len=len(record.messages or []),
                parent_len=len(best_parent.messages or []),
                same_title=best_metrics["same_normalized_title"],
                same_link=best_metrics["same_link"],
                same_first_prompt=best_metrics["same_first_prompt"],
                exact_duplicate=best_metrics["exact_duplicate"],
            )
            evidence = [
                f"exact_shared_prefix_messages={best_metrics['exact_prefix_len']}",
                f"fuzzy_shared_prefix_messages={best_metrics['fuzzy_prefix_len']}",
            ]
            if best_metrics["same_normalized_title"]:
                evidence.append(f"normalized_title_match={record.normalized_title}")
            if best_metrics["same_first_prompt"]:
                evidence.append("same_first_prompt=true")
            if best_metrics["same_link"]:
                evidence.append("same_export_link=true")
            edges.append(
                {
                    "from_source_id": record.source_id,
                    "to_source_id": best_parent.source_id,
                    "type": "branches_from",
                    "confidence": confidence,
                    "shared_prefix_len": best_metrics["exact_prefix_len"],
                    "evidence": evidence,
                }
            )

        for dup_name, canonical_name in duplicates.items():
            classification[dup_name] = "duplicate"
            metrics = pair_metrics[tuple(sorted((dup_name, canonical_name)))]
            edges.append(
                {
                    "from_source_id": names_to_record[dup_name].source_id,
                    "to_source_id": names_to_record[canonical_name].source_id,
                    "type": "duplicate_of",
                    "confidence": 1.0,
                    "shared_prefix_len": metrics["exact_prefix_len"],
                    "evidence": ["exact_duplicate_messages=true"],
                }
            )

        family_id = f"family-{slugify(root_record.normalized_title or root_record.title)}"
        family_graphs.append(
            {
                "family_id": family_id,
                "canonical_title": root_record.normalized_title or root_record.title,
                "summary": root_record.summary,
                "member_source_ids": [record.source_id for record in member_records],
                "member_filenames": members,
                "root_source_id": root_record.source_id,
                "classification": {
                    names_to_record[name].source_id: classification[name] for name in members
                },
                "edges": edges,
            }
        )

    return family_graphs


def build_relationships(family_graphs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    relationships: list[dict[str, Any]] = []
    for family in family_graphs:
        for edge in family["edges"]:
            relationships.append(
                {
                    "from_id": edge["from_source_id"],
                    "to_id": edge["to_source_id"],
                    "type": edge["type"],
                    "confidence": edge["confidence"],
                    "evidence": edge["evidence"],
                    "notes": f"Shared prefix length: {edge['shared_prefix_len']}",
                }
            )
    return relationships


def build_unified_thread(
    family: dict[str, Any],
    json_records_by_id: dict[str, SourceRecord],
    anomalies: list[dict[str, Any]],
) -> dict[str, Any]:
    source_lookup = {
        source_id: json_records_by_id[source_id]
        for source_id in family["member_source_ids"]
    }
    edges_by_source_id = {
        edge["from_source_id"]: edge
        for edge in family["edges"]
        if edge["type"] != "duplicate_of"
    }
    duplicate_edges_by_source_id = {
        edge["from_source_id"]: edge
        for edge in family["edges"]
        if edge["type"] == "duplicate_of"
    }

    order: list[str] = []
    visited: set[str] = set()

    def visit(source_id: str) -> None:
        if source_id in visited:
            return
        edge = edges_by_source_id.get(source_id)
        if edge:
            visit(edge["to_source_id"])
        visited.add(source_id)
        order.append(source_id)

    for source_id in family["member_source_ids"]:
        if source_id not in duplicate_edges_by_source_id:
            visit(source_id)

    nodes: list[dict[str, Any]] = []
    graph_edges: list[dict[str, Any]] = []
    branches: list[dict[str, Any]] = []
    branch_points: list[dict[str, Any]] = []
    representative_node_id: dict[tuple[str, int], str] = {}
    source_path_nodes: dict[str, list[str]] = {}

    def add_message_nodes(
        record: SourceRecord,
        divergence_index: int,
        parent_source_id: str | None,
        branch_point_id: str | None,
    ) -> tuple[str | None, str | None]:
        branch_nodes: list[str] = []
        for index, message in enumerate(record.messages or []):
            if parent_source_id and index < divergence_index:
                branch_nodes.append(representative_node_id[(parent_source_id, index)])
                representative_node_id[(record.source_id, index)] = representative_node_id[(parent_source_id, index)]
                continue
            node_id = f"{family['family_id']}__msg__{slugify(record.path.stem)}__{index:03d}"
            representative_node_id[(record.source_id, index)] = node_id
            branch_nodes.append(node_id)
            nodes.append(
                {
                    "node_id": node_id,
                    "type": "message",
                    "role": message.get("role"),
                    "say": message.get("say", ""),
                    "source_file_id": record.source_id,
                    "source_message_index": index,
                    "source_title": record.title,
                    "source_link": record.link,
                }
            )
            if parent_source_id and index == divergence_index and branch_point_id:
                graph_edges.append(
                    {
                        "from_node_id": branch_point_id,
                        "to_node_id": node_id,
                        "type": "starts_branch_path",
                    }
                )
            elif index > 0:
                previous_node_id = representative_node_id[(record.source_id, index - 1)]
                if previous_node_id != node_id:
                    graph_edges.append(
                        {
                            "from_node_id": previous_node_id,
                            "to_node_id": node_id,
                            "type": "next_message",
                        }
                    )
        source_path_nodes[record.source_id] = branch_nodes
        unique_nodes = [node for i, node in enumerate(branch_nodes) if i == 0 or node != branch_nodes[i - 1]]
        return (unique_nodes[0] if unique_nodes else None, unique_nodes[-1] if unique_nodes else None)

    root_source_id = family["root_source_id"]
    root_record = source_lookup[root_source_id]
    root_start, root_end = add_message_nodes(root_record, 0, None, None)
    branches.append(
        {
            "branch_id": f"{family['family_id']}__branch__{slugify(root_record.path.stem)}",
            "parent_branch_point_id": None,
            "semantic_name": slugify(root_record.path.stem),
            "status": family["classification"][root_source_id],
            "source_file_ids": [root_source_id],
            "start_node_id": root_start,
            "end_node_id": root_end,
            "confidence": 1.0,
            "rationale": "Selected as the earliest or shallowest representative conversation in the family.",
        }
    )

    for source_id in order:
        if source_id == root_source_id:
            continue
        record = source_lookup[source_id]
        edge = edges_by_source_id[source_id]
        divergence_index = edge["shared_prefix_len"]
        anchor_node_id = representative_node_id.get((edge["to_source_id"], divergence_index - 1))
        branch_point_id = f"{family['family_id']}__branch-point__{slugify(record.path.stem)}"
        branch_points.append(
            {
                "branch_point_id": branch_point_id,
                "parent_source_id": edge["to_source_id"],
                "child_source_id": source_id,
                "shared_prefix_len": divergence_index,
                "anchor_node_id": anchor_node_id,
                "evidence": edge["evidence"],
                "confidence": edge["confidence"],
            }
        )
        nodes.append(
            {
                "node_id": branch_point_id,
                "type": "branch_point",
                "parent_source_id": edge["to_source_id"],
                "child_source_id": source_id,
                "shared_prefix_len": divergence_index,
                "anchor_node_id": anchor_node_id,
                "evidence": edge["evidence"],
                "confidence": edge["confidence"],
            }
        )
        if anchor_node_id:
            graph_edges.append(
                {
                    "from_node_id": anchor_node_id,
                    "to_node_id": branch_point_id,
                    "type": "branches_at",
                }
            )
        start_node_id, end_node_id = add_message_nodes(record, divergence_index, edge["to_source_id"], branch_point_id)
        branches.append(
            {
                "branch_id": f"{family['family_id']}__branch__{slugify(record.path.stem)}",
                "parent_branch_point_id": branch_point_id,
                "semantic_name": slugify(record.path.stem),
                "status": family["classification"][source_id],
                "source_file_ids": [source_id],
                "start_node_id": start_node_id,
                "end_node_id": end_node_id,
                "confidence": edge["confidence"],
                "rationale": "Grouped into this family by shared title or shared opening conversation trunk.",
            }
        )

    for source_id, edge in duplicate_edges_by_source_id.items():
        canonical_source_id = edge["to_source_id"]
        canonical_path_nodes = source_path_nodes.get(canonical_source_id, [])
        source_path_nodes[source_id] = list(canonical_path_nodes)
        record = source_lookup[source_id]
        branches.append(
            {
                "branch_id": f"{family['family_id']}__branch__{slugify(record.path.stem)}",
                "parent_branch_point_id": None,
                "semantic_name": slugify(record.path.stem),
                "status": family["classification"][source_id],
                "source_file_ids": [source_id],
                "start_node_id": canonical_path_nodes[0] if canonical_path_nodes else None,
                "end_node_id": canonical_path_nodes[-1] if canonical_path_nodes else None,
                "confidence": 1.0,
                "rationale": "Marked duplicate because the message payload matches another export exactly.",
            }
        )

    default_reading_order: list[str] = []
    seen: set[str] = set()
    for source_id in order:
        for node_id in source_path_nodes.get(source_id, []):
            if node_id not in seen:
                seen.add(node_id)
                default_reading_order.append(node_id)

    family_anomalies = [
        anomaly
        for anomaly in anomalies
        if any(source_id in family["member_source_ids"] for source_id in anomaly["source_ids"])
    ]

    return {
        "schema_version": "rawr.conversation-thread.v1",
        "thread_id": family["family_id"],
        "canonical_title": family["canonical_title"],
        "root_source_ids": [root_source_id],
        "source_files": [
            {
                "source_id": record.source_id,
                "filename": record.path.name,
                "path": str(record.path.resolve()),
                "title": record.title,
                "classification": family["classification"][record.source_id],
                "link": record.link,
                "message_count": len(record.messages or []),
            }
            for record in source_lookup.values()
        ],
        "source_links": sorted({record.link for record in source_lookup.values() if record.link}),
        "summary": family["summary"],
        "nodes": nodes,
        "edges": graph_edges,
        "branch_points": branch_points,
        "branches": branches,
        "views": {
            "default_reading_order": default_reading_order,
            "root_path_order": source_path_nodes.get(root_source_id, []),
            "branch_orders": {
                branch["branch_id"]: source_path_nodes.get(branch["source_file_ids"][0], [])
                for branch in branches
                if branch["source_file_ids"]
            },
        },
        "anomalies": family_anomalies,
    }


def build_intermediate_graph(
    normalized_threads: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
) -> dict[str, Any]:
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    for thread in normalized_threads:
        nodes.extend({"thread_id": thread["thread_id"], **node} for node in thread["nodes"])
        edges.extend({"thread_id": thread["thread_id"], **edge} for edge in thread["edges"])
    return {
        "schema_version": "rawr.conversation-intermediate-graph.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "nodes": nodes,
        "edges": edges,
        "relationships": relationships,
    }


def build_manifest(
    inventory: list[dict[str, Any]],
    family_graphs: list[dict[str, Any]],
    normalized_threads: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
    anomalies: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "manifest_version": "rawr.conversation-corpus.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "workspace_root": str(ROOT.resolve()),
        "corpus_summary": {
            "source_count": len(inventory),
            "json_conversation_count": sum(1 for item in inventory if item["type"] == "json_conversation"),
            "markdown_document_count": sum(1 for item in inventory if item["type"] == "markdown_document"),
            "family_count": len(family_graphs),
            "normalized_thread_count": len(normalized_threads),
            "anomaly_count": len(anomalies),
        },
        "source_items": inventory,
        "thread_families": family_graphs,
        "normalized_threads": [
            {
                "thread_id": thread["thread_id"],
                "canonical_title": thread["canonical_title"],
                "path": str((NORMALIZED_DIR / f"{thread['thread_id']}.json").resolve()),
                "branch_count": len(thread["branches"]),
                "anomaly_count": len(thread["anomalies"]),
            }
            for thread in normalized_threads
        ],
        "documents": [
            {
                "source_id": item["source_id"],
                "title": item["title"],
                "path": item["path"],
                "summary": item["summary"],
            }
            for item in inventory
            if item["type"] == "markdown_document"
        ],
        "relationships": relationships,
        "anomalies": anomalies,
    }


def build_ambiguity_flags(
    family_graphs: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    flags: list[dict[str, Any]] = []
    for relation in relationships:
        if relation["confidence"] < 0.85:
            flags.append(
                {
                    "kind": "low_confidence_relationship",
                    "from_id": relation["from_id"],
                    "to_id": relation["to_id"],
                    "type": relation["type"],
                    "confidence": relation["confidence"],
                    "notes": relation["notes"],
                }
            )
    for family in family_graphs:
        branch_count = sum(1 for value in family["classification"].values() if value in {"root", "branch", "standalone"})
        if branch_count > 1 and not any(edge["confidence"] >= 0.9 for edge in family["edges"] if edge["type"] != "duplicate_of"):
            flags.append(
                {
                    "kind": "weak_family_branching_signal",
                    "family_id": family["family_id"],
                    "notes": "This family grouped multiple conversations without any high-confidence branch edge.",
                }
            )
    if not any(ROOT.joinpath("work", "docs", "source").glob("*.md")):
        flags.append(
            {
                "kind": "no_markdown_docs",
                "notes": "No curated Markdown source docs were present under work/docs/source.",
            }
        )
    return flags


def build_canonicality_summary(family_graphs: list[dict[str, Any]]) -> str:
    lines = ["# Canonicality Summary", "", "## Conversation Families", ""]
    if not family_graphs:
        lines.append("- No conversation exports were found.")
        return "\n".join(lines)

    for family in family_graphs:
        root_source_id = family["root_source_id"]
        root_filename = next(
            filename
            for source_id, filename in zip(family["member_source_ids"], family["member_filenames"])
            if source_id == root_source_id
        )
        duplicate_count = sum(1 for value in family["classification"].values() if value == "duplicate")
        lines.append(
            f"- `{family['canonical_title']}`: root `{root_filename}`, "
            f"{len(family['member_source_ids'])} source files, {duplicate_count} duplicates."
        )
    return "\n".join(lines)


def build_decision_log() -> str:
    return """# Decision Log

## Confirmed defaults

- Raw conversation exports remain untouched in `source-material/conversations/raw-json/`.
- Optional Markdown source docs live under `work/docs/source/`.
- All derived artifacts are written under `work/generated/`.
- Conversation families are grouped by normalized title first, then by matching opening prompt plus shared prefix depth.
- Root conversations are selected by shallower branch depth, earlier creation date when available, then shorter message history.
- Exact message duplicates stay visible as duplicate branches instead of being silently discarded.
"""


def build_mental_map(family_graphs: list[dict[str, Any]], anomalies: list[dict[str, Any]]) -> str:
    lines = ["# Mental Map", "", "## Families", ""]
    if not family_graphs:
        lines.append("- No conversation exports were found.")
    else:
        for family in family_graphs:
            lines.append(f"- `{family['family_id']}`: {family['summary']}")

    lines.extend(["", "## Anomalies", ""])
    if not anomalies:
        lines.append("- No anomalies detected.")
    else:
        for anomaly in anomalies:
            lines.append(f"- `{anomaly['type']}` on {', '.join(anomaly['source_ids'])}")
    return "\n".join(lines)


def validate_outputs(
    inventory: list[dict[str, Any]],
    family_graphs: list[dict[str, Any]],
    normalized_threads: list[dict[str, Any]],
    manifest: dict[str, Any],
) -> dict[str, Any]:
    json_source_ids = {item["source_id"] for item in inventory if item["type"] == "json_conversation"}
    family_source_ids = {
        source_id
        for family in family_graphs
        for source_id in family["member_source_ids"]
    }
    validation = {
        "source_inventory_complete": len(inventory)
        == len(list(SOURCE_JSON_DIR.glob("*.json"))) + len(list(SOURCE_DOCS_DIR.glob("*.md"))),
        "every_json_in_one_family": json_source_ids == family_source_ids,
        "one_normalized_thread_per_family": len(normalized_threads) == len(family_graphs),
        "normalized_threads_written": all((NORMALIZED_DIR / f"{thread['thread_id']}.json").exists() for thread in normalized_threads),
        "manifest_has_workspace_root": bool(manifest.get("workspace_root")),
    }
    validation["all_passed"] = all(validation.values())
    return validation


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=False) + "\n", encoding="utf-8")


def write_markdown(path: Path, text: str) -> None:
    path.write_text(text.rstrip() + "\n", encoding="utf-8")


def main() -> None:
    ensure_dirs()
    records = load_sources()
    json_records = [record for record in records if record.type == "json_conversation"]
    json_records_by_id = {record.source_id: record for record in json_records}

    inventory = build_inventory(records)
    anomalies = detect_anomalies(json_records)
    family_graphs = build_family_graphs(json_records)
    relationships = build_relationships(family_graphs)

    normalized_threads: list[dict[str, Any]] = []
    for family in family_graphs:
        thread = build_unified_thread(family, json_records_by_id, anomalies)
        normalized_threads.append(thread)
        write_json(NORMALIZED_DIR / f"{family['family_id']}.json", thread)

    intermediate_graph = build_intermediate_graph(normalized_threads, relationships)
    manifest = build_manifest(inventory, family_graphs, normalized_threads, relationships, anomalies)
    ambiguity_flags = build_ambiguity_flags(family_graphs, relationships)

    write_json(CORPUS_DIR / "inventory.json", inventory)
    write_json(CORPUS_DIR / "family-graphs.json", family_graphs)
    write_json(CORPUS_DIR / "intermediate-graph.json", intermediate_graph)
    write_json(CORPUS_DIR / "corpus-manifest.json", manifest)
    write_json(REPORTS_DIR / "anomalies.json", anomalies)
    write_json(REPORTS_DIR / "ambiguity-flags.json", ambiguity_flags)
    write_markdown(REPORTS_DIR / "canonicality-summary.md", build_canonicality_summary(family_graphs))
    write_markdown(REPORTS_DIR / "decision-log.md", build_decision_log())
    write_markdown(REPORTS_DIR / "mental-map.md", build_mental_map(family_graphs, anomalies))
    write_markdown(WORK_DIR / "README.md", WORKSPACE_README)

    validation = validate_outputs(inventory, family_graphs, normalized_threads, manifest)
    write_json(REPORTS_DIR / "validation-report.json", validation)
    if not validation["all_passed"]:
        raise SystemExit("Validation failed; see work/generated/reports/validation-report.json")


if __name__ == "__main__":
    main()
