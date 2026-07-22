import { type Static, type TProperties, Type } from "typebox";
import { NonEmptyStringSchema } from "./identity.js";
import { closedObject, type Disjoint } from "./schema.js";

export const MaximumTimerDelayMs = 2_147_483_647;

export const CommandPolicySchema = closedObject(
  {},
  {
    environment: Type.Record(Type.String({ minLength: 1 }), Type.String()),
    timeoutMs: Type.Integer({ minimum: 1, maximum: MaximumTimerDelayMs }),
    terminationGraceMs: Type.Integer({
      minimum: 1,
      maximum: MaximumTimerDelayMs,
    }),
  }
);

export const CommandExecutionConfigSchema = closedObject(
  {},
  {
    executable: NonEmptyStringSchema,
    arguments: Type.Array(Type.String()),
    cwd: NonEmptyStringSchema,
    ...CommandPolicySchema.properties,
  }
);

export const OperationalEventIdentitySchema = closedObject(
  {},
  {
    serviceName: NonEmptyStringSchema,
    serviceVersion: NonEmptyStringSchema,
    environment: NonEmptyStringSchema,
  }
);

export const SdkIdentitySchema = closedObject(
  {},
  {
    packageName: Type.Literal("@rawr/research-sdk"),
    packageVersion: NonEmptyStringSchema,
    protocolVersion: NonEmptyStringSchema,
    implementationRevision: NonEmptyStringSchema,
  }
);

export const RuntimeBaseConfigProperties = {
  sdk: SdkIdentitySchema,
  runtimeRoot: NonEmptyStringSchema,
  outputRoot: NonEmptyStringSchema,
  command: CommandPolicySchema,
  operationalEvents: OperationalEventIdentitySchema,
};

export function createRuntimeConfigSchema<const Subject extends TProperties>(
  subject: Subject & Disjoint<typeof RuntimeBaseConfigProperties, Subject>
) {
  return closedObject<typeof RuntimeBaseConfigProperties, Subject>(
    RuntimeBaseConfigProperties,
    subject
  );
}

export const RuntimeBaseConfigSchema = createRuntimeConfigSchema({});

export type CommandPolicy = Static<typeof CommandPolicySchema>;
export type CommandExecutionConfig = Static<typeof CommandExecutionConfigSchema>;
export type RuntimeBaseConfig = Static<typeof RuntimeBaseConfigSchema>;

export interface RuntimePathEvidence {
  readonly resolvedRuntimeRoot: string;
  readonly resolvedOutputRoot: string;
  readonly temporaryRoots: readonly string[];
}

export interface RuntimeConfigSemanticIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export function validateRuntimeBaseConfigSemantics(
  config: RuntimeBaseConfig,
  paths: RuntimePathEvidence
): readonly RuntimeConfigSemanticIssue[] {
  const issues: RuntimeConfigSemanticIssue[] = [];

  validateResolvedRoot(
    issues,
    "/runtimeRoot",
    config.runtimeRoot,
    paths.resolvedRuntimeRoot,
    paths.temporaryRoots
  );
  validateResolvedRoot(
    issues,
    "/outputRoot",
    config.outputRoot,
    paths.resolvedOutputRoot,
    paths.temporaryRoots
  );

  if (config.runtimeRoot === config.outputRoot) {
    issues.push({
      code: "runtime.roots-not-distinct",
      path: "/outputRoot",
      message: "Runtime and durable output roots must be distinct.",
    });
  }

  if (config.command.timeoutMs + config.command.terminationGraceMs > MaximumTimerDelayMs) {
    issues.push({
      code: "runtime.deadline-overflow",
      path: "/command",
      message: "Command timeout and termination grace exceed the bounded timer range.",
    });
  }

  for (const key of Object.keys(config.command.environment)) {
    if (/(?:authorization|credential|password|secret|token|api[_-]?key)/i.test(key)) {
      issues.push({
        code: "runtime.secret-in-public-environment",
        path: `/command/environment/${key}`,
        message:
          "Secret-bearing environment entries must be acquired through Effect configuration.",
      });
    }
  }

  return issues;
}

function validateResolvedRoot(
  issues: RuntimeConfigSemanticIssue[],
  path: "/runtimeRoot" | "/outputRoot",
  configured: string,
  resolved: string,
  temporaryRoots: readonly string[]
): void {
  if (!configured.startsWith("/") || configured !== resolved) {
    issues.push({
      code: "runtime.root-not-resolved",
      path,
      message: "Runtime roots must be absolute, canonical, and symlink-resolved.",
    });
    return;
  }

  if (temporaryRoots.some((root) => isAtOrBelow(configured, root))) {
    issues.push({
      code: "runtime.temporary-root",
      path,
      message: "Runtime roots must not live beneath an evaluator temporary directory.",
    });
  }
}

function isAtOrBelow(candidate: string, root: string): boolean {
  const normalizedRoot = root.endsWith("/") ? root.slice(0, -1) : root;
  return candidate === normalizedRoot || candidate.startsWith(`${normalizedRoot}/`);
}
