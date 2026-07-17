import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import path from "node:path";

import type { ProviderId, ProviderOwnerRuntime } from "@rawr/agent-plugin-lifecycle/ports/providers";
import { resolveControllerReentry } from "@rawr/core";

import type { ControllerProjectionBinding } from "../commands/binding";
import { LifecycleAuthorityBindingError } from "../commands/binding";
import { deriveAgentPluginControllerLayout } from "../layout";
import {
  CapsuleUndoControllerV1,
  createAgentPluginOwnerProtocolRegistryV1,
  openNodeCapsuleStateStoreV1,
  parseCapsuleStateBytes,
  type CapsuleStateEnvelopeV1,
  type UndoResult,
} from "../undo";
import { createNodeProviderOwnerRuntime, openNodeProviderState } from "./providers/node-state";
import { createNodeNativeProviderAdapterResolver } from "./providers/node-runtime";
import {
  createProviderOwnerProtocolRegistration,
  PROVIDER_OWNER,
  type ProviderOwnerProtocolRegistration,
} from "./providers/owner-protocol";

export async function createProductionAgentPluginUndo(
  binding: ControllerProjectionBinding,
): Promise<UndoResult> {
  return undoAgentPluginCapsuleAtDataRoot(binding, controllerDataRoot());
}

export async function undoAgentPluginCapsuleAtDataRoot(
  binding: ControllerProjectionBinding,
  dataRoot: string,
): Promise<UndoResult> {
  const layout = deriveAgentPluginControllerLayout({ dataRoot });
  if (!await capsuleRootExists(layout.capsuleRoot)) {
    return Object.freeze({
      kind: "NoCommittedCapsule",
      synchronization: Object.freeze({ kind: "NotAcquired" }),
    });
  }
  const codecRegistration = createProviderOwnerProtocolRegistration(unavailableProviderOwnerRuntime());
  const codecRegistry = createAgentPluginOwnerProtocolRegistryV1({}, codecRegistration);
  const observed = await readCapsuleState(layout.capsuleRoot, codecRegistry);
  validateProviderExecutableBindings(
    binding.providerExecutables as Readonly<Partial<Record<ProviderId, string>>>,
    requiredProviderExecutables(observed, codecRegistration),
  );
  const registry = capsuleUsesProviderOwner(observed)
    ? await createProductionOwnerRegistry(layout, binding)
    : createAgentPluginOwnerProtocolRegistryV1();
  const opened = await openNodeCapsuleStateStoreV1({ root: layout.capsuleRoot, registry });
  if (opened.kind === "Rejected") throw new LifecycleAuthorityBindingError(opened.failure.message);
  return await new CapsuleUndoControllerV1({ store: opened.store, registry }).undo({
    expectedStateDigest: observed.stateDigest,
  });
}

async function createProductionOwnerRegistry(
  layout: ReturnType<typeof deriveAgentPluginControllerLayout>,
  binding: ControllerProjectionBinding,
) {
  const state = await openNodeProviderState({
    providerProjectionRoot: layout.providerProjectionRoot,
    providerTargetStateRoot: layout.providerTargetStateRoot,
  });
  const adapter = createNodeNativeProviderAdapterResolver(
    state,
    binding.providerExecutables as Readonly<Partial<Record<ProviderId, string>>>,
  );
  const ownerRuntime = createNodeProviderOwnerRuntime({
    projections: state.projections,
    targets: state.targets,
    members: (provider, contentAuthority) => adapter(provider, contentAuthority),
  });
  return createAgentPluginOwnerProtocolRegistryV1(
    {},
    createProviderOwnerProtocolRegistration(ownerRuntime),
  );
}

function unavailableProviderOwnerRuntime(): ProviderOwnerRuntime {
  const unavailable = async (): Promise<never> => {
    throw new LifecycleAuthorityBindingError("Codec-only provider owner runtime cannot inspect or mutate state");
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

function capsuleUsesProviderOwner(state: CapsuleStateEnvelopeV1): boolean {
  const variant = state.body.state;
  if (variant.kind === "applying") {
    return variant.candidate.owner === PROVIDER_OWNER
      || variant.prior?.capsule.owner === PROVIDER_OWNER;
  }
  return variant.committed?.capsule.owner === PROVIDER_OWNER;
}

async function readCapsuleState(
  capsuleRoot: string,
  registry: Parameters<typeof parseCapsuleStateBytes>[1],
): Promise<CapsuleStateEnvelopeV1> {
  const statePath = path.join(capsuleRoot, "capsule-state-v1.json");
  const status = await lstat(statePath, { bigint: true });
  if (!status.isFile() || status.isSymbolicLink() || status.nlink !== 1n) {
    throw new LifecycleAuthorityBindingError("Capsule state must be one non-linked regular file");
  }
  const handle = await open(statePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = await handle.stat({ bigint: true });
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (
      before.dev !== after.dev
      || before.ino !== after.ino
      || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs
    ) {
      throw new LifecycleAuthorityBindingError("Capsule state changed during binding preflight");
    }
    return parseCapsuleStateBytes(bytes, registry);
  } finally {
    await handle.close();
  }
}

function requiredProviderExecutables(
  state: CapsuleStateEnvelopeV1,
  registration: ProviderOwnerProtocolRegistration,
): ReadonlySet<ProviderId> {
  const variant = state.body.state;
  const committed = variant.kind === "applying"
    ? variant.prior
    : variant.committed;
  if (committed === null || committed.capsule.owner !== PROVIDER_OWNER) return new Set();
  const providers = new Set<ProviderId>();
  for (const stored of committed.capsule.actions) {
    const action = registration.codec.parseAction(stored.action);
    if (
      action.kind === "SetMarketplace"
      || action.kind === "InstallMember"
      || action.kind === "EnableMember"
      || action.kind === "RetireMember"
    ) providers.add(action.target.provider);
  }
  return providers;
}

function validateProviderExecutableBindings(
  bindings: Readonly<Partial<Record<ProviderId, string>>>,
  required: ReadonlySet<ProviderId>,
): void {
  const supplied = (Object.keys(bindings) as ProviderId[]).sort();
  const expected = [...required].sort();
  if (
    supplied.length !== expected.length
    || supplied.some((provider, index) => provider !== expected[index])
  ) {
    throw new LifecycleAuthorityBindingError(
      `Undo requires exact provider executable bindings: ${expected.length === 0 ? "none" : expected.join(",")}`,
    );
  }
}

async function capsuleRootExists(capsuleRoot: string): Promise<boolean> {
  try {
    await lstat(capsuleRoot, { bigint: true });
    return true;
  } catch (error) {
    if (hasCode(error, "ENOENT")) return false;
    throw error;
  }
}

function hasCode(error: unknown, code: string): boolean {
  return error !== null
    && typeof error === "object"
    && "code" in error
    && error.code === code;
}

function controllerDataRoot(): string {
  const dataRoot = resolveControllerReentry().env.RAWR_DATA_DIR;
  if (dataRoot === undefined) {
    throw new LifecycleAuthorityBindingError("Verified controller data identity is unavailable");
  }
  return dataRoot;
}
