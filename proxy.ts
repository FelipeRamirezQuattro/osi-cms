import type { NextRequest } from "next/server";
import { guardAdminRequest } from "@/lib/auth";

// Next.js 16 renamed middleware.ts -> proxy.ts (see CLAUDE.md). Gates
// every /admin/* route except /admin/login behind an active
// admin_profiles row.
export async function proxy(request: NextRequest) {
  return guardAdminRequest(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
