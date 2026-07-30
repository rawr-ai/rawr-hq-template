import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve, sep } from "node:path";
import {
  type ManifestValidationRoots,
  parseAndValidateManifest,
  renderReport,
} from "../../scripts/report-results";

const canonicalSpecPath =
  "docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md";
const temporaryRoots: string[] = [];
const temporaryRootPrefix = "runtime-evidence-manifest-";

interface TestManifest {
  spec: {
    path: string;
    sha256: string;
  };
  currentExperiment?: {
    id: string;
    focus: string;
    relatedEntries: string[];
  };
  entries: Array<{
    id: string;
    status: string;
    source: string;
    oracle: string;
    fixtures: string[];
    gates?: string[];
  }>;
}

function writeFixture(root: string, relativePath: string, contents = "fixture\n"): void {
  const filePath = join(root, relativePath);
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, contents);
}

function createValidManifestFixture(): {
  manifest: TestManifest;
  roots: ManifestValidationRoots;
} {
  const repoRoot = mkdtempSync(join(tmpdir(), temporaryRootPrefix));
  temporaryRoots.push(repoRoot);
  const toolRoot = join(repoRoot, "tools", "runtime-realization-type-env");
  const specContents = "# Runtime realization fixture spec\n";

  writeFixture(repoRoot, canonicalSpecPath, specContents);
  writeFixture(toolRoot, "test/oracle/example.test.ts");
  writeFixture(toolRoot, "fixtures/todo/open-design.todo.ts");

  return {
    roots: { repoRoot, toolRoot },
    manifest: {
      spec: {
        path: canonicalSpecPath,
        sha256: createHash("sha256").update(specContents).digest("hex"),
      },
      currentExperiment: {
        id: "experiment.current",
        focus: "Exercise manifest validation.",
        relatedEntries: ["simulation.example"],
      },
      entries: [
        {
          id: "simulation.example",
          status: "simulation-proof",
          source: "Fixture spec",
          oracle: "The Oracle behavior regresses when this gate fails.",
          fixtures: ["test/oracle/example.test.ts"],
          gates: ["typecheck", "oracle"],
        },
        {
          id: "open.example",
          status: "xfail",
          source: "Fixture spec",
          oracle: "The unresolved design remains fenced.",
          fixtures: ["fixtures/todo/open-design.todo.ts"],
        },
      ],
    },
  };
}

function validate(manifest: TestManifest, roots: ManifestValidationRoots) {
  return parseAndValidateManifest(JSON.stringify(manifest), roots);
}

function removeTemporaryRoot(root: string): void {
  const resolvedTempRoot = resolve(tmpdir());
  const resolvedRoot = resolve(root);
  const relativeRoot = relative(resolvedTempRoot, resolvedRoot);
  const rootStats = lstatSync(resolvedRoot);

  if (
    relativeRoot === "" ||
    relativeRoot === ".." ||
    relativeRoot.startsWith(`..${sep}`) ||
    basename(resolvedRoot).startsWith(temporaryRootPrefix) === false ||
    rootStats.isSymbolicLink() ||
    rootStats.isDirectory() === false
  ) {
    throw new Error(`refusing to remove unguarded test root: ${resolvedRoot}`);
  }

  rmSync(resolvedRoot, { recursive: true });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    removeTemporaryRoot(root);
  }
});

