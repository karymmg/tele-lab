export interface ProductPathParts {
  id?: string;
  slug?: string;
  categorySlug?: string;
  brandSlug?: string;
  modelSlug?: string;
}

export function toUrlSlug(value?: string | null): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getProductPath(product: ProductPathParts): string {
  const category = toUrlSlug(product.categorySlug) || "categorie";
  const brand = toUrlSlug(product.brandSlug) || "sans-marque";
  const model = toUrlSlug(product.modelSlug) || "sans-modele";
  const productSlug = toUrlSlug(product.slug) || toUrlSlug(product.id) || "produit";
  return `/shop/category/${category}/${brand}/${model}/${productSlug}`;
}
