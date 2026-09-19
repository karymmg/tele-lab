import { Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Home } from "@/pages/Home/Home";
import { RequestRepair } from "@/pages/RequestRepair/RequestRepair";
import { Tracking } from "@/pages/Tracking/Tracking";
import { Login } from "@/pages/Login/Login";
import { Signup } from "@/pages/Signup/Signup";
import { CustomerDashboard } from "@/pages/CustomerDashboard/CustomerDashboard";
import { AdminDashboard } from "@/pages/AdminDashboard/AdminDashboard";
import { Shop } from "@/pages/Shop/Shop";
import { AddOccasionForm } from "@/pages/Shop/AddOccasionForm";
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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/demande" element={<RequestRepair />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/shop" element={<Shop />} />
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
              <CustomerDashboard />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Footer />
      <CartDrawer />
    </>
  );
}
