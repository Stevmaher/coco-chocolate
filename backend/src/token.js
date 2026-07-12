const crypto = require('crypto');

const SECRET = process.env.ADMIN_TOKEN_SECRET || 'change-me-in-.env-ADMIN_TOKEN_SECRET';
const TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function issueAdminToken() {
  const payload = { role: 'admin', exp: Date.now() + TTL_MS };
  return sign(payload);
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { issueAdminToken, verifyToken };
