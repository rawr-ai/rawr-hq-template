import { describe, expect, test } from "bun:test";
import { NodeServices } from "@effect/platform-node";
import type {
  RuleEvaluationFinding,
  RuleEvaluationRequest,
  RuleEvaluationResource,
  RuleEvaluationResult,
} from "@habitat-ai/resource-rule-evaluation";
import {
  MAX_SOURCE_INVENTORY_ENTRIES,
  type ObserveSourceInventoryInput,
  type SourceInventoryResource,
  type SourceInventoryResult,
} from "@habitat-ai/resource-source-inventory";
import { Effect, FileSystem, Path, PlatformError } from "effect";
import { type Client, createClient } from "../../../../src/client";
import {
  MAX_ROOT_PATTERN_ACQUISITION_COMMAND_LINE_UNITS,
  MAX_ROOT_PATTERN_ACQUISITION_SUBJECTS,
} from "../../../../src/service/modules/catalog/model/dto/catalog";

type CheckInput = Parameters<Client["catalog"]["check"]>[0];
type Evaluation = ReturnType<RuleEvaluationResource<never>["evaluate"]>;
type EvaluationHandler = (input: RuleEvaluationRequest, index: number) => Evaluation;
type InventoryObservation = ReturnType<SourceInventoryResource<never>["observe"]>;
type InventoryHandler = (input: ObserveSourceInventoryInput, index: number) => InventoryObservation;

type RecordingRuleEvaluation = {
  readonly calls: RuleEvaluationRequest[];
  readonly resource: RuleEvaluationResource<never>;
  readonly inventory: RecordingSourceInventory;
};

type RecordingSourceInventory = {
  readonly calls: ObserveSourceInventoryInput[];
  readonly resource: SourceInventoryResource<never>;
};

type Fixture = {
  readonly files: Readonly<Record<string, string>>;
  readonly policyPack?: {
    readonly packageJson?: string;
    readonly manifest?: string;
  };
  readonly directories?: readonly string[];
  readonly symlinks?: readonly {
    readonly path: string;
    readonly target: "directory" | "file";
    readonly targetPath?: string;
    readonly contents?: string;
  }[];
  readonly onWorkspaceRoot?: (workspaceRoot: string) => void;
  readonly clientFileSystem?: (
    fileSystem: FileSystem.FileSystem,
    path: Path.Path,
    workspaceRoot: string
  ) => FileSystem.FileSystem;
};

type RuleSpec = {
  readonly id: string;
  readonly lane?: "enforced" | "advisory";
  readonly runner?: "grit" | "structure";
  readonly acquisition?: "check" | "apply-dry-run";
  readonly rootRoles?: readonly string[];
  readonly rootPatterns?: readonly string[];
  readonly patternContents?: string;
  readonly structureContents?: string;
};

type BlueprintSpec = {
  readonly id: string;
  readonly rules: readonly RuleSpec[];
};

type InstanceSpec = {
  readonly id: string;
  readonly ownerProject: string;
  readonly blueprint: string;
  readonly projectPath: string;
};

