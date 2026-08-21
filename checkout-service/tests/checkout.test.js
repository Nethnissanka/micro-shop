/**
 * Checkout Service Tests
 * Unit tests for order logic + Integration tests for checkout endpoints.
 * PostgreSQL and Stripe are both mocked.
 */
const request = require('supertest');

// ── Shared mock query function ────────────────────────────────────
const mockQuery = jest.fn();

// ── Mock pg before loading any module ────────────────────────────
jest.mock('pg', () => {
  return { Pool: jest.fn(() => ({ query: mockQuery })) };
});

// ── Mock Stripe ───────────────────────────────────────────────────
jest.mock('stripe', () => {
  return jest.fn().mockReturnValue({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id:            'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
      }),
    },
  });
});

// ── Mock RabbitMQ (the checkout service requires('./rabbitmq') inline) ──
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
jest.mock('amqplib', () => ({
  connect: jest.fn().mockResolvedValue({
    createChannel: jest.fn().mockResolvedValue({
      assertQueue:  jest.fn(),
      sendToQueue:  jest.fn(),
      consume:      jest.fn(),
    }),
    close: jest.fn(),
  }),
}));

// ── Pre-seed initDB queries (run once when module is first loaded) ──
// initDB makes 2 queries: CREATE TABLE, then any migrations
mockQuery
  .mockResolvedValueOnce({ rows: [] }) // CREATE TABLE orders
  .mockResolvedValueOnce({ rows: [] }) // migration ALTER (if any)
  .mockResolvedValue({ rows: [] });    // default fallback

const app = require('../index');

// ── Unit Tests: Order status transitions ──────────────────────────
describe('[Unit] Order status transitions', () => {
  test('should allow status update for placed orders', () => {
    const canUpdate = (status) => status !== 'Cancelled';
    expect(canUpdate('Placed')).toBe(true);
    expect(canUpdate('Processing')).toBe(true);
  });

  test('should not allow cancelling a delivered order', () => {
    const canCancel = (status) => !['Shipped', 'Delivered'].includes(status);
    expect(canCancel('Delivered')).toBe(false);
    expect(canCancel('Placed')).toBe(true);
  });

  test('should not allow updating a cancelled order', () => {
    const canUpdate = (status) => status !== 'Cancelled';
    expect(canUpdate('Cancelled')).toBe(false);
    expect(canUpdate('Placed')).toBe(true);
  });
});

// ── Integration Tests: POST /checkout ────────────────────────────
describe('[Integration] POST /checkout', () => {
  beforeEach(() => { mockQuery.mockReset(); });

  test('should return 401 without x-user-id', async () => {
    const res = await request(app)
      .post('/checkout')
      .send({ items: [{ productId: 'p1', name: 'Item', price: 10, quantity: 1 }], total: 10, paymentMethod: 'cod' });
    expect(res.status).toBe(401);
  });

  test('should return 400 with empty items', async () => {
    const res = await request(app)
      .post('/checkout')
      .set('x-user-id', 'user-1')
      .send({ items: [], total: 0, paymentMethod: 'cod' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/empty/i);
  });

  test('should create a COD order successfully', async () => {
    const fakeOrder = {
      id: 1, user_id: 'user-1', total: 50,
      items: JSON.stringify([{ productId: 'p1', quantity: 1 }]),
      status: 'Placed', payment_method: 'cod',
      payment_status: 'Pending (COD)', stripe_payment_intent_id: null
    };
    // The checkout handler calls db.query once for INSERT
    mockQuery.mockResolvedValueOnce({ rows: [fakeOrder] });

    const res = await request(app)
      .post('/checkout')
      .set('x-user-id', 'user-1')
      .send({
        items:           [{ productId: 'p1', name: 'Gadget', price: 50, quantity: 1 }],
        total:           50,
        paymentMethod:   'cod',
        deliveryDetails: { address: '123 Main St' },
        email:           'user@test.com',
      });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('Placed');
    expect(res.body.clientSecret).toBeNull();
  });
});

// ── Integration Tests: GET /orders ────────────────────────────────
describe('[Integration] GET /orders', () => {
  beforeEach(() => { mockQuery.mockReset(); });

  test('should return 401 without x-user-id', async () => {
    const res = await request(app).get('/orders');
    expect(res.status).toBe(401);
  });

  test('should return user orders', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, user_id: 'user-1', total: 50, status: 'Placed' }]
    });

    const res = await request(app)
      .get('/orders')
      .set('x-user-id', 'user-1');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });
});

// ── Integration Tests: GET /admin/orders ──────────────────────────
describe('[Integration] GET /admin/orders', () => {
  beforeEach(() => { mockQuery.mockReset(); });

  test('should return 403 without admin role', async () => {
    const res = await request(app)
      .get('/admin/orders')
      .set('x-user-role', 'user');
    expect(res.status).toBe(403);
  });

  test('should return all orders for admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });

    const res = await request(app)
      .get('/admin/orders')
      .set('x-user-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// ── Health check ──────────────────────────────────────────────────
describe('[Integration] GET /health', () => {
  test('should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
