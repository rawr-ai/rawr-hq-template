import { useState } from "react";
import type { PublicEngineAction, Workflow as WorkflowKitWorkflow } from "@inngest/workflow-kit";
import type {
  RunActionState,
  WorkflowModel,
} from "../../types/workflow";
import { FlowCanvas } from "./FlowCanvas";
import { WorkflowToolbar } from "./WorkflowToolbar";
import { WorkflowSidePanel } from "./WorkflowSidePanel";

type CanvasWorkspaceProps = {
  activeWorkflow: WorkflowModel;
  workflowOptions: WorkflowModel[];
  busy: boolean;
  runAction: RunActionState;
  monitorHref: string | null;
  workflowEvent: string;
  workflowKitWorkflow: WorkflowKitWorkflow;
  trigger: unknown;
  availableActions: PublicEngineAction[];
  onEditorChange: (workflow: WorkflowKitWorkflow) => void;
  onSelectWorkflow: (workflowId: string) => void;
  onSave: () => Promise<void> | void;
  onValidate: () => Promise<void> | void;
  onRun: () => Promise<void> | void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
};

export function CanvasWorkspace({
  activeWorkflow,
  workflowOptions,
  busy,
  runAction,
  monitorHref,
  workflowEvent,
  workflowKitWorkflow,
  trigger,
  availableActions,
  onEditorChange,
  onSelectWorkflow,
  onSave,
  onValidate,
  onRun,
  onNameChange,
  onDescriptionChange,
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
            runAction={runAction}
            workflowEvent={workflowEvent}
            monitorHref={monitorHref}
            onSelectWorkflow={onSelectWorkflow}
            onSave={onSave}
            onValidate={onValidate}
            onRun={onRun}
            sidePanelOpen={sidePanelOpen}
            onToggleSidePanel={() => setSidePanelOpen((prev) => !prev)}
          />
          <FlowCanvas
            workflow={workflowKitWorkflow}
            trigger={trigger}
            availableActions={availableActions}
            onChange={onEditorChange}
          />
        </div>

        <div
          className={[
            "hidden flex-shrink-0 overflow-hidden transition-all duration-200 ease-out md:flex",
            sidePanelOpen ? "w-[280px] lg:w-[320px]" : "w-0",
          ].join(" ")}
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
