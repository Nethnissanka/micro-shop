"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { catalogAPI, cartAPI } from "@/lib/api";
import { useAppContext } from "@/context/AppContext";
import {
  ArrowLeft, Plus, Minus, ShoppingCart, Star,
  Shield, Truck, RefreshCw, Check, Package,
  ChevronRight, Heart, Share2
} from "lucide-react";

/* ─── small helpers ──────────────────────────────────────── */
function Badge({ children, color = "#3b82f6" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: `${color}20`, color, fontSize: "0.72rem", fontWeight: "700", padding: "3px 10px", borderRadius: "999px", letterSpacing: "0.04em" }}>
      {children}
    </span>
  );
}

function TrustBadge({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.625rem 0.875rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.5rem" }}>
      <span style={{ color: "#10b981", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{text}</span>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
      {children}
    </div>
  );
}

/* ─── main component ─────────────────────────────────────── */
export default function ProductDetail() {
  const { id }    = useParams();
  const router    = useRouter();
  const { user, refreshCart, cart } = useAppContext();

  const [product,  setProduct]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding,   setAdding]   = useState(false);
  const [added,    setAdded]    = useState(false);
  const [wishlist, setWishlist] = useState(false);

  useEffect(() => {
    catalogAPI.getProduct(id)
      .then(setProduct)
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [id]);

  // Check if already in cart
  const inCart = cart?.items?.some(i => i.productId === id);

  const handleAddToCart = async () => {
    if (!user) { router.push("/login"); return; }
    if (inCart) { router.push("/cart"); return; }
    setAdding(true);
    try {
      await cartAPI.addToCart({
        productId: product._id,
        name:      product.name,
        price:     product.price,
        quantity,
        imageUrl:  product.imageUrl,
      });
      await refreshCart();
      setAdded(true);
      setTimeout(() => setAdded(false), 3000);
    } catch (err) { console.error(err); }
    finally { setAdding(false); }
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "1rem" }}>
      <div style={{ width: "44px", height: "44px", border: "3px solid rgba(59,130,246,0.2)", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
      <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading product…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!product) return null;

  const subtotal    = (product.price * quantity).toFixed(2);
  const inStock     = product.stock > 0;
  const lowStock    = inStock && product.stock <= 10;
  const stockColor  = !inStock ? "#ef4444" : lowStock ? "#f59e0b" : "#10b981";
  const stockLabel  = !inStock ? "Out of stock" : lowStock ? `Only ${product.stock} left` : `${product.stock} in stock`;

  return (
    <div style={{ maxWidth: "1040px", margin: "0 auto" }}>

      {/* ── Breadcrumb ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "1.25rem", fontSize: "0.8rem", color: "#64748b" }}>
        <span style={{ cursor: "pointer", transition: "color 0.15s" }}
          onClick={() => router.push("/")}
          onMouseEnter={e => e.currentTarget.style.color = "white"}
          onMouseLeave={e => e.currentTarget.style.color = "#64748b"}>
          Home
        </span>
        <ChevronRight size={13} />
        <span style={{ cursor: "pointer", transition: "color 0.15s" }}
          onClick={() => { router.push("/"); setTimeout(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }), 100); }}
          onMouseEnter={e => e.currentTarget.style.color = "white"}
          onMouseLeave={e => e.currentTarget.style.color = "#64748b"}>
          Products
        </span>
        <ChevronRight size={13} />
        <span style={{ color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{product.name}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

        {/* ══════════ LEFT — Image panel ══════════ */}
        <div>
          {/* Main image */}
          <div className="glass" style={{ overflow: "hidden", borderRadius: "1rem", position: "relative", marginBottom: "0.875rem" }}>
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{ width: "100%", height: "420px", objectFit: "cover", display: "block" }}
            />

            {/* Stock overlay badge */}
            {(lowStock || !inStock) && (
              <div style={{ position: "absolute", top: "14px", left: "14px" }}>
                <Badge color={stockColor}>
                  {!inStock ? "Out of Stock" : `Only ${product.stock} left!`}
                </Badge>
              </div>
            )}

            {/* Wishlist button */}
            <button
              onClick={() => setWishlist(w => !w)}
              style={{ position: "absolute", top: "14px", right: "14px", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(15,23,42,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }}>
              <Heart size={16} fill={wishlist ? "#ef4444" : "none"} color={wishlist ? "#ef4444" : "#94a3b8"} />
            </button>

            {/* Share button */}
            <button
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              style={{ position: "absolute", bottom: "14px", right: "14px", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(15,23,42,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Share2 size={15} color="#94a3b8" />
            </button>
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <TrustBadge icon={<Shield size={14} />}    text="Secure payment & buyer protection" />
            <TrustBadge icon={<Truck size={14} />}     text="Free shipping on orders over $100" />
            <TrustBadge icon={<RefreshCw size={14} />} text="30-day hassle-free returns" />
          </div>
        </div>

        {/* ══════════ RIGHT — Details panel ══════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* ── Title & rating ── */}
          <div className="glass" style={{ padding: "1.5rem" }}>
            {/* Category tag */}
            <div style={{ marginBottom: "0.75rem" }}>
              <Badge color="#8b5cf6">
                <Package size={11} /> Electronics
              </Badge>
            </div>

            <h1 style={{ fontSize: "1.6rem", fontWeight: "900", margin: "0 0 0.625rem", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              {product.name}
            </h1>

            {/* Rating row */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
              <div style={{ display: "flex", gap: "2px" }}>
                {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="#f59e0b" color="#f59e0b" />)}
              </div>
              <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>4.8 · 128 reviews</span>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>·</span>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>2.4k sold</span>
            </div>

            <p style={{ color: "#94a3b8", lineHeight: 1.7, margin: 0, fontSize: "0.9rem" }}>
              {product.description}
            </p>
          </div>

          {/* ── Pricing ── */}
          <div className="glass" style={{ padding: "1.25rem 1.5rem" }}>
            <SectionLabel>Price</SectionLabel>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
              <span style={{ fontSize: "2rem", fontWeight: "900", color: "var(--primary)", letterSpacing: "-0.03em" }}>
                ${parseFloat(product.price).toFixed(2)}
              </span>
            </div>

            {/* Stock status */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.625rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: stockColor, boxShadow: `0 0 6px ${stockColor}` }} />
              <span style={{ fontSize: "0.8rem", color: stockColor, fontWeight: "600" }}>{stockLabel}</span>
            </div>
          </div>

          {/* ── Quantity + Add to cart ── */}
          {inStock && (
            <div className="glass" style={{ padding: "1.25rem 1.5rem" }}>
              <SectionLabel>Quantity</SectionLabel>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.1rem" }}>
                {/* Stepper */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    style={{ width: "38px", height: "38px", background: quantity <= 1 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem 0 0 0.5rem", color: quantity <= 1 ? "#475569" : "white", cursor: quantity <= 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                    <Minus size={15} />
                  </button>
                  <div style={{ width: "52px", height: "38px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderLeft: "none", borderRight: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "1rem" }}>
                    {quantity}
                  </div>
                  <button
                    onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                    style={{ width: "38px", height: "38px", background: quantity >= product.stock ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0 0.5rem 0.5rem 0", color: quantity >= product.stock ? "#475569" : "white", cursor: quantity >= product.stock ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                    <Plus size={15} />
                  </button>
                </div>

                {/* Subtotal */}
                <div style={{ padding: "0.5rem 1rem", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Subtotal </span>
                  <span style={{ fontWeight: "800", color: "var(--primary)", fontSize: "1rem" }}>${subtotal}</span>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="btn-primary"
                  onClick={handleAddToCart}
                  disabled={adding}
                  style={{
                    flex: 1, padding: "0.875rem", fontSize: "0.95rem", justifyContent: "center",
                    background: added ? "var(--success)" : inCart ? "rgba(16,185,129,0.15)" : "",
                    border: inCart && !added ? "1px solid rgba(16,185,129,0.3)" : "",
                    color: inCart && !added ? "#10b981" : "",
                    transition: "all 0.2s",
                  }}>
                  {added
                    ? <><Check size={18} /> Added to Cart!</>
                    : inCart
                      ? <><Check size={18} /> In Cart — Go to Cart</>
                      : adding
                        ? "Adding…"
                        : <><ShoppingCart size={18} /> Add to Cart</>}
                </button>

                <button
                  className="btn-outline"
                  onClick={() => router.push("/cart")}
                  title="View cart"
                  style={{ padding: "0.875rem 1rem" }}>
                  <ShoppingCart size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Out of stock CTA */}
          {!inStock && (
            <div className="glass" style={{ padding: "1.25rem 1.5rem", textAlign: "center" }}>
              <p style={{ color: "#ef4444", fontWeight: "600", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                This item is currently out of stock
              </p>
              <button className="btn-outline" style={{ width: "100%", justifyContent: "center" }}
                onClick={() => router.push("/")}>
                Browse other products
              </button>
            </div>
          )}

          {/* ── Delivery info ── */}
          <div className="glass" style={{ padding: "1.25rem 1.5rem" }}>
            <SectionLabel>Delivery</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { icon: <Truck size={15} />,  title: "Standard Delivery",  sub: "3–5 business days · FREE over $100" },
                { icon: <Package size={15} />, title: "Express Delivery",  sub: "1–2 business days · $14.99" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "0.5rem", background: "rgba(59,130,246,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", flexShrink: 0 }}>
                    {row.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "0.85rem" }}>{row.title}</div>
                    <div style={{ color: "#64748b", fontSize: "0.75rem" }}>{row.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Back button at bottom ── */}
      <div style={{ marginTop: "2rem" }}>
        <button onClick={() => router.back()} className="btn-outline"
          style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}>
          <ArrowLeft size={15} /> Back to Products
        </button>
      </div>

    </div>
  );
}