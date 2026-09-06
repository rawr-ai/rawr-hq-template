import { expect, test } from "bun:test";
import { exitCode, formatOutcome, type LifecycleOutcome } from "../src/output.js";
import { clean, currentMainBody } from "./support/fixture.js";

const digest = `ri1_${"a".repeat(64)}`;
const bytes = new TextEncoder().encode('{"canonical":"service bytes"}\n');
const release = {
  kind: "release",
  pluginId: "example",
  releaseDigest: `rd1_${"b".repeat(64)}`,
} as const;
const packageIdentity = {
  repositoryIdentity: clean.repositoryIdentity,
  sourceCommit: clean.sourceCommit,
  sourceTree: clean.sourceTree,
  release,
  format: "cowork-v1",
  outputPath: "/out/example.zip",
  packageDigest: `pkg1_${"c".repeat(64)}`,
} as const;
const packagingFailure = {
  code: "OutputVerifyFailed",
  phase: "verification",
  message: "original failure",
} as const;
const releaseIssue = {
  code: "INVALID_UTF8",
  path: "releaseInput",
  message: "original byte refusal",
} as const;
const vendorIssue = { code: "RuntimeFailure", detail: "original source refusal" } as const;

const recordOutcomes = [
  {
    operation: "releases.releaseInputRecord",
    json: false,
    result: {
      ok: true,
      value: { releaseInputDigest: digest, byteLength: bytes.byteLength, bytes },
    },
  },
  {
    operation: "governance.currentMainRecord",
    json: false,
    result: {
      ok: true,
      value: {
        protocol: "agent-plugin-current-main@v3",
        byteLength: bytes.byteLength,
        bytes,
        record: currentMainBody,
      },
    },
  },
  {
    operation: "releases.refreshReleaseInput",
    json: false,
    result: {
      kind: "ReleaseInputCandidateReady",
      releaseInputDigest: digest,
      byteLength: bytes.byteLength,
      bytes,
    },
  },
  {
    operation: "releases.refreshReleaseInput",
    json: false,
    result: {
      kind: "ReleaseInputReadOnlyConverged",
      releaseInputDigest: digest,
      byteLength: bytes.byteLength,
      bytes,
    },
  },
] as const satisfies readonly LifecycleOutcome[];

for (const outcome of recordOutcomes) {
  test(`${outcome.operation} preserves successful native byte output`, () => {
    expect(formatOutcome(outcome)).toBe(bytes);
    expect(exitCode(outcome)).toBe(0);
    const formatted = formatOutcome({ ...outcome, json: true });
    expect(typeof formatted).toBe("string");
    if (typeof formatted !== "string") throw new Error("Expected JSON presentation");
    const projected = JSON.parse(formatted);
    const value = projected.result.value ?? projected.result;
    expect(
      value[outcome.operation === "governance.currentMainRecord" ? "recordText" : "envelopeText"]
    ).toBe(new TextDecoder().decode(bytes));
    expect(value.bytes).toBeUndefined();
    expect(projected.json).toBeUndefined();
    expect(projected.operation).toBe(outcome.operation);
    expect("value" in outcome.result ? outcome.result.value.bytes : outcome.result.bytes).toBe(
      bytes
    );
  });
}

