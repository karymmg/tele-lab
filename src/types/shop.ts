export interface ShopCategory {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
  active: boolean;
  createdAt: string;
}

export interface ShopProduct {
  id: string;
  categoryId: string;
  brandId?: string;
  modelId?: string;
  sku?: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  costPrice?: number;
  stock: number;
  imageUrl?: string;
  active: boolean;
  createdAt: string;
  views?: number;
}

export interface ShopBrand {
  id: string;
  name: string;
  slug?: string;
}

export interface ShopModel {
  id: string;
  name: string;
  slug?: string;
  brand_id?: string;
}
