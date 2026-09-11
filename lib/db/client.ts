import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Sole entry point for the database driver. Supabase is the MVP database
 * only (see CLAUDE.md) — every repository in lib/data/* must go through
 * these factories so swapping the driver later means editing only this
 * file plus lib/data/*, never a component or route handler.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createServerDbClient() {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: async () => (await cookies()).getAll(),
      setAll: async (cookiesToSet) => {
        try {
          const store = await cookies();
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — the session refresh is
          // handled by proxy.ts instead. Safe to ignore.
        }
      },
    },
  });
}

export function createBrowserDbClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function createServiceRoleDbClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createServerClient<Database>(supabaseUrl, serviceRoleKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
