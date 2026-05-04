#!/usr/bin/env python3
"""Fast mechanical health checks after workstream-related tool use."""

from workstream_common import (
    changed_files,
    diff_check,
    is_workstream_repo,
    load_payload,
    repo_root,
    silent,
    validate_runtime_bundle,
    warn,
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
        issues.extend(validate_runtime_bundle(root, compile_hooks=False))
    issues.extend(workstream_report_issues(root, related))
    issues.extend(diff_check(root, related))

    if not issues:
        silent()
        return

    warn(
        "Workstream mechanical health warnings:\n"
        + "\n".join(f"- {issue}" for issue in issues[:12])
    )


if __name__ == "__main__":
    main()
