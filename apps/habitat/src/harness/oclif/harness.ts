import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NativeIntegration, StartedProcess } from "@habitat-ai/sdk/app";
import type {
  CliCommandMountRecord,
  HarnessHealthReport,
  LoweredCliCommand,
  NativeHarnessHandle,
  NativeIntegrationHarness,
} from "@habitat-ai/sdk/runtime/harnesses";
import type { RuntimeTelemetry } from "@habitat-ai/sdk/runtime/observation";
import { Config, Errors, flush, handle, type Interfaces, run } from "@oclif/core";
import { context, type Span, SpanStatusCode, trace } from "@opentelemetry/api";

import { type OclifLoadOptions, type OclifRuntimeBinding, sameCliRef } from "./binding.js";
import { type OclifSourceBundle, readOclifSourceBundle } from "./source-bundle.js";

export interface OclifHostOptions {
  readonly harnessId: string;
  readonly root: string;
  readonly sourceBundle: OclifSourceBundle;
  readonly args?: readonly string[];
  /** Optional native source materialization; selected command membership is unchanged. */
  readonly discoveryModule?: string;
}

export interface OclifHost {
  readonly integration: Extract<NativeIntegration, { surface: "cli/commands" }>;
  /** Native terminal invocation; managed signal cancellation begins after command parsing. */
  execute(startup: () => Promise<StartedProcess>): Promise<unknown>;
  /** The same native invocation for an in-process reader, without terminal side effects. */
  run(startup: () => Promise<StartedProcess>): Promise<unknown>;
}

