import type React from "react";
import type { WorkflowModel } from "../../types/workflow";
import { FlowCanvas } from "./FlowCanvas";
import { WorkflowToolbar } from "./WorkflowToolbar";

type CanvasWorkspaceProps = {
  activeWorkflow: WorkflowModel;
  workflowOptions: WorkflowModel[];
  busy: boolean;
  polling: boolean;
  validationOk: boolean;
  monitorHref: string;
  onSelectWorkflow: (workflowId: string) => void;
  onSave: () => Promise<void> | void;
  onValidate: () => Promise<void> | void;
  onRun: () => Promise<void> | void;
  children: React.ReactNode;
};

export function CanvasWorkspace({
  activeWorkflow,
  workflowOptions,
  busy,
  polling,
  validationOk,
  monitorHref,
  onSelectWorkflow,
  onSave,
  onValidate,
  onRun,
  children,
}: CanvasWorkspaceProps) {
  return (
    <section className="coordination__panel coordination__panel--canvas" aria-label="Canvas workspace">
      <div className="coordination__panel-header">
        <div>
          <h2 className="coordination__panel-title">Canvas Workspace</h2>
          <p className="coordination__panel-subtitle">Primary handoff design surface</p>
        </div>
      </div>

      <div className="coordination__canvas-stage">
        <WorkflowToolbar
          activeWorkflow={activeWorkflow}
          workflows={workflowOptions}
          busy={busy}
          polling={polling}
          validationOk={validationOk}
          monitorHref={monitorHref}
          onSelectWorkflow={onSelectWorkflow}
          onSave={onSave}
          onValidate={onValidate}
          onRun={onRun}
        />

        <FlowCanvas>{children}</FlowCanvas>
      </div>
    </section>
  );
}
