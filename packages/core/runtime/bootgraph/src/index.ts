import {
  createRuntimeDiagnostic,
  hasBlockingDiagnostics,
  type RuntimeDiagnostic,
  type RuntimeTopologyRecord,
} from "@rawr/core-runtime-topology";

export const RAWR_RUNTIME_BOOTGRAPH_TOPOLOGY = "packages/core/runtime/bootgraph" as const;

export interface RuntimeBootModuleStart {
  readonly value?: unknown;
  readonly finalize?: () => Promise<void> | void;
  readonly records?: readonly RuntimeTopologyRecord[];
}

export interface RuntimeBootModule {
  readonly id: string;
  readonly dependsOn?: readonly string[];
  start(): Promise<RuntimeBootModuleStart> | RuntimeBootModuleStart;
}

export interface StartedRuntimeBootgraph {
  readonly kind: "runtime.bootgraph.started";
  readonly startedModuleIds: readonly string[];
  readonly records: readonly RuntimeTopologyRecord[];
  readonly diagnostics: readonly RuntimeDiagnostic[];
  stop(): Promise<void>;
}

function sortModules(modules: readonly RuntimeBootModule[]): {
  readonly ordered: readonly RuntimeBootModule[];
  readonly diagnostics: readonly RuntimeDiagnostic[];
} {
  const diagnostics: RuntimeDiagnostic[] = [];
  const byId = new Map<string, RuntimeBootModule>();

  for (const module of modules) {
    if (byId.has(module.id)) {
      diagnostics.push(
        createRuntimeDiagnostic({
          code: "runtime.bootgraph.duplicate-module",
          message: `duplicate boot module ${module.id}`,
          attributes: { moduleId: module.id },
        }),
      );
      continue;
    }
    byId.set(module.id, module);
  }

  const temporary = new Set<string>();
  const permanent = new Set<string>();
  const ordered: RuntimeBootModule[] = [];

  function visit(module: RuntimeBootModule): void {
    if (permanent.has(module.id)) return;
    if (temporary.has(module.id)) {
      diagnostics.push(
        createRuntimeDiagnostic({
          code: "runtime.bootgraph.cycle",
          message: `cycle detected at boot module ${module.id}`,
          attributes: { moduleId: module.id },
        }),
      );
      return;
    }

    temporary.add(module.id);
    for (const dependencyId of module.dependsOn ?? []) {
      const dependency = byId.get(dependencyId);
      if (!dependency) {
        diagnostics.push(
          createRuntimeDiagnostic({
            code: "runtime.bootgraph.missing-dependency",
            message: `boot module ${module.id} depends on missing module ${dependencyId}`,
            attributes: {
              moduleId: module.id,
              dependencyId,
            },
          }),
        );
        continue;
      }
      visit(dependency);
    }
    temporary.delete(module.id);
    permanent.add(module.id);
    ordered.push(module);
  }

  for (const module of byId.values()) visit(module);
  return { ordered, diagnostics };
}

export async function startRuntimeBootgraph(
  modules: readonly RuntimeBootModule[],
): Promise<StartedRuntimeBootgraph> {
  const sorted = sortModules(modules);
  const ordered = sorted.ordered;
  const diagnostics = [...sorted.diagnostics];
  if (hasBlockingDiagnostics(diagnostics)) {
    return {
      kind: "runtime.bootgraph.started",
      startedModuleIds: [],
      records: [],
      diagnostics,
      async stop() {},
    };
  }

  const started: {
    readonly module: RuntimeBootModule;
    readonly start: RuntimeBootModuleStart;
  }[] = [];
  const records: RuntimeTopologyRecord[] = [];
  let stopped = false;

  try {
    for (const module of ordered) {
      const start = await module.start();
      started.push({ module, start });
      records.push({
        kind: "runtime.bootgraph.module-started",
        attributes: { moduleId: module.id },
      });
      records.push(...(start.records ?? []));
    }
  } catch (error) {
    diagnostics.push(
      createRuntimeDiagnostic({
        code: "runtime.bootgraph.start-failed",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    for (const entry of [...started].reverse()) {
      try {
        await entry.start.finalize?.();
      } catch (finalizeError) {
        diagnostics.push(
          createRuntimeDiagnostic({
            code: "runtime.bootgraph.rollback-failed",
            message: finalizeError instanceof Error ? finalizeError.message : String(finalizeError),
            attributes: { moduleId: entry.module.id },
          }),
        );
      }
    }
    started.splice(0, started.length);
  }

  return {
    kind: "runtime.bootgraph.started",
    startedModuleIds: started.map((entry) => entry.module.id),
    records,
    diagnostics,
    async stop() {
      if (stopped) return;
      stopped = true;
      for (const entry of [...started].reverse()) {
        try {
          await entry.start.finalize?.();
        } catch (error) {
          diagnostics.push(
            createRuntimeDiagnostic({
              code: "runtime.bootgraph.finalize-failed",
              message: error instanceof Error ? error.message : String(error),
              attributes: { moduleId: entry.module.id },
            }),
          );
        }
      }
      started.splice(0, started.length);
    },
  };
}
