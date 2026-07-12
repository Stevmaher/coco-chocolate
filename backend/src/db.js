const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'coco.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  nameAr      TEXT NOT NULL,
  desc        TEXT DEFAULT '',
  price       REAL NOT NULL,
  category    TEXT NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  icon        TEXT DEFAULT '🍫',
  image       TEXT DEFAULT '',
  bestseller  INTEGER NOT NULL DEFAULT 0,
  isNew       INTEGER NOT NULL DEFAULT 0,
  featured    INTEGER NOT NULL DEFAULT 0,
  createdAt   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  orderNumber   INTEGER NOT NULL,
  customerName  TEXT NOT NULL,
  phone         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING',
  source        TEXT NOT NULL DEFAULT 'WEBSITE',
  subtotal      REAL NOT NULL DEFAULT 0,
  deliveryFee   REAL NOT NULL DEFAULT 0,
  total         REAL NOT NULL DEFAULT 0,
  createdAt     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  productId   TEXT NOT NULL,
  qty         INTEGER NOT NULL,
  unitPrice   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS order_status_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status    TEXT NOT NULL,
  at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders(createdAt);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);
CREATE INDEX IF NOT EXISTS idx_order_items_productId ON order_items(productId);
`);

module.exports = db;
