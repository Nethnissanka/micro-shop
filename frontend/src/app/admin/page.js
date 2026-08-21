"use client";
import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { checkoutAPI, catalogAPI } from '@/lib/api';

export default function Admin() {
  const { user, refreshProducts } = useAppContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', imageUrl: '', stock: '', imageFile: null });
  const [adding, setAdding] = useState(false);
  const [products, setProducts] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    if (user && user.role === 'admin') {
      checkoutAPI.getAdminOrders()
        .then(setOrders)
        .catch(console.error)
        .finally(() => setLoading(false));
      catalogAPI.getProducts()
        .then(setProducts)
        .catch(console.error);
    }
  }, [user]);

  const handleImageUpload = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      if (isEdit) {
        setEditItem({ ...editItem, imageUrl: reader.result });
        setEditImageFile(file);
      } else {
        setNewItem({ ...newItem, imageUrl: reader.result, imageFile: file });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStatusChange = async (id, status) => {
    try {
      await checkoutAPI.updateOrderStatus(id, status);
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeed = async () => {
    try {
      await catalogAPI.seed();
      alert('Database seeded! Please refresh.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = async () => {
    setAdding(true);
    try {
      let finalImageUrl = newItem.imageUrl;

      // 1. If there's a file, upload it to Azure first
      if (newItem.imageFile) {
        const uploadRes = await catalogAPI.uploadImage(newItem.imageFile);
        finalImageUrl = uploadRes.imageUrl;
      }

      // 2. Add product with the Azure URL
      const added = await catalogAPI.addProduct({
        ...newItem,
        imageUrl: finalImageUrl,
        price: parseFloat(newItem.price),
        stock: parseInt(newItem.stock),
      });
      
      setProducts(prev => [...prev, added]);
      await refreshProducts();
      setShowModal(false);
      setNewItem({ name: '', description: '', price: '', imageUrl: '', stock: '', imageFile: null });
      alert('Item added successfully with cloud image!');
    } catch (err) {
      alert('Failed to add item: ' + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    await catalogAPI.deleteProduct(id);
    setProducts(products.filter(p => p._id !== id));
    await refreshProducts();
  };

  const handleEdit = async () => {
    setAdding(true);
    try {
      let finalImageUrl = editItem.imageUrl;

      if (editImageFile) {
        const uploadRes = await catalogAPI.uploadImage(editImageFile);
        finalImageUrl = uploadRes.imageUrl;
      }

      await catalogAPI.editProduct(editItem._id, {
        ...editItem,
        imageUrl: finalImageUrl,
        price: parseFloat(editItem.price),
        stock: parseInt(editItem.stock),
      });

      setProducts(products.map(p => p._id === editItem._id ? { ...editItem, imageUrl: finalImageUrl } : p));
      setEditItem(null);
      setEditImageFile(null);
      await refreshProducts();
      alert('Product updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to update product.');
    } finally {
      setAdding(false);
    }
  };

  if (!user || user.role !== 'admin') return <div className="text-center py-8 text-error">Forbidden: Admin only</div>;
  if (loading) return <div className="text-center py-8">Loading admin panel...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Admin Dashboard</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          className={activeTab === 'orders' ? 'btn-primary' : 'btn-outline'}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <button
          className={activeTab === 'products' ? 'btn-primary' : 'btn-outline'}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
      </div>
    </div>

      {activeTab === 'orders' && (
        <div className="glass" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>All Orders</h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Order ID</th>
                <th style={{ padding: '1rem' }}>User ID</th>
                <th style={{ padding: '1rem' }}>Total</th>
                <th style={{ padding: '1rem' }}>Pay Method</th>
                <th style={{ padding: '1rem' }}>Address</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>#{order.id}</td>
                  <td style={{ padding: '1rem' }}>User {order.user_id}</td>
                  <td style={{ padding: '1rem' }}>${parseFloat(order.total).toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold' }}>{order.payment_method || 'N/A'}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {order.delivery_details ? (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        <p>{order.delivery_details.fullName}</p>
                        <p>{order.delivery_details.address}, {order.delivery_details.city}</p>
                        <p>Tel: {order.delivery_details.phone}</p>
                      </div>
                    ) : 'N/A'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ color: order.status === 'Delivered' ? 'var(--success)' : 'var(--primary)', fontWeight: 'bold' }}>{order.status}</span>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{order.payment_status}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <select 
                      className="input-field" 
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      style={{ width: 'auto', padding: '0.25rem 0.5rem', backgroundColor: '#0f172a' }}
                      disabled={order.status === 'Cancelled'}
                    >
                      <option value="Placed">Placed</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="glass" style={{ padding: '2rem', marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>All Products</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleSeed}
              onMouseEnter={e => e.target.style.color = '#e2e8f0'}
              onMouseLeave={e => e.target.style.color = '#64748b'}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Seed Catalog DB
            </button>
            <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Product</button>
          </div>
        </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                <th style={{ padding: '1rem', width: '50%' }}>Name</th>
                <th style={{ padding: '1rem', width: '15%' }}>Price</th>
                <th style={{ padding: '1rem', width: '15%' }}>Stock</th>
                <th style={{ padding: '1rem', width: '20%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>{p.name}</td>
                  <td style={{ padding: '1rem' }}>${p.price}</td>
                  <td style={{ padding: '1rem' }}>{p.stock}</td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-outline" onClick={() => setEditItem(p)}>Edit</button>
                    <button className="btn-outline" style={{ color: 'var(--error)' }} onClick={() => handleDelete(p._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ padding: '2rem', width: '400px', borderRadius: '12px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Add New Product</h2>
            {['name', 'description', 'price', 'stock'].map(field => (
              <input
                key={field}
                className="input-field"
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                value={newItem[field]}
                onChange={e => setNewItem({ ...newItem, [field]: e.target.value })}
                style={{ display: 'block', width: '100%', marginBottom: '1rem' }}
              />
            ))}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 1rem', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: '#0f172a', cursor: 'pointer'
              }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                  {newItem.imageUrl ? '✓ Image selected' : 'Choose image...'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, false)}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            {newItem.imageUrl && (
              <img src={newItem.imageUrl} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '1rem' }} />
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddItem} disabled={adding}>
                {adding ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ padding: '2rem', width: '400px', borderRadius: '12px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Edit Product</h2>
            {['name', 'description', 'price', 'stock'].map(field => (
              <input
                key={field}
                className="input-field"
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                value={editItem[field]}
                onChange={e => setEditItem({ ...editItem, [field]: e.target.value })}
                style={{ display: 'block', width: '100%', marginBottom: '1rem' }}
              />
            ))}
            <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 1rem', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              backgroundColor: '#0f172a', cursor: 'pointer'
            }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                {editItem.imageUrl ? '✓ Image selected' : 'Choose image...'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, true)}
                style={{ display: 'none' }}
              />
            </label>
          </div>
            {editItem.imageUrl && (
              <img src={editItem.imageUrl} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '1rem' }} />
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setEditItem(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
