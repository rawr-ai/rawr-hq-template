import { describe, expect, test } from "bun:test";
import {
  assertQualityTargetAdmission,
  assertRootFoundationalScripts,
} from "./quality-target-admission.mjs";

/** @param {Record<string, ReturnType<typeof project>>} nodes */
function graph(nodes) {
  return { graph: { nodes } };
}

/** @param {string} root @param {Record<string, unknown>} targets @param {string[]} [tags] */
function project(root, targets, tags = []) {
  return { data: { root, tags, targets } };
}

describe("quality target admission", () => {
  test("keeps foundational root scripts as exact one-target Nx schedulers", () => {
    const value = {
      scripts: {
        build: "nx run-many -t build",
        check: "nx run-many -t check",
        lint: "nx run-many -t lint",
        test: "nx run-many -t test",
        typecheck: "nx run-many -t typecheck",
      },
    };

    expect(() => assertRootFoundationalScripts(value)).not.toThrow();
  });

  test("refuses foundational root script filters and nested commands", () => {
    const value = {
      scripts: {
        build: "nx run-many -t build --projects=@rawr/cli",
        check: "nx run-many -t check && nx run repository:verify",
        lint: "nx run-many -t lint",
        test: "nx run-many -t test",
        typecheck: "nx run-many -t typecheck",
      },
    };

    expect(() => assertRootFoundationalScripts(value)).toThrow(
      'build must be exactly "nx run-many -t build"; found "nx run-many -t build --projects=@rawr/cli"\n' +
        'check must be exactly "nx run-many -t check"; found "nx run-many -t check && nx run repository:verify"'
    );
  });

  test("accepts code projects and uniquely classified exemptions", () => {
    const value = graph({
      root: project(".", {}),
      service: project("services/example", { check: {}, lint: {}, typecheck: {} }, [
        "type:service",
      ]),
      content: project("plugins/agents/example", { check: {} }, ["type:content"]),
      fixture: project("tools/example-fixture", { check: {} }, ["type:fixture"]),
    });

    expect(() => assertQualityTargetAdmission(value)).not.toThrow();
  });

  test("keeps the workspace scheduler outside foundational project targets", () => {
    const value = graph({ root: project(".", { build: {}, check: {} }) });

    expect(() => assertQualityTargetAdmission(value)).toThrow(
      "root (.) is the workspace scheduler and must not own foundational targets; found build, check"
    );
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
      "alpha (packages/alpha) is missing check, lint, typecheck\n" +
        "beta (packages/beta) is missing check, typecheck"
    );
  });

  test("refuses an exempt project without a public check", () => {
    const value = graph({ content: project("plugins/agents/example", {}, ["type:content"]) });

    expect(() => assertQualityTargetAdmission(value)).toThrow(
      "content (plugins/agents/example) is missing check"
    );
  });

  test("refuses a graph outside the TypeBox contract", () => {
    expect(() => assertQualityTargetAdmission({ graph: { nodes: [] } })).toThrow(
      "Nx project graph is invalid"
    );
  });
});
