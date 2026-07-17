import { constants } from "node:fs";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "@rawr/agent-plugin-lifecycle/release";
import {
  createProviderMarketplaceRegistration,
  createTargetReceipt,
  failure,
  issue,
  marketplaceState,
  parseProviderDeploymentRequest,
  parseProviderTarget,
  renderCompleteProjection,
  visibleFingerprint,
  type ProviderMutationAction,
  type ProviderOwnerRuntime,
  type ProviderTargetPlan,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import { afterEach, describe, expect, it } from "vitest";

import { deriveAgentPluginControllerLayout } from "../../../src/lib/agent-plugins/layout";
import {
  CapsuleControllerWriterV1,
  createAgentPluginOwnerProtocolRegistryV1,
  openNodeCapsuleStateStoreV1,
} from "../../../src/lib/agent-plugins/undo";
import { CODEX_ADAPTER_PROTOCOL } from "@rawr/agent-plugin-lifecycle/ports/providers";
import { createNodeProviderLifecycleRuntime } from "../../../src/lib/agent-plugins/service-runtime/providers/node-runtime";
import {
  createExpectedProviderOwnerObservedPost,
  createProviderOwnerAction,
  createProviderOwnerProtocolRegistration,
  providerOwnerTargetBinding,
} from "../../../src/lib/agent-plugins/service-runtime/providers/owner-protocol";
import { createProviderUndoWriterV1 } from "../../../src/lib/agent-plugins/service-runtime/providers/provider-capsule";
import { undoAgentPluginCapsuleAtDataRoot } from "../../../src/lib/agent-plugins/service-runtime/undo";
import { createCanonicalStatus } from "../../../../../services/agent-plugin-lifecycle/src/service/modules/providers/internal/applications/canonical-status";
import { createManagedRetire } from "../../../../../services/agent-plugin-lifecycle/src/service/modules/providers/internal/applications/managed-retire";
import { productFixture } from "./providers/product-fixture";

describe("production lifecycle read-only binding", () => {
  let fixtureRoot: string | null = null;

  afterEach(async () => {
    if (fixtureRoot !== null) await removeOwnedFixture(fixtureRoot);
    fixtureRoot = null;
  });

  it("does not initialize capsule state while fresh-home canonical status is authority-blocked", async () => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c5-read-only-")));
    const dataRoot = path.join(fixtureRoot, "controller-data");
    await mkdir(dataRoot);
    const layout = deriveAgentPluginControllerLayout({ dataRoot });
    const before = await exactTree(dataRoot);

    const runtime = await createNodeProviderLifecycleRuntime({
      roots: {
        controllerDataRoot: dataRoot,
        providerProjectionRoot: layout.providerProjectionRoot,
        providerTargetStateRoot: layout.providerTargetStateRoot,
      },
      artifactReader: {
        read: async () => {
          throw new Error("Blocked status must not read a release artifact");
        },
      },
      artifactStoreRoot: layout.artifactStoreRoot,
      capsuleRoot: layout.capsuleRoot,
      providerExecutables: Object.freeze({}),
    });
    const result = await createCanonicalStatus(() => Object.freeze({
      ...runtime,
      channel: {
        resolve: async () => failure([issue(
          "CHANNEL_NOT_ELIGIBLE",
          "channel",
          "Fixture has no accepted channel",
        )]),
      },
    }))({
      kind: "canonical-status",
      channel: "current-main",
      locator: {
        repositoryIdentity: "git:github.com/example/personal-rawr-hq",
        workspaceRoot: path.join(fixtureRoot, "content"),
      },
      targets: [{ provider: "codex", home: path.join(fixtureRoot, "codex-home") }],
    });

    expect(result.ok && result.value[0]?.status).toBe("CONTENT_AHEAD_OF_ACCEPTANCE");
    expect(await exactTree(dataRoot)).toEqual(before);
  });

  it("reports an actually absent capsule without creating controller metadata", async () => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c5-read-only-")));
    const dataRoot = path.join(fixtureRoot, "controller-data");
    await mkdir(dataRoot);
    const before = await exactTree(dataRoot);

    const result = await undoAgentPluginCapsuleAtDataRoot(
      Object.freeze({ providerExecutables: Object.freeze({}) }),
      dataRoot,
    );

    expect(result).toEqual({
      kind: "NoCommittedCapsule",
      synchronization: { kind: "NotAcquired" },
    });
    expect(await exactTree(dataRoot)).toEqual(before);
  });

  it.runIf("Bun" in globalThis)(
    "inspects receipt-free native state before classifying managed retirement without writes",
    async () => {
      fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c5-read-only-")));
      for (const fixture of [
        Object.freeze({ name: "absent", exposure: "absent", expectedStatus: "ReadOnlyConverged" }),
        Object.freeze({ name: "native", exposure: "native", expectedStatus: "Blocked" }),
        Object.freeze({ name: "active-thread", exposure: "active-thread", expectedStatus: "Blocked" }),
        Object.freeze({ name: "config", exposure: "config", expectedStatus: "Blocked" }),
      ] as const) {
        const dataRoot = path.join(fixtureRoot, `${fixture.name}-controller-data`);
        const home = path.join(fixtureRoot, `${fixture.name}-codex-home`);
        const executablePath = path.join(fixtureRoot, `${fixture.name}-codex`);
        const auditPath = path.join(fixtureRoot, `${fixture.name}-audit.log`);
        await Promise.all([mkdir(dataRoot), mkdir(home)]);
        await writeFile(executablePath, readOnlyCodexScript({
          auditPath,
          home,
          exposure: fixture.exposure,
        }), { mode: 0o755 });
        await chmod(executablePath, 0o755);
        const layout = deriveAgentPluginControllerLayout({ dataRoot });
        const dataBefore = await exactTree(dataRoot);
        const homeBefore = await exactTree(home);
        const runtime = await createNodeProviderLifecycleRuntime({
          roots: {
            controllerDataRoot: dataRoot,
            providerProjectionRoot: layout.providerProjectionRoot,
            providerTargetStateRoot: layout.providerTargetStateRoot,
          },
          artifactReader: {
            read: async () => {
              throw new Error("Managed retirement must not read a release artifact");
            },
          },
          artifactStoreRoot: layout.artifactStoreRoot,
          capsuleRoot: layout.capsuleRoot,
          providerExecutables: Object.freeze({ codex: executablePath }),
        });

        const result = await createManagedRetire(() => runtime)({
          kind: "managed-retire",
          pluginId: "alpha",
          targets: [{ provider: "codex", home }],
        });

        expect(result.ok && result.value.status).toBe(fixture.expectedStatus);
        expect(await exactTree(dataRoot)).toEqual(dataBefore);
        expect(await exactTree(home)).toEqual(homeBefore);
        const audit = (await readFile(auditPath, "utf8")).trim().split("\n");
        expect(audit).toContain("plugin list --json");
        expect(audit).toContain("rpc:plugin/list");
        expect(audit).toContain("rpc:config/read");
        expect(audit.some(isProviderMutationAudit)).toBe(false);
      }
    },
    20_000,
  );

  it.runIf("Bun" in globalThis)(
    "refuses omitted or mismatched provider executables before capsule or provider state changes",
    async () => {
      fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c5-read-only-")));
      const dataRoot = path.join(fixtureRoot, "controller-data");
      await mkdir(dataRoot);
      await seedCodexProviderCapsule(dataRoot, path.join(fixtureRoot, "codex-home"));
      const before = await exactTree(dataRoot);

      await expect(undoAgentPluginCapsuleAtDataRoot(
        Object.freeze({ providerExecutables: Object.freeze({}) }),
        dataRoot,
      )).rejects.toThrow("exact provider executable bindings: codex");
      expect(await exactTree(dataRoot)).toEqual(before);

      await expect(undoAgentPluginCapsuleAtDataRoot(
        Object.freeze({
          providerExecutables: Object.freeze({
            codex: "/fixture/codex",
            claude: "/fixture/irrelevant-claude",
          }),
        }),
        dataRoot,
      )).rejects.toThrow("exact provider executable bindings: codex");
      expect(await exactTree(dataRoot)).toEqual(before);
    },
  );
});

