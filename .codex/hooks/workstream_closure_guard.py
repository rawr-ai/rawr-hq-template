#!/usr/bin/env python3
"""Stop-hook closure guard for workstream runtime artifacts."""

from workstream_common import (
    block,
    changed_files,
    diff_check,
    is_workstream_repo,
    load_payload,
    repo_root,
    silent,
    validate_runtime_bundle,
    workstream_related,
    workstream_report_issues,
)


def main() -> None:
    payload = load_payload()
    root = repo_root(payload)
    if not is_workstream_repo(root):
        silent()
        return

    related = workstream_related(changed_files(root))
    if not related:
        silent()
        return

    issues = []
    if any(path.startswith(".codex/") for path in related):
        issues.extend(validate_runtime_bundle(root, compile_hooks=True))
    issues.extend(workstream_report_issues(root, related))
    issues.extend(diff_check(root, related))

    if not issues:
        silent()
        return

    block(
        "Fix workstream mechanical closure gaps before finalizing:\n"
        + "\n".join(f"- {issue}" for issue in issues[:12])
    )


if __name__ == "__main__":
    main()
