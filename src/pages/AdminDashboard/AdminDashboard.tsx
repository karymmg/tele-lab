import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRepairRequests, useDrivers, repairStore } from "@/services/store";
import { RepairRequest } from "@/types/telelab";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RepairStatusKey, REPAIR_STATUSES } from "@/utils/status";
import { useAuth } from "@/services/auth";
import { Settings, Search, X, Clock, User, Phone, DollarSign, Truck, FileText, Users, Wrench, MessageCircle, Plus, Trash2, Printer, Store, Package, ShoppingBag, BarChart3, Shield, Eye, Pencil, Save } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { RepairRequestForm } from "@/components/forms/RepairRequestForm";
import { useShopCategories, useShopProducts, useShopBrands, useShopModels, shopStore } from "@/services/shopStore";
import { ShopProduct } from "@/types/shop";
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

type CsvImportStatus = { phase: "idle" | "importing" | "complete" | "error"; total: number; processed: number; added: number; errors: string[]; message?: string };
type AdminSearchResult = { id: string; kind: string; title: string; subtitle: string; tab: TabType };

function detectCsvDelimiter(text: string): string {
  const source = text.replace(/^\uFEFF/, "");
  let commas = 0;
  let semicolons = 0;
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && (char === "\n" || char === "\r")) {
      break;
    } else if (!quoted && char === ",") {
      commas += 1;
    } else if (!quoted && char === ";") {
      semicolons += 1;
    }
  }
  return commas > semicolons ? "," : ";";
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const delimiter = detectCsvDelimiter(text);
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(field.trim()); field = "";
    } else if (char === "\n" && !quoted) {
      row.push(field.replace(/\r$/, "").trim()); field = "";
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
    } else if (char !== "\r" || quoted) {
      field += char;
    }
  }
  if (quoted) throw new Error("Le fichier CSV contient un champ entre guillemets non terminé.");
  row.push(field.replace(/\r$/, "").trim());
  if (row.some(value => value !== "")) rows.push(row);
  return rows;
}
function normalizeCsvHeader(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeCsvValue(value: string): string {
  return normalizeCsvHeader(value).replace(/[^a-z0-9]/g, "");
}

function isAdminTab(value: string | null): value is TabType {
  return ["stats", "repairs", "orders", "users", "drivers", "shop", "occasions"].includes(value || "");
}

export function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const requests = useRepairRequests();
  const drivers = useDrivers();
  const isArabic = i18n.language === "ar";
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const urlTab = searchParams.get("tab");
  const initialTab: TabType = isAdminTab(urlTab) ? urlTab : "stats";

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the active tab into view on mobile
  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const activeBtn = container.querySelector(".tl-tab-btn.is-active") as HTMLElement | null;
    if (!activeBtn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const scrollLeft = activeBtn.offsetLeft - containerRect.width / 2 + btnRect.width / 2;
    container.scrollTo({ left: scrollLeft, behavior: "smooth" });
  }, [activeTab]);
  const [search, setSearch] = useState(urlQuery);
  const [adminSearch, setAdminSearch] = useState(urlQuery);
  const [adminSearchOpen, setAdminSearchOpen] = useState(false);
  const [csvImportStatus, setCsvImportStatus] = useState<CsvImportStatus>({ phase: "idle", total: 0, processed: 0, added: 0, errors: [] });
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [productEditForm, setProductEditForm] = useState({ name: "", sku: "", categoryId: "", brandId: "", modelId: "", price: "", costPrice: "", stock: "", description: "", imageUrl: "", active: true });
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedReq, setSelectedReq] = useState<RepairRequest | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>("");
  const [customNote, setCustomNote] = useState<string>("");
  const [isAddingRequest, setIsAddingRequest] = useState(false);
  const [printType, setPrintType] = useState<"devis" | "facture" | null>(null);
  
  // Shop Print State
  const [shopPrintType, setShopPrintType] = useState<"bon" | "facture" | null>(null);
  const [shopPrintOrder, setShopPrintOrder] = useState<any | null>(null);

  // New driver form state
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [newDriverZone, setNewDriverZone] = useState("");

  // --- SHOP STATE ---
  const categories = useShopCategories();
  const products = useShopProducts();
  const brands = useShopBrands();
  const models = useShopModels();
  const occasions = useOccasions();
  const siteVisits = useSiteVisits();
  const shopOrders = useShopOrders();
  const [shopView, setShopView] = useState<"products" | "categories" | "stock">("products");
  useEffect(() => {
    setSearch(urlQuery);
    setAdminSearch(urlQuery);
    setAdminSearchOpen(Boolean(urlQuery));
    if (isAdminTab(urlTab)) {
      setActiveTab(urlTab);
      if (urlTab === "shop") setShopView("products");
    }
  }, [urlQuery, urlTab]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [profileUsers, setProfileUsers] = useState<ProfileUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "customer" });

  React.useEffect(() => {
    let active = true;
    async function fetchUsers() {
      if (!active) return;
      setUsersLoading(true);
      const { data, count, error } = await supabase.from("profiles").select("*", { count: "exact" });
      if (!active) return;
      if (error) {
        console.error("Failed to refresh admin users:", error);
        setUsersLoading(false);
        return;
      }
      if (count !== null) setTotalUsers(count);
      if (data) setProfileUsers(data as ProfileUser[]);
      setUsersLoading(false);
    }

    void fetchUsers();
    const profilesChannel = supabase
      .channel("admin:profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void fetchUsers();
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(profilesChannel);
    };
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
      const createdUser = data.user;
      if (createdUser) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: createdUser.id,
          first_name: newUser.firstName,
          last_name: newUser.lastName,
          phone: newUser.phone,
          email: newUser.email,
          auth_email: newUser.email,
          role: newUser.role,
        });
        if (profileError) throw profileError;
        
        setProfileUsers(prev => [{
          id: createdUser.id,
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
  const [newProdCostPrice, setNewProdCostPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("");
  const [newProdCat, setNewProdCat] = useState("");
  const [newProdBrand, setNewProdBrand] = useState("");
  const [newProdModel, setNewProdModel] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdImgType, setNewProdImgType] = useState<"url" | "file">("url");
  const [newProdImgUrl, setNewProdImgUrl] = useState("");
  const [newProdImgFile, setNewProdImgFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  // --- FINANCIAL STATS ---
  let shopRevenue = 0;
  let shopCost = 0;
  let driverCountShop = 0;

  shopOrders.filter(o => o.status === "delivered").forEach(order => {
    shopRevenue += order.totalAmount;
    if (order.driverId) driverCountShop++;
    order.items.forEach(item => {
      const p = products.find(prod => prod.id === item.id);
      if (p && p.costPrice) {
        shopCost += (p.costPrice * item.quantity);
      }
    });
  });

  const shopBenefice = shopRevenue - shopCost;
  const totalBenefice = shopBenefice + totalRevenue;
  const driverCost = (completedCount * 7) + (driverCountShop * 7); // Assuming 7 DT per delivery

  const pieData = [
    { name: isArabic ? "جديدة" : "Nouvelles", value: newCount, color: "#f59e0b" },
    { name: isArabic ? "في الإصلاح" : "En Réparation", value: inRepairCount, color: "var(--color-primary-dark)" },
    { name: isArabic ? "في التوصيل" : "En Livraison", value: inDeliveryCount, color: "var(--color-purple)" },
    { name: isArabic ? "مكتملة" : "Terminées", value: completedCount, color: "var(--color-success)" }
  ].filter(d => d.value > 0);

  const barData = [
    { name: "CA Total", montant: totalRevenue + shopRevenue, fill: "var(--color-primary-dark)" },
    { name: "Marge", montant: totalBenefice, fill: "var(--color-success)" },
    { name: "Coût Achat", montant: shopCost, fill: "#f59e0b" },
    { name: "Frais Livreur", montant: driverCost, fill: "var(--color-error)" },
  ];

  const matchesAdminSearch = (query: string, values: unknown[], phoneValues: unknown[] = []) => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return true;
    const textMatch = values.some(value => String(value ?? "").toLocaleLowerCase().includes(normalized));
    const digits = normalized.replace(/\D/g, "");
    const phoneMatch = digits.length >= 4 && phoneValues.some(value => String(value ?? "").replace(/\D/g, "").includes(digits));
    return textMatch || phoneMatch;
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = matchesAdminSearch(search, [req.trackingNumber, req.customer.firstName, req.customer.lastName, req.brand, req.model, req.status], [req.customer.phone]);
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
  const clientsList = Array.from(uniqueClientsMap.values()).filter(c => matchesAdminSearch(search, [c.firstName, c.lastName], [c.phone]));

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

  const filteredProducts = products.filter(product => {
    const category = categories.find(item => item.id === product.categoryId);
    const model = models.find(item => item.id === product.modelId);
    const brand = brands.find(item => item.id === product.brandId) || brands.find(item => item.id === model?.brand_id);
    return matchesAdminSearch(search, [product.name, product.sku, product.description, category?.name, brand?.name, model?.name]);
  });
  const filteredDrivers = driversStats.filter(driver => matchesAdminSearch(search, [driver.name, driver.zone], [driver.phone]));
  const filteredOccasions = occasions.filter(item => matchesAdminSearch(search, [item.brand, item.model, item.type, item.description, item.sellerName, item.status]));

  const adminQuery = adminSearch.trim();
  const adminSearchResults: AdminSearchResult[] = adminQuery.length < 2 ? [] : [
    ...requests.filter(item => matchesAdminSearch(adminQuery, [item.trackingNumber, item.customer.firstName, item.customer.lastName, item.brand, item.model, item.status], [item.customer.phone])).slice(0, 4).map(item => ({ id: item.id, kind: isArabic ? "إصلاح" : "Réparation", title: item.trackingNumber, subtitle: item.customer.firstName + " " + item.customer.lastName + " · " + item.customer.phone + " · " + item.brand + " " + item.model, tab: "repairs" as TabType })),
    ...shopOrders.filter(item => matchesAdminSearch(adminQuery, [item.orderNumber, item.customerName, item.customerAddress, item.customerCity, item.customerGovernorate, item.status, ...item.items.map(product => product.name)], [item.customerPhone])).slice(0, 4).map(item => ({ id: item.id, kind: isArabic ? "طلب" : "Commande", title: item.orderNumber, subtitle: item.customerName + " · " + item.customerPhone, tab: "orders" as TabType })),
    ...profileUsers.filter(item => matchesAdminSearch(adminQuery, [item.first_name, item.last_name, item.email, item.auth_email, item.role], [item.phone])).slice(0, 4).map(item => ({ id: item.id, kind: isArabic ? "مستخدم" : "Utilisateur", title: item.first_name + " " + item.last_name, subtitle: item.phone + " · " + (item.auth_email || item.email || item.role), tab: "users" as TabType })),
    ...products.filter(item => {
      const model = models.find(candidate => candidate.id === item.modelId);
      const brand = brands.find(candidate => candidate.id === item.brandId) || brands.find(candidate => candidate.id === model?.brand_id);
      const category = categories.find(candidate => candidate.id === item.categoryId);
      return matchesAdminSearch(adminQuery, [item.name, item.sku, item.description, brand?.name, model?.name, category?.name]);
    }).slice(0, 4).map(item => ({ id: item.id, kind: isArabic ? "منتج" : "Produit", title: item.name, subtitle: (item.sku || "—") + " · " + item.price.toFixed(2) + " DT · stock " + item.stock, tab: "shop" as TabType })),
    ...driversStats.filter(item => matchesAdminSearch(adminQuery, [item.name, item.zone], [item.phone])).slice(0, 3).map(item => ({ id: item.id, kind: isArabic ? "موصل" : "Livreur", title: item.name, subtitle: item.phone + " · " + item.zone, tab: "drivers" as TabType })),
    ...occasions.filter(item => matchesAdminSearch(adminQuery, [item.brand, item.model, item.type, item.description, item.sellerName, item.status])).slice(0, 3).map(item => ({ id: item.id, kind: isArabic ? "إعلان" : "Occasion", title: item.brand + " " + item.model, subtitle: item.type + " · " + item.price.toFixed(2) + " DT · " + (item.sellerName || "Vendeur"), tab: "occasions" as TabType })),
  ].slice(0, 10);

  function openAdminSearchResult(result: AdminSearchResult) {
    setActiveTab(result.tab);
    setSearch(adminQuery);
    if (result.tab === "shop") setShopView("products");
    setAdminSearchOpen(false);
  }

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
    
    setIsUploading(true);
    let finalImageUrl = newProdImgUrl;
    
    try {
      if (newProdImgType === "file" && newProdImgFile) {
        finalImageUrl = await shopStore.uploadProductImage(newProdImgFile);
      }

      await shopStore.addProduct({
        categoryId: newProdCat,
        brandId: newProdBrand || undefined,
        modelId: newProdModel || undefined,
        sku: newProdSku || undefined,
        name: newProdName,
        description: newProdDesc,
        price: parseFloat(newProdPrice),
        costPrice: parseFloat(newProdCostPrice) || 0,
        stock: parseInt(newProdStock) || 0,
        imageUrl: finalImageUrl,
        active: true
      });
      
      setNewProdName("");
      setNewProdDesc("");
      setNewProdPrice("");
      setNewProdCostPrice("");
      setNewProdStock("");
      setNewProdImgUrl("");
      setNewProdImgFile(null);
      setNewProdSku("");
    } catch (err: any) {
      alert("Erreur lors de l'ajout du produit: " + err.message);
    } finally {
      setIsUploading(false);
    }
  }

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setCsvImportStatus({ phase: "importing", total: 0, processed: 0, added: 0, errors: [], message: isArabic ? "جاري قراءة الملف..." : "Lecture du fichier CSV..." });
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error(isArabic ? "الملف فارغ أو ناقص." : "Le fichier CSV est vide ou incomplet.");

      const headers = rows[0].map(normalizeCsvHeader);
      const findColumn = (...aliases: string[]) => headers.findIndex(header => aliases.includes(header));
      const columns = {
        name: findColumn("nom", "name"),
        sku: findColumn("sku", "reference"),
        price: findColumn("prixvente", "prix", "price", "saleprice"),
        costPrice: findColumn("prixachat", "costprice", "purchaseprice"),
        stock: findColumn("stock", "quantite", "quantity"),
        categoryId: findColumn("idcategorie", "categoryid", "categorie"),
        brandId: findColumn("idmarque", "brandid", "marque", "brand"),
        modelId: findColumn("idmodele", "modelid", "modele", "model"),
        description: findColumn("description"),
        imageUrl: findColumn("urlimage", "imageurl", "image"),
      };
      if (columns.name < 0 || columns.price < 0 || columns.categoryId < 0) {
        throw new Error(isArabic ? "تأكد من الأعمدة: Nom وPrix أو Prix_Vente وID_Categorie." : "Colonnes requises manquantes : Nom, Prix (ou Prix_Vente) et ID_Categorie.");
      }

      let categoryOptions = shopStore.getCategories();
      if (!categoryOptions.length) {
        await shopStore.refreshData();
        categoryOptions = shopStore.getCategories();
      }
      const dataRows = rows.slice(1);
      const errors: string[] = [];
      let added = 0;
      setCsvImportStatus({ phase: "importing", total: dataRows.length, processed: 0, added: 0, errors: [] });
      const readValue = (row: string[], index: number) => index >= 0 ? (row[index] || "").trim() : "";
      const parseAmount = (value: string) => Number(value.replace(/\s/g, "").replace(",", "."));

      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex += 1) {
        const row = dataRows[rowIndex];
        const productName = readValue(row, columns.name);
        const sku = readValue(row, columns.sku);
        const priceText = readValue(row, columns.price);
        const costText = readValue(row, columns.costPrice);
        const stockText = readValue(row, columns.stock);
        const categoryValue = readValue(row, columns.categoryId);
        const normalizedCategory = normalizeCsvValue(categoryValue);
        const categoryMatch = categoryOptions.find(category =>
          category.id.toLocaleLowerCase() === categoryValue.toLocaleLowerCase() ||
          normalizeCsvValue(category.name) === normalizedCategory ||
          normalizeCsvValue(category.slug || "") === normalizedCategory
        );
        const categoryId = categoryMatch?.id || categoryValue;
        const brandId = readValue(row, columns.brandId);
        const modelId = readValue(row, columns.modelId);
        const description = readValue(row, columns.description);
        const imageUrl = readValue(row, columns.imageUrl);
        const price = parseAmount(priceText);
        const costPrice = costText ? parseAmount(costText) : 0;
        const stock = stockText ? Number(stockText.replace(",", ".")) : 0;
        let rowError = "";

        if (row.length < 9) rowError = "colonnes manquantes";
        else if (!productName || !categoryValue || !priceText) rowError = "nom, prix ou catégorie manquant";
        else if (!categoryMatch && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryValue)) rowError = "catégorie introuvable : " + categoryValue;
        else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId)) rowError = "ID_Categorie invalide";
        else if (!Number.isFinite(price) || price <= 0) rowError = "prix de vente invalide";
        else if (!Number.isFinite(costPrice) || costPrice < 0) rowError = "prix d'achat invalide";
        else if (!Number.isInteger(stock) || stock < 0) rowError = "stock invalide";

        if (rowError) {
          errors.push("Ligne " + (rowIndex + 2) + " : " + rowError);
        } else {
          try {
            await shopStore.addProduct({
              name: productName,
              sku: sku || undefined,
              price,
              costPrice,
              stock,
              categoryId,
              brandId: brandId || undefined,
              modelId: modelId || undefined,
              description: description || undefined,
              imageUrl: imageUrl || undefined,
              active: true
            }, { deferRefresh: true });
            added += 1;
          } catch (error) {
            const message = error instanceof Error ? error.message : "Erreur d'import";
            errors.push("Ligne " + (rowIndex + 2) + " : " + message);
          }
        }

        setCsvImportStatus({ phase: "importing", total: dataRows.length, processed: rowIndex + 1, added, errors: errors.slice(0, 5) });
      }

      await shopStore.refreshData();
      setCsvImportStatus({
        phase: "complete",
        total: dataRows.length,
        processed: dataRows.length,
        added,
        errors: errors.slice(0, 5),
        message: (isArabic ? "تم استيراد " : "Import terminé : ") + added + (isArabic ? " منتج." : " produit(s) ajouté(s).") + (errors.length ? " " + errors.length + (isArabic ? " أسطر فيها أخطاء." : " ligne(s) à corriger.") : ""),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur pendant la lecture du CSV";
      setCsvImportStatus({ phase: "error", total: 0, processed: 0, added: 0, errors: [message], message });
    } finally {
      input.value = "";
    }
  };

  const handleDownloadCsvTemplate = () => {
    // Header for the template based on our expected parsing
    const header = "Nom;SKU;Prix_Vente;Prix_Achat;Stock;ID_Categorie;ID_Marque;ID_Modele;Description;URL_Image\n";
    // Example rows
    const examples = [
      "Câble iPhone Rapide;CBL-IPH-001;25.00;10.00;10;33f5d506-8d61-4fa3-9f5e-1cdff17122a2;Apple;iPhone 15;Câble de charge rapide pour iPhone;https://example.com/img1.webp",
      "Écouteurs AirPods;EAR-POD-001;150.00;80.00;5;bc9277d7-fde0-47b8-80f0-c5ef61ed8127;;;Écouteurs sans fil bluetooth;",
    ].join("\n");
    
    const blob = new Blob([header + examples], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "telelab_produits_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  function handleOpenProductEditor(product: ShopProduct) {
    setEditingProduct(product);
    setProductEditForm({
      name: product.name,
      sku: product.sku || "",
      categoryId: product.categoryId,
      brandId: product.brandId || "",
      modelId: product.modelId || "",
      price: String(product.price),
      costPrice: String(product.costPrice || 0),
      stock: String(product.stock),
      description: product.description || "",
      imageUrl: product.imageUrl || "",
      active: product.active,
    });
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    const price = Number(productEditForm.price.replace(",", "."));
    const costPrice = Number(productEditForm.costPrice.replace(",", ".")) || 0;
    const stock = Number(productEditForm.stock);
    if (!productEditForm.name.trim() || !productEditForm.categoryId || !Number.isFinite(price) || price <= 0 || !Number.isFinite(costPrice) || costPrice < 0 || !Number.isInteger(stock) || stock < 0) {
      alert(isArabic ? "راجع الاسم والسعر والمخزون والفئة." : "Vérifiez le nom, les prix, le stock et la catégorie.");
      return;
    }

    setIsSavingProduct(true);
    try {
      await shopStore.updateProduct(editingProduct.id, {
        name: productEditForm.name.trim(),
        sku: productEditForm.sku.trim(),
        categoryId: productEditForm.categoryId,
        brandId: productEditForm.brandId || null,
        modelId: productEditForm.modelId || null,
        price,
        costPrice,
        stock,
        description: productEditForm.description.trim(),
        imageUrl: productEditForm.imageUrl.trim(),
        active: productEditForm.active,
      });
      setEditingProduct(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur de mise à jour du produit";
      alert((isArabic ? "تعذر حفظ المنتج: " : "Impossible d'enregistrer le produit : ") + message);
    } finally {
      setIsSavingProduct(false);
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
  async function handleProductReferenceChange(productId: string, updates: { brandId?: string | null; modelId?: string | null }) {
    try {
      await shopStore.updateProduct(productId, updates);
    } catch (err: any) {
      alert("Erreur lors de l’association de la marque ou du modèle : " + err.message);
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

  function handlePrintShop(type: "bon" | "facture", order: any) {
    setShopPrintType(type);
    setShopPrintOrder(order);
    setTimeout(() => {
      window.print();
      setShopPrintType(null);
      setShopPrintOrder(null);
    }, 100);
  }

  async function handleSavePrice() {
    if (!selectedReq) return;
    const p = parseFloat(editingPrice);
    if (!isNaN(p) && p > 0) {
      const updated = await repairStore.updatePrice(selectedReq.id, p);
      if (updated) setSelectedReq(updated);
    }
  }

  async function handleChangeStatus(newStatus: RepairStatusKey) {
    if (!selectedReq) return;
    const updated = await repairStore.updateStatus(selectedReq.id, newStatus, customNote || undefined, user?.displayName || "Admin Tele Lab");
    if (updated) {
      setSelectedReq(updated);
      setCustomNote("");
    }
  }

  async function handleAssignDriver(driverId: string) {
    if (!selectedReq) return;
    const driver = drivers.find(d => d.id === driverId);
    if(driver) {
      const updated = await repairStore.assignDriver(selectedReq.id, driver.name, driver.id);
      if (updated) setSelectedReq(updated);
    }
  }

  async function handleAssignTech(techName: string) {
    if (!selectedReq) return;
    const updated = await repairStore.assignTechnician(selectedReq.id, techName);
    if (updated) setSelectedReq(updated);
  }

  async function handlePayment(type: "deposit" | "full") {
    if (!selectedReq) return;
    const updated = await repairStore.recordPayment(selectedReq.id, type);
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
              <Settings size={28} style={{ verticalAlign: "middle", marginRight: 12, color: "var(--color-primary)" }} />
              {isArabic ? "لوحة تحكم الإدارة" : "Back Office"}
            </h1>
            <p>{isArabic ? `متصل بـ: ${user?.displayName || "Admin"}` : `Connecté : ${user?.displayName || "Admin"}`}</p>
          </div>

          <form className="tl-admin-global-search" onSubmit={(event) => { event.preventDefault(); if (adminSearchResults[0]) openAdminSearchResult(adminSearchResults[0]); else setAdminSearchOpen(true); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAdminSearchOpen(false); }}>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={adminSearch}
              onFocus={() => setAdminSearchOpen(true)}
              onChange={event => { setAdminSearch(event.target.value); setAdminSearchOpen(true); }}
              onKeyDown={event => { if (event.key === "Escape") setAdminSearchOpen(false); }}
              placeholder={isArabic ? "بحث شامل: مستخدم، هاتف، منتج، طلب، تتبّع..." : "Recherche globale : client, téléphone, produit, commande, suivi…"}
              aria-label={isArabic ? "بحث شامل في الإدارة" : "Recherche globale dans l’administration"}
              aria-expanded={adminSearchOpen && Boolean(adminSearch)}
              aria-controls="tl-admin-search-results"
            />
            {adminSearch && <button type="button" className="tl-admin-search-clear" onClick={() => { setAdminSearch(""); setSearch(""); setAdminSearchOpen(true); }} aria-label={isArabic ? "مسح البحث" : "Effacer la recherche"}><X size={16} /></button>}
            {adminSearchOpen && adminSearch.trim() && (
              <div className="tl-admin-search-results" id="tl-admin-search-results" role="listbox">
                <div className="tl-admin-search-results__heading">{isArabic ? "نتائج في كل الأقسام" : "Résultats dans tous les espaces"}</div>
                {adminSearchResults.length ? adminSearchResults.map(result => (
                  <button type="button" role="option" aria-selected="false" key={result.kind + result.id} className="tl-admin-search-result" onClick={() => openAdminSearchResult(result)}>
                    <span className="tl-admin-search-result__kind">{result.kind}</span>
                    <span className="tl-admin-search-result__copy"><strong>{result.title}</strong><small>{result.subtitle}</small></span>
                  </button>
                )) : <p className="tl-admin-search-empty">{usersLoading ? (isArabic ? "جاري تحميل المستخدمين..." : "Chargement des utilisateurs…") : (isArabic ? "ما لقيناش نتائج مطابقة." : "Aucun résultat correspondant.")}</p>}
              </div>
            )}
          </form>

          <div className="tl-admin-tabs" ref={tabsRef}>
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
            <div className="tl-glass-dashboard-wrapper">
              <div className="tl-glass-dashboard-heading">
                <span className="tl-glass-dashboard-eyebrow">{isArabic ? "متابعة النشاط" : "VUE D’ENSEMBLE"}</span>
                <div className="tl-glass-dashboard-title">{isArabic ? "لوحة الإحصائيات" : "Tableau de bord"}</div>
                <p className="tl-glass-dashboard-subtitle">
                  {isArabic ? "نظرة واضحة على المداخيل والإصلاحات ونشاط المتجر" : "Les indicateurs clés des réparations, des ventes et de l’activité."}
                </p>
              </div>
              
              {/* KPI Row */}
              <div className="tl-glass-kpi-row">
                <div className="tl-glass-kpi-card">
                  <div className="tl-glass-kpi-icon is-users"><Users size={18} aria-hidden="true" /></div>
                  <div className="tl-glass-kpi-value">{totalUsers}</div>
                  <div className="tl-glass-kpi-label">{isArabic ? "المستخدمين" : "TOTAL UTILISATEURS"}</div>
                </div>
                <div className="tl-glass-kpi-card">
                  <div className="tl-glass-kpi-icon is-revenue"><DollarSign size={18} aria-hidden="true" /></div>
                  <div className="tl-glass-kpi-value">{(totalRevenue + shopRevenue).toFixed(0)}</div>
                  <div className="tl-glass-kpi-label">{isArabic ? "الإيرادات (DT)" : "CHIFFRE D'AFFAIRES (DT)"}</div>
                </div>
                <div className="tl-glass-kpi-card">
                  <div className="tl-glass-kpi-icon is-repairs"><Wrench size={18} aria-hidden="true" /></div>
                  <div className="tl-glass-kpi-value">{requests.length}</div>
                  <div className="tl-glass-kpi-label">{isArabic ? "الإصلاحات" : "TOTAL RÉPARATIONS"}</div>
                </div>
                <div className="tl-glass-kpi-card">
                  <div className="tl-glass-kpi-icon is-orders"><ShoppingBag size={18} aria-hidden="true" /></div>
                  <div className="tl-glass-kpi-value">{shopOrders.length}</div>
                  <div className="tl-glass-kpi-label">{isArabic ? "طلبات المتجر" : "COMMANDES BOUTIQUE"}</div>
                </div>
              </div>

              <div className="tl-glass-section-heading">
                <h2>{isArabic ? "تحليل النشاط" : "Analyse de l’activité"}</h2>
                <p>{isArabic ? "المداخيل وتوزيع طلبات الإصلاح" : "Chiffre d’affaires et répartition des réparations"}</p>
              </div>

              {/* Chart Row 1 */}
              <div className="tl-glass-chart-row">
                <div className="tl-glass-chart-card">
                  <div className="tl-glass-chart-title">{isArabic ? "الإيرادات" : "BILAN FINANCIER"}</div>
                  <div className="tl-glass-chart-content">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                        <RechartsTooltip cursor={{ fill: "rgba(var(--color-primary-rgb), 0.06)" }} contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }} />
                        <Bar dataKey="montant" radius={[4, 4, 0, 0]}>
                          {barData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="tl-glass-chart-card">
                  <div className="tl-glass-chart-title">{isArabic ? "الطلبات" : "RÉPARTITION DEMANDES"}</div>
                  <div className="tl-glass-chart-content">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                          {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                        </Pie>
                        <RechartsTooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="tl-glass-section-heading tl-glass-section-heading-secondary">
                <h2>{isArabic ? "العمليات والزيارات" : "Opérations & fréquentation"}</h2>
                <p>{isArabic ? "الهامش والتوصيل ونشاط الموقع" : "Marge, livraisons et activité du site"}</p>
              </div>

              {/* Chart Row 2 */}
              <div className="tl-glass-chart-row-3">
                <div className="tl-glass-chart-card">
                  <div className="tl-glass-chart-title">{isArabic ? "الأداء والهوامش" : "PERFORMANCES & MARGES"}</div>
                  <div className="tl-glass-chart-content">
                    <div style={{ display: "flex", justifyContent: "space-around", width: "100%", alignItems: "center" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-success)" }}>{totalBenefice.toFixed(0)}</div>
                          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Marge (DT)</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{shopCost.toFixed(0)}</div>
                          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Achat (DT)</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-error)" }}>{driverCost.toFixed(0)}</div>
                          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Livraison (DT)</div>
                        </div>
                    </div>
                  </div>
                </div>

                <div className="tl-glass-chart-card">
                  <div className="tl-glass-chart-title">{isArabic ? "الزيارات" : "VISITES SITE"}</div>
                  <div className="tl-glass-chart-content">
                    <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ position: "absolute" }}>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-border)" strokeWidth="10" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-primary)" strokeWidth="10" strokeDasharray="251" strokeDashoffset={251 - (251 * Math.min(siteVisits, 1000) / 1000)} strokeLinecap="round" transform="rotate(-90 50 50)" />
                      <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" className="tl-radial-center-text">{siteVisits}</text>
                      <text x="50" y="70" textAnchor="middle" dominantBaseline="middle" className="tl-radial-center-label">VISITES</text>
                    </svg>
                  </div>
                </div>

                <div className="tl-glass-chart-card">
                  <div className="tl-glass-chart-title">{isArabic ? "المستعمل" : "OCCASIONS"}</div>
                  <div className="tl-glass-chart-content">
                    <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ position: "absolute" }}>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-border)" strokeWidth="10" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-purple)" strokeWidth="10" strokeDasharray="251" strokeDashoffset={251 - (251 * occasions.length / 50)} strokeLinecap="round" transform="rotate(-90 50 50)" />
                      <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" className="tl-radial-center-text">{occasions.length}</text>
                      <text x="50" y="70" textAnchor="middle" dominantBaseline="middle" className="tl-radial-center-label">ANNONCES</text>
                    </svg>
                  </div>
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
                  style={{ height: 44, background: "rgba(var(--color-primary-rgb),0.1)", color: "var(--color-primary-dark)", borderColor: "rgba(var(--color-primary-rgb),0.3)", marginRight: 12 }}
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
                            {profileUsers.some(u => u.phone.replace(/[\s\-\+]/g, "") === req.customer.phone.replace(/[\s\-\+]/g, "")) ? (
                              <span style={{ fontSize: "10px", color: "var(--color-success)", background: "rgba(16,185,129,0.1)", padding: "2px 6px", borderRadius: 4 }}>Compte Actif</span>
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
                              <strong style={{ color: "var(--color-primary-dark)" }}>{req.price} DT</strong>
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
                      <th>{isArabic ? "الموصل" : "Livreur"}</th>
                      <th>{isArabic ? "الحالة" : "Statut"}</th>
                      <th>{isArabic ? "إجراء" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shopOrders.filter(o => matchesAdminSearch(search, [o.orderNumber, o.customerName, o.customerAddress, o.customerCity, o.customerGovernorate, o.status, ...o.items.map(item => item.name)], [o.customerPhone])).map((order) => (
                      <tr key={order.id}>
                        <td data-label="N° Commande" style={{ fontWeight: 600, color: "var(--color-success)" }}>{order.orderNumber}</td>
                        <td data-label="Date" style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                          {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td data-label="Client">
                          <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                          <div style={{ fontSize: "12px" }}>
                            <a href={`tel:${order.customerPhone}`} style={{ color: "var(--color-primary-dark)" }}>{order.customerPhone}</a>
                          </div>
                        </td>
                        <td data-label="Adresse" style={{ fontSize: "12px" }}>
                          {order.customerAddress}, {order.customerCity} ({order.customerGovernorate})
                        </td>
                        <td data-label="Produits" style={{ fontSize: "12px", maxWidth: 200, whiteSpace: "normal" }}>
                          {order.items.map(item => `${item.quantity}x ${item.name}`).join(", ")}
                        </td>
                        <td data-label="Total">
                          <strong style={{ color: "var(--color-primary-dark)" }}>{order.totalAmount.toFixed(2)} DT</strong>
                        </td>
                        <td data-label="Livreur">
                          <select
                            value={order.driverId || ""}
                            onChange={(e) => {
                              const d = drivers.find(drv => drv.id === e.target.value);
                              if (d) orderStore.assignDriver(order.id, d.id, d.name);
                            }}
                            style={{ padding: "4px 8px", fontSize: 12, borderRadius: 4, background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                          >
                            <option value="">-- Non assigné --</option>
                            {drivers.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
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
                              color: order.status === 'delivered' ? "var(--color-success)" : "var(--color-text-secondary)",
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
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button className="tl-btn-manage" style={{ color: "var(--color-primary-dark)", borderColor: "rgba(var(--color-primary-rgb), 0.3)" }} onClick={() => handlePrintShop("bon", order)}>
                              <Printer size={14} /> Bon
                            </button>
                            <button className="tl-btn-manage" style={{ color: "var(--color-success)", borderColor: "rgba(16, 185, 129, 0.3)" }} onClick={() => handlePrintShop("facture", order)}>
                              <Printer size={14} /> Facture
                            </button>
                            <button 
                              className="tl-btn-manage" 
                              style={{ color: "var(--color-error)", borderColor: "rgba(239, 68, 68, 0.3)" }} 
                              onClick={() => {
                                if (confirm("Supprimer cette commande définitivement ?")) orderStore.deleteOrder(order.id);
                              }}
                            >
                              <Trash2 size={14} /> Supprimer
                            </button>
                          </div>
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
                  style={{ height: 40, background: "rgba(var(--color-primary-rgb),0.1)", color: "var(--color-primary-dark)", borderColor: "rgba(var(--color-primary-rgb),0.3)" }}
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
                        .filter(u => matchesAdminSearch(search, [u.first_name, u.last_name, u.email, u.auth_email, u.role], [u.phone]))
                        .map((u) => {
                          const roleColors: Record<string, { bg: string; color: string; label: string }> = {
                            admin: { bg: "rgba(239,68,68,0.1)", color: "var(--color-error)", label: "Admin" },
                            customer: { bg: "rgba(16,185,129,0.1)", color: "var(--color-success)", label: "Client" },
                            technician: { bg: "rgba(var(--color-primary-rgb),0.1)", color: "var(--color-primary-dark)", label: "Technicien" },
                            driver: { bg: "rgba(var(--color-purple-rgb),0.1)", color: "var(--color-purple)", label: "Livreur" },
                          };
                          const rc = roleColors[u.role] || roleColors.customer;
                          return (
                            <tr key={u.id}>
                              <td data-label={isArabic ? "المستخدم" : "Utilisateur"}>
                                <div className="tl-td-client" style={{ fontWeight: 600 }}>
                                  {u.first_name} {u.last_name}
                                </div>
                              </td>
                              <td data-label={isArabic ? "الهاتف" : "Téléphone"} className="tl-td-client-phone">
                                <a href={`tel:${u.phone}`}>{u.phone}</a>
                              </td>
                              <td style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>
                                {u.auth_email || u.email || "—"}
                              </td>
                              <td data-label={isArabic ? "الدور" : "Rôle"}>
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
                                    style={{ display: "inline-flex", color: "var(--color-error)", borderColor: "rgba(239, 68, 68, 0.3)" }}
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
                  <button type="submit" className="tl-btn-manage" style={{ height: 40, background: "rgba(var(--color-primary-rgb),0.1)", color: "var(--color-primary-dark)", borderColor: "rgba(var(--color-primary-rgb),0.3)" }}>
                    <Plus size={16} /> Ajouter un livreur
                  </button>
                </div>
              </form>
            </div>

            <div className="tl-driver-grid">
              {filteredDrivers.map((driver) => (
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
                      style={{ background: "none", border: "none", color: "var(--color-error)", cursor: "pointer", padding: 4 }}
                      title="Supprimer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  
                  <div className="tl-driver-stats">
                    <div className="tl-driver-stat-box">
                      <div className="tl-driver-stat-label">En Course</div>
                      <div className="tl-driver-stat-value" style={{ color: "var(--color-primary-dark)" }}>{driver.activeDeliveries}</div>
                    </div>
                    <div className="tl-driver-stat-box">
                      <div className="tl-driver-stat-label">Terminées</div>
                      <div className="tl-driver-stat-value" style={{ color: "var(--color-success)" }}>{driver.completedDeliveries}</div>
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
              <button 
                className={`tl-tab-btn ${shopView === "stock" ? "is-active" : ""}`}
                onClick={() => setShopView("stock")}
                style={{ padding: "8px 16px", borderRadius: 8 }}
              >
                <Package size={16} /> 📦 Stocks
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
                      <button type="submit" className="tl-btn-manage" style={{ height: 40, background: "rgba(var(--color-primary-rgb),0.1)", color: "var(--color-primary-dark)", borderColor: "rgba(var(--color-primary-rgb),0.3)" }}>
                        <Plus size={16} /> Ajouter une catégorie
                      </button>
                    </div>
                  </form>
                </div>
                
                <div className="tl-admin-table-card">
                  <div className="tl-table-wrapper">
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
                            <td data-label="Catégorie" style={{ fontWeight: 600 }}>{cat.name}</td>
                            <td style={{ color: "var(--color-text-secondary)" }}>{cat.icon || "—"}</td>
                            <td data-label="Action">
                              <button className="tl-btn-manage"
                                style={{ color: "var(--color-error)", borderColor: "rgba(239, 68, 68, 0.3)" }} onClick={() => handleDeleteCategory(cat.id)}>
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
                </div>
              </>
            )}

            {shopView === "products" && (
              <>
                <div className="tl-admin-toolbar" style={{ alignItems: "flex-end", marginTop: 24, justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: 16, flex: 1, minWidth: 200 }}>Gestion des Produits</h3>
                    <div className="tl-product-list-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label={isArabic ? "بحث في المنتجات" : "Rechercher dans les produits"} placeholder={isArabic ? "اسم، ماركة، موديل، SKU…" : "Nom, marque, modèle, SKU…"} value={search} onChange={event => setSearch(event.target.value)} /><span>{filteredProducts.length}</span></div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button 
                        type="button" 
                        onClick={handleDownloadCsvTemplate}
                        className="tl-btn-manage" 
                        style={{ height: 36, background: "rgba(167, 176, 184, 0.1)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                      >
                        <FileText size={14} /> Télécharger Modèle CSV
                      </button>
                      
                      <div style={{ position: "relative" }}>
                        <input 
                          type="file" 
                          accept=".csv,text/csv"
                          disabled={csvImportStatus.phase === "importing"}
                          onChange={handleCsvImport} 
                          style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", zIndex: 10 }}
                          title="Importer CSV"
                        />
                        <button type="button" className="tl-btn-manage" style={{ height: 36, background: "rgba(var(--color-primary-rgb),0.1)", color: "var(--color-primary-dark)", borderColor: "rgba(var(--color-primary-rgb),0.3)" }}>
                          <Plus size={14} /> Importer CSV
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {csvImportStatus.phase !== "idle" && (
                  <div className={"tl-csv-import-status is-" + csvImportStatus.phase} role="status" aria-live="polite">
                    <div className="tl-csv-import-status__top">
                      <strong>{csvImportStatus.message || (isArabic ? "جاري الاستيراد" : "Import en cours")}</strong>
                      {csvImportStatus.phase === "importing" && csvImportStatus.total > 0 && <span>{csvImportStatus.processed} / {csvImportStatus.total}</span>}
                    </div>
                    {csvImportStatus.phase === "importing" && csvImportStatus.total > 0 && <progress max={csvImportStatus.total} value={csvImportStatus.processed} />}
                    {csvImportStatus.errors.length > 0 && <ul>{csvImportStatus.errors.slice(0, 4).map((error, index) => <li key={index}>{error}</li>)}</ul>}
                  </div>
                )}

                <div className="tl-admin-toolbar" style={{ alignItems: "flex-start", marginTop: 12, background: "rgba(var(--color-bg-rgb), 0.5)", padding: 20, borderRadius: 12, border: "1px solid var(--color-border)" }}>
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
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Prix d'achat (DT)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0.00"
                        value={newProdCostPrice}
                        onChange={e => setNewProdCostPrice(e.target.value)}
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
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Marque</label>
                      <input
                        list="brands-list"
                        placeholder="Ex: Apple"
                        value={newProdBrand}
                        onChange={e => setNewProdBrand(e.target.value)}
                        style={{ width: "100%", padding: "10px 16px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                      />
                      <datalist id="brands-list">
                        {brands.map(b => <option key={b.id} value={b.name} />)}
                      </datalist>
                    </div>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Modèle</label>
                      <input
                        list="models-list"
                        placeholder="Ex: iPhone 15 Pro"
                        value={newProdModel}
                        onChange={e => setNewProdModel(e.target.value)}
                        style={{ width: "100%", padding: "10px 16px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                      />
                      <datalist id="models-list">
                        {models.map(m => <option key={m.id} value={m.name} />)}
                      </datalist>
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Catégorie</label>
                      <select
                        required
                        value={newProdCat}
                        onChange={e => setNewProdCat(e.target.value)}
                        style={{ width: "100%", padding: "10px 16px" }}
                      >
                        <option value="">Sélectionner...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: "1 1 100%", minWidth: "100%" }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Description</label>
                      <textarea
                        placeholder="Description du produit..."
                        value={newProdDesc}
                        onChange={e => setNewProdDesc(e.target.value)}
                        style={{ width: "100%", padding: "10px 16px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)", minHeight: 60 }}
                      />
                    </div>
                    
                    <div style={{ flex: 2, minWidth: 300 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Image</label>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                          <input type="radio" checked={newProdImgType === "url"} onChange={() => setNewProdImgType("url")} /> URL
                        </label>
                        <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                          <input type="radio" checked={newProdImgType === "file"} onChange={() => setNewProdImgType("file")} /> Fichier Local
                        </label>
                      </div>
                      
                      {newProdImgType === "url" ? (
                        <input
                          type="text"
                          placeholder="https://..."
                          value={newProdImgUrl}
                          onChange={e => setNewProdImgUrl(e.target.value)}
                          style={{ width: "100%", padding: "10px 16px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                        />
                      ) : (
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => setNewProdImgFile(e.target.files?.[0] || null)}
                          style={{ width: "100%", padding: "8px", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" }}
                        />
                      )}
                    </div>
                    <div style={{ flex: "1 1 100%", display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                      <button type="submit" disabled={isUploading} className="tl-btn-manage" style={{ height: 40, background: "rgba(var(--color-primary-rgb),0.1)", color: "var(--color-primary-dark)", borderColor: "rgba(var(--color-primary-rgb),0.3)", minWidth: 150 }}>
                        {isUploading ? "Ajout en cours..." : <><Plus size={16} /> Ajouter Produit</>}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="tl-admin-table-card">
                  <div className="tl-table-wrapper">
                    <table className="tl-admin-table">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Produit</th>
                          <th>SKU</th>
                          <th>Catégorie</th>
                          <th>Prix (V)</th>
                          <th>Prix (A)</th>
                          <th>Stock</th>
                          <th>Vendus</th>
                          <th>Vues</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map(prod => {
                          const cat = categories.find(c => c.id === prod.categoryId);
                          return (
                            <tr key={prod.id} style={{ background: prod.stock > 0 && prod.stock <= 5 ? "rgba(245, 158, 11, 0.05)" : undefined }}>
                              <td>
                                {prod.imageUrl ? (
                                  <img src={prod.imageUrl} alt={prod.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
                                ) : (
                                  <div style={{ width: 40, height: 40, background: "var(--color-border)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={16} color="var(--color-text-secondary)" /></div>
                                )}
                              </td>
                              <td data-label="Produit">
                                <div style={{ fontWeight: 600 }}>{prod.name}</div>
                                {(prod.brandId || prod.modelId) && (
                                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                                    {brands.find(b => b.id === prod.brandId)?.name || brands.find(b => b.id === models.find(m => m.id === prod.modelId)?.brand_id)?.name || ""} {models.find(m => m.id === prod.modelId)?.name || ""}
                                  </div>
                                )}
                                <div className="tl-product-reference-fields">
                                  <select aria-label={"Marque de " + prod.name} value={prod.brandId || ""} onChange={e => handleProductReferenceChange(prod.id, { brandId: e.target.value || null })}>
                                    <option value="">Associer une marque</option>
                                    {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                                  </select>
                                  <select aria-label={"Modèle de " + prod.name} value={prod.modelId || ""} onChange={e => {
                                    const modelId = e.target.value || null;
                                    const linkedBrandId = models.find(model => model.id === modelId)?.brand_id;
                                    handleProductReferenceChange(prod.id, { modelId, ...(linkedBrandId ? { brandId: linkedBrandId } : {}) });
                                  }}>
                                    <option value="">Associer un modèle</option>
                                    {models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
                                  </select>
                                </div>
                              </td>
                              <td data-label="SKU" style={{ fontSize: 12, fontFamily: "monospace" }}>{prod.sku || "—"}</td>
                              <td style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{cat?.name || "—"}</td>
                              <td data-label="Prix (V)"><strong style={{ color: "var(--color-success)" }}>{prod.price} DT</strong></td>
                              <td data-label="Prix (A)"><strong style={{ color: "var(--color-text-secondary)" }}>{prod.costPrice || 0} DT</strong></td>
                              <td data-label="Stock">
                                {prod.stock > 0 ? (
                                  <span style={{ color: prod.stock <= 5 ? "#f59e0b" : "var(--color-text)", fontWeight: prod.stock <= 5 ? 600 : 400 }}>
                                    {prod.stock} {prod.stock <= 5 && "⚠️"}
                                  </span>
                                ) : (
                                  <span style={{ color: "var(--color-error)", fontWeight: 600 }}>Rupture</span>
                                )}
                              </td>
                              <td data-label="Vendus" style={{ fontSize: 13 }}>
                                {shopOrders.reduce((acc, order) => acc + (order.items.find(i => i.id === prod.id)?.quantity || 0), 0)}
                              </td>
                              <td data-label="Vues">{prod.views || 0}</td>
                              <td data-label="Action">
                              <div className="tl-product-row-actions">
                                <button type="button" className="tl-btn-manage" onClick={() => handleOpenProductEditor(prod)} title={isArabic ? "تعديل المنتج" : "Modifier le produit"} aria-label={(isArabic ? "تعديل " : "Modifier ") + prod.name}>
                                  <Pencil size={14} />
                                </button>
                                <button type="button" className="tl-btn-manage" style={{ color: "var(--color-error)", borderColor: "rgba(239, 68, 68, 0.3)" }} onClick={() => handleDeleteProduct(prod.id)} title={isArabic ? "حذف المنتج" : "Supprimer le produit"} aria-label={(isArabic ? "حذف " : "Supprimer ") + prod.name}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                            </tr>
                          );
                        })}
                        {filteredProducts.length === 0 && (
                          <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: "var(--color-text-secondary)" }}>{search ? (isArabic ? "ما لقيناش منتجات مطابقة." : "Aucun produit ne correspond à cette recherche.") : (isArabic ? "ما فما حتى منتج." : "Aucun produit pour le moment.")}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {shopView === "stock" && (
              <>
                <div className="tl-admin-toolbar" style={{ alignItems: "flex-end", marginTop: 24 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Suivi des Stocks</h3>
                </div>
                <div className="tl-admin-table-card">
                  <div className="tl-table-wrapper">
                    <table className="tl-admin-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Produit</th>
                          <th>Stock Initial / Ajouté</th>
                          <th>Quantité Vendue</th>
                          <th>Stock Restant Actuel</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map(prod => {
                          const sold = shopOrders
                            .filter(o => o.status === "delivered")
                            .reduce((acc, order) => acc + (order.items.find(i => i.id === prod.id)?.quantity || 0), 0);
                          
                          return (
                            <tr key={prod.id} style={{ background: prod.stock > 0 && prod.stock <= 5 ? "rgba(245, 158, 11, 0.05)" : undefined }}>
                              <td data-label="SKU" style={{ fontSize: 12, fontFamily: "monospace" }}>{prod.sku || "—"}</td>
                              <td data-label="Produit" style={{ fontWeight: 600 }}>{prod.name}</td>
                              <td data-label="Initial">{prod.stock + sold}</td>
                              <td data-label="Vendus" style={{ color: "var(--color-success)", fontWeight: 600 }}>{sold}</td>
                              <td data-label="Restant" style={{ fontWeight: 600 }}>
                                {prod.stock > 0 ? (
                                  <span style={{ color: prod.stock <= 5 ? "#f59e0b" : "var(--color-text)" }}>
                                    {prod.stock} {prod.stock <= 5 && "⚠️"}
                                  </span>
                                ) : (
                                  <span style={{ color: "var(--color-error)" }}>0</span>
                                )}
                              </td>
                              <td data-label="Statut">
                                {prod.stock > 5 && <span style={{ color: "var(--color-success)", fontSize: 12, background: "rgba(16,185,129,0.1)", padding: "2px 6px", borderRadius: 4 }}>En stock</span>}
                                {prod.stock > 0 && prod.stock <= 5 && <span style={{ color: "#f59e0b", fontSize: 12, background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 4 }}>Stock Faible</span>}
                                {prod.stock === 0 && <span style={{ color: "var(--color-error)", fontSize: 12, background: "rgba(239,68,68,0.1)", padding: "2px 6px", borderRadius: 4 }}>Rupture</span>}
                              </td>
                            </tr>
                          );
                        })}
                        {products.length === 0 && (
                          <tr><td colSpan={6} style={{ textAlign: "center", padding: 20, color: "var(--color-text-secondary)" }}>Aucun produit.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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
              <div className="tl-table-wrapper">
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
                    {filteredOccasions.map(occ => (
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
                          <div style={{ color: "var(--color-primary-dark)", fontSize: 12, marginTop: 4 }}>État: {occ.condition}</div>
                        </td>
                        <td>
                          <a href={`https://wa.me/${occ.whatsappNumber.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" style={{ color: "#25d366" }}>
                            {occ.whatsappNumber}
                          </a>
                        </td>
                        <td data-label="Prix"><strong style={{ color: "var(--color-success)" }}>{occ.price} DT</strong></td>
                        <td data-label="Vues">{occ.views || 0}</td>
                        <td>
                          <select 
                            value={occ.status} 
                            onChange={(e) => occasionStore.updateOccasionStatus(occ.id, e.target.value as any)}
                            style={{ padding: "4px 8px", fontSize: 12, borderRadius: 4, background: "var(--color-bg)", border: "1px solid var(--color-border)", color: occ.status === "active" ? "var(--color-success)" : "var(--color-text-secondary)" }}
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
                            style={{ color: "var(--color-error)", borderColor: "rgba(239, 68, 68, 0.3)", padding: "6px 8px" }} 
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
          </div>
        )}

        {editingProduct && (
          <div className="tl-modal-overlay tl-product-editor-overlay" onClick={() => setEditingProduct(null)}>
            <section className="tl-modal-card tl-product-editor" role="dialog" aria-modal="true" aria-labelledby="tl-product-editor-title" onClick={event => event.stopPropagation()}>
              <div className="tl-modal-header">
                <div>
                  <span className="tl-admin-section-kicker">{isArabic ? "إدارة المتجر" : "GESTION DE LA BOUTIQUE"}</span>
                  <h2 id="tl-product-editor-title">{isArabic ? "تعديل المنتج" : "Modifier le produit"}</h2>
                </div>
                <button type="button" className="tl-modal-close" onClick={() => setEditingProduct(null)} aria-label={isArabic ? "إغلاق" : "Fermer"}><X size={18} /></button>
              </div>
              <form className="tl-product-editor-form" onSubmit={handleSaveProduct}>
                <div className="tl-product-editor-grid">
                  <label>{isArabic ? "اسم المنتج" : "Nom du produit"}<input required value={productEditForm.name} onChange={event => setProductEditForm(form => ({ ...form, name: event.target.value }))} /></label>
                  <label>SKU<input value={productEditForm.sku} onChange={event => setProductEditForm(form => ({ ...form, sku: event.target.value }))} /></label>
                  <label>{isArabic ? "سعر البيع (DT)" : "Prix de vente (DT)"}<input type="number" min="0.01" step="0.01" required value={productEditForm.price} onChange={event => setProductEditForm(form => ({ ...form, price: event.target.value }))} /></label>
                  <label>{isArabic ? "سعر الشراء (DT)" : "Prix d'achat (DT)"}<input type="number" min="0" step="0.01" value={productEditForm.costPrice} onChange={event => setProductEditForm(form => ({ ...form, costPrice: event.target.value }))} /></label>
                  <label>{isArabic ? "المخزون" : "Stock"}<input type="number" min="0" step="1" required value={productEditForm.stock} onChange={event => setProductEditForm(form => ({ ...form, stock: event.target.value }))} /></label>
                  <label>{isArabic ? "الفئة" : "Catégorie"}<select required value={productEditForm.categoryId} onChange={event => setProductEditForm(form => ({ ...form, categoryId: event.target.value }))}><option value="">{isArabic ? "اختار فئة" : "Choisir une catégorie"}</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                  <label>{isArabic ? "الماركة" : "Marque"}<select value={productEditForm.brandId} onChange={event => setProductEditForm(form => ({ ...form, brandId: event.target.value }))}><option value="">{isArabic ? "بدون ماركة" : "Sans marque"}</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
                  <label>{isArabic ? "الموديل" : "Modèle"}<select value={productEditForm.modelId} onChange={event => setProductEditForm(form => ({ ...form, modelId: event.target.value }))}><option value="">{isArabic ? "بدون موديل" : "Sans modèle"}</option>{models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
                  <label className="tl-product-editor-span">{isArabic ? "رابط الصورة" : "URL de l'image"}<input type="url" placeholder="https://…" value={productEditForm.imageUrl} onChange={event => setProductEditForm(form => ({ ...form, imageUrl: event.target.value }))} /></label>
                  <label className="tl-product-editor-span">{isArabic ? "الوصف" : "Description"}<textarea rows={4} value={productEditForm.description} onChange={event => setProductEditForm(form => ({ ...form, description: event.target.value }))} /></label>
                  <label className="tl-product-editor-active"><input type="checkbox" checked={productEditForm.active} onChange={event => setProductEditForm(form => ({ ...form, active: event.target.checked }))} />{isArabic ? "ظاهر في المتجر" : "Visible dans la boutique"}</label>
                </div>
                <div className="tl-product-editor-actions">
                  <button type="button" className="tl-btn-manage" onClick={() => setEditingProduct(null)}>{isArabic ? "إلغاء" : "Annuler"}</button>
                  <button type="submit" className="tl-btn-primary" disabled={isSavingProduct}>{isSavingProduct ? (isArabic ? "جاري الحفظ..." : "Enregistrement…") : <><Save size={16} /> {isArabic ? "حفظ التعديلات" : "Enregistrer"}</>}</button>
                </div>
              </form>
            </section>
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
                  <button type="button" className="tl-modal-close" onClick={() => handleDeleteRequest(selectedReq.id)} title="Supprimer" style={{ color: "var(--color-error)", borderColor: "rgba(239, 68, 68, 0.3)" }}>
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
                    <a href={`tel:${selectedReq.customer.phone}`} style={{ color: "var(--color-primary-dark)" }}>
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

        {/* ── PRINT TEMPLATE FOR SHOP ORDERS ── */}
        {shopPrintType && shopPrintOrder && (
          <div className="tl-print-container">
            <div className="tl-print-header">
              <h1>TELE LAB</h1>
              <p>by Telephonic Pro</p>
              <br />
              <p>Adresse: Tunis, Tunisie</p>
              <p>Tél: +216 55 123 456</p>
            </div>
            
            <div className="tl-print-title">
              <h2>{shopPrintType === "bon" ? "BON DE LIVRAISON" : "FACTURE"}</h2>
              <p>N° Commande : <strong>{shopPrintOrder.orderNumber}</strong></p>
              <p>Date : {new Date(shopPrintOrder.createdAt).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
            </div>

            <div className="tl-print-client">
              <h3>Client</h3>
              <p><strong>Nom:</strong> {shopPrintOrder.customerName}</p>
              <p><strong>Téléphone:</strong> {shopPrintOrder.customerPhone}</p>
              <p><strong>Adresse:</strong> {shopPrintOrder.customerAddress}, {shopPrintOrder.customerCity} ({shopPrintOrder.customerGovernorate})</p>
              {shopPrintOrder.driverName && (
                <p><strong>Livreur assigné:</strong> {shopPrintOrder.driverName}</p>
              )}
            </div>

            <table className="tl-print-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Quantité</th>
                  <th>Prix Unitaire</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {shopPrintOrder.items.map((item: any) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.price.toFixed(2)} DT</td>
                    <td>{(item.price * item.quantity).toFixed(2)} DT</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="tl-print-totals">
              <p><strong>Total TTC :</strong> {shopPrintOrder.totalAmount.toFixed(2)} DT</p>
            </div>

            <div className="tl-print-footer">
              <p>Merci pour votre commande sur Tele Lab.</p>
              <p>En cas de problème, veuillez nous contacter au +216 55 123 456.</p>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
