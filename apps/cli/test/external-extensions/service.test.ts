import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import type {
  CandidateInspection,
  NativeRegistryProjection,
  QuarantinedExternalExtension,
  StaticExternalExtension,
} from "../../src/lib/external-extensions/model";
import type {
  NativeMutationDispatchResult,
  NativeMutationPort,
  NativeMutationRequest,
} from "../../src/lib/external-extensions/native-mutation";
import type { ExternalExtensionStatePort } from "../../src/lib/external-extensions/native-registry";
import { nativeInstallArtifactName } from "../../src/lib/external-extensions/install-provenance";
import {
  ExternalExtensionService,
  type ExternalExtensionPreparationPort,
  type InspectedInstallArtifact,
  type PreparedInstallArtifact,
  type PreparedUpdate,
} from "../../src/lib/external-extensions/service";
import { activeState, emptyState, quarantinedState, staticExtension } from "./fixtures";

describe("external extension operation policy", () => {
  it("performs zero native dispatch for every converged operation", async () => {
    const extension = staticExtension();
    const mutation = new RecordingMutation();

    const installCleanup = counter();
    const install = service({
      state: immutableInstallState(extension),
      inspection: accepted(extension),
      mutation,
      installStaging: stagedInstall(installCleanup.increment),
    });
    expect((await install.install("/tmp/fixture.tgz")).disposition).toBe("converged");
    expect(installCleanup.value()).toBe(0);

    const linkedState = activeState(extension, {
      name: extension.packageId,
      type: "link",
      root: extension.canonicalRoot,
    });
    const link = service({ state: linkedState, inspection: accepted(extension), mutation });
    expect((await link.link(extension.root)).disposition).toBe("converged");

    const update = service({
      state: immutableInstallState(extension),
      inspection: accepted(extension),
      mutation,
      updatePreparation: localUpdate(extension),
    });
    expect((await update.update()).disposition).toBe("converged");

    const absent = service({ state: emptyState(), inspection: accepted(extension), mutation });
    expect((await absent.uninstall(extension.packageId)).disposition).toBe("converged");
    expect((await absent.reset({ hard: false, reinstall: false })).disposition).toBe("converged");
    expect((await absent.reset({ hard: true, reinstall: false })).disposition).toBe("converged");

    expect(mutation.requests).toEqual([]);
  });

  it("does not stage a converged immutable install", async () => {
    const extension = staticExtension();
    const preparation = new FixedPreparation(
      inspectedInstall(extension),
      emptyUpdate(),
      stagedInstall(),
    );
    const mutation = new RecordingMutation();
    const subject = new ExternalExtensionService(
      new MutableState(immutableInstallState(extension), accepted(extension)),
      preparation,
      mutation,
    );

    const result = await subject.install("/tmp/fixture.tgz");

    expect(result.disposition).toBe("converged");
    expect(preparation.stageCalls).toBe(0);
    expect(mutation.requests).toEqual([]);
  });

  it("links with --no-install and postvalidates actual native state", async () => {
    const extension = staticExtension({ root: "/external/link" });
    const state = new MutableState(emptyState(), accepted(extension));
    const mutation = new RecordingMutation(async () => {
      state.current = activeState(extension, {
        name: extension.packageId,
        type: "link",
        root: extension.canonicalRoot,
      });
    });
    const subject = makeService(state, mutation);

    const result = await subject.link(extension.root);

    expect(result).toMatchObject({ disposition: "delegate-native", nativeStatus: "completed" });
    expect(mutation.requests).toEqual([
      expect.objectContaining({
        commandExport: "plugins:link",
        argv: [extension.canonicalRoot, "--no-install"],
        contract: expect.objectContaining({
          userPlugins: false,
          packageScripts: false,
          externalHooks: false,
          importSandbox: "controller-root-only",
        }),
      }),
    ]);
  });

  it("delegates the exact inspected local install artifact", async () => {
    const extension = staticExtension();
    const artifactPath = path.resolve("/tmp/external-fixture.tgz");
    const state = new MutableState(emptyState(), accepted(extension));
    const mutation = new RecordingMutation(async () => {
      state.current = immutableInstallState(extension);
    });
    const preparation = new FixedPreparation(
      inspectedInstall(extension, artifactPath),
      emptyUpdate(),
      stagedInstall(async () => {}, artifactPath),
    );
    const subject = new ExternalExtensionService(state, preparation, mutation);

    const result = await subject.install(artifactPath);

    expect(result.disposition).toBe("delegate-native");
    expect(result.reason).toBeUndefined();
    expect(mutation.requests).toEqual([
      expect.objectContaining({
        commandExport: "plugins:install",
        argv: [`file:${artifactPath}`, "--silent"],
        inspectedArtifact: { path: artifactPath, sha256: "b".repeat(64) },
      }),
    ]);
  });

  it.each(["success", "failure"] as const)(
    "keeps the staged artifact alive through deferred native dispatch %s",
    async (outcome) => {
      const extension = staticExtension();
      const artifactPath = path.resolve("/tmp/deferred-external-fixture.tgz");
      const state = new MutableState(emptyState(), accepted(extension));
      let cleaned = false;
      let dispatchStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        dispatchStarted = resolve;
      });
      let releaseDispatch!: () => void;
      const released = new Promise<void>((resolve) => {
        releaseDispatch = resolve;
      });
      const mutation = new RecordingMutation(async () => {
        expect(cleaned).toBe(false);
        dispatchStarted();
        await released;
        expect(cleaned).toBe(false);
        if (outcome === "failure") throw new Error("fixture native failure");
        state.current = immutableInstallState(extension);
      });
      const subject = new ExternalExtensionService(
        state,
        new FixedPreparation(
          inspectedInstall(extension, artifactPath),
          emptyUpdate(),
          stagedInstall(async () => {
            cleaned = true;
          }, artifactPath),
        ),
        mutation,
      );

      const pending = subject.install(artifactPath);
      await started;
      expect(cleaned).toBe(false);
      releaseDispatch();
      const result = await pending;

      expect(cleaned).toBe(true);
      expect(result.nativeStatus).toBe(outcome === "success" ? "completed" : "failed");
    },
  );

  it("preserves a completed native install result when staging cleanup fails", async () => {
    const extension = staticExtension();
    const artifactPath = path.resolve("/tmp/cleanup-failure-fixture.tgz");
    const state = new MutableState(emptyState(), accepted(extension));
    const mutation = new RecordingMutation(async () => {
      state.current = immutableInstallState(extension);
    });
    const subject = new ExternalExtensionService(
      state,
      new FixedPreparation(
        inspectedInstall(extension, artifactPath),
        emptyUpdate(),
        stagedInstall(async () => {
          throw new Error("fixture install staging cleanup failure");
        }, artifactPath),
      ),
      mutation,
    );

    const result = await subject.install(artifactPath);

    expect(result).toMatchObject({
      disposition: "delegate-native",
      nativeStatus: "completed",
      cleanup: [
        { owner: "native-manager-temporary", status: "completed" },
        {
          owner: "install-staging",
          status: "failed",
          error: "fixture install staging cleanup failure",
        },
      ],
    });
    expect(result.after.active).toHaveLength(1);
  });

  it("replaces a matching mutable link when installing an immutable artifact", async () => {
    const extension = staticExtension();
    const state = new MutableState(activeState(extension, {
      name: extension.packageId,
      type: "link",
      root: extension.canonicalRoot,
    }), accepted(extension));
    const mutation = new RecordingMutation(async () => {
      state.current = immutableInstallState(extension);
    });

    const result = await makeService(state, mutation).install("/tmp/fixture.tgz");

    expect(result).toMatchObject({ disposition: "delegate-native", nativeStatus: "completed" });
    expect(result.reason).toBeUndefined();
    expect(result.after.active[0]?.entry.type).toBe("user");
    expect(mutation.requests).toHaveLength(1);
  });

  it("does not accept a native install no-op as postvalidated activation", async () => {
    const extension = staticExtension();
    const subject = service({
      state: emptyState(),
      inspection: accepted(extension),
      mutation: new RecordingMutation(),
      installInspection: inspectedInstall(extension),
    });

    const result = await subject.install("/tmp/fixture.tgz");

    expect(result).toMatchObject({
      disposition: "delegate-native",
      nativeStatus: "completed",
      reason: expect.stringContaining("did not pass guarded postvalidation"),
    });
  });

  it("does not converge a matching user manifest from a different artifact digest", async () => {
    const extension = staticExtension();
    const mutation = new RecordingMutation();
    const subject = service({
      state: immutableInstallState(extension, "c".repeat(64)),
      inspection: accepted(extension),
      mutation,
      installInspection: inspectedInstall(extension),
    });

    const result = await subject.install("/tmp/fixture.tgz");

    expect(result.disposition).toBe("delegate-native");
    expect(mutation.requests).toHaveLength(1);
  });

  it("does not converge an immutable install whose dependency provenance mismatches its user entry", async () => {
    const extension = staticExtension();
    const matching = immutableInstallState(extension);
    const entry = matching.active[0]?.entry;
    if (entry?.type !== "user") throw new Error("fixture local entry missing");
    const mismatchedDependency = immutableInstallState(extension, "c".repeat(64)).active[0]?.entry;
    if (mismatchedDependency?.type !== "user") throw new Error("fixture mismatch missing");
    const state = activeState(extension, {
      ...entry,
      dependencySpec: mismatchedDependency.dependencySpec,
    });
    const mutation = new RecordingMutation();

    const result = await service({ state, mutation }).install("/tmp/fixture.tgz");

    expect(result.disposition).toBe("delegate-native");
    expect(mutation.requests).toHaveLength(1);
  });

  it("rejects candidate policy failures before native mutation", async () => {
    const quarantine = quarantineFixture("reserved-surface-collision");
    const mutation = new RecordingMutation();
    const cleanup = counter();
    const preparation = new FixedPreparation(
      {
        sourcePath: "/tmp/rejected.tgz",
        artifactSha256: "b".repeat(64),
        candidate: { accepted: false, quarantine },
      },
      emptyUpdate(),
      stagedInstall(cleanup.increment, "/tmp/rejected.tgz"),
    );
    const subject = new ExternalExtensionService(
      new MutableState(emptyState(), { accepted: false, quarantine }),
      preparation,
      mutation,
    );

    const result = await subject.install("/tmp/rejected.tgz");

    expect(result.disposition).toBe("reject");
    expect(mutation.requests).toEqual([]);
    expect(cleanup.value()).toBe(0);
  });

  it("rejects reset --reinstall before native dispatch", async () => {
    const extension = staticExtension();
    const mutation = new RecordingMutation();
    const subject = service({ state: activeState(extension), inspection: accepted(extension), mutation });

    const result = await subject.reset({ hard: false, reinstall: true });

    expect(result).toMatchObject({ disposition: "reject", reason: expect.stringContaining("not permitted") });
    expect(mutation.requests).toEqual([]);
  });

  it("keeps uninstall usable for a deleted linked path without candidate inspection", async () => {
    const entry = { name: "@fixture/deleted", type: "link" as const, root: "/deleted/link" };
    const quarantine = quarantineFixture("root-missing", entry);
    const state = new MutableState(quarantinedState(quarantine), { accepted: false, quarantine });
    const mutation = new RecordingMutation(async () => {
      state.current = emptyState();
    });
    const subject = makeService(state, mutation);

    const result = await subject.uninstall(entry.name);

    expect(result.disposition).toBe("delegate-native");
    expect(mutation.requests[0]).toMatchObject({
      commandExport: "plugins:uninstall",
      argv: [entry.name],
    });
    expect(state.inspections).toBe(0);
  });

  it("uses an active link's canonical root as the inspect and uninstall identity", async () => {
    const extension = {
      ...staticExtension({ root: "/canonical/external" }),
      root: "/aliased/external",
      canonicalRoot: "/canonical/external",
    };
    const state = new MutableState(activeState(extension, {
      name: extension.packageId,
      type: "link",
      root: extension.root,
    }), accepted(extension));
    const mutation = new RecordingMutation(async () => {
      state.current = emptyState();
    });
    const subject = makeService(state, mutation);

    expect(await subject.inspect(extension.canonicalRoot)).toMatchObject({
      found: true,
      state: "active",
    });
    const result = await subject.uninstall(extension.canonicalRoot);

    expect(result).toMatchObject({ disposition: "delegate-native", nativeStatus: "completed" });
    expect(mutation.requests).toEqual([
      expect.objectContaining({
        commandExport: "plugins:uninstall",
        argv: [extension.packageId],
      }),
    ]);
  });

  it("never interprets a package identity as a cwd-relative linked path", async () => {
    const requestedPackage = "@fixture/requested";
    const collidingRoot = path.resolve(requestedPackage);
    const extension = staticExtension({
      packageId: "@fixture/unrelated",
      root: collidingRoot,
    });
    const state = new MutableState(activeState(extension, {
      name: extension.packageId,
      type: "link",
      root: collidingRoot,
    }), accepted(extension));
    const mutation = new RecordingMutation();
    const subject = makeService(state, mutation);

    expect(await subject.inspect(requestedPackage)).toEqual({
      found: false,
      identity: requestedPackage,
    });
    expect(await subject.uninstall(requestedPackage)).toMatchObject({
      disposition: "converged",
    });
    expect(mutation.requests).toEqual([]);
  });

  it("resolves an explicit relative linked-root locator without treating packages as paths", async () => {
    const canonicalRoot = path.join(process.cwd(), "fixture-relative-extension");
    const relativeRoot = "./fixture-relative-extension";
    const extension = staticExtension({ root: canonicalRoot });
    const state = new MutableState(activeState(extension, {
      name: extension.packageId,
      type: "link",
      root: canonicalRoot,
    }), accepted(extension));
    const mutation = new RecordingMutation(async () => {
      state.current = emptyState();
    });
    const subject = makeService(state, mutation);

    expect(await subject.inspect(relativeRoot)).toMatchObject({ found: true, state: "active" });
    expect(await subject.uninstall(relativeRoot)).toMatchObject({
      disposition: "delegate-native",
      nativeStatus: "completed",
    });
    expect(mutation.requests[0]?.argv).toEqual([extension.packageId]);
  });

  it("rejects an ambiguous bare relative uninstall identity", async () => {
    const mutation = new RecordingMutation();
    const result = await service({ state: emptyState(), mutation }).uninstall("plugins/example");

    expect(result).toMatchObject({ disposition: "reject" });
    expect(result.reason).toContain("explicit ./ or ../ path");
    expect(mutation.requests).toEqual([]);
  });

  it("uses native hard reset to recover a malformed registry", async () => {
    const malformed: NativeRegistryProjection = {
      registryPath: "/native/package.json",
      status: "malformed",
      hasResidue: true,
      active: [],
      quarantined: [quarantineFixture("registry-malformed")],
    };
    const state = new MutableState(malformed, { accepted: false, quarantine: malformed.quarantined[0]! });
    const mutation = new RecordingMutation(async () => {
      state.current = emptyState();
    });
    const subject = makeService(state, mutation);

    const result = await subject.reset({ hard: false, reinstall: false });

    expect(result.disposition).toBe("delegate-native");
    expect(mutation.requests[0]).toMatchObject({ commandExport: "plugins:reset", argv: ["--hard"] });
  });

  it("does not claim update convergence from malformed state with no known entries", async () => {
    const malformed: NativeRegistryProjection = {
      registryPath: "/native/package.json",
      status: "malformed",
      hasResidue: true,
      active: [],
      quarantined: [quarantineFixture("registry-malformed")],
    };
    const mutation = new RecordingMutation();

    const result = await service({ state: malformed, mutation }).update();

    expect(result).toMatchObject({ disposition: "reject", reason: expect.stringContaining("incomplete") });
    expect(mutation.requests).toEqual([]);
  });

  it("uses native hard reset to recover package residue hidden behind an empty plugin list", async () => {
    const residue: NativeRegistryProjection = {
      registryPath: "/native/package.json",
      status: "valid",
      hasResidue: true,
      active: [],
      quarantined: [quarantineFixture("native-package-residue")],
    };
    const state = new MutableState(residue, { accepted: false, quarantine: residue.quarantined[0]! });
    const mutation = new RecordingMutation(async () => {
      state.current = emptyState();
    });

    const result = await makeService(state, mutation).reset({ hard: false, reinstall: false });

    expect(result).toMatchObject({ disposition: "delegate-native", nativeStatus: "completed" });
    expect(mutation.requests).toEqual([
      expect.objectContaining({ commandExport: "plugins:reset", argv: ["--hard"] }),
    ]);
  });

  it("delegates package uninstall when malformed native state cannot prove absence", async () => {
    const malformed: NativeRegistryProjection = {
      registryPath: "/native/package.json",
      status: "malformed",
      hasResidue: true,
      active: [],
      quarantined: [quarantineFixture("registry-malformed")],
    };
    const state = new MutableState(malformed, { accepted: false, quarantine: malformed.quarantined[0]! });
    const mutation = new RecordingMutation(async () => {
      state.current = emptyState();
    });

    const result = await makeService(state, mutation).uninstall("@fixture/external");

    expect(result).toMatchObject({ disposition: "delegate-native", nativeStatus: "completed" });
    expect(mutation.requests).toEqual([
      expect.objectContaining({
        commandExport: "plugins:uninstall",
        argv: ["@fixture/external"],
      }),
    ]);
  });

  it("rejects an unresolved linked path instead of claiming malformed state is converged", async () => {
    const malformed: NativeRegistryProjection = {
      registryPath: "/native/package.json",
      status: "malformed",
      hasResidue: true,
      active: [],
      quarantined: [quarantineFixture("registry-malformed")],
    };
    const mutation = new RecordingMutation();

    const result = await service({ state: malformed, mutation }).uninstall("/deleted/link");

    expect(result).toMatchObject({ disposition: "reject", reason: expect.stringContaining("cannot resolve") });
    expect(mutation.requests).toEqual([]);
  });

  it("keeps explicit hard reset read-only when registry state is already empty", async () => {
    const mutation = new RecordingMutation();

    const result = await service({ state: emptyState(), mutation }).reset({
      hard: true,
      reinstall: false,
    });

    expect(result).toMatchObject({ disposition: "converged" });
    expect(mutation.requests).toEqual([]);
  });

  it("reports completed native recovery that leaves registry residue as unhealthy", async () => {
    const extension = staticExtension();
    const state = new MutableState(activeState(extension), accepted(extension));
    const mutation = new RecordingMutation();
    const subject = makeService(state, mutation);

    const uninstall = await subject.uninstall(extension.packageId);
    const reset = await subject.reset({ hard: false, reinstall: false });

    expect(uninstall).toMatchObject({
      nativeStatus: "completed",
      reason: expect.stringContaining("left"),
    });
    expect(reset).toMatchObject({
      nativeStatus: "completed",
      reason: expect.stringContaining("residue"),
    });
  });

  it("reports native failure residue as quarantined while preserving recovery state", async () => {
    const extension = staticExtension();
    const residue = quarantineFixture("command-manifest-malformed", {
      name: extension.packageId,
      type: "user",
    });
    const state = new MutableState(emptyState(), accepted(extension));
    const mutation = new RecordingMutation(async () => {
      state.current = quarantinedState(residue);
      throw new Error("native install fault");
    });
    const subject = service({
      mutableState: state,
      mutation,
      installInspection: inspectedInstall(extension),
    });

    const result = await subject.install("/tmp/fixture.tgz");

    expect(result).toMatchObject({
      disposition: "delegate-native",
      nativeStatus: "failed",
      reason: "native install fault",
      after: { quarantined: [expect.objectContaining({ identity: extension.packageId })] },
    });
  });

  it("quarantines actual update output that differs from preflight approval", async () => {
    const oldExtension = staticExtension({ fingerprint: "a".repeat(64) });
    const expected = staticExtension({ fingerprint: "c".repeat(64) });
    const residue = quarantineFixture("reserved-surface-collision", {
      name: expected.packageId,
      type: "user",
    });
    const state = new MutableState(activeState(oldExtension), accepted(expected));
    const mutation = new RecordingMutation(async () => {
      state.current = quarantinedState(residue);
    });
    const subject = service({
      mutableState: state,
      mutation,
      updatePreparation: nativeUpdate(oldExtension),
    });

    const result = await subject.update();

    expect(result).toMatchObject({
      disposition: "delegate-native",
      nativeStatus: "completed",
      reason: expect.stringContaining("quarantined"),
      after: { quarantined: [expect.objectContaining({ identity: expected.packageId })] },
    });
    expect(mutation.requests[0]?.commandExport).toBe("plugins:update");
  });

  it("delegates an update whose fetched bytes cannot be proven locally", async () => {
    const extension = staticExtension();
    const mutation = new RecordingMutation();
    const subject = service({
      state: activeState(extension),
      mutation,
      updatePreparation: nativeUpdate(extension),
    });

    const result = await subject.update();

    expect(result).toMatchObject({ disposition: "delegate-native", nativeStatus: "completed" });
    expect(mutation.requests).toEqual([
      expect.objectContaining({ commandExport: "plugins:update", argv: [] }),
    ]);
  });

  it("rejects mixed local and native update input before the global native command", async () => {
    const local = staticExtension({ packageId: "@fixture/local" });
    const native = staticExtension({ packageId: "@fixture/native" });
    const localState = immutableInstallState(local);
    const nativeState = activeState(native);
    const state: NativeRegistryProjection = {
      registryPath: "/native/package.json",
      status: "valid",
      hasResidue: true,
      active: [...localState.active, ...nativeState.active],
      quarantined: [],
    };
    const mutation = new RecordingMutation();
    const preparedLocal = localUpdate(local);
    const preparedNative = nativeUpdate(native);
    const subject = service({
      state,
      mutation,
      updatePreparation: {
        entries: [...preparedLocal.entries, ...preparedNative.entries],
      },
    });

    const result = await subject.update();

    expect(result).toMatchObject({
      disposition: "reject",
      reasonCode: "mixed-update-no-safe-native-seam",
      reason: expect.stringContaining("Uninstall the local extension"),
    });
    expect(mutation.requests).toEqual([]);
  });

  it("rejects update when a native user entry has no dependency binding", async () => {
    const extension = staticExtension();
    const bound = immutableInstallState(extension).active[0]?.entry;
    if (bound?.type !== "user") throw new Error("fixture local entry missing");
    const { dependencySpec: _missing, ...entry } = bound;
    const quarantine = quarantineFixture("native-dependency-missing", entry);
    const mutation = new RecordingMutation();
    const subject = service({
      state: quarantinedState(quarantine),
      mutation,
      updatePreparation: {
        entries: [{
          kind: "reject",
          entry,
          reason: `Native user entry ${entry.name} has no matching package dependency`,
        }],
      },
    });

    const result = await subject.update();

    expect(result).toMatchObject({
      disposition: "reject",
      reason: expect.stringContaining("no matching package dependency"),
    });
    expect(mutation.requests).toEqual([]);
  });
});

