import {
  createRuntimeObservationRecorder,
  type InMemoryRuntimeCatalog,
} from "./catalog";

type Awaitable<TValue> = TValue | Promise<TValue>;

export interface OracleBootgraphModuleContext {
  readonly moduleId: string;
  readonly dependencies: readonly string[];
  /**
   * Started dependency values visible to this contained boot module only. This
   * does not define final RuntimeResourceAccess semantics.
   */
  readonly dependencyValues: ReadonlyMap<string, unknown>;
  readonly orderIndex: number;
}

export interface OracleBootgraphModule<TStarted = unknown> {
  readonly kind: "oracle.boot-module";
  readonly id: string;
  readonly dependencies?: readonly string[];
  readonly metadata?: Record<string, unknown>;
  start(context: OracleBootgraphModuleContext): Awaitable<TStarted>;
  finalize?(
    started: TStarted,
    context: OracleBootgraphModuleContext,
  ): Awaitable<void>;
  rollback?(
    started: TStarted,
    context: OracleBootgraphModuleContext,
  ): Awaitable<void>;
}

export type OracleBootgraphExecutionResult =
  | {
      readonly kind: "oracle.bootgraph-result";
      readonly status: "started";
      readonly startupOrder: readonly string[];
      /**
       * Live started values for contained process assembly tests. These values
       * are not catalog records and must not be treated as portable output.
       */
      startedValues(): ReadonlyMap<string, unknown>;
      catalog(): InMemoryRuntimeCatalog;
      finalize(): Promise<InMemoryRuntimeCatalog>;
    }
  | {
      readonly kind: "oracle.bootgraph-result";
      readonly status: "failed";
      readonly startupOrder: readonly string[];
      readonly rollbackOrder: readonly string[];
      readonly error: unknown;
      readonly catalog: InMemoryRuntimeCatalog;
    };

interface StartedOracleBootModule {
  readonly module: OracleBootgraphModule<any>;
  readonly started: unknown;
  readonly context: OracleBootgraphModuleContext;
}

function orderModules(
  modules: readonly OracleBootgraphModule[],
): readonly OracleBootgraphModule[] {
  const byId = new Map<string, OracleBootgraphModule>();
  for (const module of modules) {
    if (byId.has(module.id)) {
      throw new Error(`duplicate boot module: ${module.id}`);
    }
    byId.set(module.id, module);
  }

  const ordered: OracleBootgraphModule[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(module: OracleBootgraphModule): void {
    if (visited.has(module.id)) return;
    if (visiting.has(module.id)) {
      throw new Error(`bootgraph dependency cycle at ${module.id}`);
    }

    visiting.add(module.id);
    for (const dependencyId of module.dependencies ?? []) {
      const dependency = byId.get(dependencyId);
      if (!dependency) {
        throw new Error(
          `boot module ${module.id} depends on missing module ${dependencyId}`,
        );
      }
      visit(dependency);
    }
    visiting.delete(module.id);
    visited.add(module.id);
    ordered.push(module);
  }

  for (const module of modules) {
    visit(module);
  }

  return ordered;
}

function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function releaseStartedModule(
  entry: StartedOracleBootModule,
  phase: "boot.rollback" | "boot.finalize",
): Promise<void> {
  const release = phase === "boot.rollback"
    ? entry.module.rollback ?? entry.module.finalize
    : entry.module.finalize;

  if (!release) return;
  await release(entry.started, entry.context);
}

export async function executeOracleBootgraph(input: {
  readonly modules: readonly OracleBootgraphModule[];
}): Promise<OracleBootgraphExecutionResult> {
  const ordered = orderModules(input.modules);
  const recorder = createRuntimeObservationRecorder({
    modules: input.modules.map((module) => ({
      moduleId: module.id,
      dependencies: module.dependencies,
      metadata: module.metadata,
    })),
  });
  const started: StartedOracleBootModule[] = [];
  const startedById = new Map<string, unknown>();
  const startupOrder: string[] = [];

  for (const [orderIndex, module] of ordered.entries()) {
    const context = {
      moduleId: module.id,
      dependencies: [...(module.dependencies ?? [])],
      dependencyValues: new Map(
        (module.dependencies ?? []).map((dependencyId) => [
          dependencyId,
          startedById.get(dependencyId),
        ]),
      ),
      orderIndex,
    } satisfies OracleBootgraphModuleContext;

    startupOrder.push(module.id);
    recorder.record({
      phase: "boot.start",
      subjectId: module.id,
      attributes: {
        dependencies: module.dependencies ?? [],
        orderIndex,
      },
    });

    try {
      const moduleStarted = await module.start(context);
      started.push({
        module,
        started: moduleStarted,
        context,
      });
      startedById.set(module.id, moduleStarted);
      recorder.record({
        phase: "boot.started",
        subjectId: module.id,
        attributes: {
          orderIndex,
        },
      });
    } catch (error) {
      recorder.record({
        phase: "boot.failed",
        subjectId: module.id,
        attributes: {
          error: failureMessage(error),
        },
      });

      const rollbackOrder: string[] = [];
      for (const entry of [...started].reverse()) {
        recorder.record({
          phase: "boot.rollback.start",
          subjectId: entry.module.id,
        });
        try {
          await releaseStartedModule(entry, "boot.rollback");
          rollbackOrder.push(entry.module.id);
          recorder.record({
            phase: "boot.rollback.finished",
            subjectId: entry.module.id,
          });
        } catch (rollbackError) {
          recorder.record({
            phase: "boot.rollback.failed",
            subjectId: entry.module.id,
            attributes: {
              error: failureMessage(rollbackError),
            },
          });
        }
      }

      return {
        kind: "oracle.bootgraph-result",
        status: "failed",
        startupOrder,
        rollbackOrder,
        error,
        catalog: recorder.catalog(),
      };
    }
  }

  let finalized = false;

  return {
    kind: "oracle.bootgraph-result",
    status: "started",
    startupOrder,
    startedValues: () => new Map(startedById),
    catalog: () => recorder.catalog(),
    async finalize() {
      if (finalized) {
        return recorder.catalog();
      }
      finalized = true;

      for (const entry of [...started].reverse()) {
        recorder.record({
          phase: "boot.finalize.start",
          subjectId: entry.module.id,
        });
        try {
          await releaseStartedModule(entry, "boot.finalize");
          recorder.record({
            phase: "boot.finalize.finished",
            subjectId: entry.module.id,
          });
        } catch (finalizeError) {
          recorder.record({
            phase: "boot.finalize.failed",
            subjectId: entry.module.id,
            attributes: {
              error: failureMessage(finalizeError),
            },
          });
        }
      }

      return recorder.catalog();
    },
  };
}
