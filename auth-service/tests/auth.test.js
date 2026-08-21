/**
 * Auth Service Tests
 * Unit tests for JWT helpers + Integration tests for auth endpoints
 * Mocks PostgreSQL to keep tests isolated and fast.
 */
const request = require('supertest');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');

// ── Mock pg Pool before loading any module ───────────────────────
const mockQuery = jest.fn();

jest.mock('pg', () => {
  return { Pool: jest.fn(() => ({ query: mockQuery })) };
});

// ── Mock RabbitMQ (not needed for auth tests) ─────────────────────
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

// ── Pre-seed initDB calls (runs once when module is first required) ──
// initDB makes 3 queries: CREATE TABLE, ALTER ADD COLUMN, ALTER DROP NOT NULL
mockQuery
  .mockResolvedValueOnce({ rows: [] }) // CREATE TABLE
  .mockResolvedValueOnce({ rows: [] }) // ALTER ADD COLUMN
  .mockResolvedValueOnce({ rows: [] }) // ALTER DROP NOT NULL
  .mockResolvedValue({ rows: [] });    // default fallback

const app = require('../index');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// ── Unit Tests: JWT ──────────────────────────────────────────────────
describe('[Unit] JWT helpers', () => {
  test('should sign and verify a token correctly', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'user' };
    const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, JWT_SECRET);

    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  test('should reject a tampered token', () => {
    const token = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '1h' });
    expect(() => jwt.verify(token + 'tampered', JWT_SECRET)).toThrow();
  });

  test('should reject an expired token', () => {
    const token = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '-1s' });
    expect(() => jwt.verify(token, JWT_SECRET)).toThrow(/expired/);
  });
});

// ── Unit Tests: bcrypt ───────────────────────────────────────────────
describe('[Unit] bcrypt password hashing', () => {
  test('should hash and compare password correctly', async () => {
    const password = 'SecurePassword123!';
    const hash     = await bcrypt.hash(password, 10);
    const isMatch  = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);
  });

  test('should reject wrong password', async () => {
    const hash    = await bcrypt.hash('correct', 10);
    const isMatch = await bcrypt.compare('wrong', hash);
    expect(isMatch).toBe(false);
  });
});

// ── Integration Tests: /auth/register ────────────────────────────────
describe('[Integration] POST /auth/register', () => {
  test('should return 400 if email or password missing', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  test('should return 400 if user already exists', async () => {
    // SELECT returns existing user
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'exists@example.com', password: 'pass123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  test('should register a new user and return 201', async () => {
    // SELECT returns no user, INSERT returns new user
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 2, email: 'new@example.com', role: 'user' }] });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'pass123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('email', 'new@example.com');
    expect(res.body).toHaveProperty('role', 'user');
  });
});

// ── Integration Tests: /auth/login ───────────────────────────────────
describe('[Integration] POST /auth/login', () => {
  test('should return 400 if credentials missing', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  test('should return 401 if user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // SELECT → no user

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'notfound@test.com', password: 'pass' });
    expect(res.status).toBe(401);
  });

  test('should return token on valid credentials', async () => {
    const hashed = await bcrypt.hash('correctpass', 10);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'user@test.com', password: hashed, role: 'user' }]
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'correctpass' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', 'user@test.com');
  });
});

// ── Integration Tests: /auth/verify ──────────────────────────────────
describe('[Integration] GET /auth/verify', () => {
  test('should return 401 with no token', async () => {
    const res = await request(app).get('/auth/verify');
    expect(res.status).toBe(401);
  });

  test('should return decoded payload with valid token', async () => {
    const token = jwt.sign({ id: 1, email: 'a@b.com', role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .get('/auth/verify')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });
});

// ── Health check ─────────────────────────────────────────────────────
describe('[Integration] GET /health', () => {
  test('should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
