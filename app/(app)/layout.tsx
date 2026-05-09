import { Navbar } from "@/components/shared/Navbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getLeadCount(): Promise<number> {
  try {
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase
      .from("leads")
      .select("place_id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const leadCount = await getLeadCount();
  return (
    <>
      <Navbar leadCount={leadCount} />
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
    </>
  );
}
