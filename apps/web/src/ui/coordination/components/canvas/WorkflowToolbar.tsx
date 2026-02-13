import { COORDINATION_RUN_EVENT } from "@rawr/coordination-inngest/browser";
import type { WorkflowModel } from "../../types/workflow";
import {
  ExternalLinkIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
} from "../../../components/icons";

type WorkflowToolbarProps = {
  activeWorkflow: WorkflowModel;
  workflows: WorkflowModel[];
  busy: boolean;
  polling: boolean;
  needsSave: boolean;
  validationOk: boolean;
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
  const base = "px-2.5 py-1.5 rounded-md text-[12px] font-medium border transition-colors";
  if (!enabled) {
    return `${base} text-text-secondary bg-raised border-border opacity-40 cursor-not-allowed`;
  }
  if (accent) {
    return `${base} text-accent bg-accent-bg border-accent-border hover:bg-accent-bg cursor-pointer`;
  }
  return `${base} text-text-primary bg-raised border-border hover:bg-border-subtle cursor-pointer`;
}

export function WorkflowToolbar({
  activeWorkflow,
  workflows,
  busy,
  polling,
  needsSave,
  validationOk,
  workflowEvent,
  monitorHref,
  sidePanelOpen,
  onToggleSidePanel,
  onSelectWorkflow,
  onSave,
  onValidate,
  onRun,
}: WorkflowToolbarProps) {
  const canRun = !busy && !polling && validationOk;
  const effectiveEvent = workflowEvent || COORDINATION_RUN_EVENT;

  return (
    <div className="absolute top-0 left-0 right-0 z-[5] pointer-events-none p-2">
      <div className="pointer-events-auto flex items-center gap-2 bg-glass backdrop-blur-sm border border-border rounded-lg px-2.5 py-1.5 transition-colors duration-200">
        <select
          value={activeWorkflow.workflowId}
          onChange={(event) => onSelectWorkflow(event.target.value)}
          disabled={workflows.length <= 1 || busy}
          aria-label="Select workflow"
          className="flex-1 min-w-0 bg-raised text-text-primary text-[13px] border border-border rounded-md px-2 py-1.5 cursor-default truncate transition-colors duration-200"
        >
          {workflows.map((workflow) => (
            <option key={workflow.workflowId} value={workflow.workflowId}>
              {workflow.name} ({workflow.workflowId})
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button disabled={busy} onClick={onSave} className={toolbarBtnClass(!busy)}>
            Save
          </button>
          <button disabled={busy} onClick={onValidate} className={toolbarBtnClass(!busy)}>
            Validate
          </button>
          <button
            disabled={!canRun}
            onClick={onRun}
            className={polling ? `${toolbarBtnClass(false)} text-accent bg-accent-bg border-accent-border opacity-60` : toolbarBtnClass(canRun, true)}
          >
            {polling ? "Running…" : needsSave ? "Save + Run" : "Run"}
          </button>

          {monitorHref ? (
            <a
              href={monitorHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-text-secondary hover:text-text-primary bg-raised border border-border hover:bg-border-subtle transition-colors"
            >
              Runs <ExternalLinkIcon className="h-3 w-3 opacity-40" />
            </a>
          ) : (
            <button
              type="button"
              aria-disabled="true"
              disabled
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-text-muted bg-raised border border-border opacity-60"
            >
              Runs
            </button>
          )}

          <div className="w-px h-5 bg-border mx-0.5 hidden md:block" />

          <button
            type="button"
            onClick={onToggleSidePanel}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-md text-text-secondary hover:text-text-primary hover:bg-raised transition-colors"
            aria-label={sidePanelOpen ? "Hide details" : "Show details"}
          >
            {sidePanelOpen ? <PanelRightCloseIcon className="h-3.5 w-3.5" /> : <PanelRightOpenIcon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="pointer-events-auto mt-1.5 inline-block bg-glass-subtle border border-border-subtle rounded-md px-2 py-1 text-[11px] text-text-muted transition-colors duration-200">
        <code className="text-text-secondary font-mono">{activeWorkflow.workflowId}</code>
        <span className="mx-1">·</span>v{activeWorkflow.version}
        <span className="mx-1">·</span>
        <code className="text-text-secondary font-mono">{effectiveEvent}</code>
      </div>
    </div>
  );
}
