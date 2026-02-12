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
};

export function RunStatusPanel({
  validation,
  lastRun,
  timeline,
  toneForStatus,
}: RunStatusPanelProps) {
  return (
    <aside className="coordination__side" aria-label="Workflow outcomes and trace panels">
      <section className="coordination__panel" aria-labelledby="coordination-validation-title">
        <div className="coordination__panel-header">
          <h2 id="coordination-validation-title" className="coordination__panel-title">
            Validation
          </h2>
          <StatusBadge tone={validation.ok ? "is-success" : "is-error"}>
            {validation.ok ? "Pass" : `${validation.errors.length} issues`}
          </StatusBadge>
        </div>

        {validation.ok ? (
          <p className="coordination__message">Workflow satisfies validation checks.</p>
        ) : (
          <ul className="coordination__list" aria-label="Validation issues">
            {validation.errors.map((entry, idx) => (
              <li key={`${entry.code}-${idx}`} className="coordination__list-item">
                <code>{entry.code}</code>: {entry.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="coordination__panel" aria-labelledby="coordination-timeline-title">
        <div className="coordination__panel-header">
          <h2 id="coordination-timeline-title" className="coordination__panel-title">
            Run Timeline
          </h2>
          {lastRun ? <StatusBadge tone={toneForStatus(lastRun.status)}>{lastRun.status}</StatusBadge> : null}
        </div>

        {lastRun ? (
          <p className="coordination__message">
            Run <code>{lastRun.runId}</code>
          </p>
        ) : (
          <p className="coordination__message is-muted">No runs yet.</p>
        )}

        {lastRun?.traceLinks?.length ? (
          <ul className="coordination__list" aria-label="Trace links">
            {lastRun.traceLinks.map((link) => (
              <li key={link.url} className="coordination__list-item">
                <a className="coordination__trace-link" href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {timeline.length > 0 ? (
          <ul className="coordination__list" aria-label="Timeline events">
            {timeline.map((event) => (
              <TimelineEventRow key={event.eventId} event={event} tone={toneForStatus(event.status)} />
            ))}
          </ul>
        ) : null}
      </section>
    </aside>
  );
}
