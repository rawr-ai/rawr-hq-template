import { afterEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { provisionHabitatBinary } from "./provision.mjs";

const RULE_ID = "preserve_agent_plugin_lifecycle_dependency_direction";
const RULE_SOURCE = fileURLToPath(new URL(
  "../../.habitat/rawr/agent-plugin-lifecycle/rules/preserve_agent_plugin_lifecycle_dependency_direction",
  import.meta.url,
));
const WORKSPACE_NODE_MODULES = fileURLToPath(new URL("../../node_modules", import.meta.url));
const roots = [];

const rejectingSources = {
  "services/agent-plugin-lifecycle/src/service/base.ts": `
import type { ReleaseRuntime } from "./modules/releases/ports";
import type { ProviderTargetReader } from "./modules/providers/model/repositories/provider";
`,
  "services/agent-plugin-lifecycle/src/service/model/dependencies/packaging.ts": `
import type { PackagingRuntime } from "../../modules/packaging/ports";
`,
  "services/agent-plugin-lifecycle/src/service/model/dependencies/release-export.ts": `
export { type ReleaseRuntime } from "../../modules/releases/ports";
`,
  "services/agent-plugin-lifecycle/src/service/model/dependencies/release-star.ts": `
export * from "../../modules/releases/ports";
`,
  "services/agent-plugin-lifecycle/src/service/model/dependencies/release-dynamic.ts": `
export const release = import("../../modules/releases/ports");
`,
  "services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-relative-import.ts": `
import type { NativeProviderResourcePort } from "../../../bindings/providers";
`,
  "services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-package-import.ts": `
import type { NativeProviderResourcePort } from "@rawr/agent-plugin-lifecycle/bindings/providers";
`,
  "services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-relative-export.ts": `
export { type NativeProviderResourcePort } from "../../../bindings/providers";
`,
  "services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-package-export.ts": `
export { type NativeProviderResourcePort } from "@rawr/agent-plugin-lifecycle/bindings/providers";
`,
  "services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-relative-star.ts": `
export * from "../../../bindings/providers";
`,
  "services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-package-star.ts": `
export * from "@rawr/agent-plugin-lifecycle/bindings/providers";
`,
  "services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-relative-dynamic.ts": `
export const provider = import("../../../bindings/providers");
`,
  "services/agent-plugin-lifecycle/src/service/model/dependencies/provider-binding-package-dynamic.ts": `
export const provider = import("@rawr/agent-plugin-lifecycle/bindings/providers");
`,
  "services/agent-plugin-lifecycle/src/service/model/dependencies/governance.ts": `
import type { ExactGitReader } from "../../modules/governance/model/repositories/exact-git";
`,
  "services/agent-plugin-lifecycle/src/service/modules/releases/router/impl-import.router.ts": `
import { impl } from "../../../impl";
`,
  "services/agent-plugin-lifecycle/src/service/modules/releases/router/context-deps.router.ts": `
export const bypass = context.deps.releaseSource;
`,
  "services/agent-plugin-lifecycle/src/service/modules/exports/router/context-provided.router.ts": `
export const bypass = context.provided.artifactStore;
`,
  "services/agent-plugin-lifecycle/src/service/router.ts": `
import { forbidden } from "./not-allowed";
import { impl } from "./impl";

export const router = {};
impl.releases.check.handler(forbidden);
`,
  "services/agent-plugin-lifecycle/src/provider-import.ts": `
import { makeProvider } from "@rawr/resource-native-agent-provider/providers/codex-effect-platform-node";
`,
  "services/agent-plugin-lifecycle/src/provider-named-export.ts": `
export { makeProvider } from "@rawr/resource-native-agent-provider/providers/codex-effect-platform-node";
`,
  "services/agent-plugin-lifecycle/src/provider-star-export.ts": `
export * from "@rawr/resource-native-agent-provider/providers/codex-effect-platform-node";
`,
  "services/agent-plugin-lifecycle/src/provider-dynamic-import.ts": `
export const provider = import("@rawr/resource-native-agent-provider/providers/codex-effect-platform-node");
`,
  "services/agent-plugin-lifecycle/src/service/modules/providers/ports.ts": `
export * from "./internal/resource-artifact-repository";
`,
  "apps/cli/src/lib/agent-plugins/value-surface-import.ts": `
import { contentDigest } from "@rawr/agent-plugin-lifecycle/release";
`,
  "apps/cli/src/lib/agent-plugins/retired-packaging-binding.ts": `
import { createResourcePackageOutputRuntime } from "@rawr/agent-plugin-lifecycle/bindings/packaging";
`,
  "apps/cli/src/lib/agent-plugins/retired-governance-binding-import.ts": `
import { createGovernanceCurrentMainSelectionReader } from "@rawr/agent-plugin-lifecycle/bindings/governance";
`,
  "apps/cli/src/lib/agent-plugins/retired-governance-binding-dynamic.ts": `
export const governance = import("@rawr/agent-plugin-lifecycle/bindings/governance");
`,
  "apps/cli/src/lib/agent-plugins/retired-governance-binding-reexport.ts": `
export { createGovernanceCurrentMainSelectionReader } from "@rawr/agent-plugin-lifecycle/bindings/governance";
`,
  "apps/cli/src/lib/agent-plugins/retired-governance-binding-star.ts": `
export * from "@rawr/agent-plugin-lifecycle/bindings/governance";
`,
  "apps/cli/src/lib/agent-plugins/release-binding-bypass.ts": `
import { createResourceArtifactStore } from "@rawr/agent-plugin-lifecycle/bindings/releases";
`,
  "apps/cli/src/lib/agent-plugins/bindings/output/artifact-repository.ts": `
import { createResourceArtifactReader } from "@rawr/agent-plugin-lifecycle/bindings/releases";
`,
  "apps/cli/src/lib/agent-plugins/second-artifact-provider.ts": `
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
`,
  "apps/cli/src/lib/agent-plugins/second-artifact-provider-dynamic.ts": `
export const artifactProvider = import("@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node");
`,
  "apps/cli/src/lib/agent-plugins/second-artifact-provider-export.ts": `
export { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
`,
  "apps/cli/src/lib/agent-plugins/second-artifact-provider-star.ts": `
export * from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
`,
  "apps/cli/src/commands/agent/plugins/second-artifact-provider.ts": `
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
`,
  "apps/cli/src/lib/agent-plugins/release-binding-dynamic-bypass.ts": `
export const releaseBindings = import("@rawr/agent-plugin-lifecycle/bindings/releases");
`,
  "apps/cli/src/lib/agent-plugins/release-binding-export-bypass.ts": `
export { createResourceArtifactStore } from "@rawr/agent-plugin-lifecycle/bindings/releases";
`,
  "apps/cli/src/lib/agent-plugins/release-binding-star-bypass.ts": `
export * from "@rawr/agent-plugin-lifecycle/bindings/releases";
`,
  "apps/cli/src/lib/agent-plugins/provider-binding-bypass.ts": `
import { NativeProviderResourceFailure } from "@rawr/agent-plugin-lifecycle/bindings/providers";
`,
  "apps/cli/src/lib/agent-plugins/provider-local-binding-bypass.ts": `
import { createNodeNativeProviderResource } from "./bindings/providers";
`,
  "apps/cli/src/lib/agent-plugins/provider-local-native-bypass.ts": `
import { createNodeNativeProviderResource } from "./bindings/providers/native";
`,
  "apps/cli/src/lib/agent-plugins/provider-local-binding-dynamic-bypass.ts": `
export const native = import("./bindings/providers");
`,
  "apps/cli/src/lib/agent-plugins/provider-local-binding-export-bypass.ts": `
export { createNodeNativeProviderResource } from "./bindings/providers";
`,
  "apps/cli/src/lib/agent-plugins/provider-local-binding-star-bypass.ts": `
export * from "./bindings/providers";
`,
  "apps/cli/src/lib/agent-plugins/value-surface-dynamic-import.ts": `
export const release = import("@rawr/agent-plugin-lifecycle/release");
`,
  "apps/cli/src/lib/agent-plugins/value-surface-named-export.ts": `
export { createMechanicalEvidenceHandle } from "@rawr/agent-plugin-lifecycle/release";
`,
  "apps/cli/src/lib/agent-plugins/value-surface-star-export.ts": `
export * from "@rawr/agent-plugin-lifecycle/release";
`,
  "apps/cli/src/lib/agent-plugins/deep-service-import.ts": `
import { router } from "../../services/agent-plugin-lifecycle/src/service/router";
`,
  "apps/cli/src/lib/agent-plugins/deep-service-named-export.ts": `
export { router } from "../../services/agent-plugin-lifecycle/src/service/router";
`,
  "apps/cli/src/lib/agent-plugins/deep-service-star-export.ts": `
export * from "../../services/agent-plugin-lifecycle/src/service/router";
`,
  "apps/cli/src/lib/agent-plugins/deep-service-dynamic-import.ts": `
export const router = import("../../services/agent-plugin-lifecycle/src/service/router");
`,
  "apps/cli/src/lib/agent-plugins/service-runtime/releases/mechanics-import.ts": `
import { readFile } from "node:fs/promises";
`,
  "apps/cli/src/lib/agent-plugins/service-runtime/releases/mechanics-named-export.ts": `
export { join } from "node:path";
`,
  "apps/cli/src/lib/agent-plugins/service-runtime/evidence/mechanics-star-export.ts": `
export * from "node:fs";
`,
  "apps/cli/src/lib/agent-plugins/service-runtime/evidence/mechanics-dynamic-import.ts": `
export const ffi = import("bun:ffi");
`,
  "apps/cli/src/lib/agent-plugins/alternate-client-import.ts": `
import { createClient } from "@rawr/alternate-lifecycle/client";
`,
  "apps/cli/src/lib/agent-plugins/alternate-client-dynamic-import.ts": `
export const client = import("@rawr/alternate-lifecycle/client");
`,
  "apps/cli/src/lib/agent-plugins/shadow-lifecycle-client.ts": `
import { createClient, type Client } from "@rawr/agent-plugin-lifecycle/client";

export const client = createClient;
export type LifecycleClient = Client;
`,
  "apps/cli/src/lib/agent-plugins/shadow-lifecycle-client.tsx": `
import { createClient } from "@rawr/agent-plugin-lifecycle/client";

export const client = createClient;
`,
  "apps/cli/src/lib/agent-plugins/shadow-lifecycle-client-dynamic.ts": `
export const client = import("@rawr/agent-plugin-lifecycle/client");
`,
  "apps/cli/src/lib/agent-plugins/shadow-lifecycle-client-reexport.ts": `
export { createClient } from "@rawr/agent-plugin-lifecycle/client";
`,
  "apps/cli/src/lib/agent-plugins/shadow-lifecycle-client-mixed-reexport.ts": `
export { type Client, createClient } from "@rawr/agent-plugin-lifecycle/client";
`,
  "apps/cli/src/lib/agent-plugins/shadow-lifecycle-client-star.ts": `
export * from "@rawr/agent-plugin-lifecycle/client";
`,
  "apps/cli/src/lib/agent-plugins/mixed-release-import.ts": `
import {
  type ContentAuthority,
  contentDigest,
} from "@rawr/agent-plugin-lifecycle/release";

export type Authority = ContentAuthority;
export const digest = contentDigest;
`,
};

const acceptedSources = {
  "services/agent-plugin-lifecycle/src/service/modules/releases/router/check.router.ts": `
import { module } from "../module";

export const check = module.check.handler(async ({ context }) =>
  context.source.inspect());
`,
  "services/agent-plugin-lifecycle/src/service/router.ts": `
import { impl } from "./impl";
import { router as releases } from "./modules/releases/router";

export const router = impl.router({ releases });
`,
  "services/agent-plugin-lifecycle/src/service/modules/providers/repository/resource-context.ts": `
import type { ArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository";
import type { NativeProviderResourcePort } from "../../../model/dependencies/providers";

export type RawProviderInputs = Readonly<{
  artifacts: ArtifactRepositoryAsyncPort;
  native: NativeProviderResourcePort;
}>;
`,
  "apps/cli/src/lib/agent-plugins/protocol.ts": `
import type { NativeProviderResourcePort } from "@rawr/agent-plugin-lifecycle/bindings/providers";

export type NativeProvider = NativeProviderResourcePort;
`,
  "apps/cli/src/lib/agent-plugins/release-protocol.ts": `
export type { ContentAuthority } from "@rawr/agent-plugin-lifecycle/release";
`,
  "apps/cli/src/lib/agent-plugins/release-protocol-star.ts": `
export type * from "@rawr/agent-plugin-lifecycle/release";
`,
  "apps/cli/src/lib/agent-plugins/service-runtime/client.ts": `
import { createClient, type Client } from "@rawr/agent-plugin-lifecycle/client";
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";

export const client = createClient;
export const artifactRepository = makeNodeArtifactRepositoryAsyncPort();
export type LifecycleClient = Client;
`,
  "apps/cli/src/lib/agent-plugins/commands/binding.ts": `
import type { Client } from "@rawr/agent-plugin-lifecycle/client";

export type LifecycleClient = Client;
`,
  "apps/cli/src/lib/agent-plugins/commands/inline-client-protocol.ts": `
import {
  type Client,
  type CreateClientOptions,
} from "@rawr/agent-plugin-lifecycle/client";

export type LifecycleClient = Client;
export type LifecycleClientOptions = CreateClientOptions;
`,
  "apps/cli/src/lib/agent-plugins/commands/client-protocol-export.ts": `
export type { Client } from "@rawr/agent-plugin-lifecycle/client";
`,
  "apps/cli/src/lib/agent-plugins/commands/client-protocol-inline-export.ts": `
export {
  type Client,
  type CreateClientOptions,
} from "@rawr/agent-plugin-lifecycle/client";
`,
  "apps/cli/src/lib/agent-plugins/commands/client-protocol-star.ts": `
export type * from "@rawr/agent-plugin-lifecycle/client";
`,
  "apps/cli/src/lib/agent-plugins/inline-release-protocol.ts": `
import {
  type ContentAuthority,
  type ReleaseSetDigest,
} from "@rawr/agent-plugin-lifecycle/release";

export type Authority = ContentAuthority;
export type SetDigest = ReleaseSetDigest;
`,
  "apps/cli/src/lib/agent-plugins/commands/input.ts": `
import {
  createReleaseArtifactRef,
  parseArtifactDigest,
  type ArtifactRef,
} from "@rawr/agent-plugin-lifecycle/release";

export const createRef = createReleaseArtifactRef;
export const parseDigest = parseArtifactDigest;
export type ParsedArtifact = ArtifactRef;
`,
  "apps/cli/src/lib/agent-plugins/bindings/providers/native.ts": `
import { NativeProviderResourceFailure } from "@rawr/agent-plugin-lifecycle/bindings/providers";

export const failure = NativeProviderResourceFailure;
`,
  "apps/cli/src/lib/agent-plugins/service-runtime/providers/node-runtime.ts": `
import { createNodeNativeProviderResource } from "../../bindings/providers";
import { createResourceCompleteTargetIdentityReader } from "@rawr/agent-plugin-lifecycle/bindings/providers";

export const native = createNodeNativeProviderResource;
export const completeIdentities = createResourceCompleteTargetIdentityReader;
`,
};

afterEach(async () => {
  const canonicalTemp = await realpath(tmpdir());
  for (const root of roots.splice(0)) {
    const canonicalRoot = await realpath(root);
    const status = await lstat(canonicalRoot);
    if (
      !status.isDirectory()
      || dirname(canonicalRoot) !== canonicalTemp
      || !basename(canonicalRoot).startsWith("rawr-habitat-direction-test-")
    ) {
      throw new Error(`Refusing unsafe Habitat fixture cleanup: ${canonicalRoot}`);
    }
    await rm(canonicalRoot, { recursive: true });
  }
});

async function makeRepository(sources) {
  const root = await mkdtemp(join(tmpdir(), "rawr-habitat-direction-test-"));
  roots.push(root);
  const ruleDestination = join(
    root,
    ".habitat/rawr/agent-plugin-lifecycle/rules",
    RULE_ID,
  );
  await mkdir(ruleDestination, { recursive: true });
  await writeFile(
    join(root, ".habitat/index.json"),
    `${JSON.stringify({
      schemaVersion: 2,
      ownerRoots: {
        "@rawr/agent-plugin-lifecycle": "services/agent-plugin-lifecycle",
      },
    }, null, 2)}\n`,
  );
  await symlink(WORKSPACE_NODE_MODULES, join(root, "node_modules"), "dir");
  for (const filename of ["baseline.json", "pattern.md", "rule.json"]) {
    await writeFile(
      join(ruleDestination, filename),
      await readFile(join(RULE_SOURCE, filename)),
    );
  }
  for (const [filename, source] of Object.entries(sources)) {
    const destination = join(root, filename);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, source.trimStart());
  }
  return root;
}

