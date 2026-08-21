/**
 * Catalog Seed Script — SAFE MODE (upsert by name, never deletes existing data)
 * Usage: node seed.js
 * Categories must match Product.js enum: audio | displays | keyboards | accessories
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./Product');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopping_site';

const products = [
  // ── Audio ──────────────────────────────────────────────────────────
  {
    name: 'Premium Wireless Headphones',
    description: 'Noise-cancelling over-ear headphones with 40-hour battery life and Hi-Res Audio support.',
    price: 299.99,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    stock: 50,
    category: 'audio',
  },
  {
    name: 'True Wireless Earbuds',
    description: 'Active noise cancellation, 8h playtime + 32h case, IPX4 sweat resistant.',
    price: 199.99,
    imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500',
    stock: 75,
    category: 'audio',
  },
  {
    name: 'Portable Bluetooth Speaker',
    description: '360 degree surround sound, IPX7 waterproof, 24-hour playtime.',
    price: 129.99,
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500',
    stock: 60,
    category: 'audio',
  },
  {
    name: 'Gaming Headset 7.1 Surround',
    description: 'Virtual 7.1 surround sound, detachable noise-cancelling mic, memory foam ear cushions.',
    price: 119.99,
    imageUrl: 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=500',
    stock: 45,
    category: 'audio',
  },
  {
    name: 'USB Condenser Microphone',
    description: 'Studio-quality cardioid mic with pop filter, ideal for streaming and podcasting.',
    price: 89.99,
    imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=500',
    stock: 40,
    category: 'audio',
  },

  // ── Displays ───────────────────────────────────────────────────────
  {
    name: 'Ultra-Wide 34 inch Monitor',
    description: '3440x1440 curved IPS display with 144Hz refresh rate and USB-C connectivity.',
    price: 649.99,
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500',
    stock: 20,
    category: 'displays',
  },
  {
    name: '27 inch 4K IPS Monitor',
    description: 'True 4K UHD, 99% sRGB, HDR400, USB-C 65W charging, factory calibrated.',
    price: 449.99,
    imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500',
    stock: 30,
    category: 'displays',
  },
  {
    name: '24 inch 165Hz Gaming Monitor',
    description: '1ms response, IPS panel, AMD FreeSync Premium, tilt and height adjustable stand.',
    price: 279.99,
    imageUrl: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=500',
    stock: 35,
    category: 'displays',
  },
  {
    name: 'Portable 15.6 inch USB-C Monitor',
    description: 'Full HD IPS travel display, 60Hz, plug-and-play, slim 5mm body with smart cover.',
    price: 199.99,
    imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500',
    stock: 25,
    category: 'displays',
  },

  // ── Keyboards ──────────────────────────────────────────────────────
  {
    name: 'Mechanical Gaming Keyboard',
    description: 'RGB backlit mechanical keyboard with Cherry MX switches and 100% anti-ghosting.',
    price: 149.99,
    imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500',
    stock: 35,
    category: 'keyboards',
  },
  {
    name: 'Compact 65% Wireless Keyboard',
    description: 'Bluetooth 5.0 and USB-C, hot-swappable switches, CNC aluminium case.',
    price: 119.99,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
    stock: 50,
    category: 'keyboards',
  },
  {
    name: 'Slim Wireless Keyboard',
    description: 'Ultra-thin chiclet keys, multi-device pairing for 3 devices, 2-year battery life.',
    price: 69.99,
    imageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=500',
    stock: 80,
    category: 'keyboards',
  },
  {
    name: 'Ergonomic Split Keyboard',
    description: 'Split layout for natural wrist posture, wrist rest included, Cherry MX Browns.',
    price: 189.99,
    imageUrl: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=500',
    stock: 20,
    category: 'keyboards',
  },

  // ── Accessories ────────────────────────────────────────────────────
  {
    name: 'Wireless Ergonomic Mouse',
    description: 'Bluetooth and 2.4GHz dual-mode mouse with 90-day battery and silent clicks.',
    price: 79.99,
    imageUrl: 'https://images.unsplash.com/photo-1629429408209-1f912961dbd8?w=500',
    stock: 80,
    category: 'accessories',
  },
  {
    name: 'Smart Watch Pro',
    description: 'Health tracking smartwatch with ECG, SpO2, GPS and 7-day battery life.',
    price: 349.99,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    stock: 40,
    category: 'accessories',
  },
  {
    name: 'Fitness Tracker Band',
    description: 'Slim fitness band with sleep tracking, 20 sport modes and 14-day battery.',
    price: 59.99,
    imageUrl: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500',
    stock: 100,
    category: 'accessories',
  },
  {
    name: 'RGB Mouse Pad XL',
    description: '900x400mm extended desk mat with 14 RGB lighting modes and non-slip base.',
    price: 34.99,
    imageUrl: 'https://images.unsplash.com/photo-1616763355548-1b606f439f86?w=500',
    stock: 200,
    category: 'accessories',
  },
  {
    name: 'USB-C 7-in-1 Hub',
    description: '4K HDMI, 100W PD, SD card, 3x USB-A 3.0, compact aluminium design.',
    price: 49.99,
    imageUrl: 'https://images.unsplash.com/photo-1625895197185-efcec01cffe0?w=500',
    stock: 120,
    category: 'accessories',
  },
  {
    name: 'Adjustable Laptop Stand',
    description: 'Aluminium foldable stand, 6 height levels, universal fit 10-17 inch, non-slip pads.',
    price: 39.99,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500',
    stock: 90,
    category: 'accessories',
  },
  {
    name: 'Webcam 4K Autofocus',
    description: '4K 30fps and 1080p 60fps, built-in dual mic, auto light correction, plug-and-play.',
    price: 159.99,
    imageUrl: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=500',
    stock: 55,
    category: 'accessories',
  },
  {
    name: 'Gaming Controller Pro Edition',
    description: 'Hall-effect sticks, customisable triggers, Bluetooth 5.2, works on PC and console.',
    price: 89.99,
    imageUrl: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=500',
    stock: 55,
    category: 'accessories',
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  let added = 0;
  let skipped = 0;

  for (const product of products) {
    const exists = await Product.findOne({ name: product.name });
    if (exists) {
      console.log('Skipped (already exists): ' + product.name);
      skipped++;
    } else {
      await Product.create(product);
      console.log('Added: [' + product.category + '] ' + product.name + ' - $' + product.price);
      added++;
    }
  }

  const total = await Product.countDocuments();
  console.log('Done. Added: ' + added + ' | Skipped: ' + skipped + ' | Total in DB: ' + total);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