async function seedCodexProviderCapsule(dataRoot: string, home: string): Promise<void> {
  const layout = deriveAgentPluginControllerLayout({ dataRoot });
  await mkdir(path.dirname(layout.capsuleRoot), { recursive: true });
  const registration = createProviderOwnerProtocolRegistration(unavailableProviderOwnerRuntime());
  const registry = createAgentPluginOwnerProtocolRegistryV1({}, registration);
  const opened = await openNodeCapsuleStateStoreV1({ root: layout.capsuleRoot, registry });
  if (opened.kind === "Rejected") throw new Error(opened.failure.message);
  const writer = createProviderUndoWriterV1(new CapsuleControllerWriterV1({
    store: opened.store,
    registry,
  }));
  const plan = providerPlan(home);
  const candidate = Object.freeze({
    protocol: "agent-plugin-lifecycle/provider-undo@v1" as const,
    plans: Object.freeze([plan]),
  });
  const preflight = await writer.preflight(candidate);
  if (!preflight.ok) throw new Error(preflight.issues[0]?.message ?? "provider capsule preflight failed");
  const begun = await writer.begin(candidate);
  if (!begun.ok) throw new Error(begun.issues[0]?.message ?? "provider capsule admission failed");
  const binding = providerOwnerTargetBinding(plan.target, Object.freeze({ kind: "absent" }));
  for (const step of plan.steps) {
    if (step.kind !== "mutate") continue;
    const staged = await begun.value.stage(step.action);
    if (!staged.ok) throw new Error(staged.issues[0]?.message ?? "provider capsule stage failed");
    const observed = createExpectedProviderOwnerObservedPost(
      createProviderOwnerAction(step.action),
      binding,
    );
    const applied = await begun.value.applied({ action: step.action, post: observed.post });
    if (!applied.ok) throw new Error(applied.issues[0]?.message ?? "provider capsule apply failed");
  }
  const settled = await begun.value.settle();
  if (!settled.ok) throw new Error(settled.issues[0]?.message ?? "provider capsule settlement failed");
}

function providerPlan(home: string): ProviderTargetPlan {
  const fixture = productFixture();
  const target = mustResult(parseProviderTarget({ provider: "codex", home }));
  const snapshot: Extract<VerifiedArtifactSnapshotV1, { kind: "complete-set" }> = Object.freeze({
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
    releaseSet: fixture.releaseSet,
    members: Object.freeze([
      releaseSnapshot(fixture.alphaRelease),
      releaseSnapshot(fixture.betaRelease),
    ]),
  });
  const projection = mustResult(renderCompleteProjection("codex", CODEX_ADAPTER_PROTOCOL, snapshot));
  const registration = createProviderMarketplaceRegistration({
    provider: "codex",
    adapterProtocol: projection.adapterProtocol,
    marketplaceIdentity: projection.marketplace.identity,
    members: projection.members.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: projection.projectionDigest,
      memberFingerprint: member.memberFingerprint,
    })),
  });
  const request = mustResult(parseProviderDeploymentRequest({
    kind: "complete-test",
    releaseSet: snapshot.ref,
    evaluationProfile: "provider-smoke@v1",
    targets: [{ provider: "codex", home }],
  }));
  if (request.kind !== "complete-test") throw new Error("provider capsule fixture request mode changed");
  const verifiedMembers = projection.members.map((member) => Object.freeze({
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: member.artifactAuthority,
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
  }));
  const receipt = createTargetReceipt({
    schemaVersion: 1,
    provider: "codex",
    targetDigest: target.targetDigest,
    generation: 1,
    lineage: Object.freeze({ kind: "initial" }),
    marketplace: marketplaceState(registration),
    scope: Object.freeze({
      kind: "complete-test",
      requestDigest: request.requestDigest,
      projectionDigest: projection.projectionDigest,
      adapterProtocol: projection.adapterProtocol,
      capabilityProfileDigest: projection.capabilityProfile.capabilityProfileDigest,
      visibleFingerprint: visibleFingerprint(verifiedMembers),
      verifiedMembers: Object.freeze(verifiedMembers),
      releaseSet: snapshot.ref,
      evaluationProfile: request.evaluationProfile,
    }),
    managedMembers: Object.freeze(verifiedMembers.map((member) => Object.freeze({
      ...member,
      sourceProjectionDigest: projection.projectionDigest,
    }))),
  });
  const actions: readonly ProviderMutationAction[] = Object.freeze([
    Object.freeze({
      kind: "SetMarketplace",
      role: "final",
      target,
      prior: Object.freeze({ kind: "absent" }),
      priorRegistration: null,
      registration,
    }),
    Object.freeze({
      kind: "PublishReceipt",
      target,
      prior: Object.freeze({ kind: "absent" }),
      receipt,
    }),
  ]);
  return Object.freeze({
    target,
    state: "mutating",
    projection,
    steps: Object.freeze(actions.map((action) => Object.freeze({ kind: "mutate" as const, action }))),
    issues: Object.freeze([]),
  });
}

function releaseSnapshot(release: ReturnType<typeof productFixture>["alphaRelease"]): VerifiedReleaseArtifactV1 {
  return Object.freeze({
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: release.artifactBody.payloadEntries.map((entry) => Object.freeze({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    })),
  });
}

function mustResult<T>(result: Readonly<{ ok: true; value: T } | { ok: false; issues: readonly { message: string }[] }>): T {
  if (!result.ok) throw new Error(result.issues[0]?.message ?? "fixture construction failed");
  return result.value;
}

function unavailableProviderOwnerRuntime(): ProviderOwnerRuntime {
  const unavailable = async (): Promise<never> => {
    throw new Error("Provider owner fixture must not inspect live state");
  };
  return Object.freeze({
    readIdentity: unavailable,
    removeIdentityExact: unavailable,
    readMarketplace: unavailable,
    restoreMarketplaceExact: unavailable,
    readMember: unavailable,
    restoreMemberExact: unavailable,
    readReceipt: unavailable,
    restoreReceiptExact: unavailable,
  });
}

function readOnlyCodexScript(input: Readonly<{
  auditPath: string;
  home: string;
  exposure: "absent" | "active-thread" | "config" | "native";
}>): string {
  const pluginRows = input.exposure === "native"
    ? [{
        pluginId: "alpha@manual",
        name: "alpha",
        marketplaceName: "manual",
        version: "1.0.0",
        installed: true,
        enabled: true,
      }]
    : [];
  const appMarketplaces = input.exposure === "active-thread"
    ? [{
        name: "manual",
        plugins: [{
          name: "alpha",
          version: "1.0.0",
          installed: true,
          enabled: true,
        }],
      }]
    : [];
  const configured = input.exposure === "config"
    ? { plugins: { "alpha@manual": { enabled: true } } }
    : {};
  const pluginList = JSON.stringify({ installed: pluginRows, available: [] });
  const appPluginList = JSON.stringify({ id: 2, result: { marketplaces: appMarketplaces } });
  const hookList = JSON.stringify({
    id: 3,
    result: { data: [{ cwd: input.home, hooks: [], errors: [] }] },
  });
  const configRead = JSON.stringify({ id: 2, result: { config: configured } });
  return `#!/bin/sh
set -eu
AUDIT=${shellLiteral(input.auditPath)}
printf '%s\n' "$*" >> "$AUDIT"
if [ "$*" = "app-server --listen stdio://" ]; then
  while IFS= read -r line; do
    case "$line" in
      *'"id":1,"method":"initialize"'*) printf '%s\n' '{"id":1,"result":{}}' ;;
      '{"method":"initialized","params":{}}') ;;
      *'"method":"plugin/list"'*) printf '%s\n' 'rpc:plugin/list' >> "$AUDIT"; printf '%s\n' ${shellLiteral(appPluginList)} ;;
      *'"method":"hooks/list"'*) printf '%s\n' 'rpc:hooks/list' >> "$AUDIT"; printf '%s\n' ${shellLiteral(hookList)} ;;
      *'"method":"config/read"'*) printf '%s\n' 'rpc:config/read' >> "$AUDIT"; printf '%s\n' ${shellLiteral(configRead)} ;;
      *'"method":"config/value/write"'*) printf '%s\n' 'rpc:config/value/write' >> "$AUDIT"; exit 70 ;;
      *) printf 'unexpected app-server input: %s\n' "$line" >&2; exit 65 ;;
    esac
  done
elif [ "$*" = "plugin --help" ]; then
  printf 'Commands:\n  list  list plugins\n  add  add plugin\n  remove  remove plugin\n'
elif [ "$*" = "plugin marketplace --help" ]; then
  printf 'Commands:\n  list  list markets\n  add  add market\n  remove  remove market\n'
elif [ "$*" = "plugin list --json" ]; then
  printf '%s\n' ${shellLiteral(pluginList)}
else
  printf 'unexpected command: %s\n' "$*" >&2
  exit 64
fi
`;
}

