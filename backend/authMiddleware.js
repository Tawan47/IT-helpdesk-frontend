const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'MySecretKey123'; // ต้องตรงกับตอน Login

// ตรวจสอบว่ามี Token ไหม และถูกต้องไหม
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // ตัดคำว่า "Bearer " ออก

  if (!token) {
    return res.status(401).json({ error: 'Access Denied: No Token Provided' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // เก็บข้อมูล User ไว้ใช้ต่อ
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid Token' });
  }
};

// ตรวจสอบว่าเป็น Admin ไหม
const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }
  next();
};

module.exports = { verifyToken, verifyAdmin, SECRET_KEY };