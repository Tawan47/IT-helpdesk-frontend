// backend/authMiddleware.js
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret';

// สร้าง token จากข้อมูล user
function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    SECRET,
    { expiresIn: '7d' }
  );
}

// ตรวจว่า login แล้วหรือยัง
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload; // { id, role, email }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ตรวจ role
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };
