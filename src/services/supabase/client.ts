import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // En dev, on préfère un message clair plutôt qu'une erreur Supabase opaque.
  console.warn(
    "[Tele Lab] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant(e). " +
      "Copiez .env.example vers .env et renseignez vos clés Supabase."
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
