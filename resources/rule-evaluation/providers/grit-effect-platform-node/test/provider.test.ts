import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

import type { RuleEvaluationFailure } from "@habitat/resource-rule-evaluation";
import { Cause, Effect, Exit, Fiber } from "effect";

import { makeNodeGritRuleEvaluationResource } from "../index";

const require = createRequire(import.meta.url);
const gritExecutable = require.resolve("@getgrit/cli/run-grit.js");
const fixtureRoots: string[] = [];

afterEach(async () => {
  for (const root of fixtureRoots.splice(0)) {
    const basename = path.basename(root);
    if (
      path.dirname(root) !== tmpdir() ||
      path.join(tmpdir(), basename) !== root ||
      !basename.startsWith("rule-evaluation-test-")
    ) {
      throw new Error(`Refusing to remove unexpected test fixture: ${root}`);
    }
    await rm(root, { recursive: true, force: true });
  }
});

describe("grit-effect-platform-node rule evaluation", () => {
  test("returns clean and finding results from the real Grit executable", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    const resource = makeNodeGritRuleEvaluationResource({
      executable: gritExecutable,
      timeoutMs: 30_000,
    });
    const program = "language js(typescript)\n`forbidden()`";

    await writeFile(subject, "allowed();\n");
    expect(
      await Effect.runPromise(
        resource.evaluate({
          program,
          subjectPaths: [subject],
        })
      )
    ).toEqual({ findings: [] });

    await writeFile(subject, "forbidden();\n");
    const result = await Effect.runPromise(
      resource.evaluate({
        program,
        subjectPaths: [subject],
      })
    );
    expect(result).toEqual({
      findings: [
        {
          path: subject,
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 12, offset: 11 },
          message: null,
        },
      ],
    });
  }, 60_000);

  test("maps exact wire positions and messages in deterministic order", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    await writeFile(subject, "allowed();\n");
    const executable = await writeReportExecutable(fixture, "valid-report-grit", {
      paths: [subject],
      results: [
        {
          check_id: "#habitat_rule_evaluation/js",
          local_name: "habitat_rule_evaluation",
          path: subject,
          start: { line: 2, col: 3, offset: 14 },
          end: { line: 2, col: 9, offset: 20 },
          extra: { message: "later finding", severity: "error" },
        },
        {
          check_id: "#habitat_rule_evaluation/js",
          local_name: "habitat_rule_evaluation",
          path: subject,
          start: { line: 1, col: 2, offset: 1 },
          end: { line: 1, col: 7, offset: 6 },
          extra: { message: "earlier finding", severity: "error" },
        },
      ],
    });

    expect(
      await Effect.runPromise(
        makeNodeGritRuleEvaluationResource({ executable, timeoutMs: 1_000 }).evaluate({
          program: "language js(typescript)\n`forbidden()`",
          subjectPaths: [subject],
        })
      )
    ).toEqual({
      findings: [
        {
          path: subject,
          start: { line: 1, column: 2, offset: 1 },
          end: { line: 1, column: 7, offset: 6 },
          message: "earlier finding",
        },
        {
          path: subject,
          start: { line: 2, column: 3, offset: 14 },
          end: { line: 2, column: 9, offset: 20 },
          message: "later finding",
        },
      ],
    });
  });

  test("rejects a schema-valid report carrying the wrong provider-local identity", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    await writeFile(subject, "allowed();\n");
    const executable = await writeReportExecutable(fixture, "wrong-identity-grit", {
      paths: [subject],
      results: [
        {
          check_id: "#another_pattern/js",
          local_name: "habitat_rule_evaluation",
          path: subject,
          start: { line: 1, col: 1, offset: 0 },
          end: { line: 1, col: 2, offset: 1 },
          extra: { message: null, severity: "error" },
        },
      ],
    });

    const rejected = await evaluationFailure(
      makeNodeGritRuleEvaluationResource({ executable, timeoutMs: 1_000 }).evaluate({
        program: "language js(typescript)\n`forbidden()`",
        subjectPaths: [subject],
      })
    );
    expect(rejected).toMatchObject({
      _tag: "RuleEvaluationFailure",
      reason: "InvalidOutput",
    });
  });

  test("maps launch, nonzero exit, and malformed output failures", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    await writeFile(subject, "allowed();\n");

    const unavailable = await evaluationFailure(
      makeNodeGritRuleEvaluationResource({
        executable: path.join(fixture, "missing-grit"),
        timeoutMs: 1_000,
      }).evaluate({
        program: "language js(typescript)\n`forbidden()`",
        subjectPaths: [subject],
      })
    );
    expect(unavailable).toMatchObject({
      _tag: "RuleEvaluationFailure",
      reason: "ExecutionFailed",
    });

    const nonzeroExecutable = await writeExecutable(
      fixture,
      "nonzero-grit",
      "#!/bin/sh\nprintf 'native failure\\n' >&2\nexit 23\n"
    );
    const nonzero = await evaluationFailure(
      makeNodeGritRuleEvaluationResource({
        executable: nonzeroExecutable,
        timeoutMs: 1_000,
      }).evaluate({
        program: "language js(typescript)\n`forbidden()`",
        subjectPaths: [subject],
      })
    );
    expect(nonzero).toEqual({
      _tag: "RuleEvaluationFailure",
      reason: "ExecutionFailed",
      detail: "Grit exited with code 23: native failure",
    });

    const malformedExecutable = await writeExecutable(
      fixture,
      "malformed-grit",
      "#!/bin/sh\nprintf 'not-json\\n' >&2\n"
    );
    const malformed = await evaluationFailure(
      makeNodeGritRuleEvaluationResource({
        executable: malformedExecutable,
        timeoutMs: 1_000,
      }).evaluate({
        program: "language js(typescript)\n`forbidden()`",
        subjectPaths: [subject],
      })
    );
    expect(malformed).toMatchObject({
      _tag: "RuleEvaluationFailure",
      reason: "InvalidOutput",
    });
  });

  test("rejects relative subject paths at the provider boundary", async () => {
    const fixture = await makeFixture();
    const rejected = await evaluationFailure(
      makeNodeGritRuleEvaluationResource({
        executable: path.join(fixture, "missing-grit"),
        timeoutMs: 1_000,
      }).evaluate({
        program: "language js(typescript)\n`forbidden()`",
        subjectPaths: ["subject.ts"],
      })
    );
    expect(rejected).toMatchObject({
      _tag: "RuleEvaluationFailure",
      reason: "InvalidInput",
    });
  });

  test("cleans its scoped catalog after failure and timeout", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    await writeFile(subject, "allowed();\n");
    const baseline = await temporaryCatalogs();

    const malformedExecutable = await writeExecutable(
      fixture,
      "malformed-grit",
      "#!/bin/sh\nprintf 'not-json\\n' >&2\n"
    );
    await evaluationFailure(
      makeNodeGritRuleEvaluationResource({
        executable: malformedExecutable,
        timeoutMs: 1_000,
      }).evaluate({
        program: "language js(typescript)\n`forbidden()`",
        subjectPaths: [subject],
      })
    );
    expect(await temporaryCatalogs()).toEqual(baseline);

    const slowExecutable = await writeExecutable(fixture, "slow-grit", "#!/bin/sh\nsleep 10\n");
    const timedOut = await evaluationFailure(
      makeNodeGritRuleEvaluationResource({
        executable: slowExecutable,
        timeoutMs: 50,
      }).evaluate({
        program: "language js(typescript)\n`forbidden()`",
        subjectPaths: [subject],
      })
    );
    expect(timedOut.reason).toBe("TimedOut");
    expect(await temporaryCatalogs()).toEqual(baseline);
  });

  test("bounds native output and cleans its scoped catalog after overflow", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    await writeFile(subject, "allowed();\n");
    const baseline = await temporaryCatalogs();
    const executable = await writeExecutable(
      fixture,
      "overflow-grit",
      "#!/usr/bin/env node\nprocess.stderr.write('x'.repeat(512 * 1024));\n"
    );

    const overflow = await evaluationFailure(
      makeNodeGritRuleEvaluationResource({ executable, timeoutMs: 5_000 }).evaluate({
        program: "language js(typescript)\n`forbidden()`",
        subjectPaths: [subject],
      })
    );
    expect(overflow).toMatchObject({
      _tag: "RuleEvaluationFailure",
      reason: "InvalidOutput",
    });
    expect(overflow.detail).toContain("output limit");
    expect(await temporaryCatalogs()).toEqual(baseline);
  });

  test("cleans its scoped catalog when evaluation is interrupted", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    await writeFile(subject, "allowed();\n");
    const slowExecutable = await writeExecutable(fixture, "slow-grit", "#!/bin/sh\nsleep 10\n");
    const resource = makeNodeGritRuleEvaluationResource({
      executable: slowExecutable,
      timeoutMs: 30_000,
    });
    const baseline = await temporaryCatalogs();
    const fiber = Effect.runFork(
      resource.evaluate({
        program: "language js(typescript)\n`forbidden()`",
        subjectPaths: [subject],
      })
    );

    await waitForTemporaryCatalog(baseline);
    await Effect.runPromise(Fiber.interrupt(fiber));
    const exit = await Effect.runPromise(Fiber.await(fiber));

    expect(Exit.isFailure(exit)).toBe(true);
    if (!Exit.isFailure(exit)) throw new Error("Expected evaluation interruption");
    expect(exit.cause.reasons.some(Cause.isInterruptReason)).toBe(true);
    expect(await temporaryCatalogs()).toEqual(baseline);
  });
});

