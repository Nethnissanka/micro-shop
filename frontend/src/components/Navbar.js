"use client";
import Link from 'next/link';
import { ShoppingCart, User, LogOut, Package, ChevronDown, Settings, MapPin, ClipboardList } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout, cart } = useAppContext();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const cartItemCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
  };

  return (
    <nav className="glass" style={{
      margin: '1rem',
      padding: '0.875rem 2rem',
      position: 'sticky',
      top: '1rem',
      zIndex: 50,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1rem',
    }}>

      {/* ── Brand ── */}
      <Link href="/" style={{ fontSize: '1.4rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Package size={18} color="white" />
        </div>
        <span style={{ background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          MicroShop
        </span>
      </Link>

      {/* ── Nav links (center) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {[
          { label: 'Home',     href: '/' },
          { label: 'Products', href: '/#products' },
        ].map(link => (
          <Link key={link.href} href={link.href}
            style={{ padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#e4e8ee', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}>
            {link.label}
          </Link>
        ))}
        {user?.role === 'admin' && (
          <Link href="/admin"
            style={{ padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}>
            ⭐ Admin
          </Link>
        )}
      </div>

      {/* ── Right side ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>

        {/* Cart button */}
        <Link href="/cart" style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          color: 'white', transition: 'all 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>
          <ShoppingCart size={17} />
          <span>Cart</span>
          {cartItemCount > 0 && (
            <span style={{
              position: 'absolute', top: '-7px', right: '-7px',
              background: 'var(--primary)', color: 'white', borderRadius: '50%',
              width: '20px', height: '20px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800',
              border: '2px solid var(--background)',
            }}>
              {cartItemCount > 9 ? '9+' : cartItemCount}
            </span>
          )}
        </Link>

        {/* User area */}
        {user ? (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Avatar button */}
            <button
              onClick={() => setDropdownOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.4rem 0.75rem 0.4rem 0.4rem',
                borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.12)',
                background: dropdownOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
                color: 'white', transition: 'all 0.2s', cursor: 'pointer',
              }}>
              {/* Avatar circle */}
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: '800', color: 'white', flexShrink: 0,
              }}>
                {user.email?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: '0.825rem', fontWeight: '600', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email?.split('@')[0]}
              </span>
              <ChevronDown size={14} style={{ color: '#94a3b8', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                minWidth: '220px',
                background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.875rem',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                overflow: 'hidden', zIndex: 100,
              }}>

                {/* User info header */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '2px' }}>{user.email?.split('@')[0]}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                  <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.68rem', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', background: user.role === 'admin' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', color: user.role === 'admin' ? '#ef4444' : '#3b82f6' }}>
                    {user.role === 'admin' ? '⭐ Admin' : 'Customer'}
                  </span>
                </div>

                {/* Menu items */}
                <div style={{ padding: '0.5rem' }}>
                  {[
                    { icon: <ClipboardList size={15} />, label: 'My Orders',        href: '/profile',          tab: 'orders' },
                    { icon: <User size={15} />,          label: 'Profile Details',  href: '/profile',          tab: 'profile' },
                  ].map(item => (
                    <button key={item.label}
                      onClick={() => {
                        setDropdownOpen(false);
                        // Pass tab via sessionStorage so profile page can pick it up
                        sessionStorage.setItem('profile_tab', item.tab);
                        router.push(item.href);
                      }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.85rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#ffffff'; }}>
                      <span style={{ color: '#3b82f6', flexShrink: 0 }}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Logout */}
                <div style={{ padding: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <button onClick={handleLogout}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.85rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/login" className="btn-outline" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
              Login
            </Link>
            <Link href="/register" className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}