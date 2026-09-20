import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/services/cartStore";
import { CheckoutModal } from "./CheckoutModal";
import "./CartDrawer.css";

export function CartDrawer() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { isOpen, items, toggleCart, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const [showCheckout, setShowCheckout] = useState(false);

  if (!isOpen && !showCheckout) return null;

  return (
    <>
      {/* Cart Drawer */}
      {isOpen && (
        <>
          <div className="tl-cart-overlay" onClick={toggleCart} />
          <div className={`tl-cart-drawer ${isOpen ? "open" : ""}`}>
            <div className="tl-cart-header">
              <h2>
                <ShoppingBag size={20} />
                {isArabic ? "سلة المشتريات" : "Mon Panier"}
              </h2>
              <button className="tl-cart-close" onClick={toggleCart}>
                <X size={24} />
              </button>
            </div>

            <div className="tl-cart-content">
              {items.length === 0 ? (
                <div className="tl-cart-empty">
                  <ShoppingBag size={48} opacity={0.2} />
                  <p>{isArabic ? "سلتك فارغة" : "Votre panier est vide"}</p>
                  <button className="tl-btn-primary" onClick={toggleCart} style={{ marginTop: 16 }}>
                    {isArabic ? "مواصلة التسوق" : "Continuer les achats"}
                  </button>
                </div>
              ) : (
                <div className="tl-cart-items">
                  {items.map((item) => (
                    <div key={item.id} className="tl-cart-item">
                      <div className="tl-cart-item-img">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} />
                        ) : (
                          <ShoppingBag size={24} color="var(--color-border)" />
                        )}
                      </div>
                      <div className="tl-cart-item-details">
                        <h4>{item.name}</h4>
                        <div className="tl-cart-item-price">{item.price.toFixed(2)} DT</div>
                        
                        <div className="tl-cart-item-actions">
                          <div className="tl-cart-qty">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1 || item.isOccasion}
                            >
                              <Minus size={14} />
                            </button>
                            <span>{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.isOccasion} // Occasions usually have only 1 in stock
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button className="tl-cart-remove" onClick={() => removeItem(item.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (() => {
              const subTotal = getTotalPrice();
              const deliveryFee = 7;
              const total = subTotal + deliveryFee;

              return (
                <div className="tl-cart-footer">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                    <span>{isArabic ? "المجموع الفرعي:" : "Sous-total :"}</span>
                    <span>{subTotal.toFixed(2)} DT</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                    <span>{isArabic ? "التوصيل:" : "Livraison :"}</span>
                    <span>{deliveryFee.toFixed(2)} DT</span>
                  </div>
                  <div className="tl-cart-total">
                    <span>{isArabic ? "المجموع الإجمالي:" : "Total (TTC) :"}</span>
                    <strong>{total.toFixed(2)} DT</strong>
                  </div>
                  <button 
                    className="tl-btn-primary tl-cart-checkout"
                    onClick={() => {
                      toggleCart(); // Close the cart drawer
                      setShowCheckout(true); // Open checkout modal
                    }}
                  >
                    {isArabic ? "إتمام الطلب" : "Commander"}
                  </button>
                  <button className="tl-cart-clear" onClick={clearCart}>
                    {isArabic ? "إفراغ السلة" : "Vider le panier"}
                  </button>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* Checkout Modal */}
      {showCheckout && items.length > 0 && (
        <CheckoutModal
          items={items}
          totalPrice={getTotalPrice() + 7}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            clearCart();
            setShowCheckout(false);
          }}
        />
      )}
    </>
  );
}
