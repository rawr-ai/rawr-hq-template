export type LifecycleType = "cli" | "web" | "agent" | "skill" | "workflow" | "composed";

export type LifecycleCheckStatus = "pass" | "fail";

export type JudgeOutcome = "auto_merge" | "fix_first" | "policy_escalation" | "insufficient_confidence";

export type MergeDecision = "auto_merge" | "fix_first" | "policy_escalation" | "hold";

export type LifecycleCheckData = {
  status: LifecycleCheckStatus;
  target: {
    input: string;
    absPath: string;
    relPath: string;
    type: LifecycleType;
  };
  missingTests: string[];
  missingDocs: string[];
  missingDependents: string[];
  syncVerified: boolean;
  driftVerified: boolean;
  driftDetected: boolean;
  details: {
    changedFilesConsidered: string[];
    relevantChangedFiles: string[];
    dependentFiles: string[];
    codeChanged: string[];
    testChanged: string[];
    docsChanged: string[];
  };
};

export type JudgeResult = {
  judge: "A" | "B";
  outcome: JudgeOutcome;
  confidence: number;
  reason: string;
  raw?: unknown;
};

export type PolicyAssessment = {
  judge1: JudgeResult;
  judge2: JudgeResult;
  consensus: MergeDecision;
  confidence: number;
};

export type PrContext = {
  branch: string;
  prNumber: number | null;
  prUrl: string | null;
  commentsCount: number;
  commentsSummary: string[];
};

export type ImprovementResult = {
  changeUnitId: string;
  scope: "plugin-system";
  lifecycleCheck: LifecycleCheckData;
  policyAssessment: PolicyAssessment;
  prContext: PrContext;
  decision: MergeDecision;
  actions: Array<{ action: string; status: "planned" | "done" | "skipped" | "failed"; notes?: string }>;
};
