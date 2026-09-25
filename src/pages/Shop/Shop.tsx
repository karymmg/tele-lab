import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { shopStore, useShopCategories, useShopProducts, useShopBrands, useShopModels, useShopDataReady, useShopDataError } from "@/services/shopStore";
import { useOccasions, occasionStore } from "@/services/occasionStore";
import { useAuth } from "@/services/auth";
import { useCartStore } from "@/services/cartStore";
import { Search, Store, ShoppingBag, Package, Plus, UserCheck, MessageCircle, ShoppingCart, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./Shop.css";
import { getProductPath } from "@/utils/productUrl";
import { ProductImage } from "@/components/ui/ProductImage";

export function Shop() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const categories = useShopCategories();
  const products = useShopProducts();
  const brands = useShopBrands();
  const models = useShopModels();
  const shopDataReady = useShopDataReady();
  const shopDataError = useShopDataError();
  const occasions = useOccasions();
  const { isLoggedIn } = useAuth();
  const { addItem, openCart } = useCartStore();

  const [shopMode, setShopMode] = useState<"neuf" | "occasion">("neuf");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isShopRefreshing, setIsShopRefreshing] = useState(false);
  const refreshInProgressRef = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const cartOpenTimer = useRef<number | null>(null);
  const cartFlightSequence = useRef(0);

  const refreshShop = useCallback(async () => {
    if (refreshInProgressRef.current) return;
    refreshInProgressRef.current = true;
    setIsShopRefreshing(true);
    try {
      await shopStore.refreshData();
      setCurrentPage(1);
    } catch {
      // The shop store exposes the current error so the page can offer a retry.
    } finally {
      refreshInProgressRef.current = false;
      setIsShopRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    const updatePageSize = () => setItemsPerPage(mobileQuery.matches ? 15 : 25);
    updatePageSize();
    mobileQuery.addEventListener("change", updatePageSize);
    return () => mobileQuery.removeEventListener("change", updatePageSize);
  }, []);

  useEffect(() => () => {
    if (cartOpenTimer.current !== null) window.clearTimeout(cartOpenTimer.current);
  }, []);

  const handleProductClick = (id: string, isOccasion: boolean) => {
    occasionStore.incrementViews(id, isOccasion);
    if (isOccasion) {
      navigate("/shop/occasion/" + id);
      return;
    }
    const prod = products.find(item => item.id === id);
    if (!prod) return;
    const category = categories.find(item => item.id === prod.categoryId);
    const model = models.find(item => item.id === prod.modelId);
    const brand = brands.find(item => item.id === prod.brandId) || brands.find(item => item.id === model?.brand_id);
    navigate(getProductPath({ id: prod.id, slug: prod.slug, categorySlug: category?.slug, brandSlug: brand?.slug || brand?.name, modelSlug: model?.slug || model?.name }));
  };

  const filteredProducts = products.filter(p => {
    const productModel = models.find(model => model.id === p.modelId);
    const productBrand = brands.find(brand => brand.id === p.brandId) ||
                         brands.find(brand => brand.id === productModel?.brand_id);
    const searchableText = [p.name, p.sku, p.description, productBrand?.name, productModel?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesCat = activeCategory === "ALL" || p.categoryId === activeCategory;
    const matchesSearch = searchableText.includes(search.toLowerCase());
    return matchesCat && matchesSearch && p.active;
  });

  const filteredOccasions = occasions.filter(o => {
    const matchesCat = activeCategory === "ALL" || o.type === activeCategory;
    const matchesSearch = o.brand.toLowerCase().includes(search.toLowerCase()) || 
                          o.model.toLowerCase().includes(search.toLowerCase()) ||
                          o.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch && o.status === "active";
  });

  const currentItems = shopMode === "neuf" ? filteredProducts : filteredOccasions;
  const pageCount = Math.max(1, Math.ceil(currentItems.length / itemsPerPage));
  const visibleProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const visibleOccasions = filteredOccasions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  useEffect(() => {
    setCurrentPage(1);
  }, [shopMode, activeCategory, search, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(page => Math.min(page, pageCount));
  }, [pageCount]);

  function goToPage(page: number) {
    setCurrentPage(Math.max(1, Math.min(page, pageCount)));
    window.requestAnimationFrame(() => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function animateProductIntoCart(imageUrl?: string, sourceCard?: HTMLElement | null) {
    const flightId = ++cartFlightSequence.current;
    const target = document.querySelector<HTMLElement>(".tl-header-cart-button");
    const source = sourceCard?.querySelector<HTMLElement>(".tl-product-img-wrapper");
    if (!target || !source || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      openCart();
      return;
    }

    const start = source.getBoundingClientRect();
    const end = target.getBoundingClientRect();
    const flyer = document.createElement("div");
    flyer.className = "tl-cart-flight";
    flyer.style.left = `${start.left + start.width * 0.22}px`;
    flyer.style.top = `${start.top + start.height * 0.22}px`;
    flyer.style.width = `${Math.min(start.width * 0.56, 112)}px`;
    flyer.style.height = `${Math.min(start.height * 0.56, 112)}px`;
    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "";
      flyer.appendChild(image);
    } else {
      flyer.innerHTML = '<span aria-hidden="true">✦</span>';
    }
    document.body.appendChild(flyer);
    void flyer.offsetWidth;
    requestAnimationFrame(() => {
      flyer.style.transform = `translate(${end.left + end.width / 2 - (start.left + start.width * 0.5)}px, ${end.top + end.height / 2 - (start.top + start.height * 0.5)}px) scale(.16)`;
      flyer.style.opacity = "0.25";
    });

    let finished = false;
    const finishFlight = () => {
      if (finished) return;
      finished = true;
      flyer.remove();
      if (flightId !== cartFlightSequence.current) return;
      if (cartOpenTimer.current !== null) window.clearTimeout(cartOpenTimer.current);
      cartOpenTimer.current = null;
      target.classList.remove("is-cart-bumping");
      void target.offsetWidth;
      target.classList.add("is-cart-bumping");
      window.setTimeout(() => target.classList.remove("is-cart-bumping"), 520);
      openCart();
    };
    flyer.addEventListener("transitionend", finishFlight, { once: true });
    if (cartOpenTimer.current !== null) window.clearTimeout(cartOpenTimer.current);
    cartOpenTimer.current = window.setTimeout(finishFlight, 680);
  }

  function handleAddToCart(event: React.MouseEvent<HTMLButtonElement>, product: typeof products[number]) {
    event.stopPropagation();
    const card = event.currentTarget.closest<HTMLElement>(".tl-product-card");
    card?.classList.add("is-adding");
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
      isOccasion: false,
    });
    animateProductIntoCart(product.imageUrl, card);
    window.setTimeout(() => card?.classList.remove("is-adding"), 720);
  }

  return (
    <main className="tl-shop-page">
      <div className="container">
        
        <div className="tl-shop-header fade-in-up">
          <div className="tl-shop-title">
            <h1>
              <Store size={32} style={{ verticalAlign: "middle", marginRight: 12, color: "var(--color-primary)" }} />
              {isArabic ? "المتجر" : "Boutique"}
            </h1>
            
            <div className="tl-shop-switch">
              <div 
                className={`tl-shop-switch-bg ${shopMode === "occasion" ? "is-occasion" : ""}`} 
              />
              <button 
                className={`tl-switch-btn ${shopMode === "neuf" ? "active" : ""}`}
                onClick={() => { setShopMode("neuf"); setActiveCategory("ALL"); }}
              >
                {isArabic ? "جديد" : "Neuf"}
              </button>
              <button 
                className={`tl-switch-btn ${shopMode === "occasion" ? "active" : ""}`}
                onClick={() => { setShopMode("occasion"); setActiveCategory("ALL"); }}
              >
                {isArabic ? "مستعمل" : "Occasion"}
              </button>
            </div>
            
            <p style={{ marginTop: 12 }}>
              {shopMode === "neuf" 
                ? (isArabic ? "اكتشف إكسسواراتنا عالية الجودة" : "Découvrez nos accessoires premium")
                : (isArabic ? "سوق الأجهزة المستعملة" : "Le marché des appareils d'occasion")
              }
            </p>
          </div>
          
          <div className="tl-shop-search">
            <Search size={20} color="var(--color-text-secondary)" className="search-icon" />
            <input
              type="text"
              placeholder={isArabic ? "بحث عن منتج..." : "Rechercher un produit..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Categories Tabs */}
        {shopMode === "neuf" && (
          <div className="tl-shop-categories fade-in-up" style={{ animationDelay: "0.1s" }}>
            <button 
              className={`tl-cat-btn ${activeCategory === "ALL" ? "active" : ""}`}
              onClick={() => setActiveCategory("ALL")}
            >
              {isArabic ? "الكل" : "Tout"}
            </button>
            {categories.filter(c => c.active).map(cat => (
              <button 
                key={cat.id}
                className={`tl-cat-btn ${activeCategory === cat.id ? "active" : ""}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {shopMode === "occasion" && (
          <div className="tl-shop-categories fade-in-up" style={{ animationDelay: "0.1s", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
              <button 
                className={`tl-cat-btn ${activeCategory === "ALL" ? "active" : ""}`}
                onClick={() => setActiveCategory("ALL")}
              >
                {isArabic ? "الكل" : "Tout"}
              </button>
              {["Téléphone", "PC", "Console"].map(type => (
                <button 
                  key={type}
                  className={`tl-cat-btn ${activeCategory === type ? "active" : ""}`}
                  onClick={() => setActiveCategory(type)}
                >
                  {type}
                </button>
              ))}
            </div>

            <div>
              {isLoggedIn ? (
                <Link to="/shop/add-occasion" className="tl-btn-manage" style={{ background: "rgba(var(--color-primary-rgb),0.1)", color: "var(--color-primary-dark)", borderColor: "rgba(var(--color-primary-rgb),0.3)" }}>
                  <Plus size={16} /> {isArabic ? "إضافة إعلان" : "Publier une annonce"}
                </Link>
              ) : (
                <Link to="/login" className="tl-btn-manage" style={{ background: "rgba(167,176,184,0.1)", color: "var(--color-text-secondary)", borderColor: "rgba(167,176,184,0.3)" }}>
                  <UserCheck size={16} /> {isArabic ? "تسجيل الدخول للنشر" : "Connectez-vous pour vendre"}
                </Link>
              )}
            </div>
          </div>
        )}

        {shopMode === "neuf" && shopDataReady && shopDataError && filteredProducts.length > 0 && (
          <div className="tl-shop-error" role="alert">
            <span>{isArabic ? "تعذّر تحديث بعض بيانات المتجر." : "La boutique n’a pas pu actualiser toutes ses données."}</span>
            <button type="button" onClick={() => void refreshShop()} disabled={isShopRefreshing}>
              {isShopRefreshing ? (isArabic ? "جاري التحديث…" : "Actualisation…") : (isArabic ? "إعادة المحاولة" : "Réessayer")}
            </button>
          </div>
        )}

        {/* Products Grid */}
        {shopMode === "neuf" && !shopDataReady ? (
          <div className="tl-shop-loading" role="status" aria-live="polite">
            <span className="tl-shop-loading__spinner" />
            <span>{isArabic ? "جاري تحميل المنتجات…" : "Chargement des produits…"}</span>
          </div>
        ) : <div ref={gridRef} className={`tl-shop-grid ${shopMode === "neuf" ? "is-new-products" : "is-occasions"} fade-in-up`} style={{ animationDelay: "0.2s" }}>
          {shopMode === "neuf" ? (
            visibleProducts.map(prod => {
              const model = models.find(item => item.id === prod.modelId);
              const brand = brands.find(item => item.id === prod.brandId) ||
                            brands.find(item => item.id === model?.brand_id);
              return (
                <div key={prod.id} className="tl-product-card" onClick={() => handleProductClick(prod.id, false)}>
                  <div className="tl-product-img-wrapper">
                    <ProductImage
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="tl-product-img"
                      fallback={<div className="tl-product-placeholder"><Package size={48} color="var(--color-border)" /><span>Photo indisponible</span></div>}
                    />
                    {prod.stock === 0 && (
                      <div className="tl-product-badge out-of-stock">
                        {isArabic ? "نفذت الكمية" : "Rupture"}
                      </div>
                    )}
                  </div>

                  <div className="tl-product-info">
                    <h3>{prod.name}</h3>
                    <div className="tl-product-meta">
                      <div className="tl-product-meta-item">
                        <span className="tl-product-meta-label">{isArabic ? "الماركة" : "Marque"}</span>
                        <span className="tl-product-meta-value">{brand?.name || (isArabic ? "غير محددة" : "Non renseignée")}</span>
                      </div>
                      <div className="tl-product-meta-item">
                        <span className="tl-product-meta-label">{isArabic ? "الموديل" : "Modèle"}</span>
                        <span className="tl-product-meta-value">{model?.name || (isArabic ? "غير محدد" : "Non renseigné")}</span>
                      </div>
                    </div>
                    {prod.description && <p className="tl-product-desc">{prod.description}</p>}

                    <div className="tl-product-footer">
                      <div className="tl-product-price">
                        {prod.price.toFixed(2)} <span>DT</span>
                      </div>
                      <button
                        className="tl-btn-primary"
                        style={{ padding: "8px", borderRadius: "8px", minWidth: "40px", display: "flex", justifyContent: "center" }}
                        onClick={(event) => handleAddToCart(event, prod)}
                        title="Ajouter au panier"
                      >
                        <ShoppingCart size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            visibleOccasions.map(occ => {
              const cleanPhone = occ.whatsappNumber.replace(/[^0-9]/g, "");
              const formattedPhone = cleanPhone.startsWith("216") ? cleanPhone : (cleanPhone.length === 8 ? `216${cleanPhone}` : cleanPhone);
              const waText = encodeURIComponent(`Bonjour ! Je suis intéressé(e) par votre annonce "${occ.brand} ${occ.model}" à ${occ.price} DT sur TeleLab.`);

              return (
                <div 
                  key={occ.id} 
                  className="tl-product-card tl-occasion-card" 
                  onClick={() => handleProductClick(occ.id, true)}
                >
                  <div className="tl-product-img-wrapper">
                    {occ.photos && occ.photos.length > 0 ? (
                      <img src={occ.photos[0]} alt={occ.model} className="tl-product-img" loading="lazy" />
                    ) : (
                      <div className="tl-product-placeholder">
                        <Package size={48} color="var(--color-border)" />
                      </div>
                    )}
                    <div className="tl-product-badge" style={{ background: "rgba(var(--color-primary-rgb),0.85)", color: "var(--color-surface)" }}>
                      {occ.condition}
                    </div>
                  </div>
                  
                  <div className="tl-product-info">
                    <div style={{ fontSize: 12, color: "var(--color-primary-dark)", fontWeight: 600, marginBottom: 4 }}>
                      {occ.type} • {occ.brand}
                    </div>
                    <h3>{occ.model}</h3>
                    <p className="tl-product-desc">{occ.description}</p>
                    
                    {/* Seller details with verified badge */}
                    <div className="tl-seller-row">
                      <span className="tl-seller-name-label">
                        {occ.sellerName || "Vendeur TeleLab"}
                      </span>
                      {occ.sellerVerified ? (
                        <span className="tl-seller-verified-tag" title="Identité vérifiée par carte CIN">
                          <CheckCircle2 size={13} />
                          <span>Vérifié</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="tl-product-footer">
                      <div className="tl-product-price">
                        {occ.price.toFixed(2)} <span>DT</span>
                      </div>
                      <a 
                        href={`https://wa.me/${formattedPhone}?text=${waText}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="tl-btn-whatsapp-card"
                        onClick={(e) => e.stopPropagation()}
                        title="Contacter le vendeur sur WhatsApp"
                      >
                        <MessageCircle size={17} />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>}

        {currentItems.length > itemsPerPage && (shopMode === "occasion" || shopDataReady) && (
          <nav className="tl-shop-pagination" aria-label={isArabic ? "صفحات المنتجات" : "Pagination des produits"}>
            <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
              {isArabic ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              <span>{isArabic ? "السابق" : "Précédent"}</span>
            </button>
            <span className="tl-shop-pagination__status" aria-live="polite">
              {isArabic ? `صفحة ${currentPage} من ${pageCount}` : `Page ${currentPage} sur ${pageCount}`}
            </span>
            <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount}>
              <span>{isArabic ? "التالي" : "Suivant"}</span>
              {isArabic ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </nav>
        )}

        {((shopMode === "neuf" && shopDataReady && filteredProducts.length === 0) || (shopMode === "occasion" && filteredOccasions.length === 0)) && (
          <div className="tl-shop-empty fade-in-up">
            <Package size={64} color="var(--color-border)" />
            <h3>{shopMode === "neuf" && shopDataError
              ? (isArabic ? "تعذّر تحميل المنتجات" : "Impossible de charger les produits")
              : (isArabic ? "لا توجد منتجات" : "Aucun produit trouvé")}</h3>
            <p>{shopMode === "neuf" && shopDataError
              ? shopDataError
              : (isArabic ? "جرب البحث بكلمات أخرى" : "Essayez une autre recherche ou catégorie")}</p>
            {shopMode === "neuf" && shopDataError && (
              <button type="button" className="tl-shop-retry" onClick={() => void refreshShop()} disabled={isShopRefreshing}>
                {isShopRefreshing ? (isArabic ? "جاري التحديث…" : "Actualisation…") : (isArabic ? "إعادة المحاولة" : "Réessayer")}
              </button>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
