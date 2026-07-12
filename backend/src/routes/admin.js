const express = require('express');
const { adminLoginInput } = require('../validators');
const { issueAdminToken } = require('../token');

const router = express.Router();

// Simple in-memory rate limiting for the PIN endpoint (per-process, resets on restart).
const attempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

function tooManyAttempts(ip) {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (Date.now() > rec.resetAt) { attempts.delete(ip); return false; }
  return rec.count >= MAX_ATTEMPTS;
}
function registerAttempt(ip) {
  const rec = attempts.get(ip);
  if (!rec || Date.now() > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    rec.count += 1;
  }
}

router.post('/login', (req, res) => {
  const ip = req.ip;
  if (tooManyAttempts(ip)) {
    return res.status(429).json({ error: 'محاولات كثيرة جدًا، حاول لاحقًا' });
  }
  const parsed = adminLoginInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'الرمز غير صالح' });
  }
  const expectedPin = process.env.ADMIN_PIN;
  if (!expectedPin) {
    return res.status(500).json({ error: 'ADMIN_PIN غير مُعرَّف في إعدادات الخادم' });
  }
  if (parsed.data.pin !== expectedPin) {
    registerAttempt(ip);
    return res.status(401).json({ error: 'رمز الدخول غير صحيح' });
  }
  const token = issueAdminToken();
  res.json({ token });
});

module.exports = router;
