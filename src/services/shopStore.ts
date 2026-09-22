import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase/client";
import { ShopCategory, ShopProduct } from "@/types/shop";

// Internal Caches
let cachedCategories: ShopCategory[] = [];
let cachedProducts: ShopProduct[] = [];
const SHOP_EVENT_NAME = "tele_lab_shop_update";

function notifyShopUpdate() {
  window.dispatchEvent(new Event(SHOP_EVENT_NAME));
}

// Map Database Rows to Frontend Types
function mapCategory(dbCat: any): ShopCategory {
  return {
    id: dbCat.id,
    name: dbCat.name,
    slug: dbCat.slug || (dbCat.name ? dbCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined),
    icon: dbCat.icon,
    active: dbCat.active,
    createdAt: dbCat.created_at,
  };
}

function mapProduct(dbProd: any): ShopProduct {
  return {
    id: dbProd.id,
    categoryId: dbProd.category_id,
    name: dbProd.name,
    slug: dbProd.slug || (dbProd.name ? dbProd.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined),
    description: dbProd.description,
    price: dbProd.price,
    stock: dbProd.stock,
    imageUrl: dbProd.image_url,
    active: dbProd.active,
    createdAt: dbProd.created_at,
  };
}

// Fetch Initial Data
async function fetchCategories() {
  const { data } = await supabase
    .from("shop_categories")
    .select("*")
    .order("name", { ascending: true });
  if (data) {
    cachedCategories = data.map(mapCategory);
    notifyShopUpdate();
  }
}

async function fetchProducts() {
  const { data } = await supabase
    .from("shop_products")
    .select("*")
    .order("created_at", { ascending: false });
  if (data) {
    cachedProducts = data.map(mapProduct);
    notifyShopUpdate();
  }
}

// Subscriptions
supabase
  .channel("public:shop_categories")
  .on("postgres_changes", { event: "*", schema: "public", table: "shop_categories" }, async () => {
    await fetchCategories();
  })
  .subscribe();

supabase
  .channel("public:shop_products")
  .on("postgres_changes", { event: "*", schema: "public", table: "shop_products" }, async () => {
    await fetchProducts();
  })
  .subscribe();

// Initial load
fetchCategories();
fetchProducts();

// ------------------------------------------------------------------
// STORE EXPORT
// ------------------------------------------------------------------
export const shopStore = {
  getCategories(): ShopCategory[] {
    return cachedCategories;
  },

  getProducts(): ShopProduct[] {
    return cachedProducts;
  },

  getProductsByCategory(categoryId: string): ShopProduct[] {
    return cachedProducts.filter((p) => p.categoryId === categoryId);
  },

  // Category Actions
  async addCategory(name: string, icon?: string) {
    const { error } = await supabase.from("shop_categories").insert({ name, icon });
    if (error) {
      console.error("Supabase Error (addCategory):", error);
      throw new Error(error.message || "Erreur base de données");
    }
  },

  async updateCategory(id: string, updates: Partial<ShopCategory>) {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    
    const { error } = await supabase.from("shop_categories").update(dbUpdates).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deleteCategory(id: string) {
    const { error } = await supabase.from("shop_categories").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  // Product Actions
  async addProduct(data: Omit<ShopProduct, "id" | "createdAt">) {
    const { error } = await supabase.from("shop_products").insert({
      category_id: data.categoryId,
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      image_url: data.imageUrl,
      active: data.active,
    });
    if (error) throw new Error(error.message);
  },

  async updateProduct(id: string, updates: Partial<ShopProduct>) {
    const dbUpdates: any = {};
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.active !== undefined) dbUpdates.active = updates.active;

    const { error } = await supabase.from("shop_products").update(dbUpdates).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deleteProduct(id: string) {
    const { error } = await supabase.from("shop_products").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
};

// ------------------------------------------------------------------
// HOOKS
// ------------------------------------------------------------------
export function useShopCategories() {
  const [categories, setCategories] = useState<ShopCategory[]>(() => shopStore.getCategories());
  
  useEffect(() => {
    function handleUpdate() {
      setCategories(shopStore.getCategories());
    }
    window.addEventListener(SHOP_EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener(SHOP_EVENT_NAME, handleUpdate);
    };
  }, []);

  return categories;
}

export function useShopProducts() {
  const [products, setProducts] = useState<ShopProduct[]>(() => shopStore.getProducts());
  
  useEffect(() => {
    function handleUpdate() {
      setProducts(shopStore.getProducts());
    }
    window.addEventListener(SHOP_EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener(SHOP_EVENT_NAME, handleUpdate);
    };
  }, []);

  return products;
}