describe("Habitat catalog check", () => {
  test("executes an admitted Grit asset from the selected policy package", async () => {
    const rule = { id: "package_rule" } satisfies RuleSpec;
    const { calls, result } = await checkFixture(
      {
        files: {
          [`${POLICY_PACK_ROOT}/${POLICY_PACK_BLUEPRINT_PATH}`]: blueprintToml("package", [rule]),
          [`${POLICY_PACK_ROOT}/${POLICY_PACK_PATTERN_PATH}`]:
            "# package_rule\n\n```grit\npackage_rule_from_selected_pack()\n```\n",
          "packages/example/habitat.toml": instanceToml(exampleInstance()),
        },
        policyPack: {
          manifest: JSON.stringify({
            protocolVersion: 1,
            blueprints: [{ id: "package", version: 1, path: POLICY_PACK_BLUEPRINT_PATH }],
          }),
        },
      },
      {}
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.programs).toEqual([
      { id: "application-0", program: "package_rule_from_selected_pack()" },
    ]);
    expect(result).toMatchObject({
      _tag: "Completed",
      ok: true,
      applications: [{ ruleId: "package_rule", status: "pass" }],
    });
  });

  test("batches same-subject Grit programs and attributes clean, enforced, and advisory findings", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [{ id: "a_clean" }, { id: "b_enforced" }, { id: "c_advisory", lane: "advisory" }],
        },
      ],
      instances: [exampleInstance()],
    });
    const { calls, inventoryCalls, result } = await checkFixture(fixture, {}, (input) => {
      return Effect.succeed(
        evaluationResults(input, ({ program }) => {
          if (program.includes("a_clean")) return [];
          const ruleId = program.includes("b_enforced") ? "b_enforced" : "c_advisory";
          return [finding(`${input.subjectPaths[0]}/src/${ruleId}.ts`, `${ruleId} finding`)];
        })
      );
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.programs.map(({ program }) => program)).toEqual([
      "a_clean()",
      "b_enforced()",
      "c_advisory()",
    ]);
    expect(inventoryCalls).toEqual([]);
    expect(calls.every(({ subjectPaths }) => subjectPaths.length === 1)).toBe(true);
    expect(result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          ruleId: "a_clean",
          lane: "enforced",
          locked: false,
          status: "pass",
          disposition: { kind: "evaluated" },
          findings: [],
        },
        {
          ruleId: "b_enforced",
          lane: "enforced",
          status: "fail",
          disposition: { kind: "evaluated" },
          findings: [
            {
              path: "packages/example/src/b_enforced.ts",
              message: "b_enforced finding",
              severity: "error",
              baselined: false,
            },
          ],
        },
        {
          ruleId: "c_advisory",
          lane: "advisory",
          status: "advisory-findings",
          disposition: { kind: "evaluated" },
          findings: [
            {
              path: "packages/example/src/c_advisory.ts",
              message: "c_advisory finding",
              severity: "advisory",
            },
          ],
        },
      ],
    });
    if (result._tag === "Completed") {
      expect(result.applications.every((application) => application.locked === false)).toBe(true);
      expect(
        result.applications.every((application) =>
          application.findings.every((finding) => finding.baselined === false)
        )
      ).toBe(true);
      const enforced = result.applications[1];
      expect(enforced?.runner).toBe("grit");
      if (enforced?.runner === "grit") {
        expect(enforced.findings).toEqual([
          {
            path: "packages/example/src/b_enforced.ts",
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 2, offset: 1 },
            message: "b_enforced finding",
            severity: "error",
            baselined: false,
          },
        ]);
      }
    }
  });

  test("expands root patterns to sorted unique live regular files from the shared inventory", async () => {
    const authority = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "pattern_rule",
              rootRoles: [],
              rootPatterns: ["lib/**/*.ts", "src/**/*.ts"],
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });
    const fixture: Fixture = {
      ...authority,
      files: {
        ...authority.files,
        "packages/example/src/.hidden/nested.ts": "export const nestedDotfile = true;\n",
        "packages/example/src/.root.ts": "export const rootDotfile = true;\n",
        "packages/example/src/a.ts": "export const a = true;\n",
        "packages/example/src/nested/b.ts": "export const b = true;\n",
        "packages/example/test/outside.ts": "export const outside = true;\n",
      },
      directories: ["packages/example/src/directory.ts"],
      symlinks: [
        { path: "packages/example/src/linked.ts", target: "file", contents: "linked\n" },
        { path: "packages/example/src/tracked-linked.ts", target: "file", contents: "linked\n" },
      ],
    };
    const inventoryPaths = [
      ...Object.keys(fixture.files),
      "packages/example/src/deleted.ts",
      "packages/example/src/directory.ts",
      "packages/example/src/linked.ts",
      "packages/example/src/tracked-linked.ts",
    ];

    const checked = await checkFixture(fixture, {}, undefined, () =>
      Effect.succeed({
        paths: [...new Set(inventoryPaths)].sort(textOrder),
        trackedNonFilePaths: ["packages/example/src/tracked-linked.ts"],
      })
    );

    expect(checked.inventoryCalls).toEqual([
      expect.objectContaining({ maxEntries: MAX_SOURCE_INVENTORY_ENTRIES }),
    ]);
    expect(
      checked.calls[0]?.subjectPaths.map((subject) =>
        subject.slice(subject.indexOf("packages/example/"))
      )
    ).toEqual([
      "packages/example/src/.hidden/nested.ts",
      "packages/example/src/.root.ts",
      "packages/example/src/a.ts",
      "packages/example/src/nested/b.ts",
    ]);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      ok: true,
      applications: [{ ruleId: "pattern_rule", disposition: { kind: "evaluated" } }],
    });
  });

  test("includes an explicitly matched tracked generated path in root-pattern acquisition", async () => {
    const generatedPath = "packages/example/src/generated/derived.ts";
    const authority = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "generated_rule",
              rootRoles: [],
              rootPatterns: ["src/generated/**/*.ts"],
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });
    const checked = await checkFixture(
      {
        ...authority,
        files: {
          ...authority.files,
          [generatedPath]: "export const derived = true;\n",
        },
      },
      {}
    );

    expect(checked.calls).toHaveLength(1);
    expect(checked.calls[0]?.subjectPaths).toEqual([expect.stringContaining(generatedPath)]);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      ok: true,
      applications: [{ ruleId: "generated_rule", disposition: { kind: "evaluated" } }],
    });
  });

  test("does not let a terminal globstar consume its parent path", async () => {
    const parentPath = "packages/example/src";
    const authority = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [{ id: "terminal_globstar", rootRoles: [], rootPatterns: ["src/**"] }],
        },
      ],
      instances: [exampleInstance()],
    });
    const checked = await checkFixture(
      {
        ...authority,
        files: { ...authority.files, [parentPath]: "tracked parent file\n" },
      },
      {}
    );

    expect(checked.calls).toEqual([]);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          ruleId: "terminal_globstar",
          disposition: {
            kind: "failed",
            reason: "SetupFailed",
            detail: expect.stringContaining("produced no live regular files or direct subjects"),
          },
        },
      ],
    });
  });

  test("judges root-pattern emptiness on the final mixed acquisition union", async () => {
    const mixed = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [{ id: "mixed_rule", rootPatterns: ["missing/**/*.ts"] }],
        },
      ],
      instances: [exampleInstance()],
    });
    const mixedResult = await checkFixture(mixed, {});

    expect(mixedResult.inventoryCalls).toHaveLength(1);
    expect(mixedResult.calls).toHaveLength(1);
    expect(mixedResult.calls[0]?.subjectPaths).toHaveLength(1);
    expect(mixedResult.calls[0]?.subjectPaths[0]?.endsWith("/packages/example")).toBe(true);
    expect(mixedResult.result).toMatchObject({
      _tag: "Completed",
      ok: true,
      applications: [{ ruleId: "mixed_rule", disposition: { kind: "evaluated" } }],
    });

    const patternsOnly = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "empty_rule",
              rootRoles: [],
              rootPatterns: ["missing/**/*.ts"],
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });
    const emptyResult = await checkFixture(patternsOnly, {});

    expect(emptyResult.inventoryCalls).toHaveLength(1);
    expect(emptyResult.calls).toEqual([]);
    expect(emptyResult.result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          ruleId: "empty_rule",
          status: "error",
          disposition: {
            kind: "failed",
            reason: "SetupFailed",
            detail: expect.stringContaining("produced no live regular files or direct subjects"),
          },
        },
      ],
    });
  });

  test("bounds root-pattern inventory qualification before filesystem probes", async () => {
    const authority = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "bounded_candidates",
              rootRoles: [],
              rootPatterns: ["src/**/*.ts"],
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });
    const candidates = Array.from(
      { length: MAX_ROOT_PATTERN_ACQUISITION_SUBJECTS + 1 },
      (_, index) => `packages/example/src/candidate-${String(index).padStart(3, "0")}.ts`
    );
    let candidateProbeCalls = 0;
    const checked = await checkFixture(
      {
        ...authority,
        clientFileSystem: (fileSystem, _path, workspaceRoot) =>
          FileSystem.makeNoop({
            ...fileSystem,
            readLink: (candidate) => {
              if (candidate.startsWith(`${workspaceRoot}/packages/example/src/`)) {
                candidateProbeCalls += 1;
              }
              return fileSystem.readLink(candidate);
            },
          }),
      },
      {},
      undefined,
      () =>
        Effect.succeed({
          paths: [...Object.keys(authority.files), ...candidates].sort(textOrder),
          trackedNonFilePaths: [],
        })
    );

    expect(candidateProbeCalls).toBe(0);
    expect(checked.calls).toEqual([]);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          status: "error",
          disposition: {
            kind: "failed",
            reason: "SetupFailed",
            detail: expect.stringContaining(
              `more than ${MAX_ROOT_PATTERN_ACQUISITION_SUBJECTS} inventory paths`
            ),
          },
        },
      ],
    });
  });

  test("bounds the final mixed root-pattern subject union", async () => {
    const authority = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [{ id: "bounded_union", rootPatterns: ["src/**/*.ts"] }],
        },
      ],
      instances: [exampleInstance()],
    });
    const matchedFiles = Object.fromEntries(
      Array.from({ length: MAX_ROOT_PATTERN_ACQUISITION_SUBJECTS }, (_, index) => [
        `packages/example/src/a${String(index).padStart(3, "0")}.ts`,
        "export {};\n",
      ])
    );
    const checked = await checkFixture(
      {
        ...authority,
        files: { ...authority.files, ...matchedFiles },
      },
      {}
    );

    expect(checked.calls).toEqual([]);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          status: "error",
          disposition: {
            kind: "failed",
            reason: "SetupFailed",
            detail: expect.stringContaining(
              `more than ${MAX_ROOT_PATTERN_ACQUISITION_SUBJECTS} final subjects`
            ),
          },
        },
      ],
    });
  });

  test("bounds the final root-pattern command-line contribution", async () => {
    const authority = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "bounded_argv",
              rootRoles: [],
              rootPatterns: ["src/**/*.ts"],
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });
    const matchedFiles = Object.fromEntries(
      Array.from({ length: 200 }, (_, index) => [
        `packages/example/src/argv-${String(index).padStart(3, "0")}-${"x".repeat(120)}.ts`,
        "export {};\n",
      ])
    );
    const checked = await checkFixture(
      {
        ...authority,
        files: { ...authority.files, ...matchedFiles },
      },
      {}
    );

    expect(checked.calls).toEqual([]);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          status: "error",
          disposition: {
            kind: "failed",
            reason: "SetupFailed",
            detail: expect.stringContaining(
              `${MAX_ROOT_PATTERN_ACQUISITION_COMMAND_LINE_UNITS} UTF-16 code-unit`
            ),
          },
        },
      ],
    });
  });

  test("completes an empty catalog successfully without evaluating anything", async () => {
    const { calls, result } = await checkFixture({ files: {} }, {});
    const knownEmptyRunner = await checkFixture({ files: {} }, { selectors: { runner: "grit" } });

    expect(result).toEqual({ _tag: "Completed", ok: true, applications: [] });
    expect(calls).toEqual([]);
    expect(knownEmptyRunner.result).toEqual({
      _tag: "Completed",
      ok: true,
      applications: [],
    });
    expect(knownEmptyRunner.calls).toEqual([]);
  });

  test("turns a typed evaluator failure into a completed application error", async () => {
    const { calls, result } = await checkFixture(singleGritFixture(), {}, () =>
      Effect.fail({
        _tag: "RuleEvaluationFailure",
        reason: "ExecutionFailed",
        detail: "Evaluator could not complete the program.",
      })
    );

    expect(calls).toHaveLength(1);
    expect(result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          ruleId: "package_rule",
          status: "error",
          disposition: {
            kind: "failed",
            reason: "ExecutionFailed",
            detail: "Evaluator could not complete the program.",
          },
          findings: [],
        },
      ],
    });
  });

  test("fans one typed batch failure out to every member and continues with other subject groups", async () => {
    const fixture = authorityFixture({
      blueprints: [{ id: "package", rules: [{ id: "a_rule" }, { id: "b_rule" }] }],
      instances: [
        exampleInstance({
          id: "alpha",
          ownerProject: "@rawr/alpha",
          projectPath: "packages/alpha",
        }),
        exampleInstance({
          id: "beta",
          ownerProject: "@rawr/beta",
          projectPath: "packages/beta",
        }),
      ],
    });
    const { calls, result } = await checkFixture(fixture, {}, (input) =>
      input.subjectPaths[0]?.includes("/packages/alpha") === true
        ? Effect.fail({
            _tag: "RuleEvaluationFailure",
            reason: "ExecutionFailed",
            detail: "The alpha batch failed.",
          })
        : Effect.succeed(evaluationResults(input, () => []))
    );

    expect(calls).toHaveLength(2);
    expect(calls.map(({ programs }) => programs.map(({ program }) => program))).toEqual([
      ["a_rule()", "b_rule()"],
      ["a_rule()", "b_rule()"],
    ]);
    expect(
      calls.map(({ subjectPaths }) =>
        subjectPaths[0]?.includes("/packages/alpha") ? "alpha" : "beta"
      )
    ).toEqual(["alpha", "beta"]);
    expect(result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          ruleId: "a_rule",
          instanceId: "alpha",
          status: "error",
          disposition: {
            kind: "failed",
            reason: "ExecutionFailed",
            detail: "The alpha batch failed.",
          },
        },
        { ruleId: "a_rule", instanceId: "beta", status: "pass" },
        {
          ruleId: "b_rule",
          instanceId: "alpha",
          status: "error",
          disposition: {
            kind: "failed",
            reason: "ExecutionFailed",
            detail: "The alpha batch failed.",
          },
        },
        { ruleId: "b_rule", instanceId: "beta", status: "pass" },
      ],
    });
  });

  test("rejects missing, duplicate, and out-of-order batch results without misattribution", async () => {
    const fixture = authorityFixture({
      blueprints: [{ id: "package", rules: [{ id: "a_rule" }, { id: "b_rule" }] }],
      instances: [exampleInstance()],
    });
    const cases = [
      {
        detail: "program results for 2 requested programs",
        result: (input: RuleEvaluationRequest): RuleEvaluationResult => ({
          results: [{ programId: input.programs[0]?.id ?? "missing", findings: [] }],
        }),
      },
      {
        detail: "duplicate program result identities",
        result: (input: RuleEvaluationRequest): RuleEvaluationResult => ({
          results: [
            { programId: input.programs[0]?.id ?? "duplicate", findings: [] },
            { programId: input.programs[0]?.id ?? "duplicate", findings: [] },
          ],
        }),
      },
      {
        detail: "preserve requested program result order and identity",
        result: (input: RuleEvaluationRequest): RuleEvaluationResult => ({
          results: [...input.programs].reverse().map(({ id }) => ({ programId: id, findings: [] })),
        }),
      },
    ] as const;

    for (const mismatch of cases) {
      const checked = await checkFixture(fixture, {}, (input) =>
        Effect.succeed(mismatch.result(input))
      );
      expect(checked.calls).toHaveLength(1);
      expect(checked.result).toMatchObject({
        _tag: "Completed",
        ok: false,
        applications: [
          {
            status: "error",
            disposition: {
              kind: "failed",
              reason: "InvalidOutput",
              detail: expect.stringContaining(mismatch.detail),
            },
          },
          {
            status: "error",
            disposition: {
              kind: "failed",
              reason: "InvalidOutput",
              detail: expect.stringContaining(mismatch.detail),
            },
          },
        ],
      });
    }
  });

  test("propagates evaluator defects and interruptions", async () => {
    await expect(
      checkFixture(singleGritFixture(), {}, () =>
        Effect.die(new Error("Evaluator defect must remain a defect."))
      )
    ).rejects.toBeDefined();
    await expect(
      checkFixture(singleGritFixture(), {}, () => Effect.interrupt)
    ).rejects.toBeDefined();
  });

  test("separates distinct subject roots while preserving stable application order", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [{ id: "a_rule" }, { id: "z_rule" }],
        },
      ],
      instances: [
        exampleInstance({
          id: "zeta",
          ownerProject: "@rawr/zeta",
          projectPath: "packages/zeta",
        }),
        exampleInstance({
          id: "alpha",
          ownerProject: "@rawr/alpha",
          projectPath: "packages/alpha",
        }),
      ],
    });

    await withFixture(fixture, async (client, recording) => {
      const input = { selectors: { rules: ["z_rule", "a_rule"] } } satisfies CheckInput;
      const first = await client.catalog.check(input);
      const second = await client.catalog.check(input);
      const identities = first._tag === "Completed" ? first.applications.map(applicationKey) : [];

      expect(second).toEqual(first);
      expect(identities).toEqual([
        "a_rule:alpha:@rawr/alpha",
        "a_rule:zeta:@rawr/zeta",
        "z_rule:alpha:@rawr/alpha",
        "z_rule:zeta:@rawr/zeta",
      ]);
      expect(recording.calls).toHaveLength(4);
      expect(recording.calls.slice(0, 2)).toEqual(recording.calls.slice(2));
      expect(
        recording.calls.slice(0, 2).map((call) => call.programs.map(({ program }) => program))
      ).toEqual([
        ["a_rule()", "z_rule()"],
        ["a_rule()", "z_rule()"],
      ]);
      expect(
        recording.calls
          .slice(0, 2)
          .map((call) => (call.subjectPaths[0]?.includes("/packages/alpha") ? "alpha" : "zeta"))
      ).toEqual(["alpha", "zeta"]);
    });
  });

  test("intersects exact instance, rule, and runner selectors before evaluation", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [{ id: "a_rule" }, { id: "b_rule" }],
        },
      ],
      instances: [
        exampleInstance({
          id: "alpha",
          ownerProject: "@rawr/alpha",
          projectPath: "packages/alpha",
        }),
        exampleInstance({
          id: "beta",
          ownerProject: "@rawr/beta",
          projectPath: "packages/beta",
        }),
      ],
    });
    const { calls, result } = await checkFixture(fixture, {
      selectors: {
        instance: "beta",
        rule: "b_rule",
        runner: "grit",
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.programs.map(({ program }) => program)).toEqual(["b_rule()"]);
    expect(calls[0]?.subjectPaths[0]?.endsWith("/packages/beta")).toBe(true);
    expect(result).toMatchObject({
      _tag: "Completed",
      ok: true,
      applications: [
        { ownerProject: "@rawr/beta", instanceId: "beta", ruleId: "b_rule", runner: "grit" },
      ],
    });
  });

  test("evaluates only applications owned by the selected project", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [{ id: "a_rule" }, { id: "b_rule" }],
        },
      ],
      instances: [
        exampleInstance({
          id: "alpha",
          ownerProject: "@rawr/alpha",
          projectPath: "packages/alpha",
        }),
        exampleInstance({
          id: "beta",
          ownerProject: "@rawr/beta",
          projectPath: "packages/beta",
        }),
      ],
    });
    const { calls, result } = await checkFixture(fixture, {
      selectors: { owner: "@rawr/beta" },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.programs.map(({ program }) => program)).toEqual(["a_rule()", "b_rule()"]);
    expect(calls.every(({ subjectPaths }) => subjectPaths[0]?.endsWith("/packages/beta"))).toBe(
      true
    );
    expect(result).toMatchObject({
      _tag: "Completed",
      ok: true,
      applications: [
        { ownerProject: "@rawr/beta", instanceId: "beta", ruleId: "a_rule" },
        { ownerProject: "@rawr/beta", instanceId: "beta", ruleId: "b_rule" },
      ],
    });
  });

  test("executes compatibility Grit coverage and version 1 structure through one check", async () => {
    const checked = await checkFixture(compatibilityFixture(), {}, (input) =>
      Effect.succeed(
        evaluationResults(input, () => [
          finding(
            input.subjectPaths.find((subject) => subject.endsWith("/covered/child.ts")) ?? "",
            "compatibility finding"
          ),
        ])
      )
    );

    expect(checked.calls).toHaveLength(1);
    expect(checked.calls[0]?.programs.map(({ program }) => program)).toEqual(["legacy_grit()"]);
    expect(
      checked.calls[0]?.subjectPaths.map((subject) =>
        subject.slice(subject.indexOf("scripts/habitat/"))
      )
    ).toEqual([
      "scripts/habitat/.codex/hooks.json",
      "scripts/habitat/covered/child.ts",
      "scripts/habitat/exact.ts",
    ]);
    expect(checked.calls[0]?.subjectPaths.some((subject) => subject.includes("node_modules"))).toBe(
      false
    );
    expect(checked.inventoryCalls).toHaveLength(1);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          ownerProject: "habitat",
          instanceId: null,
          ruleId: "legacy_grit",
          runner: "grit",
          lane: "enforced",
          locked: true,
          status: "fail",
          disposition: { kind: "evaluated" },
          findings: [
            {
              path: "scripts/habitat/covered/child.ts",
              message: "compatibility finding",
              severity: "error",
              baselined: false,
            },
          ],
        },
        {
          ownerProject: "habitat",
          instanceId: null,
          ruleId: "legacy_structure",
          runner: "habitat",
          lane: "enforced",
          locked: true,
          status: "fail",
          disposition: { kind: "evaluated" },
          findings: [
            {
              code: "missing-required-child",
              path: "scripts/habitat/shape",
            },
            {
              code: "forbidden-child",
              path: "scripts/habitat/shape/forbidden.ts",
            },
            {
              code: "unexpected-child",
              path: "scripts/habitat/shape/unexpected.ts",
            },
          ],
        },
      ],
    });
  });

  test("excludes ignored repository directories from compatibility Grit subjects and findings", async () => {
    const fixture = compatibilityFixture();
    const gritRoot = ".habitat/legacy/legacy_grit";
    const encodedRule = fixture.files[`${gritRoot}/rule.json`];
    if (encodedRule === undefined) throw new Error("Compatibility fixture has no Grit rule.");
    const rule = JSON.parse(encodedRule) as Record<string, unknown>;
    const coverage = (rule.pathCoverage as Array<Record<string, unknown>>)[0];
    const patterns = coverage?.patterns;
    if (!Array.isArray(patterns)) throw new Error("Compatibility fixture has no path coverage.");
    const ignoredSegments: readonly string[] = [
      ".git",
      ".nx",
      ".semantica",
      ".turbo",
      ".venv",
      "build",
      "coverage",
      "dist",
      "generated",
      "node_modules",
      "vendor",
    ];
    const ignoredPaths = ignoredSegments.map(
      (segment) => `scripts/habitat/covered/${segment}/predecessor.ts`
    );
    const checked = await checkFixture(
      {
        ...fixture,
        files: {
          ...fixture.files,
          [`${gritRoot}/rule.json`]: JSON.stringify({
            ...rule,
            pathCoverage: [{ ...coverage, patterns: [...patterns, ...ignoredPaths] }],
          }),
          ...Object.fromEntries(
            ignoredPaths.map((subject) => [subject, "export const predecessor = true;\n"])
          ),
        },
      },
      { selectors: { rule: "legacy_grit" } },
      (input) =>
        Effect.succeed(
          evaluationResults(input, () =>
            input.subjectPaths.map((subject) => finding(subject, "admitted subject"))
          )
        )
    );

    expect(checked.calls).toHaveLength(1);
    const subjects =
      checked.calls[0]?.subjectPaths.map((subject) =>
        subject.slice(subject.indexOf("scripts/habitat/"))
      ) ?? [];
    expect(subjects).toEqual([
      "scripts/habitat/.codex/hooks.json",
      "scripts/habitat/covered/child.ts",
      "scripts/habitat/exact.ts",
    ]);
    expect(
      subjects.some((subject) =>
        subject.split("/").some((segment) => ignoredSegments.includes(segment))
      )
    ).toBe(false);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          ruleId: "legacy_grit",
          findings: subjects.map((subject) => ({ path: subject })),
        },
      ],
    });
  });

  test("keeps compatibility rules with one declared root in separate final-subject batches", async () => {
    const fixture = compatibilityFixture();
    const gritRoot = ".habitat/legacy/legacy_grit";
    const peerRoot = ".habitat/legacy/legacy_peer";
    const encodedRule = fixture.files[`${gritRoot}/rule.json`];
    if (encodedRule === undefined) throw new Error("Compatibility fixture has no Grit rule.");
    const rule = JSON.parse(encodedRule) as Record<string, unknown>;
    const runner = rule.runner as Record<string, unknown>;
    const sameRootAcquisition = { kind: "check", roots: ["scripts/habitat"] };
    const distinctCoverageFixture: Fixture = {
      ...fixture,
      files: {
        ...fixture.files,
        [`${gritRoot}/rule.json`]: JSON.stringify({
          ...rule,
          pathCoverage: [{ kind: "exact-path", patterns: ["scripts/habitat/covered/**/*.ts"] }],
          runner: { ...runner, acquisition: sameRootAcquisition },
        }),
        [`${peerRoot}/rule.json`]: JSON.stringify({
          ...rule,
          id: "legacy_peer",
          title: "Require legacy_peer",
          message: "legacy_peer found a violation.",
          pathCoverage: [{ kind: "exact-path", patterns: ["scripts/habitat/exact.ts"] }],
          supportFiles: { baseline: `${peerRoot}/baseline.json` },
          runner: {
            ...runner,
            files: { pattern: `${peerRoot}/pattern.md` },
            patternName: "legacy_peer",
            acquisition: sameRootAcquisition,
          },
        }),
        [`${peerRoot}/baseline.json`]: "[]",
        [`${peerRoot}/pattern.md`]: "# legacy_peer\n\n```grit\nlegacy_peer()\n```\n",
      },
    };

    const checked = await checkFixture(distinctCoverageFixture, {
      selectors: { runner: "grit" },
    });

    expect(checked.calls).toHaveLength(2);
    expect(checked.calls.map(({ programs }) => programs.map(({ program }) => program))).toEqual([
      ["legacy_grit()"],
      ["legacy_peer()"],
    ]);
    expect(
      checked.calls.map(({ subjectPaths }) =>
        subjectPaths.map((subject) => subject.slice(subject.indexOf("scripts/habitat/")))
      )
    ).toEqual([["scripts/habitat/covered/child.ts"], ["scripts/habitat/exact.ts"]]);
  });

  test("refuses compatibility Grit subjects selected through symbolic links", async () => {
    const checked = await checkFixture(
      compatibilityFixture({
        symlinks: [
          {
            path: "scripts/habitat/covered/linked.ts",
            target: "file",
            contents: "export const linked = true;\n",
          },
        ],
      }),
      { selectors: { rule: "legacy_grit" } }
    );

    expect(checked.calls).toEqual([]);
    expect(checked.inventoryCalls).toEqual([]);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          ownerProject: "habitat",
          instanceId: null,
          ruleId: "legacy_grit",
          runner: "grit",
          lane: "enforced",
          locked: true,
          status: "error",
          disposition: {
            kind: "failed",
            reason: "SetupFailed",
            detail: expect.stringContaining("symbolic link"),
          },
          findings: [],
        },
      ],
    });
  });

  test("refuses compatibility acquisition symlinks before no-match completion", async () => {
    const checked = await checkFixture(
      compatibilityFixture({
        coverageMatches: false,
        acquisitionRoots: ["scripts/habitat/linked-root"],
        symlinks: [
          {
            path: "scripts/habitat/linked-root",
            target: "directory",
            targetPath: "scripts/habitat/real-root",
          },
        ],
      }),
      { selectors: { rule: "legacy_grit" } }
    );

    expect(checked.calls).toEqual([]);
    expect(checked.inventoryCalls).toEqual([]);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          instanceId: null,
          ruleId: "legacy_grit",
          locked: true,
          status: "error",
          disposition: {
            kind: "failed",
            reason: "SetupFailed",
            detail: expect.stringContaining("acquisition root"),
          },
        },
      ],
    });
  });

  test("keeps compatibility selection instance-free and no-match evaluation inert", async () => {
    const fixture = compatibilityFixture({ coverageMatches: false });
    const noMatch = await checkFixture(fixture, {
      selectors: { owner: "habitat", rule: "legacy_grit", runner: "grit" },
    });
    const wrongNamespace = await checkFixture(fixture, {
      selectors: { instance: "legacy_grit" },
    });

    expect(noMatch.calls).toEqual([]);
    expect(noMatch.result).toMatchObject({
      _tag: "Completed",
      ok: true,
      applications: [
        {
          instanceId: null,
          locked: true,
          ruleId: "legacy_grit",
          status: "pass",
          disposition: {
            kind: "not-applicable",
            reason: "no-matched-acquisition-roots",
          },
          findings: [],
        },
      ],
    });
    expect(wrongNamespace.calls).toEqual([]);
    expect(wrongNamespace.result).toMatchObject({
      _tag: "SelectionRejected",
      issues: [
        {
          code: "selector-wrong-namespace",
          selector: "instance:legacy_grit",
        },
      ],
    });

    const v3 = singleGritFixture();
    const mixed = await checkFixture(
      { files: { ...fixture.files, ...v3.files } },
      { selectors: { instance: "example-package" } }
    );
    expect(mixed.calls).toHaveLength(1);
    expect(mixed.calls[0]?.programs.map(({ program }) => program)).toEqual(["package_rule()"]);
    expect(mixed.result).toMatchObject({
      _tag: "Completed",
      applications: [{ instanceId: "example-package", ruleId: "package_rule", locked: false }],
    });
  });

  test("rejects unknown, wrong-namespace, and empty selections without evaluation", async () => {
    const splitFixture = authorityFixture({
      blueprints: [
        { id: "alpha", rules: [{ id: "alpha_rule" }] },
        { id: "beta", rules: [{ id: "beta_rule" }] },
      ],
      instances: [
        exampleInstance({
          id: "alpha",
          ownerProject: "@rawr/alpha",
          blueprint: "alpha",
          projectPath: "packages/alpha",
        }),
        exampleInstance({
          id: "beta",
          ownerProject: "@rawr/beta",
          blueprint: "beta",
          projectPath: "packages/beta",
        }),
      ],
    });

    const unknown = await checkFixture(splitFixture, {
      selectors: {
        owner: "@rawr/missing",
        instance: "missing_instance",
        rule: "missing_rule",
        runner: "missing",
      },
    });
    expect(unknown.calls).toEqual([]);
    expect(unknown.result).toMatchObject({
      _tag: "SelectionRejected",
      issues: [
        { code: "selector-unknown", selector: "owner:@rawr/missing" },
        { code: "selector-unknown", selector: "instance:missing_instance" },
        { code: "selector-unknown", selector: "rule:missing_rule" },
        { code: "selector-unknown", selector: "runner:missing" },
      ],
    });

    const wrongNamespace = await checkFixture(splitFixture, {
      selectors: { instance: "alpha_rule" },
    });
    expect(wrongNamespace.calls).toEqual([]);
    expect(wrongNamespace.result).toMatchObject({
      _tag: "SelectionRejected",
      issues: [
        {
          code: "selector-wrong-namespace",
          selector: "instance:alpha_rule",
        },
      ],
    });

    const empty = await checkFixture(splitFixture, {
      selectors: { owner: "@rawr/alpha", rule: "beta_rule", runner: "grit" },
    });
    expect(empty.calls).toEqual([]);
    expect(empty.result).toMatchObject({
      _tag: "SelectionRejected",
      issues: [{ code: "selector-empty", selector: "selectors" }],
    });
  });

  test("unions the singular and repeated rule selectors", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [{ id: "alpha_rule" }, { id: "beta_rule" }],
        },
      ],
      instances: [exampleInstance()],
    });
    const selected = await checkFixture(fixture, {
      selectors: { rule: "alpha_rule", rules: ["beta_rule", "alpha_rule"] },
    });

    expect(selected.calls).toHaveLength(1);
    expect(selected.calls[0]?.programs.map(({ program }) => program)).toEqual([
      "alpha_rule()",
      "beta_rule()",
    ]);
    expect(selected.result).toMatchObject({ _tag: "Completed", ok: true });
  });

  test("short-circuits a rejected catalog before evaluation", async () => {
    const { calls, result } = await checkFixture(
      {
        files: { ".habitat/blueprints/broken/blueprint.toml": "not = [valid" },
      },
      {}
    );

    expect(calls).toEqual([]);
    expect(result).toMatchObject({
      _tag: "CatalogRejected",
      issues: [
        {
          code: "authority-toml-invalid",
          path: ".habitat/blueprints/broken/blueprint.toml",
        },
      ],
    });
  });

  test("evaluates native structure semantics with stable path-only findings", async () => {
    let workspaceRoot = "";
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "package_structure",
              runner: "structure",
              structureContents: `schemaVersion = 2

[[scopes]]
name = "missing-root"
rootRole = "project"
relativePath = "missing.ts"
kind = "file"
mode = "open"

[[scopes]]
name = "wrong-kind"
rootRole = "project"
relativePath = "actual.txt"
kind = "directory"
mode = "open"

[[scopes]]
name = "closed-project"
rootRole = "project"
relativePath = "."
kind = "directory"
mode = "closed"
required = ["habitat.toml", "missing.txt"]
allowed = ["actual.txt", "forbidden.txt"]
forbidden = ["forbidden.txt"]
`,
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });
    const expanded: Fixture = {
      ...fixture,
      onWorkspaceRoot: (root) => {
        workspaceRoot = root;
      },
      files: {
        ...fixture.files,
        "packages/example/actual.txt": "actual\n",
        "packages/example/forbidden.txt": "forbidden\n",
        "packages/example/unexpected.txt": "unexpected\n",
      },
    };
    const { calls, inventoryCalls, result } = await checkFixture(expanded, {});

    expect(calls).toEqual([]);
    expect(inventoryCalls).toEqual([
      { root: workspaceRoot, maxEntries: MAX_SOURCE_INVENTORY_ENTRIES },
    ]);
    expect(result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          runner: "habitat",
          status: "fail",
          disposition: { kind: "evaluated" },
          findings: [
            { code: "root-missing", path: "packages/example/missing.ts" },
            { code: "wrong-root-kind", path: "packages/example/actual.txt" },
            { code: "missing-required-child", path: "packages/example" },
            { code: "forbidden-child", path: "packages/example/forbidden.txt" },
            { code: "unexpected-child", path: "packages/example/unexpected.txt" },
          ],
        },
      ],
    });
    if (result._tag === "Completed") {
      const structure = result.applications[0];
      expect(structure?.runner).toBe("habitat");
      if (structure?.runner === "habitat") {
        for (const finding of structure.findings) {
          expect(Object.keys(finding).sort()).toEqual([
            "baselined",
            "code",
            "message",
            "path",
            "severity",
          ]);
        }
        expect(structure.findings.every((finding) => finding.baselined === false)).toBe(true);
      }
    }
  });

  test("enforces the selected service blueprint as a closed file-kind topology", async () => {
    const structureContents = await Bun.file(
      new URL("../../../../../../.habitat/blueprints/service/structure.toml", import.meta.url)
    ).text();
    const valid = await checkFixture(serviceStructureFixture(structureContents), {});

    expect(valid.result).toMatchObject({
      _tag: "Completed",
      ok: true,
      applications: [
        {
          ruleId: "service_v1_structure",
          runner: "habitat",
          status: "pass",
          findings: [],
        },
      ],
    });

    const violations = [
      {
        file: "packages/example/src/service/db/state.ts",
        code: "unexpected-child",
        path: "packages/example/src/service/db/state.ts",
      },
      ...["generated.ts", "helpers.ts", "index.ts"].map((name) => ({
        file: `packages/example/src/service/db/schema/${name}`,
        code: "forbidden-child" as const,
        path: `packages/example/src/service/db/schema/${name}`,
      })),
      ...["helpers.ts", "index.ts", "provider.ts"].map((name) => ({
        file: `packages/example/src/service/db/stores/${name}`,
        code: "forbidden-child" as const,
        path: `packages/example/src/service/db/stores/${name}`,
      })),
      {
        file: "packages/example/src/service/middleware/index.ts",
        code: "forbidden-child",
        path: "packages/example/src/service/middleware/index.ts",
      },
      ...["greet.test.ts", "greet.typecheck.ts"].map((name) => ({
        file: `packages/example/src/service/modules/greeting/contract/${name}`,
        code: "forbidden-child" as const,
        path: `packages/example/src/service/modules/greeting/contract/${name}`,
      })),
      ...["authorization.spec.ts", "authorization.typecheck.ts"].map((name) => ({
        file: `packages/example/src/service/modules/greeting/middleware/${name}`,
        code: "forbidden-child" as const,
        path: `packages/example/src/service/modules/greeting/middleware/${name}`,
      })),
      ...["greet.spec.ts", "greet.typecheck.ts"].map((name) => ({
        file: `packages/example/src/service/modules/greeting/model/dto/${name}`,
        code: "forbidden-child" as const,
        path: `packages/example/src/service/modules/greeting/model/dto/${name}`,
      })),
      {
        file: "packages/example/src/service/modules/greeting/router/index.ts",
        code: "forbidden-child",
        path: "packages/example/src/service/modules/greeting/router/index.ts",
      },
      ...["retention.test.ts", "retention.typecheck.ts"].map((name) => ({
        file: `packages/example/src/service/model/policy/${name}`,
        code: "forbidden-child" as const,
        path: `packages/example/src/service/model/policy/${name}`,
      })),
      ...["fixture.spec.ts", "fixture.typecheck.ts"].map((name) => ({
        file: `packages/example/test/support/modules/greeting/${name}`,
        code: "forbidden-child" as const,
        path: `packages/example/test/support/modules/greeting/${name}`,
      })),
      ...["fixture.test.ts", "fixture.typecheck.ts"].map((name) => ({
        file: `packages/example/test/support/service/${name}`,
        code: "forbidden-child" as const,
        path: `packages/example/test/support/service/${name}`,
      })),
    ] as const;
    const forbidden = await checkFixture(
      serviceStructureFixture(structureContents, {
        extraFiles: {
          ...Object.fromEntries(violations.map(({ file }) => [file, "export {};\n"])),
          "packages/example/test/mechanics/client/client.test.ts": "export {};\n",
          "packages/example/src/service/modules/greeting/middleware/index.ts": "export {};\n",
          "packages/example/src/service/modules/greeting/model/dto/index.ts": "export {};\n",
          "packages/example/src/service/model/policy/index.ts": "export {};\n",
        },
      }),
      {}
    );
    expect(forbidden.result).toMatchObject({ _tag: "Completed", ok: false });
    if (forbidden.result._tag === "Completed") {
      const application = forbidden.result.applications[0];
      expect(application?.runner).toBe("habitat");
      if (application?.runner === "habitat") {
        expect(
          application.findings
            .map(({ code, path }) => ({ code, path }))
            .sort((left, right) => textOrder(left.path, right.path))
        ).toEqual(
          violations
            .map(({ code, path }) => ({ code, path }))
            .sort((left, right) => textOrder(left.path, right.path))
        );
      }
    }

    const wrongKind = await checkFixture(
      serviceStructureFixture(structureContents, {
        omitFiles: [
          "packages/example/package.json",
          "packages/example/src/client.ts",
          "packages/example/src/service/modules/greeting/router/greet.ts",
        ],
        extraFiles: {
          "packages/example/package.json/escape.ts": "export {};\n",
          "packages/example/src/client.ts/escape.ts": "export {};\n",
          "packages/example/src/service/modules/greeting/router/greet.ts/escape.ts": "export {};\n",
        },
      }),
      {}
    );
    expect(wrongKind.result).toMatchObject({ _tag: "Completed", ok: false });
    if (wrongKind.result._tag === "Completed") {
      const application = wrongKind.result.applications[0];
      expect(application?.runner).toBe("habitat");
      if (application?.runner === "habitat") {
        expect(
          application.findings
            .map(({ code, path }) => ({ code, path }))
            .sort((left, right) => textOrder(left.path, right.path))
        ).toEqual(
          [
            { code: "wrong-root-kind" as const, path: "packages/example/package.json" },
            { code: "wrong-root-kind" as const, path: "packages/example/src/client.ts" },
            {
              code: "wrong-root-kind" as const,
              path: "packages/example/src/service/modules/greeting/router/greet.ts",
            },
          ].sort((left, right) => textOrder(left.path, right.path))
        );
      }
    }
  });

  test("does not observe inventory for invalid or wholly unbound structure applications", async () => {
    const invalid = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "invalid_structure",
              runner: "structure",
              structureContents: "schemaVersion = 1\nscopes = []\n",
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });
    const invalidResult = await checkFixture(invalid, {});
    expect(invalidResult.inventoryCalls).toEqual([]);
    expect(invalidResult.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          runner: "habitat",
          status: "error",
          disposition: { kind: "failed", reason: "StructureInvalid" },
        },
      ],
    });

    const unboundResult = await checkFixture(optionalUnboundStructureFixture(), {});
    expect(unboundResult.inventoryCalls).toEqual([]);
    expect(unboundResult.result).toMatchObject({
      _tag: "Completed",
      ok: true,
      applications: [
        {
          runner: "habitat",
          status: "pass",
          disposition: { kind: "evaluated" },
          findings: [],
        },
      ],
    });
  });

  test("rejects malformed structure globs before inventory", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "invalid_glob",
              runner: "structure",
              structureContents: defaultStructureToml().replace(
                'relativePath = "."',
                'relativePath = "[broken"'
              ),
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });

    const checked = await checkFixture(fixture, {});

    expect(checked.inventoryCalls).toEqual([]);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          status: "error",
          disposition: {
            kind: "failed",
            reason: "StructureInvalid",
            detail: expect.stringContaining("safe, valid root-relative path or glob"),
          },
        },
      ],
    });
  });

  test("rejects duplicate structure scope names before inventory", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "duplicate_scopes",
              runner: "structure",
              structureContents: `${defaultStructureToml()}
[[scopes]]
name = "project"
rootRole = "project"
relativePath = "src"
kind = "directory"
mode = "open"
`,
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });

    const checked = await checkFixture(fixture, {});

    expect(checked.inventoryCalls).toEqual([]);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          status: "error",
          disposition: {
            kind: "failed",
            reason: "StructureInvalid",
            detail: "Expected unique structure scope names",
          },
        },
      ],
    });
  });

  test("rejects duplicate compatibility structure scope names before inventory", async () => {
    const fixture = compatibilityFixture();
    const checked = await checkFixture(
      {
        ...fixture,
        files: {
          ...fixture.files,
          ".habitat/legacy/legacy_structure/structure.toml": `schemaVersion = 1

[[scopes]]
name = "duplicate"
root = "scripts/habitat/shape"
kind = "directory"
mode = "open"

[[scopes]]
name = "duplicate"
root = "scripts/habitat/other"
kind = "directory"
mode = "open"
`,
        },
      },
      {}
    );

    expect(checked.inventoryCalls).toEqual([]);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      applications: [
        { ruleId: "legacy_grit", status: "pass" },
        {
          ruleId: "legacy_structure",
          status: "error",
          disposition: {
            kind: "failed",
            reason: "StructureInvalid",
            detail: "Expected unique compatibility structure scope names",
          },
        },
      ],
    });
  });

  test("rejects an unknown structure root role before inventory", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "unknown_role",
              runner: "structure",
              structureContents: defaultStructureToml().replace(
                'rootRole = "project"',
                'rootRole = "missing"'
              ),
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });
    const checked = await checkFixture(fixture, {});
    expect(checked.inventoryCalls).toEqual([]);
    expect(checked.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          disposition: {
            kind: "failed",
            reason: "StructureInvalid",
            detail: expect.stringContaining('unknown root role "missing"'),
          },
        },
      ],
    });
  });

  test("uses fresh inventory and observations per invocation across exact structure application identities", async () => {
    const observedPaths: string[] = [];
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "alpha_structure",
              runner: "structure",
              structureContents: leafStructureToml(),
            },
            {
              id: "beta_structure",
              runner: "structure",
              structureContents: leafStructureToml(),
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });
    const expanded: Fixture = {
      ...fixture,
      files: { ...fixture.files, "packages/example/leaf.ts": "export {};\n" },
      clientFileSystem: (fileSystem, path, workspaceRoot) => {
        const leafPath = path.join(workspaceRoot, "packages/example/leaf.ts");
        return FileSystem.makeNoop({
          ...fileSystem,
          readLink: (candidate) => {
            if (candidate !== leafPath) return fileSystem.readLink(candidate);
            observedPaths.push(path.relative(workspaceRoot, candidate));
            return observedPaths.length === 1
              ? fileSystem.readLink(candidate)
              : Effect.fail(
                  PlatformError.systemError({
                    _tag: "NotFound",
                    module: "FileSystem",
                    method: "readLink",
                    pathOrDescriptor: candidate,
                  })
                );
          },
        });
      },
    };
    await withFixture(expanded, async (client, recording) => {
      const first = await client.catalog.check({});
      expect(recording.inventory.calls).toHaveLength(1);
      expect(observedPaths).toEqual(["packages/example/leaf.ts"]);
      const second = await client.catalog.check({});
      expect(recording.inventory.calls).toHaveLength(2);
      expect(observedPaths).toEqual(["packages/example/leaf.ts", "packages/example/leaf.ts"]);
      const firstIdentities =
        first._tag === "Completed" ? first.applications.map(applicationKey) : [];
      const secondIdentities =
        second._tag === "Completed" ? second.applications.map(applicationKey) : [];

      expect(firstIdentities).toEqual([
        "alpha_structure:example-package:@rawr/example",
        "beta_structure:example-package:@rawr/example",
      ]);
      expect(secondIdentities).toEqual(firstIdentities);
      expect(first).toMatchObject({
        _tag: "Completed",
        applications: [
          { status: "pass", findings: [] },
          { status: "pass", findings: [] },
        ],
      });
      expect(second).toMatchObject({
        _tag: "Completed",
        applications: [
          { findings: [{ code: "root-missing", path: "packages/example/leaf.ts" }] },
          { findings: [{ code: "root-missing", path: "packages/example/leaf.ts" }] },
        ],
      });
      expect(recording.calls).toEqual([]);
    });
  });

  test("treats inventory as the source universe and prunes tracked non-file descendants", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "inventory_structure",
              runner: "structure",
              structureContents: `schemaVersion = 2

[[scopes]]
name = "tracked-link"
rootRole = "project"
relativePath = "link"
kind = "directory"
mode = "closed"
allowEmpty = true

[[scopes]]
name = "deleted-tracked-link"
rootRole = "project"
relativePath = "deleted-link"
kind = "directory"
mode = "open"

[[scopes]]
name = "visible-untracked"
rootRole = "project"
relativePath = "visible/*.ts"
kind = "directory"
mode = "open"

[[scopes]]
name = "pruned-descendant"
rootRole = "project"
relativePath = "link/descendant.ts"
kind = "file"
mode = "open"

[[scopes]]
name = "closed-project"
rootRole = "project"
relativePath = "."
kind = "directory"
mode = "closed"
allowed = ["habitat.toml", "link", "visible"]
`,
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });
    const expanded: Fixture = {
      ...fixture,
      files: {
        ...fixture.files,
        "packages/example/ignored-live.ts": "ignored\n",
        "packages/example/link/descendant.ts": "tracked descendant\n",
        "packages/example/visible/new.ts": "visible\n",
      },
    };
    const checked = await checkFixture(expanded, {}, undefined, () =>
      Effect.succeed({
        paths: [
          ".habitat/blueprints/package/blueprint.toml",
          ".habitat/blueprints/package/inventory_structure.structure.toml",
          "packages/example/habitat.toml",
          "packages/example/deleted-link",
          "packages/example/link",
          "packages/example/link/descendant.ts",
          "packages/example/visible/new.ts",
        ],
        trackedNonFilePaths: ["packages/example/deleted-link", "packages/example/link"],
      })
    );

    expect(checked.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          findings: [
            { code: "wrong-root-kind", path: "packages/example/link" },
            { code: "root-missing", path: "packages/example/deleted-link" },
            { code: "wrong-root-kind", path: "packages/example/visible/new.ts" },
            { code: "root-missing", path: "packages/example/link/descendant.ts" },
          ],
        },
      ],
    });
    expect(JSON.stringify(checked.result)).not.toContain("ignored-live.ts");
  });

  test("reconciles retained inventory entries with deleted and type-replaced live paths", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "live_structure",
              runner: "structure",
              structureContents: `schemaVersion = 2

[[scopes]]
name = "deleted-root"
rootRole = "project"
relativePath = "ghost"
kind = "directory"
mode = "open"
required = ["required.ts"]

[[scopes]]
name = "deleted-required-child"
rootRole = "project"
relativePath = "live-root"
kind = "directory"
mode = "open"
required = ["required.ts"]

[[scopes]]
name = "directory-replaced-by-file"
rootRole = "project"
relativePath = "replaced"
kind = "directory"
mode = "open"

[[scopes]]
name = "descendant-below-replaced-directory"
rootRole = "project"
relativePath = "replaced/legacy.ts"
kind = "file"
mode = "open"
`,
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });
    const expanded: Fixture = {
      ...fixture,
      directories: ["packages/example/live-root"],
      files: {
        ...fixture.files,
        "packages/example/replaced": "now a file\n",
      },
    };
    const inventory = defaultInventory(expanded);
    const checked = await checkFixture(expanded, {}, undefined, () =>
      Effect.succeed({
        ...inventory,
        paths: [
          ...inventory.paths,
          "packages/example/ghost/required.ts",
          "packages/example/live-root/required.ts",
          "packages/example/replaced/legacy.ts",
        ].sort(textOrder),
      })
    );

    expect(checked.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          disposition: { kind: "evaluated" },
          findings: [
            { code: "root-missing", path: "packages/example/ghost" },
            { code: "missing-required-child", path: "packages/example/live-root" },
            { code: "wrong-root-kind", path: "packages/example/replaced" },
            { code: "root-missing", path: "packages/example/replaced/legacy.ts" },
          ],
        },
      ],
    });
  });

  test("applies open, allowEmpty, and direct-child glob semantics in one focused matrix", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "structure_matrix",
              runner: "structure",
              structureContents: `schemaVersion = 2

[[scopes]]
name = "open-project"
rootRole = "project"
relativePath = "."
kind = "directory"
mode = "open"
required = ["habitat.toml", "required.ts"]
forbidden = ["forbidden.ts"]

[[scopes]]
name = "missing-default"
rootRole = "project"
relativePath = "missing-default"
kind = "directory"
mode = "open"

[[scopes]]
name = "missing-allowed"
rootRole = "project"
relativePath = "missing-allowed"
kind = "directory"
mode = "open"
allowEmpty = true

[[scopes]]
name = "direct-present"
rootRole = "project"
relativePath = "direct-present"
kind = "directory"
mode = "open"
required = ["*.ts"]

[[scopes]]
name = "grandchild-only"
rootRole = "project"
relativePath = "grandchild-only"
kind = "directory"
mode = "open"
required = ["*.ts"]
`,
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });
    const expanded: Fixture = {
      ...fixture,
      files: {
        ...fixture.files,
        "packages/example/unlisted.extra": "open mode accepts this\n",
        "packages/example/forbidden.ts": "open mode still forbids this\n",
        "packages/example/direct-present/match.ts": "export {};\n",
        "packages/example/direct-present/nested/grandchild.ts": "export {};\n",
        "packages/example/grandchild-only/nested/grandchild.ts": "export {};\n",
      },
    };

    const checked = await checkFixture(expanded, {});

    expect(checked.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          findings: [
            { code: "missing-required-child", path: "packages/example" },
            { code: "forbidden-child", path: "packages/example/forbidden.ts" },
            { code: "root-missing", path: "packages/example/missing-default" },
            { code: "missing-required-child", path: "packages/example/grandchild-only" },
          ],
        },
      ],
    });
    expect(JSON.stringify(checked.result)).not.toContain("missing-allowed");
    expect(JSON.stringify(checked.result)).not.toContain("unlisted.extra");
  });

  test("treats a binding path with glob syntax as a literal confinement root", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "literal_binding",
              runner: "structure",
              structureContents: `schemaVersion = 2

[[scopes]]
name = "literal-binding"
rootRole = "project"
relativePath = "target.ts"
kind = "file"
mode = "open"
`,
            },
          ],
        },
      ],
      instances: [
        exampleInstance({
          ownerProject: "@rawr/literal",
          projectPath: "packages/@(foo)",
        }),
      ],
    });
    const expanded: Fixture = {
      ...fixture,
      files: {
        ...fixture.files,
        "packages/foo/target.ts": "export const sibling = true;\n",
      },
    };

    const checked = await checkFixture(expanded, {});

    expect(checked.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          status: "fail",
          findings: [
            {
              code: "root-missing",
              path: "packages/@(foo)/target.ts",
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(checked.result)).not.toContain("packages/foo/target.ts");
  });

  test("resolves distinct source and package paths from the project root", async () => {
    const checked = await checkFixture(distinctProjectPathStructureFixture(), {});

    expect(checked.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          findings: [
            { code: "root-missing", path: "packages/example/base/missing.ts" },
            { code: "root-missing", path: "packages/example/src/base/missing.ts" },
          ],
        },
      ],
    });
  });

  test("keeps mixed Grit ranges and Habitat path-only findings runner-specific", async () => {
    const checked = await checkFixture(mixedRunnerFixture(), {}, (input) =>
      Effect.succeed(
        evaluationResults(input, () => [
          finding(`${input.subjectPaths[0]}/grit.ts`, "mixed Grit finding"),
        ])
      )
    );

    expect(checked.result).toMatchObject({
      _tag: "Completed",
      applications: [
        { runner: "habitat", disposition: { kind: "evaluated" } },
        { runner: "grit", disposition: { kind: "evaluated" } },
      ],
    });
    if (checked.result._tag === "Completed") {
      const habitat = checked.result.applications[0];
      const grit = checked.result.applications[1];
      expect(habitat?.runner).toBe("habitat");
      expect(grit?.runner).toBe("grit");
      if (habitat?.runner === "habitat" && grit?.runner === "grit") {
        expect(Object.keys(habitat.findings[0] ?? {}).sort()).toEqual([
          "baselined",
          "code",
          "message",
          "path",
          "severity",
        ]);
        expect(habitat.findings[0]).toMatchObject({
          code: "root-missing",
          path: "packages/example/leaf.ts",
        });
        expect(grit.findings).toEqual([
          {
            path: "packages/example/grit.ts",
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 2, offset: 1 },
            message: "mixed Grit finding",
            severity: "error",
            baselined: false,
          },
        ]);
      }
    }
  });

  test("isolates typed inventory failure while defects and interruptions escape", async () => {
    const fixture = mixedRunnerFixture();
    const typed = await checkFixture(fixture, {}, undefined, () =>
      Effect.fail({
        _tag: "SourceInventoryFailure",
        reason: "CommandFailed",
        detail: "Inventory command failed.",
      })
    );
    expect(typed.calls).toHaveLength(1);
    expect(typed.result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          ruleId: "alpha_structure",
          runner: "habitat",
          status: "error",
          disposition: { kind: "failed", reason: "InventoryFailed" },
          findings: [],
        },
        {
          ruleId: "beta_grit",
          runner: "grit",
          status: "pass",
          findings: [],
        },
      ],
    });
    if (typed.result._tag === "Completed") {
      const habitat = typed.result.applications[0];
      const grit = typed.result.applications[1];
      expect(grit?.runner).toBe("grit");
      expect(habitat?.runner).toBe("habitat");
    }

    const reverse = await checkFixture(reverseMixedRunnerFixture(), {}, undefined, () =>
      Effect.fail({
        _tag: "SourceInventoryFailure",
        reason: "CommandFailed",
        detail: "Reverse inventory command failed.",
      })
    );
    expect(reverse.calls).toHaveLength(1);
    expect(reverse.result).toMatchObject({
      _tag: "Completed",
      applications: [
        { ruleId: "alpha_grit", runner: "grit", status: "pass", findings: [] },
        {
          ruleId: "beta_structure",
          runner: "habitat",
          status: "error",
          disposition: { kind: "failed", reason: "InventoryFailed" },
          findings: [],
        },
      ],
    });

    await expect(
      checkFixture(fixture, {}, undefined, () =>
        Effect.die(new Error("Inventory defect must remain a defect."))
      )
    ).rejects.toBeDefined();
    await expect(
      checkFixture(fixture, {}, undefined, () => Effect.interrupt)
    ).rejects.toBeDefined();
  });

  test("reports typed matched-root observation failure while defects and interruptions escape", async () => {
    const base = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [
            {
              id: "leaf_structure",
              runner: "structure",
              structureContents: `schemaVersion = 2

[[scopes]]
name = "leaf"
rootRole = "project"
relativePath = "leaf.ts"
kind = "file"
mode = "open"
`,
            },
          ],
        },
      ],
      instances: [exampleInstance()],
    });
    const injectedLeafInventory: SourceInventoryResult = {
      ...defaultInventory(base),
      paths: [...defaultInventory(base).paths, "packages/example/leaf.ts"].sort(textOrder),
    };
    let eioStatCalls = 0;
    const eio = await checkFixture(
      {
        ...base,
        clientFileSystem: (fileSystem, _path, workspaceRoot) =>
          FileSystem.makeNoop({
            ...fileSystem,
            readLink: (candidate) =>
              candidate === `${workspaceRoot}/packages/example/leaf.ts`
                ? Effect.fail(
                    PlatformError.systemError({
                      _tag: "Unknown",
                      module: "FileSystem",
                      method: "readLink",
                      pathOrDescriptor: candidate,
                      cause: { code: "EIO" },
                    })
                  )
                : fileSystem.readLink(candidate),
            stat: (candidate) => {
              if (candidate === `${workspaceRoot}/packages/example/leaf.ts`) eioStatCalls += 1;
              return fileSystem.stat(candidate);
            },
          }),
      },
      {},
      undefined,
      () => Effect.succeed(injectedLeafInventory)
    );
    expect(eioStatCalls).toBe(0);
    expect(eio.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          disposition: { kind: "failed", reason: "StructureObservationFailed" },
        },
      ],
    });

    const disappeared = await checkFixture(base, {}, undefined, () =>
      Effect.succeed(injectedLeafInventory)
    );
    expect(disappeared.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          disposition: { kind: "evaluated" },
          findings: [{ code: "root-missing", path: "packages/example/leaf.ts" }],
        },
      ],
    });

    const files = { ...base.files, "packages/example/leaf.ts": "export {};\n" };
    const typed = await checkFixture(
      {
        ...base,
        files,
        clientFileSystem: (fileSystem, _path, workspaceRoot) => {
          return FileSystem.makeNoop({
            ...fileSystem,
            readLink: (candidate) => {
              if (candidate !== `${workspaceRoot}/packages/example/leaf.ts`) {
                return fileSystem.readLink(candidate);
              }
              return Effect.fail(
                PlatformError.systemError({
                  _tag: "PermissionDenied",
                  module: "FileSystem",
                  method: "readLink",
                  pathOrDescriptor: candidate,
                })
              );
            },
          });
        },
      },
      {}
    );
    expect(typed.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          status: "error",
          disposition: { kind: "failed", reason: "StructureObservationFailed" },
        },
      ],
    });

    await expect(
      checkFixture(
        {
          ...base,
          files,
          clientFileSystem: (fileSystem, _path, workspaceRoot) => {
            return FileSystem.makeNoop({
              ...fileSystem,
              readLink: (candidate) => {
                if (candidate !== `${workspaceRoot}/packages/example/leaf.ts`) {
                  return fileSystem.readLink(candidate);
                }
                return Effect.die(new Error("Structure observation defect."));
              },
            });
          },
        },
        {}
      )
    ).rejects.toBeDefined();

    await expect(
      checkFixture(
        {
          ...base,
          files,
          clientFileSystem: (fileSystem, _path, workspaceRoot) =>
            FileSystem.makeNoop({
              ...fileSystem,
              readLink: (candidate) =>
                candidate === `${workspaceRoot}/packages/example/leaf.ts`
                  ? Effect.interrupt
                  : fileSystem.readLink(candidate),
            }),
        },
        {}
      )
    ).rejects.toBeDefined();
  });

  test("rejects Grit apply-dry-run without evaluation", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [{ id: "package_apply", acquisition: "apply-dry-run" }],
        },
      ],
      instances: [exampleInstance()],
    });
    const { calls, result } = await checkFixture(fixture, {});

    expect(calls).toEqual([]);
    expect(result).toMatchObject({
      _tag: "SelectionRejected",
      issues: [
        {
          code: "runner-unsupported",
          selector: "example-package:package_apply",
        },
      ],
    });
  });

  test("reports a malformed pattern as an application error without evaluation", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [{ id: "package_rule", patternContents: "package_rule()\n" }],
        },
      ],
      instances: [exampleInstance()],
    });
    const { calls, result } = await checkFixture(fixture, {});

    expect(calls).toEqual([]);
    expect(result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          ruleId: "package_rule",
          status: "error",
          disposition: {
            kind: "failed",
            reason: "PatternInvalid",
            detail: "Pattern asset has no opening ```grit fence.",
          },
          findings: [],
        },
      ],
    });
  });

  test("turns a finding outside admitted subjects into an application error", async () => {
    const { calls, result } = await checkFixture(singleGritFixture(), {}, (input) =>
      Effect.succeed(
        evaluationResults(input, () => [finding("/outside-habitat-check.ts", "foreign finding")])
      )
    );

    expect(calls).toHaveLength(1);
    expect(result).toMatchObject({
      _tag: "Completed",
      ok: false,
      applications: [
        {
          ruleId: "package_rule",
          status: "error",
          disposition: {
            kind: "failed",
            reason: "FindingPathInvalid",
            detail: expect.stringContaining("outside admitted subjects"),
          },
          findings: [],
        },
      ],
    });
  });

  test("admits only exact findings for a file acquisition subject", async () => {
    const fixture = fileAcquisitionFixture();
    const exact = await checkFixture(fixture, {}, (input) =>
      Effect.succeed(
        evaluationResults(input, () => [finding(input.subjectPaths[0] ?? "", "exact file finding")])
      )
    );
    const sibling = await checkFixture(fixture, {}, (input) =>
      Effect.succeed(
        evaluationResults(input, () => [
          finding(
            (input.subjectPaths[0] ?? "").replace(/entry\.ts$/, "sibling.ts"),
            "sibling finding"
          ),
        ])
      )
    );

    expect(exact.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          status: "fail",
          findings: [{ path: "packages/example/entry.ts" }],
        },
      ],
    });
    expect(sibling.result).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          status: "error",
          disposition: { kind: "failed", reason: "FindingPathInvalid" },
        },
      ],
    });
  });

  test("keeps both request and selector objects closed", async () => {
    await withFixture(singleGritFixture(), async (client, recording) => {
      await expect(
        Reflect.apply(client.catalog.check, client.catalog, [{ unexpected: true }])
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        Reflect.apply(client.catalog.check, client.catalog, [
          { selectors: { rule: "package_rule", unexpected: true } },
        ])
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(recording.calls).toEqual([]);
    });
  });
});

