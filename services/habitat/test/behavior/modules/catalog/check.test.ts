import { describe, expect, test } from "bun:test";
import { NodeServices } from "@effect/platform-node";
import type {
  RuleEvaluationFinding,
  RuleEvaluationRequest,
  RuleEvaluationResource,
} from "@habitat/resource-rule-evaluation";
import { Effect, FileSystem, Path } from "effect";
import { type Client, createClient } from "../../../../src/client";

type CheckInput = Parameters<Client["catalog"]["check"]>[0];
type Evaluation = ReturnType<RuleEvaluationResource<never>["evaluate"]>;
type EvaluationHandler = (input: RuleEvaluationRequest, index: number) => Evaluation;

type RecordingRuleEvaluation = {
  readonly calls: RuleEvaluationRequest[];
  readonly resource: RuleEvaluationResource<never>;
};

type Fixture = {
  readonly files: Readonly<Record<string, string>>;
  readonly directories?: readonly string[];
};

type RuleSpec = {
  readonly id: string;
  readonly lane?: "enforced" | "advisory";
  readonly runner?: "grit" | "structure";
  readonly acquisition?: "check" | "apply-dry-run";
  readonly patternContents?: string;
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
    const { calls, result } = await checkFixture(fixture, {}, (input) => {
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

  test("intersects owner, rule, and runner selectors before evaluation", async () => {
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
      selectors: { owner: "@rawr/beta", rule: "b_rule", runner: "grit" },
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
      selectors: { owner: "@rawr/missing", rule: "missing_rule", runner: "missing" },
    });
    expect(unknown.calls).toEqual([]);
    expect(unknown.result).toMatchObject({
      _tag: "SelectionRejected",
      issues: [
        { code: "selector-unknown", selector: "owner:@rawr/missing" },
        { code: "selector-unknown", selector: "rule:missing_rule" },
        { code: "selector-unknown", selector: "runner:missing" },
      ],
    });

    const wrongNamespace = await checkFixture(splitFixture, {
      selectors: { owner: "alpha_rule" },
    });
    expect(wrongNamespace.calls).toEqual([]);
    expect(wrongNamespace.result).toMatchObject({
      _tag: "SelectionRejected",
      issues: [
        {
          code: "selector-wrong-namespace",
          selector: "owner:alpha_rule",
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

  test("rejects the unsupported structure runner without evaluation", async () => {
    const fixture = authorityFixture({
      blueprints: [
        {
          id: "package",
          rules: [{ id: "package_structure", runner: "structure" }],
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
          selector: "example-package:package_structure",
        },
      ],
    });
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

async function checkFixture(fixture: Fixture, input: CheckInput, handler?: EvaluationHandler) {
  return withFixture(
    fixture,
    async (client, recording) => {
      const result = await client.catalog.check(input);
      return { result, calls: [...recording.calls] };
    },
    handler
  );
}

async function withFixture<T>(
  fixture: Fixture,
  use: (client: Client, recording: RecordingRuleEvaluation) => Promise<T>,
  handler: EvaluationHandler = () => Effect.succeed({ findings: [] })
): Promise<T> {
  return Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const workspaceRoot = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "habitat-check-test-",
        });
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
        const recording = makeRecordingRuleEvaluation(handler);
        const client: Client = createClient({
          deps: { fileSystem, path, ruleEvaluation: recording.resource },
          scope: { workspaceRoot },
          config: {},
        });
        return yield* Effect.promise(() => use(client, recording));
      })
    ).pipe(Effect.provide(NodeServices.layer))
  );
}

function makeRecordingRuleEvaluation(handler: EvaluationHandler): RecordingRuleEvaluation {
  const calls: RuleEvaluationRequest[] = [];
  return {
    calls,
    resource: {
      evaluate: (input) => {
        const index = calls.length;
        calls.push(input);
        return handler(input, index);
      },
    },
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
        files[`${blueprintRoot}/${rule.id}.structure.toml`] = "schemaVersion = 1\n";
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

function singleGritFixture(): Fixture {
  return authorityFixture({
    blueprints: [{ id: "package", rules: [{ id: "package_rule" }] }],
    instances: [exampleInstance()],
  });
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
