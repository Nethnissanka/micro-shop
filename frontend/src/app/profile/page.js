"use client";
import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { checkoutAPI } from '@/lib/api';
import {
  Package, Clock, CheckCircle, ShoppingBag, User,
  ChevronDown, ChevronUp, MapPin, Mail,
  Edit3, Save, X, Shield, Star, ClipboardList,
  TrendingUp, DollarSign, Truck
} from 'lucide-react';
import { useRouter } from 'next/navigation';

/* ─── Constants ─────────────────────────────────────────── */
const STATUS = {
  Delivered:  { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', icon: <CheckCircle size={13} /> },
  Placed:     { bg: 'rgba(59,130,246,0.15)',   color: '#3b82f6', icon: <Clock size={13} /> },
  Processing: { bg: 'rgba(245,158,11,0.15)',   color: '#f59e0b', icon: <Clock size={13} /> },
  Shipped:    { bg: 'rgba(139,92,246,0.15)',   color: '#8b5cf6', icon: <Truck size={13} /> },
  Cancelled:  { bg: 'rgba(239,68,68,0.15)',    color: '#ef4444', icon: <X size={13} /> },
};

const TABS = [
  { key: 'orders',  label: 'My Orders',        icon: <ClipboardList size={15} /> },
  { key: 'profile', label: 'Profile Details',  icon: <User size={15} /> },
  { key: 'address', label: 'Delivery Address', icon: <MapPin size={15} /> },
];

const ADDR_FIELDS = [
  { key: 'fullName', label: 'Full Name',         placeholder: 'John Doe',        col: '1 / -1' },
  { key: 'phone',    label: 'Phone Number',       placeholder: '+1 234 567 8900' },
  { key: 'street',   label: 'Street Address',     placeholder: '123 Main St',     col: '1 / -1' },
  { key: 'city',     label: 'City',               placeholder: 'New York' },
  { key: 'state',    label: 'State / Province',   placeholder: 'NY' },
  { key: 'zip',      label: 'ZIP / Postal Code',  placeholder: '10001' },
  { key: 'country',  label: 'Country',            placeholder: 'United States',   col: '1 / -1' },
];

/* ─── Shared sub-components ─────────────────────────────── */
function SectionHeader({ children }) {
  return (
    <h3 style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.875rem' }}>
      {children}
    </h3>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.65rem', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{value}</div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', flex: 1 }}>
      <div style={{ color, marginBottom: '0.25rem' }}>{icon}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: '900', color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────── */
export default function Profile() {
  const { user } = useAppContext();
  const router   = useRouter();

  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [tab,      setTab]      = useState('orders');

  const [address,   setAddress]   = useState({ fullName: '', phone: '', street: '', city: '', state: '', zip: '', country: '' });
  const [editAddr,  setEditAddr]  = useState(false);
  const [addrSaved, setAddrSaved] = useState(false);

  // Pick up tab from Navbar dropdown
  useEffect(() => {
    const stored = sessionStorage.getItem('profile_tab');
    if (stored) { setTab(stored); sessionStorage.removeItem('profile_tab'); }
  }, []);

  // Load saved address per user
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`delivery_address_${user.id}`);
      if (saved) setAddress(JSON.parse(saved));
    }
  }, [user]);

  // Load orders
  useEffect(() => {
    if (user) {
      checkoutAPI.getOrders()
        .then(setOrders)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await checkoutAPI.cancelOrder(id);
      setOrders(orders.map(o => o.id === id ? { ...o, status: 'Cancelled' } : o));
    } catch { alert('Could not cancel order.'); }
  };

  const saveAddress = () => {
    localStorage.setItem(`delivery_address_${user.id}`, JSON.stringify(address));
    setEditAddr(false);
    setAddrSaved(true);
    setTimeout(() => setAddrSaved(false), 2500);
  };

  /* ── Guards ── */
  if (!user) return (
    <div style={{ maxWidth: '460px', margin: '5rem auto', textAlign: 'center' }}>
      <div className="glass" style={{ padding: '3rem' }}>
        <User size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>Please log in</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Sign in to view your profile and orders.</p>
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => router.push('/login')}>Login</button>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid rgba(59,130,246,0.2)', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const totalSpent     = orders.reduce((a, o) => a + parseFloat(o.total || 0), 0);
  const deliveredCount = orders.filter(o => o.status === 'Delivered').length;
  const activeCount    = orders.filter(o => ['Placed', 'Processing', 'Shipped'].includes(o.status)).length;

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>

      {/* ══════════ PROFILE HEADER ══════════ */}
      <div className="glass" style={{ padding: '2rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.06))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>

          {/* Avatar */}
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: '900', color: 'white', flexShrink: 0, boxShadow: '0 0 0 4px rgba(59,130,246,0.2)' }}>
            {user.email?.[0]?.toUpperCase()}
          </div>

          {/* Name + role */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email?.split('@')[0]}
              </h1>
              <span style={{ background: user.role === 'admin' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.12)', color: user.role === 'admin' ? '#ef4444' : '#3b82f6', fontSize: '0.68rem', fontWeight: '700', padding: '3px 10px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>
                {user.role === 'admin' ? '⭐ Admin' : 'Customer'}
              </span>
            </div>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.82rem' }}>{user.email}</p>
            {address.city && (
              <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} /> {address.city}{address.country ? `, ${address.country}` : ''}
              </p>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0, flexWrap: 'wrap' }}>
            <StatCard icon={<ClipboardList size={18} />} value={orders.length}             label="Orders"    color="var(--primary)" />
            <StatCard icon={<TrendingUp size={18} />}    value={activeCount}               label="Active"    color="#8b5cf6" />
            <StatCard icon={<CheckCircle size={18} />}   value={deliveredCount}            label="Delivered" color="#10b981" />
            <StatCard icon={<DollarSign size={18} />}    value={`$${totalSpent.toFixed(0)}`} label="Spent"  color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* ══════════ TABS ══════════ */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem', padding: '0.375rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.07)', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.1rem', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.845rem', cursor: 'pointer', border: 'none', transition: 'all 0.18s', background: tab === t.key ? 'var(--primary)' : 'transparent', color: tab === t.key ? 'white' : '#94a3b8', boxShadow: tab === t.key ? '0 2px 8px rgba(59,130,246,0.35)' : 'none' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ ORDERS TAB ══════════ */}
      {tab === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>Order History</h2>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
          </div>

          {orders.length === 0 ? (
            <div className="glass" style={{ padding: '3.5rem', textAlign: 'center' }}>
              <ShoppingBag size={52} style={{ color: '#334155', marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem', color: '#94a3b8' }}>No orders yet</h3>
              <p style={{ color: '#475569', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Your order history will appear here once you place an order.</p>
              <button className="btn-primary" style={{ padding: '0.75rem 2rem' }} onClick={() => router.push('/')}>
                Start Shopping
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {orders.map(order => {
                const s     = STATUS[order.status] || STATUS['Placed'];
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                const open  = expanded === order.id;

                return (
                  <div key={order.id} className="glass" style={{ overflow: 'hidden' }}>

                    {/* ── Header row (always visible) ── */}
                    <div onClick={() => setExpanded(open ? null : order.id)}
                      style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', userSelect: 'none' }}>

                      {/* Status icon */}
                      <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
                        {s.icon}
                      </div>

                      {/* Order info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: '0.875rem' }}>Order #{order.id}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '1px' }}>
                          {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          {' · '}{items.length} item{items.length !== 1 ? 's' : ''}
                          {order.payment_method && <span> · {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Card'}</span>}
                        </div>
                      </div>

                      {/* Status badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: '700', padding: '3px 10px', borderRadius: '999px', flexShrink: 0 }}>
                        {s.icon} {order.status}
                      </div>

                      {/* Total */}
                      <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--primary)', flexShrink: 0, minWidth: '68px', textAlign: 'right' }}>
                        ${parseFloat(order.total).toFixed(2)}
                      </div>

                      {/* Chevron */}
                      <span style={{ color: '#475569', flexShrink: 0 }}>
                        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </div>

                    {/* ── Expanded detail ── */}
                    {open && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1rem 1.25rem' }}>

                        {/* Items */}
                        <SectionHeader>Items</SectionHeader>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
                          {items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.625rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                              {item.imageUrl && (
                                <img src={item.imageUrl} alt={item.name}
                                  style={{ width: '42px', height: '42px', borderRadius: '0.4rem', objectFit: 'cover', flexShrink: 0 }} />
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '600', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{item.quantity} × ${parseFloat(item.price).toFixed(2)}</div>
                              </div>
                              <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--primary)', flexShrink: 0 }}>
                                ${(item.quantity * item.price).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Delivery address */}
                        {order.delivery_details && (
                          <>
                            <SectionHeader>Delivery Address</SectionHeader>
                            <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem' }}>
                              <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#3b82f6' }} />
                              <span>
                                {order.delivery_details.fullName && <strong style={{ color: 'white' }}>{order.delivery_details.fullName} · </strong>}
                                {order.delivery_details.address}, {order.delivery_details.city}
                                {order.delivery_details.zipCode && ` ${order.delivery_details.zipCode}`}
                              </span>
                            </div>
                          </>
                        )}

                        {/* Cancel button */}
                        {['Placed', 'Processing'].includes(order.status) && (
                          <button className="btn-outline"
                            onClick={(e) => { e.stopPropagation(); handleCancel(order.id); }}
                            style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.35)' }}>
                            <X size={14} /> Cancel Order
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ PROFILE TAB ══════════ */}
      {tab === 'profile' && (
        <div className="glass" style={{ padding: '2rem' }}>
          <SectionHeader>Account Information</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            <InfoRow icon={<Mail size={15} />}   label="Email Address" value={user.email} />
            <InfoRow icon={<Shield size={15} />} label="Account Role"  value={user.role === 'admin' ? 'Administrator' : 'Customer'} />
            <InfoRow icon={<Star size={15} />}   label="Status"        value="Active Member" />
          </div>

          <SectionHeader>Security</SectionHeader>
          <div style={{ padding: '1rem 1.25rem', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '0.65rem', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6 }}>
            To change your <strong style={{ color: '#93c5fd' }}>email</strong> or <strong style={{ color: '#93c5fd' }}>password</strong>, please contact support. Your account data is protected with industry-standard encryption.
          </div>
        </div>
      )}

      {/* ══════════ ADDRESS TAB ══════════ */}
      {tab === 'address' && (
        <div className="glass" style={{ padding: '2rem' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 2px' }}>Delivery Address</h2>
              <p style={{ color: '#64748b', fontSize: '0.78rem', margin: 0 }}>Saved address auto-fills at checkout</p>
            </div>
            {!editAddr ? (
              <button className="btn-outline" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                onClick={() => setEditAddr(true)}>
                <Edit3 size={13} /> {address.fullName ? 'Edit' : 'Add Address'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }} onClick={saveAddress}>
                  <Save size={13} /> Save
                </button>
                <button className="btn-outline" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }} onClick={() => setEditAddr(false)}>
                  <X size={13} /> Cancel
                </button>
              </div>
            )}
          </div>

          {/* Success toast */}
          {addrSaved && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '0.6rem', padding: '0.75rem 1rem', color: '#10b981', fontSize: '0.82rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={15} /> Address saved successfully!
            </div>
          )}

          {/* No address yet */}
          {!editAddr && !address.fullName && (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px dashed rgba(255,255,255,0.1)', marginBottom: '1.25rem' }}>
              <MapPin size={32} style={{ color: '#334155', marginBottom: '0.75rem' }} />
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>No address saved yet. Click <strong style={{ color: '#94a3b8' }}>Add Address</strong> to get started.</p>
            </div>
          )}

          {/* Address fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            {ADDR_FIELDS.map(field => (
              <div key={field.key} style={{ gridColumn: field.col || 'auto' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '700', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {field.label}
                </label>
                {editAddr ? (
                  <input
                    value={address[field.key]}
                    onChange={e => setAddress({ ...address, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '0.7rem 0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.55rem', color: 'white', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                ) : (
                  <div style={{ padding: '0.7rem 0.9rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.55rem', fontSize: '0.875rem', color: address[field.key] ? 'white' : '#334155', fontStyle: address[field.key] ? 'normal' : 'italic', minHeight: '40px' }}>
                    {address[field.key] || '—'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}