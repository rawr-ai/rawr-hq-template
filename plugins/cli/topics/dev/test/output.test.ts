import { expect, test } from "bun:test";
import type {
  RepoSyncResult,
  StackDoctorResult,
  StackDrainResult,
  WorktreeCleanupResult,
} from "@habitat-ai/dev-service/client";
import { type DevOutcome, exitCode, formatOutcome } from "../src/output.js";

const common = {
  repositoryRoot: "/repository",
  issues: [
    {
      code: "SCRATCH_MISSING",
      message: "Explicit scratch evidence is missing",
      severity: "warning" as const,
    },
  ],
  scratch: {
    mode: "warn" as const,
    files: [{ path: "/repository/review.md", status: "missing" as const }],
  },
  steps: [
    {
      command: "git",
      args: ["status", "--porcelain"],
      status: "succeeded" as const,
      exitCode: 0,
      stdout: "",
      stderr: "",
      failure: null,
    },
  ],
};
const sync: RepoSyncResult = {
  ...common,
  kind: "Planned",
  branch: "topic",
  upstream: { remote: "origin", branch: "main", source: "configured" },
  before: "a".repeat(40),
  after: null,
};
const stack = {
  trunk: "main",
  branches: [{ branch: "topic", parent: "main", needsRestack: false }],
};
const doctor: StackDoctorResult = {
  ...common,
  kind: "Healthy",
  branch: "topic",
  dirty: false,
  worktrees: [{ path: "/repository", branch: "topic", detached: false, locked: false }],
  stack,
};
const drain: StackDrainResult = { ...common, kind: "Planned", branch: "topic", stack };
const cleanup: WorktreeCleanupResult = {
  ...common,
  kind: "Planned",
  candidates: [{ path: "/wt-owned-merged", branch: "done" }],
  skipped: [{ path: "/repository", reason: "current" }],
  removed: [],
};

test("each public result kind retains the accepted zero/one exit policy", () => {
  for (const kind of ["Planned", "Updated", "Refused", "Failed"] as const)
    expect(
      exitCode({ operation: "repo.syncUpstream", json: true, result: { ...sync, kind } })
    ).toBe(kind === "Planned" || kind === "Updated" ? 0 : 1);
  for (const kind of ["Planned", "Requested", "Refused", "Failed"] as const)
    expect(exitCode({ operation: "stack.drain", json: true, result: { ...drain, kind } })).toBe(
      kind === "Planned" || kind === "Requested" ? 0 : 1
    );
  for (const kind of ["Planned", "Applied", "Refused", "Failed"] as const)
    expect(
      exitCode({ operation: "worktree.cleanup", json: true, result: { ...cleanup, kind } })
    ).toBe(kind === "Planned" || kind === "Applied" ? 0 : 1);
  expect(exitCode({ operation: "stack.doctor", json: true, noFail: false, result: doctor })).toBe(
    0
  );
  expect(
    exitCode({
      operation: "stack.doctor",
      json: true,
      noFail: false,
      result: { ...doctor, kind: "NeedsAttention" },
    })
  ).toBe(1);
  expect(
    exitCode({
      operation: "stack.doctor",
      json: true,
      noFail: true,
      result: { ...doctor, kind: "NeedsAttention" },
    })
  ).toBe(0);
});

const outcomes: DevOutcome[] = [
  { operation: "repo.syncUpstream", result: sync, json: true },
  { operation: "stack.doctor", result: doctor, json: true, noFail: true },
  { operation: "stack.drain", result: drain, json: true },
  { operation: "worktree.cleanup", result: cleanup, json: true },
];
for (const outcome of outcomes) {
  test(`${outcome.operation}: JSON and human output preserve all native evidence`, () => {
    const expected = { operation: outcome.operation, result: outcome.result };
    expect(formatOutcome(outcome)).toBe(`${JSON.stringify(expected)}\n`);
    expect(JSON.parse(formatOutcome(outcome))).toEqual(expected);
    expect(formatOutcome({ ...outcome, json: false })).toBe(
      `${JSON.stringify(expected, null, 2)}\n`
    );
  });
}

test("requested drain is explicitly asynchronous, never rendered as merged or converged", () => {
  const outcome = {
    operation: "stack.drain",
    result: { ...drain, kind: "Requested" },
    json: true,
  } as const;
  expect(JSON.parse(formatOutcome(outcome))).toEqual({
    operation: outcome.operation,
    result: outcome.result,
  });
  expect(formatOutcome({ ...outcome, json: false })).toStartWith(
    "Native merge job requested. Completion is not verified.\n"
  );
});

test("partial native failure retains attempted prefix and independent stdout/stderr/failure", () => {
  const result: StackDrainResult = {
    ...drain,
    kind: "Failed",
    steps: [
      {
        command: "gt",
        args: ["submit", "--publish", "--no-stack", "--no-ai", "--no-edit", "--no-interactive"],
        status: "succeeded",
        exitCode: 0,
        stdout: "Submitted\n",
        stderr: "warning\n",
        failure: null,
      },
      {
        command: "gt",
        args: ["merge", "--no-interactive"],
        status: "failed",
        exitCode: null,
        stdout: "Started request\n",
        stderr: "native stderr\n",
        failure: "Native process output exceeded its bound",
      },
    ],
  };
  const outcome = { operation: "stack.drain", result, json: true } as const;
  expect(exitCode(outcome)).toBe(1);
  expect(JSON.parse(formatOutcome(outcome)).result).toEqual(result);
  expect(formatOutcome({ ...outcome, json: false })).not.toContain("Completion is not verified");
});
