#!/usr/bin/env python3
"""Add workstream startup context at Codex session start."""

from workstream_common import context, is_workstream_repo, load_payload, repo_root, silent


def main() -> None:
    payload = load_payload()
    root = repo_root(payload)
    if not is_workstream_repo(root):
        silent()
        return

    context(
        "Workstream startup checklist: check repo/Graphite state; frame objective, boundary, non-goals, and done condition; build the opening packet with authority, coordination, evidence, stale/excluded, and control inputs; select the workstream-runner and workstream-review-loops skills when relevant; define output contract, gates, review loops, stop conditions, and closure expectations. The DRA owns synthesis and scope decisions."
    )


if __name__ == "__main__":
    main()
