import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMyRepairRequests } from "@/services/store";
import { useMyOrders } from "@/services/orderStore";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/services/auth";
import { ShoppingBag, Package, Plus, Wrench, ArrowRight } from "lucide-react";

export function CustomerDashboard() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { myRequests, loading: loadingRepairs } = useMyRepairRequests();
  const { myOrders, loading: loadingOrders } = useMyOrders();
  const isArabic = i18n.language === "ar";
  
  const loading = loadingRepairs || loadingOrders;

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
      </div>
    </main>
  );
}
