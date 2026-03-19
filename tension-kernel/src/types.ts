// === TENSION ===

export type TensionType =
  | "friction"
  | "boundary-stress"
  | "coupling"
  | "contradiction"
  | "question";

export type Polarity = "cohesion" | "indifferent" | "tension" | "unresolved";

export interface ResonanceEntry {
  assessment: "agree" | "indifferent" | "disagree";
  entry: string | null; // their own tension ID if they logged one
  reason: string;
  weight: number; // coupling strength (1.0 = direct, 0.5 = indirect)
}

export interface Tension {
  id: string;
  stewardId: string;
  domain: string;
  type: TensionType;
  description: string;
  evidence: string[];
  createdAt: number;
  resonance: Map<string, ResonanceEntry>;
  polarity: Polarity;
  magnitude: number;
  resolvedBy: string | null;
}

// === STEWARD ===

export interface Steward {
  id: string;
  name: string;
  domain: string;
  ownedPaths: string[];
  ledger: Tension[];
  parentId: string | null;
  children: string[];
  sessionHistory: string[];
}

// === ACTION ===

export type ActionType =
  | "write-file"
  | "modify-file"
  | "log-tension"
  | "propose-boundary"
  | "assess-tension"
  | "resolve-tension";

export interface Action {
  id: string;
  stewardId: string;
  type: ActionType;
  description: string;
  filesAffected: string[];
  timestamp: number;
}

// === STEWARD OUTPUT (LLM response shape) ===

export interface WriteFileAction {
  type: "write-file";
  path: string;
  content: string;
  why: string;
}

export interface ModifyFileAction {
  type: "modify-file";
  path: string;
  content: string;
  why: string;
}

export interface LogTensionAction {
  type: "log-tension";
  tension: {
    type: TensionType;
    description: string;
    evidence: string[];
  };
}

export interface ProposeBoundaryAction {
  type: "propose-boundary";
  newDomain: string;
  newName: string;
  paths: string[];
  reason: string;
}

export interface ResolveTensionAction {
  type: "resolve-tension";
  tensionId: string;
  how: string;
}

export type StewardAction =
  | WriteFileAction
  | ModifyFileAction
  | LogTensionAction
  | ProposeBoundaryAction
  | ResolveTensionAction;

export interface StewardOutput {
  reasoning: string;
  actions: StewardAction[];
  done: boolean;
}

// === SYSTEM STATE ===

export interface SystemState {
  objective: string;
  stewards: Map<string, Steward>;
  tensions: Map<string, Tension>;
  actions: Action[];
  files: Map<string, string>;
  maxStewards: number;
  round: number;
}

// === USAGE TRACKING ===

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface RoundSummary {
  round: number;
  stewardResults: Array<{
    stewardId: string;
    stewardName: string;
    actionCount: number;
    done: boolean;
  }>;
  newTensions: Tension[];
  boundariesProposed: number;
  boundariesApproved: number;
  escalations: Tension[];
  usage: TokenUsage;
  cost: number;
}

// === BOUNDARY PROPOSAL ===

export interface BoundaryProposal {
  proposingStewardId: string;
  newDomain: string;
  newName: string;
  paths: string[];
  reason: string;
  tensionId?: string;
}
