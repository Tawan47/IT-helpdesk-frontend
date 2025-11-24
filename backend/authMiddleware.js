// backend/authMiddleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// สร้าง token ใช้ตอน login
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// ดึง user จาก token
function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const [scheme, token] = auth.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    // ผูก user ลงใน req
    req.user = {
      id: payload.id,
      role: payload.role,
      email: payload.email,
      name: payload.name,
    };
    next();
  } catch (e) {
    console.error('requireAuth error:', e.message);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// ใช้เช็ก role เพิ่มเติม เช่น Admin เท่านั้น
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };
