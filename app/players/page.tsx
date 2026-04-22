import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import MobileSplash from "@/components/MobileSplash";
import PlayerSearch from "@/components/players/PlayerSearch";

export const metadata = { title: "Players — Heater" };

export default async function PlayersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      <MobileSplash />
      <div className="desktop-only">
        <Navbar email={user.email ?? ""} />
        <PlayerSearch />
      </div>
    </div>
  );
}
