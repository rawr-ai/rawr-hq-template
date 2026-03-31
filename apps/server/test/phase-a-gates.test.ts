import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function parseTypeScript(filePath: string, source: string): ts.SourceFile {
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function visit(node: ts.Node, fn: (node: ts.Node) => void): void {
  fn(node);
  node.forEachChild((child) => visit(child, fn));
}

function hasStringLiteral(sourceFile: ts.SourceFile, value: string): boolean {
  let matched = false;
  visit(sourceFile, (node) => {
    if (!matched && ts.isStringLiteral(node) && node.text === value) matched = true;
  });
  return matched;
}

describe("phase-a gate scaffold (server)", () => {
  it("host composition guard gate scaffold verifies the explicit HQ composition bridge and host-owned runtime seams", async () => {
    const rawrSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "rawr.ts"), "utf8");
    const hostCompositionSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "host-composition.ts"), "utf8");
    const hostSeamSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "host-seam.ts"), "utf8");
    const testingHostSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "testing-host.ts"), "utf8");
    const workflowRuntimeSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "workflows", "runtime.ts"), "utf8");
    const routeMatrixSource = await fs.readFile(path.join(repoRoot, "apps", "server", "test", "route-boundary-matrix.test.ts"), "utf8");
    const routeMatrixAst = parseTypeScript(path.join(repoRoot, "apps", "server", "test", "route-boundary-matrix.test.ts"), routeMatrixSource);

    expect(rawrSource).toContain('from "./host-composition"');
    expect(rawrSource).toContain('from "./workflows/runtime"');
    expect(rawrSource).toContain("/api/inngest");
    expect(rawrSource).toContain("/api/workflows/*");
    expect(rawrSource).toContain("registerOrpcRoutes");
    expect(rawrSource).not.toContain("@rawr/plugin-workflows-coordination/server");
    expect(rawrSource).not.toContain("@rawr/plugin-workflows-support-example/server");
    expect(hostCompositionSource).toContain("createRawrHqManifest");
    expect(hostCompositionSource).toContain("createRawrHostSatisfiers");
    expect(hostCompositionSource).toContain("createRawrHostBoundRolePlan");
    expect(hostSeamSource).toContain("workflows: Readonly<Record<string, never>>");
    expect(testingHostSource).toContain("createRawrHostComposition");
    expect(testingHostSource).not.toContain("manifest.fixtures");
    expect(workflowRuntimeSource).toContain("resolveRawrWorkflowInngestBaseUrl");
    expect(workflowRuntimeSource).not.toContain("createCoordinationWorkflowRuntimeAdapter");
    expect(hasStringLiteral(routeMatrixAst, "assertion:reject-rpc-workflows-route-family")).toBe(true);
  });

  it("observability contract gate scaffold keeps canonical host observability proofs present", async () => {
    const ingressProbe = await fs.access(path.join(repoRoot, "apps", "server", "test", "ingress-signature-observability.test.ts"));
    const loggingProbe = await fs.access(path.join(repoRoot, "apps", "server", "test", "logging-correlation.test.ts"));

    expect(ingressProbe == null).toBe(true);
    expect(loggingProbe == null).toBe(true);
  });
});