async function checkFixture(
  fixture: Fixture,
  input: CheckInput,
  handler?: EvaluationHandler,
  inventoryHandler?: InventoryHandler
) {
  return withFixture(
    fixture,
    async (client, recording) => {
      const result = await client.catalog.check(input);
      return {
        result,
        calls: [...recording.calls],
        inventoryCalls: [...recording.inventory.calls],
      };
    },
    handler,
    inventoryHandler
  );
}

async function withFixture<T>(
  fixture: Fixture,
  use: (client: Client, recording: RecordingRuleEvaluation) => Promise<T>,
  handler: EvaluationHandler = (input) => Effect.succeed(evaluationResults(input, () => [])),
  inventoryHandler: InventoryHandler = () => Effect.succeed(defaultInventory(fixture))
): Promise<T> {
  return Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const workspaceRoot = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "habitat-check-test-",
        });
        const fixtureFiles = {
          ...fixture.files,
          [`${POLICY_PACK_ROOT}/package.json`]:
            fixture.policyPack?.packageJson ?? DEFAULT_POLICY_PACK_PACKAGE_JSON,
          [`${POLICY_PACK_ROOT}/habitat-pack.json`]:
            fixture.policyPack?.manifest ?? DEFAULT_POLICY_PACK_MANIFEST,
        };
        fixture.onWorkspaceRoot?.(workspaceRoot);
        for (const directory of [...(fixture.directories ?? [])].sort(textOrder)) {
          yield* fileSystem.makeDirectory(path.join(workspaceRoot, directory), { recursive: true });
        }
        for (const [relativePath, contents] of Object.entries(fixtureFiles).sort(
          ([left], [right]) => textOrder(left, right)
        )) {
          const absolutePath = path.join(workspaceRoot, relativePath);
          yield* fileSystem.makeDirectory(path.dirname(absolutePath), { recursive: true });
          yield* fileSystem.writeFileString(absolutePath, contents);
        }
        for (const [index, symlink] of [...(fixture.symlinks ?? [])]
          .sort((left, right) => textOrder(left.path, right.path))
          .entries()) {
          const target =
            symlink.targetPath === undefined
              ? path.join(
                  yield* fileSystem.makeTempDirectoryScoped({
                    prefix: "habitat-check-outside-",
                  }),
                  `target-${index}`
                )
              : path.join(workspaceRoot, symlink.targetPath);
          if (symlink.target === "directory") {
            yield* fileSystem.makeDirectory(target, { recursive: true });
            if (symlink.contents !== undefined) {
              yield* fileSystem.writeFileString(path.join(target, "subject.ts"), symlink.contents);
            }
          } else {
            yield* fileSystem.writeFileString(target, symlink.contents ?? "");
          }
          const link = path.join(workspaceRoot, symlink.path);
          yield* fileSystem.makeDirectory(path.dirname(link), { recursive: true });
          yield* fileSystem.symlink(target, link);
        }
        const recording = makeRecordingRuleEvaluation(
          handler,
          makeRecordingSourceInventory(inventoryHandler)
        );
        const clientFileSystem =
          fixture.clientFileSystem?.(fileSystem, path, workspaceRoot) ?? fileSystem;
        const client: Client = createClient({
          deps: {
            fileSystem: clientFileSystem,
            path,
            ruleEvaluation: recording.resource,
            sourceInventory: recording.inventory.resource,
          },
          scope: { workspaceRoot },
          config: {
            policyPack: {
              name: POLICY_PACK_NAME,
              packageJsonPath: path.join(workspaceRoot, POLICY_PACK_ROOT, "package.json"),
              manifestPath: path.join(workspaceRoot, POLICY_PACK_ROOT, "habitat-pack.json"),
            },
          },
        });
        return yield* Effect.promise(() => use(client, recording));
      })
    ).pipe(Effect.provide(NodeServices.layer))
  );
}

