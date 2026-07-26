import type {
  ClaudeNativeAgentProviderSession,
  CodexNativeAgentProviderSession,
  NativeAgentProviderFailure,
  NativeProviderCapabilities,
  NativeProviderSessionInput,
} from "@rawr/resource-native-agent-provider";
import { Cause, Effect, Exit } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({
  codexFactory: vi.fn(),
  claudeFactory: vi.fn(),
  codexAcquire: vi.fn(),
  claudeAcquire: vi.fn(),
}));

vi.mock("@rawr/resource-native-agent-provider/providers/codex-effect-platform-node", () => ({
  makeNodeCodexNativeAgentProviderResource: provider.codexFactory,
}));
vi.mock("@rawr/resource-native-agent-provider/providers/claude-effect-platform-node", () => ({
  makeNodeClaudeNativeAgentProviderResource: provider.claudeFactory,
}));

import { createNodeNativeAgentProviderResources } from "../../../src/lib/agent-plugins/bindings/providers";

const EXECUTABLES = Object.freeze({
  codex: "/opt/rawr/bin/codex",
  claude: "/opt/rawr/bin/claude",
});

describe("native provider resource binding", () => {
  beforeEach(() => {
    provider.codexFactory.mockReset();
    provider.claudeFactory.mockReset();
    provider.codexAcquire.mockReset();
    provider.claudeAcquire.mockReset();
    provider.codexAcquire.mockImplementation((input: NativeProviderSessionInput) =>
      Effect.succeed(codexSession(input, EXECUTABLES.codex))
    );
    provider.claudeAcquire.mockImplementation((input: NativeProviderSessionInput) =>
      Effect.succeed(claudeSession(input, EXECUTABLES.claude))
    );
    provider.codexFactory.mockReturnValue(Object.freeze({ acquire: provider.codexAcquire }));
    provider.claudeFactory.mockReturnValue(Object.freeze({ acquire: provider.claudeAcquire }));
  });

  it.each([
    "codex",
    "claude",
  ] as const)("keeps the catalog cold and acquires only the selected %s resource", async (id) => {
    const home = `/tmp/rawr-native-binding-${id}`;
    const resources = createNodeNativeAgentProviderResources(EXECUTABLES);

    expect(provider.codexAcquire).not.toHaveBeenCalled();
    expect(provider.claudeAcquire).not.toHaveBeenCalled();
    const session =
      id === "codex"
        ? await Effect.runPromise(resources.codex.acquire({ home }))
        : await Effect.runPromise(resources.claude.acquire({ home }));
    expect(await Effect.runPromise(session.probe())).toMatchObject({ provider: id, home });
    expect(provider.codexAcquire).toHaveBeenCalledTimes(id === "codex" ? 1 : 0);
    expect(provider.claudeAcquire).toHaveBeenCalledTimes(id === "claude" ? 1 : 0);
    expect(provider[`${id}Acquire`]).toHaveBeenCalledWith({ home });
    expect(provider[`${id}Factory`]).toHaveBeenCalledWith({
      executablePath: EXECUTABLES[id],
    });
  });

  it("preserves the provider-discriminated Effect surface", async () => {
    const resources = createNodeNativeAgentProviderResources(EXECUTABLES);
    const codex = await Effect.runPromise(resources.codex.acquire({ home: "/tmp/codex" }));
    const claude = await Effect.runPromise(resources.claude.acquire({ home: "/tmp/claude" }));

    expect("enablePlugin" in codex).toBe(false);
    expect("enablePlugin" in claude).toBe(true);
    await expect(
      Effect.runPromise(claude.enablePlugin({ selector: "cognition@rawr-hq" }))
    ).resolves.toMatchObject({
      provider: "claude",
      operation: "plugin-enable",
    });
  });

  it("preserves selected-provider interruption and finalization", async () => {
    const started = Promise.withResolvers<void>();
    let finalized = false;
    provider.codexAcquire.mockReturnValue(
      Effect.succeed(
        codexSession({ home: "/tmp/codex" }, EXECUTABLES.codex, () =>
          Effect.sync(() => started.resolve()).pipe(
            Effect.andThen(Effect.never),
            Effect.ensuring(
              Effect.sync(() => {
                finalized = true;
              })
            )
          )
        )
      )
    );
    const resources = createNodeNativeAgentProviderResources(EXECUTABLES);
    const session = await Effect.runPromise(resources.codex.acquire({ home: "/tmp/codex" }));
    const controller = new AbortController();
    const probe = Effect.runPromiseExit(session.probe(), { signal: controller.signal });

    await started.promise;
    controller.abort();
    const exit = await probe;

    expect(Exit.isFailure(exit)).toBe(true);
    if (!Exit.isFailure(exit)) throw new Error("Expected provider probe interruption");
    expect(exit.cause.reasons.some(Cause.isInterruptReason)).toBe(true);
    expect(finalized).toBe(true);
    expect(provider.claudeAcquire).not.toHaveBeenCalled();
  });

  it("preserves typed provider failures without Promise translation", async () => {
    const failure: NativeAgentProviderFailure = Object.freeze({
      _tag: "NativeAgentProviderFailure",
      provider: "codex",
      operation: "acquire",
      reason: "Missing",
      commandPhase: "not-started",
      detail: "Codex executable is missing",
    });
    provider.codexAcquire.mockReturnValue(Effect.fail(failure));
    const resources = createNodeNativeAgentProviderResources(EXECUTABLES);
    const exit = await Effect.runPromiseExit(resources.codex.acquire({ home: "/tmp/codex" }));

    expect(typedFailure(exit)).toBe(failure);
  });

  it("keeps the catalog closed and fails exactly when one executable is unbound", async () => {
    const resources = createNodeNativeAgentProviderResources({ codex: EXECUTABLES.codex });

    expect(Object.keys(resources).sort()).toEqual(["claude", "codex"]);
    const exit = await Effect.runPromiseExit(resources.claude.acquire({ home: "/tmp/claude" }));
    expect(typedFailure(exit)).toEqual({
      _tag: "NativeAgentProviderFailure",
      provider: "claude",
      operation: "acquire",
      reason: "Missing",
      commandPhase: "not-started",
      detail: "Native claude executable is not bound",
    });
    expect(provider.claudeFactory).not.toHaveBeenCalled();
  });
});

