import { redirect } from "next/navigation";

// The Companies list grew into "Browse jobs by product". Old links (and their sort) still work.
export default async function Companies({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort } = await searchParams;
  const map: Record<string, string> = { fastest: "fastest", open: "open", pulling: "pulling" };
  const s = sort && map[sort];
  redirect(s && s !== "open" ? `/products?sort=${s}` : "/products?sort=fastest");
}