const POLICY_PACK_NAME = "@fixture/habitat-blueprints";
const POLICY_PACK_ROOT = ".test-policy-pack";
const POLICY_PACK_BLUEPRINT_PATH = "dist/blueprints/package/blueprint.toml";
const POLICY_PACK_PATTERN_PATH = "dist/blueprints/package/package_rule.md";
const DEFAULT_POLICY_PACK_PACKAGE_JSON = JSON.stringify({
  name: POLICY_PACK_NAME,
  version: "1.2.3",
  private: false,
});
const DEFAULT_POLICY_PACK_MANIFEST = JSON.stringify({ protocolVersion: 1, blueprints: [] });

function evaluationResults(
  input: RuleEvaluationRequest,
  findingsForProgram: (
    program: RuleEvaluationRequest["programs"][number],
    index: number
  ) => readonly RuleEvaluationFinding[]
): RuleEvaluationResult {
  return {
    results: input.programs.map((program, index) => ({
      programId: program.id,
      findings: findingsForProgram(program, index),
    })),
  };
}

function makeRecordingRuleEvaluation(
  handler: EvaluationHandler,
  inventory: RecordingSourceInventory
): RecordingRuleEvaluation {
  const calls: RuleEvaluationRequest[] = [];
  return {
    calls,
    inventory,
    resource: {
      evaluate: (input) => {
        const index = calls.length;
        calls.push(input);
        return handler(input, index);
      },
    },
  };
}

