import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useRepairRequests } from "@/services/store";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/services/auth";

export function CustomerDashboard() {
  const { i18n } = useTranslation();
  const requests = useRepairRequests();
  const { user } = useAuth();
  const isArabic = i18n.language === "ar";

  const userPhone = user?.username.replace(/[\s\-\+]/g, "") || "";
  const myRequests = requests.filter((r) => 
    r.customer.phone.replace(/[\s\-\+]/g, "").includes(userPhone)
  );

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
              + {isArabic ? "طلب إصلاح جديد" : "Nouvelle demande de réparation"}
            </Button>
          </Link>
        </div>

        <h2 style={{ fontSize: "1.3rem", marginBottom: 20 }}>
          {isArabic ? "أجهزتي قيد الإصلاح والسابقة" : "Mes appareils"}
        </h2>

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
      </div>
    </main>
  );
}
