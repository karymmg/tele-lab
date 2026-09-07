import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase/client";

export type UserRole = "admin" | "customer" | "driver" | "technician";

export interface AuthUser {
  username: string;
  role: UserRole;
  displayName: string;
}

// Generates a pseudo-email for Supabase Auth (requires email format)
const getPseudoEmail = (phone: string) =>
  `${phone.replace(/[\s\-\+]/g, "")}@telelab.tn`;

// ─── hasAccount ──────────────────────────────────────────────────────────────
export async function hasAccount(identifier: string): Promise<boolean> {
  const clean = identifier.replace(/[\s\-\+]/g, "");
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
  const cleanPhone = phone.replace(/[\s\-\+]/g, "");
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
  const clean = identifier.replace(/[\s\-\+]/g, "");
  const isEmail = identifier.includes("@");

  // Step 1 – try direct Supabase auth with what the user typed
  // If it looks like an email, use it directly; otherwise build pseudo-email
  const directEmail = isEmail ? identifier : getPseudoEmail(clean);

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email: directEmail, password });

  // Step 2 – if direct login failed AND the user typed a phone/username,
  // look up the real auth_email stored in profiles and retry
  if (authError || !authData?.user) {
    if (!isEmail) {
      // Look up the profile by phone OR auth_email
      const { data: profileLookup } = await supabase
        .from("profiles")
        .select("auth_email")
        .or(`phone.eq.${clean},auth_email.ilike.%${clean}%`)
        .maybeSingle();

      if (profileLookup?.auth_email) {
        const { data: retryAuth, error: retryError } =
          await supabase.auth.signInWithPassword({
            email: profileLookup.auth_email,
            password,
          });

        if (retryError || !retryAuth?.user) {
          return { success: false, error: "Identifiant ou mot de passe incorrect." };
        }

        // Fetch full profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", retryAuth.user.id)
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
    }

    return { success: false, error: "Identifiant ou mot de passe incorrect." };
  }

  // Step 3 – auth succeeded, fetch profile
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
