import { describe, expect, test } from "bun:test";
import { assertQualityTargetAdmission } from "./quality-target-admission.mjs";

/** @param {Record<string, ReturnType<typeof project>>} nodes */
function graph(nodes) {
  return { graph: { nodes } };
}

/** @param {string} root @param {Record<string, unknown>} targets @param {string[]} [tags] */
function project(root, targets, tags = []) {
  return { data: { root, tags, targets } };
}

describe("quality target admission", () => {
  test("accepts code projects and uniquely classified exemptions", () => {
    const value = graph({
      root: project(".", {}),
      service: project("services/example", { lint: {}, typecheck: {} }, ["type:service"]),
      content: project("plugins/agents/example", {}, ["type:content"]),
      fixture: project("tools/example-fixture", {}, ["type:fixture"]),
    });

    expect(() => assertQualityTargetAdmission(value)).not.toThrow();
  });

  test("refuses ambiguous project kinds before applying an exemption", () => {
    const value = graph({
      ambiguous: project("services/example", {}, ["type:service", "type:fixture"]),
    });

    expect(() => assertQualityTargetAdmission(value)).toThrow(
      "ambiguous (services/example) must declare exactly one type:* project kind; found type:fixture, type:service"
    );
  });

  test("refuses a project without a project kind", () => {
    const value = graph({ unclassified: project("packages/example", {}, []) });

    expect(() => assertQualityTargetAdmission(value)).toThrow(
      "unclassified (packages/example) must declare exactly one type:* project kind; found none"
    );
  });

  test("refuses missing code-project targets deterministically", () => {
    const value = graph({
      beta: project("packages/beta", { lint: {} }, ["type:package"]),
      alpha: project("packages/alpha", {}, ["type:package"]),
    });

    expect(() => assertQualityTargetAdmission(value)).toThrow(
      "alpha (packages/alpha) is missing lint and typecheck\nbeta (packages/beta) is missing typecheck"
    );
  });

  test("refuses a graph outside the TypeBox contract", () => {
    expect(() => assertQualityTargetAdmission({ graph: { nodes: [] } })).toThrow(
      "Nx project graph is invalid"
    );
  });
});
