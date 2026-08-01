import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { describe, expect, it } from "vitest";

import { temporalInquiryInitGenerator } from "../src/generators/temporal-inquiry-init/generator";
import { temporalInquiryRemoveGenerator } from "../src/generators/temporal-inquiry-remove/generator";

describe("temporal inquiry generators", () => {
  it("round-trips idempotently without changing unrelated Nx plugins", () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write(
      "nx.json",
      `${JSON.stringify(
        {
          namedInputs: { default: ["{projectRoot}/**/*"] },
          plugins: [{ plugin: "existing/plugin", options: { stable: true } }],
        },
        null,
        2
      )}\n`
    );

    temporalInquiryInitGenerator(tree);
    const installed = readTreeText(tree, "nx.json");
    expect(JSON.parse(installed)).toMatchObject({
      plugins: [
        { plugin: "existing/plugin", options: { stable: true } },
        "@habitat/cli/temporal-inquiry-nx-plugin",
      ],
    });

    temporalInquiryInitGenerator(tree);
    expect(readTreeText(tree, "nx.json")).toBe(installed);

    temporalInquiryRemoveGenerator(tree);
    expect(JSON.parse(readTreeText(tree, "nx.json"))).toEqual({
      namedInputs: { default: ["{projectRoot}/**/*"] },
      plugins: [{ plugin: "existing/plugin", options: { stable: true } }],
    });

    temporalInquiryInitGenerator(tree);
    expect(readTreeText(tree, "nx.json")).toBe(installed);
  });

  it("removes the last plugin without retaining empty configuration", () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write(
      "nx.json",
      '{"plugins":["@habitat/cli/temporal-inquiry-nx-plugin"],"targetDefaults":{}}\n'
    );

    temporalInquiryRemoveGenerator(tree);

    expect(JSON.parse(readTreeText(tree, "nx.json"))).toEqual({ targetDefaults: {} });
  });
});

function readTreeText(tree: ReturnType<typeof createTreeWithEmptyWorkspace>, path: string): string {
  const contents = tree.read(path, "utf8");
  if (contents === null) throw new Error(`Expected ${path} to exist.`);
  return contents;
}
