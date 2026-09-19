import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Lock, User, Phone, AlertCircle } from "lucide-react";
import { registerUser } from "@/services/auth";
import "../Login/Login.css"; // Reuse login styles

export function Signup() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === "ar";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !password.trim()) {
      setError(isArabic ? "يرجى ملء جميع الحقول." : "Veuillez remplir tous les champs.");
      return;
    }

    if (password.length < 6) {
      setError(isArabic ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل." : "Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);

    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`;
      // On force le rôle "customer" pour les inscriptions publiques
      const result = await registerUser(phone.trim(), password, "customer", displayName);

      if (result) {
        // Succès : rediriger vers le login ou tableau de bord
        navigate("/login", { 
          state: { message: isArabic ? "تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول." : "Compte créé avec succès ! Veuillez vous connecter." }
        });
      } else {
        setError(isArabic ? "فشل في إنشاء الحساب. قد يكون رقم الهاتف مستخدماً بالفعل." : "Échec de la création du compte. Ce numéro est peut-être déjà utilisé.");
      }
    } catch (err) {
      setError(isArabic ? "حدث خطأ أثناء الاتصال بالخادم." : "Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="tl-login-page">
      <div className="tl-login-glow" aria-hidden="true" />
      
      <div className="container tl-login-container">
        <div className="tl-login-card">
          
          <div className="tl-login-header">
            <h1>{isArabic ? "إنشاء حساب" : "INSCRIPTION"}</h1>
            <p>
              {isArabic
                ? "انضم إلينا لمتابعة طلباتك وشراء المنتجات."
                : "Créez votre compte pour suivre vos réparations et faire vos achats."}
            </p>
          </div>

          {error && (
            <div className="tl-login-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="tl-login-form">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="tl-login-field">
                <label>{isArabic ? "الاسم" : "Prénom"}</label>
                <div className="tl-login-input-wrap">
                  <input
                    type="text"
                    placeholder={isArabic ? "الاسم" : "Prénom"}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="tl-login-input"
                    required
                  />
                  <User className="tl-login-icon" size={18} />
                </div>
              </div>

              <div className="tl-login-field">
                <label>{isArabic ? "اللقب" : "Nom"}</label>
                <div className="tl-login-input-wrap">
                  <input
                    type="text"
                    placeholder={isArabic ? "اللقب" : "Nom"}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="tl-login-input"
                    required
                  />
                  <User className="tl-login-icon" size={18} />
                </div>
              </div>
            </div>

            <div className="tl-login-field">
              <label>{isArabic ? "رقم الهاتف" : "Numéro de téléphone"}</label>
              <div className="tl-login-input-wrap">
                <input
                  type="tel"
                  placeholder="Ex: 51055101"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="tl-login-input"
                  required
                />
                <Phone className="tl-login-icon" size={18} />
              </div>
            </div>

            <div className="tl-login-field">
              <label>{isArabic ? "كلمة المرور" : "Mot de passe"}</label>
              <div className="tl-login-input-wrap">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="tl-login-input"
                  autoComplete="new-password"
                  required
                />
                <Lock className="tl-login-icon" size={18} />
              </div>
            </div>

            <button type="submit" className="tl-login-submit" disabled={loading}>
              {loading
                ? (isArabic ? "جارٍ الإنشاء..." : "Création en cours...")
                : (isArabic ? "تسجيل" : "S'inscrire")}
            </button>
          </form>

          <div style={{ marginTop: "24px", textAlign: "center", fontSize: "14px", color: "var(--color-text-secondary)" }}>
            {isArabic ? "لديك حساب بالفعل؟ " : "Vous avez déjà un compte ? "}
            <Link to="/login" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
              {isArabic ? "تسجيل الدخول" : "Se connecter"}
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}
