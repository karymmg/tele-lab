import { Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Home } from "@/pages/Home/Home";
import { RequestRepair } from "@/pages/RequestRepair/RequestRepair";
import { Tracking } from "@/pages/Tracking/Tracking";
import { Login } from "@/pages/Login/Login";
import { Signup } from "@/pages/Signup/Signup";
import { Suspense, lazy } from "react";
import { CustomerDashboard } from "@/pages/CustomerDashboard/CustomerDashboard";
const AdminDashboardLazy = lazy(() => import("@/pages/AdminDashboard/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const CustomerDashboardLazy = lazy(() => import("@/pages/CustomerDashboard/CustomerDashboard").then(m => ({ default: m.CustomerDashboard })));
import { Shop } from "@/pages/Shop/Shop";
import { AddOccasionForm } from "@/pages/Shop/AddOccasionForm";
import { OccasionDetail } from "@/pages/Shop/OccasionDetail";
import { NotFound } from "@/pages/NotFound/NotFound";
import { Catalogue } from "@/pages/Catalogue/Catalogue";
import { ProductDetail } from "@/pages/Catalogue/ProductDetail";
import { CategoryDetail } from "@/pages/Catalogue/CategoryDetail";
import { BrandDetail } from "@/pages/Catalogue/BrandDetail";
import { ModelDetail } from "@/pages/Catalogue/ModelDetail";
import { Search } from "@/pages/Search/Search";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useHashScroll } from "@/hooks/useHashScroll";
import { occasionStore } from "@/services/occasionStore";
import { useTheme } from "@/hooks/useTheme";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useEffect } from "react";

export default function App() {
  useHashScroll();
  const theme = useTheme((state) => state.theme);

  useEffect(() => {
    // Set initial theme class on document
    document.documentElement.setAttribute("data-theme", theme);
    // Log site visit on app load for analytics
    occasionStore.logSiteVisit();
  }, [theme]);

  return (
    <>
      <Header />
      <Suspense fallback={<div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Catalogue />} />
          <Route path="/shop/category/:categorySlug/:productSlug" element={<ProductDetail />} />
          <Route path="/category/:slug" element={<CategoryDetail />} />
          <Route path="/brand/:slug" element={<BrandDetail />} />
          <Route path="/model/:slug" element={<ModelDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/demande" element={<RequestRepair />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/occasion/:id" element={<OccasionDetail />} />
          <Route 
            path="/shop/add-occasion" 
            element={
              <ProtectedRoute allowedRoles={["customer", "admin"]}>
                <AddOccasionForm />
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route 
            path="/dashboard/client" 
            element={
              <ProtectedRoute allowedRoles={["customer", "admin"]}>
                <CustomerDashboardLazy />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboardLazy />
              </ProtectedRoute>
            }
          />
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Footer />
      <CartDrawer />
    </>
  );
}