const classifications: readonly { outcome: LifecycleOutcome; code: 0 | 1 | 2 }[] = [
  {
    outcome: {
      operation: "releases.check",
      json: true,
      result: { kind: "EligibleReport", eligibilityBinding: "binding", derivation: release },
    },
    code: 0,
  },
  {
    outcome: {
      operation: "releases.check",
      json: true,
      result: {
        kind: "IneligibleReport",
        mode: { kind: "targeted", pluginId: "example" },
        issues: [{ kind: "ReleaseConstruction", detail: "original refusal" }],
      },
    },
    code: 1,
  },
  {
    outcome: {
      operation: "releases.checkRepository",
      json: true,
      result: {
        kind: "StagedRepositoryEligible",
        repositoryIdentity: clean.repositoryIdentity,
        refName: clean.refName,
        headCommit: clean.sourceCommit,
        headTree: clean.sourceTree,
        stagedBinding: "binding",
      },
    },
    code: 0,
  },
  {
    outcome: {
      operation: "releases.checkRepository",
      json: true,
      result: {
        kind: "CleanRepositoryEligible",
        repositoryIdentity: clean.repositoryIdentity,
        refName: clean.refName,
        sourceCommit: clean.sourceCommit,
        sourceTree: clean.sourceTree,
        eligibilityBinding: "binding",
      },
    },
    code: 0,
  },
  {
    outcome: {
      operation: "releases.checkRepository",
      json: true,
      result: { kind: "SourceChanged", mode: "staged", detail: "source moved" },
    },
    code: 1,
  },
  {
    outcome: {
      operation: "releases.releaseInputRecord",
      json: true,
      result: { ok: false, issues: [releaseIssue] },
    },
    code: 1,
  },
  {
    outcome: {
      operation: "releases.refreshReleaseInput",
      json: true,
      result: { kind: "ReleaseInputRejected", issues: [releaseIssue] },
    },
    code: 1,
  },
  {
    outcome: {
      operation: "governance.currentMainRecord",
      json: true,
      result: {
        ok: false,
        failure: {
          code: "NonCanonical",
          path: "currentMain",
          message: "original canonical refusal",
        },
      },
    },
    code: 1,
  },
  {
    outcome: {
      operation: "governance.currentMainSelection",
      json: true,
      result: { kind: "CURRENT_ELIGIBLE", selection: currentMainBody },
    },
    code: 0,
  },
  ...(["WRONG_REPOSITORY", "UNREACHABLE_REPOSITORY", "STALE_RECORD", "FORGED_RECORD"] as const).map(
    (kind) => ({
      outcome: {
        operation: "governance.currentMainSelection" as const,
        json: true,
        result: { kind, reason: "original selection refusal" },
      },
      code: 2 as const,
    })
  ),
  {
    outcome: {
      operation: "packaging.package",
      json: true,
      result: { kind: "ReadOnlyConverged", ...packageIdentity },
    },
    code: 0,
  },
  {
    outcome: {
      operation: "packaging.package",
      json: true,
      result: { kind: "OutputReplacedVerified", ...packageIdentity, priorOutput: "Absent" },
    },
    code: 0,
  },
  {
    outcome: {
      operation: "packaging.package",
      json: true,
      result: { kind: "RejectedBeforeOutputMutation", primaryFailure: packagingFailure },
    },
    code: 1,
  },
  {
    outcome: {
      operation: "packaging.package",
      json: true,
      result: {
        kind: "OutputUnsettled",
        ...packageIdentity,
        primaryFailure: packagingFailure,
        cleanupFailure: { ...packagingFailure, message: "separate cleanup failure" },
      },
    },
    code: 1,
  },
  {
    outcome: {
      operation: "vendors.update",
      json: true,
      result: { kind: "ReadOnlyConverged", sourceIds: ["upstream"] },
    },
    code: 0,
  },
  {
    outcome: {
      operation: "vendors.update",
      json: true,
      result: {
        kind: "AuthoredReviewableChanges",
        sourceIds: ["upstream"],
        changedPaths: ["vendor/provenance.json"],
      },
    },
    code: 0,
  },
  {
    outcome: {
      operation: "vendors.update",
      json: true,
      result: { kind: "Rejected", sourceIds: ["upstream"], issues: [vendorIssue] },
    },
    code: 1,
  },
  {
    outcome: {
      operation: "vendors.update",
      json: true,
      result: {
        kind: "FailedRestored",
        sourceIds: ["upstream"],
        restoredPaths: ["vendor/provenance.json"],
        issues: [vendorIssue],
      },
    },
    code: 1,
  },
  {
    outcome: {
      operation: "vendors.update",
      json: true,
      result: {
        kind: "RestorationFailed",
        sourceIds: ["upstream"],
        unsettledPaths: ["vendor/provenance.json"],
        issues: [vendorIssue],
      },
    },
    code: 1,
  },
  ...(["Converged", "Drifted", "Blocked", "Failed"] as const).map((classification) => ({
    outcome: {
      operation: "providers.status" as const,
      json: true,
      result: {
        operation: "status" as const,
        classification,
        selection: null,
        targets: [],
        issues: [],
      },
    },
    code:
      classification === "Blocked"
        ? (2 as const)
        : classification === "Converged"
          ? (0 as const)
          : (1 as const),
  })),
  ...(["Converged", "Changed", "Blocked", "Failed", "Partial", "Uncertain"] as const).flatMap(
    (classification) => {
      const code =
        classification === "Blocked"
          ? (2 as const)
          : classification === "Converged" || classification === "Changed"
            ? (0 as const)
            : (1 as const);
      return [
        {
          outcome: {
            operation: "providers.sync" as const,
            json: true,
            result: {
              operation: "sync" as const,
              classification,
              selection: null,
              targets: [],
              issues: [],
            },
          },
          code,
        },
        {
          outcome: {
            operation: "providers.test" as const,
            json: true,
            result: {
              operation: "test" as const,
              classification,
              selection: null,
              targets: [],
              issues: [],
            },
          },
          code,
        },
      ];
    }
  ),
];

for (const { outcome, code } of classifications) {
  test(`${outcome.operation} keeps its exact result and exit classification: ${JSON.stringify(outcome.result).slice(0, 90)}`, () => {
    expect(exitCode(outcome)).toBe(code);
    const formatted = formatOutcome(outcome);
    if (typeof formatted !== "string") throw new Error("Expected structured result");
    expect(JSON.parse(formatted)).toEqual({ operation: outcome.operation, result: outcome.result });
  });
}

test("the managed unknown byte carrier is checked only at the presentation boundary", () => {
  const invalid: LifecycleOutcome = {
    operation: "releases.releaseInputRecord",
    json: false,
    result: { ok: true, value: { releaseInputDigest: digest, byteLength: 1, bytes: "not bytes" } },
  };
  expect(() => formatOutcome(invalid)).toThrow("non-byte record carrier");
});

test("status distinguishes invalid selection authority from an observed native collision", () => {
  const selection = {
    repositoryIdentity: clean.repositoryIdentity,
    sourceCommit: clean.sourceCommit,
    sourceTree: clean.sourceTree,
    releaseInputDigest: digest,
    releaseSetDigest: null,
    pluginIds: ["example"],
  };
  const refused: LifecycleOutcome = {
    operation: "providers.status",
    json: true,
    result: {
      operation: "status",
      classification: "Blocked",
      selection: null,
      targets: [],
      issues: [{ code: "SelectionRejected", detail: "repository authority refused" }],
    },
  };
  const collision: LifecycleOutcome = {
    operation: "providers.status",
    json: true,
    result: {
      operation: "status",
      classification: "Blocked",
      selection,
      targets: [
        {
          target: { provider: "codex", home: "/homes/codex" },
          classification: "Blocked",
          operations: [],
          facts: [],
          issues: [{ code: "MarketplaceCollision", detail: "unmanaged native entry" }],
        },
      ],
      issues: [{ code: "MarketplaceCollision", detail: "unmanaged native entry" }],
    },
  };
  expect(exitCode(refused)).toBe(2);
  expect(exitCode(collision)).toBe(1);
  expect(JSON.parse(String(formatOutcome(collision))).result).toEqual(collision.result);
});
