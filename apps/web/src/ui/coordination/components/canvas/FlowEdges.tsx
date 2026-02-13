import type { WorkflowEdgeModel } from "../../types/workflow";

type FlowEdgesProps = {
  edges: WorkflowEdgeModel[];
  nodePositions: Map<string, { px: number; py: number }>;
  edgeCenterX: number;
  nodeHeight: number;
};

export function FlowEdges({
  edges,
  nodePositions,
  edgeCenterX,
  nodeHeight,
}: FlowEdgesProps) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
      {edges.map((edge) => {
        const source = nodePositions.get(edge.source);
        const target = nodePositions.get(edge.target);
        if (!source || !target) return null;

        return (
          <path
            key={edge.id}
            d={`M${edgeCenterX} ${source.py + nodeHeight} L${edgeCenterX} ${target.py}`}
            fill="none"
            stroke="var(--color-edge)"
            strokeWidth="1.5"
            className="transition-colors duration-200"
          />
        );
      })}
    </svg>
  );
}
