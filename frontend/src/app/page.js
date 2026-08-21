"use client";
import { useAppContext } from "@/context/AppContext";
import { cartAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Plus, Zap, Shield, Truck, Star, ArrowRight, ArrowLeft, Headphones, Monitor, Keyboard, Mouse, ChevronLeft, ChevronRight } from "lucide-react";

const SLIDES = [
  {
    badge: '🎧 New arrivals · Spring 2025',
    title: 'Discover',
    highlight: 'Premium Tech',
    sub: 'Elevate your setup with our curated selection of high-end gear. Free shipping on orders over $100.',
    emoji: '🎧',
    bg: 'linear-gradient(135deg, #0f2a4a 0%, #1e1060 50%, #0f2a4a 100%)',
    glow: 'rgba(99,102,241,0.4)',
  },
  {
    badge: '🖥️ Best seller',
    title: 'Crystal Clear',
    highlight: '4K Displays',
    sub: 'Experience true color accuracy with our premium monitor lineup. Designed for creators and gamers alike.',
    emoji: '🖥️',
    bg: 'linear-gradient(135deg, #0b1b3a 0%, #2a145f 50%, #111827 100%)',
    glow: 'rgba(99,102,241,0.35)',
  },
  {
    badge: '⌨️ Top rated',
    title: 'Type with',
    highlight: 'Precision',
    sub: 'Mechanical keyboards built for performance. Tactile switches, compact design, and custom keycaps.',
    emoji: '⌨️',
    bg: 'linear-gradient(135deg, #0a1a2f 0%, #1f1b4a 50%, #111827 100%)',
    glow: 'rgba(168,85,247,0.35)',
  },
];

