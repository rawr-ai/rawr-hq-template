import { describe, expect, test } from "bun:test";
import { assertQualityTargetAdmission } from "../../.habitat/blueprints/nx-workspace/require_nx_project_quality_targets/check.mjs";

/** @param {Record<string, ReturnType<typeof project>>} nodes */
function graph(nodes) {
  return {
    graph: {
      nodes: {
        habitat: project("scripts/habitat", codeTargets({ lint: {} }), ["type:tool"]),
        ...nodes,
      },
    },
  };
}

/** @param {string} root @param {Record<string, unknown>} targets @param {string[]} [tags] */
function project(root, targets, tags = []) {
  return { data: { root, tags, targets } };
}

/** @param {Record<string, unknown>} [additionalTargets] */
function codeTargets(additionalTargets = {}) {
  return {
    check: { dependsOn: [habitatLintDependency(), "typecheck"] },
    typecheck: {},
    ...additionalTargets,
  };
}

function contentTargets() {
  return { check: { dependsOn: [habitatLintDependency()] } };
}

function habitatLintDependency() {
  return { projects: ["habitat"], target: "lint" };
}

describe("quality target admission", () => {
  test("accepts code projects and uniquely classified exemptions", () => {
    const value = graph({
      root: project(".", {}),
      service: project("services/example", codeTargets(), ["type:service"]),
      content: project("plugins/agents/example", contentTargets(), ["type:content"]),
      fixture: project("tools/example-fixture", contentTargets(), ["type:fixture"]),
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
      beta: project("packages/beta", { typecheck: {} }, ["type:package"]),
      alpha: project("packages/alpha", {}, ["type:package"]),
    });

    expect(() => assertQualityTargetAdmission(value)).toThrow(
      "alpha (packages/alpha) is missing check, typecheck\n" +
        "beta (packages/beta) is missing check"
    );
  });

  test("refuses an exempt project without a public check", () => {
    const value = graph({ content: project("plugins/agents/example", {}, ["type:content"]) });

    expect(() => assertQualityTargetAdmission(value)).toThrow(
      "content (plugins/agents/example) is missing check"
    );
  });

  test("refuses a second resolved lint owner regardless of how Nx inferred it", () => {
    const value = graph({
      service: project("services/example", codeTargets({ lint: {} }), ["type:service"]),
    });

    expect(() => assertQualityTargetAdmission(value)).toThrow(
      "resolved lint ownership must be exactly habitat (scripts/habitat); found habitat (scripts/habitat), service (services/example)"
    );
  });

  test("refuses a project-local empty check dependency override", () => {
    const value = graph({
      service: project("services/example", { check: { dependsOn: [] }, typecheck: {} }, [
        "type:service",
      ]),
    });

    expect(() => assertQualityTargetAdmission(value)).toThrow(
      "service (services/example) check must depend exactly once on habitat:lint; found 0\n" +
        "service (services/example) check must depend exactly once on typecheck; found 0"
    );
  });

  test("refuses partial check dependency overrides", () => {
    const missingLint = graph({
      service: project("services/example", { check: { dependsOn: ["typecheck"] }, typecheck: {} }, [
        "type:service",
      ]),
    });
    const missingTypecheck = graph({
      service: project(
        "services/example",
        { check: { dependsOn: [habitatLintDependency()] }, typecheck: {} },
        ["type:service"]
      ),
    });

    expect(() => assertQualityTargetAdmission(missingLint)).toThrow(
      "service (services/example) check must depend exactly once on habitat:lint; found 0"
    );
    expect(() => assertQualityTargetAdmission(missingTypecheck)).toThrow(
      "service (services/example) check must depend exactly once on typecheck; found 0"
    );
  });

  test("refuses duplicate foundational check dependencies", () => {
    const value = graph({
      service: project(
        "services/example",
        {
          check: {
            dependsOn: [habitatLintDependency(), habitatLintDependency(), "typecheck", "typecheck"],
          },
          typecheck: {},
        },
        ["type:service"]
      ),
    });

    expect(() => assertQualityTargetAdmission(value)).toThrow(
      "service (services/example) check must depend exactly once on habitat:lint; found 2\n" +
        "service (services/example) check must depend exactly once on typecheck; found 2"
    );
  });

  test("refuses a graph outside the TypeBox contract", () => {
    expect(() => assertQualityTargetAdmission({ graph: { nodes: [] } })).toThrow(
      "Nx project graph is invalid"
    );
  });
});
