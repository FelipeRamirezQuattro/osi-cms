/**
 * Email clients ignore external CSS, custom properties and web fonts, so the
 * newsletter uses literal values and a system font stack. Colors match the
 * site palette (navy/cream/gold from CLAUDE.md's design tokens).
 */
export const EMAIL = {
  navy: "#001B33",
  cream: "#F2E9DE",
  gold: "#E2902A",
  ink: "#1F2937",
  muted: "#5B6472",
  white: "#FFFFFF",
  rule: "#E3DDD3",
  font: 'Helvetica, Arial, "Segoe UI", sans-serif',
  /** Content column width — the usual safe maximum for email clients. */
  width: 600,
} as const;
