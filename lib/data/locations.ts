import { createServerDbClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";

export async function listLocations(): Promise<Tables<"locations">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("locations")
    .select("*")
    .eq("status", "published")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listDirectoryContacts(): Promise<Tables<"directory_contacts">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("directory_contacts")
    .select("*")
    .eq("status", "published")
    .order("department", { ascending: true })
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
