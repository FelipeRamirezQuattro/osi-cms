import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "OSI Admin", template: "%s | OSI Admin" },
  robots: { index: false, follow: false },
  // Browser auto-translate rewrites the DOM under React and crashes the admin.
  other: { google: "notranslate" },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="admin-root" translate="no">{children}</div>;
}
