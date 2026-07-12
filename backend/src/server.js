require('dotenv').config();
const express = require('express');
const cors = require('cors');

const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const statsRouter = require('./routes/stats');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: ORIGIN }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/admin', adminRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/stats', statsRouter);

// 404
app.use('/api', (req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

// central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'خطأ في الخادم، حاول لاحقًا' });
});

app.listen(PORT, () => {
  console.log(`Coco Chocolate API listening on http://localhost:${PORT}`);
});