function shellLiteral(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function isProviderMutationAudit(entry: string): boolean {
  return entry === "rpc:config/value/write"
    || entry.startsWith("plugin add ")
    || entry.startsWith("plugin remove ")
    || entry.startsWith("plugin marketplace add ")
    || entry.startsWith("plugin marketplace remove ");
}

interface TreeEntry {
  readonly path: string;
  readonly kind: "directory" | "file";
  readonly mode: string;
  readonly size: string;
  readonly mtimeNs: string;
  readonly bytes: string | null;
}

async function exactTree(root: string): Promise<readonly TreeEntry[]> {
  const entries: TreeEntry[] = [];
  await appendTree(root, ".", entries);
  return Object.freeze(entries);
}

async function appendTree(root: string, relativePath: string, entries: TreeEntry[]): Promise<void> {
  const absolutePath = relativePath === "." ? root : path.join(root, relativePath);
  const status = await lstat(absolutePath, { bigint: true });
  if (status.isSymbolicLink() || (!status.isDirectory() && !status.isFile())) {
    throw new Error(`Read-only manifest refuses unsupported path: ${relativePath}`);
  }
  const common = Object.freeze({
    path: relativePath,
    mode: status.mode.toString(),
    size: status.size.toString(),
    mtimeNs: status.mtimeNs.toString(),
  });
  if (status.isFile()) {
    const handle = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      entries.push(Object.freeze({
        ...common,
        kind: "file",
        bytes: (await handle.readFile()).toString("base64"),
      }));
    } finally {
      await handle.close();
    }
    return;
  }
  entries.push(Object.freeze({ ...common, kind: "directory", bytes: null }));
  const names = await readdir(absolutePath);
  names.sort();
  for (const name of names) {
    await appendTree(root, relativePath === "." ? name : `${relativePath}/${name}`, entries);
  }
}

async function removeOwnedFixture(root: string): Promise<void> {
  const parent = await realpath(tmpdir());
  if (path.dirname(root) !== parent || !path.basename(root).startsWith("rawr-c5-read-only-")) {
    throw new Error("Refusing recursive cleanup outside the owned C5 read-only fixture root");
  }
  const status = await lstat(root);
  if (!status.isDirectory() || status.isSymbolicLink() || await realpath(root) !== root) {
    throw new Error("Refusing recursive cleanup of a non-canonical C5 read-only fixture root");
  }
  await rm(root, { recursive: true });
}
