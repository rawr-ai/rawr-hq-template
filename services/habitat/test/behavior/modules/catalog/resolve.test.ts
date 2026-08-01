import { describe, expect, test } from "bun:test";
import { NodeServices } from "@effect/platform-node";
import type { RuleEvaluationResource } from "@habitat-ai/resource-rule-evaluation";
import type { SourceInventoryResource } from "@habitat-ai/resource-source-inventory";
import { Effect, FileSystem, Path, PlatformError } from "effect";
import { type Client, createClient } from "../../../../src/client";

const unusedRuleEvaluation: RuleEvaluationResource<never> = {
  evaluate: () => Effect.die(new Error("Catalog resolution must not evaluate rules.")),
};

const unusedSourceInventory: SourceInventoryResource<never> = {
  observe: () => Effect.die(new Error("Catalog resolution must not observe source inventory.")),
};

type Fixture = {
  readonly files: Readonly<Record<string, string>>;
  readonly policyPack?: {
    readonly expectedName?: string;
    readonly packageJsonPath?: string;
    readonly packageJson?: string | null;
    readonly manifestPath?: string;
    readonly manifest?: string | null;
  };
  readonly directories?: readonly string[];
  readonly symlinks?: readonly {
    readonly path: string;
    readonly target: "directory" | "file";
    readonly contents?: string;
  }[];
  readonly clientFileSystem?: (
    fileSystem: FileSystem.FileSystem,
    path: Path.Path,
    workspaceRoot: string
  ) => FileSystem.FileSystem;
};

