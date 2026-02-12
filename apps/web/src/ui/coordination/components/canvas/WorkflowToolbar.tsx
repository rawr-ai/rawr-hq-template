import { COORDINATION_RUN_EVENT } from "@rawr/coordination-inngest/browser";
import type { WorkflowModel } from "../../types/workflow";

type WorkflowToolbarProps = {
  activeWorkflow: WorkflowModel;
  workflows: WorkflowModel[];
  busy: boolean;
  polling: boolean;
  validationOk: boolean;
  monitorHref: string;
  onSelectWorkflow: (workflowId: string) => void;
  onSave: () => Promise<void> | void;
  onValidate: () => Promise<void> | void;
  onRun: () => Promise<void> | void;
};

export function WorkflowToolbar({
  activeWorkflow,
  workflows,
  busy,
  polling,
  validationOk,
  monitorHref,
  onSelectWorkflow,
  onSave,
  onValidate,
  onRun,
}: WorkflowToolbarProps) {
  return (
    <section className="coordination__controls" aria-label="Workflow controls">
      <div className="coordination__controls-grid">
        <div className="coordination__field">
          <label htmlFor="coordination-workflow" className="coordination__label">
            Workflow
          </label>
          <select
            id="coordination-workflow"
            name="workflow"
            className="coordination__select"
            value={activeWorkflow.workflowId}
            onChange={(event) => onSelectWorkflow(event.target.value)}
            disabled={busy}
            aria-describedby="coordination-workflow-meta"
          >
            {workflows.map((workflow) => (
              <option key={workflow.workflowId} value={workflow.workflowId}>
                {workflow.name} ({workflow.workflowId})
              </option>
            ))}
          </select>
        </div>

        <div className="coordination__button-group" aria-label="Primary coordination actions">
          <button type="button" className="coordination__button" onClick={onSave} disabled={busy}>
            Save
          </button>
          <button type="button" className="coordination__button" onClick={onValidate} disabled={busy}>
            Validate
          </button>
          <button
            type="button"
            className="coordination__button is-primary"
            onClick={onRun}
            disabled={busy || !validationOk || polling}
          >
            {polling ? "Running…" : "Run"}
          </button>
          <a className="coordination__button coordination__monitor-link" href={monitorHref} target="_blank" rel="noreferrer">
            Inngest Runs
          </a>
        </div>
      </div>

      <p id="coordination-workflow-meta" className="coordination__meta">
        Active workflow: <code>{activeWorkflow.workflowId}</code> · version {activeWorkflow.version} · loaded {workflows.length} workflows · event <code>{COORDINATION_RUN_EVENT}</code>
      </p>
    </section>
  );
}
