import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useShopCategories, useShopProducts, shopStore } from "@/services/shopStore";
import { useOccasions, occasionStore } from "@/services/occasionStore";
import { useAuth } from "@/services/auth";
import { useCartStore } from "@/services/cartStore";
import { Search, Store, ShoppingBag, Package, Plus, UserCheck, MessageCircle, ShoppingCart, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./Shop.css";

export function Shop() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const categories = useShopCategories();
  const products = useShopProducts();
  const occasions = useOccasions();
  const { isLoggedIn } = useAuth();
  const { addItem, toggleCart } = useCartStore();

  const [shopMode, setShopMode] = useState<"neuf" | "occasion">("neuf");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const handleProductClick = (id: string, isOccasion: boolean) => {
    occasionStore.incrementViews(id, isOccasion);
    if (isOccasion) {
      navigate(`/shop/occasion/${id}`);
    } else {
      const prod = products.find(p => p.id === id);
      if (prod) {
        const cat = categories.find(c => c.id === prod.categoryId);
        const catSlug = cat?.slug || 'category';
        const prodSlug = prod.slug || id;
        navigate(`/shop/category/${catSlug}/${prodSlug}`);
      }
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = activeCategory === "ALL" || p.categoryId === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch && p.active;
  });

  const filteredOccasions = occasions.filter(o => {
    const matchesCat = activeCategory === "ALL" || o.type === activeCategory;
    const matchesSearch = o.brand.toLowerCase().includes(search.toLowerCase()) || 
                          o.model.toLowerCase().includes(search.toLowerCase()) ||
                          o.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch && o.status === "active";
  });

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

        {/* Products Grid */}
        <div className="tl-shop-grid fade-in-up" style={{ animationDelay: "0.2s" }}>
          {shopMode === "neuf" ? (
            filteredProducts.map(prod => (
              <div key={prod.id} className="tl-product-card" onClick={() => handleProductClick(prod.id, false)}>
                <div className="tl-product-img-wrapper">
                  {prod.imageUrl ? (
                    <img src={prod.imageUrl} alt={prod.name} className="tl-product-img" loading="lazy" />
                  ) : (
                    <div className="tl-product-placeholder">
                      <Package size={48} color="var(--color-border)" />
                    </div>
                  )}
                  {prod.stock === 0 && (
                    <div className="tl-product-badge out-of-stock">
                      {isArabic ? "نفذت الكمية" : "Rupture"}
                    </div>
                  )}
                </div>
                
                <div className="tl-product-info">
                  <h3>{prod.name}</h3>
                  {prod.description && <p className="tl-product-desc">{prod.description}</p>}
                  
                  <div className="tl-product-footer">
                    <div className="tl-product-price">
                      {prod.price.toFixed(2)} <span>DT</span>
                    </div>
                    <button 
                      className="tl-btn-primary" 
                      style={{ padding: "8px", borderRadius: "8px", minWidth: "40px", display: "flex", justifyContent: "center" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem({
                          id: prod.id,
                          name: prod.name,
                          price: prod.price,
                          quantity: 1,
                          imageUrl: prod.imageUrl,
                          isOccasion: false
                        });
                        toggleCart();
                      }}
                      title="Ajouter au panier"
                    >
                      <ShoppingCart size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            filteredOccasions.map(occ => {
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
        </div>

        {((shopMode === "neuf" && filteredProducts.length === 0) || (shopMode === "occasion" && filteredOccasions.length === 0)) && (
          <div className="tl-shop-empty fade-in-up">
            <Package size={64} color="var(--color-border)" />
            <h3>{isArabic ? "لا توجد منتجات" : "Aucun produit trouvé"}</h3>
            <p>{isArabic ? "جرب البحث بكلمات أخرى" : "Essayez une autre recherche ou catégorie"}</p>
          </div>
        )}

      </div>
    </main>
  );
}
