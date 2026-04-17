import { Flame } from "lucide-react";
import LoginForm from "@/components/LoginForm";
import { BRAND } from "@/lib/constants";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-2">
        <Flame
          className="h-6 w-6"
          fill="currentColor"
          strokeWidth={1.5}
          style={{ color: "#D32F2F" }}
        />
        <span className="text-xl font-bold uppercase tracking-[0.2em]">
          {BRAND.name}
        </span>
      </div>
      <LoginForm />
      <p className="mt-8 text-xs text-white/40">Built for baseball nerds</p>
    </div>
  );
}
