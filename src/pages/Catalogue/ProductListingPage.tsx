import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { Package, Search } from "lucide-react";
import { useShopBrands, useShopCategories, useShopModels, useShopProducts } from "@/services/shopStore";
import { getProductPath, toUrlSlug } from "@/utils/productUrl";
import { ProductImage } from "@/components/ui/ProductImage";
import "@/pages/Shop/Shop.css";

type ListingKind = "all" | "category" | "brand" | "model" | "search";
interface Props { kind: ListingKind; slug?: string; }

export function ProductListingPage({ kind, slug }: Props) {
  const products = useShopProducts();
  const categories = useShopCategories();
  const brands = useShopBrands();
  const models = useShopModels();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() || "";

  const selectedCategory = kind === "category" ? categories.find(item => item.slug === slug) : undefined;
  const selectedBrand = kind === "brand" ? brands.find(item => item.slug === slug) : undefined;
  const selectedModel = kind === "model" ? models.find(item => item.slug === slug) : undefined;
  const pageTitle = kind === "category" ? selectedCategory?.name || "Catégorie introuvable"
    : kind === "brand" ? selectedBrand?.name || "Marque introuvable"
    : kind === "model" ? selectedModel?.name || "Modèle introuvable"
    : kind === "search" ? (query ? `Résultats pour « ${query} »` : "Rechercher un produit")
    : "Catalogue des produits";

  const rows = useMemo(() => products.filter(product => {
    if (!product.active) return false;
    const category = categories.find(item => item.id === product.categoryId);
    const model = models.find(item => item.id === product.modelId);
    const brand = brands.find(item => item.id === product.brandId) || brands.find(item => item.id === model?.brand_id);
    if (kind === "category" && product.categoryId !== selectedCategory?.id) return false;
    if (kind === "brand" && brand?.id !== selectedBrand?.id) return false;
    if (kind === "model" && model?.id !== selectedModel?.id) return false;
    if (kind === "search" && !query) return false;
    if (query) {
      const text = [product.name, product.description, category?.name, brand?.name, model?.name, product.sku].filter(Boolean).join(" ").toLocaleLowerCase();
      if (!text.includes(query.toLocaleLowerCase())) return false;
    }
    return true;
  }), [products, categories, brands, models, kind, query, selectedCategory?.id, selectedBrand?.id, selectedModel?.id]);

  const description = kind === "search" ? `Produits correspondant à ${query} chez Telephonic Pro.` : `Découvrez ${pageTitle.toLocaleLowerCase()} chez Telephonic Pro : accessoires et appareils avec livraison en Tunisie.`;
  const canonical = kind === "category" ? `https://telephonic-pro.tn/category/${slug}` : kind === "brand" ? `https://telephonic-pro.tn/brand/${slug}` : kind === "model" ? `https://telephonic-pro.tn/model/${slug}` : kind === "all" ? "https://telephonic-pro.tn/products" : undefined;

  return (
    <main className="tl-shop-page">
      <Helmet>
        <title>{pageTitle} | Telephonic Pro</title>
        <meta name="description" content={description} />
        {canonical && <link rel="canonical" href={canonical} />}
        {kind === "search" && <meta name="robots" content="noindex,follow" />}
      </Helmet>
      <div className="container">
        <header className="tl-shop-header">
          <div className="tl-shop-title">
            <h1>{pageTitle}</h1>
            <p>{kind === "search" ? (query ? `${rows.length} résultat(s) trouvé(s)` : "Saisissez un nom, une marque ou un modèle pour lancer la recherche.") : `${rows.length} produit(s) disponibles`}</p>
          </div>
          <form className="tl-shop-search" onSubmit={event => event.preventDefault()}>
            <Search size={20} className="search-icon" />
            <input aria-label="Rechercher un produit" placeholder="Produit, marque ou modèle..." value={query} onChange={event => { const value = event.target.value; setSearchParams(value ? { q: value } : {}); }} />
          </form>
        </header>
        {kind === "all" && categories.filter(item => item.active).length > 0 && (
          <nav className="tl-shop-categories" aria-label="Catégories">
            {categories.filter(item => item.active).map(item => <Link key={item.id} className="tl-cat-btn" to={`/category/${item.slug || toUrlSlug(item.name)}`}>{item.name}</Link>)}
          </nav>
        )}
        <div className="tl-shop-grid">
          {rows.map(product => {
            const category = categories.find(item => item.id === product.categoryId);
            const model = models.find(item => item.id === product.modelId);
            const brand = brands.find(item => item.id === product.brandId) || brands.find(item => item.id === model?.brand_id);
            const href = getProductPath({ id: product.id, slug: product.slug, categorySlug: category?.slug, brandSlug: brand?.slug || brand?.name, modelSlug: model?.slug || model?.name });
            return (
              <article className="tl-product-card" key={product.id}>
                <Link to={href} className="tl-product-img-wrapper" aria-label={`Voir ${product.name}`}>
                  <ProductImage src={product.imageUrl} alt={product.name} className="tl-product-img" fallback={<div className="tl-product-placeholder"><Package size={48} /><span>Photo indisponible</span></div>} />
                  {product.stock === 0 && <span className="tl-product-badge out-of-stock">Rupture</span>}
                </Link>
                <div className="tl-product-info">
                  {category && <Link className="tl-listing-category" to={`/category/${category.slug}`}>{category.name}</Link>}
                  <Link className="tl-listing-title" to={href}><h2>{product.name}</h2></Link>
                  <div className="tl-product-meta">
                    <div className="tl-product-meta-item"><span className="tl-product-meta-label">Marque</span><span className="tl-product-meta-value">{brand?.name || "Non renseignée"}</span></div>
                    <div className="tl-product-meta-item"><span className="tl-product-meta-label">Modèle</span><span className="tl-product-meta-value">{model?.name || "Non renseigné"}</span></div>
                  </div>
                  <div className="tl-product-footer"><strong className="tl-product-price">{Number(product.price || 0).toFixed(2)} <span>DT</span></strong><Link to={href} className="tl-listing-link">Voir le produit</Link></div>
                </div>
              </article>
            );
          })}
        </div>
        {rows.length === 0 && <div className="tl-shop-empty"><Package size={56} /><h2>{kind === "search" && !query ? "Entrez un terme de recherche" : "Aucun produit trouvé"}</h2><p>Essayez un autre nom, une marque, un modèle ou une catégorie.</p><Link className="tl-btn-primary" to="/shop">Ouvrir la boutique</Link></div>}
      </div>
    </main>
  );
}