function check(binary, root) {
  const result = spawnSync(binary, [
    "check",
    "--repo-root",
    root,
    "--rule",
    RULE_ID,
    "--json",
  ], { encoding: "utf8", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `Habitat check exited unexpectedly (status=${result.status}, signal=${result.signal}): ${result.stderr}`,
    );
  }
  if (!result.stdout.trim()) {
    throw new Error(
      `Habitat check produced no JSON (status=${result.status}, signal=${result.signal}): ${result.stderr}`,
    );
  }
  return {
    report: JSON.parse(result.stdout),
    status: result.status,
    stderr: result.stderr,
  };
}

function diagnosticPath(diagnostic) {
  return diagnostic.path ?? diagnostic.file ?? diagnostic.filename;
}

describe("agent plugin lifecycle dependency-direction Habitat rule", () => {
  it("executes every rejection arm and preserves the accepted projection", { timeout: 30_000 }, async () => {
    const [binary, rejectingRoot, acceptedRoot] = await Promise.all([
      provisionHabitatBinary(),
      makeRepository(rejectingSources),
      makeRepository(acceptedSources),
    ]);

    const rejected = check(binary, rejectingRoot);
    expect(rejected.status, rejected.stderr).toBe(1);
    expect(rejected.report.ok).toBeFalse();
    expect(rejected.report.rules).toHaveLength(1);
    expect(rejected.report.rules[0].status).toBe("fail");
    expect(
      rejected.report.rules[0].diagnostics,
      JSON.stringify(rejected.report.rules[0].diagnostics, null, 2),
    ).toHaveLength(68);

    const rootRouter = "services/agent-plugin-lifecycle/src/service/router.ts";
    const serviceBase = "services/agent-plugin-lifecycle/src/service/base.ts";
    const expectedLocations = [
      ...Object.keys(rejectingSources)
        .filter((filename) => filename !== rootRouter)
        .map((filename) => `${filename}:1`),
      `${serviceBase}:2`,
      `${rootRouter}:1`,
      `${rootRouter}:4`,
      `${rootRouter}:5`,
    ].sort();
    const observedLocations = rejected.report.rules[0].diagnostics
      .map((diagnostic) => `${diagnosticPath(diagnostic)}:${diagnostic.line}`)
      .sort();
    expect(observedLocations).toEqual(expectedLocations);

    const accepted = check(binary, acceptedRoot);
    expect(
      accepted.status,
      `${accepted.stderr}\n${JSON.stringify(accepted.report, null, 2)}`,
    ).toBe(0);
    expect(accepted.report.ok).toBeTrue();
    expect(accepted.report.rules).toHaveLength(1);
    expect(accepted.report.rules[0].status).toBe("pass");
    expect(accepted.report.rules[0].diagnostics).toEqual([]);
  });
});
