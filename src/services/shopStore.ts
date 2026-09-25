import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase/client";
import { ShopCategory, ShopProduct, ShopBrand, ShopModel } from "@/types/shop";
import { toUrlSlug } from "@/utils/productUrl";
import { normalizeProductImageUrl } from "@/utils/productImage";

// Internal Caches
let cachedCategories: ShopCategory[] = [];
let cachedProducts: ShopProduct[] = [];
let cachedBrands: ShopBrand[] = [];
let cachedModels: ShopModel[] = [];
let brandsCacheLoaded = false;
let modelsCacheLoaded = false;
let shopInitialLoadReady = false;
const SHOP_EVENT_NAME = "tele_lab_shop_update";

export interface ShopMediaAsset {
  name: string;
  path: string;
  publicUrl: string;
  updatedAt: string | null;
}

function safeMediaBaseName(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || `image-${Date.now()}`;
}

function compressImageToWebp(file: File, maxDimension: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Le fichier sélectionné n'est pas une image lisible."));
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Impossible de préparer l'image."));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Erreur de compression d'image.")), "image/webp", quality);
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

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
    imageUrl: normalizeProductImageUrl(dbProd.image_url),
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

async function deleteShopProducts(ids: string[]) {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (!uniqueIds.length) return;
  const { error } = await supabase.from("shop_products").delete().in("id", uniqueIds);
  if (error) throw new Error(error.message);
  await fetchProducts();
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
void Promise.allSettled([fetchCategories(), fetchProducts(), fetchBrands(), fetchModels()]).then(() => {
  shopInitialLoadReady = true;
  notifyShopUpdate();
});

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
    await Promise.all([fetchCategories(), fetchProducts(), fetchBrands(), fetchModels()]);
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
      image_url: normalizeProductImageUrl(data.imageUrl) ?? null,
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
    if (updates.imageUrl !== undefined) dbUpdates.image_url = normalizeProductImageUrl(updates.imageUrl) ?? null;
    if (updates.active !== undefined) dbUpdates.active = updates.active;

    const { error } = await supabase.from("shop_products").update(dbUpdates).eq("id", id);
    if (error) throw new Error(error.message);
    cachedProducts = cachedProducts.map(product => product.id === id ? { ...product, ...updates } : product);
    notifyShopUpdate();
    await fetchProducts();
  },

  async deleteProduct(id: string) {
    await deleteShopProducts([id]);
  },

  async deleteProducts(ids: string[]) {
    await deleteShopProducts(ids);
  },

  async deleteAllProducts() {
    await deleteShopProducts(cachedProducts.map(product => product.id));
  },

  async listProductMedia(): Promise<ShopMediaAsset[]> {
    const { data, error } = await supabase.storage.from("shop-images").list("media", {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(error.message);
    return (data || [])
      .filter(file => Boolean(file.id) && file.name !== ".emptyFolderPlaceholder")
      .map(file => {
        const path = `media/${file.name}`;
        const { data: publicData } = supabase.storage.from("shop-images").getPublicUrl(path);
        const version = file.updated_at || file.id || "";
        const publicUrl = version ? `${publicData.publicUrl}?v=${encodeURIComponent(version)}` : publicData.publicUrl;
        return { name: file.name, path, publicUrl, updatedAt: file.updated_at || null };
      });
  },

  async uploadProductMedia(file: File): Promise<ShopMediaAsset> {
    if (!file.type.startsWith("image/")) throw new Error("Sélectionnez un fichier image.");
    const baseName = safeMediaBaseName(file.name);
    const path = `media/${baseName}.webp`;
    const blob = await compressImageToWebp(file, 1600, 0.88);
    const { error } = await supabase.storage.from("shop-images").upload(path, blob, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data: publicData } = supabase.storage.from("shop-images").getPublicUrl(path);
    const version = Date.now().toString();
    return { name: `${baseName}.webp`, path, publicUrl: `${publicData.publicUrl}?v=${version}`, updatedAt: new Date(version).toISOString() };
  },

  async uploadProductMediaFromUrl(productName: string, sourceUrl: string): Promise<{ asset: ShopMediaAsset; uploaded: boolean }> {
    const normalizedUrl = normalizeProductImageUrl(sourceUrl);
    if (!normalizedUrl) throw new Error("URL d'image manquante.");

    let remoteUrl: URL;
    try {
      remoteUrl = new URL(normalizedUrl);
    } catch {
      throw new Error("URL d'image invalide.");
    }
    if (remoteUrl.protocol !== "https:" && remoteUrl.protocol !== "http:") {
      throw new Error("L'URL de l'image doit commencer par http:// ou https://.");
    }

    if (remoteUrl.pathname.includes("/storage/v1/object/public/shop-images/media/")) {
      const name = decodeURIComponent(remoteUrl.pathname.split("/").pop() || "image.webp");
      return {
        asset: { name, path: `media/${name}`, publicUrl: normalizedUrl, updatedAt: null },
        uploaded: false,
      };
    }

    const { data, error } = await supabase.functions.invoke<{
      asset?: ShopMediaAsset;
      uploaded?: boolean;
      error?: string;
    }>("import-product-image", {
      body: { productName, imageUrl: normalizedUrl },
    });

    if (error) {
      const context = "context" in error ? error.context : undefined;
      if (context instanceof Response) {
        const body = await context.clone().json().catch(() => null);
        if (typeof body?.error === "string") throw new Error(body.error);
      }
      throw new Error("Service de téléchargement Supabase indisponible : " + error.message);
    }
    if (data?.error) throw new Error(data.error);
    if (!data?.asset?.publicUrl) throw new Error("Supabase n'a pas retourné l'URL de la photo.");
    return { asset: data.asset, uploaded: data.uploaded !== false };
  },

  // Image Upload Action
  async uploadProductImage(file: File): Promise<string> {
    const blob = await compressImageToWebp(file, 800, 0.8);
    const fileName = `product_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
    const { error } = await supabase.storage.from("shop-images").upload(fileName, blob, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error("Erreur d'upload: " + error.message);
    const { data: publicData } = supabase.storage.from("shop-images").getPublicUrl(fileName);
    return publicData.publicUrl;
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

export function useShopDataReady() {
  const [ready, setReady] = useState(() => shopInitialLoadReady);

  useEffect(() => {
    function handleUpdate() {
      setReady(shopInitialLoadReady);
    }
    window.addEventListener(SHOP_EVENT_NAME, handleUpdate);
    handleUpdate();
    return () => window.removeEventListener(SHOP_EVENT_NAME, handleUpdate);
  }, []);

  return ready;
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
