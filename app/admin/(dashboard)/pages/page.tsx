import { listAllPages } from "@/lib/data/pages";
import { PagesList } from "./pages-list";

export const dynamic = "force-dynamic";

export default async function AdminPagesListPage() {
  const pages = await listAllPages();
  return <PagesList pages={pages} />;
}