describe("Habitat catalog resolve", () => {
  test("admits an exact empty selected policy pack", async () => {
    const result = await resolveFixture({ files: {} });

    expect(result).toEqual({
      _tag: "Resolved",
      catalog: {
        schemaVersion: 3,
        policyPack: {
          name: POLICY_PACK_NAME,
          version: "1.2.3",
          protocolVersion: 1,
          blueprints: [],
        },
        blueprints: [],
        instances: [],
        applications: [],
        compatibility: { schemaVersion: 2, ownerRoots: {}, rules: [] },
      },
    });
  });

  test("rejects malformed selected policy-pack JSON", async () => {
    const result = await resolveFixture({ files: {}, policyPack: { manifest: "{" } });

    expect(result).toMatchObject({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-json-invalid",
          path: `${POLICY_PACK_NAME}/habitat-pack.json`,
        },
      ],
    });
  });

  test("rejects missing selected policy-pack files", async () => {
    for (const policyPack of [{ packageJson: null }, { manifest: null }] as const) {
      const result = await resolveFixture({ files: {}, policyPack });
      expect(result).toMatchObject({
        _tag: "Rejected",
        issues: [{ code: "authority-path-missing" }],
      });
    }
  });

  test("rejects relative and nonsibling selected policy-pack locators before reading", async () => {
    for (const [policyPack, issueCount] of [
      [
        {
          packageJsonPath: "relative/package.json",
          manifestPath: "relative/habitat-pack.json",
        },
        2,
      ],
      [{ manifestPath: "/other/habitat-pack.json" }, 1],
    ] as const) {
      const result = await resolveFixture({ files: {}, policyPack });
      expect(result._tag).toBe("Rejected");
      if (result._tag !== "Rejected") throw new Error("Expected rejected policy-pack locators.");
      expect(result.issues).toHaveLength(issueCount);
      expect(result.issues.every(({ code }) => code === "authority-path-invalid")).toBe(true);
    }
  });

  test("rejects wrong protocol and additional manifest fields", async () => {
    for (const manifest of [
      { protocolVersion: 2, blueprints: [] },
      { protocolVersion: 1, blueprints: [], unexpected: true },
    ]) {
      const result = await resolveFixture({
        files: {},
        policyPack: { manifest: JSON.stringify(manifest) },
      });
      expect(result).toMatchObject({
        _tag: "Rejected",
        issues: [
          {
            code: "authority-schema-invalid",
            path: `${POLICY_PACK_NAME}/habitat-pack.json`,
          },
        ],
      });
    }
  });

  test("rejects a selected package-name mismatch", async () => {
    const result = await resolveFixture({
      files: {},
      policyPack: { expectedName: "@fixture/other-blueprints" },
    });

    expect(result).toMatchObject({
      _tag: "Rejected",
      issues: [{ code: "authority-package-name-mismatch" }],
    });
  });

  test("rejects nonempty policy-pack membership explicitly", async () => {
    const result = await resolveFixture({
      files: {},
      policyPack: {
        manifest: JSON.stringify({
          protocolVersion: 1,
          blueprints: [{ id: "package", version: 1, path: "blueprints/package/blueprint.toml" }],
        }),
      },
    });

    expect(result).toEqual({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-policy-pack-members-unsupported",
          path: `${POLICY_PACK_NAME}/habitat-pack.json`,
          message: "Policy-pack blueprint members are not admitted by this service version.",
        },
      ],
    });
  });

  test("self-enumerates exact authority, excludes generated roots, and reads each source once", async () => {
    const reads = new Map<string, number>();
    const fixture = packageInstanceFixture();
    const result = await resolveFixture({
      ...fixture,
      files: {
        ...fixture.files,
        ".habitat/blueprints/package/nested/blueprint.toml": "not = [valid",
        "dist/ignored/habitat.toml": "not = [valid",
        "generated/ignored/habitat.toml": "not = [valid",
        "vendor/ignored/habitat.toml": "not = [valid",
      },
      clientFileSystem: (fileSystem, path, workspaceRoot) =>
        FileSystem.makeNoop({
          ...fileSystem,
          readFileString: (candidate, encoding) => {
            const relativePath = toRepositoryPath(
              path.relative(workspaceRoot, candidate),
              path.sep
            );
            reads.set(relativePath, (reads.get(relativePath) ?? 0) + 1);
            return fileSystem.readFileString(candidate, encoding);
          },
        }),
    });

    expect(result._tag).toBe("Resolved");
    expect(reads.size).toBe(4);
    expect([...reads.values()]).toEqual([1, 1, 1, 1]);
    expect(
      [...reads.keys()]
        .map((candidate) => toRepositoryPath(candidate, "/"))
        .sort(textOrder)
        .map((candidate) =>
          candidate.endsWith(".habitat/blueprints/package/blueprint.toml")
            ? ".habitat/blueprints/package/blueprint.toml"
            : candidate.endsWith("packages/example/habitat.toml")
              ? "packages/example/habitat.toml"
              : candidate
        )
        .sort(textOrder)
    ).toEqual([
      ".habitat/blueprints/package/blueprint.toml",
      ".test-policy-pack/habitat-pack.json",
      ".test-policy-pack/package.json",
      "packages/example/habitat.toml",
    ]);
  });

  test("rejects a blueprint whose id disagrees with its authority directory", async () => {
    const result = await resolveFixture({
      files: {
        ".habitat/blueprints/package/blueprint.toml": blueprintToml({ id: "service" }),
        ".habitat/blueprints/package/structure.toml": structureToml(),
      },
    });

    expect(result).toMatchObject({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-definition-kind-mismatch",
          path: ".habitat/blueprints/package/blueprint.toml",
        },
      ],
    });
  });

  test("keeps the empty request closed", async () => {
    await expect(
      withFixture({ files: {} }, (client) =>
        Reflect.apply(client.catalog.resolve, client.catalog, [{ visiblePaths: [] }])
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("discovers exact-basename manifests in hidden directories without following external links", async () => {
    const result = await resolveFixture({
      files: {
        ".habitat/blueprints/package/blueprint.toml": blueprintToml(),
        ".habitat/blueprints/package/structure.toml": structureToml(),
        ".hidden/habitat.toml": instanceToml({
          id: "hidden-package",
          ownerProject: "@rawr/hidden",
          project: ".hidden",
        }),
        ".hidden/test/contract/api.typecheck.ts": "export {};\n",
      },
      directories: [".hidden/src"],
      symlinks: [{ path: ".external", target: "directory", contents: "=" }],
    });

    expect(result).toMatchObject({
      _tag: "Resolved",
      catalog: {
        instances: [
          {
            id: "hidden-package",
            manifestPath: ".hidden/habitat.toml",
          },
        ],
      },
    });
  });

  test("resolves blueprint-only authority with exact empty compatibility", async () => {
    const result = await resolveFixture({
      files: {
        ".habitat/blueprints/package/blueprint.toml": blueprintToml(),
        ".habitat/blueprints/package/structure.toml": structureToml(),
      },
    });

    expect(result).toMatchObject({
      _tag: "Resolved",
      catalog: {
        schemaVersion: 3,
        instances: [],
        applications: [],
        compatibility: { schemaVersion: 2, ownerRoots: {}, rules: [] },
      },
    });
  });

  test("retains ownerProject on every resolved application", async () => {
    const result = await resolveFixture(packageInstanceFixture());

    expect(result).toMatchObject({
      _tag: "Resolved",
      catalog: {
        instances: [{ id: "example-package", ownerProject: "@rawr/example" }],
        applications: [
          {
            ownerProject: "@rawr/example",
            instanceId: "example-package",
            blueprint: "package",
            blueprintVersion: 1,
            ruleId: "package_structure",
          },
        ],
      },
    });
  });

  test("resolves root bindings and selected members and rejects the wrong member kind", async () => {
    const fixture = packageInstanceFixture({ grit: true });
    const result = await resolveFixture(fixture);
    expect(result).toMatchObject({
      _tag: "Resolved",
      catalog: {
        instances: [
          {
            roots: [
              { id: "project", kind: "directory", path: "packages/example" },
              { id: "source", kind: "directory", path: "packages/example/src" },
            ],
            selections: [
              {
                id: "contract",
                members: [
                  {
                    id: "api",
                    kind: "file",
                    path: "packages/example/test/contract/api.typecheck.ts",
                  },
                ],
              },
            ],
          },
        ],
        applications: [
          {
            runner: {
              name: "grit",
              acquisition: {
                entries: [
                  {
                    source: { kind: "root-role", id: "source" },
                    path: "packages/example/src",
                  },
                  {
                    source: { kind: "selection", id: "contract", member: "api" },
                    path: "packages/example/test/contract/api.typecheck.ts",
                  },
                ],
              },
            },
          },
        ],
      },
    });

    const wrongKind = await resolveFixture({
      ...fixture,
      files: Object.fromEntries(
        Object.entries(fixture.files).filter(
          ([candidate]) => candidate !== "packages/example/test/contract/api.typecheck.ts"
        )
      ),
      directories: [
        ...(fixture.directories ?? []),
        "packages/example/test/contract/api.typecheck.ts",
      ],
    });
    expect(wrongKind).toMatchObject({
      _tag: "Rejected",
      issues: [expect.objectContaining({ code: "authority-path-kind-mismatch" })],
    });
  });

  test("rejects missing Grit acquisition root-role and selection bindings", async () => {
    const base = packageInstanceFixture({ grit: true });
    const optionalSourceBlueprint = blueprintToml({ grit: true }).replace(
      'id = "source"\nrequired = true',
      'id = "source"\nrequired = false'
    );
    const missingRoot = await resolveFixture({
      ...base,
      files: {
        ...base.files,
        ".habitat/blueprints/package/blueprint.toml": optionalSourceBlueprint,
        "packages/example/habitat.toml": instanceToml().replace(
          'source = "packages/example/src"\n',
          ""
        ),
      },
    });
    expect(missingRoot).toMatchObject({
      _tag: "Rejected",
      issues: [
        expect.objectContaining({
          code: "authority-manifest-invalid",
          message: expect.stringContaining("requires bound acquisition root role"),
        }),
      ],
    });

    const missingSelection = await resolveFixture({
      ...base,
      files: {
        ...base.files,
        "packages/example/habitat.toml": instanceToml().replace('contract = ["api"]\n', ""),
      },
    });
    expect(missingSelection).toMatchObject({
      _tag: "Rejected",
      issues: [
        expect.objectContaining({
          code: "authority-manifest-invalid",
          message: expect.stringContaining("requires bound acquisition selection"),
        }),
      ],
    });
  });

  test("rejects malformed TOML and JSON deterministically", async () => {
    const result = await resolveFixture({
      files: {
        ".habitat/blueprints/broken/blueprint.toml": "=",
        ".habitat/index.json": "{",
      },
    });

    expect(result).toEqual({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-toml-invalid",
          path: ".habitat/blueprints/broken/blueprint.toml",
          message: "Blueprint authority is not valid TOML.",
        },
        {
          code: "authority-json-invalid",
          path: ".habitat/index.json",
          message: "Compatibility index is not valid JSON.",
        },
      ],
    });
  });

  test("rejects unknown version 3 document properties", async () => {
    const result = await resolveFixture({
      files: {
        ".habitat/blueprints/package/blueprint.toml": blueprintToml().replace(
          "version = 1",
          "version = 1\nunknownProperty = true"
        ),
        ".habitat/blueprints/package/structure.toml": structureToml(),
      },
    });

    expect(result).toMatchObject({
      _tag: "Rejected",
      issues: [expect.objectContaining({ code: "authority-schema-invalid" })],
    });
  });

  test("rejects authority documents that escape through symbolic links before reading", async () => {
    const reads = new Map<string, number>();
    const result = await resolveFixture({
      files: {
        ".habitat/blueprints/package/structure.toml": structureToml(),
      },
      symlinks: [
        {
          path: ".habitat/blueprints/package/blueprint.toml",
          target: "file",
          contents: blueprintToml(),
        },
      ],
      clientFileSystem: (fileSystem, path, workspaceRoot) =>
        FileSystem.makeNoop({
          ...fileSystem,
          readFileString: (candidate, encoding) => {
            const relativePath = toRepositoryPath(
              path.relative(workspaceRoot, candidate),
              path.sep
            );
            reads.set(relativePath, (reads.get(relativePath) ?? 0) + 1);
            return fileSystem.readFileString(candidate, encoding);
          },
        }),
    });

    expect(result).toMatchObject({
      _tag: "Rejected",
      issues: [expect.objectContaining({ code: "authority-path-escape" })],
    });
    expect(
      [...reads.keys()].filter((candidate) => !candidate.startsWith(POLICY_PACK_ROOT))
    ).toEqual([]);
  });

  test("rejects referenced repository paths that escape through symbolic links", async () => {
    const fixture = packageInstanceFixture();
    const result = await resolveFixture({
      ...fixture,
      directories: [],
      symlinks: [{ path: "packages/example/src", target: "directory" }],
    });

    expect(result).toMatchObject({
      _tag: "Rejected",
      issues: [expect.objectContaining({ code: "authority-path-escape" })],
    });
  });

  test("maps non-NotFound platform failures to a filesystem diagnostic", async () => {
    const result = await resolveFixture({
      files: {},
      clientFileSystem: (fileSystem) =>
        FileSystem.makeNoop({
          ...fileSystem,
          glob: () =>
            Effect.fail(
              PlatformError.systemError({
                _tag: "PermissionDenied",
                module: "FileSystem",
                method: "glob",
              })
            ),
        }),
    });

    expect(result._tag).toBe("Rejected");
    if (result._tag === "Rejected") {
      expect(result.issues).not.toHaveLength(0);
      expect(result.issues.every(({ code }) => code === "authority-filesystem-failed")).toBe(true);
    }
  });

  test("rejects a deterministic version 3 and version 2 rule identity collision", async () => {
    const fixture: Fixture = {
      files: {
        ".habitat/blueprints/package/blueprint.toml": blueprintToml({
          ruleId: "shared_rule",
        }),
        ".habitat/blueprints/package/structure.toml": structureToml(),
        ".habitat/index.json": JSON.stringify({
          schemaVersion: 2,
          ownerRoots: { habitat: "scripts/habitat" },
        }),
        ".habitat/legacy/shared/rule.json": JSON.stringify({
          schemaVersion: 2,
          id: "shared_rule",
          ownerProject: "habitat",
        }),
      },
    };

    const first = await resolveFixture(fixture);
    const second = await resolveFixture(fixture);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-duplicate-rule",
          path: ".habitat/blueprints/package/blueprint.toml",
        },
      ],
    });
  });

  test("caps stable issues at 100 after sorting", async () => {
    const files = Object.fromEntries(
      Array.from({ length: 105 }, (_, index) => [
        `.habitat/blueprints/k${String(index).padStart(3, "0")}/blueprint.toml`,
        "=",
      ])
    );
    const result = await resolveFixture({ files });

    expect(result._tag).toBe("Rejected");
    if (result._tag === "Rejected") {
      expect(result.issues).toHaveLength(100);
      expect(result.issues[0]?.path).toBe(".habitat/blueprints/k000/blueprint.toml");
      expect(result.issues[99]?.path).toBe(".habitat/blueprints/k099/blueprint.toml");
    }
  });

  test("returns blueprints, instances, and applications in deterministic order", async () => {
    const result = await resolveFixture({
      files: {
        ".habitat/blueprints/service/structure.toml": structureToml(),
        "services/zeta/habitat.toml": instanceToml({
          id: "zeta",
          ownerProject: "@rawr/zeta",
          blueprint: "service",
          project: "services/zeta",
        }),
        ".habitat/blueprints/package/blueprint.toml": blueprintToml({ ruleId: "z_rule" }),
        ".habitat/blueprints/service/blueprint.toml": blueprintToml({
          id: "service",
          ruleId: "a_rule",
        }),
        "packages/alpha/habitat.toml": instanceToml({
          id: "alpha",
          ownerProject: "@rawr/alpha",
          project: "packages/alpha",
        }),
        "packages/alpha/test/contract/api.typecheck.ts": "export {};\n",
        "services/zeta/test/contract/api.typecheck.ts": "export {};\n",
        ".habitat/blueprints/package/structure.toml": structureToml(),
      },
      directories: ["packages/alpha", "packages/alpha/src", "services/zeta", "services/zeta/src"],
    });

    expect(result._tag).toBe("Resolved");
    if (result._tag === "Resolved") {
      expect(result.catalog.blueprints.map(({ definition }) => definition.id)).toEqual([
        "package",
        "service",
      ]);
      expect(result.catalog.instances.map(({ id }) => id)).toEqual(["alpha", "zeta"]);
      expect(result.catalog.applications.map(({ ruleId }) => ruleId)).toEqual(["a_rule", "z_rule"]);
    }
  });

  test("validates and summarizes present v2 authority without retaining its runner model", async () => {
    const result = await resolveFixture({
      files: {
        ".habitat/index.json": JSON.stringify({
          schemaVersion: 2,
          ownerRoots: { habitat: "scripts/habitat" },
        }),
        ".habitat/blueprints/legacy/old_rule/rule.json": JSON.stringify({
          schemaVersion: 2,
          id: "old_rule",
          ownerProject: "habitat",
          runner: { name: "grit", patternName: "must_not_survive" },
          lane: "enforced",
        }),
      },
    });

    expect(result).toMatchObject({
      _tag: "Resolved",
      catalog: {
        compatibility: {
          schemaVersion: 2,
          ownerRoots: { habitat: "scripts/habitat" },
          rules: [
            {
              id: "old_rule",
              ownerProject: "habitat",
              manifestPath: ".habitat/blueprints/legacy/old_rule/rule.json",
            },
          ],
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain("must_not_survive");
  });

  test("resolves an index-only version 2 catalog when the blueprint prefix is absent", async () => {
    const result = await resolveFixture({
      files: {
        ".habitat/index.json": JSON.stringify({
          schemaVersion: 2,
          ownerRoots: { habitat: "scripts/habitat" },
        }),
      },
    });

    expect(result).toMatchObject({
      _tag: "Resolved",
      catalog: {
        blueprints: [],
        instances: [],
        applications: [],
        compatibility: {
          schemaVersion: 2,
          ownerRoots: { habitat: "scripts/habitat" },
          rules: [],
        },
      },
    });
  });

  test("leaves orphan version 2 rules inactive and unread when no index is present", async () => {
    const reads: string[] = [];
    const orphan = await resolveFixture({
      files: { ".habitat/orphan/rule.json": "{" },
      clientFileSystem: (fileSystem) =>
        FileSystem.makeNoop({
          ...fileSystem,
          readFileString: (candidate, encoding) => {
            reads.push(candidate);
            return fileSystem.readFileString(candidate, encoding);
          },
        }),
    });
    const empty = await resolveFixture({ files: {} });

    expect(orphan).toEqual(empty);
    expect(orphan).toMatchObject({
      _tag: "Resolved",
      catalog: {
        compatibility: { schemaVersion: 2, ownerRoots: {}, rules: [] },
      },
    });
    expect(reads.filter((candidate) => !candidate.includes(`/${POLICY_PACK_ROOT}/`))).toEqual([]);
  });
});

async function resolveFixture(fixture: Fixture) {
  return withFixture(fixture, (client) => client.catalog.resolve({}));
}

async function withFixture<T>(fixture: Fixture, use: (client: Client) => Promise<T>): Promise<T> {
  return Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const workspaceRoot = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "habitat-catalog-test-",
        });
        const fixtureFiles: Record<string, string> = { ...fixture.files };
        const packageJson = fixture.policyPack?.packageJson;
        const manifest = fixture.policyPack?.manifest;
        if (packageJson !== null) {
          fixtureFiles[`${POLICY_PACK_ROOT}/package.json`] =
            packageJson ?? DEFAULT_POLICY_PACK_PACKAGE_JSON;
        }
        if (manifest !== null) {
          fixtureFiles[`${POLICY_PACK_ROOT}/habitat-pack.json`] =
            manifest ?? DEFAULT_POLICY_PACK_MANIFEST;
        }
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
          const outsideRoot = yield* fileSystem.makeTempDirectoryScoped({
            prefix: "habitat-catalog-outside-",
          });
          const target = path.join(outsideRoot, `target-${index}`);
          if (symlink.target === "directory") {
            yield* fileSystem.makeDirectory(target, { recursive: true });
            if (symlink.contents !== undefined) {
              yield* fileSystem.writeFileString(
                path.join(target, "habitat.toml"),
                symlink.contents
              );
            }
          } else {
            yield* fileSystem.writeFileString(target, symlink.contents ?? "");
          }
          const link = path.join(workspaceRoot, symlink.path);
          yield* fileSystem.makeDirectory(path.dirname(link), { recursive: true });
          yield* fileSystem.symlink(target, link);
        }
        const clientFileSystem =
          fixture.clientFileSystem?.(fileSystem, path, workspaceRoot) ?? fileSystem;
        const client: Client = createClient({
          deps: {
            fileSystem: clientFileSystem,
            path,
            ruleEvaluation: unusedRuleEvaluation,
            sourceInventory: unusedSourceInventory,
          },
          scope: { workspaceRoot },
          config: {
            policyPack: {
              name: fixture.policyPack?.expectedName ?? POLICY_PACK_NAME,
              packageJsonPath:
                fixture.policyPack?.packageJsonPath ??
                path.join(workspaceRoot, POLICY_PACK_ROOT, "package.json"),
              manifestPath:
                fixture.policyPack?.manifestPath ??
                path.join(workspaceRoot, POLICY_PACK_ROOT, "habitat-pack.json"),
            },
          },
        });
        return yield* Effect.promise(() => use(client));
      })
    ).pipe(Effect.provide(NodeServices.layer))
  );
}

