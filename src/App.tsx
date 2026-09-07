import { Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Home } from "@/pages/Home/Home";
import { RequestRepair } from "@/pages/RequestRepair/RequestRepair";
import { Tracking } from "@/pages/Tracking/Tracking";
import { Login } from "@/pages/Login/Login";
import { CustomerDashboard } from "@/pages/CustomerDashboard/CustomerDashboard";
import { AdminDashboard } from "@/pages/AdminDashboard/AdminDashboard";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useHashScroll } from "@/hooks/useHashScroll";

export default function App() {
  useHashScroll();

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/demande" element={<RequestRepair />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard/client" 
          element={
            <ProtectedRoute allowedRoles={["client", "admin"]}>
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
