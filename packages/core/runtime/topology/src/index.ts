import type {
  ExecutionDescriptor,
  ExecutionDescriptorRef,
} from "@rawr/sdk/execution";

export const RAWR_RUNTIME_TOPOLOGY_TOPOLOGY = "packages/core/runtime/topology" as const;

export type RuntimeDiagnosticSeverity = "info" | "warning" | "error";

export interface RuntimeDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: RuntimeDiagnosticSeverity;
  readonly attributes?: Record<string, string | number | boolean>;
}

export interface RuntimeTopologyRecord {
  readonly kind: string;
  readonly attributes?: Record<string, string | number | boolean>;
}

export type RuntimeExecutionPolicy = {
  readonly timeoutMs?: number;
};

export type RuntimeExecutionDescriptor =
  ExecutionDescriptor<any, any, any, any, any>;

export interface RuntimeExecutionDeclaration {
  readonly ref: ExecutionDescriptorRef;
  readonly descriptor?: RuntimeExecutionDescriptor;
  readonly policy?: RuntimeExecutionPolicy;
}

export interface CompiledExecutionPlan {
  readonly kind: "compiled.execution-plan";
  readonly ref: ExecutionDescriptorRef;
  readonly policy?: RuntimeExecutionPolicy;
}

export interface ExecutionDescriptorTableEntry {
  readonly ref: ExecutionDescriptorRef;
  readonly descriptor: RuntimeExecutionDescriptor;
}

export interface ExecutionDescriptorTable {
  readonly kind: "execution.descriptor-table";
  get(ref: ExecutionDescriptorRef): RuntimeExecutionDescriptor;
  entries(): Iterable<ExecutionDescriptorTableEntry>;
}

export interface CompiledExecutableBoundary {
  readonly kind: "compiled.executable-boundary";
  readonly ref: ExecutionDescriptorRef;
  readonly descriptor: RuntimeExecutionDescriptor;
  readonly plan: CompiledExecutionPlan;
}

export interface ExecutionRegistry {
  readonly kind: "execution.registry";
  get(ref: ExecutionDescriptorRef): CompiledExecutableBoundary;
  entries(): Iterable<CompiledExecutableBoundary>;
}

export interface CompiledExecutionRegistryInput {
  readonly plans: readonly CompiledExecutionPlan[];
  readonly descriptorTable: ExecutionDescriptorTable;
}

export function createRuntimeDiagnostic(input: {
  readonly code: string;
  readonly message: string;
  readonly severity?: RuntimeDiagnosticSeverity;
  readonly attributes?: Record<string, string | number | boolean>;
}): RuntimeDiagnostic {
  return {
    severity: "error",
    ...input,
  };
}

export function hasBlockingDiagnostics(
  diagnostics: readonly RuntimeDiagnostic[],
): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

export function stableRuntimeJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableRuntimeJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(([entryKey, entryValue]) => `${JSON.stringify(entryKey)}:${stableRuntimeJson(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "undefined";
}

export function executionRefKey(ref: ExecutionDescriptorRef): string {
  return `${ref.boundary}:${ref.executionId}`;
}

export function assertSameExecutionRef(
  expected: ExecutionDescriptorRef,
  actual: ExecutionDescriptorRef,
  label: string,
): void {
  if (stableRuntimeJson(expected) !== stableRuntimeJson(actual)) {
    throw new Error(
      `${label} mismatch: expected ${expected.boundary}/${expected.executionId}, got ${actual.boundary}/${actual.executionId}`,
    );
  }
}
