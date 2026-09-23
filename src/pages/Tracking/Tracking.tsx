import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { repairStore } from "@/services/store";
import { RepairRequest } from "@/types/telelab";
import { Check, Truck, Phone, Search, Package, ArrowRight } from "lucide-react";
import "./Tracking.css";

const TIMELINE_STEPS = [
  { key: "new", title: "DEMANDE REÇUE", desc: "Votre demande a été enregistrée." },
  { key: "picked_up", title: "TÉLÉPHONE COLLECTÉ", desc: "Notre livreur a récupéré votre appareil." },
  { key: "received_at_shop", title: "DIAGNOSTIC", desc: "Votre téléphone a été examiné par notre technicien." },
  { key: "repair_in_progress", title: "RÉPARATION EN COURS", desc: "Notre technicien travaille actuellement sur votre appareil." },
  { key: "repair_ready", title: "RETOUR EN PRÉPARATION", desc: "Votre téléphone est prêt et sera remis au livreur." },
  { key: "delivered_to_customer", title: "LIVRÉ", desc: "Réparation terminée." }
];

const STATUS_MAP = {
  new: { label: "DEMANDE REÇUE", desc: "Votre demande est bien enregistrée en attente d'évaluation.", index: 0 },
  price_confirmed: { label: "PRIX CONFIRMÉ", desc: "L'équipe a confirmé le devis avec vous.", index: 0 },
  confirmed: { label: "DEMANDE VALIDÉE", desc: "Validation finale de l'intervention.", index: 0 },
  driver_assigned_pickup: { label: "LIVREUR EN ROUTE (COLLECTE)", desc: "Le coursier vient récupérer votre appareil.", index: 0 },
  pickup_in_delivery: { label: "COLLECTE EN COURS", desc: "Le coursier est en route vers vous.", index: 0 },
  picked_up: { label: "TÉLÉPHONE COLLECTÉ", desc: "Appareil pris en charge, acompte perçu.", index: 1 },
  received_at_shop: { label: "DIAGNOSTIC EN COURS", desc: "Votre appareil est arrivé à notre atelier.", index: 2 },
  repair_in_progress: { label: "RÉPARATION EN COURS", desc: "Votre appareil est actuellement dans notre atelier.", index: 3 },
  repair_ready: { label: "RÉPARATION TERMINÉE", desc: "Contrôle qualité validé, prêt pour la restitution.", index: 4 },
  driver_assigned_return: { label: "LIVREUR ASSIGNÉ", desc: "Un livreur a été assigné pour le retour.", index: 4 },
  return_in_delivery: { label: "EN COURS DE LIVRAISON", desc: "Votre téléphone réparé est actuellement en livraison.", index: 4 },
  delivered_to_customer: { label: "LIVRÉ", desc: "Restitution effectuée avec garantie.", index: 5 },
  cancelled: { label: "ANNULÉ", desc: "La demande a été annulée.", index: -1 }
};

function formatLastUpdate(request: RepairRequest): string {
  const history = request.statusHistory;
  if (!history || history.length === 0) return "";
  const lastEntry = history[history.length - 1];
  const lastDate = new Date(lastEntry.timestamp);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  return `il y a ${diffDays}j`;
}

