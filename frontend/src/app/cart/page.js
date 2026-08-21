"use client";
import { useAppContext } from "@/context/AppContext";
import { cartAPI } from "@/lib/api";
import { Trash2, CreditCard, ShoppingBag, ArrowLeft, Plus, Minus, CheckSquare, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Cart() {
  const { cart, refreshCart, user } = useAppContext();
  const router = useRouter();
  const [removing, setRemoving]   = useState(null);
  const [updating, setUpdating]   = useState(null);
  const [selected, setSelected]   = useState({}); // { [productId]: true/false }

  // Select all by default when cart loads
  useEffect(() => {
    if (cart?.items) {
      const all = {};
      cart.items.forEach(i => { all[i.productId] = true; });
      setSelected(all);
    }
  }, [cart?.items?.length]);

  if (!user) return (
    <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
      <div className="glass" style={{ padding: '3rem' }}>
        <ShoppingBag size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.75rem' }}>Sign in to view your cart</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>You need to be logged in to access your cart.</p>
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => router.push('/login')}>Login</button>
      </div>
    </div>
  );

  const toggleItem = (productId) =>
    setSelected(prev => ({ ...prev, [productId]: !prev[productId] }));

  const allChecked  = cart?.items?.length > 0 && cart.items.every(i => selected[i.productId]);
  const toggleAll   = () => {
    const next = {};
    cart.items.forEach(i => { next[i.productId] = !allChecked; });
    setSelected(next);
  };

  const selectedItems = cart?.items?.filter(i => selected[i.productId]) || [];
  const selectedTotal = selectedItems.reduce((a, i) => a + i.price * i.quantity, 0);
  const selectedCount = selectedItems.reduce((a, i) => a + i.quantity, 0);
  const shipping      = selectedTotal >= 100 ? 0 : selectedTotal > 0 ? 9.99 : 0;
  const grandTotal    = (selectedTotal + shipping).toFixed(2);

  const handleRemove = async (productId) => {
    setRemoving(productId);
    try {
      await cartAPI.removeFromCart(productId);
      await refreshCart();
    } catch (err) { console.error(err); }
    finally { setRemoving(null); }
  };

  const handleQtyChange = async (item, delta) => {
    setUpdating(item.productId);
    try {
      if (item.quantity + delta <= 0) {
        await cartAPI.removeFromCart(item.productId);
      } else {
        await cartAPI.addToCart({
          productId: item.productId,
          name:      item.name,
          price:     item.price,
          quantity:  delta,
          imageUrl:  item.imageUrl,
        });
      }
      await refreshCart();
    } catch (err) { console.error(err); }
    finally { setUpdating(null); }
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item to checkout.');
      return;
    }
    // Pass selected items to checkout via localStorage
    localStorage.setItem('checkout_items', JSON.stringify({
      items: selectedItems,
      total: selectedTotal,
    }));
    router.push('/checkout');
  };

  const itemCount = cart?.items?.reduce((a, i) => a + i.quantity, 0) || 0;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => router.back()} className="btn-outline"
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>Shopping Cart</h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem' }}>
            {itemCount} item{itemCount !== 1 ? 's' : ''} · {selectedItems.length} selected
          </p>
        </div>
      </div>

      {!cart?.items || cart.items.length === 0 ? (
        <div className="glass" style={{ padding: '4rem', textAlign: 'center' }}>
          <ShoppingBag size={64} style={{ color: '#94a3b8', marginBottom: '1.5rem' }} />
          <h2 style={{ marginBottom: '0.75rem' }}>Your cart is empty</h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Looks like you haven&apos;t added anything yet.</p>
          <button className="btn-primary" style={{ padding: '0.875rem 2rem' }}
            onClick={() => router.push('/')}>Start Shopping</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>

          {/* Items list */}
          <div className="glass" style={{ overflow: 'hidden' }}>

            {/* Select all row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
              <button onClick={toggleAll}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: allChecked ? 'var(--primary)' : '#94a3b8', display: 'flex', padding: 0 }}>
                {allChecked ? <CheckSquare size={20} /> : <Square size={20} />}
              </button>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>
                {allChecked ? 'Deselect All' : 'Select All'}
              </span>
              {selectedItems.length > 0 && selectedItems.length < cart.items.length && (
                <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: 'auto' }}>
                  {selectedItems.length} of {cart.items.length} selected
                </span>
              )}
            </div>

            {cart.items.map((item, idx) => {
              const isSelected = !!selected[item.productId];
              return (
                <div key={item.productId} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.1rem 1.5rem',
                  borderBottom: idx < cart.items.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  opacity: updating === item.productId ? 0.5 : isSelected ? 1 : 0.45,
                  transition: 'opacity 0.2s',
                  background: isSelected ? 'transparent' : 'rgba(0,0,0,0.1)',
                }}>

                  {/* Checkbox */}
                  <button onClick={() => toggleItem(item.productId)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSelected ? 'var(--primary)' : '#64748b', display: 'flex', flexShrink: 0, padding: 0 }}>
                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>

                  {/* Image */}
                  <img src={item.imageUrl} alt={item.name}
                    style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '0.65rem', flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => router.push(`/products/${item.productId}`)} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '3px', cursor: 'pointer' }}
                      onClick={() => router.push(`/products/${item.productId}`)}>
                      {item.name}
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: 0 }}>
                      ${parseFloat(item.price).toFixed(2)} each
                    </p>
                  </div>

                  {/* Qty +/- */}
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <button onClick={() => handleQtyChange(item, -1)} disabled={updating === item.productId}
                      style={{ width: '30px', height: '30px', background: item.quantity === 1 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.4rem 0 0 0.4rem', color: item.quantity === 1 ? 'var(--error)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Minus size={13} />
                    </button>
                    <div style={{ width: '38px', height: '30px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderLeft: 'none', borderRight: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem' }}>
                      {item.quantity}
                    </div>
                    <button onClick={() => handleQtyChange(item, +1)} disabled={updating === item.productId}
                      style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0 0.4rem 0.4rem 0', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '68px' }}>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: isSelected ? 'var(--primary)' : '#64748b' }}>
                      ${(item.quantity * item.price).toFixed(2)}
                    </div>
                  </div>

                  {/* Remove */}
                  <button onClick={() => handleRemove(item.productId)} disabled={removing === item.productId}
                    style={{ color: removing === item.productId ? '#94a3b8' : 'var(--error)', padding: '5px', borderRadius: '0.4rem', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', flexShrink: 0, display: 'flex' }}
                    title="Remove item">
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Order summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>Order Summary</h2>

              {/* Selection info */}
              {selectedItems.length < cart.items.length && (
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '0.5rem', padding: '0.6rem 0.8rem', fontSize: '0.78rem', color: '#3b82f6', marginBottom: '1rem' }}>
                  {selectedItems.length === 0 ? '⚠️ No items selected' : `✓ ${selectedItems.length} of ${cart.items.length} items selected`}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: '#94a3b8' }}>Selected ({selectedCount} items)</span>
                  <span>${selectedTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: '#94a3b8' }}>Shipping</span>
                  <span style={{ color: shipping === 0 && selectedTotal > 0 ? '#10b981' : 'inherit' }}>
                    {selectedTotal === 0 ? '—' : shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                {selectedTotal > 0 && shipping > 0 && (
                  <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.5rem', padding: '0.6rem 0.8rem', fontSize: '0.75rem', color: '#f59e0b' }}>
                    Add ${(100 - selectedTotal).toFixed(2)} more for free shipping!
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', fontSize: '1rem' }}>Total</span>
                <span style={{ fontWeight: '900', fontSize: '1.4rem', color: 'var(--primary)' }}>${grandTotal}</span>
              </div>

              <button className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '0.95rem', opacity: selectedItems.length === 0 ? 0.5 : 1 }}
                onClick={handleCheckout}>
                <CreditCard size={18} />
                Checkout ({selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''})
              </button>

              <button className="btn-outline"
                style={{ width: '100%', justifyContent: 'center', padding: '0.625rem', fontSize: '0.85rem', marginTop: '0.75rem' }}
                onClick={() => router.push('/')}>
                Continue Shopping
              </button>
            </div>

            <div className="glass" style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#94a3b8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ color: '#10b981' }}>🔒</span> Secure 256-bit SSL checkout
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#10b981' }}>↩</span> 30-day free returns
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
