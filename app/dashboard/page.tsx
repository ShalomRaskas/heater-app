import { redirect } from "next/navigation";
import { ArrowRight, Flame, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import FeatureCard from "@/components/FeatureCard";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Navbar email={user.email ?? ""} />
      <main className="mx-auto max-w-4xl px-6 py-20">
        <section className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <Flame
              className="h-11 w-11"
              fill="currentColor"
              strokeWidth={1.5}
              style={{ color: "#D32F2F" }}
            />
            <span className="text-5xl font-bold uppercase tracking-[0.2em]">
              Heater
            </span>
          </div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D32F2F]/30 bg-[#D32F2F]/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[#D32F2F]">
            <Sparkles className="h-3.5 w-3.5" />
            Early access member
          </div>
          <h1 className="mb-3 text-4xl font-bold">Welcome to Heater.</h1>
          <p className="text-base text-white/60">
            Signed in as {user.email}. You&apos;re one of the first.
          </p>
        </section>

        <div className="mb-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-white/40">
            Coming soon
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FeatureCard
            title="Albert"
            description="Your AI scout. Always on. Always reading."
            icon={Sparkles}
            color="#D32F2F"
          />
          <FeatureCard
            title="Heater Boards"
            description="Who's heating up — live, across every category."
            icon={Flame}
            color="#ff6b35"
          />
          <FeatureCard
            title="Deep Scout"
            description="Every stat on every player, one page."
            icon={ArrowRight}
            color="#4a9eff"
          />
        </div>

        <div className="mt-10 flex items-start gap-4 rounded-xl border border-[#D32F2F]/20 bg-[#D32F2F]/5 p-6">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "#D32F2F20" }}
          >
            <Flame
              className="h-5 w-5"
              fill="currentColor"
              strokeWidth={1.5}
              style={{ color: "#D32F2F" }}
            />
          </div>
          <div>
            <h4 className="mb-1 font-bold">
              The dashboard is still being built.
            </h4>
            <p className="text-sm leading-relaxed text-white/60">
              You&apos;re seeing the foundation of Heater. Albert, the Boards,
              and the Deep Scout are coming in future updates. You&apos;ll be
              the first to know.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