export function Tracking() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlId = searchParams.get("id") || "";
  const [query, setQuery] = useState(urlId);
  const [request, setRequest] = useState<RepairRequest | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (urlId) {
      performSearch(urlId);
    }
  }, [urlId]);

  useEffect(() => {
    if (!request?.trackingNumber) return;
    const refreshTrackedRepair = () => {
      const updated = repairStore.getByTracking(request.trackingNumber);
      if (updated) setRequest(updated);
    };
    window.addEventListener("tele_lab_store_update", refreshTrackedRepair);
    return () => window.removeEventListener("tele_lab_store_update", refreshTrackedRepair);
  }, [request?.trackingNumber]);

  function performSearch(term: string) {
    if (!term.trim()) return;
    setIsSearching(true);
    setHasSearched(true);

    // Small delay for UX feel
    setTimeout(() => {
      let found = repairStore.getByTracking(term.trim());
      if (!found) {
        const byPhone = repairStore.getByPhone(term.trim());
        if (byPhone.length > 0) found = byPhone[0];
      }
      setRequest(found || null);
      setIsSearching(false);
    }, 400);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ id: query.trim() });
      performSearch(query);
    }
  }

  const currentStatusData = request ? STATUS_MAP[request.status as keyof typeof STATUS_MAP] || STATUS_MAP.new : STATUS_MAP.new;
  const currentIndex = currentStatusData.index;

  return (
    <main className="tl-tracking-page">
      <div className="tl-tracking-container">
        
        {/* Search Hero */}
        <div className={`tl-tracking-search-hero ${request ? "has-result" : ""}`}>
          <h1>SUIVEZ VOTRE RÉPARATION</h1>
          <p>Entrez votre numéro de suivi pour connaître l'état de votre appareil à chaque étape.</p>
          <form className="tl-tracking-search-form" onSubmit={handleSearchSubmit}>
            <div className="tl-tracking-input-wrap">
              <Search size={20} className="tl-tracking-input-icon" />
              <input
                type="text"
                className="tl-tracking-input"
                placeholder="Numéro de suivi (ex: TL-2026-000184)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="tl-tracking-btn" disabled={isSearching}>
              {isSearching ? "Recherche..." : "Suivre ma réparation →"}
            </button>
          </form>
        </div>

        {isSearching ? (
          <div className="tl-tracking-loading">
            <div className="tl-loading-spinner"></div>
            <p>Recherche en cours...</p>
          </div>
        ) : request ? (
          <div className="tl-tracking-dashboard">
            {/* Dashboard Header */}
            <div className="tl-dashboard-header">
              <div className="tl-dashboard-meta">
                <span className="tl-dashboard-update">Dernière mise à jour : {formatLastUpdate(request)}</span>
              </div>
              <div className="tl-dashboard-id">{request.trackingNumber}</div>
              <div className="tl-dashboard-device">{request.brand} {request.model}</div>
              <div className="tl-dashboard-repair">{request.problem}</div>
              
              <div className="tl-dashboard-status-box">
                <div className="tl-status-label">Statut actuel</div>
                <div className="tl-status-current">{currentStatusData.label}</div>
                <div className="tl-status-desc">{currentStatusData.desc}</div>
              </div>
            </div>

            <div className="tl-tracking-grid">
              {/* Left Column: Timeline */}
              <div className="tl-tracking-left">
                <div className="tl-timeline-card">
                  <div className="tl-6step-timeline">
                    <div 
                      className="tl-6step-timeline-progress" 
                      style={{ height: `${(Math.max(0, currentIndex) / 5) * 100}%` }}
                    ></div>
                    
                    {TIMELINE_STEPS.map((step, idx) => {
                      const isDone = idx < currentIndex;
                      const isCurrent = idx === currentIndex;
                      
                      return (
                        <div key={step.key} className={`tl-step ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}>
                          <div className="tl-step-node">
                            {isDone ? <Check size={20} /> : `0${idx + 1}`}
                          </div>
                          <div className="tl-step-content">
                            <div className="tl-step-title">{step.title}</div>
                            <div className="tl-step-desc">{step.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {["driver_assigned_pickup", "pickup_in_delivery", "driver_assigned_return", "return_in_delivery"].includes(request.status) && (
                  <div className="tl-tracking-delivery-note">
                    <Truck size={22} />
                    <div>
                      <h3>MISE À JOUR DE LIVRAISON</h3>
                      <p>Étape confirmée : <strong>{currentStatusData.label}</strong></p>
                      <p>Les prochaines mises à jour de votre prise en charge et de votre retour apparaîtront ici.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Details & Payment */}
              <div className="tl-side-cards">
                
                {/* Details Card */}
                <div className="tl-detail-card">
                  <h3>Détails de la réparation</h3>
                  <div className="tl-detail-row">
                    <span className="tl-detail-label">Appareil</span>
                    <span className="tl-detail-value">{request.brand} {request.model}</span>
                  </div>
                  <div className="tl-detail-row">
                    <span className="tl-detail-label">Problème</span>
                    <span className="tl-detail-value">{request.problem}</span>
                  </div>
                  {request.price && (
                    <div className="tl-detail-row" style={{ marginTop: "16px" }}>
                      <span className="tl-detail-label">Prix confirmé</span>
                      <span className="tl-detail-value tl-detail-highlight">{request.price} DT</span>
                    </div>
                  )}
                </div>

                {/* Payment Card */}
                {request.price && (
                  <div className="tl-payment-card">
                    <h3>Paiement</h3>
                    
                    <div className="tl-payment-bar-wrap">
                      <div className="tl-payment-bar">
                        <div 
                          className="tl-payment-fill" 
                          style={{ width: request.paymentStatus === "fully_paid" ? "100%" : request.paymentStatus === "deposit_paid" ? "30%" : "0%" }}
                        ></div>
                      </div>
                    </div>

                    <div className="tl-payment-legend">
                      <div className="tl-payment-part">
                        <span className="tl-part-pct">30 %</span>
                        <span className="tl-part-amt">{request.depositAmount} DT</span>
                        <span className={`tl-part-status ${["deposit_paid", "fully_paid"].includes(request.paymentStatus) ? "paid" : ""}`}>
                          {["deposit_paid", "fully_paid"].includes(request.paymentStatus) ? "Payé à la collecte" : "À la collecte"}
                        </span>
                      </div>
                      <div className="tl-payment-part right">
                        <span className="tl-part-pct">70 %</span>
                        <span className="tl-part-amt">{request.remainingAmount} DT</span>
                        <span className={`tl-part-status ${request.paymentStatus === "fully_paid" ? "paid" : ""}`}>
                          {request.paymentStatus === "fully_paid" ? "Payé à la livraison" : "À la livraison"}
                        </span>
                      </div>
                    </div>

                    <div className="tl-payment-total">
                      <span>Total:</span>
                      <span>{request.price} DT</span>
                    </div>
                  </div>
                )}

                {/* Support */}
                <div className="tl-support-card">
                  <h3>Besoin d'aide ?</h3>
                  <p>Une question concernant votre réparation ?</p>
                  <a 
                    href={`https://wa.me/21698123456?text=Bonjour%20Tele%20Lab,%20concernant%20${request.trackingNumber}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="tl-btn-outline"
                  >
                    Contacter Tele Lab →
                  </a>
                </div>

              </div>
            </div>
          </div>
        ) : hasSearched ? (
          <div className="tl-tracking-not-found">
            <div className="tl-not-found-icon">
              <Search size={48} />
            </div>
            <h2>Aucune réparation trouvée</h2>
            <p>Le numéro de suivi saisi ne correspond à aucune demande.<br />Vérifiez votre numéro et réessayez.</p>
            <Link to="/demande" className="tl-btn-outline">
              Créer une demande de réparation <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="tl-tracking-empty-state">
            <div className="tl-empty-features">
              <div className="tl-empty-feature">
                <div className="tl-empty-feature-icon">
                  <Search size={24} />
                </div>
                <h3>Suivi en temps réel</h3>
                <p>Consultez l'état de votre réparation à tout moment.</p>
              </div>
              <div className="tl-empty-feature">
                <div className="tl-empty-feature-icon">
                  <Package size={24} />
                </div>
                <h3>6 étapes claires</h3>
                <p>De la collecte à la livraison, suivez chaque étape.</p>
              </div>
              <div className="tl-empty-feature">
                <div className="tl-empty-feature-icon">
                  <Phone size={24} />
                </div>
                <h3>Support direct</h3>
                <p>Contactez-nous à tout moment via WhatsApp.</p>
              </div>
            </div>
            <div className="tl-empty-hint">
              <p>Votre numéro de suivi se trouve dans le SMS ou l'email de confirmation reçu lors de votre demande.</p>
            </div>
          </div>
        )}
        
      </div>
    </main>
  );
}
