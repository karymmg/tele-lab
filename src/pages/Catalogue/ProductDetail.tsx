import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/services/supabase/client";
import { useAuth } from "@/services/auth";

export function ProductDetail() {
  const { categorySlug, productSlug } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      const { data, error } = await supabase
        .from("shop_products")
        .select(`
          *,
          category:shop_categories!category_id(name, slug),
          brand:brands!brand_id(name, slug),
          model:models!model_id(name, slug)
        `)
        .eq("slug", productSlug)
        .eq("active", true)
        .single();

      if (data) {
        setProduct(data);
      }
      setLoading(false);
    }

    if (productSlug) {
      fetchProduct();
    }
  }, [productSlug]);

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Produit introuvable</h1>
        <p className="mb-8">Le produit que vous cherchez n'existe pas ou n'est plus disponible.</p>
        <Link to="/products" className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  const pageTitle = product.seo_title || `${product.name} Tunisie | Telephonic Pro`;
  const pageDescription = product.seo_description || product.short_description || product.description || `Achetez ${product.name} en Tunisie chez Telephonic Pro.`;
  const canonicalUrl = `https://telephonic-pro.tn/shop/category/${product.category?.slug || 'category'}/${product.slug}`;

  // Structured Data (JSON-LD)
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": product.image_url ? [product.image_url] : [],
    "description": pageDescription,
    "sku": product.sku || product.slug,
    ...(product.brand && {
      "brand": {
        "@type": "Brand",
        "name": product.brand.name
      }
    }),
    // Google guidelines: do not put Offer for login-restricted prices
    ...(isLoggedIn && product.price ? {
      "offers": {
        "@type": "Offer",
        "url": canonicalUrl,
        "priceCurrency": product.currency || "TND",
        "price": product.price,
        "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      }
    } : {})
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Accueil",
        "item": "https://telephonic-pro.tn/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Boutique",
        "item": "https://telephonic-pro.tn/products"
      },
      ...(product.category ? [{
        "@type": "ListItem",
        "position": 3,
        "name": product.category.name,
        "item": `https://telephonic-pro.tn/category/${product.category.slug}`
      }] : []),
      {
        "@type": "ListItem",
        "position": product.category ? 4 : 3,
        "name": product.name,
        "item": canonicalUrl
      }
    ]
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        {product.image_url && <meta property="og:image" content={product.image_url} />}
        <meta property="og:url" content={canonicalUrl} />
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      {/* Breadcrumb */}
      <nav className="text-sm mb-8 text-gray-500">
        <Link to="/" className="hover:text-primary">Accueil</Link> &gt;{" "}
        <Link to="/products" className="hover:text-primary">Boutique</Link> &gt;{" "}
        {product.category && (
          <>
            <Link to={`/category/${product.category.slug}`} className="hover:text-primary">
              {product.category.name}
            </Link> &gt;{" "}
          </>
        )}
        <span className="text-gray-900 dark:text-gray-100">{product.name}</span>
      </nav>

      <div className="flex flex-col md:flex-row gap-12">
        {/* Product Image */}
        <div className="w-full md:w-1/2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex items-center justify-center aspect-square">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="max-w-full max-h-full object-contain"
                loading="lazy"
              />
            ) : (
              <div className="text-gray-400">Aucune image</div>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="w-full md:w-1/2">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{product.name}</h1>
          
          <div className="flex flex-col gap-2 mb-6 text-sm text-gray-600 dark:text-gray-400">
            {product.brand && (
              <p>Marque: <span className="font-semibold">{product.brand.name}</span></p>
            )}
            {product.model && (
              <p>Modèle: <span className="font-semibold">{product.model.name}</span></p>
            )}
            {product.sku && (
              <p>Référence: <span className="font-semibold">{product.sku}</span></p>
            )}
          </div>

          {/* Pricing Block */}
          <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
            {isLoggedIn ? (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Prix unitaire</p>
                <p className="text-3xl font-bold text-primary">
                  {product.price ? `${product.price.toFixed(2)} ${product.currency}` : "Sur devis"}
                </p>
                {product.stock > 0 ? (
                  <p className="text-green-600 font-semibold mt-2">✓ En stock ({product.stock} disponibles)</p>
                ) : (
                  <p className="text-red-500 font-semibold mt-2">✗ Rupture de stock</p>
                )}
                <button 
                  className="mt-6 w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                  disabled={product.stock <= 0}
                >
                  Ajouter au panier
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  Connectez-vous pour voir les prix et la disponibilité.
                </p>
                <Link 
                  to="/login" 
                  className="inline-block bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 font-medium"
                >
                  Se connecter
                </Link>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h2 className="text-xl font-bold mb-3">Description</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p>{product.description || product.short_description || "Aucune description disponible pour ce produit."}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
