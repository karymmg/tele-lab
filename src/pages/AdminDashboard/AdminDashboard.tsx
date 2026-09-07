import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRepairRequests, useDrivers, repairStore } from "@/services/store";
import { RepairRequest } from "@/types/telelab";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RepairStatusKey, REPAIR_STATUSES } from "@/utils/status";
import { useAuth, hasAccount } from "@/services/auth";
import { Settings, Search, X, Clock, User, Phone, DollarSign, Truck, FileText, Users, Wrench, MessageCircle, Plus } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import "./AdminDashboard.css";

const TECH_OPTIONS = [
  "Fares Khemir (Spécialiste Apple / Micro-soudure)",
  "Ahmed Chaabane (Spécialiste Android / Écrans)",
  "Bilel Mansouri (Spécialiste Logiciel & Déblocage)",
];

type TabType = "repairs" | "clients" | "drivers";

export function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const requests = useRepairRequests();
  const drivers = useDrivers();
  const isArabic = i18n.language === "ar";

  const [activeTab, setActiveTab] = useState<TabType>("repairs");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedReq, setSelectedReq] = useState<RepairRequest | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>("");
  const [customNote, setCustomNote] = useState<string>("");

  // New driver form state
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [newDriverZone, setNewDriverZone] = useState("");

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

  // --- MODAL HANDLERS ---
  function handleOpenModal(req: RepairRequest) {
    setSelectedReq(req);
    setEditingPrice(req.price ? String(req.price) : "");
    setCustomNote("");
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
              className={`tl-tab-btn ${activeTab === "repairs" ? "is-active" : ""}`}
              onClick={() => { setActiveTab("repairs"); setSearch(""); }}
            >
              <Wrench size={16} /> {isArabic ? "الطلبات" : "Réparations"}
            </button>
            <button 
              className={`tl-tab-btn ${activeTab === "clients" ? "is-active" : ""}`}
              onClick={() => { setActiveTab("clients"); setSearch(""); }}
            >
              <Users size={16} /> {isArabic ? "العملاء" : "Clients"}
            </button>
            <button 
              className={`tl-tab-btn ${activeTab === "drivers" ? "is-active" : ""}`}
              onClick={() => { setActiveTab("drivers"); setSearch(""); }}
            >
              <Truck size={16} /> {isArabic ? "الموصلين" : "Livreurs"}
            </button>
          </div>
        </div>

        {/* ── TAB CONTENT: REPAIRS ───────────────────────────────────────── */}
        {activeTab === "repairs" && (
          <div className="tl-tab-content fade-in">
            <div className="tl-charts-grid">
              
              <div className="tl-kpi-card tl-chart-card">
                <h4 style={{ color: "#F5F7FA", fontSize: 16, marginBottom: 20 }}>
                  {isArabic ? "توزيع الطلبات" : "Répartition des Demandes"}
                </h4>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#F5F7FA" }}
                        itemStyle={{ color: "#F5F7FA" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 10 }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#A7B0B8" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }}></span>
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </div>

              <div className="tl-kpi-card tl-chart-card">
                <h4 style={{ color: "#F5F7FA", fontSize: 16, marginBottom: 20 }}>
                  {isArabic ? "الإيرادات المالية" : "Bilan Financier (DT)"}
                </h4>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#123044" vertical={false} />
                      <XAxis dataKey="name" stroke="#A7B0B8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#A7B0B8" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        cursor={{ fill: "rgba(0,140,255,0.05)" }}
                        contentStyle={{ background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#F5F7FA" }}
                      />
                      <Bar dataKey="montant" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {barData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            <div className="tl-admin-toolbar">
              <div className="tl-admin-search">
                <Search size={18} color="#A7B0B8" style={{ alignSelf: "center", position: "absolute", marginLeft: 12 }} />
                <input
                  type="text"
                  placeholder={isArabic ? "بحث برقم التتبع، العميل، الهاتف، الجهاز..." : "Rechercher (réf, nom, tél, modèle)..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 40 }}
                />
              </div>

              <div className="tl-admin-filter">
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
                        <td className="tl-td-tracking">{req.trackingNumber}</td>
                        <td style={{ fontSize: "12px", color: "#A7B0B8" }}>
                          {new Date(req.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </td>
                        <td>
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
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {req.brand} {req.model}
                          </div>
                          <div style={{ fontSize: "12px", color: "#A7B0B8" }}>{req.problem}</div>
                        </td>
                        <td>
                          <StatusBadge status={req.status} />
                        </td>
                        <td>
                          {req.price ? (
                            <div>
                              <strong style={{ color: "#00A3FF" }}>{req.price} DT</strong>
                              <div style={{ fontSize: "11px", color: "#A7B0B8" }}>
                                {req.depositAmount} / {req.remainingAmount}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "#f59e0b", fontSize: "12px", fontWeight: 600 }}>
                              Non fixé
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: "12px", color: "#A7B0B8" }}>
                          {req.driverName ? <div>🚚 {req.driverName.split(" (")[0]}</div> : null}
                          {req.technicianName ? <div>🔧 {req.technicianName.split(" (")[0]}</div> : null}
                          {!req.driverName && !req.technicianName && <span>—</span>}
                        </td>
                        <td>
                          <button className="tl-btn-manage" onClick={() => handleOpenModal(req)}>
                            <Settings size={14} /> Gérer
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#A7B0B8" }}>
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

        {/* ── TAB CONTENT: CLIENTS ───────────────────────────────────────── */}
        {activeTab === "clients" && (
          <div className="tl-tab-content fade-in">
            <div className="tl-admin-toolbar">
              <div className="tl-admin-search">
                <Search size={18} color="#A7B0B8" style={{ alignSelf: "center", position: "absolute", marginLeft: 12 }} />
                <input
                  type="text"
                  placeholder={isArabic ? "بحث بالاسم أو رقم الهاتف..." : "Rechercher un client (nom, tél)..."}
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
                      <th>Client</th>
                      <th>Téléphone</th>
                      <th>Email</th>
                      <th>Réparations</th>
                      <th>Total Dépensé</th>
                      <th>Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsList.map((client, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="tl-td-client">
                            {client.firstName} {client.lastName}
                          </div>
                          {hasAccount(client.phone.replace(/[\s\-\+]/g, "")) ? (
                            <span style={{ fontSize: "10px", color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 6px", borderRadius: 4 }}>A un compte</span>
                          ) : (
                            <span style={{ fontSize: "10px", color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 4 }}>Pas de compte</span>
                          )}
                        </td>
                        <td className="tl-td-client-phone">
                          <a href={`tel:${client.phone}`}>{client.phone}</a>
                        </td>
                        <td style={{ color: "#A7B0B8", fontSize: "13px" }}>
                          {client.email || "—"}
                        </td>
                        <td>
                          <span style={{ background: "rgba(0,140,255,0.1)", color: "#00A3FF", padding: "4px 8px", borderRadius: 4, fontWeight: 700, fontSize: 13 }}>
                            {client.repairCount} dossier(s)
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: "#10b981" }}>{client.spent} DT</strong>
                        </td>
                        <td>
                          <a
                            href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="tl-btn-manage"
                            style={{ display: "inline-flex", color: "#25d366", borderColor: "rgba(37, 211, 102, 0.3)" }}
                          >
                            <MessageCircle size={14} /> WhatsApp
                          </a>
                        </td>
                      </tr>
                    ))}
                    {clientsList.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#A7B0B8" }}>
                          Aucun client trouvé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: DRIVERS ───────────────────────────────────────── */}
        {activeTab === "drivers" && (
          <div className="tl-tab-content fade-in">
            {/* Add Driver Form */}
            <div className="tl-admin-toolbar" style={{ alignItems: "flex-end" }}>
              <form onSubmit={handleAddDriver} style={{ display: "flex", gap: 16, flexWrap: "wrap", width: "100%" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#A7B0B8", marginBottom: 6 }}>Nom complet</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sami Livreur"
                    value={newDriverName}
                    onChange={e => setNewDriverName(e.target.value)}
                    style={{ width: "100%", padding: "10px 16px", background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#FFF" }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#A7B0B8", marginBottom: 6 }}>Téléphone</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 55 123 456"
                    value={newDriverPhone}
                    onChange={e => setNewDriverPhone(e.target.value)}
                    style={{ width: "100%", padding: "10px 16px", background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#FFF" }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#A7B0B8", marginBottom: 6 }}>Zone / Région</label>
                  <input
                    type="text"
                    placeholder="Ex: Tunis / Ariana"
                    value={newDriverZone}
                    onChange={e => setNewDriverZone(e.target.value)}
                    style={{ width: "100%", padding: "10px 16px", background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#FFF" }}
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
                 <div style={{ color: "#A7B0B8", gridColumn: "1 / -1", textAlign: "center", padding: 40 }}>
                   Aucun livreur configuré. Ajoutez-en un ci-dessus.
                 </div>
              )}
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
                <button type="button" className="tl-modal-close" onClick={() => setSelectedReq(null)}>
                  <X size={18} />
                </button>
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
                  <label style={{ fontWeight: 600, color: "#F5F7FA" }}>Prix Total (DT) :</label>
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
                </div>

                {selectedReq.price && (
                  <div style={{ marginTop: 16, display: "flex", gap: 24, fontSize: "14px", flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ color: "#F5F7FA" }}>Acompte 30% :</strong> {selectedReq.depositAmount} DT{" "}
                      {["deposit_paid", "fully_paid"].includes(selectedReq.paymentStatus) ? (
                        <span className="tl-badge-paid">Encaissé ✓</span>
                      ) : (
                        <button className="tl-btn-manage" style={{ marginLeft: 8, display: "inline-flex" }} onClick={() => handlePayment("deposit")}>
                          Valider 30%
                        </button>
                      )}
                    </div>
                    <div>
                      <strong style={{ color: "#F5F7FA" }}>Solde 70% :</strong> {selectedReq.remainingAmount} DT{" "}
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
                      <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#F5F7FA", fontSize: 13 }}>Livreur :</label>
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
                        <label style={{ display: "block", marginBottom: 0, fontWeight: 600, color: "#F5F7FA", fontSize: 13 }}>Ordres de mission (WhatsApp) :</label>
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
                    <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#F5F7FA", fontSize: 13 }}>Technicien :</label>
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

      </div>
    </main>
  );
}
