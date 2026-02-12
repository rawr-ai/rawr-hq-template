import { describe, expect, it } from "vitest";

import { decideMergeAction } from "../src/lib/plugins-lifecycle/policy";
import type { JudgeResult, LifecycleCheckData } from "../src/lib/plugins-lifecycle/types";

function makeLifecycle(status: "pass" | "fail"): LifecycleCheckData {
  return {
    status,
    target: {
      input: "demo",
      absPath: "/tmp/demo",
      relPath: "plugins/cli/demo",
      type: "cli",
    },
    missingTests: status === "pass" ? [] : ["missing"],
    missingDocs: [],
    missingDependents: [],
    syncVerified: status === "pass",
    driftVerified: status === "pass",
    driftDetected: false,
    details: {
      changedFilesConsidered: [],
      relevantChangedFiles: [],
      dependentFiles: [],
      codeChanged: [],
      testChanged: [],
      docsChanged: [],
    },
  };
}

function judge(judgeName: "A" | "B", outcome: JudgeResult["outcome"], confidence = 0.9): JudgeResult {
  return {
    judge: judgeName,
    outcome,
    confidence,
    reason: outcome,
  };
}

describe("decideMergeAction", () => {
  it("returns auto_merge on dual auto_merge and no comments", () => {
    const decision = decideMergeAction({
      lifecycle: makeLifecycle("pass"),
      commentsCount: 0,
      judge1: judge("A", "auto_merge"),
      judge2: judge("B", "auto_merge"),
    });

    expect(decision).toBe("auto_merge");
  });

  it("returns hold when comments are present", () => {
    const decision = decideMergeAction({
      lifecycle: makeLifecycle("pass"),
      commentsCount: 2,
      judge1: judge("A", "auto_merge"),
      judge2: judge("B", "auto_merge"),
    });

    expect(decision).toBe("hold");
  });

  it("returns policy_escalation when any judge escalates", () => {
    const decision = decideMergeAction({
      lifecycle: makeLifecycle("pass"),
      commentsCount: 0,
      judge1: judge("A", "policy_escalation"),
      judge2: judge("B", "auto_merge"),
    });

    expect(decision).toBe("policy_escalation");
  });

  it("returns fix_first when lifecycle check fails", () => {
    const decision = decideMergeAction({
      lifecycle: makeLifecycle("fail"),
      commentsCount: 0,
      judge1: judge("A", "auto_merge"),
      judge2: judge("B", "auto_merge"),
    });

    expect(decision).toBe("fix_first");
  });
});
