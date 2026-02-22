#!/usr/bin/env bun
import {
  assertIncludes,
  assertMatches,
  assertNotMatches,
  assertScriptEquals,
  mustExist,
  readFile,
  readPackageScripts,
} from "./_verify-utils.mjs";

await Promise.all([
  mustExist("apps/server/src/rawr.ts"),
  mustExist("apps/server/src/orpc.ts"),
  mustExist("apps/server/src/auth/rpc-auth.ts"),
  mustExist("apps/server/test/route-boundary-matrix.test.ts"),
  mustExist("apps/server/test/ingress-signature-observability.test.ts"),
  mustExist("apps/server/test/phase-a-gates.test.ts"),
  mustExist("scripts/phase-d/_verify-utils.mjs"),
]);

const [rawrSource, orpcSource, rpcAuthSource, routeBoundarySource, ingressObservabilitySource, phaseAGatesSource, scripts] =
  await Promise.all([
    readFile("apps/server/src/rawr.ts"),
    readFile("apps/server/src/orpc.ts"),
    readFile("apps/server/src/auth/rpc-auth.ts"),
    readFile("apps/server/test/route-boundary-matrix.test.ts"),
    readFile("apps/server/test/ingress-signature-observability.test.ts"),
    readFile("apps/server/test/phase-a-gates.test.ts"),
    readPackageScripts(),
  ]);

assertIncludes(
  rawrSource,
  'const INNGEST_SIGNATURE_HEADERS = ["x-inngest-signature", "inngest-signature"] as const;',
  "rawr.ts must define canonical ingress signature headers",
);
assertIncludes(
  rawrSource,
  "export async function verifyInngestIngressRequest(request: Request): Promise<boolean>",
  "rawr.ts must keep signed ingress verifier helper",
);
assertMatches(
  rawrSource,
  /app\.all\(\s*"\/api\/inngest"[\s\S]*?verifyInngestIngressRequest\(req\)[\s\S]*?new Response\("forbidden",\s*\{\s*status:\s*403\s*\}\)[\s\S]*?return inngestHandler\(req\);/m,
  "rawr.ts must hard-fail unsigned/invalid ingress requests before runtime dispatch",
);
assertIncludes(
  rawrSource,
  "router: rawrHqManifest.orpc.router",
  "rawr.ts must keep manifest-owned ORPC router wiring for route ownership boundaries",
);

assertNotMatches(orpcSource, /"\/api\/inngest"/, "orpc.ts must not own /api/inngest ingress route");
assertNotMatches(orpcSource, /"\/api\/workflows\/\*"/, "orpc.ts must not own /api/workflows route family");
assertMatches(
  orpcSource,
  /app\.all\(\s*"\/rpc"[\s\S]*?isRpcRequestAllowedWithDedupe/m,
  "orpc.ts must gate /rpc route family through deduped caller auth policy",
);
assertMatches(
  orpcSource,
  /app\.all\(\s*"\/rpc\/\*"[\s\S]*?isRpcRequestAllowedWithDedupe/m,
  "orpc.ts must gate /rpc/* route family through deduped caller auth policy",
);

assertIncludes(
  rpcAuthSource,
  'export type RpcDeniedCallerClass = "external" | "runtime-ingress" | "unlabeled";',
  "rpc-auth.ts must keep runtime-ingress classified as denied caller class",
);
assertMatches(
  rpcAuthSource,
  /if \(callerSurface === "runtime-ingress"\) return "runtime-ingress";/,
  "rpc-auth.ts must explicitly classify runtime-ingress callers as denied",
);

assertIncludes(
  routeBoundarySource,
  '"assertion:reject-ingress-spoofed-caller-headers"',
  "route-boundary matrix must keep anti-spoof ingress negative assertion key",
);
assertIncludes(
  routeBoundarySource,
  '"assertion:reject-rpc-from-runtime-ingress"',
  "route-boundary matrix must keep runtime-ingress rejection assertion key for /rpc",
);
assertIncludes(
  routeBoundarySource,
  "first-party caller headers cannot spoof runtime ingress access",
  "route-boundary matrix must execute spoofed first-party ingress denial case",
);
assertIncludes(
  routeBoundarySource,
  "runtime ingress callers cannot spoof access to /rpc route family",
  "route-boundary matrix must execute runtime-ingress denial case for /rpc",
);

assertIncludes(
  ingressObservabilitySource,
  "cannot be bypassed by spoofed caller-surface or auth headers",
  "ingress-signature observability test must cover spoofed caller/auth header bypass attempts",
);
assertIncludes(
  phaseAGatesSource,
  "assertion:reject-ingress-spoofed-caller-headers",
  "phase-a gate scaffold must lock ingress spoofed-header assertion key",
);
assertIncludes(
  phaseAGatesSource,
  "assertion:reject-rpc-from-runtime-ingress",
  "phase-a gate scaffold must lock runtime-ingress /rpc rejection assertion key",
);

assertScriptEquals(
  scripts,
  "phase-d:gate:d3-ingress-middleware-structural-contract",
  "bun scripts/phase-d/verify-d3-ingress-middleware-structural-contract.mjs",
);
assertScriptEquals(
  scripts,
  "phase-d:gate:d3-ingress-middleware-structural-runtime",
  "bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts && bunx vitest run --project server apps/server/test/ingress-signature-observability.test.ts && bunx vitest run --project server apps/server/test/phase-a-gates.test.ts",
);
assertScriptEquals(
  scripts,
  "phase-d:d3:quick",
  "bun run phase-d:gate:drift-core && bun run phase-d:gate:d3-ingress-middleware-structural-contract && bun run phase-d:gate:d3-ingress-middleware-structural-runtime",
);
assertScriptEquals(
  scripts,
  "phase-d:d3:full",
  "bun run phase-d:d3:quick && bun run phase-a:gate:host-composition-guard && bun run phase-a:gate:route-negative-assertions",
);

console.log("phase-d d3 ingress/middleware structural contract verified");
