import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const binding = vi.hoisted(() => ({
  profile: Object.freeze({ identity: "test-production-profile" }),
  bind: vi.fn(),
  select: vi.fn(),
  status: vi.fn(),
}));

vi.mock("../../src/lib/agent-plugins/profiles/production", () => ({
  productionLifecycleProfile: binding.profile,
}));

vi.mock("../../src/lib/agent-plugins/service-runtime/client", () => ({
  bindProductionLifecycleService: binding.bind,
}));

import AgentPluginsStatus from "../../src/commands/agent/plugins/status";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("production lifecycle command binding", () => {
  beforeEach(() => {
    process.exitCode = undefined;
    binding.bind.mockReset();
    binding.select.mockReset();
    binding.status.mockReset();
    vi.spyOn(AgentPluginsStatus.prototype, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it("rejects invalid status input before binding the production profile", async () => {
    await expect(
      AgentPluginsStatus.run(
        [
          "--content-workspace",
          "relative",
          "--repository-identity",
          "git:fixture-agent-plugins",
          "--target",
          "codex=/tmp/codex-home",
          "--json",
        ],
        { root: cliRoot }
      )
    ).rejects.toThrow("EEXIT: 2");

    expect(binding.bind).not.toHaveBeenCalled();
    expect(binding.select).not.toHaveBeenCalled();
    expect(binding.status).not.toHaveBeenCalled();
  });

  it("binds, selects, and invokes status exactly once after admission", async () => {
    binding.status.mockResolvedValue(
      Object.freeze({
        operation: "status",
        classification: "Converged",
        targets: Object.freeze([]),
        selection: null,
        issues: Object.freeze([]),
      })
    );
    binding.select.mockReturnValue(
      Object.freeze({
        providers: Object.freeze({ status: binding.status }),
      })
    );
    binding.bind.mockReturnValue(binding.select);

    await AgentPluginsStatus.run(
      [
        "--content-workspace",
        "/tmp/content",
        "--repository-identity",
        "git:fixture-agent-plugins",
        "--target",
        "codex=/tmp/codex-home",
        "--json",
      ],
      { root: cliRoot }
    );

    expect(binding.bind).toHaveBeenCalledOnce();
    expect(binding.bind).toHaveBeenCalledWith(binding.profile);
    expect(binding.select).toHaveBeenCalledExactlyOnceWith("providers.status");
    expect(binding.status).toHaveBeenCalledOnce();
    expect(binding.status).toHaveBeenCalledWith(
      {
        channel: "current-main",
        locator: {
          workspacePath: "/tmp/content",
          expectedRepositoryIdentity: "git:fixture-agent-plugins",
        },
        targets: [{ provider: "codex", home: "/tmp/codex-home" }],
      },
      {
        context: {
          invocation: {
            traceId: expect.stringMatching(/^agent-plugin-lifecycle:/u),
            commandId: expect.stringMatching(/^providers\.status:/u),
          },
        },
      }
    );
  });
});
