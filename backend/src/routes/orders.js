const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const { orderCreateInput, orderStatusInput } = require('../validators');

const router = express.Router();

function hydrateOrder(order) {
  const items = db.prepare('SELECT productId, qty, unitPrice FROM order_items WHERE orderId = ?').all(order.id);
  const statusLog = db.prepare('SELECT status, at FROM order_status_log WHERE orderId = ? ORDER BY at ASC').all(order.id);
  return { ...order, items, statusLog };
}

// GET /api/orders?status=&search=&date=   (admin only)
router.get('/', requireAdmin, (req, res) => {
  const { status = 'all', search = '', date = null } = req.query;
  const q = String(search).trim().toLowerCase();
  let rows = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all();
  if (status && status !== 'all') rows = rows.filter((o) => o.status === status);
  if (q) rows = rows.filter((o) => (o.customerName + ' ' + o.phone).toLowerCase().includes(q));
  if (date) rows = rows.filter((o) => o.createdAt.slice(0, 10) === date);
  res.json(rows.map(hydrateOrder));
});

// GET /api/orders/:id  (admin only)
router.get('/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'الطلب غير موجود' });
  res.json(hydrateOrder(row));
});

// POST /api/orders  (public — storefront checkout)
router.post('/', (req, res) => {
  const parsed = orderCreateInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'بيانات الطلب غير صالحة', details: parsed.error.flatten() });
  }
  const { customerName, phone, items, source } = parsed.data;

  const productIds = items.map((i) => i.productId);
  const placeholders = productIds.map(() => '?').join(',');
  const products = db.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`).all(...productIds);
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    if (!productMap.has(item.productId)) {
      return res.status(400).json({ error: `منتج غير موجود: ${item.productId}` });
    }
  }

  const orderItems = items.map((it) => ({
    productId: it.productId,
    qty: it.qty,
    unitPrice: productMap.get(it.productId).price,
  }));
  const subtotal = orderItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const deliveryFee = subtotal > 0 ? 40 : 0;
  const total = subtotal + deliveryFee;
  const id = 'o' + Date.now();
  const now = new Date().toISOString();

  const createOrder = db.transaction(() => {
    const { max } = db.prepare('SELECT MAX(orderNumber) as max FROM orders').get();
    const orderNumber = (max || 1000) + 1;

    db.prepare(`
      INSERT INTO orders (id, orderNumber, customerName, phone, status, source, subtotal, deliveryFee, total, createdAt)
      VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)
    `).run(id, orderNumber, customerName, phone, source, subtotal, deliveryFee, total, now);

    const insertItem = db.prepare('INSERT INTO order_items (orderId, productId, qty, unitPrice) VALUES (?, ?, ?, ?)');
    const decrementStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
    for (const it of orderItems) {
      insertItem.run(id, it.productId, it.qty, it.unitPrice);
      decrementStock.run(it.qty, it.productId);
    }

    db.prepare('INSERT INTO order_status_log (orderId, status, at) VALUES (?, ?, ?)').run(id, 'PENDING', now);

    return orderNumber;
  });

  createOrder();
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  res.status(201).json(hydrateOrder(row));
});

// PATCH /api/orders/:id/status  (admin only)
router.patch('/:id/status', requireAdmin, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

  const parsed = orderStatusInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'حالة غير صالحة', details: parsed.error.flatten() });
  }
  const { status } = parsed.data;
  const now = new Date().toISOString();
  const wasCancelled = order.status === 'CANCELLED';

  const updateStatus = db.transaction(() => {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    db.prepare('INSERT INTO order_status_log (orderId, status, at) VALUES (?, ?, ?)').run(req.params.id, status, now);

    if (status === 'CANCELLED' && !wasCancelled) {
      const items = db.prepare('SELECT productId, qty FROM order_items WHERE orderId = ?').all(req.params.id);
      const restock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      for (const it of items) restock.run(it.qty, it.productId);
    }
  });
  updateStatus();

  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json(hydrateOrder(row));
});

module.exports = router;
