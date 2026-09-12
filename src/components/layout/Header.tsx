import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/services/auth";
import { LogOut, User, Menu, X } from "lucide-react";
import "./Header.css";

export function Header() {
  const { t, i18n } = useTranslation();
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  const navLinks = [
    { to: "/", label: t("nav.home") },
    { to: "/#services", label: t("nav.services") },
    { to: "/#how-it-works", label: t("nav.howItWorks") },
    { to: "/#pricing", label: t("nav.pricing") },
    { to: "/tracking", label: t("nav.track") },
    { to: "/#contact", label: t("nav.contact") },
  ];

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
              <Link to="/dashboard/admin" className="tl-header__username">
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
            <Link to="/dashboard/admin" className="tl-header__mobile-link" style={{ color: "#00A3FF" }}>
              Dashboard Admin
            </Link>
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