class MutableState implements ExternalExtensionStatePort {
  inspections = 0;

  constructor(
    public current: NativeRegistryProjection,
    private readonly inspection: CandidateInspection,
  ) {}

  async inspectRoot(): Promise<CandidateInspection> {
    this.inspections += 1;
    return this.inspection;
  }

  async read(): Promise<NativeRegistryProjection> {
    return this.current;
  }
}

class RecordingMutation implements NativeMutationPort {
  readonly requests: NativeMutationRequest[] = [];

  constructor(private readonly effect: () => Promise<void> = async () => {}) {}

  async dispatch(request: NativeMutationRequest): Promise<NativeMutationDispatchResult> {
    this.requests.push(request);
    await this.effect();
    return {
      cleanup: { owner: "native-manager-temporary", status: "completed" },
    };
  }
}

class FixedPreparation implements ExternalExtensionPreparationPort {
  stageCalls = 0;

  constructor(
    private readonly inspectionValue: InspectedInstallArtifact,
    private readonly updateValue: PreparedUpdate,
    private readonly stagingValue: PreparedInstallArtifact = stagedInstall(),
  ) {}

  async inspectInstall(): Promise<InspectedInstallArtifact> {
    return this.inspectionValue;
  }

  async stageInstall(): Promise<PreparedInstallArtifact> {
    this.stageCalls += 1;
    return this.stagingValue;
  }

