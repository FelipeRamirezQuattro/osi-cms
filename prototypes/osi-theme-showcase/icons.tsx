import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ArrowUpRightIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M7 17 17 7M8 7h9v9" /></svg>;
}

export function ArrowRightIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
}

export function ChevronDownIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="m7 10 5 5 5-5" /></svg>;
}

export function MenuIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

export function FlowIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M3 7h12a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h12" /><path d="m18 4 3 3-3 3M6 16l-3 3 3 3" /></svg>;
}

export function ShieldIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M12 3 5 6v5c0 4.7 2.6 8.1 7 10 4.4-1.9 7-5.3 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
}

export function MeasureIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M4 17 17 4l3 3L7 20H4v-3Z" /><path d="m12 9 3 3M9 12l2 2M15 6l2 2" /></svg>;
}

export function PinIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
}
