const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const protectAdmin = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  console.log('🔑 Token received:', token ? 'Yes' : 'No');
  if (!token) return res.status(401).json({ msg: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Decoded:', decoded);
    const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(401).json({ msg: 'Admin not found' });
    req.admin = admin;
    next();
  } catch (err) {
    console.error('❌ Token error:', err.message);
    return res.status(401).json({ msg: 'Invalid token' });
  }
};

module.exports = { protectAdmin };