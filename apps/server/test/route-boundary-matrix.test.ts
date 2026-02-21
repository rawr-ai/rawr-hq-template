import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ensureCoordinationStorage, listWorkflows } from "@rawr/coordination/node";
import { describe, expect, it } from "vitest";

import { createServerApp } from "../src/app";
import { registerRawrRoutes } from "../src/rawr";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const REQUIRED_SUITE_IDS = [
  "suite:web:first-party-rpc",
  "suite:web:published-openapi",
  "suite:cli:in-process",
  "suite:api:boundary",
  "suite:workflow:trigger-status",
  "suite:runtime:ingress",
  "suite:cross-surface:metadata-import-boundary",
] as const;

const REQUIRED_NEGATIVE_ASSERTION_KEYS = [
  "assertion:reject-api-inngest-from-caller-paths",
  "assertion:reject-rpc-from-external-callers",
  "assertion:runtime-ingress-no-caller-boundary-semantics",
  "assertion:in-process-no-local-http-self-call",
] as const;

type CallerSurface = "first-party" | "external" | "runtime-ingress" | "in-process" | "cross-surface";

type StatusExpectation = number | ((status: number) => boolean);

type HttpMatrixCase = {
  kind: "http";
  suiteId: (typeof REQUIRED_SUITE_IDS)[number];
  assertionKey: string;
  callerSurface: Exclude<CallerSurface, "in-process" | "cross-surface">;
  assertCallerBoundarySemantics: boolean;
  description: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  env?: Record<string, string | undefined>;
  expectedStatus: StatusExpectation;
};

type InProcessMatrixCase = {
  kind: "in-process";
  suiteId: "suite:cli:in-process";
  assertionKey: "assertion:in-process-no-local-http-self-call";
  callerSurface: "in-process";
  usesLocalHttpSelfCall: false;
  description: string;
  invoke: () => Promise<unknown>;
};

type StaticMatrixCase = {
  kind: "static";
  suiteId: "suite:cross-surface:metadata-import-boundary";
  assertionKey: string;
  callerSurface: "cross-surface";
  description: string;
  check: () => Promise<void>;
};

type MatrixCase = HttpMatrixCase | InProcessMatrixCase | StaticMatrixCase;

function createApp() {
  return registerRawrRoutes(createServerApp(), {
    repoRoot,
    enabledPluginIds: new Set(),
    baseUrl: "http://localhost:3000",
  });
}

