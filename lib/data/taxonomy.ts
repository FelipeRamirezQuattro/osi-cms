import { createServerDbClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";

export async function listProductCategories(): Promise<Tables<"product_categories">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("product_categories")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listIndustries(): Promise<Tables<"industries">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("industries")
    .select("*")
    .eq("status", "published")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listApplications(): Promise<Tables<"applications">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("applications")
    .select("*")
    .eq("status", "published")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listServices(locale = "en"): Promise<Tables<"services">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("services")
    .select("*")
    .eq("locale", locale)
    .eq("status", "published")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getServiceBySlug(
  slug: string,
  locale = "en",
): Promise<Tables<"services"> | null> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("services")
    .select("*")
    .eq("slug", slug)
    .eq("locale", locale)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data;
}