/** A single native Oclif invocation; no application or first-party topic is selected here. */
export function createOclifHost(options: OclifHostOptions): OclifHost {
  const bundle = readOclifSourceBundle(options.sourceBundle);
  const args = [...(options.args ?? process.argv.slice(2))];
  const controller = new AbortController();
  let config: Config | undefined;
  let mounted = false;
  let consumed = false;
  let presentation = false;
  let active = false;
  let nativeStopping = false;
  let nativeStop: Promise<void> | undefined;
  let runSettlement: Promise<void> | undefined;
  let primary: { readonly error: unknown } | undefined;
  let telemetry: RuntimeTelemetry | undefined;
  let startup: (() => Promise<StartedProcess>) | undefined;
  let startupPromise: Promise<StartedProcess> | undefined;
  let started: StartedProcess | undefined;
  let selected: ReadonlyMap<string, LoweredCliCommand> | undefined;
  let managedSignals = false;
  let commandSpan: Span | undefined;

  function event(name: string): void {
    telemetry?.event(name);
    commandSpan?.addEvent(name);
  }
  function cancel(): void {
    if (controller.signal.aborted) return;
    controller.abort();
    if (active) event("oclif.cancel");
  }
  function onSignal(): void {
    primary ??= { error: new Errors.ExitError(1) };
    cancel();
    // Stop closes admission synchronously, but native completion must remain free to settle.
    void started?.stop().catch(() => {});
  }
  function installManagedSignals(): void {
    if (!presentation || managedSignals) return;
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
    managedSignals = true;
  }
  function stopNative(): Promise<void> {
    if (nativeStop !== undefined) return nativeStop;
    nativeStopping = true;
    if (active) cancel();
    // A command awaiting startup has no live capabilities. Joining it during
    // mount rollback would make startup wait for its own suspended caller.
    nativeStop = Promise.resolve(active ? runSettlement : undefined).then(() => {
      config = undefined;
    });
    return nativeStop;
  }

  const binding = Object.freeze<OclifRuntimeBinding>({
    get presentation() {
      return presentation;
    },
    async invoke(ref, source, parsed) {
      if (controller.signal.aborted) throw primary?.error ?? new Errors.ExitError(1);
      if (nativeStopping || startup === undefined) {
        throw new TypeError("Native Oclif command intake is closed.");
      }
      if (!bundle.entries.some((entry) => sameCliRef(entry.ref, ref) && entry.source === source)) {
        throw new TypeError("Native Oclif command is outside its selected cold source bundle.");
      }
      installManagedSignals();
      const start = startup;
      startupPromise ??= Promise.resolve()
        .then(() => {
          if (controller.signal.aborted) throw primary?.error ?? new Errors.ExitError(1);
          if (nativeStopping) throw new TypeError("Native Oclif command intake is closed.");
          return start();
        })
        .then((process) => {
          started = process;
          telemetry = process.telemetry;
          return process;
        });
      await startupPromise;
      if (controller.signal.aborted) throw primary?.error ?? new Errors.ExitError(1);
      if (config === undefined || nativeStopping || !mounted) {
        throw new TypeError("Native Oclif host is not mounted.");
      }
      const command = selected?.get(ref.executionId);
      if (command === undefined || !sameCliRef(ref, command.ref) || command.source !== source) {
        throw new TypeError("Native Oclif command is outside its compiled invocation binding.");
      }
      active = true;
      commandSpan = trace.getTracer("habitat.oclif").startSpan(`oclif ${ref.commandId}`, {
        attributes: {
          "habitat.command.id": ref.commandId,
          "habitat.execution.id": ref.executionId,
        },
      });
      return context.with(trace.setSpan(context.active(), commandSpan), () =>
        command.invoke(parsed, { signal: controller.signal })
      );
    },
    onFinally(error) {
      if (error !== undefined) primary ??= { error };
      event("oclif.finally");
    },
  });

  async function loadNativeConfig(): Promise<Config> {
    const loadOptions: OclifLoadOptions = {
      root: options.root,
      habitatRuntime: binding,
      // In-process Nx resolution does not participate in the operator's extension lifecycle.
      ...(presentation ? {} : { userPlugins: false, devPlugins: false }),
    };
    if (options.discoveryModule !== undefined) {
      loadOptions.pjson = await discoveryPackage(options.root, options.discoveryModule);
    }
    if (controller.signal.aborted) throw primary?.error ?? new Errors.ExitError(1);
    const loaded = await Config.load(loadOptions);
    if (controller.signal.aborted) throw primary?.error ?? new Errors.ExitError(1);
    const rootPlugin = loaded.plugins.get(loaded.name);
    const inventory = rootPlugin?.commands.map((command) => command.id).sort();
    const expected = Object.keys(bundle.COMMANDS).sort();
    if (
      inventory === undefined ||
      inventory.length !== expected.length ||
      inventory.some((id, index) => id !== expected[index])
    ) {
      throw new TypeError("Native Oclif discovery differs from the selected command inventory.");
    }
    for (const command of rootPlugin!.commands) {
      if ((await command.load()) !== bundle.COMMANDS[command.id]) {
        throw new TypeError("Native Oclif discovery loaded a different command source.");
      }
    }
    return loaded;
  }

  const descriptor: NativeIntegrationHarness<CliCommandMountRecord> = Object.freeze({
    id: options.harnessId,
    roles: Object.freeze(["cli"] as const),
    surfaces: Object.freeze(["cli/commands"]),
    async mount(input): Promise<NativeHarnessHandle> {
      if (mounted || nativeStopping) throw new TypeError("An Oclif host can mount only once.");
      if (controller.signal.aborted) throw primary?.error ?? new Errors.ExitError(1);
      if (config === undefined || startupPromise === undefined) {
        throw new TypeError("An Oclif host mounts only after native command admission.");
      }
      mounted = true;
      const commands = input.mountReadyPayloads.flatMap((record) => record.payload);
      const compiled = new Map<string, LoweredCliCommand>();
      for (const command of commands) {
        const source = bundle.entries.find((entry) => sameCliRef(entry.ref, command.ref));
        if (
          source === undefined ||
          source.source !== command.source ||
          compiled.has(command.ref.executionId)
        ) {
          throw new TypeError(
            "Native Oclif payload does not match the selected cold source bundle."
          );
        }
        compiled.set(command.ref.executionId, command);
      }
      if (compiled.size !== bundle.entries.length) {
        throw new TypeError("Native Oclif payload omits selected command sources.");
      }
      selected = compiled;
      function health(kind: HarnessHealthReport["kind"]): Promise<HarnessHealthReport> {
        return Promise.resolve(
          Object.freeze({
            launchIdentity: input.launchIdentity,
            harnessId: options.harnessId,
            kind,
            status:
              kind === "liveness"
                ? "not-applicable"
                : config === undefined || nativeStopping
                  ? "failing"
                  : "passing",
            findings: Object.freeze([]),
          })
        );
      }
      return Object.freeze({
        stop: stopNative,
        readiness: () => health("readiness"),
        liveness: () => health("liveness"),
      });
    },
  });

  async function invoke(start: () => Promise<StartedProcess>, terminal: boolean): Promise<unknown> {
    if (consumed) throw new TypeError("An Oclif host can execute only once.");
    if (typeof start !== "function") {
      throw new TypeError("An Oclif host needs a lazy process startup function.");
    }
    consumed = true;
    startup = start;
    presentation = terminal;
    const previousExitCode = process.exitCode;
    let value: unknown;
    try {
      runSettlement = Promise.resolve().then(async () => {
        try {
          config = await loadNativeConfig();
          if (controller.signal.aborted) throw primary?.error ?? new Errors.ExitError(1);
          value = await run(args, config);
        } catch (error) {
          primary ??= { error };
        } finally {
          try {
            await flush();
            event("oclif.flush");
          } catch (error) {
            primary ??= { error };
          }
          // Native finally and output settlement belong to the command; provider release follows.
          if (primary !== undefined) commandSpan?.setStatus({ code: SpanStatusCode.ERROR });
          commandSpan?.end();
          commandSpan = undefined;
          active = false;
        }
      });
      await runSettlement;
    } catch (error) {
      primary ??= { error };
    } finally {
      try {
        if (started === undefined) await stopNative();
        else await started.stop();
      } catch (error) {
        primary ??= { error };
      }
      if (managedSignals) {
        process.removeListener("SIGINT", onSignal);
        process.removeListener("SIGTERM", onSignal);
        managedSignals = false;
      }
      if (!terminal) {
        process.exitCode = previousExitCode;
      }
    }
    if (primary !== undefined) {
      if (terminal) {
        event("oclif.handle");
        // Oclif owns presentation and exit classification of the original native failure.
        await handle(primary.error as Parameters<typeof handle>[0]);
      }
      throw primary.error;
    }
    return value;
  }
  return Object.freeze({
    integration: Object.freeze({ surface: "cli/commands" as const, harness: descriptor }),
    execute: (start: () => Promise<StartedProcess>) => invoke(start, true),
    run: (start: () => Promise<StartedProcess>) => invoke(start, false),
  });
}

async function discoveryPackage(root: string, target: string): Promise<Interfaces.PJSON> {
  if (target.length === 0) throw new TypeError("Native Oclif discovery needs a module path.");
  const pjson: Interfaces.PJSON = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const commands = pjson.oclif?.commands;
  const finalizer = pjson.oclif?.hooks?.finally;
  if (
    typeof commands !== "object" ||
    commands === null ||
    commands.strategy !== "explicit" ||
    commands.identifier !== "COMMANDS" ||
    typeof finalizer !== "object" ||
    finalizer === null ||
    Array.isArray(finalizer) ||
    finalizer.identifier !== "FINALLY_HOOK"
  ) {
    throw new TypeError(
      "Native Oclif source materialization requires its explicit discovery and finally exports."
    );
  }
  return {
    ...pjson,
    oclif: {
      ...pjson.oclif,
      commands: { ...commands, target },
      hooks: { ...pjson.oclif.hooks, finally: { ...finalizer, target } },
    },
  };
}
