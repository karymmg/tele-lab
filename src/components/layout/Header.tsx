import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/services/auth";
import { LogOut, User, Menu, X, Sun, Moon, ShoppingCart, Search } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useCartStore } from "@/services/cartStore";
import { useShopBrands, useShopCategories, useShopModels, useShopProducts } from "@/services/shopStore";
import { getProductPath } from "@/utils/productUrl";
import { useShopOrders } from "@/services/orderStore";
import { useRepairRequests } from "@/services/store";
import "./Header.css";

export function Header() {
  const { t, i18n } = useTranslation();
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isArabic = i18n.language === "ar";
  const { theme, toggleTheme } = useTheme();
  const { toggleCart, getTotalItems } = useCartStore();
  const products = useShopProducts();
  const categories = useShopCategories();
  const brands = useShopBrands();
  const models = useShopModels();
  const orders = useShopOrders();
  const repairs = useRepairRequests();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function switchLanguage(lng: "fr" | "ar") {
    i18n.changeLanguage(lng);
  }

  // Detect scroll for glass effect intensification
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  // ── Build navigation links based on role ──
  const dashboardLink = user?.role === "admin" ? "/dashboard/admin" : "/dashboard/client";

  let navLinks: { to: string; label: string }[];

  if (isLoggedIn && user?.role === "admin") {
    navLinks = [
      { to: "/shop", label: isArabic ? "المتجر" : "Boutique" },
      { to: dashboardLink, label: isArabic ? "لوحة الإدارة" : "Administration" },
    ];
  } else if (isLoggedIn) {
    navLinks = [
      { to: "/demande", label: isArabic ? "إصلاح في المنزل" : "Réparation à domicile" },
      { to: "/tracking", label: isArabic ? "تتبع الإصلاح" : "Suivi réparation" },
      { to: "/dashboard/client#orders", label: isArabic ? "طلباتي" : "Mes commandes" },
      { to: "/shop", label: isArabic ? "المتجر" : "Boutique" },
    ];
  } else {
    navLinks = [
      { to: "/demande", label: isArabic ? "إصلاح في المنزل" : "Réparation à domicile" },
      { to: "/tracking", label: isArabic ? "تتبع الإصلاح" : "Suivi réparation" },
      { to: "/shop", label: isArabic ? "المتجر" : "Boutique" },
      { to: "/#how-it-works", label: isArabic ? "كيف يعمل" : "Comment ça marche" },
    ];
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    if (user?.role === "admin") {
      // Pour l'admin, on le redirige vers le dashboard avec un paramètre de recherche
      navigate(`/dashboard/admin?q=${encodeURIComponent(searchQuery)}`);
    } else {
      // Pour client/visiteur, on filtre la boutique
      navigate("/search?q=" + encodeURIComponent(searchQuery.trim()));
    }
    setSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <header className={`tl-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="container tl-header__inner">

        {/* Logo */}
        <Link to="/" className="tl-header__logo">
          <span className="tl-header__logo-text">
            TELE<span className="tl-header__logo-accent">LAB</span>
          </span>
          <span className="tl-header__logo-sub">by Telephonic Pro</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="tl-header__nav">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="tl-header__actions">
          {/* Smart Search Bar */}
          <form 
            className={`tl-header__search ${searchOpen ? "is-open" : ""}`} 
            onSubmit={handleSearchSubmit}
            onMouseLeave={() => { if(!searchQuery) setSearchOpen(false); }}
          >
            <button 
              type="button" 
              className="tl-header__theme-toggle" 
              onClick={() => setSearchOpen(true)}
              onMouseEnter={() => setSearchOpen(true)}
              aria-label="Rechercher"
            >
              <Search size={16} />
            </button>
            <input 
              type="text" 
              placeholder={user?.role === "admin" ? "Chercher client, tél, produit, commande, suivi..." : "Chercher un produit..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus={searchOpen}
            />
            {/* Search Dropdown */}
            {searchOpen && searchQuery && (
              <div className="tl-header__search-dropdown">
                {(() => {
                  const query = searchQuery.trim().toLowerCase();
                  const queryDigits = query.replace(/\D/g, "");
                  const matches = (values: Array<string | undefined | null>, phones: Array<string | undefined | null> = []) => {
                    if (!query) return false;
                    const textMatch = values.some(value => value?.toLowerCase().includes(query));
                    const phoneMatch = queryDigits.length >= 4 && phones.some(value => (value || "").replace(/\D/g, "").includes(queryDigits));
                    return textMatch || phoneMatch;
                  };
                  const matchedProducts = products.filter(p => {
                    if (!p.active && user?.role !== "admin") return false;
                    const model = models.find(item => item.id === p.modelId);
                    const brand = brands.find(item => item.id === p.brandId) || brands.find(item => item.id === model?.brand_id);
                    const category = categories.find(item => item.id === p.categoryId);
                    return matches([p.name, p.sku, p.description, brand?.name, model?.name, category?.name]);
                  }).slice(0, 5);

                  let matchedOrders: any[] = [];
                  let matchedRepairs: any[] = [];
                  if (user?.role === "admin") {
                    matchedOrders = orders.filter(order => matches([order.orderNumber, order.customerName, order.customerAddress, order.customerCity, order.customerGovernorate, order.status, ...(order.items || []).map((item: any) => item.name)], [order.customerPhone])).slice(0, 4);
                    matchedRepairs = repairs.filter(repair => matches([repair.trackingNumber, repair.customer.firstName, repair.customer.lastName, repair.brand, repair.model, repair.status], [repair.customer.phone])).slice(0, 4);
                  }

                  const hasResults = matchedProducts.length > 0 || matchedOrders.length > 0 || matchedRepairs.length > 0;

                  return (
                    <>
                      {matchedProducts.length > 0 && (
                        <div className="tl-search-section">
                          <div className="tl-search-section-title">Produits</div>
                          {matchedProducts.map(p => {
                            const model = models.find(item => item.id === p.modelId);
                            const brand = brands.find(item => item.id === p.brandId) || brands.find(item => item.id === model?.brand_id);
                            const category = categories.find(item => item.id === p.categoryId);
                            const to = getProductPath({ id: p.id, slug: p.slug, categorySlug: category?.slug, brandSlug: brand?.slug || brand?.name, modelSlug: model?.slug || model?.name });
                            return (
                              <Link key={p.id} to={to} className="tl-search-item" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                                <div className="tl-search-item-title">{p.name}</div>
                                <div className="tl-search-item-sub">{brand?.name || (isArabic ? "ماركة غير محددة" : "Marque non renseignée")} · {model?.name || (isArabic ? "موديل غير محدد" : "Modèle non renseigné")} · {p.price} DT</div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                      
                      {user?.role === "admin" && matchedOrders.length > 0 && (
                        <div className="tl-search-section">
                          <div className="tl-search-section-title">Commandes</div>
                          {matchedOrders.map(o => (
                            <Link key={o.id} to={`/dashboard/admin?tab=orders&q=${encodeURIComponent(o.orderNumber)}`} className="tl-search-item" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                              <div className="tl-search-item-title">{o.orderNumber} - {o.customerName}</div>
                              <div className="tl-search-item-sub">{o.status}</div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {user?.role === "admin" && matchedRepairs.length > 0 && (
                        <div className="tl-search-section">
                          <div className="tl-search-section-title">Réparations</div>
                          {matchedRepairs.map(r => (
                            <Link key={r.id} to={`/dashboard/admin?tab=repairs&q=${encodeURIComponent(r.trackingNumber)}`} className="tl-search-item" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                              <div className="tl-search-item-title">{r.trackingNumber}</div>
                              <div className="tl-search-item-sub">{r.brand} {r.model}</div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {!hasResults && (
                        <div className="tl-search-no-results">Aucun résultat trouvé pour "{searchQuery}"</div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </form>

          {/* Theme Toggle */}
          <button
            className="tl-header__theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Mode Sombre" : "Mode Clair"}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Cart Button */}
          <button
            className="tl-header__theme-toggle"
            onClick={toggleCart}
            style={{ position: "relative" }}
            aria-label="Mon Panier"
          >
            <ShoppingCart size={16} />
            {getTotalItems() > 0 && (
              <span style={{ 
                position: "absolute", top: -2, right: -4, 
                background: "#0077E6", color: "var(--color-surface)", 
                fontSize: "9px", fontWeight: "bold", 
                borderRadius: "10px", padding: "2px 5px" 
              }}>
                {getTotalItems()}
              </span>
            )}
          </button>

          {/* Language Switcher */}
          <div className="tl-header__lang">
            <button
              className={i18n.language === "fr" ? "is-active" : ""}
              onClick={() => switchLanguage("fr")}
            >
              FR
            </button>
            <span className="tl-header__lang-sep" />
            <button
              className={i18n.language === "ar" ? "is-active" : ""}
              onClick={() => switchLanguage("ar")}
            >
              AR
            </button>
          </div>

          {/* Auth */}
          {isLoggedIn ? (
            <div className="tl-header__user">
              <Link to={dashboardLink} className="tl-header__username">
                <span className="tl-header__avatar">
                  <User size={14} />
                </span>
                <span className="tl-header__user-name">{user?.displayName}</span>
              </Link>
              <button
                className="tl-header__logout"
                onClick={() => { logout(); navigate("/"); }}
                title="Déconnexion"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="tl-header__login-link" title="Se connecter">
                <User size={16} />
              </Link>
              <Link to="/demande" className="tl-header__cta-link">
                <Button>{t("hero.ctaPrimary")}</Button>
              </Link>
            </>
          )}

          {/* Mobile Hamburger */}
          <button
            className="tl-header__hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div className={`tl-header__mobile ${mobileOpen ? "is-open" : ""}`}>
        <nav className="tl-header__mobile-nav">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="tl-header__mobile-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="tl-header__mobile-actions">
          {isLoggedIn ? (
            <>
              <Link to={dashboardLink} className="tl-header__mobile-link" style={{ color: "var(--color-primary-dark)" }}>
                Dashboard
              </Link>
              <button
                className="tl-header__mobile-link"
                onClick={() => { logout(); navigate("/"); }}
                style={{ background: "none", border: "none", color: "var(--color-error)", cursor: "pointer", textAlign: "left", padding: "12px 0", fontSize: "inherit" }}
              >
                {isArabic ? "تسجيل الخروج" : "Déconnexion"}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="tl-header__mobile-link">
                Se connecter
              </Link>
              <Link to="/demande" style={{ width: "100%" }}>
                <Button style={{ width: "100%" }}>{t("hero.ctaPrimary")}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
