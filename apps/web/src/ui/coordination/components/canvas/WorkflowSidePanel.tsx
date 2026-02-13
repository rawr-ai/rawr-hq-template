import type { WorkflowModel } from "../../types/workflow";

export function WorkflowSidePanel({ workflow }: { workflow: WorkflowModel }) {
  return (
    <aside className="coordination__panel" aria-label="Workflow details">
      <h3 className="coordination__panel-title">Workflow Details</h3>
      <p className="coordination__message">
        <strong>{workflow.name}</strong>
      </p>
      <p className="coordination__message is-muted">{workflow.description ?? "No description provided."}</p>
      <p className="coordination__meta">
        id <code>{workflow.workflowId}</code> · v{workflow.version}
      </p>
    </aside>
  );
}
