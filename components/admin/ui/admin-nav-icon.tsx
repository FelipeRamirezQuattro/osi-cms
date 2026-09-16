export function AdminNavIcon({ href }: { href: string }) {
  const common = {
    className: "admin-sidebar-icon",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (href === "/admin") {
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
    );
  }

  if (href.includes("media")) {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="9" r="1.5" />
        <path d="m4 17 4.5-4.5 3.25 3.25 2.5-2.5L20 19" />
      </svg>
    );
  }

  if (href.includes("location")) {
    return (
      <svg {...common}>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (href.includes("users") || href.includes("directory")) {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17 14.5a5.5 5.5 0 0 1 3.5 5.5" />
      </svg>
    );
  }

  if (href.includes("settings")) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1H9.6A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4V9.6A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1h4A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.27.36.48.76.6 1.2.08.29.25.56.5.75.25.18.55.28.85.28v1.54c-.3 0-.6.1-.85.28-.25.2-.42.46-.5.75-.12.44-.33.84-.6 1.2Z" />
      </svg>
    );
  }

  if (href.includes("branding")) {
    return (
      <svg {...common}>
        <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2.2-.9 1.7-2-.4-.8.1-1.8 1.1-1.8H17a4 4 0 0 0 4-4C21 7.6 17 3 12 3Z" />
        <circle cx="7.5" cy="11" r="1" />
        <circle cx="10" cy="7.5" r="1" />
        <circle cx="14" cy="7" r="1" />
        <circle cx="17" cy="10" r="1" />
      </svg>
    );
  }

  if (href.includes("navigation") || href.includes("redirect")) {
    return (
      <svg {...common}>
        <path d="M5 6h14M5 12h9M5 18h14" />
        <circle cx="3" cy="6" r=".5" fill="currentColor" />
        <circle cx="3" cy="12" r=".5" fill="currentColor" />
        <circle cx="3" cy="18" r=".5" fill="currentColor" />
      </svg>
    );
  }

  if (href.includes("product") || href.includes("industr") || href.includes("application")) {
    return (
      <svg {...common}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12v9" />
      </svg>
    );
  }

  if (href.includes("audit")) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (href.includes("submission")) {
    return (
      <svg {...common}>
        <path d="M4 4h16v15H4zM4 14h4l2 2h4l2-2h4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M6 3.5h8l4 4V20H6z" />
      <path d="M14 3.5V8h4M9 12h6M9 16h6" />
    </svg>
  );
}
