const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const { productInput, productUpdate } = require('../validators');

const router = express.Router();

function toBool(row) {
  return {
    ...row,
    bestseller: !!row.bestseller,
    isNew: !!row.isNew,
    featured: !!row.featured,
  };
}

// GET /api/products?search=&category=
router.get('/', (req, res) => {
  const { search = '', category = 'all' } = req.query;
  const q = String(search).trim().toLowerCase();
  let rows = db.prepare('SELECT * FROM products ORDER BY createdAt DESC').all();
  if (category && category !== 'all') {
    rows = rows.filter((p) => p.category === category);
  }
  if (q) {
    rows = rows.filter((p) =>
      (p.name + ' ' + p.nameAr + ' ' + p.desc).toLowerCase().includes(q)
    );
  }
  res.json(rows.map(toBool));
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'المنتج غير موجود' });
  res.json(toBool(row));
});

// POST /api/products  (admin only)
router.post('/', requireAdmin, (req, res) => {
  const parsed = productInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'بيانات غير صالحة', details: parsed.error.flatten() });
  }
  const id = 'p' + Date.now();
  const d = parsed.data;
  db.prepare(`
    INSERT INTO products (id, name, nameAr, desc, price, category, stock, icon, image, bestseller, isNew, featured)
    VALUES (@id, @name, @nameAr, @desc, @price, @category, @stock, @icon, @image, @bestseller, @isNew, @featured)
  `).run({
    id, ...d,
    bestseller: d.bestseller ? 1 : 0,
    isNew: d.isNew ? 1 : 0,
    featured: d.featured ? 1 : 0,
  });
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json(toBool(row));
});

// PATCH /api/products/:id  (admin only)
router.patch('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'المنتج غير موجود' });

  const parsed = productUpdate.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'بيانات غير صالحة', details: parsed.error.flatten() });
  }
  const d = parsed.data;
  const merged = {
    name: d.name ?? existing.name,
    nameAr: d.nameAr ?? existing.nameAr,
    desc: d.desc ?? existing.desc,
    price: d.price ?? existing.price,
    category: d.category ?? existing.category,
    stock: d.stock ?? existing.stock,
    icon: d.icon ?? existing.icon,
    image: d.image ?? existing.image,
    bestseller: d.bestseller !== undefined ? (d.bestseller ? 1 : 0) : existing.bestseller,
    isNew: d.isNew !== undefined ? (d.isNew ? 1 : 0) : existing.isNew,
    featured: d.featured !== undefined ? (d.featured ? 1 : 0) : existing.featured,
  };
  db.prepare(`
    UPDATE products SET name=@name, nameAr=@nameAr, desc=@desc, price=@price, category=@category,
      stock=@stock, icon=@icon, image=@image, bestseller=@bestseller, isNew=@isNew, featured=@featured,
      updatedAt=strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id=@id
  `).run({ id: req.params.id, ...merged });
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(toBool(row));
});

// DELETE /api/products/:id  (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'المنتج غير موجود' });
  res.status(204).end();
});

module.exports = router;
