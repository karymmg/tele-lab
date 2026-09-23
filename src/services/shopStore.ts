import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase/client";
import { ShopCategory, ShopProduct, ShopBrand, ShopModel } from "@/types/shop";
import { toUrlSlug } from "@/utils/productUrl";

// Internal Caches
let cachedCategories: ShopCategory[] = [];
let cachedProducts: ShopProduct[] = [];
let cachedBrands: ShopBrand[] = [];
let cachedModels: ShopModel[] = [];
let brandsCacheLoaded = false;
let modelsCacheLoaded = false;
const SHOP_EVENT_NAME = "tele_lab_shop_update";

function notifyShopUpdate() {
  window.dispatchEvent(new Event(SHOP_EVENT_NAME));
}

// Map Database Rows to Frontend Types
function mapCategory(dbCat: any): ShopCategory {
  return {
    id: dbCat.id,
    name: dbCat.name,
    slug: dbCat.slug || toUrlSlug(dbCat.name),
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
    slug: dbProd.slug || toUrlSlug(dbProd.name),
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
    brandsCacheLoaded = true;
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
    modelsCacheLoaded = true;
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

supabase
  .channel("public:brands")
  .on("postgres_changes", { event: "*", schema: "public", table: "brands" }, async () => {
    await fetchBrands();
  })
  .subscribe();

supabase
  .channel("public:models")
  .on("postgres_changes", { event: "*", schema: "public", table: "models" }, async () => {
    await fetchModels();
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

  async refreshData() {
    await Promise.all([fetchProducts(), fetchBrands(), fetchModels()]);
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
    await fetchCategories();
  },

  async updateCategory(id: string, updates: Partial<ShopCategory>) {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    
    const { error } = await supabase.from("shop_categories").update(dbUpdates).eq("id", id);
    if (error) throw new Error(error.message);
    await fetchCategories();
  },

  async deleteCategory(id: string) {
    const { error } = await supabase.from("shop_categories").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await Promise.all([fetchCategories(), fetchProducts()]);
  },

  // Product Actions
  async addProduct(data: Omit<ShopProduct, "id" | "createdAt">, options: { deferRefresh?: boolean } = {}) {
    const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    const brandInput = data.brandId?.trim() || "";
    const modelInput = data.modelId?.trim() || "";
    let finalBrandId: string | null = brandInput && isUuid(brandInput) ? brandInput : null;
    let finalModelId: string | null = modelInput && isUuid(modelInput) ? modelInput : null;

    if (brandInput && !isUuid(brandInput)) {
      let brand = cachedBrands.find(item => item.name.trim().toLocaleLowerCase() === brandInput.toLocaleLowerCase());
      if (!brand && !brandsCacheLoaded) {
        const { data: brandRows, error: brandLoadError } = await supabase.from("brands").select("*");
        if (brandLoadError) throw new Error("Impossible de vérifier la marque : " + brandLoadError.message);
        cachedBrands = brandRows || [];
        brandsCacheLoaded = true;
        brand = cachedBrands.find(item => item.name.trim().toLocaleLowerCase() === brandInput.toLocaleLowerCase());
      }
      if (!brand) {
        const { data: createdBrand, error } = await supabase.from("brands").insert({ name: brandInput }).select().single();
        if (error || !createdBrand) throw new Error("Impossible d’enregistrer la marque : " + (error?.message || "marque manquante"));
        brand = createdBrand;
        cachedBrands = [...cachedBrands, createdBrand];
        brandsCacheLoaded = true;
      }
      if (!brand) throw new Error("Marque introuvable après vérification.");
      finalBrandId = brand.id;
      notifyShopUpdate();
    }

    let modelRecord = finalModelId ? cachedModels.find(item => item.id === finalModelId) : undefined;
    if (modelInput && !isUuid(modelInput)) {
      const findModel = () => cachedModels.find(item => item.name.trim().toLocaleLowerCase() === modelInput.toLocaleLowerCase() && (!finalBrandId || !item.brand_id || item.brand_id === finalBrandId))
        || cachedModels.find(item => item.name.trim().toLocaleLowerCase() === modelInput.toLocaleLowerCase());
      modelRecord = findModel();
      if (!modelRecord && !modelsCacheLoaded) {
        const { data: modelRows, error: modelLoadError } = await supabase.from("models").select("*");
        if (modelLoadError) throw new Error("Impossible de vérifier le modèle : " + modelLoadError.message);
        cachedModels = modelRows || [];
        modelsCacheLoaded = true;
        modelRecord = findModel();
      }
      if (modelRecord && finalBrandId && !modelRecord.brand_id) {
        const { data: linkedModel, error } = await supabase.from("models").update({ brand_id: finalBrandId }).eq("id", modelRecord.id).select().single();
        if (error || !linkedModel) throw new Error("Impossible de lier le modèle à la marque : " + (error?.message || "modèle manquant"));
        modelRecord = linkedModel;
        cachedModels = cachedModels.map(item => item.id === linkedModel.id ? linkedModel : item);
      }
      if (!modelRecord) {
        const { data: createdModel, error } = await supabase.from("models").insert({ name: modelInput, brand_id: finalBrandId }).select().single();
        if (error || !createdModel) throw new Error("Impossible d’enregistrer le modèle : " + (error?.message || "modèle manquant"));
        modelRecord = createdModel;
        cachedModels = [...cachedModels, createdModel];
        modelsCacheLoaded = true;
      }
      if (!modelRecord) throw new Error("Modèle introuvable après vérification.");
      finalModelId = modelRecord.id;
      notifyShopUpdate();
    }
    if (!finalBrandId && modelRecord?.brand_id) finalBrandId = modelRecord.brand_id;

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
    if (!options.deferRefresh) await this.refreshData();
  },

  async updateProduct(id: string, updates: Partial<ShopProduct>) {
    const dbUpdates: any = {};
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
    if (updates.brandId !== undefined) dbUpdates.brand_id = updates.brandId || null;
    if (updates.modelId !== undefined) dbUpdates.model_id = updates.modelId || null;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
    if (updates.name !== undefined) {
      dbUpdates.name = updates.name;
      dbUpdates.slug = toUrlSlug(updates.name) + "-" + id.slice(0, 6);
    }
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
    if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.active !== undefined) dbUpdates.active = updates.active;

    const { error } = await supabase.from("shop_products").update(dbUpdates).eq("id", id);
    if (error) throw new Error(error.message);
    cachedProducts = cachedProducts.map(product => product.id === id ? { ...product, ...updates } : product);
    notifyShopUpdate();
    await fetchProducts();
  },

  async deleteProduct(id: string) {
    const { error } = await supabase.from("shop_products").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await fetchProducts();
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
