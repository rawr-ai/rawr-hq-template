import type {
  CoordinationWorkflowV1,
  DeskRunEventV1,
  RunStatusV1,
  ValidationResultV1,
} from "@rawr/coordination";

export type WorkflowModel = CoordinationWorkflowV1;
export type RunModel = RunStatusV1;
export type TimelineEventModel = DeskRunEventV1;
export type ValidationModel = ValidationResultV1;

export type WorkflowsResponse = {
  ok: boolean;
  workflows?: WorkflowModel[];
};

export type CreateWorkflowResponse = {
  ok: boolean;
  workflow?: WorkflowModel;
};

export type RunResponse = {
  ok: boolean;
  run?: RunModel;
};

export type TimelineResponse = {
  ok: boolean;
  timeline?: TimelineEventModel[];
};

export type RunStatusResponse = {
  ok: boolean;
  run?: RunModel;
};

export type PaletteCommand = {
  id: string;
  label: string;
  run: () => Promise<void> | void;
};

export type StatusKind = "success" | "warning" | "error" | "info" | "neutral";

export type RunActionState = Readonly<{
  disabled: boolean;
  label: string;
}>;
