import type React from "react";
import type { NodeType } from "../../types/workflow";
import {
  CpuIcon,
  InboxIcon,
  PlayIcon,
  ZapIcon,
} from "../../../components/icons";

type FlowNodeProps = {
  type: NodeType;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
};

export function FlowNode({
  type,
  title,
  subtitle,
  icon,
  selected = false,
  onClick,
}: FlowNodeProps) {
  return (
    <div
      tabIndex={0}
      role="button"
      aria-roledescription="workflow node"
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      className={[
        "relative h-[72px] w-[240px] cursor-pointer rounded-lg border px-3.5 py-3",
        "flex flex-col justify-center bg-surface transition-colors duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected ? "border-accent" : "border-border hover:border-text-muted",
      ].join(" ")}
    >
      {type === "action" ? (
        <div className="absolute -top-[4px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-canvas bg-node-handle transition-colors duration-200" />
      ) : null}

      <div className="mb-0.5 flex min-w-0 items-center gap-2">
        <div className="flex-shrink-0 text-text-muted">
          {icon ?? (type === "trigger" ? <ZapIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />)}
        </div>
        <p className="truncate text-[13px] font-medium leading-tight text-text-primary">{title}</p>
      </div>
      <p className="truncate pl-[22px] text-[11px] text-text-muted">{subtitle}</p>

      <div className="absolute -bottom-[4px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-border bg-surface transition-colors duration-200" />
    </div>
  );
}

export const FLOW_NODE_ICONS: Readonly<Record<string, React.ReactNode>> = {
  zap: <ZapIcon className="h-3.5 w-3.5" />,
  inbox: <InboxIcon className="h-3.5 w-3.5" />,
  cpu: <CpuIcon className="h-3.5 w-3.5" />,
  play: <PlayIcon className="h-3.5 w-3.5" />,
};
