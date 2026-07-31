import { describe, expect, test } from "bun:test";
import { NodeServices } from "@effect/platform-node";
import type {
  RuleEvaluationFinding,
  RuleEvaluationRequest,
  RuleEvaluationResource,
} from "@habitat/resource-rule-evaluation";
import {
  MAX_SOURCE_INVENTORY_ENTRIES,
  type ObserveSourceInventoryInput,
  type SourceInventoryResource,
  type SourceInventoryResult,
} from "@habitat/resource-source-inventory";
import { Effect, FileSystem, Path, PlatformError } from "effect";
import { type Client, createClient } from "../../../../src/client";

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
  readonly directories?: readonly string[];
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
  test("interprets clean, enforced, and advisory evaluations without acquiring a provider", async () => {
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
      if (input.program.includes("a_clean")) return Effect.succeed({ findings: [] });
      const ruleId = input.program.includes("b_enforced") ? "b_enforced" : "c_advisory";
      return Effect.succeed({
        findings: [finding(`${input.subjectPaths[0]}/src/${ruleId}.ts`, `${ruleId} finding`)],
      });
    });

    expect(calls.map(({ program }) => program)).toEqual([
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

  test("sorts selected applications and repeats with the same result and evaluation order", async () => {
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
      expect(recording.calls).toHaveLength(8);
      expect(recording.calls.slice(0, 4)).toEqual(recording.calls.slice(4));
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
    expect(calls[0]?.program).toBe("b_rule()");
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

    expect(calls.map(({ program }) => program)).toEqual(["a_rule()", "b_rule()"]);
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

    expect(selected.calls.map(({ program }) => program)).toEqual(["alpha_rule()", "beta_rule()"]);
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

  test("resolves the same relative pattern against distinct bound root-role bases", async () => {
    const checked = await checkFixture(distinctRootStructureFixture(), {});

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
      Effect.succeed({
        findings: [finding(`${input.subjectPaths[0]}/grit.ts`, "mixed Grit finding")],
      })
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
    const { calls, result } = await checkFixture(singleGritFixture(), {}, () =>
      Effect.succeed({ findings: [finding("/outside-habitat-check.ts", "foreign finding")] })
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
      Effect.succeed({
        findings: [finding(input.subjectPaths[0] ?? "", "exact file finding")],
      })
    );
    const sibling = await checkFixture(fixture, {}, (input) =>
      Effect.succeed({
        findings: [
          finding(
            (input.subjectPaths[0] ?? "").replace(/entry\.ts$/, "sibling.ts"),
            "sibling finding"
          ),
        ],
      })
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
  handler: EvaluationHandler = () => Effect.succeed({ findings: [] }),
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
        fixture.onWorkspaceRoot?.(workspaceRoot);
        for (const directory of [...(fixture.directories ?? [])].sort(textOrder)) {
          yield* fileSystem.makeDirectory(path.join(workspaceRoot, directory), { recursive: true });
        }
        for (const [relativePath, contents] of Object.entries(fixture.files).sort(
          ([left], [right]) => textOrder(left, right)
        )) {
          const absolutePath = path.join(workspaceRoot, relativePath);
          yield* fileSystem.makeDirectory(path.dirname(absolutePath), { recursive: true });
          yield* fileSystem.writeFileString(absolutePath, contents);
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
          config: {},
        });
        return yield* Effect.promise(() => use(client, recording));
      })
    ).pipe(Effect.provide(NodeServices.layer))
  );
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

function distinctRootStructureFixture(): Fixture {
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

[[instance.roots]]
id = "source"
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
rootRole = "source"
relativePath = "base/missing.ts"
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
source = "packages/example/src"

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
          : `[rules.runner]\nname = "grit"\npattern = "${rule.id}.md"\npatternName = "${rule.id}"\n\n[rules.runner.acquisition]\nkind = "${rule.acquisition ?? "check"}"\nrootRoles = ["project"]\nselections = []`;
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
  readonly instanceId: string;
  readonly ownerProject: string;
}): string {
  return `${application.ruleId}:${application.instanceId}:${application.ownerProject}`;
}

function textOrder(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
