import type { ButtonHTMLAttributes, ReactNode } from "react";

type Surface = "cream" | "navy";

export function Eyebrow({ children, surface = "cream", className = "" }: { children: ReactNode; surface?: Surface; className?: string }) {
  return (
    <p className={`text-xs font-semibold tracking-[0.12em] uppercase ${surface === "navy" ? "text-brand-accent-dark" : "text-brand-accent-light"} ${className}`}>
      {children}
    </p>
  );
}

export function SectionHeader({ eyebrow, title, lede, align = "left", surface = "cream", className = "" }: { eyebrow?: string; title: string; lede?: string; align?: "left" | "center"; surface?: Surface; className?: string }) {
  const centered = align === "center";
  return (
    <header className={`${centered ? "mx-auto text-center" : ""} ${className}`}>
      {eyebrow && <Eyebrow surface={surface} className="mb-3">{eyebrow}</Eyebrow>}
      <h2 className="font-editorial text-section font-semibold text-balance">{title}</h2>
      {lede && (
        <p className={`mt-4 max-w-[var(--site-reading-width)] text-base leading-relaxed ${surface === "navy" ? "text-[var(--brand-color-muted-text-on-dark)]" : "text-[var(--brand-color-muted-text-on-light)]"} ${centered ? "mx-auto" : ""}`}>
          {lede}
        </p>
      )}
    </header>
  );
}

export function IconButton({ label, children, className = "", ...props }: { label: string; children: ReactNode; className?: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children">) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-current/20 transition-[color,background-color,border-color,transform,opacity] duration-200 hover:bg-current/8 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function MediaFrame({ children, aspect = "video", className = "" }: { children?: ReactNode; aspect?: "video" | "square" | "portrait"; className?: string }) {
  const aspectClass = aspect === "square" ? "aspect-square" : aspect === "portrait" ? "aspect-[4/5]" : "aspect-video";
  return (
    <div className={`relative overflow-hidden rounded-[var(--site-radius-lg)] border border-[var(--site-border)] bg-[var(--site-surface-raised)] ${aspectClass} ${className}`}>
      {children ?? (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[var(--brand-color-muted-text-on-light)]">
          Media unavailable
        </div>
      )}
    </div>
  );
}

export function Divider({ surface = "cream", className = "" }: { surface?: Surface; className?: string }) {
  return <hr className={`border-0 border-t ${surface === "navy" ? "border-[var(--brand-color-border-on-dark)]" : "border-[var(--site-border)]"} ${className}`} />;
}

export function StatusMessage({ children, tone = "info", title }: { children: ReactNode; tone?: "info" | "success" | "error"; title?: string }) {
  const classes = tone === "error" ? "border-red-700/30 bg-red-50 text-red-950" : tone === "success" ? "border-emerald-700/30 bg-emerald-50 text-emerald-950" : "border-osi-steel-500/25 bg-osi-steel-500/8 text-osi-navy-900";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-[var(--site-radius-md)] border p-4 text-sm ${classes}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--site-radius-lg)] border border-[var(--site-border)] bg-[var(--site-surface-raised)] px-6 py-10 text-center md:px-10">
      <span aria-hidden="true" className="mx-auto mb-5 block h-10 w-px bg-brand-accent-light" />
      <h2 className="font-editorial text-2xl font-semibold text-balance">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[var(--brand-color-muted-text-on-light)]">{description}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function PublicSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`rounded-[var(--site-radius-lg)] border border-[var(--site-border)] bg-white/35 p-6 ${className}`}>
      <div className="mb-6 h-5 w-2/5 rounded-full bg-osi-navy-900/10 motion-safe:animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className={`h-3 rounded-full bg-osi-navy-900/8 motion-safe:animate-pulse ${index === lines - 1 ? "w-3/5" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}
