import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createNodes } from "../src/temporal-inquiry-nx-plugin";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("assembled temporal inquiry Nx projection", () => {
  it("reads consumer authority without executing consumer scripts", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "habitat-inquiry-app-"));
    roots.push(root);
    const definitionPath = "scripts/fluree/habitat-inquiry.json";
    const sentinel = path.join(root, "executed");
    const definition = {
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
    };
    const files: Record<string, string> = {
      [definitionPath]: `${JSON.stringify(definition, null, 2)}\n`,
      "scripts/fluree/repository.json": "{}\n",
      "scripts/fluree/model/ontology.trig": "",
      "scripts/fluree/model/rules.trig": "",
      "scripts/fluree/model/shapes.ttl": "",
      "scripts/fluree/model/config.trig": "",
      "scripts/fluree/model/facts.jsonld": "{}\n",
      "scripts/fluree/refresh.mjs": `await Bun.write(${JSON.stringify(sentinel)}, "refresh");\n`,
      "scripts/fluree/inquiry.mjs": `await Bun.write(${JSON.stringify(sentinel)}, "query");\n`,
      "post-it.md": "# Frame\n",
    };
    for (const [file, contents] of Object.entries(files)) {
      const absolute = path.join(root, file);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, contents);
    }

    const result = await createNodes[1]([definitionPath], undefined, {
      workspaceRoot: root,
      nxJsonConfiguration: {},
    });

    expect(result[0]?.[1].projects?.["scripts/fluree"]?.targets).toMatchObject({
      plan: { cache: false },
      query: { cache: false },
      refresh: { cache: false },
    });
    await expect(access(sentinel)).rejects.toThrow();
    expect(await readFile(path.join(root, definitionPath), "utf8")).toBe(files[definitionPath]);
  });
});
