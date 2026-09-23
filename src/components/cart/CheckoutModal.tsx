import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, ShoppingBag, CheckCircle, AlertCircle, Package, Lock } from "lucide-react";
import { useAuth, registerUser } from "@/services/auth";
import { orderStore, OrderItem } from "@/services/orderStore";
import { CartItem } from "@/services/cartStore";
import { ProductImage } from "@/components/ui/ProductImage";
import "./CheckoutModal.css";

interface CheckoutModalProps {
  items: CartItem[];
  totalPrice: number;
  onClose: () => void;
  onSuccess: () => void;
}

const GOVERNORATES = [
  "Tunis", "Ariana", "Ben Arous", "Manouba",
  "Nabeul", "Zaghouan", "Bizerte", "Béja",
  "Jendouba", "Le Kef", "Siliana", "Sousse",
  "Monastir", "Mahdia", "Sfax", "Kairouan",
  "Kasserine", "Sidi Bouzid", "Gabès", "Médenine",
  "Tataouine", "Gafsa", "Tozeur", "Kébili",
];

export function CheckoutModal({ items, totalPrice, onClose, onSuccess }: CheckoutModalProps) {
  const { i18n } = useTranslation();
  const { user, isLoggedIn } = useAuth();
  const isArabic = i18n.language === "ar";

  // Form state
  const [customerName, setCustomerName] = useState(isLoggedIn && user ? user.displayName : "");
  const [customerPhone, setCustomerPhone] = useState(isLoggedIn && user ? user.username : "");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerGovernorate, setCustomerGovernorate] = useState("");

  // Guest account creation
  const [wantAccount, setWantAccount] = useState(false);
  const [password, setPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successOrder, setSuccessOrder] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validation
    if (!customerName.trim() || !customerPhone.trim()) {
      setError(isArabic ? "يرجى ملء الاسم ورقم الهاتف." : "Veuillez remplir le nom et le numéro de téléphone.");
      return;
    }

    if (!customerAddress.trim() || !customerGovernorate) {
      setError(isArabic ? "يرجى إدخال العنوان والولاية." : "Veuillez remplir l'adresse et le gouvernorat.");
      return;
    }

    if (wantAccount && password.length < 6) {
      setError(isArabic ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل." : "Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);

    try {
      let userId: string | null = isLoggedIn && user ? user.id : null;

      // Create account if guest opted in
      if (wantAccount && !isLoggedIn) {
        const newUserId = await registerUser(
          customerPhone.trim(),
          password,
          "customer",
          customerName.trim()
        );
        if (newUserId) {
          userId = newUserId;
        }
        // Continue with order even if account creation fails
      }

      // Map cart items to order items
      const orderItems: OrderItem[] = items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
        isOccasion: item.isOccasion,
      }));

      const order = await orderStore.createOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        customerCity: customerCity.trim(),
        customerGovernorate: customerGovernorate,
        items: orderItems,
        totalAmount: totalPrice,
        userId,
      });

      if (order) {
        setSuccessOrder(order.orderNumber);
      } else {
        setError(isArabic ? "فشل في إنشاء الطلب. حاول مرة أخرى." : "Erreur lors de la création de la commande. Réessayez.");
      }
    } catch (err) {
      setError(isArabic ? "حدث خطأ. حاول مرة أخرى." : "Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success View ──
  if (successOrder) {
    return (
      <div className="tl-checkout-overlay" onClick={onClose}>
        <div className="tl-checkout-modal" onClick={(e) => e.stopPropagation()}>
          <div className="tl-checkout-success">
            <div className="tl-checkout-success-icon">
              <CheckCircle size={36} color="var(--color-success)" />
            </div>
            <h3>{isArabic ? "تم تأكيد الطلب! 🎉" : "Commande confirmée ! 🎉"}</h3>
            <p>
              {isArabic
                ? "سنتواصل معك قريباً لتأكيد التوصيل."
                : "Nous vous contacterons bientôt pour confirmer la livraison."}
            </p>
            <div className="tl-checkout-order-number">{successOrder}</div>
            {wantAccount && (
              <p style={{ color: "var(--color-success)", fontSize: 13 }}>
                {isArabic ? "✓ تم إنشاء حسابك بنجاح!" : "✓ Votre compte a été créé avec succès !"}
              </p>
            )}
            <button
              className="tl-checkout-success-btn"
              onClick={() => {
                onSuccess();
                onClose();
              }}
            >
              {isArabic ? "حسناً" : "Fermer"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form View ──
  return (
    <div className="tl-checkout-overlay" onClick={onClose}>
      <div className="tl-checkout-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tl-checkout-header">
          <h2>
            <ShoppingBag size={22} />
            {isArabic ? "تأكيد الطلب" : "Confirmer la commande"}
          </h2>
          <button className="tl-checkout-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="tl-checkout-body">
          {/* Order Summary */}
          <div className="tl-checkout-summary">
            <div className="tl-checkout-summary-title">
              {isArabic ? "ملخص الطلب" : "Résumé de la commande"}
            </div>
            {items.map((item) => (
              <div key={item.id} className="tl-checkout-item">
                <div className="tl-checkout-item-img">
                  <ProductImage src={item.imageUrl} alt={item.name} fallback={<Package size={18} color="var(--color-text-secondary)" />} />
                </div>
                <div className="tl-checkout-item-details">
                  <div className="tl-checkout-item-name">{item.name}</div>
                  <div className="tl-checkout-item-qty">× {item.quantity}</div>
                </div>
                <div className="tl-checkout-item-price">
                  {(item.price * item.quantity).toFixed(2)} DT
                </div>
              </div>
            ))}
            <div className="tl-checkout-total">
              <span className="tl-checkout-total-label">
                {isArabic ? "المجموع :" : "Total :"}
              </span>
              <span className="tl-checkout-total-value">
                {totalPrice.toFixed(2)} DT
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="tl-checkout-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Checkout Form */}
          <form onSubmit={handleSubmit} className="tl-checkout-form">
            <div className="tl-checkout-row">
              <div className="tl-checkout-field">
                <label>{isArabic ? "الاسم الكامل" : "Nom complet"}</label>
                <input
                  type="text"
                  placeholder={isArabic ? "محمد بن علي" : "Mohamed Ben Ali"}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  disabled={isLoggedIn}
                />
              </div>
              <div className="tl-checkout-field">
                <label>{isArabic ? "رقم الهاتف" : "Téléphone"}</label>
                <input
                  type="tel"
                  placeholder="55 123 456"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  disabled={isLoggedIn}
                />
              </div>
            </div>

            <div className="tl-checkout-field">
              <label>{isArabic ? "العنوان" : "Adresse de livraison"}</label>
              <input
                type="text"
                placeholder={isArabic ? "الشارع، الحي، رقم المنزل..." : "Rue, quartier, numéro..."}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                required
              />
            </div>

            <div className="tl-checkout-row">
              <div className="tl-checkout-field">
                <label>{isArabic ? "الولاية" : "Gouvernorat"}</label>
                <select
                  value={customerGovernorate}
                  onChange={(e) => setCustomerGovernorate(e.target.value)}
                  required
                >
                  <option value="">{isArabic ? "-- اختر --" : "-- Sélectionner --"}</option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="tl-checkout-field">
                <label>{isArabic ? "المدينة" : "Ville"}</label>
                <input
                  type="text"
                  placeholder={isArabic ? "المدينة" : "Ex: La Marsa"}
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                />
              </div>
            </div>

            {/* Guest: Create account option */}
            {!isLoggedIn && (
              <>
                <label
                  className="tl-checkout-account-option"
                  htmlFor="checkout-create-account"
                >
                  <input
                    type="checkbox"
                    id="checkout-create-account"
                    checked={wantAccount}
                    onChange={(e) => setWantAccount(e.target.checked)}
                  />
                  <div className="tl-checkout-account-text">
                    <strong>
                      {isArabic ? "إنشاء حساب" : "Créer un compte"}
                    </strong>
                    <span>
                      {isArabic
                        ? "لمتابعة طلبك والحصول على تحديثات."
                        : "Pour suivre votre commande et recevoir des mises à jour."}
                    </span>
                  </div>
                </label>

                {wantAccount && (
                  <div className="tl-checkout-field tl-checkout-password-field">
                    <label>{isArabic ? "كلمة المرور" : "Mot de passe"}</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      required={wantAccount}
                    />
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              className="tl-checkout-submit"
              disabled={loading}
            >
              {loading ? (
                isArabic ? "جارٍ الإرسال..." : "Envoi en cours..."
              ) : (
                <>
                  <ShoppingBag size={18} />
                  {isArabic ? "تأكيد الطلب" : "Confirmer la commande"}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
