/**
 * Motif 3 — the stats-band hairline grid: 1px steel rules at ~15%
 * opacity forming an asymmetric grid. Purely decorative (aria-hidden);
 * lay real content on top with its own grid/flex layout.
 */
export function HairlineGrid({
  cols = 3,
  rows = 2,
  className = "",
}: {
  cols?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(to right, var(--color-osi-steel-500) 1px, transparent 1px), " +
          "linear-gradient(to bottom, var(--color-osi-steel-500) 1px, transparent 1px)",
        backgroundSize: `${100 / cols}% 100%, 100% ${100 / rows}%`,
        opacity: 0.15,
      }}
    />
  );
}
