import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase/client";
import { OccasionProduct, SiteVisit, OccasionStatus } from "@/types/occasion";

const OCCASION_EVENT_NAME = "tele_lab_occasion_update";

function notifyOccasionUpdate() {
  window.dispatchEvent(new Event(OCCASION_EVENT_NAME));
}

let cachedOccasions: OccasionProduct[] = [];
let totalSiteVisits = 0;

function mapOccasion(dbObj: any): OccasionProduct {
  const profile = dbObj.profiles;
  let sellerName = "Utilisateur TeleLab";
  let sellerVerified = false;
  if (profile) {
    const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    if (fullName) sellerName = fullName;
    if (profile.cin_number && String(profile.cin_number).trim().length > 0) {
      sellerVerified = true;
    }
  }

  return {
    id: dbObj.id,
    sellerId: dbObj.seller_id,
    type: dbObj.type,
    brand: dbObj.brand,
    model: dbObj.model,
    description: dbObj.description,
    condition: dbObj.condition,
    price: Number(dbObj.price),
    whatsappNumber: dbObj.whatsapp_number,
    photos: dbObj.photos || [],
    views: dbObj.views || 0,
    status: dbObj.status,
    createdAt: dbObj.created_at,
    sellerName,
    sellerVerified,
  };
}

// Fetch Initial Data
async function fetchOccasions() {
  const { data, error } = await supabase
    .from("occasion_products")
    .select("*, profiles:seller_id (first_name, last_name, cin_number)")
    .order("created_at", { ascending: false });
  if (data) {
    cachedOccasions = data.map(mapOccasion);
    notifyOccasionUpdate();
  } else if (error) {
    console.error("fetchOccasions error:", error);
  }
}

async function fetchSiteVisits() {
  const { data } = await supabase.from("site_visits").select("visitors_count");
  if (data) {
    totalSiteVisits = data.reduce((acc, row) => acc + (row.visitors_count || 0), 0);
    notifyOccasionUpdate();
  }
}

// Subscriptions
supabase
  .channel("public:occasion_products")
  .on("postgres_changes", { event: "*", schema: "public", table: "occasion_products" }, async () => {
    await fetchOccasions();
  })
  .subscribe();

supabase
  .channel("public:site_visits")
  .on("postgres_changes", { event: "*", schema: "public", table: "site_visits" }, async () => {
    await fetchSiteVisits();
  })
  .subscribe();

// Initial load
fetchOccasions();
fetchSiteVisits();

// ------------------------------------------------------------------
// STORE EXPORT
// ------------------------------------------------------------------
export const occasionStore = {
  getOccasions(): OccasionProduct[] {
    return cachedOccasions;
  },

  getMyOccasions(userId: string): OccasionProduct[] {
    if (!userId) return [];
    return cachedOccasions.filter((item) => item.sellerId === userId);
  },

  getOccasionById(id: string): OccasionProduct | undefined {
    return cachedOccasions.find((item) => item.id === id);
  },

  async fetchOccasionById(id: string): Promise<OccasionProduct | null> {
    const cached = cachedOccasions.find((item) => item.id === id);
    if (cached) return cached;
    const { data, error } = await supabase
      .from("occasion_products")
      .select("*, profiles:seller_id (first_name, last_name, cin_number)")
      .eq("id", id)
      .maybeSingle();
    if (data) return mapOccasion(data);
    if (error) console.error("fetchOccasionById error:", error);
    return null;
  },

  getTotalSiteVisits(): number {
    return totalSiteVisits;
  },

  // Upload an image to Supabase Storage
  async uploadPhoto(file: File, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `occasions/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('telelab_uploads')
      .upload(filePath, file);

    if (uploadError) {
      console.error("Erreur d'upload :", uploadError);
      throw new Error("Erreur lors de l'envoi de la photo.");
    }

    const { data } = supabase.storage.from('telelab_uploads').getPublicUrl(filePath);
    return data.publicUrl;
  },

  async addOccasion(data: Omit<OccasionProduct, "id" | "views" | "status" | "createdAt">) {
    const { error } = await supabase.from("occasion_products").insert({
      seller_id: data.sellerId,
      type: data.type,
      brand: data.brand,
      model: data.model,
      description: data.description,
      condition: data.condition,
      price: data.price,
      whatsapp_number: data.whatsappNumber,
      photos: data.photos,
    });
    if (error) {
      console.error("Supabase Error (addOccasion):", error);
      throw new Error(error.message);
    }
    await fetchOccasions();
  },

  async updateOccasionStatus(id: string, status: OccasionStatus) {
    const { error } = await supabase.from("occasion_products").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    await fetchOccasions();
  },

  async updateOccasionPrice(id: string, newPrice: number) {
    const { error } = await supabase.from("occasion_products").update({ price: newPrice }).eq("id", id);
    if (error) throw new Error(error.message);
    await fetchOccasions();
  },

  async deleteOccasion(id: string) {
    const { error } = await supabase.from("occasion_products").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await fetchOccasions();
  },

  // --- ANALYTICS ---
  
  async logSiteVisit() {
    // Usually called once per session on App load
    const { error } = await supabase.rpc("log_site_visit");
    if (error) console.error("Erreur log visite:", error);
    await fetchSiteVisits();
  },

  async incrementViews(productId: string, isOccasion: boolean) {
    const { error } = await supabase.rpc("increment_product_views", {
      p_id: productId,
      p_is_occasion: isOccasion
    });
    if (error) console.error("Erreur increment vues:", error);
    await fetchOccasions();
  },
};

// ------------------------------------------------------------------
// HOOKS
// ------------------------------------------------------------------
export function useOccasions() {
  const [occasions, setOccasions] = useState<OccasionProduct[]>(() => occasionStore.getOccasions());
  
  useEffect(() => {
    function handleUpdate() {
      setOccasions(occasionStore.getOccasions());
    }
    window.addEventListener(OCCASION_EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener(OCCASION_EVENT_NAME, handleUpdate);
    };
  }, []);

  return occasions;
}

export function useSiteVisits() {
  const [visits, setVisits] = useState<number>(() => occasionStore.getTotalSiteVisits());
  
  useEffect(() => {
    function handleUpdate() {
      setVisits(occasionStore.getTotalSiteVisits());
    }
    window.addEventListener(OCCASION_EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener(OCCASION_EVENT_NAME, handleUpdate);
    };
  }, []);

  return visits;
}

export function useMyOccasions(userId?: string) {
  const [myOccasions, setMyOccasions] = useState<OccasionProduct[]>(() =>
    userId ? occasionStore.getMyOccasions(userId) : []
  );

  useEffect(() => {
    if (!userId) {
      setMyOccasions([]);
      return;
    }
    function handleUpdate() {
      setMyOccasions(occasionStore.getMyOccasions(userId!));
    }
    handleUpdate();
    window.addEventListener(OCCASION_EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener(OCCASION_EVENT_NAME, handleUpdate);
    };
  }, [userId]);

  return myOccasions;
}