async function withEnv<T>(env: Record<string, string | undefined> | undefined, run: () => Promise<T>): Promise<T> {
  if (!env || Object.keys(env).length === 0) {
    return run();
  }

  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(env)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function assertStatus(expectation: StatusExpectation, status: number, caseId: string): void {
  if (typeof expectation === "number") {
    expect(status, caseId).toBe(expectation);
    return;
  }
  expect(expectation(status), caseId).toBe(true);
}

const MATRIX_CASES: MatrixCase[] = [
  {
    kind: "http",
    suiteId: "suite:web:first-party-rpc",
    assertionKey: "assertion:first-party-rpc-available",
    callerSurface: "first-party",
    assertCallerBoundarySemantics: true,
    description: "first-party RPC callers can use /rpc procedure paths",
    method: "POST",
    path: "/rpc/coordination/listWorkflows",
    headers: {
      "content-type": "application/json",
      "x-rawr-caller-surface": "first-party",
      "x-rawr-session-auth": "verified",
    },
    body: { json: {} },
    expectedStatus: 200,
  },
  {
    kind: "http",
    suiteId: "suite:web:first-party-rpc",
    assertionKey: "assertion:reject-api-inngest-from-caller-paths",
    callerSurface: "first-party",
    assertCallerBoundarySemantics: true,
    description: "first-party caller paths reject /api/inngest",
    method: "GET",
    path: "/api/inngest",
    expectedStatus: 403,
  },
  {
    kind: "http",
    suiteId: "suite:web:published-openapi",
    assertionKey: "assertion:published-openapi-available",
    callerSurface: "external",
    assertCallerBoundarySemantics: true,
    description: "external callers use published OpenAPI route family",
    method: "GET",
    path: "/api/orpc/coordination/workflows",
    headers: {
      "x-rawr-caller-surface": "external",
    },
    expectedStatus: 200,
  },
  {
    kind: "http",
    suiteId: "suite:api:boundary",
    assertionKey: "assertion:reject-rpc-from-external-callers",
    callerSurface: "external",
    assertCallerBoundarySemantics: true,
    description: "external callers reject /rpc paths with valid RPC payload shape",
    method: "POST",
    path: "/rpc/coordination/listWorkflows",
    headers: {
      "content-type": "application/json",
      "x-rawr-caller-surface": "external",
    },
    body: { json: {} },
    expectedStatus: 403,
  },
  {
    kind: "http",
    suiteId: "suite:api:boundary",
    assertionKey: "assertion:reject-rpc-from-external-callers",
    callerSurface: "external",
    assertCallerBoundarySemantics: true,
    description: "external-style unlabeled callers reject /rpc paths by default",
    method: "POST",
    path: "/rpc/coordination/listWorkflows",
    headers: {
      "content-type": "application/json",
    },
    body: { json: {} },
    expectedStatus: 403,
  },
  {
    kind: "http",
    suiteId: "suite:api:boundary",
    assertionKey: "assertion:reject-api-inngest-from-caller-paths",
    callerSurface: "external",
    assertCallerBoundarySemantics: true,
    description: "external caller paths reject /api/inngest",
    method: "GET",
    path: "/api/inngest",
    expectedStatus: 403,
  },
  {
    kind: "http",
    suiteId: "suite:workflow:trigger-status",
    assertionKey: "assertion:workflow-trigger-status-route-family",
    callerSurface: "external",
    assertCallerBoundarySemantics: true,
    description: "workflow trigger/status suite targets /api/workflows/<capability>/*",
    method: "GET",
    path: "/api/workflows/coordination/workflows",
    expectedStatus: 200,
  },
  {
    kind: "http",
    suiteId: "suite:workflow:trigger-status",
    assertionKey: "assertion:workflow-trigger-router-no-non-workflow-leakage",
    callerSurface: "external",
    assertCallerBoundarySemantics: true,
    description: "workflow trigger/status suite does not expose non-workflow procedures",
    method: "GET",
    path: "/api/workflows/state/runtime",
    expectedStatus: 404,
  },
  {
    kind: "http",
    suiteId: "suite:runtime:ingress",
    assertionKey: "assertion:runtime-ingress-no-caller-boundary-semantics",
    callerSurface: "runtime-ingress",
    assertCallerBoundarySemantics: false,
    description: "runtime ingress assertions stay ingress-specific and signed-request oriented",
    method: "GET",
    path: "/api/inngest",
    expectedStatus: 403,
  },
  {
    kind: "http",
    suiteId: "suite:runtime:ingress",
    assertionKey: "assertion:runtime-ingress-no-caller-boundary-semantics",
    callerSurface: "runtime-ingress",
    assertCallerBoundarySemantics: false,
    description: "runtime ingress rejects invalid signature before dispatch",
    method: "POST",
    path: "/api/inngest",
    headers: {
      "content-type": "application/json",
      "x-inngest-signature": `t=${Math.floor(Date.now() / 1000)}&s=deadbeef`,
    },
    body: { ping: true },
    env: {
      INNGEST_SIGNING_KEY: "signkey-test-rawr-ingress",
      INNGEST_SIGNING_KEY_FALLBACK: undefined,
    },
    expectedStatus: 403,
  },
  {
    kind: "in-process",
    suiteId: "suite:cli:in-process",
    assertionKey: "assertion:in-process-no-local-http-self-call",
    callerSurface: "in-process",
    usesLocalHttpSelfCall: false,
    description: "CLI in-process suites use direct module calls, not localhost self-HTTP",
    invoke: async () => {
      const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-a5-in-process-"));
      await ensureCoordinationStorage(tempRoot);
      const workflows = await listWorkflows(tempRoot);
      return workflows.length;
    },
  },
  {
    kind: "static",
    suiteId: "suite:cross-surface:metadata-import-boundary",
    assertionKey: "assertion:metadata-import-boundary-shared-workspace-adapter",
    callerSurface: "cross-surface",
    description: "workspace discovery surfaces use package-owned adapter forwarding",
    check: async () => {
      const hqWorkspacePath = path.join(repoRoot, "packages/hq/src/workspace/plugins.ts");
      const pluginWorkspacePath = path.join(repoRoot, "plugins/cli/plugins/src/lib/workspace-plugins.ts");

      const [hqWorkspace, pluginWorkspace] = await Promise.all([
        fs.readFile(hqWorkspacePath, "utf8"),
        fs.readFile(pluginWorkspacePath, "utf8"),
      ]);

      expect(hqWorkspace).toContain('from "./plugin-manifest-contract"');
      expect(hqWorkspace).toContain("parseWorkspacePluginManifest");

      expect(pluginWorkspace).toContain('from "@rawr/hq/workspace"');
      expect(pluginWorkspace).toContain("findWorkspaceRootFromWorkspace");
      expect(pluginWorkspace).toContain("listWorkspacePluginsFromWorkspace");
      expect(pluginWorkspace).toContain("filterPluginsByKindFromWorkspace");
      expect(pluginWorkspace).toContain("resolvePluginIdFromWorkspace");
      expect(pluginWorkspace).toContain("export async function findWorkspaceRoot");
      expect(pluginWorkspace).toContain("export async function listWorkspacePlugins");
      expect(pluginWorkspace).toContain("export function filterPluginsByKind");
      expect(pluginWorkspace).toContain("export function resolvePluginId");
      expect(pluginWorkspace).not.toContain("parseWorkspacePluginManifest");
    },
  },
];

describe("route boundary matrix", () => {
  it("defines all required D-015 suite IDs", () => {
    const presentSuiteIds = new Set(MATRIX_CASES.map((testCase) => testCase.suiteId));

    for (const suiteId of REQUIRED_SUITE_IDS) {
      expect(presentSuiteIds.has(suiteId), `missing suite id in matrix: ${suiteId}`).toBe(true);
    }
  });

  it("defines all required negative assertion keys", () => {
    const presentAssertionKeys = new Set(MATRIX_CASES.map((testCase) => testCase.assertionKey));

    for (const assertionKey of REQUIRED_NEGATIVE_ASSERTION_KEYS) {
      expect(presentAssertionKeys.has(assertionKey), `missing assertion key in matrix: ${assertionKey}`).toBe(true);
    }
  });

  it("enforces boundary semantics rules in matrix metadata", () => {
    const httpCases = MATRIX_CASES.filter((testCase): testCase is HttpMatrixCase => testCase.kind === "http");
    const inProcessCases = MATRIX_CASES.filter(
      (testCase): testCase is InProcessMatrixCase => testCase.kind === "in-process",
    );

    for (const testCase of httpCases) {
      if ((testCase.callerSurface === "first-party" || testCase.callerSurface === "external") && testCase.path === "/api/inngest") {
        expect(typeof testCase.expectedStatus === "number" ? testCase.expectedStatus >= 400 : true).toBe(true);
      }

      if (testCase.callerSurface === "external" && testCase.path.startsWith("/rpc")) {
        expect(testCase.expectedStatus).toBe(403);
      }

      if (testCase.callerSurface === "runtime-ingress") {
        expect(testCase.assertCallerBoundarySemantics).toBe(false);
      }
    }

    for (const testCase of inProcessCases) {
      expect(testCase.usesLocalHttpSelfCall).toBe(false);
    }
  });

  it("executes HTTP route boundary cases", async () => {
    const app = createApp();
    const httpCases = MATRIX_CASES.filter((testCase): testCase is HttpMatrixCase => testCase.kind === "http");

    for (const testCase of httpCases) {
      const request = new Request(`http://localhost${testCase.path}`, {
        method: testCase.method,
        headers: testCase.headers,
        body: testCase.body === undefined ? undefined : JSON.stringify(testCase.body),
      });

      const response = await withEnv(testCase.env, async () => app.handle(request));
      assertStatus(testCase.expectedStatus, response.status, `${testCase.suiteId} :: ${testCase.description}`);
    }
  });

  it("executes in-process suite cases without localhost self-call defaults", async () => {
    const inProcessCases = MATRIX_CASES.filter(
      (testCase): testCase is InProcessMatrixCase => testCase.kind === "in-process",
    );

    for (const testCase of inProcessCases) {
      const result = await testCase.invoke();
      expect(result).toBeDefined();
      expect(testCase.usesLocalHttpSelfCall).toBe(false);
    }
  });

  it("executes cross-surface metadata import boundary checks", async () => {
    const staticCases = MATRIX_CASES.filter((testCase): testCase is StaticMatrixCase => testCase.kind === "static");

    for (const testCase of staticCases) {
      await testCase.check();
    }
  });
});
