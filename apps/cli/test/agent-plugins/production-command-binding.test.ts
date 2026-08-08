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

import AgentPluginsCheck from "../../src/commands/agent/plugins/check";
import AgentPluginsStatus from "../../src/commands/agent/plugins/status";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const admittedStatusArgs = [
  "--content-workspace",
  "/tmp/content",
  "--repository-identity",
  "git:fixture-agent-plugins",
  "--target",
  "codex=/tmp/codex-home",
  "--json",
] as const;
let stdoutWrites: string[];

describe("production lifecycle command binding", () => {
  beforeEach(() => {
    process.exitCode = undefined;
    binding.bind.mockReset();
    binding.select.mockReset();
    binding.status.mockReset();
    stdoutWrites = captureStdoutWrites();
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

  it("rejects a schema-invalid current-main body before binding the production profile", async () => {
    await expect(
      AgentPluginsCheck.run(
        ["--mode", "current-main-record", "--current-main-body-json", "{}", "--json"],
        { root: cliRoot }
      )
    ).rejects.toThrow("EEXIT: 2");

    expect(binding.bind).not.toHaveBeenCalled();
    expect(binding.select).not.toHaveBeenCalled();
    expect(binding.status).not.toHaveBeenCalled();
    expect(stdoutWrites).toHaveLength(1);
    expect(JSON.parse(stdoutWrites.join(""))).toEqual({
      ok: false,
      error: {
        message: "--current-main-body-json must contain a valid current-main body",
        code: "LIFECYCLE_INPUT_INVALID",
      },
    });
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

    await AgentPluginsStatus.run([...admittedStatusArgs], { root: cliRoot });

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

  it("projects one typed failure when production binding fails after admission", async () => {
    binding.bind.mockImplementation(() => {
      throw new Error("binding failed");
    });

    await expect(
      AgentPluginsStatus.run([...admittedStatusArgs], { root: cliRoot })
    ).rejects.toThrow("EEXIT: 1");

    expect(binding.bind).toHaveBeenCalledOnce();
    expect(binding.bind).toHaveBeenCalledWith(binding.profile);
    expect(binding.select).not.toHaveBeenCalled();
    expect(binding.status).not.toHaveBeenCalled();
    expect(JSON.parse(stdoutWrites.join(""))).toEqual({
      ok: false,
      error: {
        message: "Lifecycle procedure failed",
        code: "LIFECYCLE_PROCEDURE_FAILED",
        details: {
          operation: "providers.status",
          message: "binding failed",
        },
      },
    });
  });

  it("projects one typed failure without retry when the selected operation rejects", async () => {
    binding.status.mockRejectedValue(new Error("status failed"));
    binding.select.mockReturnValue(
      Object.freeze({
        providers: Object.freeze({ status: binding.status }),
      })
    );
    binding.bind.mockReturnValue(binding.select);

    await expect(
      AgentPluginsStatus.run([...admittedStatusArgs], { root: cliRoot })
    ).rejects.toThrow("EEXIT: 1");

    expect(binding.bind).toHaveBeenCalledOnce();
    expect(binding.bind).toHaveBeenCalledWith(binding.profile);
    expect(binding.select).toHaveBeenCalledExactlyOnceWith("providers.status");
    expect(binding.status).toHaveBeenCalledOnce();
    expect(JSON.parse(stdoutWrites.join(""))).toEqual({
      ok: false,
      error: {
        message: "Lifecycle procedure failed",
        code: "LIFECYCLE_PROCEDURE_FAILED",
        details: {
          operation: "providers.status",
          message: "status failed",
        },
      },
    });
  });
});

function captureStdoutWrites(): string[] {
  const writes: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation(((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ) => {
    writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    const complete = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    complete?.();
    return true;
  }) as typeof process.stdout.write);
  return writes;
}
