import { COORDINATION_RUN_EVENT } from "@rawr/coordination-inngest/browser";
import type { RunActionState, WorkflowModel } from "../../types/workflow";
import {
  ExternalLinkIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
} from "../../../components/icons";

type WorkflowToolbarProps = {
  activeWorkflow: WorkflowModel;
  workflows: WorkflowModel[];
  busy: boolean;
  runAction: RunActionState;
  workflowEvent: string;
  monitorHref: string | null;
  sidePanelOpen: boolean;
  onToggleSidePanel: () => void;
  onSelectWorkflow: (workflowId: string) => void;
  onSave: () => Promise<void> | void;
  onValidate: () => Promise<void> | void;
  onRun: () => Promise<void> | void;
};

function toolbarBtnClass(enabled: boolean, accent = false): string {
  const base = "rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors";
  if (!enabled) {
    return `${base} cursor-not-allowed border-border bg-raised text-text-secondary opacity-40`;
  }
  if (accent) {
    return `${base} cursor-pointer border-accent-border bg-accent-bg text-accent hover:bg-accent-bg`;
  }
  return `${base} cursor-pointer border-border bg-raised text-text-primary hover:bg-border-subtle`;
}

export function WorkflowToolbar({
  activeWorkflow,
  workflows,
  busy,
  runAction,
  workflowEvent,
  monitorHref,
  sidePanelOpen,
  onToggleSidePanel,
  onSelectWorkflow,
  onSave,
  onValidate,
  onRun,
}: WorkflowToolbarProps) {
  const effectiveEvent = workflowEvent || COORDINATION_RUN_EVENT;

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-[5] p-2">
      <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-glass px-2.5 py-1.5 backdrop-blur-sm transition-colors duration-200">
        <select
          value={activeWorkflow.workflowId}
          onChange={(event) => onSelectWorkflow(event.target.value)}
          disabled={workflows.length <= 1 || busy}
          aria-label="Select workflow"
          className="min-w-0 flex-1 truncate rounded-md border border-border bg-raised px-2 py-1.5 text-[13px] text-text-primary transition-colors duration-200"
        >
          {workflows.map((workflow) => (
            <option key={workflow.workflowId} value={workflow.workflowId}>
              {workflow.name} ({workflow.workflowId})
            </option>
          ))}
        </select>

        <div className="flex flex-shrink-0 items-center gap-1">
          <button disabled={busy} onClick={onSave} className={toolbarBtnClass(!busy)}>
            Save
          </button>
          <button disabled={busy} onClick={onValidate} className={toolbarBtnClass(!busy)}>
            Validate
          </button>
          <button
            disabled={runAction.disabled}
            onClick={onRun}
            className={
              runAction.disabled
                ? `${toolbarBtnClass(false)} border-accent-border bg-accent-bg text-accent opacity-60`
                : toolbarBtnClass(true, true)
            }
          >
            {runAction.label}
          </button>

          {monitorHref ? (
            <a
              href={monitorHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-raised px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-border-subtle hover:text-text-primary"
            >
              Runs <ExternalLinkIcon className="h-3 w-3 opacity-40" />
            </a>
          ) : (
            <button
              type="button"
              aria-disabled="true"
              disabled
              className="inline-flex items-center gap-1 rounded-md border border-border bg-raised px-2.5 py-1.5 text-[12px] font-medium text-text-muted opacity-60"
            >
              Runs
            </button>
          )}

          <div className="mx-0.5 hidden h-5 w-px bg-border md:block" />

          <button
            type="button"
            onClick={onToggleSidePanel}
            className="hidden h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-raised hover:text-text-primary md:flex"
            aria-label={sidePanelOpen ? "Hide details" : "Show details"}
          >
            {sidePanelOpen ? <PanelRightCloseIcon className="h-3.5 w-3.5" /> : <PanelRightOpenIcon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="pointer-events-auto mt-1.5 inline-block rounded-md border border-border-subtle bg-glass-subtle px-2 py-1 text-[11px] text-text-muted transition-colors duration-200">
        <code className="font-mono text-text-secondary">{activeWorkflow.workflowId}</code>
        <span className="mx-1">·</span>v{activeWorkflow.version}
        <span className="mx-1">·</span>
        <code className="font-mono text-text-secondary">{effectiveEvent}</code>
      </div>
    </div>
  );
}
