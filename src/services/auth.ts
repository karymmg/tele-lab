import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase/client";

export type UserRole = "admin" | "customer" | "driver" | "technician";

export interface AuthUser {
  username: string;
  role: UserRole;
  displayName: string;
}

// Generates a pseudo-email for Supabase Auth (requires email format)
// Strips anything that isn't a digit first, so it's safe even if an
// already-suffixed value (e.g. "51055101@telelab.tn") gets passed in again.
const getPseudoEmail = (phone: string) => {
  const digitsOnly = phone.replace(/\D/g, "");
  return `${digitsOnly}@telelab.tn`;
};

// ─── hasAccount ──────────────────────────────────────────────────────────────
export async function hasAccount(identifier: string): Promise<boolean> {
  const isEmail = identifier.includes("@");
  const clean = isEmail ? identifier : identifier.replace(/\D/g, "");
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .or(`phone.eq.${clean},auth_email.eq.${identifier}`)
    .maybeSingle();
  return !!data;
}

// ─── registerUser ─────────────────────────────────────────────────────────────
export async function registerUser(
  phone: string,
  password: string,
  role: UserRole,
  displayName: string
): Promise<boolean> {
  const cleanPhone = phone.replace(/\D/g, "");
  const authEmail = getPseudoEmail(cleanPhone);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: authEmail,
    password,
  });

  if (authError || !authData.user) {
    console.error("SignUp error:", authError);
    return false;
  }

  const nameParts = displayName.split(" ");
  const firstName = nameParts[0] || "Unknown";
  const lastName = nameParts.slice(1).join(" ") || "Unknown";

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: authData.user.id,
    phone: cleanPhone,
    auth_email: authEmail,
    role,
    first_name: firstName,
    last_name: lastName,
  });

  if (profileError) {
    console.error("Profile insert error:", profileError);
    return false;
  }

  return true;
}

// ─── login ────────────────────────────────────────────────────────────────────
// Accepts: real email OR phone number (e.g. 51055101) OR anything stored in profiles
export async function login(
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const isEmail = identifier.includes("@");
  let targetEmail = identifier;

  // If the person typed a phone/username instead of an email, look up the
  // REAL auth_email that was actually stored for them at signup time —
  // never guess/rebuild one here. This avoids any mismatch between a
  // guessed pseudo-email and what's actually on file.
  if (!isEmail) {
    const clean = identifier.replace(/\D/g, "");
    const { data: profileLookup } = await supabase
      .from("profiles")
      .select("auth_email")
      .or(`phone.eq.${clean},username.eq.${identifier}`)
      .maybeSingle();

    if (!profileLookup?.auth_email) {
      return { success: false, error: "Identifiant ou mot de passe incorrect." };
    }

    targetEmail = profileLookup.auth_email;
  }

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email: targetEmail, password });

  if (authError || !authData?.user) {
    return { success: false, error: "Identifiant ou mot de passe incorrect." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile) return { success: false, error: "Profil introuvable." };

  return {
    success: true,
    user: {
      username: profile.phone,
      role: profile.role as UserRole,
      displayName: `${profile.first_name} ${profile.last_name}`,
    },
  };
}

// ─── logout ───────────────────────────────────────────────────────────────────
export async function logout() {
  await supabase.auth.signOut();
}

// ─── useAuth ──────────────────────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (mounted) {
        if (profile) {
          setUser({
            username: profile.phone,
            role: profile.role as UserRole,
            displayName: `${profile.first_name} ${profile.last_name}`,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_OUT" || !session) {
          setUser(null);
          setLoading(false);
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (mounted && profile) {
            setUser({
              username: profile.phone,
              role: profile.role as UserRole,
              displayName: `${profile.first_name} ${profile.last_name}`,
            });
          }
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, isLoggedIn: !!user, loading, logout };
}