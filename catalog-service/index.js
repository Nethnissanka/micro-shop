const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

const connectDB = require('./db');
const Product = require('./Product');

const app = express();
app.use(express.json());
app.use(cors());

connectDB();
require('./rabbitmq');

// ── Azure Blob Storage client ────────────────────────────────────────
const getBlobClient = () => {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey  = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  if (!accountName || !accountKey) {
    throw new Error('Azure Storage credentials are not configured. Set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY.');
  }
  const connStr = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
  return BlobServiceClient.fromConnectionString(connStr);
};

// ── Multer (memory storage — buffer sent directly to Azure) ─────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// ── Admin middleware ─────────────────────────────────────────────────
const isAdmin = (req, res, next) => {
  const role = req.headers['x-user-role'];
  if (role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
};

app.get('/health', (req, res) => res.send('Catalog Service Health OK'));

// ── Image Upload Route (Admin only) ─────────────────────────────────
// POST /products/upload-image  (multipart/form-data, field: "image")
// Returns: { imageUrl: "https://microstoreprodimages.blob.core.windows.net/product-images/xxx.jpg" }
app.post('/products/upload-image', isAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });

  try {
    const containerName = process.env.AZURE_CONTAINER_NAME || 'product-images';
    const blobServiceClient = getBlobClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Generate a unique blob name: timestamp + original filename
    const ext       = req.file.originalname.split('.').pop();
    const blobName  = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype }
    });

    const imageUrl = blockBlobClient.url;
    res.json({ imageUrl });
  } catch (err) {
    console.error('Azure upload error:', err.message);
    res.status(500).json({ error: 'Image upload failed', details: err.message });
  }
});

// ── Get all products ─────────────────────────────────────────────────
app.get('/products', async (req, res) => {
  try {
    const { search, minPrice, maxPrice, sort } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    let sortObj = {};
    if (sort === 'price_asc')  sortObj = { price:  1 };
    if (sort === 'price_desc') sortObj = { price: -1 };
    if (sort === 'newest')     sortObj = { _id:   -1 };

    const products = await Product.find(query).sort(sortObj);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// ── Get single product ───────────────────────────────────────────────
app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// ── Add product (Admin only) ─────────────────────────────────────────
app.post('/products', isAdmin, async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

// ── Edit product (Admin only) ────────────────────────────────────────
app.put('/products/:id', isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// ── Delete product (Admin only) ──────────────────────────────────────
app.delete('/products/:id', isAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// ── Update stock (used by checkout/RabbitMQ) ─────────────────────────
app.put('/products/:id/stock', isAdmin, async (req, res) => {
  try {
    const { quantity } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    product.stock -= quantity;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// ── Seed route (dev/testing only) ────────────────────────────────────
app.post('/products/seed', async (req, res) => {
  try {
    await Product.deleteMany({});
    const seedData = [
      { name: 'Premium Wireless Headphones', description: 'Noise-cancelling over-ear headphones with 40-hour battery life.', price: 299.99, imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', stock: 50 },
      { name: 'Mechanical Keyboard',         description: 'Tenkeyless custom mechanical keyboard with tactile switches.',     price: 149.99, imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500', stock: 30 },
      { name: 'Ergonomic Mouse',             description: 'Wireless ergonomic mouse designed to reduce wrist strain.',         price: 79.99,  imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500', stock: 100 },
      { name: '4K Ultrasharp Monitor',       description: '27-inch 4K monitor with amazing color accuracy.',                  price: 499.99, imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500', stock: 15 }
    ];
    await Product.insertMany(seedData);
    res.json({ message: 'Database seeded' });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Catalog Service running on port ${PORT}`);
});

module.exports = app; // exported for testing
