const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const genToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'البريد موجود' });
    const user = await User.create({ name, email, password });
    res.json({ token: genToken(user._id), isAdmin: user.isAdmin });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'بيانات خاطئة' });
    res.json({ token: genToken(user._id), isAdmin: user.isAdmin });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
