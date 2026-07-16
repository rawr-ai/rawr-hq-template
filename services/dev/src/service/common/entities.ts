import { type Static, Type } from "typebox";

export const DevopsActionSchema = Type.Union([
  Type.Literal("planned"),
  Type.Literal("applied"),
]);

export const DevCommandStepSchema = Type.Object(
  {
    command: Type.String({ minLength: 1 }),
    args: Type.Array(Type.String()),
    status: Type.Union([
      Type.Literal("planned"),
      Type.Literal("succeeded"),
      Type.Literal("failed"),
      Type.Literal("skipped"),
    ]),
    exitCode: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    stdout: Type.Optional(Type.String()),
    stderr: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const DevIssueSchema = Type.Object(
  {
    code: Type.String({ minLength: 1 }),
    message: Type.String({ minLength: 1 }),
    severity: Type.Union([Type.Literal("error"), Type.Literal("warning")]),
    details: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  { additionalProperties: false },
);

export const DevPreflightSchema = Type.Object(
  {
    ok: Type.Boolean(),
    issues: Type.Array(DevIssueSchema),
  },
  { additionalProperties: false },
);

export const DevExecutionSchema = Type.Object(
  {
    ok: Type.Boolean(),
    issues: Type.Array(DevIssueSchema),
  },
  { additionalProperties: false },
);

export const ScratchPolicyModeSchema = Type.Union([
  Type.Literal("off"),
  Type.Literal("warn"),
  Type.Literal("block"),
]);

export const ScratchPolicyInputSchema = Type.Object(
  {
    mode: Type.Optional(ScratchPolicyModeSchema),
    bypassed: Type.Optional(Type.Boolean()),
    roots: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    planFileNames: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    workingPadFileNames: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    enforce: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const ScratchPolicyCheckSchema = Type.Object(
  {
    mode: ScratchPolicyModeSchema,
    bypassed: Type.Boolean(),
    required: Type.Object(
      {
        planScratch: Type.Boolean(),
        workingPad: Type.Boolean(),
      },
      { additionalProperties: false },
    ),
    missing: Type.Array(Type.String()),
    matches: Type.Object(
      {
        planScratchPaths: Type.Array(Type.String()),
        workingPadPaths: Type.Array(Type.String()),
      },
      { additionalProperties: false },
    ),
    blocked: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const StackDoctorInputSchema = Type.Object(
  {
    branch: Type.Optional(Type.String({ minLength: 1 })),
    repo: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const StackDoctorResultSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    repo: Type.Union([Type.String(), Type.Null()]),
    report: Type.Object(
      {
        status: Type.Union([Type.Literal("HEALTHY"), Type.Literal("NEEDS_ATTENTION")]),
        branch: Type.String(),
        checks: Type.Object(
          {
            dirtyWorkingTree: Type.Boolean(),
            detachedHead: Type.Boolean(),
            graphiteAvailable: Type.Boolean(),
            worktreeListReadable: Type.Boolean(),
            needsRestack: Type.Boolean(),
            graphShowsStack: Type.Boolean(),
          },
          { additionalProperties: false },
        ),
        actions: Type.Array(Type.Object(
          {
            command: Type.String({ minLength: 1 }),
            reason: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        )),
        raw: Type.Object(
          {
            branch: Type.String(),
            gitStatus: Type.String(),
            gtLs: Type.String(),
            worktreeList: Type.String(),
          },
          { additionalProperties: false },
        ),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const StackDrainInputSchema = Type.Object(
  {
    apply: Type.Optional(Type.Boolean()),
    maxCycles: Type.Optional(Type.Integer({ minimum: 1 })),
    sleepSeconds: Type.Optional(Type.Number({ minimum: 0 })),
    scratchPolicy: Type.Optional(ScratchPolicyInputSchema),
  },
  { additionalProperties: false },
);

export const StackDrainResultSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    action: DevopsActionSchema,
    converged: Type.Boolean(),
    cycles: Type.Array(Type.Object(
      {
        cycle: Type.Number(),
        publish: DevCommandStepSchema,
        merge: DevCommandStepSchema,
        sync: DevCommandStepSchema,
        gtLs: Type.String(),
      },
      { additionalProperties: false },
    )),
    plannedCommands: Type.Array(DevCommandStepSchema),
    preflight: DevPreflightSchema,
    execution: DevExecutionSchema,
    scratchPolicy: ScratchPolicyCheckSchema,
  },
  { additionalProperties: false },
);

export const RepoSyncUpstreamInputSchema = Type.Object(
  {
    apply: Type.Optional(Type.Boolean()),
    upstreamRef: Type.Optional(Type.String({ minLength: 1 })),
    branchPrefix: Type.Optional(Type.String({ minLength: 1 })),
    inspectAfter: Type.Optional(Type.Boolean()),
    scratchPolicy: Type.Optional(ScratchPolicyInputSchema),
  },
  { additionalProperties: false },
);

export const RepoSyncUpstreamResultSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    action: DevopsActionSchema,
    branchName: Type.String({ minLength: 1 }),
    upstreamRef: Type.Object(
      {
        ref: Type.String({ minLength: 1 }),
        source: Type.Union([Type.Literal("flag"), Type.Literal("git-config"), Type.Literal("default")]),
      },
      { additionalProperties: false },
    ),
    currentBranch: Type.Union([Type.String(), Type.Null()]),
    steps: Type.Array(DevCommandStepSchema),
    followUpCommands: Type.Array(DevCommandStepSchema),
    preflight: DevPreflightSchema,
    execution: DevExecutionSchema,
    scratchPolicy: ScratchPolicyCheckSchema,
  },
  { additionalProperties: false },
);

export const WorktreeCleanupInputSchema = Type.Object(
  {
    apply: Type.Optional(Type.Boolean()),
    prefix: Type.String({ minLength: 1 }),
    mergedOnly: Type.Optional(Type.Boolean()),
    trunk: Type.Optional(Type.String({ minLength: 1 })),
    pinnedPaths: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    pinnedBranches: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    scratchPolicy: Type.Optional(ScratchPolicyInputSchema),
  },
  { additionalProperties: false },
);

export const WorktreeCleanupResultSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    action: DevopsActionSchema,
    prefix: Type.String({ minLength: 1 }),
    candidates: Type.Array(Type.Object(
      {
        path: Type.String({ minLength: 1 }),
        branch: Type.Union([Type.String(), Type.Null()]),
        reason: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    )),
    skipped: Type.Array(Type.Object(
      {
        path: Type.String({ minLength: 1 }),
        reason: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    )),
    removed: Type.Array(DevCommandStepSchema),
    followUpCommands: Type.Array(DevCommandStepSchema),
    preflight: DevPreflightSchema,
    execution: DevExecutionSchema,
    scratchPolicy: ScratchPolicyCheckSchema,
  },
  { additionalProperties: false },
);

export type DevopsAction = Static<typeof DevopsActionSchema>;
export type DevCommandStep = Static<typeof DevCommandStepSchema>;
export type DevIssue = Static<typeof DevIssueSchema>;
export type DevPreflight = Static<typeof DevPreflightSchema>;
export type ScratchPolicyInput = Static<typeof ScratchPolicyInputSchema>;
export type ScratchPolicyCheck = Static<typeof ScratchPolicyCheckSchema>;
export type StackDoctorInput = Static<typeof StackDoctorInputSchema>;
export type StackDoctorResult = Static<typeof StackDoctorResultSchema>;
export type StackDrainInput = Static<typeof StackDrainInputSchema>;
export type StackDrainResult = Static<typeof StackDrainResultSchema>;
export type RepoSyncUpstreamInput = Static<typeof RepoSyncUpstreamInputSchema>;
export type RepoSyncUpstreamResult = Static<typeof RepoSyncUpstreamResultSchema>;
export type WorktreeCleanupInput = Static<typeof WorktreeCleanupInputSchema>;
export type WorktreeCleanupResult = Static<typeof WorktreeCleanupResultSchema>;
