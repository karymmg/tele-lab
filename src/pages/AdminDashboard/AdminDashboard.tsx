import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRepairRequests, useDrivers, repairStore } from "@/services/store";
import { RepairRequest } from "@/types/telelab";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RepairStatusKey, REPAIR_STATUSES } from "@/utils/status";
import { useAuth, hasAccount } from "@/services/auth";
import { Settings, Search, X, Clock, User, Phone, DollarSign, Truck, FileText, Users, Wrench, MessageCircle, Plus, Trash2, Printer, Store, Package, ShoppingBag, BarChart3, Shield, Eye } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { RepairRequestForm } from "@/components/forms/RepairRequestForm";
import { useShopCategories, useShopProducts, shopStore } from "@/services/shopStore";
import { useOccasions, useSiteVisits, occasionStore } from "@/services/occasionStore";
import { useShopOrders, orderStore } from "@/services/orderStore";
import { supabase } from "@/services/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { OccasionProduct } from "@/types/occasion";
import "./AdminDashboard.css";

const TECH_OPTIONS = [
  "Fares Khemir (Spécialiste Apple / Micro-soudure)",
  "Ahmed Chaabane (Spécialiste Android / Écrans)",
  "Bilel Mansouri (Spécialiste Logiciel & Déblocage)",
];

type TabType = "stats" | "repairs" | "orders" | "users" | "drivers" | "shop" | "occasions";

interface ProfileUser {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  auth_email: string | null;
  role: string;
  created_at: string;
}