function makeRecordingSourceInventory(handler: InventoryHandler): RecordingSourceInventory {
  const calls: ObserveSourceInventoryInput[] = [];
  return {
    calls,
    resource: {
      observe: (input) => {
        const index = calls.length;
        calls.push(input);
        return handler(input, index);
      },
    },
  };
}

function defaultInventory(fixture: Fixture): SourceInventoryResult {
  return {
    paths: Object.keys(fixture.files).sort(textOrder),
    trackedNonFilePaths: [],
  };
}

function authorityFixture(options: {
  readonly blueprints: readonly BlueprintSpec[];
  readonly instances: readonly InstanceSpec[];
}): Fixture {
  const files: Record<string, string> = {};
  for (const blueprint of [...options.blueprints].sort((left, right) =>
    textOrder(left.id, right.id)
  )) {
    const rules = [...blueprint.rules].sort((left, right) => textOrder(left.id, right.id));
    const blueprintRoot = `.habitat/blueprints/${blueprint.id}`;
    files[`${blueprintRoot}/blueprint.toml`] = blueprintToml(blueprint.id, rules);
    for (const rule of rules) {
      if (rule.runner === "structure") {
        files[`${blueprintRoot}/${rule.id}.structure.toml`] =
          rule.structureContents ?? defaultStructureToml();
      } else {
        files[`${blueprintRoot}/${rule.id}.md`] =
          rule.patternContents ?? `# ${rule.id}\n\n\`\`\`grit\n${rule.id}()\n\`\`\`\n`;
      }
    }
  }
  for (const instance of [...options.instances].sort((left, right) =>
    textOrder(left.id, right.id)
  )) {
    files[`${instance.projectPath}/habitat.toml`] = instanceToml(instance);
  }
  return { files };
}

