import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/services/auth";
import { supabase } from "@/services/supabase/client";
import { occasionStore } from "@/services/occasionStore";
import { Camera, Plus, Trash2, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import "./Shop.css"; // Reuse shop styles

export function AddOccasionForm() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // CIN Verification State
  const [hasCin, setHasCin] = useState<boolean | null>(null);
  const [cinNumber, setCinNumber] = useState("");
  const [cinDate, setCinDate] = useState("");
  const [verifyingCin, setVerifyingCin] = useState(false);

  // Form State
  const [type, setType] = useState<"Téléphone" | "PC" | "Console">("Téléphone");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("Bon état");
  const [price, setPrice] = useState("");
  const [whatsapp, setWhatsapp] = useState(user?.username || ""); // Pre-fill with phone
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Check CIN on mount
  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    
    async function checkCIN() {
      const { data } = await supabase
        .from("profiles")
        .select("cin_number, cin_date")
        .eq("id", user?.id)
        .single();
      
      if (data && data.cin_number && data.cin_date) {
        setHasCin(true);
      } else {
        setHasCin(false);
      }
    }
    checkCIN();
  }, [user, isLoggedIn, navigate]);

  const handleCinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingCin(true);
    setError("");
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cin_number: cinNumber, cin_date: cinDate })
        .eq("id", user?.id);
      
      if (updateError) throw updateError;
      setHasCin(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement de la CIN.");
    } finally {
      setVerifyingCin(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (photos.length + selected.length > 5) {
        alert(isArabic ? "الحد الأقصى 5 صور" : "Maximum 5 photos");
        return;
      }
      setPhotos([...photos, ...selected]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (photos.length < 3) {
      setError(isArabic ? "يرجى إضافة 3 صور على الأقل" : "Veuillez ajouter au moins 3 photos");
      return;
    }
    if (photos.length > 5) {
      setError(isArabic ? "الحد الأقصى 5 صور" : "Maximum 5 photos");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      // 1. Upload photos
      const photoUrls = await Promise.all(
        photos.map(file => occasionStore.uploadPhoto(file, user.id))
      );

      // 2. Save product
      await occasionStore.addOccasion({
        sellerId: user.id,
        type,
        brand,
        model,
        description,
        condition,
        price: parseFloat(price),
        whatsappNumber: whatsapp,
        photos: photoUrls,
      });

      setSuccess(true);
      setTimeout(() => navigate("/shop"), 2000);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  if (hasCin === null) {
    return (
      <div className="container" style={{ padding: "100px 0", textAlign: "center" }}>
        <Loader2 className="spinner" size={32} style={{ margin: "0 auto", color: "#008CFF" }} />
      </div>
    );
  }

  // Phase 1: CIN Verification
  if (!hasCin) {
    return (
      <main className="tl-shop-page fade-in">
        <div className="container" style={{ maxWidth: 600 }}>
          <button className="tl-btn-manage" style={{ marginBottom: 24, border: "none" }} onClick={() => navigate("/shop")}>
            <ArrowLeft size={16} /> {isArabic ? "رجوع" : "Retour"}
          </button>
          
          <div className="tl-admin-card" style={{ padding: 32 }}>
            <h2>{isArabic ? "التحقق من الهوية" : "Vérification d'identité"}</h2>
            <p style={{ color: "#A7B0B8", marginTop: 8, marginBottom: 24 }}>
              {isArabic 
                ? "لأسباب أمنية وقانونية، يجب تقديم رقم بطاقة التعريف الوطنية قبل نشر إعلان." 
                : "Pour des raisons de sécurité, vous devez fournir votre numéro de CIN avant de vendre un article."}
            </p>
            
            {error && <div style={{ padding: 12, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: 8, marginBottom: 16 }}>{error}</div>}

            <form onSubmit={handleCinSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#A7B0B8", marginBottom: 6 }}>
                  {isArabic ? "رقم بطاقة التعريف (CIN)" : "Numéro de CIN"}
                </label>
                <input
                  type="text"
                  required
                  pattern="[0-9]{8}"
                  maxLength={8}
                  placeholder="12345678"
                  value={cinNumber}
                  onChange={(e) => setCinNumber(e.target.value)}
                  style={{ width: "100%", padding: "12px 16px", background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#FFF" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#A7B0B8", marginBottom: 6 }}>
                  {isArabic ? "تاريخ الإصدار" : "Date de délivrance"}
                </label>
                <input
                  type="date"
                  required
                  value={cinDate}
                  onChange={(e) => setCinDate(e.target.value)}
                  style={{ width: "100%", padding: "12px 16px", background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#FFF" }}
                />
              </div>
              <button type="submit" disabled={verifyingCin} className="tl-btn-manage" style={{ background: "#00A3FF", color: "#FFF", borderColor: "#00A3FF", marginTop: 8 }}>
                {verifyingCin ? <Loader2 className="spinner" size={16} /> : <CheckCircle2 size={16} />} 
                {isArabic ? "تأكيد" : "Confirmer"}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // Phase 2: Add Occasion Form
  return (
    <main className="tl-shop-page fade-in">
      <div className="container" style={{ maxWidth: 700 }}>
        <button className="tl-btn-manage" style={{ marginBottom: 24, border: "none" }} onClick={() => navigate("/shop")}>
          <ArrowLeft size={16} /> {isArabic ? "إلغاء" : "Annuler"}
        </button>
        
        <div className="tl-admin-card" style={{ padding: 32 }}>
          <h2>{isArabic ? "نشر إعلان جديد" : "Publier une annonce"}</h2>
          <p style={{ color: "#A7B0B8", marginTop: 8, marginBottom: 24 }}>
            {isArabic ? "الرجاء إدخال تفاصيل جهازك المستعمل بدقة" : "Veuillez renseigner les détails de votre appareil d'occasion."}
          </p>

          {success && (
            <div style={{ padding: 16, background: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: 8, marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
              <CheckCircle2 size={24} />
              <div>
                <strong>{isArabic ? "تم النشر بنجاح!" : "Annonce publiée avec succès!"}</strong>
                <p style={{ margin: 0, fontSize: 14 }}>{isArabic ? "جاري التوجيه..." : "Redirection en cours..."}</p>
              </div>
            </div>
          )}

          {error && <div style={{ padding: 12, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: 8, marginBottom: 24 }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: success ? "none" : "flex", flexDirection: "column", gap: 20 }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#A7B0B8", marginBottom: 6 }}>{isArabic ? "نوع الجهاز" : "Type d'appareil"}</label>
                <select value={type} onChange={(e) => setType(e.target.value as any)} style={{ width: "100%", padding: "12px 16px", background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#FFF" }}>
                  <option value="Téléphone">Téléphone</option>
                  <option value="PC">PC</option>
                  <option value="Console">Console de jeux</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#A7B0B8", marginBottom: 6 }}>{isArabic ? "الحالة" : "État"}</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)} style={{ width: "100%", padding: "12px 16px", background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#FFF" }}>
                  <option value="Neuf (Déballé)">Neuf (Déballé)</option>
                  <option value="Comme neuf">Comme neuf</option>
                  <option value="Bon état">Bon état</option>
                  <option value="Acceptable">Acceptable</option>
                  <option value="À réparer">À réparer</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#A7B0B8", marginBottom: 6 }}>{isArabic ? "الماركة" : "Marque (ex: Apple, Samsung)"}</label>
                <input type="text" required value={brand} onChange={e => setBrand(e.target.value)} style={{ width: "100%", padding: "12px 16px", background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#FFF" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#A7B0B8", marginBottom: 6 }}>{isArabic ? "الموديل" : "Modèle (ex: iPhone 13 Pro)"}</label>
                <input type="text" required value={model} onChange={e => setModel(e.target.value)} style={{ width: "100%", padding: "12px 16px", background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#FFF" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#A7B0B8", marginBottom: 6 }}>{isArabic ? "الوصف" : "Description détaillée"}</label>
              <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} style={{ width: "100%", padding: "12px 16px", background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#FFF" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#A7B0B8", marginBottom: 6 }}>{isArabic ? "السعر (DT)" : "Prix (DT)"}</label>
                <input type="number" step="1" min="1" required value={price} onChange={e => setPrice(e.target.value)} style={{ width: "100%", padding: "12px 16px", background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#FFF" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#A7B0B8", marginBottom: 6 }}>{isArabic ? "رقم الواتساب للتواصل" : "Numéro WhatsApp de contact"}</label>
                <input type="text" required placeholder="Ex: 55123456" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={{ width: "100%", padding: "12px 16px", background: "#03070A", border: "1px solid #123044", borderRadius: 8, color: "#FFF" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#A7B0B8", marginBottom: 6 }}>
                {isArabic ? "الصور (3 على الأقل، 5 كحد أقصى)" : "Photos (3 min, 5 max)"}
              </label>
              
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                {photos.map((file, idx) => (
                  <div key={idx} style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #123044" }}>
                    <img src={URL.createObjectURL(file)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button type="button" onClick={() => handleRemovePhoto(idx)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(239, 68, 68, 0.9)", border: "none", color: "#FFF", borderRadius: "50%", padding: 4, cursor: "pointer" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                
                {photos.length < 5 && (
                  <label style={{ width: 80, height: 80, borderRadius: 8, border: "2px dashed #123044", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#00A3FF", background: "rgba(0,140,255,0.05)" }}>
                    <Camera size={24} />
                    <input type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: "none" }} />
                  </label>
                )}
              </div>
            </div>

            <button type="submit" disabled={loading} className="tl-btn-manage" style={{ background: "#00A3FF", color: "#FFF", borderColor: "#00A3FF", marginTop: 16, height: 48 }}>
              {loading ? <Loader2 className="spinner" size={20} /> : <Plus size={20} />} 
              {isArabic ? "نشر الإعلان" : "Publier l'annonce"}
            </button>

          </form>
        </div>
      </div>
    </main>
  );
}
