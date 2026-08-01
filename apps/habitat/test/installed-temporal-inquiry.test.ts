import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
const fixturePrefix = "habitat-temporal-inquiry-installed-";
const fixtureRoots: string[] = [];
const releaseRoots = [
  "apps/habitat",
  "plugins/cli/commands/habitat",
  "resources/rule-evaluation",
  "resources/source-inventory",
  "resources/temporal-inquiry",
  "services/habitat",
  "packages/typebox-adapter",
] as const;

afterAll(() => {
  for (const root of fixtureRoots.splice(0)) removeFixture(root);
});

describe("installed temporal inquiry distribution", () => {
  it("installs, infers, remains inert, removes, and regenerates cleanly", ({ annotate }) => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), fixturePrefix)));
    fixtureRoots.push(root);
    const artifacts = path.join(root, "artifacts");
    mkdirSync(artifacts);
    const archives = releaseRoots.map((releaseRoot) => {
      const before = new Set(readdirSync(artifacts));
      run(
        "bun",
        ["pm", "pack", "--destination", artifacts, "--quiet"],
        path.join(workspaceRoot, releaseRoot)
      );
      const created = readdirSync(artifacts).filter((entry) => !before.has(entry));
      return path.join(artifacts, requireOne(created, `${releaseRoot} archive`));
    });
    const archive = requireOne(
      archives.filter((candidate) => path.basename(candidate).startsWith("habitat-cli-")),
      "@habitat/cli archive"
    );
    const archiveSha256 = createHash("sha256").update(readFileSync(archive)).digest("hex");
    annotate(`@habitat/cli@0.2.0 sha256 ${archiveSha256}`, "provenance");
    const reproducibleArtifacts = path.join(root, "reproducible-artifacts");
    mkdirSync(reproducibleArtifacts);
    run("bun", ["pm", "pack", "--destination", reproducibleArtifacts, "--quiet"], appRoot());
    const reproducedArchive = path.join(
      reproducibleArtifacts,
      requireOne(readdirSync(reproducibleArtifacts), "reproduced @habitat/cli archive")
    );
    expect(createHash("sha256").update(readFileSync(reproducedArchive)).digest("hex")).toBe(
      archiveSha256
    );

    const archiveFiles = run("tar", ["-tzf", archive], root).stdout.split("\n");
    expect(archiveFiles).toEqual(
      expect.arrayContaining([
        "package/TEMPORAL_INQUIRY_PROVENANCE.md",
        "package/dist/temporal-inquiry-nx-plugin.js",
        "package/dist/temporal-inquiry.js",
        "package/dist/fluree-process.js",
        "package/generators.json",
      ])
    );
    const provenance = run(
      "tar",
      ["-xOf", archive, "package/TEMPORAL_INQUIRY_PROVENANCE.md"],
      root
    ).stdout;
    expect(provenance).toContain("d68aad29cfc91dfe775391ca838186adfc71fc81");
    expect(provenance).toContain(
      "52c0557f7784a8b4480004df3c458e779ecb8ba3236b52a6aa631ebd03afe8d0"
    );
    for (const artifact of archives) {
      const manifest = run("tar", ["-xOf", artifact, "package/package.json"], root).stdout;
      expect(manifest).not.toContain("workspace:");
    }

    writeFixture(root, archives);
    run("bun", ["install", "--ignore-scripts"], root);
    run("bunx", ["nx", "g", "@habitat/cli:temporal-inquiry-init", "--no-interactive"], root);
    const installedNxJson = readFileSync(path.join(root, "nx.json"), "utf8");

    const project = JSON.parse(
      run("bunx", ["nx", "show", "project", "fixture-inquiry", "--json"], root).stdout
    ) as { readonly targets: Record<string, { cache?: boolean; inputs?: readonly unknown[] }> };
    expect(Object.keys(project.targets).sort()).toEqual(["check", "plan", "query", "refresh"]);
    for (const target of ["plan", "query", "refresh"] as const) {
      expect(project.targets[target]?.cache).toBe(false);
      expect(project.targets[target]?.inputs).toEqual(
        expect.arrayContaining([
          { externalDependencies: ["@habitat/cli"] },
          "{workspaceRoot}/bun.lock",
          "{workspaceRoot}/package.json",
          "{workspaceRoot}/post-it.md",
          "{workspaceRoot}/scripts/fluree/habitat-inquiry.json",
        ])
      );
    }

    run("bun", ["--eval", publicSurfaceProbe()], root);
    run("node", ["--input-type=module", "--eval", publicSurfaceProbe()], root);
    run("bunx", ["nx", "show", "projects"], root);
    run("bunx", ["nx", "graph", "--print"], root);
    run("bunx", ["nx", "run", "fixture-inquiry:check"], root);
    expect(existsSync(path.join(root, "executed"))).toBe(false);
    expect(existsSync(path.join(root, ".fluree"))).toBe(false);

    run("bunx", ["nx", "g", "@habitat/cli:temporal-inquiry-init", "--no-interactive"], root);
    expect(readFileSync(path.join(root, "nx.json"), "utf8")).toBe(installedNxJson);
    run("bunx", ["nx", "g", "@habitat/cli:temporal-inquiry-remove", "--no-interactive"], root);
    run("bunx", ["nx", "reset"], root);
    const removed = JSON.parse(
      run("bunx", ["nx", "show", "project", "fixture-inquiry", "--json"], root).stdout
    ) as { readonly targets: Record<string, unknown> };
    expect(Object.keys(removed.targets)).toEqual(["check"]);

    run("bunx", ["nx", "g", "@habitat/cli:temporal-inquiry-init", "--no-interactive"], root);
    expect(readFileSync(path.join(root, "nx.json"), "utf8")).toBe(installedNxJson);
    run("bunx", ["nx", "g", "@habitat/cli:temporal-inquiry-remove", "--no-interactive"], root);
    run("bun", ["remove", "@habitat/cli", "--ignore-scripts"], root);
    expect(readFileSync(path.join(root, "nx.json"), "utf8")).not.toContain("@habitat/cli");
    expect(existsSync(path.join(root, "node_modules/@habitat/cli"))).toBe(false);
  });
});

