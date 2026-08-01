import type { CreateNodesFunction, CreateNodesResultArray } from "@nx/devkit";
import { describe, expect, it, vi } from "vitest";

import { createTemporalInquiryNxPlugin, type TemporalInquiryNxBinding } from "../src";

const runtimeInputs: TemporalInquiryNxBinding["runtimeInputs"] = [
  { externalDependencies: ["@habitat/cli"] },
  "{workspaceRoot}/bun.lock",
  "{workspaceRoot}/package.json",
];

function handler(
  loadDefinition: TemporalInquiryNxBinding["loadDefinition"]
): CreateNodesFunction<undefined> {
  const plugin = createTemporalInquiryNxPlugin({ loadDefinition, runtimeInputs });
  expect("name" in plugin).toBe(false);
  expect(plugin.createNodes[0]).toBe("**/habitat-inquiry.json");
  return plugin.createNodes[1];
}

function projects(result: CreateNodesResultArray) {
  return Object.fromEntries(
    result.flatMap(([, projected]) => Object.entries(projected.projects ?? {}))
  );
}

describe("temporal inquiry Nx projection", () => {
  it("projects only explicit foreground consumer targets", async () => {
    const loadDefinition = vi.fn(async () => ({
      ownerProject: "fluree-inquiry",
      inputs: [
        { kind: "file" as const, path: "post-it.md" },
        { kind: "directory" as const, path: "scripts/fluree/examples" },
      ],
      queryRoot: "scripts/fluree",
    }));
    const createNodes = handler(loadDefinition);

    const result = await createNodes(["scripts/fluree/habitat-inquiry.json"], undefined, {
      workspaceRoot: "/workspace",
      nxJsonConfiguration: {},
    });

    expect(loadDefinition).toHaveBeenCalledWith(
      "/workspace",
      "scripts/fluree/habitat-inquiry.json"
    );
    expect(result.map(([source]) => source)).toEqual(["scripts/fluree/habitat-inquiry.json"]);
    const project = projects(result)["scripts/fluree"];
    expect(project?.name).toBeUndefined();
    expect(Object.keys(project?.targets ?? {})).toEqual(["plan", "query", "refresh"]);
    expect(project?.targets?.plan).toEqual({
      command: 'bun "scripts/fluree/refresh.mjs" --plan',
      cache: false,
      inputs: [
        ...runtimeInputs,
        "{workspaceRoot}/post-it.md",
        "{workspaceRoot}/scripts/fluree/examples",
        "{workspaceRoot}/scripts/fluree/examples/**/*",
        "{workspaceRoot}/scripts/fluree/habitat-inquiry.json",
        "{workspaceRoot}/scripts/fluree/inquiry.mjs",
        "{workspaceRoot}/scripts/fluree/refresh.mjs",
      ],
      metadata: { description: "Plan fluree-inquiry's temporal inquiry" },
      options: { cwd: "{workspaceRoot}" },
      outputs: [],
    });
    expect(project?.targets?.query).toMatchObject({
      command: 'bun "scripts/fluree/inquiry.mjs"',
      cache: false,
      outputs: [],
    });
    expect(project?.targets?.refresh).toMatchObject({
      command: 'bun "scripts/fluree/refresh.mjs"',
      cache: false,
      outputs: [],
    });
    for (const target of Object.values(project?.targets ?? {})) {
      expect(target.dependsOn).toBeUndefined();
      expect(target.executor).toBeUndefined();
    }
  });

  it("sorts definitions and refuses paths outside the workspace", async () => {
    const loadDefinition = vi.fn(async (_root: string, definitionPath: string) => ({
      ownerProject: definitionPath.includes("a/") ? "a" : "b",
      inputs: [],
      queryRoot: definitionPath.includes("a/") ? "a" : "b",
    }));
    const createNodes = handler(loadDefinition);

    const result = await createNodes(
      ["b/habitat-inquiry.json", "a/habitat-inquiry.json", "a/habitat-inquiry.json"],
      undefined,
      { workspaceRoot: "/workspace", nxJsonConfiguration: {} }
    );
    expect(result.map(([source]) => source)).toEqual([
      "a/habitat-inquiry.json",
      "b/habitat-inquiry.json",
    ]);

    await expect(
      createNodes(["../habitat-inquiry.json"], undefined, {
        workspaceRoot: "/workspace",
        nxJsonConfiguration: {},
      })
    ).rejects.toThrow("escapes the workspace");
  });
});
