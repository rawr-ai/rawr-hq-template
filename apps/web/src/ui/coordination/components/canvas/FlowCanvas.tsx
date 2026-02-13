import type { PublicEngineAction, Workflow as WorkflowKitWorkflow } from "@inngest/workflow-kit";
import { Editor, Provider } from "@inngest/workflow-kit/ui";

type FlowCanvasProps = {
  workflow: WorkflowKitWorkflow;
  trigger: unknown;
  availableActions: PublicEngineAction[];
  onChange: (workflow: WorkflowKitWorkflow) => void;
};

export function FlowCanvas({ workflow, trigger, availableActions, onChange }: FlowCanvasProps) {
  return (
    <div className="coordination-flow-canvas relative h-full min-h-[500px] w-full overflow-hidden bg-canvas transition-colors duration-200">
      <div
        className="pointer-events-none absolute inset-0 opacity-20 transition-colors duration-200"
        style={{
          backgroundImage: "radial-gradient(var(--color-dot-grid) 0.5px, transparent 0.5px)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative z-[1] h-full min-h-[500px]">
        <Provider workflow={workflow} trigger={trigger} availableActions={availableActions} onChange={onChange}>
          <Editor direction="down" />
        </Provider>
      </div>
    </div>
  );
}
