import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Smartphone,
  Battery,
  Home as HomeIcon,
  Headphones,
  CheckCircle,
  Search,
  Wrench,
  ArrowRight,
  Clock,
  PhoneCall,
  Truck,
  Star,
  Store,
  Package,
  ShoppingBag,
  Shield,
  Cpu,
  Monitor,
} from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useParallax } from "@/hooks/useParallax";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { CircuitBackground } from "@/components/ui/CircuitBackground";
import "./Home.css";

/* ── Static data ──────────────────────────────────────────────────────────── */

const REPAIR_SERVICES = [
  { icon: Smartphone, title: "Écran LCD / OLED", desc: "Remplacement d'écran toutes marques" },
  { icon: Battery,    title: "Batterie & Charge", desc: "Batterie, connecteurs & ports" },
  { icon: Cpu,        title: "Micro-soudure", desc: "Réparations au niveau carte mère" },
  { icon: Headphones, title: "Support 24/7", desc: "Réponse en moins de 15 min" },
];

const SHOP_CATEGORIES = [
  { icon: ShoppingBag, title: "Coques & Protection", desc: "Cases, anti-cass, films" },
  { icon: Battery,     title: "Chargeurs & Câbles", desc: "Originaux et compatibles" },
  { icon: Headphones,  title: "AirPods & Speakers", desc: "Audio haute qualité" },
  { icon: Monitor,     title: "Occasion", desc: "Téléphones, PC, Consoles", highlight: true },
];

const STEPS = [
  { icon: Search,      key: 1, side: "left"  },
  { icon: PhoneCall,   key: 2, side: "right" },
  { icon: Truck,       key: 3, side: "left"  },
  { icon: Wrench,      key: 4, side: "right" },
  { icon: Truck,       key: 5, side: "left"  },
  { icon: CheckCircle, key: 6, side: "right" },
] as const;
/* ── Hero slides ────────────────────────────────────────────────────────── */

const DEFAULT_HERO_SLIDES = [
  { src: "/hero_repair.jpg", alt: "Réparation professionnelle", badge: "LABO TECHNIQUE", icon: <Wrench size={18} /> },
  { src: "/hero_repair_tech.jpg", alt: "Micro-soudure de précision", badge: "MICRO-SOUDURE", icon: <Cpu size={18} /> },
  { src: "/hero_marketplace.jpg", alt: "Marché de l'occasion", badge: "OCCASION", icon: <Store size={18} /> },
  { src: "/hero_accessories.jpg", alt: "Accessoires premium", badge: "ACCESSOIRES", icon: <ShoppingBag size={18} /> },
];

/* ── Component ───────────────────────────────────────────────────────────── */

