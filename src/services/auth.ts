import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase/client";

export type UserRole = "admin" | "customer" | "driver" | "technician";

export interface AuthUser {
  id: string;
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
  const { data } = await supabase.rpc("get_auth_email_by_identifier", {
    p_identifier: identifier,
  });
  return !!data;
}

// ─── registerUser ─────────────────────────────────────────────────────────────
// Returns the new user's UUID on success, null on failure
export async function registerUser(
  phone: string,
  password: string,
  role: UserRole,
  displayName: string,
  email?: string
): Promise<string | null> {
  const cleanPhone = phone.replace(/\D/g, "");
  const authEmail = getPseudoEmail(cleanPhone);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: authEmail,
    password,
    options: {
      // Disable email confirmation redirect for pseudo-emails
      emailRedirectTo: undefined,
      data: {
        phone: cleanPhone,
        role,
      },
    },
  });

  if (authError || !authData.user) {
    console.error("SignUp error:", authError);
    return null;
  }

  const nameParts = displayName.split(" ");
  const firstName = nameParts[0] || "Inconnu";
  const lastName = nameParts.slice(1).join(" ") || "Inconnu";

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
    return null;
  }

  return authData.user.id;
}

// ─── login ────────────────────────────────────────────────────────────────────
// Accepts: real email OR phone number (e.g. 51055101) OR username
export async function login(
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const trimmed = identifier.trim();

  // ── Step 1: Use secure RPC to look up the auth_email (bypasses RLS) ──
  const { data: authEmailResult, error: rpcError } = await supabase.rpc(
    "get_auth_email_by_identifier",
    { p_identifier: trimmed }
  );

  if (rpcError) {
    console.error("RPC lookup error:", rpcError);
    return { success: false, error: "Erreur de connexion au serveur." };
  }

  if (!authEmailResult) {
    return { success: false, error: "Identifiant ou mot de passe incorrect." };
  }

  // ── Step 2: Sign in with the REAL auth_email from the profile ──
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: authEmailResult,
      password,
    });

  if (authError || !authData?.user) {
    return { success: false, error: "Identifiant ou mot de passe incorrect." };
  }

  // ── Step 3: Fetch full profile (now authenticated, RLS allows it) ──
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile) return { success: false, error: "Profil introuvable." };

  return {
    success: true,
    user: {
      id: authData.user.id,
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
            id: session.user.id,
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
              id: session.user.id,
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