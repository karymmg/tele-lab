import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  MessageCircle, 
  Eye, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  Tag, 
  Smartphone, 
  Laptop, 
  Gamepad2, 
  Share2, 
  AlertCircle,
  Copy,
  Check
} from "lucide-react";
import { occasionStore } from "@/services/occasionStore";
import { OccasionProduct } from "@/types/occasion";
import "./OccasionDetail.css";

export const OccasionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<OccasionProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function loadData() {
      setLoading(true);
      // Increment views
      await occasionStore.incrementViews(id!, true);

      // Fetch product
      const item = await occasionStore.fetchOccasionById(id!);
      if (isMounted) {
        setProduct(item);
        setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${product?.brand} ${product?.model} - Occasion TeleLab`,
        text: `Découvrez cette annonce : ${product?.brand} ${product?.model} à ${product?.price} DT sur TeleLab !`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const getCleanWhatsappNumber = (num: string) => {
    const cleaned = num.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("216")) return cleaned;
    if (cleaned.length === 8) return `216${cleaned}`;
    return cleaned;
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case "Téléphone":
        return <Smartphone size={16} />;
      case "PC":
        return <Laptop size={16} />;
      case "Console":
        return <Gamepad2 size={16} />;
      default:
        return <Tag size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="tl-occasion-detail-container">
        <div className="tl-detail-loading">
          <div className="tl-spinner"></div>
          <p>Chargement de l'annonce...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="tl-occasion-detail-container">
        <div className="tl-detail-not-found">
          <AlertCircle size={54} color="#f43f5e" />
          <h2>Annonce introuvable</h2>
          <p>Cette annonce a été retirée ou n'existe plus.</p>
          <Link to="/shop" className="tl-btn-back">
            <ArrowLeft size={18} /> Retour à la boutique
          </Link>
        </div>
      </div>
    );
  }

  const cleanPhone = getCleanWhatsappNumber(product.whatsappNumber);
  const whatsappMsg = encodeURIComponent(
    `Bonjour ! Je suis intéressé(e) par votre annonce "${product.brand} ${product.model}" à ${product.price} DT sur TeleLab.`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMsg}`;

  const photos = product.photos && product.photos.length > 0 
    ? product.photos 
    : ["/placeholder-device.png"];

  const formattedDate = product.createdAt 
    ? new Date(product.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="tl-occasion-detail-page">
      <div className="tl-detail-header-nav">
        <button onClick={() => navigate("/shop")} className="tl-nav-back-btn">
          <ArrowLeft size={18} />
          <span>Retour aux occasions</span>
        </button>

        <button onClick={handleShare} className="tl-nav-share-btn">
          {copied ? <Check size={18} color="var(--color-success)" /> : <Share2 size={18} />}
          <span>{copied ? "Lien copié !" : "Partager"}</span>
        </button>
      </div>

      <div className="tl-detail-grid">
        {/* Gallery Column */}
        <div className="tl-detail-gallery">
          <div className="tl-gallery-main">
            <img 
              src={photos[selectedPhotoIndex] || photos[0]} 
              alt={`${product.brand} ${product.model}`} 
              className="tl-gallery-main-img" 
            />
            <div className="tl-gallery-condition-badge">
              {product.condition}
            </div>
            {product.status === "sold" && (
              <div className="tl-gallery-sold-overlay">
                <span>VENDU</span>
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div className="tl-gallery-thumbnails">
              {photos.map((imgUrl, index) => (
                <button
                  key={index}
                  className={`tl-gallery-thumb-btn ${selectedPhotoIndex === index ? "active" : ""}`}
                  onClick={() => setSelectedPhotoIndex(index)}
                >
                  <img src={imgUrl} alt={`Aperçu ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="tl-detail-info">
          <div className="tl-detail-badges-row">
            <span className="tl-badge-pill">
              {getCategoryIcon(product.type)}
              {product.type}
            </span>
            <span className="tl-badge-pill outline">{product.brand}</span>
            <span className="tl-detail-views">
              <Eye size={16} />
              {product.views || 0} vues
            </span>
          </div>

          <h1 className="tl-detail-title">{product.model}</h1>

          <div className="tl-detail-price-box">
            <span className="tl-price-value">{product.price.toFixed(2)}</span>
            <span className="tl-price-currency">DT</span>
          </div>

          {/* Seller Card */}
          <div className="tl-seller-card">
            <div className="tl-seller-avatar">
              {(product.sellerName || "V").charAt(0).toUpperCase()}
            </div>
            <div className="tl-seller-details">
              <div className="tl-seller-header">
                <span className="tl-seller-name">{product.sellerName || "Vendeur TeleLab"}</span>
                {product.sellerVerified ? (
                  <span className="tl-verified-badge" title="Identité vérifiée par carte CIN">
                    <CheckCircle2 size={14} />
                    <span>✓ Vendeur vérifié</span>
                  </span>
                ) : (
                  <span className="tl-unverified-tag">Particulier</span>
                )}
              </div>
              <p className="tl-seller-sub">
                {product.sellerVerified 
                  ? "Identité vérifiée par carte d'identité nationale (CIN)" 
                  : "Membre de la communauté TeleLab"}
              </p>
            </div>
          </div>

          {/* Direct WhatsApp Contact CTA */}
          <div className="tl-contact-cta-wrapper">
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="tl-btn-whatsapp-cta"
            >
              <MessageCircle size={22} />
              <span>Contacter sur WhatsApp</span>
            </a>
            <div className="tl-contact-phone-hint">
              Numéro du vendeur : <strong>+216 {product.whatsappNumber}</strong>
            </div>
          </div>

          {/* Description */}
          <div className="tl-detail-section">
            <h3 className="tl-section-heading">Description détaillée</h3>
            <div className="tl-description-box">
              {product.description ? (
                <p>{product.description}</p>
              ) : (
                <p className="text-muted">Aucune description fournie par le vendeur.</p>
              )}
            </div>
          </div>

          {/* Attributes */}
          <div className="tl-detail-section">
            <h3 className="tl-section-heading">Caractéristiques</h3>
            <div className="tl-specs-grid">
              <div className="tl-spec-item">
                <span className="tl-spec-label">État général</span>
                <span className="tl-spec-val highlight">{product.condition}</span>
              </div>
              <div className="tl-spec-item">
                <span className="tl-spec-label">Marque</span>
                <span className="tl-spec-val">{product.brand}</span>
              </div>
              <div className="tl-spec-item">
                <span className="tl-spec-label">Catégorie</span>
                <span className="tl-spec-val">{product.type}</span>
              </div>
              {formattedDate && (
                <div className="tl-spec-item">
                  <span className="tl-spec-label">Publiée le</span>
                  <span className="tl-spec-val">{formattedDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Safety Notice */}
          <div className="tl-safety-card">
            <div className="tl-safety-icon">
              <ShieldCheck size={24} color="var(--color-primary-dark)" />
            </div>
            <div className="tl-safety-content">
              <h4>Conseils de sécurité TeleLab</h4>
              <ul>
                <li>Ne transférez jamais d'argent avant d'avoir vu et testé l'appareil.</li>
                <li>Privilégiez une remise en main propre dans un lieu public sécurisé.</li>
                <li>Vérifiez le compte iCloud / Google et assurez-vous qu'il est déconnecté.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
