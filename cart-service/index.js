const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

require('./rabbitmq');

// Mocking JWT Auth middleware - in a true microservices scene, we'd either verify JWT via shared secret or API Gateway
const verifyUser = (req, res, next) => {
  const userId = req.headers['x-user-id']; // Provided by API Gateway or extracted from token
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = userId;
  next();
};

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect().then(() => console.log('Redis connected'));

app.get('/health', (req, res) => res.send('Cart Service Health OK'));

// Get Cart
app.get('/cart', verifyUser, async (req, res) => {
  try {
    const cart = await redisClient.get(`cart:${req.userId}`);
    res.json(cart ? JSON.parse(cart) : { items: [], total: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// Update Cart (Add/modify items)
app.post('/cart/items', verifyUser, async (req, res) => {
  try {
    const { productId, name, price, quantity, imageUrl } = req.body;
    let cartData = await redisClient.get(`cart:${req.userId}`);
    let cart = cartData ? JSON.parse(cartData) : { items: [], total: 0 };

    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
      if (cart.items[existingItemIndex].quantity <= 0) {
        cart.items.splice(existingItemIndex, 1);
      }
    } else if (quantity > 0) {
      cart.items.push({ productId, name, price, quantity, imageUrl });
    }

    cart.total = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    await redisClient.setEx(`cart:${req.userId}`, 86400, JSON.stringify(cart)); // 24h TTL

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// Remove item entirely
app.delete('/cart/items/:productId', verifyUser, async (req, res) => {
  try {
    let cartData = await redisClient.get(`cart:${req.userId}`);
    if (!cartData) return res.json({ items: [], total: 0 });
    
    let cart = JSON.parse(cartData);
    cart.items = cart.items.filter(item => item.productId !== req.params.productId);
    cart.total = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    await redisClient.setEx(`cart:${req.userId}`, 86400, JSON.stringify(cart));
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// Clear cart (Also will be triggered by RabbitMQ later)
app.delete('/cart', verifyUser, async (req, res) => {
  try {
    await redisClient.del(`cart:${req.userId}`);
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Cart Service running on port ${PORT}`);
});

module.exports = app; // exported for testing
