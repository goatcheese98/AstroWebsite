import { nanoid } from "nanoid";

interface NodeSpec {
  id: string;
  label: string;
}

interface EdgeSpec {
  from: string;
  to: string;
  label?: string;
}

function cleanLabel(value: string): string {
  return value.replace(/^"|"$/g, "").trim();
}

function parseD2(input: string): { nodes: NodeSpec[]; edges: EdgeSpec[] } {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const nodeMap = new Map<string, NodeSpec>();
  const edges: EdgeSpec[] = [];

  for (const line of lines) {
    const edgeMatch = line.match(/^([a-zA-Z0-9_-]+)\s*->\s*([a-zA-Z0-9_-]+)(?:\s*:\s*(.+))?$/);
    if (edgeMatch) {
      const from = edgeMatch[1];
      const to = edgeMatch[2];
      const label = edgeMatch[3] ? cleanLabel(edgeMatch[3]) : undefined;

      if (!nodeMap.has(from)) {
        nodeMap.set(from, { id: from, label: from });
      }
      if (!nodeMap.has(to)) {
        nodeMap.set(to, { id: to, label: to });
      }

      edges.push({ from, to, label });
      continue;
    }

    const nodeMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.+)$/);
    if (nodeMatch) {
      const id = nodeMatch[1];
      const label = cleanLabel(nodeMatch[2]);
      nodeMap.set(id, { id, label: label || id });
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
  };
}

export function convertD2ToExcalidrawElements(source: string): unknown[] {
  const { nodes, edges } = parseD2(source);
  if (nodes.length === 0) {
    return [];
  }

  const nodeWidth = 180;
  const nodeHeight = 70;
  const xSpacing = 240;
  const ySpacing = 140;

  const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const rows = Math.ceil(nodes.length / columns);

  const positionedNodes = nodes.map((node, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;

    return {
      ...node,
      x: column * xSpacing,
      y: row * ySpacing,
      width: nodeWidth,
      height: nodeHeight,
    };
  });

  const nodeById = new Map(positionedNodes.map((node) => [node.id, node]));

  const elements: unknown[] = [];

  for (const node of positionedNodes) {
    elements.push({
      id: nanoid(),
      type: "rectangle",
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      strokeColor: "#1f2937",
      backgroundColor: "#f8fafc",
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 0,
      opacity: 100,
      roundness: { type: 3 },
    });

    elements.push({
      id: nanoid(),
      type: "text",
      x: node.x + 16,
      y: node.y + 22,
      width: node.width - 32,
      height: 20,
      text: node.label,
      fontSize: 20,
      fontFamily: 3,
      strokeColor: "#111827",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      roughness: 0,
      opacity: 100,
    });
  }

  for (const edge of edges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) {
      continue;
    }

    const x1 = from.x + from.width;
    const y1 = from.y + from.height / 2;
    const x2 = to.x;
    const y2 = to.y + to.height / 2;

    elements.push({
      id: nanoid(),
      type: "line",
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      points: [
        [0, 0],
        [x2 - x1, y2 - y1],
      ],
      strokeColor: "#334155",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 0,
      opacity: 100,
      endArrowhead: "arrow",
    });

    if (edge.label) {
      elements.push({
        id: nanoid(),
        type: "text",
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2 - 16,
        width: edge.label.length * 8,
        height: 16,
        text: edge.label,
        fontSize: 14,
        fontFamily: 3,
        strokeColor: "#475569",
        backgroundColor: "#ffffff",
        fillStyle: "solid",
        strokeWidth: 1,
        roughness: 0,
        opacity: 100,
      });
    }
  }

  return elements;
}
