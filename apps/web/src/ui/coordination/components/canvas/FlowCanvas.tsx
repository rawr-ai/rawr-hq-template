import { useMemo, useState, type ReactNode } from "react";
import type { WorkflowEdgeModel, WorkflowNodeModel } from "../../types/workflow";
import { FlowEdges } from "./FlowEdges";
import { FLOW_NODE_ICONS, FlowNode } from "./FlowNode";

type FlowCanvasProps = {
  nodes: WorkflowNodeModel[];
  edges: WorkflowEdgeModel[];
  hiddenEngine?: ReactNode;
};

const TOOLBAR_OFFSET = 100;
const NODE_GAP = 40;
const NODE_HEIGHT = 72;
const NODE_LEFT = 32;
const NODE_WIDTH = 240;

export function FlowCanvas({ nodes, edges, hiddenEngine }: FlowCanvasProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const layout = useMemo(
    () =>
      nodes.map((node, index) => ({
        ...node,
        px: NODE_LEFT,
        py: TOOLBAR_OFFSET + index * (NODE_HEIGHT + NODE_GAP),
      })),
    [nodes],
  );

  const nodePositions = useMemo(() => {
    const map = new Map<string, { px: number; py: number }>();
    for (const node of layout) {
      map.set(node.id, { px: node.px, py: node.py });
    }
    return map;
  }, [layout]);

  const edgeCenterX = NODE_LEFT + NODE_WIDTH / 2;

  return (
    <div className="relative h-full min-h-[500px] w-full overflow-auto bg-canvas transition-colors duration-200">
      <div
        className="pointer-events-none absolute inset-0 opacity-20 transition-colors duration-200"
        style={{
          backgroundImage: "radial-gradient(var(--color-dot-grid) 0.5px, transparent 0.5px)",
          backgroundSize: "16px 16px",
        }}
      />

      <FlowEdges edges={edges} nodePositions={nodePositions} edgeCenterX={edgeCenterX} nodeHeight={NODE_HEIGHT} />

      <div className="relative" style={{ zIndex: 1 }}>
        {layout.map((node) => (
          <div
            key={node.id}
            className="absolute"
            style={{
              top: node.py,
              left: node.px,
            }}
          >
            <FlowNode
              type={node.type}
              title={node.title}
              subtitle={node.subtitle}
              icon={node.icon ? FLOW_NODE_ICONS[node.icon] : undefined}
              selected={selectedNodeId === node.id}
              onClick={() => setSelectedNodeId(node.id)}
            />
          </div>
        ))}
      </div>

      {hiddenEngine ? <div className="pointer-events-none absolute inset-0 opacity-0">{hiddenEngine}</div> : null}
    </div>
  );
}
