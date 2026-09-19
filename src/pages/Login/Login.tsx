import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { login } from "@/services/auth";
import "./Login.css";

export function Login() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === "ar";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStandardLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError(isArabic ? "يرجى ملء جميع الحقول." : "Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);

    try {
      const result = await login(username.trim(), password);

      if (result.success && result.user) {
        // Redirect based on role
        switch (result.user.role) {
          case "admin":
            navigate("/dashboard/admin");
            break;
          case "driver":
            navigate("/dashboard/livreur");
            break;
          case "technician":
            navigate("/dashboard/technicien");
            break;
          default:
            navigate("/dashboard/client");
        }
      } else {
        setError(result.error || (isArabic ? "خطأ في تسجيل الدخول." : "Identifiant ou mot de passe incorrect."));
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
            <h1>{isArabic ? "تسجيل الدخول" : "CONNEXION"}</h1>
            <p>
              {isArabic
                ? "الدخول إلى حسابك لمتابعة الطلبات والعمليات."
                : "Accédez à votre espace sécurisé."}
            </p>
          </div>

          {error && (
            <div className="tl-login-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleStandardLogin} className="tl-login-form">
            <div className="tl-login-field">
              <label>{isArabic ? "رقم الهاتف أو اسم المستخدم" : "Numéro de téléphone ou identifiant"}</label>
              <div className="tl-login-input-wrap">
                <input
                  type="text"
                  placeholder={isArabic ? "رقم الهاتف أو اسم المستخدم" : "Numéro de téléphone ou identifiant"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="tl-login-input"
                  autoComplete="username"
                />
                <Mail className="tl-login-icon" size={18} />
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
                  autoComplete="current-password"
                />
                <Lock className="tl-login-icon" size={18} />
              </div>
            </div>

            <button type="submit" className="tl-login-submit" disabled={loading}>
              {loading
                ? (isArabic ? "جارٍ الدخول..." : "Connexion...")
                : (isArabic ? "دخول" : "Se connecter")}
            </button>
          </form>

          <div style={{ marginTop: "24px", textAlign: "center", fontSize: "14px", color: "var(--color-text-secondary)" }}>
            {isArabic ? "ليس لديك حساب؟ " : "Vous n'avez pas de compte ? "}
            <Link to="/signup" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
              {isArabic ? "إنشاء حساب" : "S'inscrire"}
            </Link>
          </div>


        </div>
      </div>
    </main>
  );
}
