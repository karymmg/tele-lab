import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase/client";

export type UserRole = "admin" | "client" | "driver" | "technician";

export interface AuthUser {
  username: string;
  role: UserRole;
  displayName: string;
}

// Generates a fake email for Supabase Auth which requires email by default
const getPseudoEmail = (username: string) => `${username.replace(/[\s\-\+]/g, "")}@telelab.tn`;

export async function hasAccount(username: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", username.replace(/[\s\-\+]/g, ""))
    .maybeSingle();
  return !!data;
}

export async function registerUser(username: string, password: string, role: UserRole, displayName: string): Promise<boolean> {
  const email = getPseudoEmail(username);
  const phone = username.replace(/[\s\-\+]/g, "");

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    console.error("SignUp error:", authError);
    return false;
  }

  // Insert profile
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: authData.user.id,
    phone,
    role,
    display_name: displayName,
  });

  if (profileError) {
    console.error("Profile insert error:", profileError);
    return false;
  }

  return true;
}

export async function login(username: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const email = getPseudoEmail(username);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { success: false, error: "Identifiant ou mot de passe incorrect." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    return { success: false, error: "Profil introuvable." };
  }

  const user: AuthUser = {
    username: profile.phone,
    role: profile.role as UserRole,
    displayName: profile.display_name,
  };

  return { success: true, user };
}

export async function logout() {
  await supabase.auth.signOut();
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
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
            displayName: profile.display_name,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
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
        if (profile) {
          setUser({
            username: profile.phone,
            role: profile.role as UserRole,
            displayName: profile.display_name,
          });
        }
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, isLoggedIn: !!user, loading, logout };
}