async function makeFixture(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "rule-evaluation-test-"));
  fixtureRoots.push(root);
  return root;
}

async function writeExecutable(root: string, name: string, source: string): Promise<string> {
  const executable = path.join(root, name);
  await writeFile(executable, source);
  await chmod(executable, 0o755);
  return executable;
}

async function writeReportExecutable(root: string, name: string, report: unknown): Promise<string> {
  return writeExecutable(
    root,
    name,
    `#!/bin/sh\ncat >&2 <<'GRIT_REPORT'\n${JSON.stringify(report)}\nGRIT_REPORT\n`
  );
}

async function evaluationFailure<A>(
  effect: Effect.Effect<A, RuleEvaluationFailure>
): Promise<RuleEvaluationFailure> {
  const result = await Effect.runPromise(Effect.result(effect));
  if (result._tag === "Success") {
    throw new Error("Expected rule evaluation to fail");
  }
  return result.failure;
}

async function temporaryCatalogs(): Promise<readonly string[]> {
  const entries = await readdir(tmpdir());
  return entries.filter((entry) => entry.startsWith("habitat-rule-evaluation-")).sort();
}

async function waitForTemporaryCatalog(baseline: readonly string[]): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const current = await temporaryCatalogs();
    if (current.length > baseline.length || current.some((entry) => !baseline.includes(entry))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Rule-evaluation provider did not allocate its temporary catalog");
}