function serviceStructureFixture(
  structureContents: string,
  options: {
    readonly extraFiles?: Readonly<Record<string, string>>;
    readonly omitFiles?: readonly string[];
  } = {}
): Fixture {
  const authority = authorityFixture({
    blueprints: [
      {
        id: "service",
        rules: [{ id: "service_v1_structure", runner: "structure", structureContents }],
      },
    ],
    instances: [exampleInstance({ blueprint: "service" })],
  });
  const files: Record<string, string> = {
    ...authority.files,
    "packages/example/AGENTS.md": "# Example service\n",
    "packages/example/package.json": "{}\n",
    "packages/example/project.json": "{}\n",
    "packages/example/src/client.ts": "export {};\n",
    "packages/example/src/service/base.ts": "export {};\n",
    "packages/example/src/service/contract.ts": "export {};\n",
    "packages/example/src/service/db/migrations/0001_create_item.sql": "select 1;\n",
    "packages/example/src/service/db/stores/items.ts": "export {};\n",
    "packages/example/src/service/impl.ts": "export {};\n",
    "packages/example/src/service/modules/greeting/AGENTS.md": "# Greeting\n",
    "packages/example/src/service/modules/greeting/contract/greet.ts": "export {};\n",
    "packages/example/src/service/modules/greeting/contract/index.ts": "export {};\n",
    "packages/example/src/service/modules/greeting/module.ts": "export {};\n",
    "packages/example/src/service/modules/greeting/router.ts": "export {};\n",
    "packages/example/src/service/modules/greeting/router/greet.ts": "export {};\n",
    "packages/example/src/service/router.ts": "export {};\n",
    "packages/example/test/mechanics/db/database.test.ts": "export {};\n",
    "packages/example/test/support/db/database.ts": "export {};\n",
    "packages/example/tsconfig.json": "{}\n",
    ...options.extraFiles,
  };
  for (const path of options.omitFiles ?? []) delete files[path];
  return { files };
}