const POLICY_PACK_NAME = "@fixture/habitat-blueprints";
const POLICY_PACK_ROOT = ".test-policy-pack";
const DEFAULT_POLICY_PACK_PACKAGE_JSON = JSON.stringify({
  name: POLICY_PACK_NAME,
  version: "1.2.3",
  private: false,
});
const DEFAULT_POLICY_PACK_MANIFEST = JSON.stringify({ protocolVersion: 1, blueprints: [] });

function packageInstanceFixture(options: { readonly grit?: boolean } = {}): Fixture {
  const asset = options.grit ? "pattern.md" : "structure.toml";
  return {
    files: {
      ".habitat/blueprints/package/blueprint.toml": options.grit
        ? blueprintToml({ grit: true })
        : blueprintToml(),
      [`.habitat/blueprints/package/${asset}`]: options.grit
        ? "language ts\n`forbidden()`\n"
        : structureToml(),
      "packages/example/habitat.toml": instanceToml(),
      "packages/example/test/contract/api.typecheck.ts": "export {};\n",
    },
    directories: ["packages/example/src"],
  };
}

function blueprintToml(
  options: { readonly id?: string; readonly ruleId?: string; readonly grit?: boolean } = {}
): string {
  const id = options.id ?? "package";
  const ruleId = options.ruleId ?? `${id}_structure`;
  const runner = options.grit
    ? `[rules.runner]
name = "grit"
pattern = "pattern.md"
patternName = "${ruleId}"

[rules.runner.acquisition]
kind = "check"
rootRoles = ["source"]
selections = ["contract"]`
    : `[rules.runner]
name = "habitat"
mode = "structure"
structure = "structure.toml"`;
  return `schemaVersion = 1
id = "${id}"
version = 1

[[rules]]
id = "${ruleId}"
lane = "enforced"
message = "Structure is invalid."
remediate = "Restore the declared structure."

${runner}

[instance]
manifest = "habitat.toml"
anchorRoot = "project"

[[instance.roots]]
id = "project"
required = true
kind = "directory"

[[instance.roots]]
id = "source"
required = true
kind = "directory"

[[instance.selections]]
id = "contract"
root = "project"
kind = "file"
memberPattern = "^[a-z][a-z0-9-]*$"
pathTemplate = "test/contract/{member}.typecheck.ts"
`;
}

function instanceToml(
  options: {
    readonly id?: string;
    readonly ownerProject?: string;
    readonly blueprint?: string;
    readonly project?: string;
  } = {}
): string {
  const project = options.project ?? "packages/example";
  return `schemaVersion = 1
id = "${options.id ?? "example-package"}"
ownerProject = "${options.ownerProject ?? "@rawr/example"}"
blueprint = "${options.blueprint ?? "package"}"
blueprintVersion = 1

[roots]
project = "${project}"
source = "${project}/src"

[selections]
contract = ["api"]
`;
}

function structureToml(): string {
  return `schemaVersion = 1

[[scopes]]
name = "source"
root = "."
kind = "directory"
mode = "open"
`;
}

function toRepositoryPath(value: string, separator: string): string {
  return separator === "/" ? value : value.split(separator).join("/");
}

function textOrder(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
