import type { CSSProperties, ElementType, ReactNode } from "react";

type Corner = "tl" | "tr" | "bl" | "br";

const CORNER_POINTS: Record<Corner, (n: string) => string> = {
  tl: (n) => `${n} 0, 100% 0, 100% 100%, 0 100%, 0 ${n}`,
  tr: (n) => `0 0, calc(100% - ${n}) 0, 100% ${n}, 100% 100%, 0 100%`,
  bl: (n) => `0 0, 100% 0, 100% 100%, ${n} 100%, 0 calc(100% - ${n})`,
  br: (n) => `0 0, 100% 0, 100% calc(100% - ${n}), calc(100% - ${n}) 100%, 0 100%`,
};

// Only single- and opposite-corner combinations produce a simple convex
// polygon; that covers every case the mockup uses (cards clip one or two
// corners, never adjacent ones on the same edge).
function buildClipPath(corners: Corner[], size: string): string {
  const n = size;
  if (corners.length === 1) {
    return `polygon(${CORNER_POINTS[corners[0]](n)})`;
  }
  const set = new Set(corners);
  if (set.has("tl") && set.has("br") && !set.has("tr") && !set.has("bl")) {
    return `polygon(${n} 0, 100% 0, 100% calc(100% - ${n}), calc(100% - ${n}) 100%, 0 100%, 0 ${n})`;
  }
  if (set.has("tr") && set.has("bl") && !set.has("tl") && !set.has("br")) {
    return `polygon(0 0, calc(100% - ${n}) 0, 100% ${n}, 100% 100%, ${n} 100%, 0 calc(100% - ${n}))`;
  }
  // Fallback: chain whichever corners were requested, in TL->TR->BR->BL order.
  const order: Corner[] = ["tl", "tr", "br", "bl"];
  const active = new Set(corners);
  const points: string[] = [];
  for (const corner of order) {
    if (!active.has(corner)) continue;
    points.push(CORNER_POINTS[corner](n).split(", ")[0]);
  }
  return `polygon(${points.join(", ") || CORNER_POINTS[corners[0]](n)})`;
}

export function Clipped<T extends ElementType = "div">({
  as,
  corner = "br",
  size = "1.5rem",
  className,
  style,
  children,
}: {
  as?: T;
  corner?: Corner | Corner[];
  size?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const Component = as ?? "div";
  const corners = Array.isArray(corner) ? corner : [corner];
  return (
    <Component
      className={className}
      style={{ ...style, clipPath: buildClipPath(corners, size) }}
    >
      {children}
    </Component>
  );
}