function compatibilityFixture(
  options: {
    readonly coverageMatches?: boolean;
    readonly acquisitionRoots?: readonly string[];
    readonly symlinks?: Fixture["symlinks"];
  } = {}
): Fixture {
  const gritRoot = ".habitat/legacy/legacy_grit";
  const structureRoot = ".habitat/legacy/legacy_structure";
  const common = (id: string, root: string) => ({
    schemaVersion: 2,
    id,
    title: `Require ${id}`,
    placement: { niche: "rawr", blueprint: "service", category: "boundary" },
    operation: { kind: "check" },
    ownerProject: "habitat",
    lane: "enforced",
    forbids: "an invalid compatibility fixture",
    why: "The compatibility fixture preserves the executing rule outcome.",
    remediate: "Restore the compatibility fixture.",
    message: `${id} found a violation.`,
    pathCoverage: [
      {
        kind: "exact-path",
        patterns:
          options.coverageMatches === false
            ? ["scripts/habitat/**/*.tsx"]
            : [
                "scripts/habitat/**/*.ts",
                "scripts/habitat/.codex/hooks.json",
                "scripts/habitat/covered/node_modules/dependency.ts",
                ...(options.symlinks ?? []).map(({ path }) => path),
              ],
      },
    ],
    supportFiles: { baseline: `${root}/baseline.json` },
  });
  return {
    ...(options.symlinks === undefined ? {} : { symlinks: options.symlinks }),
    files: {
      ".habitat/index.json": JSON.stringify({
        schemaVersion: 2,
        ownerRoots: { habitat: "scripts/habitat" },
      }),
      [`${gritRoot}/rule.json`]: JSON.stringify({
        ...common("legacy_grit", gritRoot),
        hookCheck: true,
        runner: {
          name: "grit",
          files: { pattern: `${gritRoot}/pattern.md` },
          patternName: "legacy_grit",
          acquisition: {
            kind: "check",
            roots: options.acquisitionRoots ?? [
              "scripts/habitat/covered",
              "scripts/habitat/exact.ts",
              "scripts/habitat/.codex/hooks.json",
            ],
          },
        },
      }),
      [`${gritRoot}/baseline.json`]: "[]",
      [`${gritRoot}/pattern.md`]: "# legacy_grit\n\n```grit\nlegacy_grit()\n```\n",
      [`${structureRoot}/rule.json`]: JSON.stringify({
        ...common("legacy_structure", structureRoot),
        runner: {
          name: "habitat",
          mode: "structure",
          files: { structure: `${structureRoot}/structure.toml` },
        },
      }),
      [`${structureRoot}/baseline.json`]: "[]",
      [`${structureRoot}/structure.toml`]: `schemaVersion = 1

[[scopes]]
name = "closed-shape"
root = "scripts/habitat/shape"
kind = "directory"
mode = "closed"
required = ["required.ts", "missing.ts"]
allowed = ["required.ts", "forbidden.ts"]
forbidden = ["forbidden.ts"]

[[scopes]]
name = "optional-empty"
root = "scripts/habitat/absent"
kind = "directory"
mode = "open"
allowEmpty = true
`,
      "scripts/habitat/covered/child.ts": "export const covered = true;\n",
      "scripts/habitat/covered/node_modules/dependency.ts": "export const dependency = true;\n",
      "scripts/habitat/exact.ts": "export const exact = true;\n",
      "scripts/habitat/.codex/hooks.json": "{}\n",
      "scripts/habitat/outside.ts": "export const outside = true;\n",
      "scripts/habitat/ignored.js": "export const ignored = true;\n",
      "scripts/habitat/shape/required.ts": "export const required = true;\n",
      "scripts/habitat/shape/forbidden.ts": "export const forbidden = true;\n",
      "scripts/habitat/shape/unexpected.ts": "export const unexpected = true;\n",
    },
  };
}

