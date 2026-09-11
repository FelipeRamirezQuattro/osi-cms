"use client";

import { useEffect } from "react";

// Only fires if the ROOT layout itself throws (font loading, etc.) —
// app/(site)/error.tsx catches everything else. Must render its own
// <html>/<body> since it replaces the root layout entirely when active,
// so it can't rely on next/font variables or Tailwind's @theme tokens
// being available; kept to plain inline styles for that reason.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          backgroundColor: "#001b33",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <p style={{ letterSpacing: "0.15em", textTransform: "uppercase", color: "#e2902a", fontSize: "0.75rem" }}>
          Something went wrong
        </p>
        <h1 style={{ fontSize: "1.75rem", textTransform: "uppercase", margin: 0 }}>
          Odessa Separator Inc. is temporarily unavailable
        </h1>
        <button
          type="button"
          onClick={reset}
          style={{
            border: "1px solid rgba(255,255,255,0.7)",
            borderRadius: "9999px",
            padding: "0.5rem 1.5rem",
            background: "transparent",
            color: "#ffffff",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
