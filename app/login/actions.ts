"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LoginState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "not_on_waitlist"; email: string }
  | { status: "error"; email: string; message: string };

export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawEmail = formData.get("email");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email) {
    return { status: "error", email: "", message: "Email is required." };
  }

  const admin = createAdminClient();
  const { data, error: waitlistError } = await admin
    .from("waitlist")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (waitlistError) {
    return {
      status: "error",
      email,
      message: "Could not verify waitlist. Try again.",
    };
  }

  if (!data) {
    return { status: "not_on_waitlist", email };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", email, message: error.message };
  }

  return { status: "sent", email };
}
