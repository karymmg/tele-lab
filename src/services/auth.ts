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
  displayName: string,
  email?: string
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
    email: email || null,
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
// Accepts: real email OR phone number (e.g. 51055101) OR username
export async function login(
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const trimmed = identifier.trim();
  const isEmail = trimmed.includes("@");
  const digitsOnly = trimmed.replace(/\D/g, "");

  // ── Step 1: Always look up the profile first ──
  // Build an OR filter that covers all possible identifier types:
  //   - phone number match (digits only)
  //   - username match (exact)
  //   - auth_email match (for pseudo-emails like 51055101@telelab.tn)
  //   - email match (if they have a real email on file)
  let filterParts: string[] = [];
  if (digitsOnly) filterParts.push(`phone.eq.${digitsOnly}`);
  filterParts.push(`username.eq.${trimmed}`);
  if (isEmail) {
    filterParts.push(`auth_email.eq.${trimmed}`);
    filterParts.push(`email.eq.${trimmed}`);
  }

  const { data: profileLookup } = await supabase
    .from("profiles")
    .select("auth_email")
    .or(filterParts.join(","))
    .maybeSingle();

  if (!profileLookup?.auth_email) {
    return { success: false, error: "Identifiant ou mot de passe incorrect." };
  }

  // ── Step 2: Sign in with the REAL auth_email from the profile ──
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: profileLookup.auth_email,
      password,
    });

  if (authError || !authData?.user) {
    return { success: false, error: "Identifiant ou mot de passe incorrect." };
  }

  // ── Step 3: Fetch full profile ──
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