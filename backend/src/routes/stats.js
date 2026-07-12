const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
router.use(requireAdmin);

function pct(today, yesterday) {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return ((today - yesterday) / yesterday) * 100;
}
function dayBounds(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

// GET /api/stats/summary
router.get('/summary', (req, res) => {
  const active = db.prepare("SELECT * FROM orders WHERE status != 'CANCELLED'").all();
  const totalRevenue = active.reduce((s, o) => s + o.total, 0);
  const totalOrders = active.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const pendingOrders = db.prepare("SELECT COUNT(*) c FROM orders WHERE status = 'PENDING'").get().c;
  const completedOrders = db.prepare("SELECT COUNT(*) c FROM orders WHERE status = 'DELIVERED'").get().c;
  const totalProducts = db.prepare('SELECT COUNT(*) c FROM products').get().c;
  const lowStockCount = db.prepare('SELECT COUNT(*) c FROM products WHERE stock <= 10').get().c;
  const uniqueCustomers = db.prepare("SELECT COUNT(DISTINCT phone) c FROM orders WHERE status != 'CANCELLED'").get().c;
  const websiteOrders = active.filter((o) => o.source === 'WEBSITE').length;
  const whatsappOrders = active.filter((o) => o.source === 'WHATSAPP').length;

  const totalUnitsSold = db.prepare(`
    SELECT COALESCE(SUM(oi.qty), 0) c FROM order_items oi
    JOIN orders o ON o.id = oi.orderId WHERE o.status != 'CANCELLED'
  `).get().c;

  const today = dayBounds(0), yesterday = dayBounds(1);
  const revenueOf = (day) => db.prepare(
    "SELECT COALESCE(SUM(total),0) s FROM orders WHERE status != 'CANCELLED' AND substr(createdAt,1,10) = ?"
  ).get(day).s;
  const ordersOf = (day) => db.prepare(
    "SELECT COUNT(*) c FROM orders WHERE status != 'CANCELLED' AND substr(createdAt,1,10) = ?"
  ).get(day).c;
  const customersOf = (day) => db.prepare(
    "SELECT COUNT(DISTINCT phone) c FROM orders WHERE status != 'CANCELLED' AND substr(createdAt,1,10) = ?"
  ).get(day).c;

  res.json({
    totalRevenue, totalOrders, avgOrderValue, pendingOrders, completedOrders,
    totalProducts, lowStockCount, uniqueCustomers, websiteOrders, whatsappOrders, totalUnitsSold,
    deltaRevenue: pct(revenueOf(today), revenueOf(yesterday)),
    deltaOrders: pct(ordersOf(today), ordersOf(yesterday)),
    deltaCustomers: pct(customersOf(today), customersOf(yesterday)),
  });
});

// GET /api/stats/revenue-by-day?days=14
router.get('/revenue-by-day', (req, res) => {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 14));
  const rows = db.prepare(`
    SELECT substr(createdAt,1,10) as date, SUM(total) as total, COUNT(*) as orders
    FROM orders
    WHERE status != 'CANCELLED' AND createdAt >= datetime('now', ?)
    GROUP BY date
  `).all(`-${days} days`);
  const byDate = new Map(rows.map((r) => [r.date, r]));

  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = dayBounds(i);
    const row = byDate.get(date);
    result.push({ date, total: row ? row.total : 0, orders: row ? row.orders : 0 });
  }
  res.json(result);
});

// GET /api/stats/revenue-by-category
router.get('/revenue-by-category', (req, res) => {
  const rows = db.prepare(`
    SELECT p.category as category, SUM(oi.qty * oi.unitPrice) as total
    FROM order_items oi
    JOIN orders o ON o.id = oi.orderId
    JOIN products p ON p.id = oi.productId
    WHERE o.status != 'CANCELLED'
    GROUP BY p.category
    ORDER BY total DESC
  `).all();
  res.json(rows);
});

// GET /api/stats/top-products?limit=5
router.get('/top-products', (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 5));
  const rows = db.prepare(`
    SELECT p.*, SUM(oi.qty) as units
    FROM order_items oi
    JOIN orders o ON o.id = oi.orderId
    JOIN products p ON p.id = oi.productId
    WHERE o.status != 'CANCELLED'
    GROUP BY p.id
    ORDER BY units DESC
    LIMIT ?
  `).all(limit);
  res.json(rows.map((r) => ({
    product: {
      id: r.id, name: r.name, nameAr: r.nameAr, desc: r.desc, price: r.price,
      category: r.category, stock: r.stock, icon: r.icon, image: r.image,
      bestseller: !!r.bestseller, isNew: !!r.isNew, featured: !!r.featured,
    },
    units: r.units,
  })));
});

// GET /api/stats/recent-activity?limit=6
router.get('/recent-activity', (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 6));
  const rows = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC LIMIT ?').all(limit);
  res.json(rows);
});

module.exports = router;