  async prepareUpdate(): Promise<PreparedUpdate> {
    return this.updateValue;
  }
}

function service(input: {
  state?: NativeRegistryProjection;
  mutableState?: MutableState;
  inspection?: CandidateInspection;
  mutation: NativeMutationPort;
  installInspection?: InspectedInstallArtifact;
  installStaging?: PreparedInstallArtifact;
  updatePreparation?: PreparedUpdate;
}): ExternalExtensionService {
  const extension = staticExtension();
  const state =
    input.mutableState ??
    new MutableState(input.state ?? emptyState(), input.inspection ?? accepted(extension));
  return new ExternalExtensionService(
    state,
    new FixedPreparation(
      input.installInspection ?? inspectedInstall(extension),
      input.updatePreparation ?? emptyUpdate(),
      input.installStaging ?? stagedInstall(),
    ),
    input.mutation,
  );
}

function makeService(state: MutableState, mutation: NativeMutationPort): ExternalExtensionService {
  const extension = staticExtension();
  return new ExternalExtensionService(
    state,
    new FixedPreparation(inspectedInstall(extension), emptyUpdate()),
    mutation,
  );
}

function inspectedInstall(
  extension: StaticExternalExtension,
  artifactPath = "/tmp/fixture.tgz",
): InspectedInstallArtifact {
  return {
    sourcePath: artifactPath,
    artifactSha256: "b".repeat(64),
    candidate: accepted(extension),
  };
}