export function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const requests = useRepairRequests();
  const drivers = useDrivers();
  const isArabic = i18n.language === "ar";

  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedReq, setSelectedReq] = useState<RepairRequest | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>("");
  const [customNote, setCustomNote] = useState<string>("");
  const [isAddingRequest, setIsAddingRequest] = useState(false);
  const [printType, setPrintType] = useState<"devis" | "facture" | null>(null);

  // New driver form state
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [newDriverZone, setNewDriverZone] = useState("");

  // --- SHOP STATE ---
  const categories = useShopCategories();
  const products = useShopProducts();
  const occasions = useOccasions();
  const siteVisits = useSiteVisits();
  const shopOrders = useShopOrders();
  const [shopView, setShopView] = useState<"products" | "categories">("products");
  const [totalUsers, setTotalUsers] = useState(0);
  const [profileUsers, setProfileUsers] = useState<ProfileUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "customer" });

  React.useEffect(() => {
    async function fetchUsers() {
      setUsersLoading(true);
      const { data, count } = await supabase.from("profiles").select("*", { count: "exact" });
      if (count !== null) setTotalUsers(count);
      if (data) setProfileUsers(data as ProfileUser[]);
      setUsersLoading(false);
    }
    fetchUsers();
  }, []);

  async function handleRoleChange(userId: string, newRole: string) {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) {
      alert("Erreur lors de la mise à jour du rôle : " + error.message);
    } else {
      setProfileUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ? (Attention : cette action est irréversible)")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) {
      alert("Erreur lors de la suppression : " + error.message);
    } else {
      setProfileUsers(prev => prev.filter(u => u.id !== userId));
      setTotalUsers(prev => prev - 1);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingUser(true);
    try {
      const supabaseAdmin = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        }
      );
      
      const { data, error } = await supabaseAdmin.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });
      
      if (error) throw error;
      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          first_name: newUser.firstName,
          last_name: newUser.lastName,
          phone: newUser.phone,
          email: newUser.email,
          auth_email: newUser.email,
          role: newUser.role,
        });
        if (profileError) throw profileError;
        
        setProfileUsers(prev => [{
          id: data.user.id,
          first_name: newUser.firstName,
          last_name: newUser.lastName,
          phone: newUser.phone,
          email: newUser.email,
          auth_email: newUser.email,
          role: newUser.role,
          created_at: new Date().toISOString()
        }, ...prev]);
        setTotalUsers(prev => prev + 1);
        setIsAddingUser(false);
        setNewUser({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "customer" });
      }
    } catch (err: any) {
      alert("Erreur lors de la création : " + err.message);
    } finally {
      setIsSubmittingUser(false);
    }
  }
  
  // Category Form
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  
  // Product Form
  const [newProdName, setNewProdName] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("");
  const [newProdImg, setNewProdImg] = useState("");
  const [newProdCat, setNewProdCat] = useState("");

  // --- REPAIRS LOGIC ---
  const totalCount = requests.length;
  const newCount = requests.filter((r) => r.status === "new").length;
  const inRepairCount = requests.filter((r) => r.status === "repair_in_progress" || r.status === "received_at_shop").length;
  const inDeliveryCount = requests.filter(
    (r) =>
      r.status === "driver_assigned_pickup" ||
      r.status === "pickup_in_delivery" ||
      r.status === "return_in_delivery" ||
      r.status === "driver_assigned_return"
  ).length;
  const completedCount = requests.filter((r) => r.status === "delivered_to_customer").length;
  
  let totalRevenue = 0;
  let collectedRevenue = 0;
  requests.forEach(r => {
    if (r.price) {
      totalRevenue += r.price;
      if (r.paymentStatus === "fully_paid") {
        collectedRevenue += r.price;
      } else if (r.paymentStatus === "deposit_paid") {
        collectedRevenue += (r.depositAmount || 0);
      }
    }
  });
  const pendingRevenue = totalRevenue - collectedRevenue;

  const pieData = [
    { name: isArabic ? "جديدة" : "Nouvelles", value: newCount, color: "#f59e0b" },
    { name: isArabic ? "في الإصلاح" : "En Réparation", value: inRepairCount, color: "#00A3FF" },
    { name: isArabic ? "في التوصيل" : "En Livraison", value: inDeliveryCount, color: "#8b5cf6" },
    { name: isArabic ? "مكتملة" : "Terminées", value: completedCount, color: "#10b981" }
  ].filter(d => d.value > 0);

  const barData = [
    { name: isArabic ? "الإجمالي" : "Total", montant: totalRevenue, fill: "#00A3FF" },
    { name: isArabic ? "المُحصّل" : "Encaissé", montant: collectedRevenue, fill: "#10b981" },
    { name: isArabic ? "المتبقي" : "En attente", montant: pendingRevenue, fill: "#f59e0b" },
  ];

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      `${req.customer.firstName} ${req.customer.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      req.customer.phone.includes(search) ||
      `${req.brand} ${req.model}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // --- CLIENTS LOGIC ---
  const uniqueClientsMap = new Map<string, { firstName: string; lastName: string; phone: string; email?: string; repairCount: number; spent: number }>();
  requests.forEach((req) => {
    const key = req.customer.phone.replace(/[\s\-\+]/g, "");
    if (!uniqueClientsMap.has(key)) {
      uniqueClientsMap.set(key, { ...req.customer, repairCount: 0, spent: 0 });
    }
    const client = uniqueClientsMap.get(key)!;
    client.repairCount += 1;
    client.spent += req.price || 0;
  });
  const clientsList = Array.from(uniqueClientsMap.values()).filter(c => 
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  // --- DRIVERS LOGIC ---
  const driversStats = drivers.map(d => {
    const assignedReqs = requests.filter(r => r.driverId === d.id || r.driverName === d.name);
    const activeReqs = assignedReqs.filter(r => 
      ["driver_assigned_pickup", "pickup_in_delivery", "driver_assigned_return", "return_in_delivery"].includes(r.status)
    );
    const completedReqs = assignedReqs.filter(r => 
      ["picked_up", "delivered_to_customer", "received_at_shop"].includes(r.status)
    );
    return {
      ...d,
      totalAssigned: assignedReqs.length,
      activeDeliveries: activeReqs.length,
      completedDeliveries: completedReqs.length,
    };
  });

  function handleAddDriver(e: React.FormEvent) {
    e.preventDefault();
    if (!newDriverName.trim() || !newDriverPhone.trim()) return;
    repairStore.addDriver(newDriverName, newDriverPhone, newDriverZone || "Toutes zones");
    setNewDriverName("");
    setNewDriverPhone("");
    setNewDriverZone("");
  }

  function handleDeleteDriver(id: string) {
    if(confirm("Êtes-vous sûr de vouloir supprimer ce livreur ?")) {
      repairStore.deleteDriver(id);
    }
  }

  // --- SHOP HANDLERS ---
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await shopStore.addCategory(newCatName, newCatIcon);
      setNewCatName("");
      setNewCatIcon("");
    } catch (err: any) {
      alert("Erreur lors de l'ajout de la catégorie : " + err.message);
    }
  }

  async function handleDeleteCategory(id: string) {
    if(confirm("Supprimer cette catégorie ? (Attention, cela supprimera tous les produits liés)")) {
      try {
        await shopStore.deleteCategory(id);
      } catch (err) {
        alert("Erreur lors de la suppression");
      }
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice || !newProdCat) return;
    try {
      await shopStore.addProduct({
        categoryId: newProdCat,
        name: newProdName,
        description: newProdDesc,
        price: parseFloat(newProdPrice),
        stock: parseInt(newProdStock) || 0,
        imageUrl: newProdImg,
        active: true
      });
      setNewProdName("");
      setNewProdDesc("");
      setNewProdPrice("");
      setNewProdStock("");
      setNewProdImg("");
    } catch (err) {
      alert("Erreur lors de l'ajout du produit");
    }
  }

  async function handleDeleteProduct(id: string) {
    if(confirm("Supprimer ce produit ?")) {
      try {
        await shopStore.deleteProduct(id);
      } catch (err) {
        alert("Erreur lors de la suppression");
      }
    }
  }

  // --- MODAL HANDLERS ---
  function handleOpenModal(req: RepairRequest) {
    setSelectedReq(req);
    setEditingPrice(req.price ? String(req.price) : "");
    setCustomNote("");
  }

  function handleDeleteRequest(id: string) {
    if (confirm("Êtes-vous sûr de vouloir supprimer définitivement cette commande ?")) {
      repairStore.deleteRequest(id);
      setSelectedReq(null);
    }
  }

  function handlePrint(type: "devis" | "facture") {
    setPrintType(type);
    setTimeout(() => {
      window.print();
      setPrintType(null);
    }, 100);
  }

  function handleSavePrice() {
    if (!selectedReq) return;
    const p = parseFloat(editingPrice);
    if (!isNaN(p) && p > 0) {
      const updated = repairStore.updatePrice(selectedReq.id, p);
      if (updated) setSelectedReq(updated);
    }
  }

  function handleChangeStatus(newStatus: RepairStatusKey) {
    if (!selectedReq) return;
    const updated = repairStore.updateStatus(selectedReq.id, newStatus, customNote || undefined, user?.displayName || "Admin Tele Lab");
    if (updated) {
      setSelectedReq(updated);
      setCustomNote("");
    }
  }

  function handleAssignDriver(driverId: string) {
    if (!selectedReq) return;
    const driver = drivers.find(d => d.id === driverId);
    if(driver) {
      const updated = repairStore.assignDriver(selectedReq.id, driver.name, driver.id);
      if (updated) setSelectedReq(updated);
    }
  }

  function handleAssignTech(techName: string) {
    if (!selectedReq) return;
    const updated = repairStore.assignTechnician(selectedReq.id, techName);
    if (updated) setSelectedReq(updated);
  }

  function handlePayment(type: "deposit" | "full") {
    if (!selectedReq) return;
    const updated = repairStore.recordPayment(selectedReq.id, type);
    if (updated) setSelectedReq(updated);
  }

  // --- WHATSAPP MESSAGING ---
  function generateDriverWhatsAppLink(type: "pickup" | "delivery") {
    if (!selectedReq) return "#";
    // Trouver le livreur assigné (par ID ou Nom pour la rétrocompatibilité)
    const assignedDriver = drivers.find(d => d.id === selectedReq.driverId || d.name === selectedReq.driverName);
    if (!assignedDriver) return "#";

    const phone = assignedDriver.phone.replace(/[\s\-\+]/g, "");
    
    let text = "";
    if (type === "pickup") {
      text = `Salut *${assignedDriver.name.split(" ")[0]}*, nouvelle collecte à effectuer 📦.\n\n` +
             `👤 *Client :* ${selectedReq.customer.firstName} ${selectedReq.customer.lastName}\n` +
             `📞 *Téléphone :* ${selectedReq.customer.phone}\n` +
             `📍 *Adresse :* ${selectedReq.address.address}, ${selectedReq.address.city}, ${selectedReq.address.governorate}\n\n` +
             `💰 *Acompte à encaisser (30%) :* ${selectedReq.depositAmount} DT`;
    } else {
      text = `Salut *${assignedDriver.name.split(" ")[0]}*, téléphone prêt pour livraison 🚀.\n\n` +
             `👤 *Client :* ${selectedReq.customer.firstName} ${selectedReq.customer.lastName}\n` +
             `📞 *Téléphone :* ${selectedReq.customer.phone}\n` +
             `📍 *Adresse :* ${selectedReq.address.address}, ${selectedReq.address.city}, ${selectedReq.address.governorate}\n\n` +
             `💰 *Solde à encaisser (70%) :* ${selectedReq.remainingAmount} DT`;
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  return (
    <main className="tl-admin-page">
      <div className="container">
        
        {/* Header with Tabs */}
        <div className="tl-admin-header">
          <div className="tl-admin-title">
            <h1>
              <Settings size={28} style={{ verticalAlign: "middle", marginRight: 12, color: "#008CFF" }} />
              {isArabic ? "لوحة تحكم الإدارة" : "Back Office"}
            </h1>
            <p>{isArabic ? `متصل بـ: ${user?.displayName || "Admin"}` : `Connecté : ${user?.displayName || "Admin"}`}</p>
          </div>
          
          <div className="tl-admin-tabs">
            <button 
              className={`tl-tab-btn ${activeTab === "stats" ? "is-active" : ""}`}
              onClick={() => { setActiveTab("stats"); setSearch(""); }}
            >
              <BarChart3 size={16} /> {isArabic ? "الإحصائيات" : "Statistiques"}
            </button>
            <button 
              className={`tl-tab-btn ${activeTab === "repairs" ? "is-active" : ""}`}
              onClick={() => { setActiveTab("repairs"); setSearch(""); }}
            >
              <Wrench size={16} /> {isArabic ? "الطلبات" : "Réparations"}
            </button>
            <button 
              className={`tl-tab-btn ${activeTab === "orders" ? "is-active" : ""}`}
              onClick={() => { setActiveTab("orders"); setSearch(""); }}
            >
              <ShoppingBag size={16} /> {isArabic ? "طلبات المتجر" : "Commandes"}
            </button>
            <button 
              className={`tl-tab-btn ${activeTab === "users" ? "is-active" : ""}`}
              onClick={() => { setActiveTab("users"); setSearch(""); }}
            >
              <Users size={16} /> {isArabic ? "المستخدمين" : "Utilisateurs"}
            </button>
            <button 
              className={`tl-tab-btn ${activeTab === "drivers" ? "is-active" : ""}`}
              onClick={() => { setActiveTab("drivers"); setSearch(""); }}
            >
              <Truck size={16} /> {isArabic ? "الموصلين" : "Livreurs"}
            </button>
            <button 
              className={`tl-tab-btn ${activeTab === "shop" ? "is-active" : ""}`}
              onClick={() => { setActiveTab("shop"); setSearch(""); }}
            >
              <Store size={16} /> {isArabic ? "المتجر" : "Boutique"}
            </button>
            <button 
              className={`tl-tab-btn ${activeTab === "occasions" ? "is-active" : ""}`}
              onClick={() => { setActiveTab("occasions"); setSearch(""); }}
            >
              <Package size={16} /> {isArabic ? "سوق المستعمل" : "Occasions"}
            </button>
          </div>
        </div>

        {/* ── TAB CONTENT: STATISTIQUES ───────────────────────────────────────── */}
        {activeTab === "stats" && (
          <div className="tl-tab-content fade-in">
            {/* KPI Cards */}
            <div className="tl-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 32 }}>
              <div className="tl-kpi-card" style={{ display: "flex", alignItems: "center", gap: 20, padding: 24 }}>
                <div style={{ background: "rgba(0,140,255,0.15)", color: "#00A3FF", padding: 16, borderRadius: 16 }}>
                  <Users size={28} />
                </div>
                <div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, textTransform: "uppercase" }}>{isArabic ? "إجمالي المستخدمين" : "Total Utilisateurs"}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--color-text)", marginTop: 4 }}>{totalUsers}</div>
                </div>
              </div>
              
              <div className="tl-kpi-card" style={{ display: "flex", alignItems: "center", gap: 20, padding: 24 }}>
                <div style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", padding: 16, borderRadius: 16 }}>
                  <ShoppingBag size={28} />
                </div>
                <div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, textTransform: "uppercase" }}>{isArabic ? "طلبات المتجر" : "Commandes Boutique"}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--color-text)", marginTop: 4 }}>{shopOrders.length}</div>
                </div>
              </div>

              <div className="tl-kpi-card" style={{ display: "flex", alignItems: "center", gap: 20, padding: 24 }}>
                <div style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", padding: 16, borderRadius: 16 }}>
                  <Wrench size={28} />
                </div>
                <div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, textTransform: "uppercase" }}>{isArabic ? "إجمالي الإصلاحات" : "Total Réparations"}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--color-text)", marginTop: 4 }}>{requests.length}</div>
                </div>
              </div>

              <div className="tl-kpi-card" style={{ display: "flex", alignItems: "center", gap: 20, padding: 24 }}>
                <div style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6", padding: 16, borderRadius: 16 }}>
                  <DollarSign size={28} />
                </div>
                <div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, textTransform: "uppercase" }}>{isArabic ? "إجمالي الإيرادات" : "Chiffre d'affaires"}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)", marginTop: 4 }}>{totalRevenue.toFixed(0)} <span style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>DT</span></div>
                </div>
              </div>

              <div className="tl-kpi-card" style={{ display: "flex", alignItems: "center", gap: 20, padding: 24 }}>
                <div style={{ background: "rgba(236,72,153,0.15)", color: "#ec4899", padding: 16, borderRadius: 16 }}>
                  <Eye size={28} />
                </div>
                <div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, textTransform: "uppercase" }}>{isArabic ? "زوار الموقع" : "Visiteurs du site"}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--color-text)", marginTop: 4 }}>{siteVisits}</div>
                </div>
              </div>

              <div className="tl-kpi-card" style={{ display: "flex", alignItems: "center", gap: 20, padding: 24 }}>
                <div style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4", padding: 16, borderRadius: 16 }}>
                  <Package size={28} />
                </div>
                <div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, textTransform: "uppercase" }}>{isArabic ? "منتجات المستعمل" : "Annonces Occasions"}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--color-text)", marginTop: 4 }}>{occasions.length}</div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="tl-charts-grid">
              <div className="tl-kpi-card tl-chart-card">
                <h4 style={{ color: "var(--color-text)", fontSize: 16, marginBottom: 20 }}>
                  {isArabic ? "توزيع الطلبات" : "Répartition des Demandes"}
                </h4>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                        itemStyle={{ color: "var(--color-text)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 10 }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }}></span>
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </div>

              <div className="tl-kpi-card tl-chart-card">
                <h4 style={{ color: "var(--color-text)", fontSize: 16, marginBottom: 20 }}>
                  {isArabic ? "الإيرادات المالية" : "Bilan Financier (DT)"}
                </h4>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        cursor={{ fill: "rgba(0,140,255,0.05)" }}
                        contentStyle={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                      />
                      <Bar dataKey="montant" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {barData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: REPAIRS ───────────────────────────────────────── */}
        {activeTab === "repairs" && (
          <div className="tl-tab-content fade-in">

            <div className="tl-admin-toolbar">
              <div className="tl-admin-search">
                <Search size={18} color="var(--color-text-secondary)" style={{ alignSelf: "center", position: "absolute", marginLeft: 12 }} />
                <input
                  type="text"
                  placeholder={isArabic ? "بحث برقم التتبع، العميل، الهاتف، الجهاز..." : "Rechercher (réf, nom, tél, modèle)..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 40 }}
                />
              </div>

              <div className="tl-admin-filter">
                <button 
                  className="tl-btn-manage" 
                  style={{ height: 44, background: "rgba(0,140,255,0.1)", color: "#00A3FF", borderColor: "rgba(0,140,255,0.3)", marginRight: 12 }}
                  onClick={() => setIsAddingRequest(true)}
                >
                  <Plus size={16} /> {isArabic ? "إضافة طلب" : "Nouvelle Demande"}
                </button>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">{isArabic ? "جميع الحالات" : "Tous les statuts"}</option>
                  {REPAIR_STATUSES.map((k) => (
                    <option key={k} value={k}>
                      {t(`status.${k}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="tl-admin-table-card">
              <div className="tl-table-wrapper">
                <table className="tl-admin-table">
                  <thead>
                    <tr>
                      <th>{isArabic ? "رقم التتبع" : "Réf."}</th>
                      <th>{isArabic ? "التاريخ" : "Date"}</th>
                      <th>{isArabic ? "العميل" : "Client"}</th>
                      <th>{isArabic ? "الجهاز" : "Appareil"}</th>
                      <th>{isArabic ? "الحالة" : "Statut"}</th>
                      <th>{isArabic ? "السعر" : "Prix"}</th>
                      <th>{isArabic ? "المكلف" : "Équipe"}</th>
                      <th>{isArabic ? "إجراء" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => (
                      <tr key={req.id}>
                        <td data-label="Réf." className="tl-td-tracking">{req.trackingNumber}</td>
                        <td data-label="Date" style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                          {new Date(req.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </td>
                        <td data-label="Client">
                          <div className="tl-td-client">
                            {req.customer.firstName} {req.customer.lastName}
                          </div>
                          <div className="tl-td-client-phone">
                            <a href={`tel:${req.customer.phone}`}>{req.customer.phone}</a>
                          </div>
                          <div style={{ marginTop: 4 }}>
                            {hasAccount(req.customer.phone.replace(/[\s\-\+]/g, "")) ? (
                              <span style={{ fontSize: "10px", color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 6px", borderRadius: 4 }}>Compte Actif</span>
                            ) : (
                              <span style={{ fontSize: "10px", color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 4 }}>Invité</span>
                            )}
                          </div>
                        </td>
                        <td data-label="Appareil">
                          <div style={{ fontWeight: 600 }}>
                            {req.brand} {req.model}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{req.problem}</div>
                        </td>
                        <td data-label="Statut">
                          <StatusBadge status={req.status} />
                        </td>
                        <td data-label="Prix">
                          {req.price ? (
                            <div>
                              <strong style={{ color: "#00A3FF" }}>{req.price} DT</strong>
                              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                                {req.depositAmount} / {req.remainingAmount}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "#f59e0b", fontSize: "12px", fontWeight: 600 }}>
                              Non fixé
                            </span>
                          )}
                        </td>
                        <td data-label="Équipe" style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                          {req.driverName ? <div>🚚 {req.driverName.split(" (")[0]}</div> : null}
                          {req.technicianName ? <div>🔧 {req.technicianName.split(" (")[0]}</div> : null}
                          {!req.driverName && !req.technicianName && <span>—</span>}
                        </td>
                        <td data-label="Action">
                          <button className="tl-btn-manage" onClick={() => handleOpenModal(req)}>
                            <Settings size={14} /> Gérer
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "var(--color-text-secondary)" }}>
                          Aucune demande trouvée.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: ORDERS ───────────────────────────────────────── */}
        {activeTab === "orders" && (
          <div className="tl-tab-content fade-in">
            <div className="tl-admin-toolbar">
              <div className="tl-admin-search">
                <Search size={18} color="var(--color-text-secondary)" style={{ alignSelf: "center", position: "absolute", marginLeft: 12 }} />
                <input
                  type="text"
                  placeholder={isArabic ? "بحث برقم الطلب أو العميل..." : "Rechercher (réf commande, client)..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            <div className="tl-admin-table-card">
              <div className="tl-table-wrapper">
                <table className="tl-admin-table">
                  <thead>
                    <tr>
                      <th>{isArabic ? "رقم الطلب" : "N° Commande"}</th>
                      <th>{isArabic ? "التاريخ" : "Date"}</th>
                      <th>{isArabic ? "العميل" : "Client"}</th>
                      <th>{isArabic ? "العنوان" : "Adresse"}</th>
                      <th>{isArabic ? "المنتجات" : "Produits"}</th>
                      <th>{isArabic ? "السعر" : "Total"}</th>
                      <th>{isArabic ? "الحالة" : "Statut"}</th>
                      <th>{isArabic ? "إجراء" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shopOrders.filter(o => o.orderNumber.includes(search) || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.customerPhone.includes(search)).map((order) => (
                      <tr key={order.id}>
                        <td data-label="N° Commande" style={{ fontWeight: 600, color: "#10b981" }}>{order.orderNumber}</td>
                        <td data-label="Date" style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                          {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td data-label="Client">
                          <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                          <div style={{ fontSize: "12px" }}>
                            <a href={`tel:${order.customerPhone}`} style={{ color: "#00A3FF" }}>{order.customerPhone}</a>
                          </div>
                        </td>
                        <td data-label="Adresse" style={{ fontSize: "12px" }}>
                          {order.customerAddress}, {order.customerCity} ({order.customerGovernorate})
                        </td>
                        <td data-label="Produits" style={{ fontSize: "12px", maxWidth: 200, whiteSpace: "normal" }}>
                          {order.items.map(item => `${item.quantity}x ${item.name}`).join(", ")}
                        </td>
                        <td data-label="Total">
                          <strong style={{ color: "#00A3FF" }}>{order.totalAmount.toFixed(2)} DT</strong>
                        </td>
                        <td data-label="Statut">
                          <select 
                            value={order.status}
                            onChange={(e) => orderStore.updateStatus(order.id, e.target.value as any)}
                            style={{ 
                              padding: "4px 8px", 
                              fontSize: 12, 
                              borderRadius: 4, 
                              background: order.status === 'delivered' ? "rgba(16,185,129,0.1)" : "var(--color-bg)", 
                              border: "1px solid var(--color-border)", 
                              color: order.status === 'delivered' ? "#10b981" : "var(--color-text-secondary)",
                              fontWeight: order.status === 'delivered' ? 600 : 400
                            }}
                          >
                            <option value="pending">En attente</option>
                            <option value="confirmed">Confirmée</option>
                            <option value="shipped">Expédiée</option>
                            <option value="delivered">Livrée</option>
                            <option value="cancelled">Annulée</option>
                          </select>
                        </td>
                        <td data-label="Action">
                          <button 
                            className="tl-btn-manage" 
                            style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }} 
                            onClick={() => {
                              if (confirm("Supprimer cette commande définitivement ?")) orderStore.deleteOrder(order.id);
                            }}
                          >
                            <Trash2 size={14} /> Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                    {shopOrders.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "var(--color-text-secondary)" }}>
                          Aucune commande trouvée.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: UTILISATEURS ───────────────────────────────────────── */}
        {activeTab === "users" && (
          <div className="tl-tab-content fade-in">
            <div className="tl-admin-toolbar">
              <div className="tl-admin-search">
                <Search size={18} color="var(--color-text-secondary)" style={{ alignSelf: "center", position: "absolute", marginLeft: 12 }} />
                <input
                  type="text"
                  placeholder={isArabic ? "بحث بالاسم، الهاتف أو البريد..." : "Rechercher (nom, tél, email)..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 40 }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {isArabic ? `${profileUsers.length} مستخدم مسجل` : `${profileUsers.length} utilisateur(s) inscrit(s)`}
                </span>
                <button 
                  className="tl-btn-manage" 
                  style={{ height: 40, background: "rgba(0,140,255,0.1)", color: "#00A3FF", borderColor: "rgba(0,140,255,0.3)" }}
                  onClick={() => setIsAddingUser(true)}
                >
                  <Plus size={16} /> {isArabic ? "إضافة مستخدم" : "Ajouter un utilisateur"}
                </button>
              </div>
            </div>

            {usersLoading ? (
              <div style={{ textAlign: "center", padding: 60, color: "var(--color-text-secondary)" }}>
                {isArabic ? "جاري التحميل..." : "Chargement des utilisateurs..."}
              </div>
            ) : (
              <div className="tl-admin-table-card">
                <div className="tl-table-wrapper">
                  <table className="tl-admin-table">
                    <thead>
                      <tr>
                        <th>{isArabic ? "المستخدم" : "Utilisateur"}</th>
                        <th>{isArabic ? "الهاتف" : "Téléphone"}</th>
                        <th>{isArabic ? "البريد" : "Email"}</th>
                        <th>{isArabic ? "الدور" : "Rôle"}</th>
                        <th>{isArabic ? "تاريخ التسجيل" : "Inscrit le"}</th>
                        <th>{isArabic ? "إجراء" : "Contact"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileUsers
                        .filter(u => 
                          `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
                          u.phone.includes(search) ||
                          (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
                          (u.auth_email || "").toLowerCase().includes(search.toLowerCase())
                        )
                        .map((u) => {
                          const roleColors: Record<string, { bg: string; color: string; label: string }> = {
                            admin: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", label: "Admin" },
                            customer: { bg: "rgba(16,185,129,0.1)", color: "#10b981", label: "Client" },
                            technician: { bg: "rgba(0,140,255,0.1)", color: "#00A3FF", label: "Technicien" },
                            driver: { bg: "rgba(139,92,246,0.1)", color: "#8b5cf6", label: "Livreur" },
                          };
                          const rc = roleColors[u.role] || roleColors.customer;
                          return (
                            <tr key={u.id}>
                              <td>
                                <div className="tl-td-client" style={{ fontWeight: 600 }}>
                                  {u.first_name} {u.last_name}
                                </div>
                              </td>
                              <td className="tl-td-client-phone">
                                <a href={`tel:${u.phone}`}>{u.phone}</a>
                              </td>
                              <td style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>
                                {u.auth_email || u.email || "—"}
                              </td>
                              <td>
                                <select
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                  style={{
                                    padding: "6px 12px",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    borderRadius: 6,
                                    background: rc.bg,
                                    border: `1px solid ${rc.color}33`,
                                    color: rc.color,
                                    cursor: "pointer",
                                  }}
                                >
                                  <option value="customer">Client</option>
                                  <option value="admin">Admin</option>
                                  <option value="technician">Technicien</option>
                                  <option value="driver">Livreur</option>
                                </select>
                              </td>
                              <td style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                                {new Date(u.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <a
                                    href={`https://wa.me/${u.phone.replace(/[^0-9]/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="tl-btn-manage"
                                    style={{ display: "inline-flex", color: "#25d366", borderColor: "rgba(37, 211, 102, 0.3)" }}
                                  >
                                    <MessageCircle size={14} /> WhatsApp
                                  </a>
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="tl-btn-manage"
                                    style={{ display: "inline-flex", color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
                                    title="Supprimer l'utilisateur"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      {profileUsers.length === 0 && !usersLoading && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--color-text-secondary)" }}>
                            {isArabic ? "لا يوجد مستخدمين مسجلين." : "Aucun utilisateur inscrit."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Add User */}
            {isAddingUser && (
              <div className="tl-modal-overlay">
                <div className="tl-modal-content">
                  <div className="tl-modal-header">
                    <h2>{isArabic ? "إضافة مستخدم جديد" : "Ajouter un nouvel utilisateur"}</h2>
                    <button onClick={() => setIsAddingUser(false)} className="tl-btn-icon"><X size={24} /></button>
                  </div>
                  <div className="tl-modal-body">
                    <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ display: "flex", gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--color-text-secondary)" }}>Prénom</label>
                          <input type="text" required value={newUser.firstName} onChange={e => setNewUser({...newUser, firstName: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--color-text-secondary)" }}>Nom</label>
                          <input type="text" required value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)" }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--color-text-secondary)" }}>Téléphone</label>
                          <input type="text" required value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--color-text-secondary)" }}>Rôle</label>
                          <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)" }}>
                            <option value="customer">Client</option>
                            <option value="admin">Admin</option>
                            <option value="technician">Technicien</option>
                            <option value="driver">Livreur</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--color-text-secondary)" }}>Email (pour la connexion)</label>
                        <input type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)" }} />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--color-text-secondary)" }}>Mot de passe</label>
                        <input type="password" required minLength={6} value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)" }} />
                      </div>
                      
                      <button type="submit" className="tl-btn-primary" disabled={isSubmittingUser} style={{ marginTop: 10, width: "100%" }}>
                        {isSubmittingUser ? "Création en cours..." : "Créer l'utilisateur"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB CONTENT: DRIVERS ───────────────────────────────────────── */}
        {activeTab === "drivers" && (
          <div className="tl-tab-content fade-in">
            {/* Add Driver Form */}
            <div className="tl-admin-toolbar" style={{ alignItems: "flex-end" }}>
              <form onSubmit={handleAddDriver} style={{ display: "flex", gap: 16, flexWrap: "wrap", width: "100%" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Nom complet</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sami Livreur"
                    value={newDriverName}
                    onChange={e => setNewDriverName(e.target.value)}
                    style={{ width: "100%", padding: "10px 16px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Téléphone</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 55 123 456"
                    value={newDriverPhone}
                    onChange={e => setNewDriverPhone(e.target.value)}
                    style={{ width: "100%", padding: "10px 16px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Zone / Région</label>
                  <input
                    type="text"
                    placeholder="Ex: Tunis / Ariana"
                    value={newDriverZone}
                    onChange={e => setNewDriverZone(e.target.value)}
                    style={{ width: "100%", padding: "10px 16px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <button type="submit" className="tl-btn-manage" style={{ height: 40, background: "rgba(0,140,255,0.1)", color: "#00A3FF", borderColor: "rgba(0,140,255,0.3)" }}>
                    <Plus size={16} /> Ajouter un livreur
                  </button>
                </div>
              </form>
            </div>

            <div className="tl-driver-grid">
              {driversStats.map((driver) => (
                <div key={driver.id} className="tl-driver-card">
                  <div className="tl-driver-header">
                    <div className="tl-driver-avatar">
                      <Truck size={24} />
                    </div>
                    <div className="tl-driver-info" style={{ flex: 1 }}>
                      <h3>{driver.name}</h3>
                      <p>{driver.phone} • {driver.zone}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteDriver(driver.id)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}
                      title="Supprimer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  
                  <div className="tl-driver-stats">
                    <div className="tl-driver-stat-box">
                      <div className="tl-driver-stat-label">En Course</div>
                      <div className="tl-driver-stat-value" style={{ color: "#00A3FF" }}>{driver.activeDeliveries}</div>
                    </div>
                    <div className="tl-driver-stat-box">
                      <div className="tl-driver-stat-label">Terminées</div>
                      <div className="tl-driver-stat-value" style={{ color: "#10b981" }}>{driver.completedDeliveries}</div>
                    </div>
                  </div>
                </div>
              ))}
              {driversStats.length === 0 && (
                 <div style={{ color: "var(--color-text-secondary)", gridColumn: "1 / -1", textAlign: "center", padding: 40 }}>
                   Aucun livreur configuré. Ajoutez-en un ci-dessus.
                 </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: SHOP ───────────────────────────────────────── */}
        {activeTab === "shop" && (
          <div className="tl-tab-content fade-in">
            
            <div className="tl-admin-toolbar" style={{ justifyContent: "flex-start", gap: 16 }}>
              <button 
                className={`tl-tab-btn ${shopView === "products" ? "is-active" : ""}`}
                onClick={() => setShopView("products")}
                style={{ padding: "8px 16px", borderRadius: 8 }}
              >
                <Package size={16} /> Produits
              </button>
              <button 
                className={`tl-tab-btn ${shopView === "categories" ? "is-active" : ""}`}
                onClick={() => setShopView("categories")}
                style={{ padding: "8px 16px", borderRadius: 8 }}
              >
                <FileText size={16} /> Catégories
              </button>
            </div>

            {shopView === "categories" && (
              <>
                <div className="tl-admin-toolbar" style={{ alignItems: "flex-end", marginTop: 24 }}>
                  <form onSubmit={handleAddCategory} style={{ display: "flex", gap: 16, flexWrap: "wrap", width: "100%" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Nom de la catégorie</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Chargeurs"
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        style={{ width: "100%", padding: "10px 16px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Nom d'icône (Optionnel)</label>
                      <input
                        type="text"
                        placeholder="Ex: BatteryCharging"
                        value={newCatIcon}
                        onChange={e => setNewCatIcon(e.target.value)}
                        style={{ width: "100%", padding: "10px 16px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                      />
                    </div>
                    <div>
                      <button type="submit" className="tl-btn-manage" style={{ height: 40, background: "rgba(0,140,255,0.1)", color: "#00A3FF", borderColor: "rgba(0,140,255,0.3)" }}>
                        <Plus size={16} /> Ajouter une catégorie
                      </button>
                    </div>
                  </form>
                </div>
                
                <div className="tl-admin-table-card">
                  <table className="tl-admin-table">
                    <thead>
                      <tr>
                        <th>Catégorie</th>
                        <th>Icône</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map(cat => (
                        <tr key={cat.id}>
                          <td style={{ fontWeight: 600 }}>{cat.name}</td>
                          <td style={{ color: "var(--color-text-secondary)" }}>{cat.icon || "—"}</td>
                          <td>
                            <button className="tl-btn-manage" style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }} onClick={() => handleDeleteCategory(cat.id)}>
                              <Trash2 size={14} /> Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr><td colSpan={3} style={{ textAlign: "center", padding: 20, color: "var(--color-text-secondary)" }}>Aucune catégorie.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {shopView === "products" && (
              <>
                <div className="tl-admin-toolbar" style={{ alignItems: "flex-end", marginTop: 24 }}>
                  <form onSubmit={handleAddProduct} style={{ display: "flex", gap: 16, flexWrap: "wrap", width: "100%" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Nom du produit</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Câble iPhone Rapide"
                        value={newProdName}
                        onChange={e => setNewProdName(e.target.value)}
                        style={{ width: "100%", padding: "10px 16px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Prix (DT)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        placeholder="0.00"
                        value={newProdPrice}
                        onChange={e => setNewProdPrice(e.target.value)}
                        style={{ width: "100%", padding: "10px 16px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Stock</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={newProdStock}
                        onChange={e => setNewProdStock(e.target.value)}
                        style={{ width: "100%", padding: "10px 16px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Catégorie</label>
                      <select
                        required
                        value={newProdCat}
                        onChange={e => setNewProdCat(e.target.value)}
                        style={{ width: "100%" }}
                      >
                        <option value="">Sélectionner...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 2, minWidth: 300 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Image URL</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={newProdImg}
                        onChange={e => setNewProdImg(e.target.value)}
                        style={{ width: "100%", padding: "10px 16px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                      />
                    </div>
                    <div>
                      <button type="submit" className="tl-btn-manage" style={{ height: 40, background: "rgba(0,140,255,0.1)", color: "#00A3FF", borderColor: "rgba(0,140,255,0.3)" }}>
                        <Plus size={16} /> Ajouter Produit
                      </button>
                    </div>
                  </form>
                </div>

                <div className="tl-admin-table-card">
                  <table className="tl-admin-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Produit</th>
                        <th>Catégorie</th>
                        <th>Prix</th>
                        <th>Stock</th>
                        <th>Vues</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(prod => {
                        const cat = categories.find(c => c.id === prod.categoryId);
                        return (
                          <tr key={prod.id}>
                            <td>
                              {prod.imageUrl ? (
                                <img src={prod.imageUrl} alt={prod.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
                              ) : (
                                <div style={{ width: 40, height: 40, background: "var(--color-border)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={16} color="var(--color-text-secondary)" /></div>
                              )}
                            </td>
                            <td style={{ fontWeight: 600 }}>{prod.name}</td>
                            <td style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{cat?.name || "—"}</td>
                            <td><strong style={{ color: "#10b981" }}>{prod.price} DT</strong></td>
                            <td>{prod.stock > 0 ? prod.stock : <span style={{ color: "#ef4444" }}>Rupture</span>}</td>
                            <td>{prod.views || 0}</td>
                            <td>
                              <button className="tl-btn-manage" style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }} onClick={() => handleDeleteProduct(prod.id)}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {products.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: "center", padding: 20, color: "var(--color-text-secondary)" }}>Aucun produit.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB CONTENT: OCCASIONS ───────────────────────────────────────── */}
        {activeTab === "occasions" && (
          <div className="tl-tab-content fade-in">
            <div className="tl-admin-toolbar" style={{ justifyContent: "flex-end", marginBottom: 16 }}>
              <div style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                {isArabic ? "مجموع الإعلانات :" : "Total Annonces :"} <strong>{occasions.length}</strong>
              </div>
            </div>

            <div className="tl-admin-table-card">
              <table className="tl-admin-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Détails</th>
                    <th>Vendeur (WhatsApp)</th>
                    <th>Prix</th>
                    <th>Vues</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {occasions.map(occ => (
                    <tr key={occ.id}>
                      <td>
                        {occ.photos && occ.photos.length > 0 ? (
                          <img src={occ.photos[0]} alt={occ.model} style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6 }} />
                        ) : (
                          <div style={{ width: 50, height: 50, background: "var(--color-border)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={20} color="var(--color-text-secondary)" /></div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{occ.model}</div>
                        <div style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{occ.type} • {occ.brand}</div>
                        <div style={{ color: "#00A3FF", fontSize: 12, marginTop: 4 }}>État: {occ.condition}</div>
                      </td>
                      <td>
                        <a href={`https://wa.me/${occ.whatsappNumber.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" style={{ color: "#25d366" }}>
                          {occ.whatsappNumber}
                        </a>
                      </td>
                      <td><strong style={{ color: "#10b981" }}>{occ.price} DT</strong></td>
                      <td>{occ.views || 0}</td>
                      <td>
                        <select 
                          value={occ.status} 
                          onChange={(e) => occasionStore.updateOccasionStatus(occ.id, e.target.value as any)}
                          style={{ padding: "4px 8px", fontSize: 12, borderRadius: 4, background: "var(--color-bg)", border: "1px solid var(--color-border)", color: occ.status === "active" ? "#10b981" : "var(--color-text-secondary)" }}
                        >
                          <option value="active">Active</option>
                          <option value="pending">En attente</option>
                          <option value="sold">Vendue</option>
                          <option value="rejected">Rejetée</option>
                        </select>
                      </td>
                      <td>
                        <button 
                          className="tl-btn-manage" 
                          style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)", padding: "6px 8px" }} 
                          onClick={() => {
                            if(confirm("Supprimer cette annonce définitivement ?")) occasionStore.deleteOccasion(occ.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {occasions.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 20, color: "var(--color-text-secondary)" }}>Aucune annonce d'occasion.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MODAL (Only for repairs tab) ───────────────────────────────── */}
        {selectedReq && activeTab === "repairs" && (
          <div className="tl-modal-overlay" onClick={() => setSelectedReq(null)}>
            <div className="tl-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="tl-modal-header">
                <div>
                  <h2>
                    {selectedReq.trackingNumber} — {selectedReq.brand} {selectedReq.model}
                  </h2>
                  <div style={{ marginTop: 6 }}>
                    <StatusBadge status={selectedReq.status} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="tl-modal-close" onClick={() => handleDeleteRequest(selectedReq.id)} title="Supprimer" style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}>
                    <Trash2 size={16} />
                  </button>
                  <button type="button" className="tl-modal-close" onClick={() => setSelectedReq(null)}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Client & Address Info */}
              <div className="tl-modal-section">
                <h4><User size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Informations Client</h4>
                <div className="tl-modal-grid">
                  <div>
                    <strong>Nom :</strong> {selectedReq.customer.firstName} {selectedReq.customer.lastName}
                  </div>
                  <div>
                    <strong>Téléphone :</strong>{" "}
                    <a href={`tel:${selectedReq.customer.phone}`} style={{ color: "#00A3FF" }}>
                      {selectedReq.customer.phone}
                    </a>{" "}
                    <a
                      href={`https://wa.me/${selectedReq.customer.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#25d366", fontWeight: 600, marginLeft: 8, fontSize: 12 }}
                    >
                      WhatsApp
                    </a>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <strong>Adresse :</strong> {selectedReq.address.address}, {selectedReq.address.city}, {selectedReq.address.governorate}
                    {selectedReq.address.complement && ` (${selectedReq.address.complement})`}
                  </div>
                </div>
              </div>

              {/* Pricing & 30/70 Section */}
              <div className="tl-modal-section">
                <h4><DollarSign size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Devis & Prix</h4>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ fontWeight: 600, color: "var(--color-text)" }}>Prix Total (DT) :</label>
                  <input
                    type="number"
                    style={{ width: 120 }}
                    value={editingPrice}
                    onChange={(e) => setEditingPrice(e.target.value)}
                    placeholder="0"
                  />
                  <button className="tl-btn-manage" onClick={handleSavePrice}>
                    Enregistrer
                  </button>

                  {selectedReq.price && (
                    <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                      <button className="tl-btn-manage" onClick={() => handlePrint("devis")} style={{ borderColor: "rgba(167, 176, 184, 0.4)" }}>
                        <Printer size={14} /> Devis
                      </button>
                      <button className="tl-btn-manage" onClick={() => handlePrint("facture")} style={{ borderColor: "rgba(167, 176, 184, 0.4)" }}>
                        <Printer size={14} /> Facture
                      </button>
                    </div>
                  )}
                </div>

                {selectedReq.price && (
                  <div style={{ marginTop: 16, display: "flex", gap: 24, fontSize: "14px", flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ color: "var(--color-text)" }}>Acompte 30% :</strong> {selectedReq.depositAmount} DT{" "}
                      {["deposit_paid", "fully_paid"].includes(selectedReq.paymentStatus) ? (
                        <span className="tl-badge-paid">Encaissé ✓</span>
                      ) : (
                        <button className="tl-btn-manage" style={{ marginLeft: 8, display: "inline-flex" }} onClick={() => handlePayment("deposit")}>
                          Valider 30%
                        </button>
                      )}
                    </div>
                    <div>
                      <strong style={{ color: "var(--color-text)" }}>Solde 70% :</strong> {selectedReq.remainingAmount} DT{" "}
                      {selectedReq.paymentStatus === "fully_paid" ? (
                        <span className="tl-badge-paid">Encaissé ✓</span>
                      ) : (
                        <button className="tl-btn-manage" style={{ marginLeft: 8, display: "inline-flex" }} onClick={() => handlePayment("full")}>
                          Valider 70%
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Assignments & WhatsApp */}
              <div className="tl-modal-section">
                <h4><Truck size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Assignations & Communication</h4>
                <div className="tl-modal-grid">
                  <div style={{ gridColumn: "span 2", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
                    
                    {/* Select Driver */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "var(--color-text)", fontSize: 13 }}>Livreur :</label>
                      <select
                        value={selectedReq.driverId || ""}
                        onChange={(e) => handleAssignDriver(e.target.value)}
                        style={{ width: "100%" }}
                      >
                        <option value="">-- Non assigné --</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.zone})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* WhatsApp Action Buttons for the assigned driver */}
                    {(selectedReq.driverId || selectedReq.driverName) && selectedReq.price && (
                      <div style={{ flex: 2, display: "flex", gap: 10, flexDirection: "column" }}>
                        <label style={{ display: "block", marginBottom: 0, fontWeight: 600, color: "var(--color-text)", fontSize: 13 }}>Ordres de mission (WhatsApp) :</label>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <a 
                            href={generateDriverWhatsAppLink("pickup")} 
                            target="_blank" 
                            rel="noreferrer"
                            className="tl-btn-manage"
                            style={{ color: "#25d366", borderColor: "rgba(37,211,102,0.3)" }}
                          >
                            <MessageCircle size={14} /> Envoyer Collecte (30%)
                          </a>
                          <a 
                            href={generateDriverWhatsAppLink("delivery")} 
                            target="_blank" 
                            rel="noreferrer"
                            className="tl-btn-manage"
                            style={{ color: "#25d366", borderColor: "rgba(37,211,102,0.3)" }}
                          >
                            <MessageCircle size={14} /> Envoyer Livraison (70%)
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ gridColumn: "span 2", marginTop: 8 }}>
                    <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "var(--color-text)", fontSize: 13 }}>Technicien :</label>
                    <select
                      value={selectedReq.technicianName || ""}
                      onChange={(e) => handleAssignTech(e.target.value)}
                      style={{ width: "100%", maxWidth: 350 }}
                    >
                      <option value="">-- Non assigné --</option>
                      {TECH_OPTIONS.map((techOpt) => (
                        <option key={techOpt} value={techOpt}>
                          {techOpt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Status Transition Section */}
              <div className="tl-modal-section">
                <h4><Clock size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Statut du Workflow</h4>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                  <select
                    value={selectedReq.status}
                    onChange={(e) => handleChangeStatus(e.target.value as RepairStatusKey)}
                    style={{ flex: 1, minWidth: 200 }}
                  >
                    {REPAIR_STATUSES.map((k) => (
                      <option key={k} value={k}>
                        {t(`status.${k}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="Note pour l'historique..."
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="tl-btn-manage" onClick={() => handleChangeStatus(selectedReq.status)}>
                    <FileText size={14} /> Ajouter
                  </button>
                </div>
              </div>

              {/* History Log */}
              <div className="tl-modal-section">
                <h4><Clock size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Historique</h4>
                <div style={{ maxHeight: 180, overflowY: "auto" }}>
                  {selectedReq.statusHistory.map((h, i) => (
                    <div key={i} className="tl-history-entry">
                      <strong>
                        {new Date(h.timestamp).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>{" "}
                      — <span className="tl-history-status">{t(`status.${h.status}`)}</span>
                      {h.note && ` : ${h.note}`}
                      <span style={{ color: "#4a5a6a" }}> ({h.changedBy})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ADD REQUEST MODAL ───────────────────────────────────────── */}
        {isAddingRequest && (
          <div className="tl-modal-overlay" onClick={() => setIsAddingRequest(false)}>
            <div className="tl-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900, padding: 0, overflow: "hidden" }}>
              <div className="tl-modal-header" style={{ padding: "20px 32px 0", borderBottom: "none" }}>
                <h2 style={{ margin: 0 }}>{isArabic ? "إضافة طلب جديد" : "Nouvelle Demande"}</h2>
                <button type="button" className="tl-modal-close" onClick={() => setIsAddingRequest(false)}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ maxHeight: "calc(90vh - 80px)", overflowY: "auto" }}>
                <RepairRequestForm />
              </div>
            </div>
          </div>
        )}

        {/* ── PRINT TEMPLATE (Hidden by default, shown via CSS @media print) ── */}
        {printType && selectedReq && (
          <div className="tl-print-container">
            <div className="tl-print-header">
              <h1>TELE LAB</h1>
              <p>by Telephonic Pro</p>
              <br />
              <p>Adresse: Tunis, Tunisie</p>
              <p>Tél: +216 55 123 456</p>
            </div>
            
            <div className="tl-print-title">
              <h2>{printType === "devis" ? "DEVIS ESTIMATIF" : "FACTURE"}</h2>
              <p>Référence : <strong>{selectedReq.trackingNumber}</strong></p>
              <p>Date : {new Date().toLocaleDateString("fr-FR")}</p>
            </div>

            <div className="tl-print-client">
              <h3>Client</h3>
              <p><strong>Nom:</strong> {selectedReq.customer.firstName} {selectedReq.customer.lastName}</p>
              <p><strong>Téléphone:</strong> {selectedReq.customer.phone}</p>
              <p><strong>Adresse:</strong> {selectedReq.address.address}, {selectedReq.address.city}</p>
            </div>

            <table className="tl-print-table">
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th>Appareil</th>
                  <th>Problème déclaré</th>
                  <th>Prix TTC</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Réparation {selectedReq.repairType === "hardware" ? "Matérielle" : "Logicielle"}</td>
                  <td>{selectedReq.brand} {selectedReq.model}</td>
                  <td>{selectedReq.problem}</td>
                  <td>{selectedReq.price} DT</td>
                </tr>
              </tbody>
            </table>

            <div className="tl-print-totals">
              <p><strong>Total TTC :</strong> {selectedReq.price} DT</p>
              {printType === "devis" && (
                <>
                  <p>Acompte 30% requis : {selectedReq.depositAmount} DT</p>
                  <p>Solde 70% à la livraison : {selectedReq.remainingAmount} DT</p>
                </>
              )}
              {printType === "facture" && (
                <p>Status de paiement : <strong>{selectedReq.paymentStatus === "fully_paid" ? "Payé en totalité" : "En attente"}</strong></p>
              )}
            </div>

            <div className="tl-print-footer">
              <p>Merci de votre confiance.</p>
              <p>Tele Lab garantit ses réparations pendant 3 mois.</p>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
