import { describe, expect, it, vi } from "vitest";

import PluginsInspect from "../../src/commands/plugins/inspect";
import PluginsInstall from "../../src/commands/plugins/install";
import PluginsLink from "../../src/commands/plugins/link";
import PluginsList from "../../src/commands/plugins/list";
import PluginsReset from "../../src/commands/plugins/reset";
import PluginsUninstall from "../../src/commands/plugins/uninstall";
import PluginsUpdate from "../../src/commands/plugins/update";
import { isRecoveryInvocation } from "../../src/lib/external-extensions/bootstrap";
import { ExternalExtensionCommand } from "../../src/lib/external-extensions/command";
import type { ExternalExtensionOperationResult } from "../../src/lib/external-extensions/model";
import { GUARDED_NATIVE_MANAGER_CONTRACT } from "../../src/lib/external-extensions/native-mutation";
import { emptyState } from "./fixtures";

describe("Template external extension command projections", () => {
  it("owns the complete bare external extension command set", () => {
    expect([
      PluginsInstall,
      PluginsLink,
      PluginsUninstall,
      PluginsList,
      PluginsInspect,
      PluginsUpdate,
      PluginsReset,
    ]).toHaveLength(7);
  });

  it("exposes no link dependency-install bypass and explicitly catches reset reinstall", () => {
    expect("install" in PluginsLink.flags).toBe(false);
    expect("reinstall" in PluginsReset.flags).toBe(true);
    expect("artifact" in PluginsInstall.args).toBe(true);
  });

  it("requires the injected manager to disable raw plugins, hooks, scripts, and ambient loading", () => {
    expect(GUARDED_NATIVE_MANAGER_CONTRACT).toEqual({
      userPlugins: false,
      packageScripts: false,
      externalHooks: false,
      autoInstall: false,
      envFiles: false,
      explicitConfig: "platform-null",
      home: "temporary",
      importSandbox: "controller-root-only",
    });
  });

  it.each([
    ["install", ["plugins", "install", "/tmp/example.tgz"]],
    ["link", ["plugins", "link", "/tmp/example"]],
    ["uninstall", ["plugins", "uninstall", "example"]],
    ["list", ["plugins", "list"]],
    ["inspect", ["plugins", "inspect", "example"]],
    ["update", ["plugins", "update"]],
    ["reset", ["plugins", "reset"]],
  ])("keeps plugins %s code-load-free before dispatch", (_name, argv) => {
    expect(isRecoveryInvocation(argv)).toBe(true);
  });

  it.each([
    ["root help", ["help"]],
    ["nested core help", ["help", "doctor"]],
  ])("keeps %s code-load-free", (_name, argv) => {
    expect(isRecoveryInvocation(argv)).toBe(true);
  });

  it("emits a truthful JSON error envelope before exiting on rejection", () => {
    const command = new ProjectionHarness();
    const log = vi.spyOn(command, "log").mockImplementation(() => undefined);
    vi.spyOn(command, "exit").mockImplementation((code) => {
      throw new Error(`EXIT:${code}`);
    });
    const state = emptyState();
    const result: ExternalExtensionOperationResult = {
      operation: "update",
      disposition: "reject",
      reason: "mixed update is not safe",
      reasonCode: "mixed-update-no-safe-native-seam",
      before: state,
      after: state,
    };

    expect(() => command.emit(result, { json: true, dryRun: false, yes: false })).toThrow("EXIT:1");

    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      ok: false,
      error: {
        code: "EXTERNAL_EXTENSION_OPERATION_REJECTED",
        message: result.reason,
        details: result,
      },
    });
  });

  it("emits a success envelope and does not exit for convergence", () => {
    const command = new ProjectionHarness();
    const log = vi.spyOn(command, "log").mockImplementation(() => undefined);
    const exit = vi.spyOn(command, "exit");
    const state = emptyState();
    const result: ExternalExtensionOperationResult = {
      operation: "reset",
      disposition: "converged",
      before: state,
      after: state,
    };

    command.emit(result, { json: true, dryRun: false, yes: false });

    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({ ok: true, data: result });
    expect(exit).not.toHaveBeenCalled();
  });

  it("fails when cleanup does not settle while preserving the completed native outcome", () => {
    const command = new ProjectionHarness();
    const log = vi.spyOn(command, "log").mockImplementation(() => undefined);
    vi.spyOn(command, "exit").mockImplementation((code) => {
      throw new Error(`EXIT:${code}`);
    });
    const before = emptyState();
    const after = { ...emptyState(), status: "valid" as const };
    const result: ExternalExtensionOperationResult = {
      operation: "install",
      disposition: "delegate-native",
      nativeStatus: "completed",
      cleanup: [{
        owner: "install-staging",
        status: "failed",
        error: "fixture cleanup failure",
      }],
      before,
      after,
    };

    expect(() => command.emit(result, { json: true, dryRun: false, yes: false })).toThrow("EXIT:1");

    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      ok: false,
      error: {
        code: "EXTERNAL_EXTENSION_OPERATION_FAILED",
        details: result,
      },
    });
  });
});

class ProjectionHarness extends ExternalExtensionCommand {
  constructor() {
    super([], {} as never);
  }

  async run(): Promise<void> {}

  emit(
    result: ExternalExtensionOperationResult,
    flags: { json: boolean; dryRun: boolean; yes: boolean },
  ): void {
    this.outputOperation(result, flags);
  }
}
