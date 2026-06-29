const express = require('express');
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const router = express.Router();

router.get('/orders', protect, admin, asyncHandler(async (req, res) => {
  const orders = await Order.find().populate('user', 'name email').sort('-createdAt');
  res.json(orders);
}));

router.put('/orders/:id/status', protect, admin, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    res.status(400);
    throw new Error('الرجاء تحديد حالة الطلب');
  }
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('الطلب غير موجود');
  }
  order.status = status;
  const updatedOrder = await order.save();
  res.json(updatedOrder);
}));

router.get('/stats', protect, admin, asyncHandler(async (req, res) => {
  const totalOrders = await Order.countDocuments();
  const pending = await Order.countDocuments({ status: 'قيد الانتظار' });
  const completed = await Order.countDocuments({ status: 'تم التوصيل' });
  
  // Calculate total sales for non-cancelled orders
  const salesData = await Order.aggregate([
    { $match: { status: { $ne: 'ملغي' } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  const totalSales = salesData[0]?.total || 0;
  
  // Get sales grouped by date for charts
  const salesByDate = await Order.aggregate([
    { $match: { status: { $ne: 'ملغي' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        sales: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: 7 } // Last 7 days
  ]);

  res.json({
    totalOrders,
    pendingOrders: pending,
    completedOrders: completed,
    totalSales,
    salesByDate: salesByDate.map(item => ({
      date: item._id,
      sales: item.sales,
      orders: item.orders
    }))
  });
}));

module.exports = router;
