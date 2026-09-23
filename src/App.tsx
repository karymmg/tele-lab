import { Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Suspense, lazy } from "react";
const Home = lazy(() => import("@/pages/Home/Home").then(m => ({ default: m.Home })));
const RequestRepair = lazy(() => import("@/pages/RequestRepair/RequestRepair").then(m => ({ default: m.RequestRepair })));
const Tracking = lazy(() => import("@/pages/Tracking/Tracking").then(m => ({ default: m.Tracking })));
const Login = lazy(() => import("@/pages/Login/Login").then(m => ({ default: m.Login })));
const Signup = lazy(() => import("@/pages/Signup/Signup").then(m => ({ default: m.Signup })));
const AdminDashboardLazy = lazy(() => import("@/pages/AdminDashboard/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const CustomerDashboardLazy = lazy(() => import("@/pages/CustomerDashboard/CustomerDashboard").then(m => ({ default: m.CustomerDashboard })));
const Shop = lazy(() => import("@/pages/Shop/Shop").then(m => ({ default: m.Shop })));
const AddOccasionForm = lazy(() => import("@/pages/Shop/AddOccasionForm").then(m => ({ default: m.AddOccasionForm })));
const OccasionDetail = lazy(() => import("@/pages/Shop/OccasionDetail").then(m => ({ default: m.OccasionDetail })));
const NotFound = lazy(() => import("@/pages/NotFound/NotFound").then(m => ({ default: m.NotFound })));
const Catalogue = lazy(() => import("@/pages/Catalogue/Catalogue").then(m => ({ default: m.Catalogue })));
const ProductDetail = lazy(() => import("@/pages/Catalogue/ProductDetail").then(m => ({ default: m.ProductDetail })));
const CategoryDetail = lazy(() => import("@/pages/Catalogue/CategoryDetail").then(m => ({ default: m.CategoryDetail })));
const BrandDetail = lazy(() => import("@/pages/Catalogue/BrandDetail").then(m => ({ default: m.BrandDetail })));
const ModelDetail = lazy(() => import("@/pages/Catalogue/ModelDetail").then(m => ({ default: m.ModelDetail })));
const Search = lazy(() => import("@/pages/Search/Search").then((module) => ({ default: module.Search })));
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
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    occasionStore.logSiteVisit();
  }, []);

  return (
    <>
      <Header />
      <Suspense fallback={<div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Catalogue />} />
          <Route path="/shop/category/:categorySlug/:brandSlug/:modelSlug/:productSlug" element={<ProductDetail />} />
          <Route path="/shop/category/:categorySlug/:productSlug" element={<ProductDetail />} />
          <Route path="/shop/:productSlug" element={<ProductDetail />} />
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
