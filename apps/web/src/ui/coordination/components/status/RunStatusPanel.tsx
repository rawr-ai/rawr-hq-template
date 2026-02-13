import type {
  RunModel,
  StatusTone,
  TimelineEventModel,
  ValidationModel,
} from "../../types/workflow";
import { StatusBadge } from "./StatusBadge";
import { TimelineEventRow } from "./TimelineEventRow";

type RunStatusPanelProps = {
  validation: ValidationModel;
  lastRun: RunModel | null;
  timeline: TimelineEventModel[];
  toneForStatus: (status: string) => StatusTone;
  isLive?: boolean;
};

export function RunStatusPanel({
  validation,
  lastRun,
  timeline,
  toneForStatus,
  isLive = false,
}: RunStatusPanelProps) {
  return (
    <aside className="grid gap-3 content-start" aria-label="Run status">
      <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2.5 transition-colors duration-200">
        <span className={validation.ok ? "text-emerald-600" : "text-amber-600"} aria-hidden>
          {validation.ok ? "●" : "◐"}
        </span>
        <span className="text-[13px] text-text-body flex-1">
          {validation.ok ? "Workflow satisfies validation checks." : `Validation issues: ${validation.errors.length}`}
        </span>
        <StatusBadge tone={validation.ok ? "is-success" : "is-warning"}>{validation.ok ? "Pass" : "Fail"}</StatusBadge>
      </div>

      {lastRun ? (
        <div className="bg-surface border border-border rounded-lg p-3 transition-colors duration-200">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              {isLive ? <span className="text-amber-600 animate-pulse">●</span> : null}
              <h2 className="text-[14px] font-medium text-text-primary m-0">Run Timeline</h2>
            </div>
            <StatusBadge tone={toneForStatus(lastRun.status)}>{lastRun.status}</StatusBadge>
          </div>

          <div className="bg-canvas border border-border-subtle rounded-md px-2.5 py-2 mb-3 transition-colors duration-200">
            <code className="text-[12px] text-text-secondary break-all font-mono">{lastRun.runId}</code>
          </div>

          {lastRun.traceLinks.length ? (
            <div className="mb-3">
              <div className="flex flex-col gap-1">
                {lastRun.traceLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-accent hover:opacity-80 transition-opacity"
                  >
                    {link.label} <span className="text-[10px] opacity-50">↗</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {timeline.length > 0 ? (
            <ul className="m-0 p-0 list-none border-t border-border-subtle pt-2.5">
              {timeline.map((event) => (
                <TimelineEventRow key={event.eventId} event={event} tone={toneForStatus(event.status)} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg p-3 text-sm text-text-muted">No runs yet.</div>
      )}

      {isLive ? (
        <p className="text-[11px] text-text-muted px-1 m-0">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse mr-1 align-middle" />
          Run in progress · updates automatically
        </p>
      ) : null}
    </aside>
  );
}