function writeFixture(root: string, archives: readonly string[]): void {
  const packages = archives.map((archive) => ({
    archive,
    manifest: JSON.parse(run("tar", ["-xOf", archive, "package/package.json"], root).stdout) as {
      readonly name: string;
    },
  }));
  const cli = requireOne(
    packages.filter(({ manifest }) => manifest.name === "@habitat/cli"),
    "@habitat/cli package"
  );
  for (const { archive, manifest } of packages) {
    if (manifest.name === "@habitat/cli") continue;
    const directory = path.join(root, "vendor", manifest.name.replace(/^@/u, "").replace("/", "-"));
    mkdirSync(directory, { recursive: true });
    run("tar", ["-xzf", archive, "-C", directory, "--strip-components=1"], root);
  }
  write(path.join(root, "package.json"), {
    name: "temporal-inquiry-installed-fixture",
    private: true,
    workspaces: ["vendor/*"],
    devDependencies: {
      "@habitat/cli": `file:${cli.archive}`,
      "@nx/devkit": "23.1.0",
      nx: "23.1.0",
    },
  });
  write(path.join(root, "nx.json"), {
    $schema: "./node_modules/nx/schemas/nx-schema.json",
    plugins: [],
  });
  write(path.join(root, "scripts/fluree/project.json"), {
    name: "fixture-inquiry",
    targets: { check: { executor: "nx:noop" } },
  });
  write(path.join(root, "scripts/fluree/habitat-inquiry.json"), {
    schemaVersion: 1,
    id: "fixture-inquiry",
    ownerProject: "fixture-inquiry",
    ledger: "fixture:main",
    namespace: "https://example.test/inquiry/",
    runtime: { version: "4.1.4" },
    repository: {
      definition: "scripts/fluree/repository.json",
      pins: [],
      refPolicy: { version: "fixture-v1", include: ["refs/heads/"], exclude: [] },
    },
    model: {
      ontology: "scripts/fluree/model/ontology.trig",
      rules: "scripts/fluree/model/rules.trig",
      shapes: "scripts/fluree/model/shapes.ttl",
      config: "scripts/fluree/model/config.trig",
      facts: ["scripts/fluree/model/facts.jsonld"],
    },
    adapters: { queries: "scripts/fluree" },
    frame: { path: "post-it.md" },
  });
  write(path.join(root, "scripts/fluree/repository.json"), {});
  for (const file of ["ontology.trig", "rules.trig", "shapes.ttl", "config.trig"]) {
    writeText(path.join(root, "scripts/fluree/model", file), "");
  }
  write(path.join(root, "scripts/fluree/model/facts.jsonld"), {});
  writeText(
    path.join(root, "scripts/fluree/refresh.mjs"),
    'await Bun.write("executed", "refresh");\n'
  );
  writeText(
    path.join(root, "scripts/fluree/inquiry.mjs"),
    'await Bun.write("executed", "query");\n'
  );
  writeText(path.join(root, "post-it.md"), "# Frame\n");
}

function publicSurfaceProbe(): string {
  return `
    const inquiry = await import("@habitat/cli/temporal-inquiry");
    const runtime = await import("@habitat/cli/runtime/fluree-process");
    if (inquiry.FRAME_PARSER_VERSION !== "frame-parser-v3") throw new Error("parser mismatch");
    if (typeof runtime.acquireFlureeProcess !== "function") throw new Error("runtime missing");
  `;
}

function appRoot(): string {
  return path.join(workspaceRoot, "apps/habitat");
}

function write(file: string, value: unknown): void {
  writeText(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(file: string, contents: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

function run(command: string, args: readonly string[], cwd: string) {
  const result = spawnSync(command, [...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "1", NO_COLOR: "1" },
    maxBuffer: 20 * 1024 * 1024,
  });
  expect(result.status, `${command} ${args.join(" ")}\n${result.stderr}`).toBe(0);
  return { stderr: result.stderr, stdout: result.stdout };
}

function requireOne<Value>(values: readonly Value[], label: string): Value {
  if (values.length !== 1 || values[0] === undefined) {
    throw new Error(`Expected one ${label}; received ${values.length}.`);
  }
  return values[0];
}

function removeFixture(root: string): void {
  const realRoot = realpathSync(root);
  const info = lstatSync(realRoot);
  if (
    !info.isDirectory() ||
    info.isSymbolicLink() ||
    path.dirname(realRoot) !== realpathSync(tmpdir()) ||
    !path.basename(realRoot).startsWith(fixturePrefix)
  ) {
    throw new Error(`Refusing to remove unexpected fixture ${root}.`);
  }
  rmSync(realRoot, { recursive: true, force: false });
}
