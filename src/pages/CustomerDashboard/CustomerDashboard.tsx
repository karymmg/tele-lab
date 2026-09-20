import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMyRepairRequests } from "@/services/store";
import { useMyOrders } from "@/services/orderStore";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/services/auth";
import { ShoppingBag, Package, Plus, Wrench, ArrowRight, Eye, Trash2, Tag, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { useMyOccasions, occasionStore } from "@/services/occasionStore";

export function CustomerDashboard() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { myRequests, loading: loadingRepairs } = useMyRepairRequests();
  const { myOrders, loading: loadingOrders } = useMyOrders();
  const myOccasions = useMyOccasions(user?.id);
  const isArabic = i18n.language === "ar";
  
  const [editingPriceAd, setEditingPriceAd] = useState<{ id: string; model: string; price: number } | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  const [priceSaving, setPriceSaving] = useState(false);
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);

  const loading = loadingRepairs || loadingOrders;

  const handleOpenPriceModal = (ad: { id: string; model: string; price: number }) => {
    setEditingPriceAd(ad);
    setNewPrice(String(ad.price));
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPriceAd) return;
    const p = parseFloat(newPrice);
    if (isNaN(p) || p <= 0) return;
    setPriceSaving(true);
    try {
      await occasionStore.updateOccasionPrice(editingPriceAd.id, p);
      setEditingPriceAd(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erreur lors de la modification du prix.");
    } finally {
      setPriceSaving(false);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette annonce définitivement ?")) return;
    setDeletingAdId(id);
    try {
      await occasionStore.deleteOccasion(id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erreur lors de la suppression de l'annonce.");
    } finally {
      setDeletingAdId(null);
    }
  };

  return (
    <main style={{ paddingBlock: "40px 80px", background: "var(--color-bg-secondary)", minHeight: "80vh" }}>
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "1.8rem" }}>
              {isArabic ? `مرحباً ${user?.displayName || ""} 👋` : `Espace Client — Bonjour ${user?.displayName || ""} 👋`}
            </h1>
            <p style={{ color: "var(--color-text-secondary)", marginTop: 4 }}>
              {isArabic
                ? "متابعة إصلاحات أجهزتك، تفاصيل الضمان، والفواتير."
                : "Retrouvez vos réparations en cours, vos attestations de garantie et vos factures."}
            </p>
          </div>

          <Link to="/demande">
            <Button variant="primary">
              <Plus size={16} style={{ marginRight: 8 }} /> {isArabic ? "طلب إصلاح جديد" : "Nouvelle demande de réparation"}
            </Button>
          </Link>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, marginBottom: 40 }}>
          <Link to="/shop" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: 20, display: "flex", alignItems: "center", gap: 16, textDecoration: "none", color: "var(--color-text)" }}>
            <div style={{ background: "rgba(0,140,255,0.1)", color: "#00A3FF", padding: 12, borderRadius: 12 }}><ShoppingBag size={24} /></div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "1.1rem", margin: 0 }}>{isArabic ? "تصفح المتجر" : "Parcourir la Boutique"}</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", margin: 0 }}>{isArabic ? "اكسسوارات وهواتف" : "Accessoires et téléphones"}</p>
            </div>
            <ArrowRight size={18} color="var(--color-text-secondary)" />
          </Link>
          
          <Link to="/shop/add-occasion" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: 20, display: "flex", alignItems: "center", gap: 16, textDecoration: "none", color: "var(--color-text)" }}>
            <div style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", padding: 12, borderRadius: 12 }}><Package size={24} /></div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "1.1rem", margin: 0 }}>{isArabic ? "بيع جهاز" : "Vendre un appareil"}</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", margin: 0 }}>{isArabic ? "نشر إعلان مجاني" : "Publier une annonce gratuite"}</p>
            </div>
            <ArrowRight size={18} color="var(--color-text-secondary)" />
          </Link>
        </div>

        <h2 style={{ fontSize: "1.3rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <Wrench size={20} color="#00A3FF" />
          {isArabic ? "أجهزتي قيد الإصلاح والسابقة" : "Mes réparations"}
        </h2>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-secondary)" }}>
            {isArabic ? "جارٍ التحميل..." : "Chargement en cours..."}
          </div>
        ) : myRequests.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-card)",
              border: "1px dashed var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>📱</div>
            <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>
              {isArabic ? "لا توجد طلبات بعد" : "Aucune demande pour le moment"}
            </p>
            <p style={{ fontSize: "0.9rem" }}>
              {isArabic
                ? "أرسل أول طلب إصلاح وسيظهر هنا تلقائياً."
                : "Soumettez votre première demande et elle apparaîtra ici automatiquement."}
            </p>
            <Link to="/demande" style={{ marginTop: 20, display: "inline-block" }}>
              <Button variant="primary">
                {isArabic ? "إرسال طلب إصلاح" : "Faire une demande"}
              </Button>
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
            {myRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-card)",
                  padding: 24,
                  boxShadow: "var(--shadow-card)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "var(--color-primary)",
                      background: "#ebf5ff",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {req.trackingNumber}
                  </span>
                  <StatusBadge status={req.status} />
                </div>

                <div>
                  <h3 style={{ fontSize: "1.2rem", margin: 0 }}>
                    {req.brand} {req.model}
                  </h3>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", marginTop: 4 }}>
                    {req.problem}
                  </div>
                </div>

                {req.price && (
                  <div
                    style={{
                      background: "var(--color-bg-secondary)",
                      padding: 12,
                      borderRadius: 8,
                      fontSize: "0.9rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{isArabic ? "السعر الإجمالي :" : "Prix réparation :"}</span>
                      <strong>{req.price} DT</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                      <span>{isArabic ? "حالة الدفع :" : "Paiement :"}</span>
                      <span>
                        {req.paymentStatus === "fully_paid"
                          ? (isArabic ? "مدفوع بالكامل ✓" : "Réglé à 100% ✓")
                          : req.paymentStatus === "deposit_paid"
                          ? (isArabic ? "تم دفع التسبقة 30% (54 DT)" : "Acompte 30% payé (Solde 70% à la livraison)")
                          : (isArabic ? "في الانتظار" : "En attente")}
                      </span>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    borderTop: "1px dashed var(--color-border)",
                    paddingTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: "0.85rem", color: "var(--color-success)", fontWeight: 600 }}>
                    🛡️ {isArabic ? "ضمان 3 أشهر نشط" : "Garantie 3 mois active"}
                  </div>
                  <Link to={`/tracking?id=${req.trackingNumber}`}>
                    <Button variant="secondary">{isArabic ? "تتبع مباشر ←" : "Suivre en direct →"}</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ fontSize: "1.3rem", marginBottom: 20, marginTop: 40, display: "flex", alignItems: "center", gap: 10 }}>
          <ShoppingBag size={20} color="#10b981" />
          {isArabic ? "طلباتي من المتجر" : "Mes commandes Boutique"}
        </h2>

        {loadingOrders ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-secondary)" }}>
            {isArabic ? "جارٍ التحميل..." : "Chargement en cours..."}
          </div>
        ) : myOrders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-card)",
              border: "1px dashed var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            <ShoppingBag size={32} opacity={0.3} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>
              {isArabic ? "لا توجد طلبات متجر بعد" : "Aucune commande pour le moment"}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
            {myOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-card)",
                  padding: 24,
                  boxShadow: "var(--shadow-card)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "#10b981",
                      background: "rgba(16,185,129,0.1)",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {order.orderNumber}
                  </span>
                  <span style={{ 
                    fontSize: "0.8rem", 
                    padding: "4px 8px", 
                    borderRadius: 20,
                    fontWeight: 600,
                    background: order.status === 'delivered' ? 'rgba(16,185,129,0.1)' : 'rgba(0,140,255,0.1)',
                    color: order.status === 'delivered' ? '#10b981' : '#00A3FF'
                  }}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>

                <div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", marginBottom: 8 }}>
                    {new Date(order.createdAt).toLocaleDateString(isArabic ? "ar-TN" : "fr-FR", { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: "var(--color-text)", fontSize: "0.95rem" }}>
                    {order.items.map((item, idx) => (
                      <li key={idx}>
                        {item.quantity}x {item.name}
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    borderTop: "1px dashed var(--color-border)",
                    paddingTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>
                    {isArabic ? "الإجمالي :" : "Total :"}
                  </div>
                  <strong style={{ fontSize: "1.1rem" }}>{order.totalAmount.toFixed(2)} DT</strong>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mes Annonces d'Occasion */}
        <div style={{ marginTop: 48 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ fontSize: "1.3rem", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <Package size={20} color="#8b5cf6" />
              {isArabic ? "إعلاناتي المعروضة للبيع" : "Mes annonces d'occasion"}
              <span style={{ fontSize: "0.85rem", background: "rgba(139,92,246,0.15)", color: "#8b5cf6", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                {myOccasions.length}
              </span>
            </h2>
            <Link to="/shop/add-occasion">
              <Button variant="secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Plus size={16} />
                {isArabic ? "إضافة إعلان جديد" : "Publier une annonce"}
              </Button>
            </Link>
          </div>

          {myOccasions.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                background: "var(--color-bg)",
                borderRadius: "var(--radius-card)",
                border: "1px dashed var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              <Package size={36} opacity={0.3} style={{ marginBottom: 12 }} />
              <p style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>
                {isArabic ? "لم تقم بنشر أي إعلان حتى الآن" : "Vous n'avez publié aucune annonce pour le moment"}
              </p>
              <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
                {isArabic ? "قم ببيع أجهزتك المستعملة بسرعة عبر TeleLab" : "Vendez vos anciens téléphones, PC ou consoles sur notre plateforme."}
              </p>
              <Link to="/shop/add-occasion" style={{ marginTop: 14, display: "inline-block" }}>
                <Button variant="primary">
                  <Plus size={16} style={{ marginRight: 6 }} />
                  {isArabic ? "نشر أول إعلان مجاناً" : "Publier une annonce"}
                </Button>
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
              {myOccasions.map((ad) => (
                <div
                  key={ad.id}
                  style={{
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-card)",
                    padding: 20,
                    boxShadow: "var(--shadow-card)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <div style={{ display: "flex", gap: 14 }}>
                    <div style={{ width: 80, height: 80, borderRadius: 10, overflow: "hidden", background: "rgba(0,0,0,0.1)", flexShrink: 0 }}>
                      {ad.photos && ad.photos.length > 0 ? (
                        <img src={ad.photos[0]} alt={ad.model} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Package size={28} opacity={0.4} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.8rem", color: "#00A3FF", fontWeight: 600 }}>{ad.type} • {ad.brand}</div>
                      <h4 style={{ margin: "2px 0 4px", fontSize: "1.05rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ad.model}
                      </h4>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                        <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10b981" }}>
                          {ad.price.toFixed(2)} DT
                        </span>
                        <span style={{ fontSize: "0.75rem", background: "rgba(0,163,255,0.1)", color: "#00A3FF", padding: "2px 6px", borderRadius: 6 }}>
                          {ad.condition}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats and Views */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-bg-secondary)", padding: "10px 14px", borderRadius: 8, fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-secondary)" }}>
                      <Eye size={16} color="#00A3FF" />
                      <span><strong>{ad.views || 0}</strong> vues au total</span>
                    </div>
                    <span style={{ 
                      fontSize: "0.75rem", 
                      padding: "2px 8px", 
                      borderRadius: 12, 
                      fontWeight: 600,
                      background: ad.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)",
                      color: ad.status === "active" ? "#10b981" : "#f43f5e"
                    }}>
                      {ad.status === "active" ? "En ligne" : ad.status}
                    </span>
                  </div>

                  {/* Actions: Voir, Modifier Prix (Promo), Supprimer */}
                  <div style={{ display: "flex", gap: 8, borderTop: "1px dashed var(--color-border)", paddingTop: 12 }}>
                    <Link
                      to={`/shop/occasion/${ad.id}`}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "8px 12px",
                        fontSize: "0.85rem",
                        background: "rgba(0,163,255,0.08)",
                        color: "#00A3FF",
                        borderRadius: 8,
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      <ExternalLink size={14} />
                      Voir
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleOpenPriceModal(ad)}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "8px 12px",
                        fontSize: "0.85rem",
                        background: "rgba(139,92,246,0.1)",
                        color: "#8b5cf6",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      <Tag size={14} />
                      Prix / Promo
                    </button>

                    <button
                      type="button"
                      disabled={deletingAdId === ad.id}
                      onClick={() => handleDeleteAd(ad.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "8px 12px",
                        background: "rgba(244,63,94,0.1)",
                        color: "#f43f5e",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        opacity: deletingAdId === ad.id ? 0.5 : 1,
                      }}
                      title="Supprimer l'annonce"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Modifier Prix / Promo */}
        {editingPriceAd && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
            onClick={() => setEditingPriceAd(null)}
          >
            <div
              style={{
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: 16,
                padding: 24,
                width: "100%",
                maxWidth: 400,
                boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <Tag size={18} color="#8b5cf6" />
                  Modifier le prix
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingPriceAd(null)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", marginBottom: 16 }}>
                Définissez un nouveau prix ou appliquez une promotion pour votre annonce <strong>{editingPriceAd.model}</strong>.
              </p>

              <form onSubmit={handleSavePrice}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 8, color: "var(--color-text)" }}>
                    Nouveau Prix (DT)
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        borderRadius: 10,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface, #1e293b)",
                        color: "var(--color-text)",
                        outline: "none",
                      }}
                      placeholder="Ex: 850"
                      autoFocus
                    />
                    <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)", fontWeight: 700 }}>
                      DT
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <Button variant="secondary" type="button" onClick={() => setEditingPriceAd(null)}>
                    Annuler
                  </Button>
                  <Button variant="primary" type="submit" disabled={priceSaving}>
                    {priceSaving ? "Enregistrement..." : "Appliquer le prix"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