export default function Home() {
  const { products, loading, user, refreshCart, cart } = useAppContext();
  const router = useRouter();
  const [adding, setAdding] = useState(null);
  const [added, setAdded] = useState({});
  const [slide, setSlide] = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 4500);
  };

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const goSlide = (idx) => { setSlide(idx); startTimer(); };
  const prevSlide = () => { setSlide(s => (s - 1 + SLIDES.length) % SLIDES.length); startTimer(); };
  const nextSlide = () => { setSlide(s => (s + 1) % SLIDES.length); startTimer(); };

  // check if item already in cart
  const isInCart = (productId) => cart?.items?.some(i => i.productId === productId);

  const handleAddToCart = async (product, e) => {
    e.stopPropagation();
    if (!user) { router.push('/login'); return; }
    if (isInCart(product._id)) { router.push('/cart'); return; }
    setAdding(product._id);
    try {
      await cartAPI.addToCart({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl
      });
      await refreshCart();
      setAdded(prev => ({ ...prev, [product._id]: true }));
      setTimeout(() => setAdded(prev => ({ ...prev, [product._id]: false })), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(null);
    }
  };

  const getButtonLabel = (product) => {
    if (adding === product._id) return 'Adding...';
    if (added[product._id]) return '✓ Added!';
    if (isInCart(product._id)) return 'In Cart →';
    if (product.stock <= 0) return 'Sold Out';
    return 'Add to Cart';
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <div style={{ width: '48px', height: '48px', border: '3px solid rgba(59,130,246,0.3)', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#94a3b8' }}>Loading...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const categories = [
    { icon: <Headphones size={28} />, label: 'Audio', color: '#3b82f6' },
    { icon: <Monitor size={28} />, label: 'Displays', color: '#8b5cf6' },
    { icon: <Keyboard size={28} />, label: 'Keyboards', color: '#10b981' },
    { icon: <Mouse size={28} />, label: 'Accessories', color: '#f59e0b' },
  ];

  const s = SLIDES[slide];

  return (
    <div>

      {/* HERO SLIDER */}
      <div style={{ position: 'relative', marginBottom: '2rem', borderRadius: '1.25rem', overflow: 'hidden' }}>
        <div style={{
          background: s.bg,
          padding: '4rem 3rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '2rem',
          minHeight: '320px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'background 0.6s ease',
        }}>
          {/* bg circles */}
          <div style={{ position: 'absolute', right: '-60px', top: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', right: '80px', bottom: '-80px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

          <div style={{ zIndex: 1, maxWidth: '520px' }}>
            <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', color: '#e2e8f0', fontSize: '0.75rem', padding: '5px 14px', borderRadius: '999px', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.2)' }}>
              {s.badge}
            </span>
            <h1 style={{ fontSize: '3rem', fontWeight: '900', color: '#f1f5f9', margin: '0 0 1rem', lineHeight: 1.15 }}>
              {s.title}<br />
              <span style={{ background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {s.highlight}
              </span>
            </h1>
            <p style={{ color: '#94a3b8', margin: '0 0 2rem', fontSize: '1rem', lineHeight: 1.6 }}>{s.sub}</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" style={{ padding: '0.75rem 1.75rem' }}
                onClick={() => document.getElementById('products').scrollIntoView({ behavior: 'smooth' })}>
                Shop Now <ArrowRight size={16} />
              </button>
              <button className="btn-outline" style={{ padding: '0.75rem 1.75rem' }}
                onClick={() => router.push('/cart')}>
                View Cart
              </button>
            </div>
          </div>

          <div style={{ zIndex: 1, flexShrink: 0, fontSize: '9rem', lineHeight: 1, filter: `drop-shadow(0 20px 40px ${s.glow})`, transition: 'all 0.4s ease' }}>
            {s.emoji}
          </div>
        </div>

        {/* Prev / Next arrows */}
        <button onClick={prevSlide} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <ChevronLeft size={20} />
        </button>
        <button onClick={nextSlide} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <ChevronRight size={20} />
        </button>

        {/* Dot indicators */}
        <div style={{ position: 'absolute', bottom: '1.25rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 10 }}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => goSlide(i)} style={{ width: i === slide ? '24px' : '8px', height: '8px', borderRadius: '999px', background: i === slide ? '#3b82f6' : 'rgba(255,255,255,0.35)', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', padding: 0 }} />
          ))}
        </div>
      </div>

      {/* TRUST BADGES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { icon: <Truck size={22} />, label: 'Free Shipping', sub: 'On orders over $100', color: '#3b82f6' },
          { icon: <Shield size={22} />, label: 'Secure Checkout', sub: '100% safe & encrypted', color: '#10b981' },
          { icon: <Zap size={22} />, label: 'Fast Delivery', sub: 'Ships within 24 hours', color: '#f59e0b' },
        ].map((item, i) => (
          <div key={i} className="glass" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '0.75rem', background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '2px' }}>{item.label}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CATEGORIES */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1.25rem' }}>Available Category</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {categories.map((cat, i) => (
            <button key={i} onClick={() => document.getElementById('products').scrollIntoView({ behavior: 'smooth' })}
              className="glass"
              style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'transform 0.2s', border: 'none', width: '100%' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: `${cat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color }}>
                {cat.icon}
              </div>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* PRODUCTS GRID */}
      <div id="products" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0 }}>Featured Products</h2>
        <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{products.length} items available</span>
      </div>

      {products.length === 0 ? (
        <div className="glass text-center py-8">
          <p style={{ color: '#94a3b8' }}>No products available. Admins can seed the database.</p>
        </div>
      ) : (
        <div className="grid-cols-3" style={{ marginBottom: '3rem' }}>
          {products.map(product => (
            <div key={product._id} className="glass"
              style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onClick={() => router.push(`/products/${product._id}`)}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>
              <div style={{ position: 'relative' }}>
                <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '210px', objectFit: 'cover' }} />
                {product.stock <= 10 && product.stock > 0 && (
                  <span style={{ position: 'absolute', top: '10px', left: '10px', background: '#f59e0b', color: '#000', fontSize: '0.7rem', fontWeight: '700', padding: '3px 8px', borderRadius: '999px' }}>
                    Only {product.stock} left
                  </span>
                )}
                {product.stock === 0 && (
                  <span style={{ position: 'absolute', top: '10px', left: '10px', background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: '700', padding: '3px 8px', borderRadius: '999px' }}>
                    Sold Out
                  </span>
                )}
                {isInCart(product._id) && (
                  <span style={{ position: 'absolute', top: '10px', right: '10px', background: '#10b981', color: '#fff', fontSize: '0.7rem', fontWeight: '700', padding: '3px 8px', borderRadius: '999px' }}>
                    ✓ In Cart
                  </span>
                )}
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '2px' }}>
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} size={10} fill="#f59e0b" color="#f59e0b" />)}
                </div>
              </div>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.4rem', lineHeight: 1.3 }}>{product.name}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '1rem', flex: 1, lineHeight: 1.5 }}>
                  {product.description?.substring(0, 70)}{product.description?.length > 70 ? '...' : ''}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--primary)' }}>
                    ${parseFloat(product.price).toFixed(2)}
                  </span>
                  <button className="btn-primary"
                    onClick={(e) => handleAddToCart(product, e)}
                    disabled={adding === product._id || product.stock <= 0}
                    style={{
                      padding: '0.5rem 1rem', fontSize: '0.8rem',
                      background: added[product._id] ? 'var(--success)' : isInCart(product._id) ? '#7c3aed' : ''
                    }}>
                    {product.stock > 0 && !isInCart(product._id) && <Plus size={14} />}
                    {getButtonLabel(product)}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PROMO BANNER */}
      <div className="glass" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.75rem' }}>Free shipping on orders over $100 🚚</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Limited time offer. Add more items to qualify!</p>
        <button className="btn-primary" style={{ padding: '0.85rem 2rem' }}
          onClick={() => document.getElementById('products').scrollIntoView({ behavior: 'smooth' })}>
          Continue Shopping
        </button>
      </div>

    </div>
  );
}