const express = require('express');
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

router.get('/orders', protect, admin, async (req, res) => {
  res.json(await Order.find().populate('user', 'name email').sort('-createdAt'));
});

router.put('/orders/:id/status', protect, admin, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'غير موجود' });
  order.status = req.body.status;
  res.json(await order.save());
});

router.get('/stats', protect, admin, async (req, res) => {
  const totalOrders = await Order.countDocuments();
  const pending = await Order.countDocuments({ status: 'قيد الانتظار' });
  res.json({ totalOrders, pendingOrders: pending });
});

module.exports = router;
