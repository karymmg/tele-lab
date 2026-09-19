import { Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Home } from "@/pages/Home/Home";
import { RequestRepair } from "@/pages/RequestRepair/RequestRepair";
import { Tracking } from "@/pages/Tracking/Tracking";
import { Login } from "@/pages/Login/Login";
import { CustomerDashboard } from "@/pages/CustomerDashboard/CustomerDashboard";
import { AdminDashboard } from "@/pages/AdminDashboard/AdminDashboard";
import { Shop } from "@/pages/Shop/Shop";
import { AddOccasionForm } from "@/pages/Shop/AddOccasionForm";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useHashScroll } from "@/hooks/useHashScroll";
import { occasionStore } from "@/services/occasionStore";
import { useEffect } from "react";

export default function App() {
  useHashScroll();

  useEffect(() => {
    // Log site visit on app load for analytics
    occasionStore.logSiteVisit();
  }, []);

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/demande" element={<RequestRepair />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/add-occasion" element={<AddOccasionForm />} />
        <Route path="/login" element={<Login />} />
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
    </>
  );
}
