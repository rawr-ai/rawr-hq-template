import { useState } from "react";
import type React from "react";
import type {
  WorkflowEdgeModel,
  WorkflowModel,
  WorkflowNodeModel,
} from "../../types/workflow";
import { FlowCanvas } from "./FlowCanvas";
import { WorkflowToolbar } from "./WorkflowToolbar";
import { WorkflowSidePanel } from "./WorkflowSidePanel";

type CanvasWorkspaceProps = {
  activeWorkflow: WorkflowModel;
  workflowOptions: WorkflowModel[];
  busy: boolean;
  polling: boolean;
  validationOk: boolean;
  monitorHref: string | null;
  workflowEvent: string;
  nodes: WorkflowNodeModel[];
  edges: WorkflowEdgeModel[];
  onSelectWorkflow: (workflowId: string) => void;
  onSave: () => Promise<void> | void;
  onValidate: () => Promise<void> | void;
  onRun: () => Promise<void> | void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  children?: React.ReactNode;
};

export function CanvasWorkspace({
  activeWorkflow,
  workflowOptions,
  busy,
  polling,
  validationOk,
  monitorHref,
  workflowEvent,
  nodes,
  edges,
  onSelectWorkflow,
  onSave,
  onValidate,
  onRun,
  onNameChange,
  onDescriptionChange,
  children,
}: CanvasWorkspaceProps) {
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  return (
    <section
      aria-label="Canvas workspace"
      className="relative flex flex-col min-w-0 rounded-xl border border-border overflow-hidden bg-canvas transition-colors duration-200"
    >
      <div className="relative flex min-h-[500px]">
        <div className="flex-1 relative min-w-0">
          <WorkflowToolbar
            activeWorkflow={activeWorkflow}
            workflows={workflowOptions}
            busy={busy}
            polling={polling}
            validationOk={validationOk}
            workflowEvent={workflowEvent}
            monitorHref={monitorHref}
            onSelectWorkflow={onSelectWorkflow}
            onSave={onSave}
            onValidate={onValidate}
            onRun={onRun}
            sidePanelOpen={sidePanelOpen}
            onToggleSidePanel={() => setSidePanelOpen((prev) => !prev)}
          />
          <FlowCanvas nodes={nodes} edges={edges} hiddenEngine={children} />
        </div>

        <div
          className={`
            hidden md:flex flex-shrink-0 transition-all duration-200 ease-out overflow-hidden
            ${sidePanelOpen ? "w-[280px] lg:w-[320px]" : "w-0"}
          `}
        >
          {sidePanelOpen ? (
            <WorkflowSidePanel
              name={activeWorkflow.name}
              description={activeWorkflow.description ?? ""}
              onNameChange={onNameChange}
              onDescriptionChange={onDescriptionChange}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