function codexSession(
  input: NativeProviderSessionInput,
  executablePath: string,
  probeOverride?: CodexNativeAgentProviderSession["probe"]
): CodexNativeAgentProviderSession {
  const capabilities: NativeProviderCapabilities = {
    provider: "codex",
    executablePath,
    home: input.home,
    version: "1.0.0",
    capabilities: [
      "marketplace-list",
      "marketplace-add",
      "marketplace-remove",
      "plugin-list",
      "plugin-install",
      "plugin-remove",
    ],
  };
  return Object.freeze({
    ...commonSession(input, executablePath, "codex"),
    provider: "codex",
    probe: probeOverride ?? (() => Effect.succeed(capabilities)),
  });
}

function claudeSession(
  input: NativeProviderSessionInput,
  executablePath: string
): ClaudeNativeAgentProviderSession {
  const capabilities: NativeProviderCapabilities = {
    provider: "claude",
    executablePath,
    home: input.home,
    version: "1.0.0",
    capabilities: [
      "marketplace-list",
      "marketplace-add",
      "marketplace-remove",
      "marketplace-update",
      "plugin-list",
      "plugin-install",
      "plugin-enable",
      "plugin-disable",
      "plugin-remove",
      "plugin-update",
    ],
  };
  return Object.freeze({
    ...commonSession(input, executablePath, "claude"),
    provider: "claude",
    probe: () => Effect.succeed(capabilities),
    enablePlugin: () => mutation("claude", "plugin-enable"),
  });
}

function commonSession(
  input: NativeProviderSessionInput,
  executablePath: string,
  providerId: "claude" | "codex"
) {
  return {
    provider: providerId,
    executablePath,
    home: input.home,
    inventory: () => Effect.succeed({ provider: providerId, marketplaces: [], plugins: [] }),
    readPluginFiles: (request: Readonly<{ selector: string; files: readonly unknown[] }>) =>
      Effect.succeed({ selector: request.selector, files: [] }),
    addMarketplace: () => mutation(providerId, "marketplace-add"),
    removeMarketplace: () => mutation(providerId, "marketplace-remove"),
    installPlugin: () => mutation(providerId, "plugin-install"),
    removePlugin: () => mutation(providerId, "plugin-remove"),
  };
}

function mutation(
  providerId: "claude" | "codex",
  operation:
    | "marketplace-add"
    | "marketplace-remove"
    | "plugin-install"
    | "plugin-enable"
    | "plugin-remove"
) {
  return Effect.succeed({
    provider: providerId,
    operation,
    commandPhase: "command-returned" as const,
  });
}

function typedFailure<A>(
  exit: Exit.Exit<A, NativeAgentProviderFailure>
): NativeAgentProviderFailure | undefined {
  if (!Exit.isFailure(exit)) return undefined;
  return exit.cause.reasons.find(Cause.isFailReason)?.error;
}
