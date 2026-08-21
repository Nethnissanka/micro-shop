const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('WARNING: STRIPE_SECRET_KEY is not set. Stripe payments will fail.');
}

// RabbitMQ will be added in Phase 4

const app = express();
app.use(express.json());
app.use(cors());

db.initDB();

const verifyUser = (req, res, next) => {
  const userId = req.headers['x-user-id']; 
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = userId;
  next();
};

const isAdmin = (req, res, next) => {
  const role = req.headers['x-user-role'];
  if (role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
};

app.get('/health', (req, res) => res.send('Checkout Service Health OK'));

// Create order
app.post('/checkout', verifyUser, async (req, res) => {
  const { items, total, deliveryDetails, paymentMethod, email } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  try {
    let clientSecret = null;
    let paymentStatus = 'Pending';
    let stripePaymentIntentId = null;

    if (paymentMethod === 'stripe') {
      if (!stripe) {
        return res.status(400).json({ error: 'Stripe is not configured on the server. Please use COD or set STRIPE_SECRET_KEY.' });
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100), // amount in cents
        currency: 'usd',
        metadata: { userId: req.userId },
      });
      clientSecret = paymentIntent.client_secret;
      stripePaymentIntentId = paymentIntent.id;
    } else {
      // COD
      paymentStatus = 'Pending (COD)';
    }

    const result = await db.query(
      'INSERT INTO orders (user_id, total, items, status, delivery_details, payment_method, payment_status, stripe_payment_intent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [
        req.userId, 
        total, 
        JSON.stringify(items), 
        'Placed', 
        JSON.stringify(deliveryDetails), 
        paymentMethod, 
        paymentStatus, 
        stripePaymentIntentId
      ]
    );

    const order = result.rows[0];

    const { publishOrder } = require('./rabbitmq');
    await publishOrder({ 
      orderId: order.id, 
      userId: order.user_id, 
      items: typeof items === 'string' ? JSON.parse(items) : items,
      deliveryDetails,
      paymentMethod,
      email,
      total // Use the 'total' variable from the request body
    });

    res.status(201).json({ 
      message: 'Order successful', 
      order,
      clientSecret // Will be null for COD
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Get user orders (Order Tracking)
app.get('/orders', verifyUser, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// Admin: Get all orders
app.get('/admin/orders', isAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// Admin: Update order status
// Admin: Update order status
app.put('/admin/orders/:id/status', isAdmin, async (req, res) => {
  const { status } = req.body;
  try {
    const existing = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    const order = existing.rows[0];

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Prevent changing a cancelled order
    if (order.status === 'Cancelled') {
      return res.status(400).json({ error: 'Cannot update a cancelled order' });
    }

    const result = await db.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// Cancel order (user side)
app.put('/orders/:id/cancel', verifyUser, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );

    const order = result.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (['Shipped', 'Delivered'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot cancel a shipped or delivered order' });
    }

    const updated = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      ['Cancelled', req.params.id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Checkout Service running on port ${PORT}`);
});

module.exports = app; // exported for testing
