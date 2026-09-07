import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { RepairType, RepairRequest } from "@/types/telelab";
import {
  POPULAR_BRANDS,
  REPAIR_PROBLEMS,
  TUNISIAN_GOVERNORATES,
} from "@/data/telelabData";
import { repairStore } from "@/services/store";
import { registerUser } from "@/services/auth";
import "./RepairRequestForm.css";

interface FormData {
  repairType: RepairType;
  brand: string;
  model: string;
  customBrand: string;
  customModel: string;
  problem: string;
  problemDescription: string;
  photos: string[];
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  createAccount: boolean;
  governorate: string;
  city: string;
  zone: string;
  address: string;
  complement: string;
  latitude?: number;
  longitude?: number;
  password?: string;
}

const INITIAL_FORM: FormData = {
  repairType: "hardware",
  brand: "Apple",
  model: "",
  customBrand: "",
  customModel: "",
  problem: "Écran fissuré / cassé / affichage noir",
  problemDescription: "",
  photos: [],
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  createAccount: false,
  governorate: "Tunis",
  city: "Tunis Centre",
  zone: "",
  address: "",
  complement: "",
  password: "",
};

export function RepairRequestForm() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === "ar";

  const [step, setStep] = useState<number>(0);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [isLocating, setIsLocating] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<RepairRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedBrandObj = POPULAR_BRANDS.find(
    (b) => b.name.toLowerCase() === formData.brand.toLowerCase()
  );

  const availableModels = selectedBrandObj ? selectedBrandObj.popularModels : [];

  const selectedGovObj = TUNISIAN_GOVERNORATES.find(
    (g) => g.name === formData.governorate
  );

  const availableCities = selectedGovObj ? selectedGovObj.cities : [];

  // Geolocation handler
  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      alert(isArabic ? "المتصفح لا يدعم تحديد الموقع" : "La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        setFormData((prev) => ({
          ...prev,
          latitude,
          longitude,
          complement: prev.complement
            ? `${prev.complement} (GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
            : `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        }));
      },
      (error) => {
        setIsLocating(false);
        console.warn("Geolocation error", error);
        alert(
          isArabic
            ? "تعذر تحديد الموقع تلقائياً. الرجاء ملء الحقول يدوياً."
            : "Impossible de déterminer votre position automatiquement. Veuillez remplir l'adresse manuellement."
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Photo upload simulation (FileReader to base64)
  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 4 - formData.photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData((prev) => ({
            ...prev,
            photos: [...prev.photos, event.target!.result as string],
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index: number) {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }

  // Step validations
  function validateStep(currentStep: number): boolean {
    setErrorMsg("");

    if (currentStep === 1) {
      const finalBrand = formData.brand === "OTHER" ? formData.customBrand : formData.brand;
      const finalModel = formData.model || formData.customModel;
      if (!finalBrand.trim()) {
        setErrorMsg(isArabic ? "الرجاء تحديد الماركة" : "Veuillez sélectionner ou renseigner la marque.");
        return false;
      }
      if (!finalModel.trim()) {
        setErrorMsg(isArabic ? "الرجاء كتابة موديل الهاتف" : "Veuillez préciser le modèle de votre téléphone.");
        return false;
      }
      if (!formData.problem.trim() && !formData.problemDescription.trim()) {
        setErrorMsg(isArabic ? "الرجاء تحديد المشكلة أو وصفها" : "Veuillez préciser la panne.");
        return false;
      }
    }

    if (currentStep === 2) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setErrorMsg(isArabic ? "الرجاء إدخال الاسم واللقب" : "Veuillez renseigner votre prénom et votre nom.");
        return false;
      }
      
      const phoneRegex = /^[0-9+\s\-]{8,15}$/;
      if (!formData.phone.trim() || !phoneRegex.test(formData.phone)) {
        setErrorMsg(isArabic ? "الرجاء إدخال رقم هاتف صحيح (8 أرقام على الأقل)" : "Veuillez saisir un numéro de téléphone valide (ex: 22 123 456).");
        return false;
      }

      if (formData.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          setErrorMsg(isArabic ? "الرجاء إدخال بريد إلكتروني صحيح" : "Veuillez saisir une adresse email valide.");
          return false;
        }
      }

      if (formData.createAccount && (!formData.password || formData.password.length < 6)) {
        setErrorMsg(isArabic ? "كلمة المرور يجب أن تتكون من 6 أحرف على الأقل" : "Le mot de passe doit contenir au moins 6 caractères.");
        return false;
      }
    }

    if (currentStep === 3) {
      if (!formData.governorate.trim() || !formData.address.trim()) {
        setErrorMsg(isArabic ? "الرجاء ملء الولاية والعنوان" : "Veuillez renseigner votre gouvernorat et votre adresse.");
        return false;
      }
    }

    return true;
  }

  function handleNext() {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  }

  function handlePrev() {
    setErrorMsg("");
    setStep((prev) => Math.max(0, prev - 1));
  }

  async function handleSubmit() {
    const finalBrand = formData.brand === "OTHER" ? formData.customBrand : formData.brand;
    const finalModel = formData.model || formData.customModel;

    const newReq = repairStore.create({
      repairType: formData.repairType,
      brand: finalBrand,
      model: finalModel,
      problem: formData.problem,
      problemDescription: formData.problemDescription,
      photos: formData.photos,
      customer: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
      },
      address: {
        governorate: formData.governorate,
        city: formData.city,
        zone: formData.zone,
        address: formData.address,
        complement: formData.complement,
        latitude: formData.latitude,
        longitude: formData.longitude,
      },
    });

    if (formData.createAccount && formData.password) {
      await registerUser(
        formData.phone,
        formData.password,
        "customer",
        `${formData.firstName} ${formData.lastName}`
      );
    }

    setCreatedRequest(newReq);
  }

  function copyTrackingNumber() {
    if (!createdRequest) return;
    navigator.clipboard.writeText(createdRequest.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // Render Confirmation Screen
  if (createdRequest) {
    return (
      <div className="tl-form-container">
        <div className="tl-form-card tl-success-card">
          <div className="tl-success-icon">✓</div>
          <h2>{isArabic ? "تم إرسال طلبك بنجاح!" : "Votre demande a été envoyée avec succès !"}</h2>
          <p style={{ marginTop: 8, color: "var(--color-text-secondary)" }}>
            {isArabic
              ? "سيتصل بك فريق تيلي لاب هاتفياً لتأكيد التفاصيل وتحديد السعر النهائي."
              : "Notre équipe Tele Lab va vous contacter par téléphone pour confirmer la panne et convenir du prix."}
          </p>

          <div className="tl-tracking-badge-box">
            <span>{createdRequest.trackingNumber}</span>
            <button
              type="button"
              className="tl-tracking-copy-btn"
              onClick={copyTrackingNumber}
            >
              {copied ? (isArabic ? "تم النسخ!" : "Copié !") : (isArabic ? "نسخ" : "Copier")}
            </button>
          </div>

          <div className="tl-notice-box" style={{ textAlign: "start", margin: "20px auto", maxWidth: 500 }}>
            <span>💬</span>
            <div>
              <strong>{isArabic ? "إشعار واتساب" : "Notification WhatsApp"}</strong>
              <p style={{ margin: 0, fontSize: "0.85rem" }}>
                {isArabic
                  ? `سيتم إرسال رسالة برابط التتبع إلى الرقم ${createdRequest.customer.phone}.`
                  : `Un SMS / message WhatsApp contenant le lien de suivi a été généré pour le ${createdRequest.customer.phone}.`}
              </p>
            </div>
          </div>

          <div className="tl-success-actions">
            <Button
              variant="primary"
              onClick={() => navigate(`/tracking?id=${createdRequest.trackingNumber}`)}
            >
              {isArabic ? "تتبع إصلاحي الآن" : "Suivre ma réparation →"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setCreatedRequest(null);
                setFormData(INITIAL_FORM);
                setStep(0);
              }}
            >
              {isArabic ? "طلب جديد" : "Faire une autre demande"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stepTitles = [
    isArabic ? "النوع" : "Type",
    isArabic ? "الجهاز" : "Appareil",
    isArabic ? "العميل" : "Client",
    isArabic ? "العنوان" : "Adresse",
    isArabic ? "التأكيد" : "Récapitulatif",
  ];

  return (
    <div className="tl-form-container">
      {/* Stepper Header */}
      <div className="tl-stepper">
        {stepTitles.map((title, idx) => (
          <div
            key={idx}
            className={`tl-stepper-item ${idx === step ? "is-active" : ""} ${
              idx < step ? "is-completed" : ""
            }`}
          >
            <div className="tl-stepper-bubble">
              {idx < step ? "✓" : idx}
            </div>
            <span className="tl-stepper-label">{title}</span>
          </div>
        ))}
      </div>

      <div className="tl-form-card">
        {/* Step 0: Type de réparation */}
        {step === 0 && (
          <div>
            <div className="tl-form-card__header">
              <h2>{t("form.typeTitle")}</h2>
              <p>{isArabic ? "حدد طبيعة العطل لمساعدتنا في توجيه طلبك." : "Sélectionnez la catégorie du problème pour votre téléphone."}</p>
            </div>

            <div className="tl-type-grid">
              <div
                className={`tl-type-card ${formData.repairType === "hardware" ? "is-selected" : ""}`}
                onClick={() => setFormData({ ...formData, repairType: "hardware" })}
              >
                <span className="tl-type-card__icon">📱</span>
                <h3>{t("form.hardware")}</h3>
                <p>{t("form.hardwareDesc")} ({isArabic ? "شاشة، بطارية، منفذ شحن، كاميرا..." : "Écran, batterie, chargeur, caméra, eau..."})</p>
              </div>

              <div
                className={`tl-type-card ${formData.repairType === "software" ? "is-selected" : ""}`}
                onClick={() => setFormData({ ...formData, repairType: "software" })}
              >
                <span className="tl-type-card__icon">💻</span>
                <h3>{t("form.software")}</h3>
                <p>{t("form.softwareDesc")} ({isArabic ? "بلوكاج، ريست، تحديث، فورماتاج..." : "Blocage logo, réinitialisation, mise à jour, bugs..."})</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Téléphone & Problème */}
        {step === 1 && (
          <div>
            <div className="tl-form-card__header">
              <h2>{isArabic ? "معلومات الهاتف والعطل" : "Votre Téléphone & La Panne"}</h2>
              <p>{isArabic ? "حدد الماركة والموديل ونوع العطل بدقة." : "Choisissez la marque, le modèle et la panne constatée."}</p>
            </div>

            <div className="tl-form-row">
              <div className="tl-form-group">
                <label>{t("form.brand")} *</label>
                <select
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brand: e.target.value,
                      model: "",
                    })
                  }
                >
                  {POPULAR_BRANDS.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                  <option value="OTHER">{isArabic ? "أخرى (ماركة غير مدرجة)" : "Autre marque..."}</option>
                </select>
              </div>

              {formData.brand === "OTHER" ? (
                <div className="tl-form-group">
                  <label>{isArabic ? "اسم الماركة" : "Précisez la marque"} *</label>
                  <input
                    type="text"
                    placeholder="Ex: Realme, Motorola, Vivo..."
                    value={formData.customBrand}
                    onChange={(e) => setFormData({ ...formData, customBrand: e.target.value })}
                  />
                </div>
              ) : (
                <div className="tl-form-group">
                  <label>{t("form.model")} *</label>
                  <input
                    list="models-datalist"
                    placeholder={isArabic ? "مثال: iPhone 13, Galaxy S23..." : "Ex: iPhone 13, Galaxy S23..."}
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                  <datalist id="models-datalist">
                    {availableModels.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              )}
            </div>

            <div className="tl-form-group">
              <label>{t("form.problem")} *</label>
              <div className="tl-problem-grid">
                {REPAIR_PROBLEMS.filter(
                  (p) => p.type === "both" || p.type === formData.repairType
                ).map((p) => {
                  const label = isArabic ? p.nameAr : p.nameFr;
                  const isSelected = formData.problem === label;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      className={`tl-problem-btn ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setFormData({ ...formData, problem: label })}
                    >
                      <span>{p.icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="tl-form-group" style={{ marginTop: 14 }}>
              <label>{t("form.problemDescribe")}</label>
              <textarea
                rows={3}
                placeholder={
                  isArabic
                    ? "أضف أي تفاصيل إضافية عن العطل لمساعدة الفني..."
                    : "Expliquez comment est survenue la panne (chute, eau, mise à jour, comportement anormal)..."
                }
                value={formData.problemDescription}
                onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
              />
            </div>

            {/* Photos Upload Section */}
            <div className="tl-form-group">
              <label>{t("form.photos")} ({formData.photos.length}/4 max)</label>
              <div
                className="tl-photo-upload-area"
                onClick={() => document.getElementById("photo-input")?.click()}
              >
                <span style={{ fontSize: "2rem" }}>📷</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>
                  {isArabic ? "انقر لالتقاط صورة أو اختيارها من المعرض" : "Cliquez pour prendre une photo ou choisir depuis la galerie"}
                </p>
                <small style={{ color: "var(--color-text-secondary)" }}>
                  {isArabic ? "الصور تساعد الفني في تحديد القطع المطلوبة مسبقاً" : "Aide le technicien à évaluer l'état visuel et préparer les pièces"}
                </small>
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={handlePhotoUpload}
                />
              </div>

              {formData.photos.length > 0 && (
                <div className="tl-photo-preview-grid">
                  {formData.photos.map((photo, i) => (
                    <div key={i} className="tl-photo-thumb">
                      <img src={photo} alt={`Photo ${i + 1}`} />
                      <button type="button" onClick={() => removePhoto(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Coordonnées Client */}
        {step === 2 && (
          <div>
            <div className="tl-form-card__header">
              <h2>{isArabic ? "معلومات الاتصال" : "Vos Coordonnées"}</h2>
              <p>{isArabic ? "للتواصل معك وتأكيد الطلب عبر الهاتف والواتساب." : "Nous vous appelons pour confirmer le devis et planifier la collecte."}</p>
            </div>

            <div className="tl-form-row">
              <div className="tl-form-group">
                <label>{t("form.firstName")} *</label>
                <input
                  type="text"
                  placeholder="Ex: Karim"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="tl-form-group">
                <label>{t("form.lastName")} *</label>
                <input
                  type="text"
                  placeholder="Ex: Ben Mahmoud"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="tl-form-row">
              <div className="tl-form-group">
                <label>{t("form.phone")} (WhatsApp) *</label>
                <input
                  type="tel"
                  placeholder="Ex: +216 98 123 456"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="tl-form-group">
                <label>Email ({isArabic ? "اختياري" : "Optionnel"})</label>
                <input
                  type="email"
                  placeholder="Ex: karim@example.tn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.95rem" }}>
                <input
                  type="checkbox"
                  checked={formData.createAccount}
                  onChange={(e) => setFormData({ ...formData, createAccount: e.target.checked })}
                />
                <span>{t("form.createAccount")} ({isArabic ? "للوصول إلى لوحة التحكم وسجل الإصلاحات" : "pour suivre vos garanties et l'historique de vos appareils"})</span>
              </label>
            </div>

            {formData.createAccount && (
              <div className="tl-form-group" style={{ marginTop: 16 }}>
                <label>{isArabic ? "كلمة المرور" : "Mot de passe"} *</label>
                <input
                  type="password"
                  placeholder={isArabic ? "6 أحرف على الأقل" : "Au moins 6 caractères"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Adresse & Géolocalisation */}
        {step === 3 && (
          <div>
            <div className="tl-form-card__header">
              <h2>{isArabic ? "عنوان الاستلام والتسليم" : "Adresse de Récupération"}</h2>
              <p>{isArabic ? "التوصيل مجاني تماماً — عون التوصيل يأتي إلى باب منزلك." : "La livraison est 100% gratuite. Le livreur vient récupérer votre appareil à domicile."}</p>
            </div>

            <button
              type="button"
              className="tl-gps-btn"
              disabled={isLocating}
              onClick={handleUseCurrentLocation}
            >
              <span>📍</span>
              <span>{isLocating ? (isArabic ? "جاري التحديد..." : "Localisation en cours...") : t("form.useLocation")}</span>
            </button>

            <div className="tl-form-row">
              <div className="tl-form-group">
                <label>{t("form.governorate")} *</label>
                <select
                  value={formData.governorate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      governorate: e.target.value,
                      city: TUNISIAN_GOVERNORATES.find((g) => g.name === e.target.value)?.cities[0] || "",
                    })
                  }
                >
                  {TUNISIAN_GOVERNORATES.map((gov) => (
                    <option key={gov.name} value={gov.name}>
                      {gov.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tl-form-group">
                <label>{t("form.city")} *</label>
                <input
                  list="cities-datalist"
                  placeholder="Ex: La Marsa, Menzah 6..."
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
                <datalist id="cities-datalist">
                  {availableCities.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="tl-form-group">
              <label>{t("form.address")} *</label>
              <input
                type="text"
                placeholder={isArabic ? "الشارع، رقم العمارة أو المنزل..." : "Ex: 14 Rue des Jasmins, Immeuble Les Palmiers"}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="tl-form-group">
              <label>{t("form.addressComplement")}</label>
              <input
                type="text"
                placeholder={isArabic ? "نقاط دالة، الطابق، رقم الشقة..." : "Étage, digicode, point de repère à proximité..."}
                value={formData.complement}
                onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Step 4: Récapitulatif */}
        {step === 4 && (
          <div>
            <div className="tl-form-card__header">
              <h2>{t("form.summaryTitle")}</h2>
              <p>{isArabic ? "يرجى مراجعة تفاصيل طلبك قبل الإرسال." : "Vérifiez vos informations avant validation définitive."}</p>
            </div>

            <div className="tl-summary-card">
              <div className="tl-summary-item">
                <span className="tl-summary-label">{isArabic ? "الجهاز" : "Appareil"} :</span>
                <span className="tl-summary-value">
                  {formData.brand === "OTHER" ? formData.customBrand : formData.brand} — {formData.model || formData.customModel}
                </span>
              </div>

              <div className="tl-summary-item">
                <span className="tl-summary-label">{isArabic ? "نوع الإصلاح" : "Catégorie"} :</span>
                <span className="tl-summary-value">
                  {formData.repairType === "hardware" ? t("form.hardware") : t("form.software")}
                </span>
              </div>

              <div className="tl-summary-item">
                <span className="tl-summary-label">{isArabic ? "المشكلة" : "Panne"} :</span>
                <span className="tl-summary-value">{formData.problem}</span>
              </div>

              {formData.problemDescription && (
                <div className="tl-summary-item">
                  <span className="tl-summary-label">{isArabic ? "الوصف" : "Description"} :</span>
                  <span className="tl-summary-value">{formData.problemDescription}</span>
                </div>
              )}

              <div className="tl-summary-item">
                <span className="tl-summary-label">{isArabic ? "الصور المرفقة" : "Photos jointes"} :</span>
                <span className="tl-summary-value">{formData.photos.length} photo(s)</span>
              </div>

              <div className="tl-summary-item">
                <span className="tl-summary-label">{isArabic ? "العميل" : "Client"} :</span>
                <span className="tl-summary-value">{formData.firstName} {formData.lastName} ({formData.phone})</span>
              </div>

              <div className="tl-summary-item">
                <span className="tl-summary-label">{isArabic ? "عنوان الاستلام" : "Adresse de collecte"} :</span>
                <span className="tl-summary-value">
                  {formData.address}, {formData.city}, {formData.governorate}
                </span>
              </div>

              <div className="tl-summary-item">
                <span className="tl-summary-label">{isArabic ? "مصاريف التوصيل" : "Frais de livraison"} :</span>
                <span className="tl-summary-value" style={{ color: "var(--color-success)" }}>
                  {isArabic ? "مجاني 100٪" : "100% GRATUIT"}
                </span>
              </div>

              <div className="tl-summary-item">
                <span className="tl-summary-label">{isArabic ? "نظام الدفع" : "Règle de paiement"} :</span>
                <span className="tl-summary-value">
                  30% {isArabic ? "عند الاستلام" : "à la collecte"} / 70% {isArabic ? "عند التسليم" : "à la restitution"}
                </span>
              </div>
            </div>

            <div className="tl-notice-box">
              <span style={{ fontSize: "1.3rem" }}>⚠️</span>
              <div>
                <strong>{isArabic ? "ملاحظة هامة" : "Information Importante"}</strong>
                <p>{t("form.importantNote")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {errorMsg && (
          <div style={{ color: "var(--color-error)", fontSize: "0.9rem", marginTop: 12, fontWeight: 600 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Actions Navigation */}
        <div className="tl-form-actions">
          {step > 0 ? (
            <Button variant="secondary" onClick={handlePrev}>
              ← {t("form.previous")}
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button variant="primary" onClick={handleNext}>
              {t("form.next")} →
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit}>
              ✓ {t("form.submit")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
