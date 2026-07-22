import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

import {
  assertCanonicalControllerNxProjectRoots,
  resolveControllerNxClosure,
} from "../nx-closure.ts";

function graph(
  nodes: Record<string, string>,
  dependencies: Record<string, readonly string[]>
): unknown {
  return {
    graph: {
      nodes: Object.fromEntries(
        Object.entries(nodes).map(([name, root]) => [name, { data: { root } }])
      ),
      dependencies: Object.fromEntries(
        Object.entries(dependencies).map(([name, targets]) => [
          name,
          targets.map((target) => ({ target })),
        ])
      ),
    },
  };
}

describe("controller Nx closure", () => {
  test("resolves the complete explicit transitive project set", () => {
    const result = resolveControllerNxClosure({
      graph: graph(
        {
          "@rawr/cli": "apps/cli",
          "@rawr/plugin-devops": "plugins/cli/commands/devops",
          "@rawr/core": "packages/core",
        },
        {
          "@rawr/cli": ["@rawr/plugin-devops"],
          "@rawr/plugin-devops": ["@rawr/core"],
          "@rawr/core": [],
        }
      ),
      rootProjectNames: ["@rawr/cli"],
    });

    expect(result).toEqual([
      { name: "@rawr/cli", root: "apps/cli" },
      { name: "@rawr/core", root: "packages/core" },
      { name: "@rawr/plugin-devops", root: "plugins/cli/commands/devops" },
    ]);
  });

  test("rejects the external Hello fixture even when an edge reaches it", () => {
    expect(() =>
      resolveControllerNxClosure({
        graph: graph(
          {
            "@rawr/cli": "apps/cli",
            "@rawr/plugin-hello": "plugins/cli/commands/hello",
          },
          {
            "@rawr/cli": ["@rawr/plugin-hello"],
            "@rawr/plugin-hello": [],
          }
        ),
        rootProjectNames: ["@rawr/cli"],
      })
    ).toThrow("external fixture cannot enter");
  });

  test("rejects protected agent roots without reading their bytes", () => {
    expect(() =>
      resolveControllerNxClosure({
        graph: graph(
          {
            "@rawr/cli": "apps/cli",
            "@rawr/protected-fixture": "plugins/agents/protected-fixture",
          },
          {
            "@rawr/cli": ["@rawr/protected-fixture"],
            "@rawr/protected-fixture": [],
          }
        ),
        rootProjectNames: ["@rawr/cli"],
      })
    ).toThrow("protected project cannot enter");
  });

  test.each([
    "x/../plugins/agents/protected",
    "./apps/cli",
    "apps//cli",
    "apps/cli/",
    "../outside",
    "apps\\cli",
  ])("rejects noncanonical project root %s before staging", (root) => {
    expect(() =>
      resolveControllerNxClosure({
        graph: graph({ "@rawr/cli": root }, { "@rawr/cli": [] }),
        rootProjectNames: ["@rawr/cli"],
      })
    ).toThrow("invalid root");
  });

  test("rejects a project-root symlink even when it resolves inside the workspace", async () => {
    const workspaceRoot = await realpath(await mkdtemp(join(tmpdir(), "rawr-nx-root-")));
    try {
      await mkdir(join(workspaceRoot, "packages", "real"), { recursive: true });
      await symlink(
        join(workspaceRoot, "packages", "real"),
        join(workspaceRoot, "packages", "alias")
      );

      await expect(
        assertCanonicalControllerNxProjectRoots({
          workspaceRoot,
          projects: [{ name: "@rawr/alias", root: "packages/alias" }],
        })
      ).rejects.toThrow("project root is an alias");
    } finally {
      await removeNxFixture(workspaceRoot);
    }
  });
});

async function removeNxFixture(root: string): Promise<void> {
  const canonicalTemporaryRoot = await realpath(tmpdir());
  const lexicalRoot = resolve(root);
  const offset = relative(canonicalTemporaryRoot, lexicalRoot);
  if (
    dirname(lexicalRoot) !== canonicalTemporaryRoot ||
    !basename(lexicalRoot).startsWith("rawr-nx-root-") ||
    offset === "" ||
    offset === ".." ||
    offset.startsWith(`..${sep}`)
  ) {
    throw new Error(`refusing unsafe Nx fixture cleanup: ${root}`);
  }
  if ((await realpath(lexicalRoot)) !== lexicalRoot) {
    throw new Error(`refusing aliased Nx fixture cleanup: ${root}`);
  }
  await rm(lexicalRoot, { force: true, recursive: true });
}