function stagedInstall(
  cleanup: () => Promise<void> = async () => {},
  artifactPath = "/tmp/fixture.tgz",
): PreparedInstallArtifact {
  return { artifactPath, artifactSha256: "b".repeat(64), cleanup };
}

function emptyUpdate(): PreparedUpdate {
  return { entries: [] };
}

function localUpdate(extension: StaticExternalExtension): PreparedUpdate {
  const entry = immutableInstallState(extension).active[0]?.entry;
  if (entry?.type !== "user") throw new Error("fixture local entry missing");
  return { entries: [{ kind: "proven-local", entry, extension }] };
}

function nativeUpdate(extension: StaticExternalExtension): PreparedUpdate {
  return {
    entries: [{
      kind: "delegate-native",
      entry: {
        name: extension.packageId,
        type: "user",
        tag: "latest",
        dependencySpec: extension.version,
      },
    }],
  };
}

function accepted(extension: StaticExternalExtension): CandidateInspection {
  return { accepted: true, extension };
}

function immutableInstallState(
  extension: StaticExternalExtension,
  artifactSha256 = "b".repeat(64),
): NativeRegistryProjection {
  const artifactName = nativeInstallArtifactName({
    artifactSha256,
    staticFingerprint: extension.fingerprint,
  });
  const artifactUrl = pathToFileURL(
    path.join("/tmp/rawr-external-artifact-fixture", artifactName),
  ).href;
  return activeState(extension, {
    name: extension.packageId,
    type: "user",
    url: artifactUrl,
    dependencySpec: artifactUrl,
  });
}

function quarantineFixture(
  code:
    | "command-manifest-malformed"
    | "native-dependency-missing"
    | "native-package-residue"
    | "registry-malformed"
    | "reserved-surface-collision"
    | "root-missing",
  entry?: QuarantinedExternalExtension["entry"],
): QuarantinedExternalExtension {
  return {
    identity: entry?.name ?? "@fixture/external",
    ...(entry ? { entry } : {}),
    reason: { code, message: `fixture ${code}` },
  };
}

function counter(): { increment(): Promise<void>; value(): number } {
  let value = 0;
  return {
    async increment() {
      value += 1;
    },
    value: () => value,
  };
}