describe("runtime realization evidence manifest", () => {
  test("validates the manifest before preserving report output", () => {
    const { manifest, roots } = createValidManifestFixture();
    const report = renderReport(validate(manifest, roots));

    expect(report).toBe(
      [
        "runtime-realization-type-env report",
        `spec: ${canonicalSpecPath}`,
        `spec sha256: ${manifest.spec.sha256}`,
        "",
        "current experiment: experiment.current",
        "focus: Exercise manifest validation.",
        "related entries: simulation.example",
        "",
        "proof: 0",
        "vendor-proof: 0",
        "simulation-proof: 1",
        "  - simulation.example",
        "    oracle: The Oracle behavior regresses when this gate fails.",
        "    gates: typecheck, oracle",
        "xfail: 1",
        "  - open.example",
        "    oracle: The unresolved design remains fenced.",
        "todo: 0",
        "out-of-scope: 0",
        "",
        "green gate means proof, vendor-proof, and simulation-proof entries passed their named gates while open entries stayed fenced.",
        "xfail means architecture unresolved, not necessarily TypeScript failure.",
      ].join("\n")
    );
  });

  test("rejects an unknown status instead of dropping the entry from report counts", () => {
    const { manifest, roots } = createValidManifestFixture();
    manifest.entries[0].status = "green";

    expect(() => validate(manifest, roots)).toThrow("invalid proof manifest structure");
  });

  test("rejects duplicate manifest entry identities", () => {
    const { manifest, roots } = createValidManifestFixture();
    manifest.entries[1].id = manifest.entries[0].id;

    expect(() => validate(manifest, roots)).toThrow(
      "duplicate manifest entry id: simulation.example"
    );
  });

  test("rejects an unknown evidence gate before report rendering", () => {
    const { manifest, roots } = createValidManifestFixture();
    manifest.entries[0].gates = ["oracle", "invented-gate"];

    expect(() => validate(manifest, roots)).toThrow("invalid proof manifest structure");
  });

  test("rejects proof assigned only to reporting gates", () => {
    const { manifest, roots } = createValidManifestFixture();
    manifest.entries[0].status = "proof";
    manifest.entries[0].gates = ["report", "evidence-manifest"];

    expect(() => validate(manifest, roots)).toThrow(
      "manifest entry simulation.example must name at least one behavior gate"
    );
  });

  test("rejects simulation proof without a simulation behavior gate", () => {
    const { manifest, roots } = createValidManifestFixture();
    manifest.entries[0].gates = ["typecheck", "negative"];

    expect(() => validate(manifest, roots)).toThrow(
      "simulation-proof entry simulation.example must include oracle, simulate, or middle-spine"
    );
  });

  test("rejects vendor proof without a vendor behavior gate", () => {
    const { manifest, roots } = createValidManifestFixture();
    manifest.entries[0].status = "vendor-proof";
    manifest.entries[0].gates = ["typecheck", "negative"];

    expect(() => validate(manifest, roots)).toThrow(
      "vendor-proof entry simulation.example must include vendor-effect or vendor-boundaries"
    );
  });

  test("rejects a manifest entry whose fixture does not exist", () => {
    const { manifest, roots } = createValidManifestFixture();
    manifest.entries[0].fixtures = ["test/oracle/missing.test.ts"];

    expect(() => validate(manifest, roots)).toThrow(
      "manifest fixture missing: test/oracle/missing.test.ts"
    );
  });

  test("rejects proof that points at a TODO fixture", () => {
    const { manifest, roots } = createValidManifestFixture();
    manifest.entries[1].status = "proof";
    manifest.entries[1].gates = ["typecheck"];

    expect(() => validate(manifest, roots)).toThrow(
      "proof entry open.example must not point at todo fixture fixtures/todo/open-design.todo.ts"
    );
  });

  test("rejects a TODO fixture assigned outside the TODO statuses", () => {
    const { manifest, roots } = createValidManifestFixture();
    manifest.entries[1].status = "out-of-scope";

    expect(() => validate(manifest, roots)).toThrow(
      "todo fixture fixtures/todo/open-design.todo.ts must belong to xfail or todo entry, not out-of-scope"
    );
  });

  test("rejects a current experiment reference without a manifest identity", () => {
    const { manifest, roots } = createValidManifestFixture();
    manifest.currentExperiment!.relatedEntries = ["unknown.entry"];

    expect(() => validate(manifest, roots)).toThrow(
      "currentExperiment references unknown entry: unknown.entry"
    );
  });

  test("rejects a stale pinned spec hash", () => {
    const { manifest, roots } = createValidManifestFixture();
    manifest.spec.sha256 = "0".repeat(64);

    expect(() => validate(manifest, roots)).toThrow("proof manifest authority hash drifted");
  });
});
