import { Link, useLocation } from "react-router-dom";
import { Home, Search, Wrench, User, Store } from "lucide-react";
import { useAuth } from "@/services/auth";
import "./PwaDock.css";

export function PwaDock() {
  const location = useLocation();
  const { user } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/" && currentPath !== "/") return false;
    return currentPath.startsWith(path);
  };

  const dashboardPath =
    user?.role === "admin"
      ? "/dashboard/admin"
      : user?.role === "driver"
      ? "/dashboard/livreur"
      : user?.role === "technician"
      ? "/dashboard/technicien"
      : "/dashboard/client";

  return (
    <nav className="tl-pwa-dock" aria-label="Mobile Navigation">
      <div className="tl-pwa-dock__inner">
        <Link
          to="/"
          className={`tl-pwa-dock__item ${isActive("/") ? "active" : ""}`}
        >
          <div className="tl-pwa-dock__icon-wrap">
            <Home size={22} strokeWidth={2.5} />
          </div>
          <span className="tl-pwa-dock__label">Accueil</span>
        </Link>

        <Link
          to="/shop"
          className={`tl-pwa-dock__item ${isActive("/shop") ? "active" : ""}`}
        >
          <div className="tl-pwa-dock__icon-wrap">
            <Store size={22} strokeWidth={2.5} />
          </div>
          <span className="tl-pwa-dock__label">Boutique</span>
        </Link>

        <Link
          to="/demande"
          className={`tl-pwa-dock__item tl-pwa-dock__item--main ${
            isActive("/demande") ? "active" : ""
          }`}
        >
          <div className="tl-pwa-dock__icon-wrap">
            <Wrench size={26} strokeWidth={2.5} />
          </div>
        </Link>

        <Link
          to="/tracking"
          className={`tl-pwa-dock__item ${isActive("/tracking") ? "active" : ""}`}
        >
          <div className="tl-pwa-dock__icon-wrap">
            <Search size={22} strokeWidth={2.5} />
          </div>
          <span className="tl-pwa-dock__label">Suivi</span>
        </Link>

        <Link
          to={user ? dashboardPath : "/login"}
          className={`tl-pwa-dock__item ${
            isActive("/dashboard") || isActive("/login") ? "active" : ""
          }`}
        >
          <div className="tl-pwa-dock__icon-wrap">
            <User size={22} strokeWidth={2.5} />
          </div>
          <span className="tl-pwa-dock__label">{user ? "Compte" : "Connexion"}</span>
        </Link>
      </div>
    </nav>
  );
}