export function Home() {
  const { t } = useTranslation();

  // Scroll hooks
  useScrollReveal();
  useParallax(".tl-hero__img.is-active", 0.12);
  useScrollProgress();

  // Hero carousel
  const heroSlides = DEFAULT_HERO_SLIDES;
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <main className="tl-home">
      {/* Scroll progress bar */}
      <div className="tl-scroll-bar" aria-hidden="true" />

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="tl-hero">
        <div className="tl-hero__glow" aria-hidden="true" />
        {/* CircuitBackground removed per user request (blanc ma fiha chy) */}
        <div className="container tl-hero__inner">

          {/* Copy */}
          <div className="tl-hero__copy">
            <div className="tl-eyebrow animate-in">
              <span className="tl-eyebrow__line" />
              <span>{t("hero.eyebrow")}</span>
            </div>

            <h1 className="tl-hero__title animate-in delay-1">
              <span>Réparation Rapide</span>
              <span className="tl-hero__title-accent">
                & Boutique Tech
              </span>
            </h1>

            <p className="tl-hero__subtitle animate-in delay-2" style={{ fontSize: 17, maxWidth: 600, lineHeight: 1.6 }}>
              <strong>Réparation de téléphones à domicile</strong> avec déplacement <span style={{ color: "var(--color-primary-dark)", fontWeight: 700 }}>100% Gratuit</span>.<br/>
              Découvrez aussi notre <strong>Boutique</strong> de smartphones d'occasion et accessoires (Livraison : 7 DT).
            </p>

            {/* Two CTA buttons — Repair + Shop */}
            <div className="tl-hero__ctas animate-in delay-3">
              <Link to="/demande">
                <button className="tl-btn-primary">
                  <Wrench size={18} /> {t("hero.ctaPrimary")}
                </button>
              </Link>
              <Link to="/shop">
                <button className="tl-btn-shop">
                  <Store size={18} /> Visiter la Boutique
                </button>
              </Link>
            </div>

            <div className="tl-hero__badges animate-in delay-4">
              <span className="tl-badge"><Star size={13} /> {t("hero.badge")}</span>
              <span className="tl-badge"><Shield size={13} /> {t("trustBar.warranty")}</span>
              <span className="tl-badge"><Store size={13} /> Boutique en ligne</span>
              <span className="tl-badge"><Truck size={13} /> {t("trustBar.payment")}</span>
            </div>
          </div>

          {/* Visual — Carousel */}
          <div className="tl-hero__visual animate-in delay-2">
            <div className="tl-hero__img-frame">
              {heroSlides.map((slide, i) => (
                <img
                  key={i}
                  src={slide.src}
                  alt={slide.alt}
                  className={`tl-hero__img ${i === currentSlide ? "is-active" : ""}`}
                />
              ))}
              <div className="tl-hero__img-overlay" />
              <div className="tl-hero__img-badge">
                {heroSlides[currentSlide].icon}
                <span>{heroSlides[currentSlide].badge}</span>
              </div>
              {/* Dots */}
              <div className="tl-hero__dots">
                {heroSlides.map((_, i) => (
                  <button
                    key={i}
                    className={`tl-hero__dot ${i === currentSlide ? "is-active" : ""}`}
                    onClick={() => setCurrentSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── DUAL PURPOSE BANNER (Main Choice) ───────────────────────── */}
      <section className="tl-dual-banner">
        <div className="container">
          <div className="tl-dual-grid">
            <Link to="/demande" className="tl-dual-card tl-dual-card--repair reveal-left">
              <div className="tl-dual-card__icon">
                <Wrench size={48} />
              </div>
              <div className="tl-dual-card__content">
                <h2>Réparation</h2>
                <p>Mon appareil est en panne. (Écrans, batteries, micro-soudure à domicile)</p>
              </div>
              <ArrowRight size={28} className="tl-dual-card__arrow" />
            </Link>
            <Link to="/shop" className="tl-dual-card tl-dual-card--shop reveal-right">
              <div className="tl-dual-card__icon tl-dual-card__icon--shop">
                <Store size={48} />
              </div>
              <div className="tl-dual-card__content">
                <h2>Boutique</h2>
                <p>Je veux acheter ou vendre. (Neuf, occasion, accessoires)</p>
              </div>
              <ArrowRight size={28} className="tl-dual-card__arrow" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── SERVICES — Repair ─────────────────────────────────────────── */}
      <section id="services" className="tl-section container">
        <div className="tl-section__header reveal">
          <div className="tl-eyebrow">
            <span className="tl-eyebrow__line" />
            <span>RÉPARATION</span>
          </div>
          <h2>RÉPARATION PROFESSIONNELLE</h2>
          <p className="tl-section__subtitle">
            Nos techniciens experts réparent votre appareil à domicile avec des pièces de qualité et une garantie de 3 mois.
          </p>
        </div>

        <div className="tl-services-grid stagger">
          {REPAIR_SERVICES.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="tl-service-card reveal">
              <div className="tl-service-card__top">
                <Icon className="tl-service-card__icon" size={28} />
                <ArrowRight className="tl-service-card__arrow" size={18} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── SERVICES — Shop ──────────────────────────────────────────── */}
      <section className="tl-section tl-how-bg">
        <div className="container">
          <div className="tl-section__header reveal">
            <div className="tl-eyebrow tl-eyebrow--shop">
              <span className="tl-eyebrow__line" />
              <span>BOUTIQUE</span>
            </div>
            <h2>ACCESSOIRES & MARCHÉ DE L'OCCASION</h2>
            <p className="tl-section__subtitle">
              Achetez des accessoires neufs premium ou trouvez des appareils d'occasion à des prix imbattables. Vous pouvez aussi vendre votre ancien appareil !
            </p>
          </div>

          <div className="tl-services-grid stagger">
            {SHOP_CATEGORIES.map(({ icon: Icon, title, desc, highlight }) => (
              <article
                key={title}
                className={`tl-service-card reveal${highlight ? " tl-service-card--shop-highlight" : ""}`}
              >
                <div className="tl-service-card__top">
                  <Icon className="tl-service-card__icon tl-service-card__icon--shop" size={28} />
                  <ArrowRight className="tl-service-card__arrow" size={18} />
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>

          <div className="tl-shop-cta-row reveal" style={{ marginTop: 48, textAlign: "center" }}>
            <Link to="/shop">
              <button className="tl-btn-shop" style={{ padding: "16px 40px", fontSize: 16 }}>
                <Store size={20} /> Explorer la Boutique
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE — vertical alternating timeline ────────── */}
      <section id="how-it-works" className="tl-section">
        <div className="container">
          <div className="tl-section__header reveal" style={{ textAlign: "center", maxWidth: "none" }}>
            <div className="tl-eyebrow" style={{ justifyContent: "center" }}>
              <span className="tl-eyebrow__line" />
              <span>PROCESSUS</span>
              <span className="tl-eyebrow__line" />
            </div>
            <h2>{t("howItWorks.title")}</h2>
            <p className="tl-section__subtitle">{t("howItWorks.subtitle")}</p>
          </div>

          {/* Vertical alternating timeline */}
          <div className="tl-vtimeline">
            {/* Center spine */}
            <div className="tl-vtimeline__spine" aria-hidden="true" />

            {STEPS.map(({ icon: Icon, key: step, side }) => (
              <div
                key={step}
                className={`tl-vtimeline__row tl-vtimeline__row--${side}`}
              >
                {/* Card */}
                <div className={`tl-vtimeline__card reveal-${side === "left" ? "left" : "right"}`}>
                  <div className="tl-vtimeline__card-icon">
                    <Icon size={22} />
                  </div>
                  <div className="tl-vtimeline__card-body">
                    <h3>{t(`howItWorks.step${step}Title`)}</h3>
                    <p>{t(`howItWorks.step${step}Text`)}</p>
                  </div>
                </div>

                {/* Node on spine */}
                <div className="tl-vtimeline__node reveal">
                  <span className="tl-vtimeline__num">0{step}</span>
                </div>

                {/* Spacer (opposite side) */}
                <div className="tl-vtimeline__spacer" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVRAISON GRATUITE ────────────────────────────────────────── */}
      <section className="tl-section container">
        <div className="tl-delivery reveal-scale">
          <div className="tl-delivery__img-col reveal-left">
            <img
              src="/delivery_van.jpg"
              alt="Livraison Tele Lab à domicile"
              className="tl-delivery__img"
            />
          </div>
          <div className="tl-delivery__content reveal-right">
            <div className="tl-eyebrow">
              <span className="tl-eyebrow__line" />
              <span>LIVRAISON</span>
            </div>
            <h2>{t("delivery.title")}</h2>
            <p>{t("delivery.text")}</p>
            <div className="tl-delivery__steps">
              {["COLLECTE À DOMICILE", "RÉPARATION EN ATELIER", "RETOUR À DOMICILE"].map((s) => (
                <span key={s} className="tl-pill"><CheckCircle size={13} /> {s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PAIEMENT 30 / 70 ──────────────────────────────────────────── */}
      <section id="pricing" className="tl-section tl-how-bg">
        <div className="container">
          <div className="tl-section__header reveal">
            <div className="tl-eyebrow">
              <span className="tl-eyebrow__line" />
              <span>TARIFICATION</span>
            </div>
            <h2>{t("payment.title")}</h2>
          </div>

          <div className="tl-payment">
            <div className="tl-payment__cards">
              <div className="tl-payment__card tl-payment__card--30 reveal-left">
                <span className="tl-payment__pct">30%</span>
                <div>
                  <h3>{t("payment.depositTitle")}</h3>
                  <p>{t("payment.depositText")}</p>
                </div>
              </div>

              <div className="tl-payment__divider reveal">
                <div className="tl-payment__bar">
                  <div className="tl-payment__bar-fill" />
                </div>
                <div className="tl-payment__bar-labels">
                  <span>À la collecte</span>
                  <span>À la livraison</span>
                </div>
              </div>

              <div className="tl-payment__card tl-payment__card--70 reveal-right">
                <span className="tl-payment__pct">70%</span>
                <div>
                  <h3>{t("payment.remainingTitle")}</h3>
                  <p>{t("payment.remainingText")}</p>
                </div>
              </div>
            </div>

            <div className="tl-payment__example reveal-scale">
              <p className="tl-payment__example-label">{t("payment.example")} — 180 DT</p>
              <div className="tl-payment__example-row">
                <span>30%</span><span className="tl-payment__example-val">54 DT</span>
              </div>
              <div className="tl-payment__example-row">
                <span>70%</span><span className="tl-payment__example-val">126 DT</span>
              </div>
              <div className="tl-payment__example-divider" />
              <div className="tl-payment__example-row tl-payment__example-total">
                <span>{t("payment.total")}</span><span>180 DT</span>
              </div>
              <p className="tl-payment__note">
                <Search size={13} />
                {t("payment.confirmNote")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────── */}
      <section className="tl-section container">
        <div className="tl-stats stagger">
          <div className="tl-stat reveal">
            <Wrench className="tl-stat__icon" size={36} />
            <span className="tl-stat__value">500+</span>
            <span className="tl-stat__label">{t("stats.repairs")}</span>
          </div>
          <div className="tl-stat reveal">
            <CheckCircle className="tl-stat__icon" size={36} />
            <span className="tl-stat__value">98%</span>
            <span className="tl-stat__label">{t("stats.satisfaction")}</span>
          </div>
          <div className="tl-stat reveal">
            <Clock className="tl-stat__icon" size={36} />
            <span className="tl-stat__value">30 min</span>
            <span className="tl-stat__label">{t("stats.avgTime")}</span>
          </div>
          <div className="tl-stat reveal">
            <Store className="tl-stat__icon" size={36} style={{ color: "var(--color-purple)" }} />
            <span className="tl-stat__value">200+</span>
            <span className="tl-stat__label" style={{ color: "var(--color-purple)" }}>PRODUITS EN BOUTIQUE</span>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
      <section id="contact" className="tl-section container">
        <div className="tl-final-cta reveal-scale">
          <div className="tl-final-cta__glow" aria-hidden="true" />
          <h2>{t("finalCta.title")}</h2>
          <p>Réparation à domicile ou shopping en ligne — on est là pour vous.</p>
          <div className="tl-final-cta__btns">
            <Link to="/demande">
              <button className="tl-btn-primary"><Wrench size={18} /> {t("finalCta.button")}</button>
            </Link>
            <Link to="/shop">
              <button className="tl-btn-shop"><Store size={18} /> Boutique</button>
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
