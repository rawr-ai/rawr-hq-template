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
    <li className="coordination__list-item coordination__timeline-item">
      <span className="coordination__timeline-type">
        <code>{event.type}</code>
        {event.deskId ? <span>({event.deskId})</span> : null}
      </span>
      <StatusBadge tone={tone}>{event.status}</StatusBadge>
    </li>
  );
}
