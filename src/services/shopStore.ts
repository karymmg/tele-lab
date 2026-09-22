import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase/client";
import { ShopCategory, ShopProduct, ShopBrand, ShopModel } from "@/types/shop";

// Internal Caches
let cachedCategories: ShopCategory[] = [];
let cachedProducts: ShopProduct[] = [];
let cachedBrands: ShopBrand[] = [];
let cachedModels: ShopModel[] = [];
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
    brandId: dbProd.brand_id,
    modelId: dbProd.model_id,
    sku: dbProd.sku,
    name: dbProd.name,
    slug: dbProd.slug || (dbProd.name ? dbProd.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined),
    description: dbProd.description,
    price: dbProd.price,
    costPrice: dbProd.cost_price || 0,
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

async function fetchBrands() {
  const { data } = await supabase
    .from("brands")
    .select("*")
    .order("name", { ascending: true });
  if (data) {
    cachedBrands = data;
    notifyShopUpdate();
  }
}

async function fetchModels() {
  const { data } = await supabase
    .from("models")
    .select("*")
    .order("name", { ascending: true });
  if (data) {
    cachedModels = data;
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
fetchBrands();
fetchModels();

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

  getBrands(): ShopBrand[] {
    return cachedBrands;
  },

  getModels(): ShopModel[] {
    return cachedModels;
  },

  // Auto-generate SKU
  generateSku(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'REF-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
    let finalBrandId = data.brandId || null;
    let finalModelId = data.modelId || null;
    
    // Auto-create brand if it's a string and doesn't match an existing UUID
    if (finalBrandId && !finalBrandId.includes("-")) {
      const existing = cachedBrands.find(b => b.name.toLowerCase() === finalBrandId?.toLowerCase());
      if (existing) {
        finalBrandId = existing.id;
      } else {
        const { data: newBrand, error } = await supabase.from("brands").insert({ name: finalBrandId }).select().single();
        if (!error && newBrand) {
          finalBrandId = newBrand.id;
          cachedBrands.push(newBrand);
        } else finalBrandId = null;
      }
    }

    // Auto-create model if it's a string and doesn't match an existing UUID
    if (finalModelId && !finalModelId.includes("-")) {
      const existing = cachedModels.find(m => m.name.toLowerCase() === finalModelId?.toLowerCase());
      if (existing) {
        finalModelId = existing.id;
      } else {
        const { data: newModel, error } = await supabase.from("models").insert({ name: finalModelId, brand_id: finalBrandId }).select().single();
        if (!error && newModel) {
          finalModelId = newModel.id;
          cachedModels.push(newModel);
        } else finalModelId = null;
      }
    }

    const { error } = await supabase.from("shop_products").insert({
      category_id: data.categoryId,
      brand_id: finalBrandId,
      model_id: finalModelId,
      sku: data.sku || this.generateSku(),
      name: data.name,
      description: data.description,
      price: data.price,
      cost_price: data.costPrice || 0,
      stock: data.stock,
      image_url: data.imageUrl,
      active: data.active,
    });
    if (error) throw new Error(error.message);
  },

  async updateProduct(id: string, updates: Partial<ShopProduct>) {
    const dbUpdates: any = {};
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
    if (updates.brandId !== undefined) dbUpdates.brand_id = updates.brandId;
    if (updates.modelId !== undefined) dbUpdates.model_id = updates.modelId;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
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
  },

  // Image Upload Action
  async uploadProductImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(async (blob) => {
            if (!blob) return reject(new Error("Erreur de compression d'image"));
            
            const fileName = `product_${Date.now()}.webp`;
            const { data, error } = await supabase.storage
              .from("shop-images")
              .upload(fileName, blob, {
                contentType: "image/webp",
                cacheControl: "3600",
                upsert: false,
              });

            if (error) return reject(new Error("Erreur d'upload: " + error.message));
            
            const { data: publicData } = supabase.storage
              .from("shop-images")
              .getPublicUrl(fileName);
              
            resolve(publicData.publicUrl);
          }, "image/webp", 0.8);
        };
      };
      reader.onerror = (error) => reject(error);
    });
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

export function useShopBrands() {
  const [brands, setBrands] = useState<ShopBrand[]>(() => shopStore.getBrands());
  
  useEffect(() => {
    function handleUpdate() {
      setBrands(shopStore.getBrands());
    }
    window.addEventListener(SHOP_EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener(SHOP_EVENT_NAME, handleUpdate);
    };
  }, []);

  return brands;
}

export function useShopModels() {
  const [models, setModels] = useState<ShopModel[]>(() => shopStore.getModels());
  
  useEffect(() => {
    function handleUpdate() {
      setModels(shopStore.getModels());
    }
    window.addEventListener(SHOP_EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener(SHOP_EVENT_NAME, handleUpdate);
    };
  }, []);

  return models;
}
