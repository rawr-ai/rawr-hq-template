#!/usr/bin/env bun
import {
  changedFiles,
  continuationIssues,
  diffCheck,
  isWorkstreamPackRepo,
  loadPayload,
  repoRoot,
  runtimeRelated,
  silent,
  validateRuntimeBundle,
  warn,
} from "./workstream_common.ts";

const payload = loadPayload();
const root = repoRoot(payload);

if (!isWorkstreamPackRepo(root)) {
  silent();
} else {
  const changed = changedFiles(root);
  const runtime = runtimeRelated(changed);
  const issues = [
    ...(runtime.length ? validateRuntimeBundle(root, true) : []),
    ...diffCheck(root, runtime),
    ...continuationIssues(root),
  ];

  if (!issues.length) {
    silent();
  } else {
    warn(
      `Workstream mechanical note:\n${[...new Set(issues)]
        .slice(0, 16)
        .map((issue) => `- ${issue}`)
        .join("\n")}`
    );
  }
}
