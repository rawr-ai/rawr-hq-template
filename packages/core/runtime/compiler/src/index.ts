import {
  createRuntimeDiagnostic,
  executionRefKey,
  stableRuntimeJson,
  type CompiledExecutionPlan,
  type ExecutionDescriptorTableEntry,
  type RuntimeDiagnostic,
  type RuntimeExecutionDeclaration,
} from "@rawr/core-runtime-topology";

export const RAWR_RUNTIME_COMPILER_TOPOLOGY = "packages/core/runtime/compiler" as const;

export type {
  CompiledExecutionPlan,
  ExecutionDescriptorTableEntry,
  RuntimeExecutionDeclaration,
} from "@rawr/core-runtime-topology";

export interface PortableRuntimePlanArtifact {
  readonly kind: "portable.runtime-plan";
  readonly executionRefs: readonly RuntimeExecutionDeclaration["ref"][];
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

export interface RuntimeSpineCompilation {
  readonly kind: "runtime.spine-compilation";
  readonly plans: readonly CompiledExecutionPlan[];
  readonly descriptorTableEntries: readonly ExecutionDescriptorTableEntry[];
  readonly portableArtifact: PortableRuntimePlanArtifact;
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

export function compileRuntimeSpine(input: {
  readonly executions: readonly RuntimeExecutionDeclaration[];
}): RuntimeSpineCompilation {
  const diagnostics: RuntimeDiagnostic[] = [];
  const seenRefs = new Map<string, RuntimeExecutionDeclaration["ref"]>();
  const plans: CompiledExecutionPlan[] = [];
  const descriptorTableEntries: ExecutionDescriptorTableEntry[] = [];

  for (const execution of input.executions) {
    const key = executionRefKey(execution.ref);
    const previous = seenRefs.get(key);
    if (previous) {
      diagnostics.push(
        createRuntimeDiagnostic({
          code: "runtime.execution.duplicate-ref",
          message: `duplicate execution ref ${execution.ref.executionId}`,
          attributes: {
            executionId: execution.ref.executionId,
            boundary: execution.ref.boundary,
          },
        }),
      );
      if (stableRuntimeJson(previous) !== stableRuntimeJson(execution.ref)) {
        diagnostics.push(
          createRuntimeDiagnostic({
            code: "runtime.execution.ref-key-collision",
            message: `execution ref key collision for ${execution.ref.executionId}`,
            attributes: {
              executionId: execution.ref.executionId,
              boundary: execution.ref.boundary,
            },
          }),
        );
      }
      continue;
    }

    seenRefs.set(key, execution.ref);
    plans.push({
      kind: "compiled.execution-plan",
      ref: execution.ref,
      policy: execution.policy,
    });

    if (execution.descriptor) {
      descriptorTableEntries.push({
        ref: execution.ref,
        descriptor: execution.descriptor,
      });
    }
  }

  const executionRefs = plans.map((plan) => plan.ref);
  return {
    kind: "runtime.spine-compilation",
    plans,
    descriptorTableEntries,
    diagnostics,
    portableArtifact: {
      kind: "portable.runtime-plan",
      executionRefs,
      diagnostics,
    },
  };
}
