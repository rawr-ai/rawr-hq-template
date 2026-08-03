import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

import type { RuleEvaluationFailure } from "@habitat-ai/resource-rule-evaluation";
import { Cause, Effect, Exit, Fiber } from "effect";

import { makeNodeGritRuleEvaluationResource } from "../index";

const require = createRequire(import.meta.url);
const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
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
      command: process.execPath,
      args: [gritEntrypoint],
      timeoutMs: 30_000,
    });
    const program = "language js(typescript)\n`forbidden()`";

    await writeFile(subject, "allowed();\n");
    expect(
      await Effect.runPromise(resource.evaluate(evaluationRequest("forbidden", program, [subject])))
    ).toEqual({ results: [{ programId: "forbidden", findings: [] }] });

    await writeFile(subject, "forbidden();\n");
    const result = await Effect.runPromise(
      resource.evaluate(evaluationRequest("forbidden", program, [subject]))
    );
    expect(result).toEqual({
      results: [
        {
          programId: "forbidden",
          findings: [
            {
              path: subject,
              start: { line: 1, column: 1, offset: 0 },
              end: { line: 1, column: 12, offset: 11 },
              message: null,
            },
          ],
        },
      ],
    });
  }, 60_000);

  test("evaluates multiple programs sequentially and attributes each finding", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    await writeFile(subject, "first_forbidden();\nsecond_forbidden();\n");

    const result = await Effect.runPromise(
      makeNodeGritRuleEvaluationResource({
        command: process.execPath,
        args: [gritEntrypoint],
        timeoutMs: 30_000,
      }).evaluate({
        programs: [
          {
            id: "first-rule",
            program: "language js(typescript)\n`first_forbidden()`",
          },
          {
            id: "second-rule",
            program: "language js(typescript)\n`second_forbidden()`",
          },
          {
            id: "clean-rule",
            program: "language js(typescript)\n`not_present()`",
          },
        ],
        subjectPaths: [subject],
      })
    );

    expect(result.results.map(({ programId }) => programId)).toEqual([
      "first-rule",
      "second-rule",
      "clean-rule",
    ]);
    expect(result.results.map(({ findings }) => findings.map(({ start }) => start.line))).toEqual([
      [1],
      [2],
      [],
    ]);
    expect(
      result.results
        .flatMap(({ findings }) => findings)
        .every(({ path: findingPath }) => findingPath === subject)
    ).toBe(true);
  }, 60_000);

  test("gives each sequential program an independent deadline", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    const invocationPath = path.join(fixture, "deadline-invocations");
    await writeFile(subject, "allowed();\n");
    const executable = await writeExecutable(
      fixture,
      "deadline-grit",
      `#!/bin/sh\nwhile [ "$1" != "--grit-dir" ]; do shift; done\nshift\npattern_count=$(grep -c '"name":' "$1/grit.yaml")\nprintf x >> '${invocationPath}'\nif [ "$pattern_count" -eq 1 ]; then sleep 1; else sleep 2; fi\nprintf '%s\\n' '${JSON.stringify({ paths: [subject], results: [] })}' >&2\n`
    );

    await expect(
      Effect.runPromise(
        makeNodeGritRuleEvaluationResource({
          command: executable,
          args: [],
          timeoutMs: 1_500,
        }).evaluate({
          programs: [
            { id: "deadline-a", program: "language js(typescript)\n`first()`" },
            { id: "deadline-b", program: "language js(typescript)\n`second()`" },
          ],
          subjectPaths: [subject],
        })
      )
    ).resolves.toEqual({
      results: [
        { programId: "deadline-a", findings: [] },
        { programId: "deadline-b", findings: [] },
      ],
    });
    expect(await readFile(invocationPath, "utf8")).toBe("xx");
  });

  test("maps exact wire positions and messages in deterministic order", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    await writeFile(subject, "allowed();\n");
    const executable = await writeReportExecutable(fixture, "valid-report-grit", {
      paths: [subject],
      results: [
        {
          check_id: "#habitat_rule_evaluation_0/js",
          local_name: "habitat_rule_evaluation_0",
          path: subject,
          start: { line: 2, col: 3, offset: 14 },
          end: { line: 2, col: 9, offset: 20 },
          extra: { message: "later finding", severity: "error" },
        },
        {
          check_id: "#habitat_rule_evaluation_0/js",
          local_name: "habitat_rule_evaluation_0",
          path: subject,
          start: { line: 1, col: 2, offset: 1 },
          end: { line: 1, col: 7, offset: 6 },
          extra: { message: "earlier finding", severity: "error" },
        },
      ],
    });

    expect(
      await Effect.runPromise(
        makeNodeGritRuleEvaluationResource({
          command: executable,
          args: [],
          timeoutMs: 1_000,
        }).evaluate(
          evaluationRequest("ordered", "language js(typescript)\n`forbidden()`", [subject])
        )
      )
    ).toEqual({
      results: [
        {
          programId: "ordered",
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
      makeNodeGritRuleEvaluationResource({
        command: executable,
        args: [],
        timeoutMs: 1_000,
      }).evaluate(evaluationRequest("wrong", "language js(typescript)\n`forbidden()`", [subject]))
    );
    expect(rejected).toMatchObject({
      _tag: "RuleEvaluationFailure",
      reason: "InvalidOutput",
    });
  });

  test("accepts one JSON report framed by ordinary Grit diagnostics", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    await writeFile(subject, "allowed();\n");
    const executable = await writeStderrExecutable(fixture, "diagnostic-report-grit", [
      "Failed to submit analytics event",
      JSON.stringify({ paths: [subject], results: [] }),
      "Failed to flush analytics worker",
    ]);

    await expect(
      Effect.runPromise(
        makeNodeGritRuleEvaluationResource({
          command: executable,
          args: [],
          timeoutMs: 1_000,
        }).evaluate(
          evaluationRequest("diagnostics", "language js(typescript)\n`forbidden()`", [subject])
        )
      )
    ).resolves.toEqual({ results: [{ programId: "diagnostics", findings: [] }] });
  });

  test("rejects zero, multiple, or structurally invalid JSON reports", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    await writeFile(subject, "allowed();\n");
    const report = JSON.stringify({ paths: [subject], results: [] });
    const unexpectedJson = JSON.stringify({ message: "not a Grit report" });
    const cases = [
      ["diagnostic-only-grit", ["Failed to submit analytics event"]],
      ["multiple-report-grit", [report, report]],
      ["wrong-json-grit", [unexpectedJson]],
      ["wrong-json-before-report-grit", [unexpectedJson, report]],
      ["wrong-json-after-report-grit", [report, unexpectedJson]],
    ] as const;

    for (const [name, lines] of cases) {
      const executable = await writeStderrExecutable(fixture, name, lines);
      const rejected = await evaluationFailure(
        makeNodeGritRuleEvaluationResource({
          command: executable,
          args: [],
          timeoutMs: 1_000,
        }).evaluate(evaluationRequest(name, "language js(typescript)\n`forbidden()`", [subject]))
      );
      expect(rejected).toMatchObject({
        _tag: "RuleEvaluationFailure",
        reason: "InvalidOutput",
      });
    }
  });

  test("maps launch, nonzero exit, and malformed output failures", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    await writeFile(subject, "allowed();\n");

    const unavailable = await evaluationFailure(
      makeNodeGritRuleEvaluationResource({
        command: path.join(fixture, "missing-grit"),
        args: [],
        timeoutMs: 1_000,
      }).evaluate(
        evaluationRequest("unavailable", "language js(typescript)\n`forbidden()`", [subject])
      )
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
        command: nonzeroExecutable,
        args: [],
        timeoutMs: 1_000,
      }).evaluate(evaluationRequest("nonzero", "language js(typescript)\n`forbidden()`", [subject]))
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
        command: malformedExecutable,
        args: [],
        timeoutMs: 1_000,
      }).evaluate(
        evaluationRequest("malformed", "language js(typescript)\n`forbidden()`", [subject])
      )
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
        command: path.join(fixture, "missing-grit"),
        args: [],
        timeoutMs: 1_000,
      }).evaluate(
        evaluationRequest("relative", "language js(typescript)\n`forbidden()`", ["subject.ts"])
      )
    );
    expect(rejected).toMatchObject({
      _tag: "RuleEvaluationFailure",
      reason: "InvalidInput",
    });
  });

  test("rejects duplicate invocation-local program identities", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    await writeFile(subject, "allowed();\n");
    const rejected = await evaluationFailure(
      makeNodeGritRuleEvaluationResource({
        command: path.join(fixture, "missing-grit"),
        args: [],
        timeoutMs: 1_000,
      }).evaluate({
        programs: [
          { id: "duplicate", program: "language js(typescript)\n`first()`" },
          { id: "duplicate", program: "language js(typescript)\n`second()`" },
        ],
        subjectPaths: [subject],
      })
    );
    expect(rejected).toMatchObject({
      _tag: "RuleEvaluationFailure",
      reason: "InvalidInput",
      detail: expect.stringContaining("unique"),
    });
  });

  test("runs one two-thread native process at a time", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    const invocationPath = path.join(fixture, "invocations");
    const lockPath = path.join(fixture, "active-grit");
    await writeFile(subject, "allowed();\n");
    const executable = await writeExecutable(
      fixture,
      "rayon-grit",
      `#!/bin/sh\nif ! mkdir '${lockPath}' 2>/dev/null; then\n  printf 'concurrent grit process\\n' >&2\n  exit 43\nfi\ntrap 'rmdir "${lockPath}"' EXIT\nprintf x >> '${invocationPath}'\nif [ "$RAYON_NUM_THREADS" != "2" ]; then\n  printf 'wrong rayon pool: %s\\n' "$RAYON_NUM_THREADS" >&2\n  exit 42\nfi\nif [ "$GRIT_DOWNLOADS_DISABLED" != "true" ]; then\n  printf 'runtime downloads are not disabled\\n' >&2\n  exit 41\nfi\nsleep 0.05\nprintf '%s\\n' '${JSON.stringify({ paths: [subject], results: [] })}' >&2\n`
    );

    await expect(
      Effect.runPromise(
        makeNodeGritRuleEvaluationResource({
          command: executable,
          args: [],
          timeoutMs: 1_000,
        }).evaluate({
          programs: [
            { id: "rayon-a", program: "language js(typescript)\n`first()`" },
            { id: "rayon-b", program: "language js(typescript)\n`second()`" },
          ],
          subjectPaths: [subject],
        })
      )
    ).resolves.toEqual({
      results: [
        { programId: "rayon-a", findings: [] },
        { programId: "rayon-b", findings: [] },
      ],
    });
    expect(await readFile(invocationPath, "utf8")).toBe("xx");
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
        command: malformedExecutable,
        args: [],
        timeoutMs: 1_000,
      }).evaluate(
        evaluationRequest("malformed", "language js(typescript)\n`forbidden()`", [subject])
      )
    );
    expect(await temporaryCatalogs()).toEqual(baseline);

    const slowExecutable = await writeExecutable(fixture, "slow-grit", "#!/bin/sh\nsleep 10\n");
    const timedOut = await evaluationFailure(
      makeNodeGritRuleEvaluationResource({
        command: slowExecutable,
        args: [],
        timeoutMs: 50,
      }).evaluate({
        programs: [
          { id: "timeout-a", program: "language js(typescript)\n`first()`" },
          { id: "timeout-b", program: "language js(typescript)\n`second()`" },
        ],
        subjectPaths: [subject],
      })
    );
    expect(timedOut.reason).toBe("TimedOut");
    expect(timedOut.detail).toContain("50ms timeout");
    expect(await temporaryCatalogs()).toEqual(baseline);
  });

  test("retains bounded output independently for each program", async () => {
    const fixture = await makeFixture();
    const subject = path.join(fixture, "subject.ts");
    await writeFile(subject, "allowed();\n");
    const executable = await writeExecutable(
      fixture,
      "scaled-output-grit",
      `#!/usr/bin/env node\nconst subject = ${JSON.stringify(subject)};\nconst message = "x".repeat(200 * 1024);\nprocess.stderr.write(JSON.stringify({ paths: [subject], results: [{ check_id: "#habitat_rule_evaluation_0/js", local_name: "habitat_rule_evaluation_0", path: subject, start: { line: 1, col: 1, offset: 0 }, end: { line: 1, col: 2, offset: 1 }, extra: { message, severity: "error" } }] }));\n`
    );

    const result = await Effect.runPromise(
      makeNodeGritRuleEvaluationResource({
        command: executable,
        args: [],
        timeoutMs: 5_000,
      }).evaluate({
        programs: [
          { id: "large", program: "language js(typescript)\n`large()`" },
          { id: "clean", program: "language js(typescript)\n`clean()`" },
        ],
        subjectPaths: [subject],
      })
    );

    expect(result.results[0]?.findings[0]?.message?.length).toBe(200 * 1024);
    expect(result.results[1]?.findings[0]?.message?.length).toBe(200 * 1024);
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
      makeNodeGritRuleEvaluationResource({
        command: executable,
        args: [],
        timeoutMs: 5_000,
      }).evaluate(
        evaluationRequest("overflow", "language js(typescript)\n`forbidden()`", [subject])
      )
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
    const pidPath = path.join(fixture, "grit.pid");
    const slowExecutable = await writeExecutable(
      fixture,
      "slow-grit",
      `#!/usr/bin/env node\nrequire("node:fs").writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));\nprocess.on("SIGTERM", () => process.exit(0));\nsetInterval(() => {}, 30_000);\n`
    );
    const resource = makeNodeGritRuleEvaluationResource({
      command: slowExecutable,
      args: [],
      timeoutMs: 30_000,
    });
    const baseline = await temporaryCatalogs();
    const fiber = Effect.runFork(
      resource.evaluate(
        evaluationRequest("interrupted", "language js(typescript)\n`forbidden()`", [subject])
      )
    );

    await waitForTemporaryCatalog(baseline);
    const pid = await waitForPid(pidPath);
    await Effect.runPromise(Fiber.interrupt(fiber));
    const exit = await Effect.runPromise(Fiber.await(fiber));

    expect(Exit.isFailure(exit)).toBe(true);
    if (!Exit.isFailure(exit)) throw new Error("Expected evaluation interruption");
    expect(exit.cause.reasons.some(Cause.isInterruptReason)).toBe(true);
    await waitForProcessExit(pid);
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
  return writeStderrExecutable(root, name, [JSON.stringify(report)]);
}

async function writeStderrExecutable(
  root: string,
  name: string,
  lines: readonly string[]
): Promise<string> {
  return writeExecutable(
    root,
    name,
    `#!/bin/sh\ncat >&2 <<'GRIT_OUTPUT'\n${lines.join("\n")}\nGRIT_OUTPUT\n`
  );
}

function evaluationRequest(id: string, program: string, subjectPaths: readonly string[]) {
  return { programs: [{ id, program }], subjectPaths };
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

async function waitForPid(pidPath: string): Promise<number> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const pid = Number(await readFile(pidPath, "utf8"));
      if (Number.isSafeInteger(pid) && pid > 0) return pid;
    } catch {
      // The native fixture has not started yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Rule-evaluation provider did not start its native process");
}

function processIsReachable(pid: number): boolean {
  return signalTargetIsReachable(pid);
}

async function waitForProcessExit(pid: number): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (processIsReachable(pid)) {
    if (Date.now() >= deadline) {
      throw new Error(`Native process ${pid} remained reachable after interruption`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

function signalTargetIsReachable(target: number): boolean {
  try {
    process.kill(target, 0);
    return true;
  } catch (cause) {
    if (isErrnoException(cause) && cause.code === "ESRCH") return false;
    throw cause;
  }
}

function isErrnoException(cause: unknown): cause is NodeJS.ErrnoException {
  return typeof cause === "object" && cause !== null && "code" in cause;
}
