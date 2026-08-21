/**
 * Catalog Service Tests
 * Unit tests for Product model validation + Integration tests for CRUD endpoints.
 * Uses mongodb-memory-server so no real Atlas connection is needed.
 * Azure Blob Storage is mocked.
 */
const request  = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// ── Mock Azure Blob Storage before loading app ────────────────────
jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: jest.fn().mockReturnValue({
      getContainerClient: jest.fn().mockReturnValue({
        getBlockBlobClient: jest.fn().mockReturnValue({
          uploadData: jest.fn().mockResolvedValue({}),
          url: 'https://microstoreprodimages.blob.core.windows.net/product-images/test-image.jpg',
        }),
      }),
    }),
  },
}));

// ── Mock RabbitMQ ─────────────────────────────────────────────────
jest.mock('amqp-connection-manager', () => ({
  connect: jest.fn().mockReturnValue({
    createChannel: jest.fn().mockReturnValue({
      addSetup:       jest.fn(),
      sendToQueue:    jest.fn().mockResolvedValue(true),
      waitForConnect: jest.fn().mockResolvedValue(true),
    }),
    on: jest.fn(),
  }),
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI                   = mongoServer.getUri();
  process.env.AZURE_STORAGE_ACCOUNT_NAME = 'microstoreprodimages';
  process.env.AZURE_STORAGE_ACCOUNT_KEY  = 'fakekey==';
  process.env.AZURE_CONTAINER_NAME       = 'product-images';

  app = require('../index');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clean up products between tests
  const Product = mongoose.model('Product');
  await Product.deleteMany({});
});

// ── Unit Tests: Product model validation ──────────────────────────
describe('[Unit] Product Model Validation', () => {
  let Product;
  beforeAll(() => { Product = mongoose.model('Product'); });

  test('should reject a product without required fields', async () => {
    const p = new Product({});
    await expect(p.validate()).rejects.toThrow();
  });

  test('should create a valid product', async () => {
    const p = new Product({ name: 'Test', description: 'Desc', price: 10, stock: 5 });
    const err = p.validateSync();
    expect(err).toBeUndefined();
  });

  test('price should be a number', async () => {
    const p = new Product({ name: 'X', description: 'D', price: 'notanumber', stock: 0 });
    const err = p.validateSync();
    expect(err).toBeDefined();
  });
});

// ── Integration Tests: GET /products ─────────────────────────────
describe('[Integration] GET /products', () => {
  test('should return an empty array initially', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('should return seeded products after seed call', async () => {
    await request(app).post('/products/seed');
    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('should support search query param', async () => {
    await request(app).post('/products/seed');
    const res = await request(app).get('/products?search=headphones');
    expect(res.status).toBe(200);
    expect(res.body.every(p => p.name.toLowerCase().includes('headphone') || p.description.toLowerCase().includes('headphone'))).toBe(true);
  });
});

// ── Integration Tests: GET /products/:id ─────────────────────────
describe('[Integration] GET /products/:id', () => {
  test('should return 404 for unknown id', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/products/${fakeId}`);
    expect(res.status).toBe(404);
  });

  test('should return the product if found', async () => {
    await request(app).post('/products/seed');
    const allRes = await request(app).get('/products');
    const id  = allRes.body[0]._id;
    const res = await request(app).get(`/products/${id}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(id);
  });
});

// ── Integration Tests: POST /products (Admin) ─────────────────────
describe('[Integration] POST /products (admin)', () => {
  test('should return 403 if not admin', async () => {
    const res = await request(app)
      .post('/products')
      .set('x-user-role', 'user')
      .send({ name: 'Widget', description: 'A widget', price: 9.99, stock: 10 });
    expect(res.status).toBe(403);
  });

  test('should create product as admin', async () => {
    const res = await request(app)
      .post('/products')
      .set('x-user-role', 'admin')
      .send({ name: 'Widget', description: 'A widget', price: 9.99, stock: 10 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Widget');
    expect(res.body).toHaveProperty('_id');
  });
});

// ── Integration Tests: PUT /products/:id (Admin) ──────────────────
describe('[Integration] PUT /products/:id (admin)', () => {
  test('should update a product as admin', async () => {
    await request(app).post('/products/seed');
    const allRes = await request(app).get('/products');
    const id = allRes.body[0]._id;

    const res = await request(app)
      .put(`/products/${id}`)
      .set('x-user-role', 'admin')
      .send({ price: 999.99 });

    expect(res.status).toBe(200);
    expect(res.body.price).toBe(999.99);
  });
});

// ── Integration Tests: DELETE /products/:id (Admin) ───────────────
describe('[Integration] DELETE /products/:id (admin)', () => {
  test('should delete a product as admin', async () => {
    await request(app).post('/products/seed');
    const allRes = await request(app).get('/products');
    const id = allRes.body[0]._id;

    const delRes = await request(app)
      .delete(`/products/${id}`)
      .set('x-user-role', 'admin');

    expect(delRes.status).toBe(200);
    expect(delRes.body.message).toMatch(/deleted/i);

    const checkRes = await request(app).get(`/products/${id}`);
    expect(checkRes.status).toBe(404);
  });
});

// ── Integration Tests: POST /products/upload-image ───────────────
describe('[Integration] POST /products/upload-image', () => {
  test('should return 403 for non-admin', async () => {
    const res = await request(app)
      .post('/products/upload-image')
      .set('x-user-role', 'user')
      .attach('image', Buffer.from('fake'), 'test.jpg');
    expect(res.status).toBe(403);
  });

  test('should return 400 if no file provided', async () => {
    const res = await request(app)
      .post('/products/upload-image')
      .set('x-user-role', 'admin');
    expect(res.status).toBe(400);
  });

  test('should upload image and return URL (mocked Azure)', async () => {
    const res = await request(app)
      .post('/products/upload-image')
      .set('x-user-role', 'admin')
      .attach('image', Buffer.from('fake-image-data'), { filename: 'product.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('imageUrl');
    expect(res.body.imageUrl).toContain('blob.core.windows.net');
  });
});

// ── Health check ──────────────────────────────────────────────────
describe('[Integration] GET /health', () => {
  test('should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
