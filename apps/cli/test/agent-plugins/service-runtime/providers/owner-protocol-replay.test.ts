import { describe, expect, it } from "vitest";

import {
  createProviderMarketplaceRegistration,
  marketplaceState,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";
import type {
  AdapterProtocol,
  ProviderMemberFingerprint,
  ProviderSourceIdentity,
  ProjectionDigest,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import { success } from "@rawr/agent-plugin-lifecycle/bindings/providers";
import { createTargetIdentitySidecar, type ProviderMutationAction, type TargetIdentityObservation } from "@rawr/agent-plugin-lifecycle/bindings/providers";
import { parseProviderTarget } from "@rawr/agent-plugin-lifecycle/bindings/providers";
import {
  createProviderOwnerAction,
  createProviderOwnerObservedPost,
  createProviderOwnerProtocolRegistration,
  providerOwnerTargetBinding,
  type ProviderOwnerRuntime,
} from "../../../../src/lib/agent-plugins/service-runtime/providers/owner-protocol";

describe("provider owner protocol", () => {
  it("recovers an admitted sidecar, blocks substitution, and verifies exact prior absence", async () => {
    const target = mustTarget("/tmp/rawr-c3-owner-a");
    const sidecar = createTargetIdentitySidecar(target);
    const action = createProviderOwnerAction({
      kind: "AdmitTargetIdentity",
      target,
      sidecar,
    } satisfies ProviderMutationAction);
    const binding = providerOwnerTargetBinding(target, { kind: "absent" });
    let identity: TargetIdentityObservation = { kind: "present", sidecar };
    const runtime: ProviderOwnerRuntime = {
      readIdentity: async () => success(identity),
      removeIdentityExact: async ({ expected }) => {
        if (identity.kind !== "present" || identity.sidecar.identityDigest !== expected.identityDigest) {
          throw new Error("identity substitution");
        }
        identity = { kind: "absent" };
        return success(null);
      },
      readMarketplace: async () => success({ kind: "absent" }),
      restoreMarketplaceExact: async () => success(null),
      readMember: async () => success(null),
      restoreMemberExact: async () => success(null),
      readReceipt: async () => success({ kind: "absent" }),
      restoreReceiptExact: async () => success(null),
    };
    const registration = createProviderOwnerProtocolRegistration(runtime);
    const recovered = await registration.applyingRecovery.classifyStaged({ action, targets: [binding] });
    expect(recovered.kind).toBe("Applied");
    if (recovered.kind !== "Applied") return;
    const encoded = registration.codec.encodeAction(action);
    expect(registration.codec.parseAction(encoded)).toMatchObject({ kind: "AdmitTargetIdentity" });
    expect(() => registration.codec.parseAction({ ...encoded as object, extra: true })).toThrow();

    const other = mustTarget("/tmp/rawr-c3-owner-b");
    identity = { kind: "present", sidecar: createTargetIdentitySidecar(other) };
    expect((await registration.replay.classify({
      action,
      observedPost: recovered.observedPost,
      targets: [binding],
    })).kind).toBe("Ambiguous");

    identity = { kind: "present", sidecar };
    expect((await registration.replay.restore({
      action,
      observedPost: recovered.observedPost,
      targets: [binding],
    })).kind).toBe("Restored");
    expect(identity.kind).toBe("absent");
    expect(await registration.replay.verifyPrior({
      actions: [{ action, observedPost: recovered.observedPost }],
      targets: [binding],
    })).toEqual({ kind: "Verified" });
  });

  it("distinguishes transition and final registration actions and restores them in exact reverse", async () => {
    const target = mustTarget("/tmp/rawr-c3-owner-marketplace");
    const priorRegistration = marketplaceRegistration([
      marketplaceMember("alpha", "a", "1"),
      marketplaceMember("beta", "b", "2"),
    ]);
    const transitionRegistration = marketplaceRegistration([
      marketplaceMember("alpha", "c", "1"),
      marketplaceMember("beta", "b", "2"),
    ]);
    const finalRegistration = marketplaceRegistration([
      marketplaceMember("alpha", "c", "1"),
    ]);
    const prior: ProviderMarketplaceObservation = Object.freeze({
      kind: "present",
      state: marketplaceState(priorRegistration),
    });
    const transition = createProviderOwnerAction({
      kind: "SetMarketplace",
      role: "transition",
      target,
      prior,
      priorRegistration,
      registration: transitionRegistration,
    } satisfies ProviderMutationAction);
    const final = createProviderOwnerAction({
      kind: "SetMarketplace",
      role: "final",
      target,
      prior: Object.freeze({ kind: "present", state: marketplaceState(transitionRegistration) }),
      priorRegistration: transitionRegistration,
      registration: finalRegistration,
    } satisfies ProviderMutationAction);
    const binding = providerOwnerTargetBinding(target, { kind: "absent" });
    const transitionPost = createProviderOwnerObservedPost(
      transition,
      binding,
      Object.freeze({
        kind: "marketplace",
        observation: Object.freeze({ kind: "present", state: marketplaceState(transitionRegistration) }),
      }),
    );
    const finalPost = createProviderOwnerObservedPost(
      final,
      binding,
      Object.freeze({
        kind: "marketplace",
        observation: Object.freeze({ kind: "present", state: marketplaceState(finalRegistration) }),
      }),
    );
    expect(transitionPost.actionDigest).not.toBe(finalPost.actionDigest);

    let marketplace: ProviderMarketplaceObservation = finalPost.post.kind === "marketplace"
      ? finalPost.post.observation
      : Object.freeze({ kind: "absent" });
    const restored: string[] = [];
    const runtime: ProviderOwnerRuntime = {
      readIdentity: async () => success({ kind: "absent" }),
      removeIdentityExact: async () => success(null),
      readMarketplace: async () => success(marketplace),
      restoreMarketplaceExact: async ({ expected, prior: restorePrior }) => {
        expect(marketplace).toEqual(expected);
        marketplace = restorePrior;
        restored.push(restorePrior.kind === "present" ? restorePrior.state.projectionDigest : "absent");
        return success(null);
      },
      readMember: async () => success(null),
      restoreMemberExact: async () => success(null),
      readReceipt: async () => success({ kind: "absent" }),
      restoreReceiptExact: async () => success(null),
    };
    const registration = createProviderOwnerProtocolRegistration(runtime);
    registration.codec.validateActionSequence({ actions: [transition, final], mode: "applied-prefix" });
    registration.codec.validateActionSequence({ actions: [transition], mode: "applied-prefix" });
    expect(() => registration.codec.validateActionSequence({ actions: [final, transition], mode: "applied-prefix" }))
      .toThrow("Marketplace transition must be unique and precede final registration");
    expect(() => registration.codec.validateActionSequence({ actions: [transition], mode: "complete" }))
      .toThrow("Every complete provider target sequence must end with a receipt action");
    expect(await registration.replay.restore({ action: final, observedPost: finalPost, targets: [binding] }))
      .toEqual({ kind: "Restored" });
    expect(marketplace).toEqual({ kind: "present", state: marketplaceState(transitionRegistration) });
    expect(await registration.replay.restore({ action: transition, observedPost: transitionPost, targets: [binding] }))
      .toEqual({ kind: "Restored" });
    expect(marketplace).toEqual(prior);
    expect(restored).toEqual([
      transitionRegistration.projectionDigest,
      priorRegistration.projectionDigest,
    ]);
    expect(await registration.replay.verifyPrior({
      actions: [
        { action: transition, observedPost: transitionPost },
        { action: final, observedPost: finalPost },
      ],
      targets: [binding],
    })).toEqual({ kind: "Verified" });
  });
});

function marketplaceRegistration(
  members: Parameters<typeof createProviderMarketplaceRegistration>[0]["members"],
): ProviderMarketplaceRegistration {
  return createProviderMarketplaceRegistration({
    provider: "codex",
    adapterProtocol: "rawr-provider-adapter/codex@v1" as AdapterProtocol,
    marketplaceIdentity: "personal-rawr-hq" as ProviderSourceIdentity,
    members,
  });
}

function marketplaceMember(pluginId: "alpha" | "beta", projectionFill: string, fingerprintFill: string) {
  return Object.freeze({
    pluginId: pluginId as Parameters<typeof createProviderMarketplaceRegistration>[0]["members"][number]["pluginId"],
    nativeIdentity: `rawr:${pluginId}`,
    providerSourceIdentity: "personal-rawr-hq" as ProviderSourceIdentity,
    sourceProjectionDigest: `ap1_${projectionFill.repeat(64)}` as ProjectionDigest,
    memberFingerprint: `pm1_${fingerprintFill.repeat(64)}` as ProviderMemberFingerprint,
  });
}

function mustTarget(home: string) {
  const parsed = parseProviderTarget({ provider: "codex", home });
  if (!parsed.ok) throw new Error("invalid owner target fixture");
  return parsed.value;
}
