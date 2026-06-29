const express = require('express');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/', protect, async (req, res) => {
  const order = await Order.create({ ...req.body, user: req.user._id });
  res.status(201).json(order);
});

router.get('/myorders', protect, async (req, res) => {
  res.json(await Order.find({ user: req.user._id }).sort('-createdAt'));
});

module.exports = router;
