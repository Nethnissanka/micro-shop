import axios from 'axios';

/**
 * Base URL for all API calls.
 * Resolved in order:
 *   1. NEXT_PUBLIC_API_BASE_URL env var (set per environment in .env.local / .env.staging / .env.production)
 *   2. Fallback to gateway on localhost:8080 for local Docker dev
 *
 * Environment files:
 *   .env.local       → NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
 *   .env.staging     → NEXT_PUBLIC_API_BASE_URL=*
 *   .env.production  → NEXT_PUBLIC_API_BASE_URL=http://48.206.130.22.nip.io:8080
 */
const getBaseUrl = () => {
  // Client-side: Use /api prefix so Ingress routes it to the Gateway
  if (typeof window !== 'undefined') {
    return '/api'; 
  }
  // Server-side (SSR): Use the internal Kubernetes service name
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://api-gateway:8080';
};

const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Attach auth headers on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user = {};
    if (userStr && userStr !== 'undefined' && userStr !== '[object Object]') {
      try { user = JSON.parse(userStr); } catch (e) {}
    }

    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (user.id) config.headers['x-user-id'] = user.id;
    if (user.role) config.headers['x-user-role'] = user.role;
  }
  return config;
});

// Global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth Service (/auth/*) ─────────────────────────────────────────
export const authAPI = {
  login:       (data)       => api.post('/auth/login',        data)           .then(r => r.data),
  register:    (data)       => api.post('/auth/register',     data)           .then(r => r.data),
  verify:      ()           => api.get('/auth/verify')                        .then(r => r.data),
  googleLogin: (credential) => api.post('/auth/google-login', { credential }) .then(r => r.data),
};

// ── Catalog Service (/products/*) ─────────────────────────────────
export const catalogAPI = {
  getProducts:  (params)     => api.get('/products',                  { params }).then(r => r.data),
  getProduct:   (id)         => api.get(`/products/${id}`)                      .then(r => r.data),
  seed:         ()           => api.post('/products/seed')                      .then(r => r.data),
  addProduct:   (data)       => api.post('/products',           data)           .then(r => r.data),
  editProduct:  (id, data)   => api.put(`/products/${id}`,      data)           .then(r => r.data),
  deleteProduct:(id)         => api.delete(`/products/${id}`)                   .then(r => r.data),

  /**
   * Upload a product image to Azure Blob Storage via the catalog service.
   * @param {File} imageFile - The File object from an <input type="file">
   * @returns {Promise<{ imageUrl: string }>} Public Azure Blob URL
   */
  uploadImage: (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post('/products/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
};

// ── Cart Service (/cart/*) ─────────────────────────────────────────
export const cartAPI = {
  getCart:        ()          => api.get('/cart')                             .then(r => r.data),
  addToCart:      (item)      => api.post('/cart/items',  item)               .then(r => r.data),
  removeFromCart: (productId) => api.delete(`/cart/items/${productId}`)       .then(r => r.data),
  clearCart:      ()          => api.delete('/cart')                          .then(r => r.data),
};

// ── Checkout Service (/checkout/*, /orders/*, /admin/*) ────────────
export const checkoutAPI = {
  placeOrder:        (data)        => api.post('/checkout',                        data)   .then(r => r.data),
  getOrders:         ()            => api.get('/orders')                                   .then(r => r.data),
  getAdminOrders:    ()            => api.get('/admin/orders')                             .then(r => r.data),
  updateOrderStatus: (id, status)  => api.put(`/admin/orders/${id}/status`, { status })   .then(r => r.data),
  cancelOrder:       (id)          => api.put(`/orders/${id}/cancel`)                      .then(r => r.data),
};

export default api;
