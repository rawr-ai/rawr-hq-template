import type { TimelineEventModel, StatusTone } from "../../types/workflow";
import { StatusBadge } from "./StatusBadge";

export function TimelineEventRow({
  event,
  tone,
}: {
  event: TimelineEventModel;
  tone: StatusTone;
}) {
  return (
    <li className="flex items-start justify-between gap-2 py-1.5">
      <div className="min-w-0">
        <code className="text-[12px] text-text-primary font-mono break-all">{event.type}</code>
        {event.deskId ? <p className="m-0 text-[11px] text-text-muted">desk: {event.deskId}</p> : null}
      </div>
      <StatusBadge tone={tone}>{event.status}</StatusBadge>
    </li>
  );
}
