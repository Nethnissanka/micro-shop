"use client";
import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { checkoutAPI, cartAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { MapPin, CreditCard, Truck, CheckCircle, ArrowLeft, Lock, Edit3, Save, X, ShoppingBag } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

function CheckoutForm() {
  const { cart, refreshCart, user } = useAppContext();
  const router   = useRouter();
  const stripe   = useStripe();
  const elements = useElements();

  const [loading, setLoading]               = useState(false);
  const [paymentMethod, setPaymentMethod]   = useState("cod");
  const [editingAddress, setEditingAddress] = useState(false);
  const [hasProfileAddress, setHasProfileAddress] = useState(false);
  const [checkoutData, setCheckoutData]     = useState(null);

  const [delivery, setDelivery] = useState({
    fullName: "", address: "", city: "", zipCode: "", phone: "",
  });

  // Load selected items from cart page
  useEffect(() => {
    const stored = localStorage.getItem("checkout_items");
    if (stored) {
      setCheckoutData(JSON.parse(stored));
    } else if (cart?.items?.length) {
      setCheckoutData({ items: cart.items, total: cart.total });
    }
  }, [cart]);

  // Pre-fill address from profile (per user)
  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(`delivery_address_${user.id}`);
    if (saved) {
      const a = JSON.parse(saved);
      setDelivery({
        fullName: a.fullName || "",
        address:  a.street   || "",
        city:     a.city     || "",
        zipCode:  a.zip      || "",
        phone:    a.phone    || "",
      });
      setHasProfileAddress(true);
    }
  }, [user]);

  const handleChange = (e) =>
    setDelivery({ ...delivery, [e.target.name]: e.target.value });

  const saveAddressEdit = () => {
    // Only sync back to profile if user already had one saved
    if (hasProfileAddress) {
      const current = JSON.parse(localStorage.getItem(`delivery_address_${user.id}`) || "{}");
      localStorage.setItem(`delivery_address_${user.id}`, JSON.stringify({
        ...current,
        fullName: delivery.fullName,
        street:   delivery.address,
        city:     delivery.city,
        zip:      delivery.zipCode,
        phone:    delivery.phone,
      }));
    }
    setEditingAddress(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkoutData?.items?.length) return;

    setLoading(true);
    try {
      const response = await checkoutAPI.placeOrder({
        items:           checkoutData.items,
        total:           checkoutData.total,
        deliveryDetails: delivery,
        paymentMethod,
        email:           user.email,
      });

      if (paymentMethod === "stripe" && response.clientSecret) {
        const result = await stripe.confirmCardPayment(response.clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name:  delivery.fullName,
              phone: delivery.phone,
            },
          },
        });
        if (result.error) throw new Error(result.error.message);
      }

      // Clear only the checked-out items
      const allIds      = cart?.items?.map(i => i.productId) || [];
      const selectedIds = checkoutData.items.map(i => i.productId);
      if (allIds.length === selectedIds.length) {
        await cartAPI.clearCart();
      } else {
        for (const id of selectedIds) {
          await cartAPI.removeFromCart(id);
        }
      }
      await refreshCart();
      localStorage.removeItem("checkout_items");
      router.push("/order-confirmation");
    } catch (err) {
      console.error(err);
      alert(err.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  if (!user) { router.push("/login"); return null; }

  if (!checkoutData?.items?.length) return (
    <div style={{ maxWidth: "480px", margin: "4rem auto", textAlign: "center" }}>
      <div className="glass" style={{ padding: "3rem" }}>
        <ShoppingBag size={48} style={{ color: "#94a3b8", marginBottom: "1rem" }} />
        <h2 style={{ marginBottom: "0.75rem" }}>No items to checkout</h2>
        <button className="btn-primary" style={{ marginTop: "1rem" }}
          onClick={() => router.push("/cart")}>Back to Cart</button>
      </div>
    </div>
  );

  const shipping   = checkoutData.total >= 100 ? 0 : 9.99;
  const grandTotal = (checkoutData.total + shipping).toFixed(2);

  return (
    <div className="checkout-container">
      <button onClick={() => router.back()} className="back-btn">
        <ArrowLeft size={18} /> Back to Cart
      </button>

      <div className="checkout-grid">
        {/* ── LEFT: Form ── */}
        <div className="checkout-main">
          <form onSubmit={handleSubmit} className="glass-card">

            {/* ── Shipping Details ── */}
            <section className="checkout-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 className="section-title" style={{ margin: 0 }}>
                  <MapPin size={20} /> Shipping Details
                </h2>
                {hasProfileAddress && !editingAddress && (
                  <button type="button" onClick={() => setEditingAddress(true)}
                    className="btn-outline" style={{ padding: "0.4rem 0.9rem", fontSize: "0.78rem" }}>
                    <Edit3 size={13} /> Edit
                  </button>
                )}
                {editingAddress && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="button" onClick={saveAddressEdit}
                      className="btn-primary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.78rem" }}>
                      <Save size={13} /> Save
                    </button>
                    <button type="button" onClick={() => setEditingAddress(false)}
                      className="btn-outline" style={{ padding: "0.4rem 0.9rem", fontSize: "0.78rem" }}>
                      <X size={13} /> Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Saved address — read-only card */}
              {hasProfileAddress && !editingAddress && (
                <div style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: "0.75rem", padding: "1rem 1.25rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <MapPin size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: "2px" }} />
                    <div style={{ fontSize: "0.875rem", lineHeight: 1.7 }}>
                      <div style={{ fontWeight: "700" }}>{delivery.fullName}</div>
                      <div style={{ color: "#94a3b8" }}>{delivery.address}</div>
                      <div style={{ color: "#94a3b8" }}>{delivery.city}{delivery.zipCode ? `, ${delivery.zipCode}` : ""}</div>
                      {delivery.phone && <div style={{ color: "#94a3b8" }}>{delivery.phone}</div>}
                    </div>
                  </div>
                  <p style={{ fontSize: "0.72rem", color: "#64748b", margin: "0.75rem 0 0", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Edit3 size={11} /> Click Edit to change address for this order
                  </p>
                </div>
              )}

              {/* No profile address notice */}
              {!hasProfileAddress && (
                <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "0.65rem", padding: "0.875rem 1rem", marginBottom: "1.25rem", fontSize: "0.82rem", color: "#f59e0b" }}>
                  No saved address found. Fill in your details below, or{" "}
                  <span style={{ textDecoration: "underline", cursor: "pointer" }}
                    onClick={() => router.push("/profile")}>save one in your profile</span> for next time.
                </div>
              )}

              {/* Editable form — shown when no profile address OR when editing */}
              {(!hasProfileAddress || editingAddress) && (
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Full Name</label>
                    <input type="text" name="fullName" required
                      value={delivery.fullName} onChange={handleChange} placeholder="John Doe" />
                  </div>
                  <div className="form-group full-width">
                    <label>Address</label>
                    <input type="text" name="address" required
                      value={delivery.address} onChange={handleChange} placeholder="123 Street Name" />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input type="text" name="city" required
                      value={delivery.city} onChange={handleChange} placeholder="New York" />
                  </div>
                  <div className="form-group">
                    <label>Zip Code</label>
                    <input type="text" name="zipCode" required
                      value={delivery.zipCode} onChange={handleChange} placeholder="10001" />
                  </div>
                  <div className="form-group full-width">
                    <label>Phone Number</label>
                    <input type="tel" name="phone" required
                      value={delivery.phone} onChange={handleChange} placeholder="+1 234 567 890" />
                  </div>
                </div>
              )}

              {/* Hidden inputs for validation when showing read-only card */}
              {hasProfileAddress && !editingAddress && (
                <>
                  <input type="hidden" name="fullName" value={delivery.fullName} />
                  <input type="hidden" name="address"  value={delivery.address} />
                  <input type="hidden" name="city"     value={delivery.city} />
                  <input type="hidden" name="zipCode"  value={delivery.zipCode} />
                  <input type="hidden" name="phone"    value={delivery.phone} />
                </>
              )}
            </section>

            {/* ── Payment Method ── */}
            <section className="checkout-section" style={{ marginTop: "2rem" }}>
              <h2 className="section-title">
                <CreditCard size={20} /> Payment Method
              </h2>
              <div className="payment-options">
                <label className={`payment-option ${paymentMethod === "stripe" ? "active" : ""}`}>
                  <input type="radio" name="paymentMethod" value="stripe"
                    checked={paymentMethod === "stripe"} onChange={() => setPaymentMethod("stripe")} />
                  <span className="option-content">
                    <span className="option-icon"><CreditCard size={20} /></span>
                    <span className="option-text">
                      <strong>Credit/Debit Card</strong>
                      <span>Pay securely with Stripe</span>
                    </span>
                  </span>
                </label>
                <label className={`payment-option ${paymentMethod === "cod" ? "active" : ""}`}>
                  <input type="radio" name="paymentMethod" value="cod"
                    checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                  <span className="option-content">
                    <span className="option-icon"><Truck size={20} /></span>
                    <span className="option-text">
                      <strong>Cash on Delivery</strong>
                      <span>Pay when you receive the order</span>
                    </span>
                  </span>
                </label>
              </div>

              {paymentMethod === "stripe" && (
                <div className="stripe-element-container">
                  <label>Card Information</label>
                  <div className="card-input-wrapper">
                    <CardElement options={{
                      style: {
                        base: { fontSize: "16px", color: "#ffffff", "::placeholder": { color: "#94a3b8" } },
                        invalid: { color: "#ef4444" },
                      },
                    }} />
                  </div>
                </div>
              )}
            </section>

            <button type="submit" className="btn-checkout" disabled={loading}>
              <Lock size={16} />
              {loading ? "Processing..." : paymentMethod === "stripe" ? "Pay & Place Order" : "Place Order (COD)"}
            </button>
          </form>
        </div>

        {/* ── RIGHT: Order Summary ── */}
        <div className="checkout-sidebar">
          <div className="glass-card sticky-sidebar">
            <h2 className="summary-title">
              Order Summary
              <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: "400", marginLeft: "0.5rem" }}>
                ({checkoutData.items.length} item{checkoutData.items.length !== 1 ? "s" : ""})
              </span>
            </h2>
            <div className="summary-items">
              {checkoutData.items.map((item) => (
                <div key={item.productId} className="summary-item">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                    <img src={item.imageUrl} alt={item.name}
                      style={{ width: "44px", height: "44px", borderRadius: "0.5rem", objectFit: "cover", flexShrink: 0 }} />
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      <span className="item-qty">Qty: {item.quantity} × ${parseFloat(item.price).toFixed(2)}</span>
                    </div>
                  </div>
                  <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${checkoutData.total.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span style={{ color: shipping === 0 ? "#10b981" : "inherit", fontWeight: "600" }}>
                {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
              </span>
            </div>
            {shipping > 0 && (
              <div style={{ fontSize: "0.72rem", color: "#f59e0b", padding: "0.5rem 0.7rem", background: "rgba(245,158,11,0.08)", borderRadius: "0.5rem", border: "1px solid rgba(245,158,11,0.2)", marginBottom: "0.75rem" }}>
                Add ${(100 - checkoutData.total).toFixed(2)} more for free shipping!
              </div>
            )}
            <div className="summary-divider"></div>
            <div className="summary-row total">
              <span>Total</span>
              <span>${grandTotal}</span>
            </div>
            <div className="trust-badge">
              <CheckCircle size={14} />
              <span>Secure SSL encrypted checkout</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .checkout-container { max-width: 1100px; margin: 0 auto; padding: 2rem 1rem; }
        .back-btn { display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; background: none; border: none; cursor: pointer; margin-bottom: 1.5rem; font-weight: 500; transition: color 0.2s; }
        .back-btn:hover { color: #ffffff; }
        .checkout-grid { display: grid; grid-template-columns: 1fr 380px; gap: 2rem; }
        @media (max-width: 900px) { .checkout-grid { grid-template-columns: 1fr; } }
        .glass-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.25rem; padding: 2rem; }
        .section-title { display: flex; align-items: center; gap: 0.75rem; font-size: 1.25rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .form-group.full-width { grid-column: span 2; }
        .form-group label { display: block; font-size: 0.875rem; font-weight: 500; color: #94a3b8; margin-bottom: 0.5rem; }
        .form-group input { width: 100%; background: rgba(15,23,42,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; padding: 0.875rem 1rem; color: white; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .form-group input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); outline: none; }
        .payment-options { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        .payment-option { cursor: pointer; display: block; }
        .payment-option input { display: none; }
        .option-content { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 1.25rem; background: rgba(15,23,42,0.4); border: 2px solid transparent; border-radius: 1rem; transition: all 0.2s; }
        .payment-option.active .option-content { border-color: #3b82f6; background: rgba(59,130,246,0.1); }
        .option-icon { margin-bottom: 0.75rem; color: #94a3b8; }
        .payment-option.active .option-icon { color: #3b82f6; }
        .option-text strong { display: block; font-size: 1rem; margin-bottom: 0.25rem; }
        .option-text span { font-size: 0.75rem; color: #64748b; }
        .stripe-element-container { margin-top: 1.5rem; animation: slideDown 0.3s ease-out; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .card-input-wrapper { background: rgba(15,23,42,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; padding: 1rem; }
        .btn-checkout { width: 100%; margin-top: 2rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; font-weight: 700; font-size: 1.125rem; padding: 1.125rem; border-radius: 0.875rem; border: none; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .btn-checkout:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(37,99,235,0.4); }
        .btn-checkout:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .summary-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; }
        .summary-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 0.5rem; }
        .item-info { display: flex; flex-direction: column; min-width: 0; }
        .item-name { font-weight: 600; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item-qty { font-size: 0.75rem; color: #94a3b8; }
        .item-price { font-weight: 600; flex-shrink: 0; }
        .summary-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 1.25rem 0; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 0.75rem; color: #94a3b8; font-size: 0.9375rem; }
        .summary-row.total { color: #ffffff; font-size: 1.25rem; font-weight: 800; }
        .trust-badge { display: flex; align-items: center; gap: 0.5rem; margin-top: 2rem; font-size: 0.75rem; color: #64748b; justify-content: center; }
        .sticky-sidebar { position: sticky; top: 2rem; }
      `}</style>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}