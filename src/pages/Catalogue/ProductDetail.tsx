import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/services/supabase/client";
import { useAuth } from "@/services/auth";
import { useCartStore } from "@/services/cartStore";
import {
  ShoppingCart,
  Package,
  Info,
  Tag,
  Layers,
  ArrowLeft,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Zap,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";
import "./ProductDetail.css";
import { getProductPath, toUrlSlug } from "@/utils/productUrl";

export function ProductDetail() {
  const { productSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const { isLoggedIn } = useAuth();
  const { addItem, toggleCart } = useCartStore();

  useEffect(() => {
    let cancelled = false;
    async function fetchProduct() {
      setLoading(true);
      setProduct(null);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productSlug || "");
      const query = supabase
        .from("shop_products")
        .select("*, category:shop_categories(name, slug), brand:brands(name, slug), model:models(name, slug, brand_id)")
        .eq("active", true);
      if (isUuid) query.eq("id", productSlug);
      else query.eq("slug", productSlug);
      const { data, error } = await query.maybeSingle();
      if (error) console.error("Supabase Error fetching product:", error);
      let result: any = data;
      if (result?.model?.brand_id && !result.brand) {
        const { data: modelBrand } = await supabase.from("brands").select("name, slug").eq("id", result.model.brand_id).maybeSingle();
        if (modelBrand) result = { ...result, brand: modelBrand };
      }
      if (!cancelled) {
        setProduct(result || null);
        setLoading(false);
      }
    }
    if (productSlug) fetchProduct();
    return () => { cancelled = true; };
  }, [productSlug]);

  useEffect(() => {
    if (!product) return;
    const canonicalPath = getProductPath({
      id: product.id,
      slug: product.slug,
      categorySlug: product.category?.slug || product.category?.name,
      brandSlug: product.brand?.slug || product.brand?.name,
      modelSlug: product.model?.slug || product.model?.name,
    });
    if (location.pathname !== canonicalPath) navigate(canonicalPath, { replace: true });
  }, [product, location.pathname, navigate]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="pd-loading">
        <div className="pd-spinner" />
      </div>
    );
  }

  /* ── Not Found ── */
  if (!product) {
    return (
      <div className="pd-page">
        <div className="container">
          <div className="pd-not-found">
            <Package size={56} color="var(--color-border)" />
            <h1>Produit introuvable</h1>
            <p>
              Le produit que vous cherchez n'existe pas ou n'est plus
              disponible.
            </p>
            <Link to="/shop" className="pd-not-found-btn">
              <ArrowLeft size={18} />
              Retour à la boutique
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── SEO ── */
  const pageTitle =
    product.seo_title || `${product.name} Tunisie | Telephonic Pro`;
  const pageDescription =
    product.seo_description ||
    product.short_description ||
    product.description ||
    `Achetez ${product.name} en Tunisie chez Telephonic Pro.`;
  const canonicalUrl = "https://telephonic-pro.tn" + getProductPath({
    id: product.id,
    slug: product.slug,
    categorySlug: product.category?.slug || product.category?.name,
    brandSlug: product.brand?.slug || product.brand?.name,
    modelSlug: product.model?.slug || product.model?.name,
  });

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.image_url ? [product.image_url] : [],
    description: pageDescription,
    sku: product.sku || product.slug,
    ...(product.model && { "additionalProperty": [{ "@type": "PropertyValue", name: "Modèle", value: product.model.name }] }),
    ...(product.brand && {
      brand: { "@type": "Brand", name: product.brand.name },
    }),
    ...(product.price
      ? {
          offers: {
            "@type": "Offer",
            url: canonicalUrl,
            priceCurrency: product.currency || "TND",
            price: product.price,
            availability:
              product.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          },
        }
      : {}),
  };

  const breadcrumbItems = [
    { name: "Accueil", item: "https://telephonic-pro.tn/" },
    { name: "Boutique", item: "https://telephonic-pro.tn/shop" },
    ...(product.category ? [{ name: product.category.name, item: "https://telephonic-pro.tn/category/" + (product.category.slug || toUrlSlug(product.category.name)) }] : []),
    ...(product.brand ? [{ name: product.brand.name, item: "https://telephonic-pro.tn/brand/" + (product.brand.slug || toUrlSlug(product.brand.name)) }] : []),
    ...(product.model ? [{ name: product.model.name, item: "https://telephonic-pro.tn/model/" + (product.model.slug || toUrlSlug(product.model.name)) }] : []),
    { name: product.name, item: canonicalUrl },
  ];
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      imageUrl: product.image_url,
      isOccasion: false,
    });
    toggleCart();
  };

  const maxQty = product.stock > 0 ? product.stock : 1;

  return (
    <div className="pd-page">
      <div className="container">
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={pageDescription} />
          <link rel="canonical" href={canonicalUrl} />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={pageDescription} />
          {product.image_url && (
            <meta property="og:image" content={product.image_url} />
          )}
          <meta property="og:url" content={canonicalUrl} />
          <script type="application/ld+json">
            {JSON.stringify(productSchema)}
          </script>
          <script type="application/ld+json">
            {JSON.stringify(breadcrumbSchema)}
          </script>
        </Helmet>

        {/* Back to shop */}
        <Link to="/shop" className="pd-back-link">
          <ArrowLeft size={16} />
          Retour à la boutique
        </Link>

        {/* Breadcrumb */}
        <nav className="pd-breadcrumb">
          <Link to="/">Accueil</Link>
          <ChevronRight size={14} className="pd-breadcrumb-sep" />
          <Link to="/shop">Boutique</Link>
          {product.category && (
            <>
              <ChevronRight size={14} className="pd-breadcrumb-sep" />
              <Link to={"/category/" + (product.category.slug || toUrlSlug(product.category.name))}>{product.category.name}</Link>
            </>
          )}
          {product.brand && (
            <>
              <ChevronRight size={14} className="pd-breadcrumb-sep" />
              <Link to={"/brand/" + (product.brand.slug || toUrlSlug(product.brand.name))}>{product.brand.name}</Link>
            </>
          )}
          {product.model && (
            <>
              <ChevronRight size={14} className="pd-breadcrumb-sep" />
              <Link to={"/model/" + (product.model.slug || toUrlSlug(product.model.name))}>{product.model.name}</Link>
            </>
          )}
          <ChevronRight size={14} className="pd-breadcrumb-sep" />
          <span className="pd-breadcrumb-current">{product.name}</span>
        </nav>

        {/* Main Layout */}
        <div className="pd-main">
          {/* ─── Left: Image Gallery ─── */}
          <div className="pd-gallery">
            <div className="pd-img-main">
              <div
                className={`pd-stock-badge ${
                  product.stock > 0 ? "in-stock" : "out-of-stock"
                }`}
              >
                {product.stock > 0 ? "En Stock" : "Rupture"}
              </div>
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  loading="lazy"
                />
              ) : (
                <div className="pd-img-placeholder">
                  <Package size={64} />
                  <span>Aucune image</span>
                </div>
              )}
            </div>
          </div>

          {/* ─── Right: Product Info ─── */}
          <div className="pd-info">
            {/* Title */}
            <h1 className="pd-title">{product.name}</h1>

            {/* Rating Row */}
            <div className="pd-rating-row">
              <div className="pd-stars">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={16}
                    className={i <= 4 ? "pd-star" : "pd-star empty"}
                    fill={i <= 4 ? "#fbbf24" : "none"}
                  />
                ))}
              </div>
              <span className="pd-rating-text">4.0 / 5</span>
              <div className="pd-rating-divider" />
              <span className="pd-sold-count">Réf: {product.sku || "—"}</span>
            </div>

            {/* Price Block */}
            <div className="pd-price-block">
              <div className="pd-price-row">
                <span className="pd-price-main">
                  {product.price ? product.price.toFixed(2) : "—"}
                </span>
                <span className="pd-price-currency">
                  {product.currency || "DT"}
                </span>
              </div>

              {/* Shipping */}
              <div className="pd-shipping">
                <Truck size={18} className="pd-shipping-icon" />
                <span className="pd-shipping-text">
                  <strong>Livraison disponible</strong> — Partout en Tunisie
                </span>
              </div>
            </div>

            {/* Specs */}
            <div className="pd-specs">
              {product.category && (
                <div className="pd-spec-row">
                  <Layers size={16} className="pd-spec-icon" />
                  <span className="pd-spec-label">Catégorie</span>
                  <span className="pd-spec-value">
                    {product.category.name}
                  </span>
                </div>
              )}
              {product.brand && (
                <div className="pd-spec-row">
                  <Tag size={16} className="pd-spec-icon" />
                  <span className="pd-spec-label">Marque</span>
                  <span className="pd-spec-value">{product.brand.name}</span>
                </div>
              )}
              {product.model && (
                <div className="pd-spec-row">
                  <Info size={16} className="pd-spec-icon" />
                  <span className="pd-spec-label">Modèle</span>
                  <span className="pd-spec-value">{product.model.name}</span>
                </div>
              )}
              <div className="pd-spec-row">
                <Package size={16} className="pd-spec-icon" />
                <span className="pd-spec-label">Disponibilité</span>
                <span
                  className="pd-spec-value"
                  style={{
                    color:
                      product.stock > 0
                        ? "var(--color-success)"
                        : "var(--color-error)",
                  }}
                >
                  {product.stock > 0
                    ? `En stock (${product.stock} pièces)`
                    : "Rupture de stock"}
                </span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="pd-qty-section">
              <span className="pd-qty-label">Quantité</span>
              <div className="pd-qty-control">
                <button
                  className="pd-qty-btn"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                >
                  <Minus size={16} />
                </button>
                <div className="pd-qty-value">{qty}</div>
                <button
                  className="pd-qty-btn"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                >
                  <Plus size={16} />
                </button>
              </div>
              <span className="pd-qty-stock">
                {product.stock > 0 ? `${product.stock} disponible(s)` : ""}
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="pd-cta-row">
              <button
                className="pd-btn-cart"
                disabled={product.stock <= 0}
                onClick={handleAddToCart}
              >
                <ShoppingCart size={20} />
                Ajouter au panier
              </button>
              <button
                className="pd-btn-buy"
                disabled={product.stock <= 0}
                onClick={handleAddToCart}
              >
                <Zap size={20} />
                Acheter maintenant
              </button>
            </div>

            {/* Guarantees */}
            <div className="pd-guarantees">
              <div className="pd-guarantee">
                <ShieldCheck size={22} className="pd-guarantee-icon" />
                <span className="pd-guarantee-text">Produit authentique</span>
              </div>
              <div className="pd-guarantee">
                <RotateCcw size={22} className="pd-guarantee-icon" />
                <span className="pd-guarantee-text">Retour 7 jours</span>
              </div>
              <div className="pd-guarantee">
                <Headphones size={22} className="pd-guarantee-icon" />
                <span className="pd-guarantee-text">Support 24/7</span>
              </div>
            </div>

            {/* Description */}
            <div className="pd-description">
              <h2 className="pd-description-title">
                <Info size={20} />
                Description du produit
              </h2>
              <p className="pd-description-content">
                {product.description ||
                  product.short_description ||
                  "Aucune description détaillée n'est disponible pour cet article pour le moment."}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
