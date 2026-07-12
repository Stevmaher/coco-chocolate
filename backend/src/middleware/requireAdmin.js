const { verifyToken } = require('../token');

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'غير مصرح — يرجى تسجيل الدخول للوحة التحكم' });
  }
  req.admin = payload;
  next();
}

module.exports = requireAdmin;
