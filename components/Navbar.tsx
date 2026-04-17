import { Flame, LogOut } from "lucide-react";
import { BRAND } from "@/lib/constants";

export default function Navbar({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0a0f]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Flame
            className="h-5 w-5"
            fill="currentColor"
            strokeWidth={1.5}
            style={{ color: "#D32F2F" }}
          />
          <span className="text-sm font-bold uppercase tracking-[0.2em]">
            {BRAND.name}
          </span>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          <span className="text-sm text-white/60">{email}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="group inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-white/80 transition hover:border-[#D32F2F]/60 hover:text-[#D32F2F]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
