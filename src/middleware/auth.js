// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Executive from '../models/Executive.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    if (decoded.role === 'executive') {
      user = await Executive.findById(decoded.id).select('-password');
    } else {
      user = await User.findById(decoded.id).select('-password');
    }

    if (!user) {
      throw new Error();
    }

    req.user = { ...user.toObject(), id: user._id, role: decoded.role };
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};