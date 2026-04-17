"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  ArrowRight,
  Clock,
  Lock,
  Mail,
} from "lucide-react";
import { sendMagicLink, type LoginState } from "@/app/login/actions";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

const initialState: LoginState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#D32F2F] font-bold text-white transition hover:bg-[#b71c1c] disabled:opacity-60"
    >
      {pending ? "Sending..." : "Send magic link"}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useFormState(sendMagicLink, initialState);

  if (state.status === "sent") {
    return (
      <Card>
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "#D32F2F20" }}
          >
            <Mail className="h-7 w-7" style={{ color: "#D32F2F" }} />
          </div>
          <h1 className="mb-3 text-2xl font-bold">Check your email</h1>
          <p className="mb-6 text-sm text-white/60">
            We sent a magic link to{" "}
            <span className="text-white">{state.email}</span>
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/60">
            <Clock className="h-3.5 w-3.5" />
            Link expires in 60 minutes
          </div>
          <form action={formAction} className="mt-6">
            <input type="hidden" name="email" value="" />
            <button
              type="submit"
              className="text-sm text-white/50 transition hover:text-white"
            >
              ← Use a different email
            </button>
          </form>
        </div>
      </Card>
    );
  }

  if (state.status === "not_on_waitlist") {
    return (
      <Card borderClassName="border-[#D32F2F]/40">
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "#D32F2F20" }}
          >
            <Lock className="h-7 w-7" style={{ color: "#D32F2F" }} />
          </div>
          <h1 className="mb-3 text-2xl font-bold">Not on the list yet</h1>
          <p className="mb-2 text-sm text-white/60">
            This email isn&apos;t on the waitlist:{" "}
            <span className="text-white">{state.email}</span>
          </p>
          <p className="mb-6 text-sm text-white/60">
            Heater is in early access. Join the waitlist to get in.
          </p>
          <a
            href={BRAND.marketingUrl}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#D32F2F] font-bold text-white transition hover:bg-[#b71c1c]"
          >
            Join waitlist
            <ArrowRight className="h-4 w-4" />
          </a>
          <form action={formAction} className="mt-6">
            <input type="hidden" name="email" value="" />
            <button
              type="submit"
              className="text-sm text-white/50 transition hover:text-white"
            >
              ← Try a different email
            </button>
          </form>
        </div>
      </Card>
    );
  }

  const errorMessage = state.status === "error" ? state.message : null;

  return (
    <Card>
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D32F2F]/30 bg-[#D32F2F]/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[#D32F2F]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D32F2F] opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#D32F2F]" />
        </span>
        Early access
      </div>
      <h1 className="mb-2 text-2xl font-bold">Welcome back</h1>
      <p className="mb-6 text-sm text-white/60">
        Sign in with the email you used on the waitlist. We&apos;ll send you a
        magic link — no password needed.
      </p>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">
            Email
          </span>
          <span className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              defaultValue={state.status === "error" ? state.email : ""}
              placeholder="you@example.com"
              className={cn(
                "h-12 w-full rounded-lg border border-white/15 bg-white/[0.02] pl-11 pr-4 text-white placeholder-white/30 outline-none transition",
                "focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/30",
              )}
            />
          </span>
        </label>
        {errorMessage ? (
          <p className="text-xs text-[#D32F2F]">{errorMessage}</p>
        ) : null}
        <SubmitButton />
      </form>
      <div className="mt-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          or
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <p className="mt-6 text-center text-sm text-white/60">
        Not on the waitlist yet?{" "}
        <Link
          href={BRAND.marketingUrl}
          className="font-medium text-[#D32F2F] hover:text-[#b71c1c]"
        >
          Join at heaterbaseball.app
        </Link>
      </p>
    </Card>
  );
}

function Card({
  children,
  borderClassName = "border-white/10",
}: {
  children: React.ReactNode;
  borderClassName?: string;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-2xl border bg-white/[0.03] p-8",
        borderClassName,
      )}
    >
      {children}
    </div>
  );
}
