import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import DashboardClient from "@/components/dashboard/DashboardClient";
import ResearchSection from "@/components/dashboard/ResearchSection";
import MobileSplash from "@/components/MobileSplash";


export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      {/* Mobile gate — shown below md breakpoint instead of the dashboard */}
      <MobileSplash />

      {/* Desktop layout — hidden on small screens */}
      <div className="desktop-only">
      <Navbar email={user.email ?? ""} />

      {/* Main split — min-width so it scrolls on smaller viewports */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: "1200px" }}>
          {/* Albert + VizPanel split (client — owns shared viz state) */}
          <DashboardClient />

          <ResearchSection />
        </div>
      </div>
      </div> {/* end hidden md:block */}
    </div>
  );
}
