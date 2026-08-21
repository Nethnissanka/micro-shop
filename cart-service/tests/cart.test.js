/**
 * Cart Service Tests
 * Unit tests for cart logic (pure functions) + Integration tests for cart endpoints.
 * Redis is mocked so no real Redis instance is needed.
 */
const request = require('supertest');

// ── Mock Redis before loading app ─────────────────────────────────
const mockRedisStore = {};

jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    on:      jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    get:     jest.fn(async (key) => mockRedisStore[key] || null),
    setEx:   jest.fn(async (key, ttl, val) => { mockRedisStore[key] = val; }),
    del:     jest.fn(async (key) => { delete mockRedisStore[key]; }),
  }),
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

const app = require('../index');

// ── Unit Tests: Cart computation logic ───────────────────────────
describe('[Unit] Cart computation', () => {
  const calcTotal = (items) =>
    items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  test('should compute total correctly for multiple items', () => {
    const items = [
      { productId: '1', price: 10.00, quantity: 2 },
      { productId: '2', price: 5.50,  quantity: 3 },
    ];
    expect(calcTotal(items)).toBeCloseTo(36.5);
  });

  test('should return 0 total for empty cart', () => {
    expect(calcTotal([])).toBe(0);
  });

  test('should correctly find existing item index', () => {
    const items = [{ productId: 'abc', quantity: 1 }];
    const idx   = items.findIndex(i => i.productId === 'abc');
    expect(idx).toBe(0);
  });

  test('should return -1 for non-existent item', () => {
    const items = [{ productId: 'abc', quantity: 1 }];
    const idx   = items.findIndex(i => i.productId === 'xyz');
    expect(idx).toBe(-1);
  });
});

// ── Integration Tests: GET /cart ──────────────────────────────────
describe('[Integration] GET /cart', () => {
  test('should return 401 without x-user-id header', async () => {
    const res = await request(app).get('/cart');
    expect(res.status).toBe(401);
  });

  test('should return empty cart for new user', async () => {
    const res = await request(app)
      .get('/cart')
      .set('x-user-id', 'user-new-999');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], total: 0 });
  });
});

// ── Integration Tests: POST /cart/items ───────────────────────────
describe('[Integration] POST /cart/items', () => {
  const userId = 'user-test-001';

  beforeEach(() => {
    // Clear mock store between tests
    Object.keys(mockRedisStore).forEach(k => delete mockRedisStore[k]);
  });

  test('should return 401 without x-user-id', async () => {
    const res = await request(app)
      .post('/cart/items')
      .send({ productId: 'p1', name: 'Widget', price: 10, quantity: 1 });
    expect(res.status).toBe(401);
  });

  test('should add item to cart', async () => {
    const res = await request(app)
      .post('/cart/items')
      .set('x-user-id', userId)
      .send({ productId: 'p1', name: 'Widget', price: 10.00, quantity: 1, imageUrl: '' });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].productId).toBe('p1');
    expect(res.body.total).toBeCloseTo(10.00);
  });

  test('should increase quantity for existing item', async () => {
    // Add once
    await request(app)
      .post('/cart/items')
      .set('x-user-id', userId)
      .send({ productId: 'p1', name: 'Widget', price: 10.00, quantity: 1, imageUrl: '' });

    // Add again
    const res = await request(app)
      .post('/cart/items')
      .set('x-user-id', userId)
      .send({ productId: 'p1', name: 'Widget', price: 10.00, quantity: 2, imageUrl: '' });

    expect(res.body.items[0].quantity).toBe(3);
    expect(res.body.total).toBeCloseTo(30.00);
  });

  test('should remove item when quantity drops to 0', async () => {
    await request(app)
      .post('/cart/items')
      .set('x-user-id', userId)
      .send({ productId: 'p1', name: 'Widget', price: 10.00, quantity: 1, imageUrl: '' });

    const res = await request(app)
      .post('/cart/items')
      .set('x-user-id', userId)
      .send({ productId: 'p1', name: 'Widget', price: 10.00, quantity: -1, imageUrl: '' });

    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });
});

// ── Integration Tests: DELETE /cart/items/:productId ─────────────
describe('[Integration] DELETE /cart/items/:productId', () => {
  const userId = 'user-test-002';

  beforeEach(() => {
    Object.keys(mockRedisStore).forEach(k => delete mockRedisStore[k]);
  });

  test('should remove a specific item from cart', async () => {
    await request(app)
      .post('/cart/items')
      .set('x-user-id', userId)
      .send({ productId: 'p2', name: 'Gadget', price: 20.00, quantity: 2, imageUrl: '' });

    const res = await request(app)
      .delete('/cart/items/p2')
      .set('x-user-id', userId);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

// ── Integration Tests: DELETE /cart ───────────────────────────────
describe('[Integration] DELETE /cart', () => {
  const userId = 'user-test-003';

  test('should clear the cart', async () => {
    await request(app)
      .post('/cart/items')
      .set('x-user-id', userId)
      .send({ productId: 'p3', name: 'Thing', price: 5.00, quantity: 1, imageUrl: '' });

    const res = await request(app)
      .delete('/cart')
      .set('x-user-id', userId);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cleared/i);
  });
});

// ── Health check ──────────────────────────────────────────────────
describe('[Integration] GET /health', () => {
  test('should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
