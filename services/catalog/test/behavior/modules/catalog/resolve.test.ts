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

  test("resolves an exact package member, runner asset, application, and provenance", async () => {
    const reads: string[] = [];
    const result = await resolveFixture({
      ...policyPackInstanceFixture(),
      clientFileSystem: (fileSystem, path, workspaceRoot) =>
        FileSystem.makeNoop({
          ...fileSystem,
          readFileString: (candidate, encoding) => {
            reads.push(toRepositoryPath(path.relative(workspaceRoot, candidate), path.sep));
            return fileSystem.readFileString(candidate, encoding);
          },
        }),
    });

    expect(result).toMatchObject({
      _tag: "Resolved",
      catalog: {
        policyPack: {
          blueprints: [{ id: "package", version: 1, path: POLICY_PACK_BLUEPRINT_PATH }],
        },
        blueprints: [
          {
            definition: { id: "package", version: 1 },
            provenance: {
              kind: "policy-pack",
              packageName: POLICY_PACK_NAME,
              packageVersion: "1.2.3",
              packageRoot: expect.any(String),
              packageRelativePath: POLICY_PACK_BLUEPRINT_PATH,
            },
          },
        ],
        applications: [
          {
            ruleId: "package_structure",
            provenance: {
              kind: "policy-pack",
              packageName: POLICY_PACK_NAME,
              packageVersion: "1.2.3",
              packageRoot: expect.any(String),
              packageRelativePath: POLICY_PACK_BLUEPRINT_PATH,
            },
            runner: {
              structure: {
                provenance: {
                  kind: "policy-pack",
                  packageName: POLICY_PACK_NAME,
                  packageVersion: "1.2.3",
                  packageRoot: expect.any(String),
                  packageRelativePath: POLICY_PACK_STRUCTURE_PATH,
                },
                relativePath: POLICY_PACK_STRUCTURE_PATH,
                absolutePath: expect.any(String),
              },
            },
          },
        ],
      },
    });
    expect(
      reads.filter((candidate) =>
        candidate.endsWith(`${POLICY_PACK_ROOT}/${POLICY_PACK_BLUEPRINT_PATH}`)
      )
    ).toHaveLength(1);
    expect(
      reads.filter((candidate) =>
        candidate.endsWith(`${POLICY_PACK_ROOT}/${POLICY_PACK_STRUCTURE_PATH}`)
      )
    ).toHaveLength(1);
  });

  test("rejects malformed, missing, and mismatched package members without local fallback", async () => {
    const localFallback = packageInstanceFixture();
    const malformed = await resolveFixture({
      ...localFallback,
      files: {
        ...localFallback.files,
        [`${POLICY_PACK_ROOT}/${POLICY_PACK_BLUEPRINT_PATH}`]: "not = [valid",
      },
      policyPack: { manifest: policyPackManifest() },
    });
    const missing = await resolveFixture({
      ...localFallback,
      policyPack: { manifest: policyPackManifest() },
    });
    const nonFile = await resolveFixture({
      files: {},
      directories: [`${POLICY_PACK_ROOT}/${POLICY_PACK_BLUEPRINT_PATH}`],
      policyPack: { manifest: policyPackManifest() },
    });
    const missingAsset = await resolveFixture({
      ...localFallback,
      files: {
        ...localFallback.files,
        [`${POLICY_PACK_ROOT}/${POLICY_PACK_BLUEPRINT_PATH}`]: blueprintToml(),
      },
      policyPack: { manifest: policyPackManifest() },
    });
    const wrongId = await resolveFixture({
      ...policyPackInstanceFixture({ definition: blueprintToml({ id: "service" }) }),
    });
    const wrongVersion = await resolveFixture({
      ...policyPackInstanceFixture({ memberVersion: 2 }),
    });

    expect(malformed).toMatchObject({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-toml-invalid",
          path: `${POLICY_PACK_NAME}/${POLICY_PACK_BLUEPRINT_PATH}`,
        },
      ],
    });
    expect(missing).toMatchObject({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-path-missing",
          path: `${POLICY_PACK_NAME}/${POLICY_PACK_BLUEPRINT_PATH}`,
        },
      ],
    });
    expect(nonFile).toMatchObject({
      _tag: "Rejected",
      issues: [{ code: "authority-path-kind-mismatch" }],
    });
    expect(missingAsset).toMatchObject({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-path-missing",
          path: `${POLICY_PACK_NAME}/${POLICY_PACK_BLUEPRINT_PATH}#rule:package_structure`,
        },
      ],
    });
    expect(wrongId).toMatchObject({
      _tag: "Rejected",
      issues: [{ code: "authority-definition-kind-mismatch" }],
    });
    expect(wrongVersion).toMatchObject({
      _tag: "Rejected",
      issues: [{ code: "authority-version-mismatch" }],
    });
  });

  test("rejects normalized and symbolic-link escapes for package members and assets", async () => {
    const invalidPath = await resolveFixture({
      files: {},
      policyPack: {
        manifest: policyPackManifest([{ id: "package", version: 1, path: "../blueprint.toml" }]),
      },
    });
    const escapingMember = await resolveFixture({
      files: {},
      symlinks: [
        {
          path: `${POLICY_PACK_ROOT}/${POLICY_PACK_BLUEPRINT_PATH}`,
          target: "file",
          contents: blueprintToml(),
        },
      ],
      policyPack: { manifest: policyPackManifest() },
    });
    const escapingAsset = await resolveFixture({
      files: {
        [`${POLICY_PACK_ROOT}/${POLICY_PACK_BLUEPRINT_PATH}`]: blueprintToml(),
      },
      symlinks: [
        {
          path: `${POLICY_PACK_ROOT}/${POLICY_PACK_STRUCTURE_PATH}`,
          target: "file",
          contents: structureToml(),
        },
      ],
      policyPack: { manifest: policyPackManifest() },
    });

    expect(invalidPath).toMatchObject({
      _tag: "Rejected",
      issues: [expect.objectContaining({ code: "authority-path-invalid" })],
    });
    for (const result of [escapingMember, escapingAsset]) {
      expect(result).toMatchObject({
        _tag: "Rejected",
        issues: [expect.objectContaining({ code: "authority-path-escape" })],
      });
    }
  });

  test("rejects duplicate and out-of-order package members", async () => {
    for (const blueprints of [
      [
        { id: "package", version: 1, path: POLICY_PACK_BLUEPRINT_PATH },
        { id: "package", version: 1, path: "dist/blueprints/other/blueprint.toml" },
      ],
      [
        { id: "service", version: 1, path: "dist/blueprints/service/blueprint.toml" },
        { id: "package", version: 1, path: POLICY_PACK_BLUEPRINT_PATH },
      ],
    ]) {
      const result = await resolveFixture({
        files: {},
        policyPack: { manifest: policyPackManifest(blueprints) },
      });
      expect(result).toMatchObject({
        _tag: "Rejected",
        issues: [{ code: "authority-order-invalid" }],
      });
    }
  });

  test("keeps an exact redundant local definition inert with package provenance", async () => {
    const fixture = policyPackInstanceFixture();
    const result = await resolveFixture({
      ...fixture,
      files: {
        ...fixture.files,
        ".habitat/blueprints/package/blueprint.toml": blueprintToml(),
      },
    });

    expect(result._tag).toBe("Resolved");
    if (result._tag !== "Resolved") throw new Error("Expected exact redundant source to resolve.");
    expect(result.catalog.blueprints).toHaveLength(1);
    expect(result.catalog.blueprints[0]?.provenance).toMatchObject({ kind: "policy-pack" });
    expect(result.catalog.applications).toHaveLength(1);
    expect(result.catalog.applications[0]?.provenance).toMatchObject({ kind: "policy-pack" });
  });

  test("preserves local provenance for a unique repository definition and its asset", async () => {
    const fixture = policyPackInstanceFixture();
    const result = await resolveFixture({
      ...fixture,
      files: {
        ...fixture.files,
        ".habitat/blueprints/service/blueprint.toml": blueprintToml({ id: "service" }),
        ".habitat/blueprints/service/structure.toml": structureToml(),
        "services/local/habitat.toml": instanceToml({
          id: "local-service",
          ownerProject: "@rawr/local-service",
          blueprint: "service",
          project: "services/local",
        }),
        "services/local/test/contract/api.typecheck.ts": "export {};\n",
      },
      directories: [...(fixture.directories ?? []), "services/local/src"],
    });

    expect(result._tag).toBe("Resolved");
    if (result._tag !== "Resolved") throw new Error("Expected mixed package/local authority.");
    const definition = result.catalog.blueprints.find(
      ({ definition }) => definition.id === "service"
    );
    const application = result.catalog.applications.find(
      ({ ruleId }) => ruleId === "service_structure"
    );
    expect(definition?.provenance).toMatchObject({
      kind: "local",
      authorityRoot: expect.any(String),
      relativePath: ".habitat/blueprints/service/blueprint.toml",
    });
    expect(application?.provenance).toMatchObject({
      kind: "local",
      authorityRoot: expect.any(String),
      relativePath: ".habitat/blueprints/service/blueprint.toml",
    });
    expect(application?.runner).toMatchObject({
      structure: {
        provenance: {
          kind: "local",
          authorityRoot: expect.any(String),
          relativePath: ".habitat/blueprints/service/blueprint.toml",
        },
      },
    });
  });

  test("resolves coexisting legacy and successor definitions by exact instance version", async () => {
    const result = await resolveFixture({
      files: {
        ".habitat/blueprints/package/blueprint.toml": blueprintToml({
          version: 1,
          ruleId: "package_v1_structure",
        }),
        ".habitat/blueprints/package/structure.toml": structureToml(),
        ".habitat/blueprints/package/versions/2/blueprint.toml": blueprintToml({
          version: 2,
          ruleId: "package_v2_structure",
        }),
        ".habitat/blueprints/package/versions/2/structure.toml": structureToml(),
        "packages/v1/habitat.toml": instanceToml({
          id: "package-v1",
          ownerProject: "@fixture/package-v1",
          project: "packages/v1",
          blueprintVersion: 1,
        }),
        "packages/v1/test/contract/api.typecheck.ts": "export {};\n",
        "packages/v2/habitat.toml": instanceToml({
          id: "package-v2",
          ownerProject: "@fixture/package-v2",
          project: "packages/v2",
          blueprintVersion: 2,
        }),
        "packages/v2/test/contract/api.typecheck.ts": "export {};\n",
      },
      directories: ["packages/v1/src", "packages/v2/src"],
    });

    expect(result._tag).toBe("Resolved");
    if (result._tag !== "Resolved") throw new Error("Expected both blueprint versions to resolve.");
    expect(
      result.catalog.blueprints.map(({ definition, provenance }) => ({
        id: definition.id,
        version: definition.version,
        relativePath: provenance.kind === "local" ? provenance.relativePath : undefined,
      }))
    ).toEqual([
      {
        id: "package",
        version: 1,
        relativePath: ".habitat/blueprints/package/blueprint.toml",
      },
      {
        id: "package",
        version: 2,
        relativePath: ".habitat/blueprints/package/versions/2/blueprint.toml",
      },
    ]);
    expect(
      result.catalog.instances.map(({ id, blueprintVersion }) => ({ id, blueprintVersion }))
    ).toEqual([
      { id: "package-v1", blueprintVersion: 1 },
      { id: "package-v2", blueprintVersion: 2 },
    ]);
    expect(result.catalog.applications).toMatchObject([
      {
        instanceId: "package-v1",
        blueprintVersion: 1,
        ruleId: "package_v1_structure",
        provenance: { relativePath: ".habitat/blueprints/package/blueprint.toml" },
        runner: { structure: { relativePath: ".habitat/blueprints/package/structure.toml" } },
      },
      {
        instanceId: "package-v2",
        blueprintVersion: 2,
        ruleId: "package_v2_structure",
        provenance: { relativePath: ".habitat/blueprints/package/versions/2/blueprint.toml" },
        runner: {
          structure: {
            relativePath: ".habitat/blueprints/package/versions/2/structure.toml",
          },
        },
      },
    ]);
  });

  test("rejects a successor missing its own asset without borrowing from version 1", async () => {
    const result = await resolveFixture({
      files: {
        ".habitat/blueprints/package/blueprint.toml": blueprintToml({
          version: 1,
          ruleId: "package_v1_structure",
        }),
        ".habitat/blueprints/package/structure.toml": structureToml(),
        ".habitat/blueprints/package/versions/2/blueprint.toml": blueprintToml({
          version: 2,
          ruleId: "package_v2_structure",
        }),
        "packages/v2/habitat.toml": instanceToml({
          id: "package-v2",
          ownerProject: "@fixture/package-v2",
          project: "packages/v2",
          blueprintVersion: 2,
        }),
        "packages/v2/test/contract/api.typecheck.ts": "export {};\n",
      },
      directories: ["packages/v2/src"],
    });

    expect(result).toMatchObject({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-path-missing",
          path: ".habitat/blueprints/package/versions/2/blueprint.toml",
        },
      ],
    });
  });

  test("rejects non-canonical and mismatched successor blueprint locators", async () => {
    for (const locatorVersion of ["1", "02", "v2"]) {
      const definitionVersion = locatorVersion === "1" ? 1 : 2;
      const relativePath = `.habitat/blueprints/package/versions/${locatorVersion}/blueprint.toml`;
      const result = await resolveFixture({
        files: {
          [relativePath]: blueprintToml({ version: definitionVersion }),
          [`.habitat/blueprints/package/versions/${locatorVersion}/structure.toml`]:
            structureToml(),
        },
      });

      expect(result).toMatchObject({
        _tag: "Rejected",
        issues: [{ code: "authority-path-invalid", path: relativePath }],
      });
    }

    const versionMismatch = await resolveFixture({
      files: {
        ".habitat/blueprints/package/versions/2/blueprint.toml": blueprintToml({ version: 3 }),
        ".habitat/blueprints/package/versions/2/structure.toml": structureToml(),
      },
    });
    expect(versionMismatch).toMatchObject({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-version-mismatch",
          path: ".habitat/blueprints/package/versions/2/blueprint.toml",
        },
      ],
    });

    const idMismatch = await resolveFixture({
      files: {
        ".habitat/blueprints/package/versions/2/blueprint.toml": blueprintToml({
          id: "service",
          version: 2,
        }),
        ".habitat/blueprints/package/versions/2/structure.toml": structureToml(),
      },
    });
    expect(idMismatch).toMatchObject({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-definition-kind-mismatch",
          path: ".habitat/blueprints/package/versions/2/blueprint.toml",
        },
      ],
    });
  });

  test("does not constrain versions declared at the legacy top-level locator", async () => {
    const result = await resolveFixture({
      files: {
        ".habitat/blueprints/package/blueprint.toml": blueprintToml({ version: 3 }),
        ".habitat/blueprints/package/structure.toml": structureToml(),
      },
    });

    expect(result).toMatchObject({
      _tag: "Resolved",
      catalog: { blueprints: [{ definition: { id: "package", version: 3 } }] },
    });
  });

  test("rejects a conflicting local definition at a selected package identity", async () => {
    const fixture = policyPackInstanceFixture();
    const result = await resolveFixture({
      ...fixture,
      files: {
        ...fixture.files,
        ".habitat/blueprints/package/blueprint.toml": blueprintToml({
          ruleId: "conflicting_structure",
        }),
      },
    });

    expect(result).toMatchObject({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-duplicate-blueprint",
          path: ".habitat/blueprints/package/blueprint.toml",
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
        ".habitat/blueprints/package/versions/2/nested/blueprint.toml": "not = [valid",
        ".semantica/ignored/habitat.toml": "not = [valid",
        ".venv/ignored/habitat.toml": "not = [valid",
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

  test("resolves project-root bindings and selected members and rejects the wrong member kind", async () => {
    const fixture = packageInstanceFixture({ grit: true });
    const result = await resolveFixture(fixture);
    expect(result).toMatchObject({
      _tag: "Resolved",
      catalog: {
        instances: [
          {
            roots: [{ id: "project", kind: "directory", path: "packages/example" }],
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
                    source: { kind: "root-role", id: "project" },
                    path: "packages/example",
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

  test("resolves canonical root patterns without replacing root-role or selection entries", async () => {
    const fixture = packageInstanceFixture({ grit: true });
    const result = await resolveFixture({
      ...fixture,
      files: {
        ...fixture.files,
        ".habitat/blueprints/package/blueprint.toml": blueprintToml({ grit: true }).replace(
          'selections = ["contract"]',
          'selections = ["contract"]\nrootPatterns = [{ rootRole = "project", patterns = ["src/**/*.ts", "test/**/*.ts"] }]'
        ),
      },
    });

    expect(result).toMatchObject({
      _tag: "Resolved",
      catalog: {
        applications: [
          {
            runner: {
              name: "grit",
              acquisition: {
                entries: [
                  {
                    source: { kind: "root-role", id: "project" },
                    kind: "directory",
                    path: "packages/example",
                  },
                  {
                    source: { kind: "selection", id: "contract", member: "api" },
                    kind: "file",
                    path: "packages/example/test/contract/api.typecheck.ts",
                  },
                  {
                    source: { kind: "root-pattern", id: "project", pattern: "src/**/*.ts" },
                    kind: "file",
                    path: "packages/example/src/**/*.ts",
                  },
                  {
                    source: { kind: "root-pattern", id: "project", pattern: "test/**/*.ts" },
                    kind: "file",
                    path: "packages/example/test/**/*.ts",
                  },
                ],
              },
            },
          },
        ],
      },
    });
  });

  test("rejects unsafe, ambiguous, duplicate, and noncanonical root patterns", async () => {
    const fixture = packageInstanceFixture({ grit: true });
    const cases = [
      { patterns: '["../**/*.ts"]', code: "authority-path-invalid" },
      { patterns: '["/src/**/*.ts"]', code: "authority-path-invalid" },
      { patterns: '["!src/**/*.ts"]', code: "authority-path-invalid" },
      { patterns: '["src/!(generated)/**/*.ts"]', code: "authority-path-invalid" },
      { patterns: '["src/[!a].ts"]', code: "authority-path-invalid" },
      { patterns: '["src/{a,b}.ts"]', code: "authority-path-invalid" },
      { patterns: '["src/@(a|b).ts"]', code: "authority-path-invalid" },
      { patterns: '["src/+(a|b).ts"]', code: "authority-path-invalid" },
      { patterns: '["src/?.ts"]', code: "authority-path-invalid" },
      { patterns: '["src/a!.ts"]', code: "authority-path-invalid" },
      { patterns: '["src/*|b.ts"]', code: "authority-path-invalid" },
      { patterns: '["src/**.ts"]', code: "authority-path-invalid" },
      { patterns: '["src/***.ts"]', code: "authority-path-invalid" },
      { patterns: '["src/a**b.ts"]', code: "authority-path-invalid" },
      { patterns: '["src/*a*b.ts"]', code: "authority-path-invalid" },
      {
        patterns: JSON.stringify([`src/${"*a".repeat(128)}.ts`]),
        code: "authority-path-invalid",
      },
      { patterns: '["src/**/nested/**/*.ts"]', code: "authority-path-invalid" },
      { patterns: '["src/\\\\*.ts"]', code: "authority-path-invalid" },
      { patterns: '["test/**/*.ts", "src/**/*.ts"]', code: "authority-order-invalid" },
      { patterns: '["src/**/*.ts", "src/**/*.ts"]', code: "authority-schema-invalid" },
    ];

    for (const candidate of cases) {
      const result = await resolveFixture({
        ...fixture,
        files: {
          ...fixture.files,
          ".habitat/blueprints/package/blueprint.toml": blueprintToml({ grit: true }).replace(
            'selections = ["contract"]',
            `selections = ["contract"]\nrootPatterns = [{ rootRole = "project", patterns = ${candidate.patterns} }]`
          ),
        },
      });
      expect(result._tag).toBe("Rejected");
      if (result._tag === "Rejected") {
        expect(result.issues.some((issue) => issue.code === candidate.code)).toBe(true);
      }
    }
  });

  test("requires root patterns to name an already-bound directory role", async () => {
    const fixture = packageInstanceFixture({ grit: true });
    const optionalRootBlueprint = blueprintToml({ grit: true })
      .replace('rootRoles = ["project"]', "rootRoles = []")
      .replace(
        'selections = ["contract"]',
        'selections = []\nrootPatterns = [{ rootRole = "optional", patterns = ["src/**/*.ts"] }]'
      )
      .replace(
        '[[instance.roots]]\nid = "project"',
        '[[instance.roots]]\nid = "optional"\nrequired = false\nkind = "directory"\n\n[[instance.roots]]\nid = "project"'
      );
    const unbound = await resolveFixture({
      ...fixture,
      files: {
        ...fixture.files,
        ".habitat/blueprints/package/blueprint.toml": optionalRootBlueprint,
      },
    });
    expect(unbound).toMatchObject({
      _tag: "Rejected",
      issues: [
        expect.objectContaining({
          code: "authority-manifest-invalid",
          message: expect.stringContaining("requires bound root-pattern root role"),
        }),
      ],
    });

    const fileRole = await resolveFixture({
      ...fixture,
      files: {
        ...fixture.files,
        ".habitat/blueprints/package/blueprint.toml": optionalRootBlueprint.replace(
          'id = "optional"\nrequired = false\nkind = "directory"',
          'id = "optional"\nrequired = false\nkind = "file"'
        ),
      },
    });
    expect(fileRole).toMatchObject({
      _tag: "Rejected",
      issues: [
        expect.objectContaining({
          code: "authority-rule-invalid",
          message: expect.stringContaining("must resolve a directory"),
        }),
      ],
    });
  });

  test("rejects glob-significant bound paths only for root-pattern acquisition", async () => {
    const projectPath = "packages/foo(bar)";
    const files = {
      ".habitat/blueprints/package/blueprint.toml": blueprintToml({ grit: true }),
      ".habitat/blueprints/package/pattern.md": "language ts\n`forbidden()`\n",
      [`${projectPath}/habitat.toml`]: instanceToml({ project: projectPath }),
      [`${projectPath}/test/contract/api.typecheck.ts`]: "export {};\n",
    };
    const ordinary = await resolveFixture({ files, directories: [`${projectPath}/src`] });
    expect(ordinary._tag).toBe("Resolved");

    const result = await resolveFixture({
      files: {
        ...files,
        ".habitat/blueprints/package/blueprint.toml": files[
          ".habitat/blueprints/package/blueprint.toml"
        ].replace(
          'selections = ["contract"]',
          'selections = ["contract"]\nrootPatterns = [{ rootRole = "project", patterns = ["src/**/*.ts"] }]'
        ),
      },
      directories: [`${projectPath}/src`],
    });

    expect(result).toMatchObject({
      _tag: "Rejected",
      issues: [
        expect.objectContaining({
          code: "authority-path-invalid",
          path: `${projectPath}/habitat.toml`,
          message: expect.stringContaining("path containing glob-significant syntax"),
        }),
      ],
    });
  });

  test("refuses a caller-authored source root outside the blueprint vocabulary", async () => {
    const fixture = packageInstanceFixture();
    const result = await resolveFixture({
      ...fixture,
      files: {
        ...fixture.files,
        "packages/example/habitat.toml": instanceToml().replace(
          'project = "packages/example"\n',
          'project = "packages/example"\nsource = "packages/redirected"\n'
        ),
      },
    });

    expect(result).toMatchObject({
      _tag: "Rejected",
      issues: [
        expect.objectContaining({
          code: "authority-manifest-invalid",
          message: 'Unknown root role "source".',
        }),
      ],
    });
  });

  test("rejects missing Grit acquisition root-role and selection bindings", async () => {
    const base = packageInstanceFixture({ grit: true });
    const optionalRootBlueprint = blueprintToml({ grit: true })
      .replace('rootRoles = ["project"]', 'rootRoles = ["optional"]')
      .replace(
        '[[instance.roots]]\nid = "project"',
        '[[instance.roots]]\nid = "optional"\nrequired = false\nkind = "directory"\n\n[[instance.roots]]\nid = "project"'
      );
    const missingRoot = await resolveFixture({
      ...base,
      files: {
        ...base.files,
        ".habitat/blueprints/package/blueprint.toml": optionalRootBlueprint,
        "packages/example/habitat.toml": instanceToml(),
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
      files: Object.fromEntries(
        Object.entries(fixture.files).filter(
          ([candidate]) => candidate !== "packages/example/test/contract/api.typecheck.ts"
        )
      ),
      symlinks: [{ path: "packages/example/test/contract/api.typecheck.ts", target: "file" }],
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
        ".habitat/legacy/shared/rule.json": compatibilityGritRuleJson({
          id: "shared_rule",
          root: ".habitat/legacy/shared",
        }),
        ".habitat/legacy/shared/baseline.json": "[]",
        ".habitat/legacy/shared/pattern.md": "# shared_rule\n\n```grit\nshared_rule()\n```\n",
      },
      directories: ["scripts/habitat"],
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

  test("admits the repository's exact surviving version 2 compatibility corpus", async () => {
    const result = await resolveRepositoryCorpus();

    expect(result._tag).toBe("Resolved");
    if (result._tag !== "Resolved") throw new Error("Expected the repository corpus to resolve.");

    const compatibility = result.catalog.compatibility;
    expect(compatibility.ownerRoots).toEqual({
      habitat: "scripts/habitat",
      "workstream-plugin-pack": "tools/workstream-plugin-pack",
    });
    expect(compatibility.rules.map(({ ruleId, manifestPath }) => [ruleId, manifestPath])).toEqual([
      [
        "require_agent_router_placement",
        ".habitat/overlays/repository/rules/require_agent_router_placement/rule.json",
      ],
      [
        "require_agent_router_shape",
        ".habitat/blueprints/agent-router/require_agent_router_shape/rule.json",
      ],
      [
        "require_blueprint_packet_topology",
        ".habitat/blueprints/blueprint-packet/require_blueprint_packet_topology/rule.json",
      ],
      [
        "require_exported_value_declarations_have_jsdoc",
        ".habitat/overlays/repository/rules/require_exported_value_declarations_have_jsdoc/rule.json",
      ],
      [
        "require_grit_helper_comments",
        ".habitat/blueprints/grit-pattern/require_grit_helper_comments/rule.json",
      ],
      [
        "require_managed_runtime_construction_owner",
        ".habitat/overlays/repository/rules/require_managed_runtime_construction_owner/rule.json",
      ],
      [
        "require_nx_workspace_scheduler_scripts",
        ".habitat/blueprints/nx-workspace/require_nx_workspace_scheduler_scripts/rule.json",
      ],
      [
        "require_package_publication_coherence",
        ".habitat/blueprints/nx-workspace/require_package_publication_coherence/rule.json",
      ],
      [
        "require_process_runtime_access_owner",
        ".habitat/overlays/repository/rules/require_process_runtime_access_owner/rule.json",
      ],
      [
        "require_repository_script_topology",
        ".habitat/blueprints/nx-workspace/require_repository_script_topology/rule.json",
      ],
      [
        "require_sdk_server_effect_facade_source",
        ".habitat/overlays/repository/rules/require_sdk_server_effect_facade_source/rule.json",
      ],
      [
        "require_workstream_plugin_pack_hook_configuration",
        ".habitat/overlays/workstream-plugin-pack/rules/require_workstream_plugin_pack_hook_configuration/rule.json",
      ],
      [
        "require_workstream_plugin_pack_topology",
        ".habitat/overlays/workstream-plugin-pack/rules/require_workstream_plugin_pack_topology/rule.json",
      ],
    ]);

    const documentationRule = compatibility.rules.find(
      ({ ruleId }) => ruleId === "require_exported_value_declarations_have_jsdoc"
    );
    expect(documentationRule?.coveragePatterns).toEqual([
      "resources/*/contract.ts",
      "resources/*/providers/*/index.ts",
      "services/*/src/client.ts",
    ]);
    expect(documentationRule?.runner).toMatchObject({
      acquisition: { entries: [{ kind: "directory", path: "." }] },
      name: "grit",
    });

    const serverEffectFacadeRule = compatibility.rules.find(
      ({ ruleId }) => ruleId === "require_sdk_server_effect_facade_source"
    );
    expect(serverEffectFacadeRule?.coveragePatterns).toEqual([
      "packages/core/sdk/src/plugins/server/**/*.ts",
      "packages/core/runtime/definition/src/plugin.ts",
    ]);
    expect(serverEffectFacadeRule?.runner).toMatchObject({
      acquisition: { entries: [{ kind: "directory", path: "." }] },
      name: "grit",
    });
  });

  test("resolves executable version 2 Grit authority without retaining asset bytes", async () => {
    const result = await resolveFixture({
      files: {
        ".habitat/index.json": JSON.stringify({
          schemaVersion: 2,
          ownerRoots: { habitat: "scripts/habitat" },
        }),
        ".habitat/blueprints/legacy/old_rule/rule.json": compatibilityGritRuleJson({
          id: "old_rule",
          root: ".habitat/blueprints/legacy/old_rule",
          patternName: "must_survive_as_identity",
        }),
        ".habitat/blueprints/legacy/old_rule/baseline.json": "[]",
        ".habitat/blueprints/legacy/old_rule/pattern.md":
          "# old_rule\n\n```grit\nasset_bytes_must_not_survive()\n```\n",
      },
      directories: ["scripts/habitat"],
    });

    expect(result).toMatchObject({
      _tag: "Resolved",
      catalog: {
        compatibility: {
          schemaVersion: 2,
          ownerRoots: { habitat: "scripts/habitat" },
          rules: [
            {
              ruleId: "old_rule",
              ownerProject: "habitat",
              manifestPath: ".habitat/blueprints/legacy/old_rule/rule.json",
              lane: "enforced",
              coveragePatterns: ["scripts/habitat/**/*.ts"],
              baseline: {
                relativePath: ".habitat/blueprints/legacy/old_rule/baseline.json",
              },
              runner: {
                name: "grit",
                patternName: "must_survive_as_identity",
                pattern: {
                  relativePath: ".habitat/blueprints/legacy/old_rule/pattern.md",
                },
                acquisition: {
                  kind: "check",
                  entries: [{ kind: "directory", path: "scripts/habitat" }],
                },
              },
            },
          ],
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain("asset_bytes_must_not_survive");
  });

  test("resolves an index-only version 2 catalog when the blueprint prefix is absent", async () => {
    const result = await resolveFixture({
      files: {
        ".habitat/index.json": JSON.stringify({
          schemaVersion: 2,
          ownerRoots: { habitat: "scripts/habitat" },
        }),
      },
      directories: ["scripts/habitat"],
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

  test("rejects missing, malformed, and nonempty compatibility baselines", async () => {
    const files = {
      ".habitat/index.json": JSON.stringify({
        schemaVersion: 2,
        ownerRoots: { habitat: "scripts/habitat" },
      }),
      ".habitat/legacy/checked/rule.json": compatibilityGritRuleJson({
        id: "checked",
        root: ".habitat/legacy/checked",
      }),
      ".habitat/legacy/checked/pattern.md": "# checked\n\n```grit\nchecked()\n```\n",
    };
    const missing = await resolveFixture({ files, directories: ["scripts/habitat"] });
    const nonempty = await resolveFixture({
      files: {
        ...files,
        ".habitat/legacy/checked/baseline.json": JSON.stringify([{ path: "legacy.ts" }]),
      },
      directories: ["scripts/habitat"],
    });
    const malformed = await resolveFixture({
      files: {
        ...files,
        ".habitat/legacy/checked/baseline.json": "{",
      },
      directories: ["scripts/habitat"],
    });

    expect(missing).toMatchObject({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-path-missing",
          path: ".habitat/legacy/checked/baseline.json",
        },
      ],
    });
    expect(nonempty._tag).toBe("Rejected");
    if (nonempty._tag !== "Rejected") throw new Error("Expected a rejected nonempty baseline.");
    expect(nonempty.issues).not.toHaveLength(0);
    expect(
      nonempty.issues.every(
        ({ code, path }) =>
          code === "authority-schema-invalid" && path === ".habitat/legacy/checked/baseline.json"
      )
    ).toBe(true);
    expect(malformed).toMatchObject({
      _tag: "Rejected",
      issues: [
        {
          code: "authority-json-invalid",
          path: ".habitat/legacy/checked/baseline.json",
        },
      ],
    });
  });
});

async function resolveFixture(fixture: Fixture) {
  return withFixture(fixture, (client) => client.catalog.resolve({}));
}

async function resolveRepositoryCorpus() {
  return Effect.runPromise(
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const workspaceRoot = path.resolve(import.meta.dirname, "../../../../../..");
      const policyPackRoot = path.join(workspaceRoot, "packages/core/sdk");
      const client: Client = createClient({
        deps: {
          fileSystem,
          path,
          ruleEvaluation: unusedRuleEvaluation,
          sourceInventory: unusedSourceInventory,
        },
        scope: { workspaceRoot },
        config: {
          policyPack: {
            name: "@habitat-ai/sdk",
            packageJsonPath: path.join(policyPackRoot, "package.json"),
            manifestPath: path.join(policyPackRoot, "habitat-pack.json"),
          },
        },
      });
      return yield* Effect.promise(() => client.catalog.resolve({}));
    }).pipe(Effect.provide(NodeServices.layer))
  );
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
const POLICY_PACK_BLUEPRINT_PATH = "dist/blueprints/package/blueprint.toml";
const POLICY_PACK_STRUCTURE_PATH = "dist/blueprints/package/structure.toml";
const DEFAULT_POLICY_PACK_PACKAGE_JSON = JSON.stringify({
  name: POLICY_PACK_NAME,
  version: "1.2.3",
  private: false,
});
const DEFAULT_POLICY_PACK_MANIFEST = JSON.stringify({ protocolVersion: 1, blueprints: [] });

function policyPackManifest(
  blueprints: readonly {
    readonly id: string;
    readonly version: number;
    readonly path: string;
  }[] = [{ id: "package", version: 1, path: POLICY_PACK_BLUEPRINT_PATH }]
): string {
  return JSON.stringify({ protocolVersion: 1, blueprints });
}

function policyPackInstanceFixture(
  options: { readonly definition?: string; readonly memberVersion?: number } = {}
): Fixture {
  return {
    files: {
      [`${POLICY_PACK_ROOT}/${POLICY_PACK_BLUEPRINT_PATH}`]: options.definition ?? blueprintToml(),
      [`${POLICY_PACK_ROOT}/${POLICY_PACK_STRUCTURE_PATH}`]: structureToml(),
      "packages/example/habitat.toml": instanceToml(),
      "packages/example/test/contract/api.typecheck.ts": "export {};\n",
    },
    directories: ["packages/example/src"],
    policyPack: {
      manifest: policyPackManifest([
        {
          id: "package",
          version: options.memberVersion ?? 1,
          path: POLICY_PACK_BLUEPRINT_PATH,
        },
      ]),
    },
  };
}

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
  options: {
    readonly id?: string;
    readonly version?: number;
    readonly ruleId?: string;
    readonly grit?: boolean;
  } = {}
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
rootRoles = ["project"]
selections = ["contract"]`
    : `[rules.runner]
name = "habitat"
mode = "structure"
structure = "structure.toml"`;
  return `schemaVersion = 1
id = "${id}"
version = ${options.version ?? 1}

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
    readonly blueprintVersion?: number;
    readonly project?: string;
  } = {}
): string {
  const project = options.project ?? "packages/example";
  return `schemaVersion = 1
id = "${options.id ?? "example-package"}"
ownerProject = "${options.ownerProject ?? "@rawr/example"}"
blueprint = "${options.blueprint ?? "package"}"
blueprintVersion = ${options.blueprintVersion ?? 1}

[roots]
project = "${project}"

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

function compatibilityGritRuleJson(options: {
  readonly id: string;
  readonly root: string;
  readonly patternName?: string;
}): string {
  return JSON.stringify({
    schemaVersion: 2,
    id: options.id,
    title: `Require ${options.id}`,
    placement: { niche: "rawr", blueprint: "package", category: "boundary" },
    operation: { kind: "check" },
    ownerProject: "habitat",
    lane: "enforced",
    forbids: "an invalid fixture state",
    why: "The compatibility fixture must remain executable.",
    remediate: "Restore the fixture.",
    message: `${options.id} found a violation.`,
    pathCoverage: [{ kind: "exact-path", patterns: ["scripts/habitat/**/*.ts"] }],
    hookCheck: true,
    supportFiles: { baseline: `${options.root}/baseline.json` },
    runner: {
      name: "grit",
      files: { pattern: `${options.root}/pattern.md` },
      patternName: options.patternName ?? options.id,
      acquisition: { kind: "check", roots: ["scripts/habitat"] },
    },
  });
}

function toRepositoryPath(value: string, separator: string): string {
  return separator === "/" ? value : value.split(separator).join("/");
}

function textOrder(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
