const express = require('express');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const router = express.Router();

router.post('/', protect, asyncHandler(async (req, res) => {
  const { items, totalAmount, shippingAddress, phone } = req.body;
  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('لا توجد عناصر في الطلب');
  }
  if (!shippingAddress || !phone) {
    res.status(400);
    throw new Error('الرجاء إدخال العنوان ورقم الهاتف');
  }
  
  const order = await Order.create({
    user: req.user._id,
    items,
    totalAmount,
    shippingAddress,
    phone
  });
  
  res.status(201).json(order);
}));

router.get('/myorders', protect, asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort('-createdAt');
  res.json(orders);
}));

module.exports = router;