function defaultStructureToml(): string {
  return `schemaVersion = 2

[[scopes]]
name = "project"
rootRole = "project"
relativePath = "."
kind = "directory"
mode = "open"
`;
}

function leafStructureToml(): string {
  return `schemaVersion = 2

[[scopes]]
name = "leaf"
rootRole = "project"
relativePath = "leaf.ts"
kind = "file"
mode = "open"
`;
}

function singleGritFixture(): Fixture {
  return authorityFixture({
    blueprints: [{ id: "package", rules: [{ id: "package_rule" }] }],
    instances: [exampleInstance()],
  });
}

function mixedRunnerFixture(): Fixture {
  return authorityFixture({
    blueprints: [
      {
        id: "package",
        rules: [
          {
            id: "alpha_structure",
            runner: "structure",
            structureContents: leafStructureToml(),
          },
          { id: "beta_grit" },
        ],
      },
    ],
    instances: [exampleInstance()],
  });
}

function reverseMixedRunnerFixture(): Fixture {
  return authorityFixture({
    blueprints: [
      {
        id: "package",
        rules: [{ id: "alpha_grit" }, { id: "beta_structure", runner: "structure" }],
      },
    ],
    instances: [exampleInstance()],
  });
}

function distinctProjectPathStructureFixture(): Fixture {
  return {
    directories: ["packages/example/src"],
    files: {
      ".habitat/blueprints/package/blueprint.toml": `schemaVersion = 1
id = "package"
version = 1

[[rules]]
id = "distinct_roots"
lane = "enforced"
message = "Distinct roots found a violation."
remediate = "Fix the distinct roots."

[rules.runner]
name = "habitat"
mode = "structure"
structure = "distinct_roots.structure.toml"

[instance]
manifest = "habitat.toml"
anchorRoot = "project"
selections = []

[[instance.roots]]
id = "project"
required = true
kind = "directory"
`,
      ".habitat/blueprints/package/distinct_roots.structure.toml": `schemaVersion = 2

[[scopes]]
name = "project-base"
rootRole = "project"
relativePath = "base/missing.ts"
kind = "file"
mode = "open"

[[scopes]]
name = "source-base"
rootRole = "project"
relativePath = "src/base/missing.ts"
kind = "file"
mode = "open"
`,
      "packages/example/habitat.toml": `schemaVersion = 1
id = "example-package"
ownerProject = "@rawr/example"
blueprint = "package"
blueprintVersion = 1

[roots]
project = "packages/example"

[selections]
`,
    },
  };
}

function optionalUnboundStructureFixture(): Fixture {
  return {
    files: {
      ".habitat/blueprints/package/blueprint.toml": `schemaVersion = 1
id = "package"
version = 1

[[rules]]
id = "optional_structure"
lane = "enforced"
message = "optional structure"
remediate = "Bind the optional root."

[rules.runner]
name = "habitat"
mode = "structure"
structure = "optional.structure.toml"

[instance]
manifest = "habitat.toml"
anchorRoot = "project"
selections = []

[[instance.roots]]
id = "optional"
required = false
kind = "directory"

[[instance.roots]]
id = "project"
required = true
kind = "directory"
`,
      ".habitat/blueprints/package/optional.structure.toml": defaultStructureToml().replace(
        'rootRole = "project"',
        'rootRole = "optional"'
      ),
      "packages/example/habitat.toml": instanceToml(exampleInstance()),
    },
  };
}

function fileAcquisitionFixture(): Fixture {
  return {
    files: {
      ".habitat/blueprints/file-package/blueprint.toml": `schemaVersion = 1
id = "file-package"
version = 1

[[rules]]
id = "file_rule"
lane = "enforced"
message = "file_rule found a violation."
remediate = "Fix file_rule."

[rules.runner]
name = "grit"
pattern = "file_rule.md"
patternName = "file_rule"

[rules.runner.acquisition]
kind = "check"
rootRoles = []
selections = ["entry"]

[instance]
manifest = "habitat.toml"
anchorRoot = "project"

[[instance.roots]]
id = "project"
required = true
kind = "directory"

[[instance.selections]]
id = "entry"
root = "project"
kind = "file"
memberPattern = "^[a-z][a-z0-9-]*$"
pathTemplate = "{member}.ts"
`,
      ".habitat/blueprints/file-package/file_rule.md": "# file_rule\n\n```grit\nfile_rule()\n```\n",
      "packages/example/entry.ts": "export const entry = true;\n",
      "packages/example/habitat.toml": `schemaVersion = 1
id = "example-package"
ownerProject = "@rawr/example"
blueprint = "file-package"
blueprintVersion = 1

[roots]
project = "packages/example"

[selections]
entry = ["entry"]
`,
    },
  };
}

function exampleInstance(options: Partial<InstanceSpec> = {}): InstanceSpec {
  return {
    id: options.id ?? "example-package",
    ownerProject: options.ownerProject ?? "@rawr/example",
    blueprint: options.blueprint ?? "package",
    projectPath: options.projectPath ?? "packages/example",
  };
}

function blueprintToml(id: string, rules: readonly RuleSpec[]): string {
  const ruleDocuments = rules
    .map((rule) => {
      const runner =
        rule.runner === "structure"
          ? `[rules.runner]\nname = "habitat"\nmode = "structure"\nstructure = "${rule.id}.structure.toml"`
          : `[rules.runner]\nname = "grit"\npattern = "${rule.id}.md"\npatternName = "${rule.id}"\n\n[rules.runner.acquisition]\nkind = "${rule.acquisition ?? "check"}"\nrootRoles = ${JSON.stringify(rule.rootRoles ?? ["project"])}\nselections = []${rule.rootPatterns === undefined ? "" : `\nrootPatterns = [{ rootRole = "project", patterns = ${JSON.stringify(rule.rootPatterns)} }]`}`;
      return `[[rules]]\nid = "${rule.id}"\nlane = "${rule.lane ?? "enforced"}"\nmessage = "${rule.id} found a violation."\nremediate = "Fix ${rule.id}."\n\n${runner}`;
    })
    .join("\n\n");
  return `schemaVersion = 1\nid = "${id}"\nversion = 1\n\n${ruleDocuments}\n\n[instance]\nmanifest = "habitat.toml"\nanchorRoot = "project"\nselections = []\n\n[[instance.roots]]\nid = "project"\nrequired = true\nkind = "directory"\n`;
}

function instanceToml(instance: InstanceSpec): string {
  return `schemaVersion = 1\nid = "${instance.id}"\nownerProject = "${instance.ownerProject}"\nblueprint = "${instance.blueprint}"\nblueprintVersion = 1\n\n[roots]\nproject = "${instance.projectPath}"\n\n[selections]\n`;
}

function finding(path: string, message: string | null): RuleEvaluationFinding {
  return {
    path,
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 2, offset: 1 },
    message,
  };
}

function applicationKey(application: {
  readonly ruleId: string;
  readonly instanceId: string | null;
  readonly ownerProject: string;
}): string {
  return `${application.ruleId}:${application.instanceId}:${application.ownerProject}`;
}

function textOrder(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
