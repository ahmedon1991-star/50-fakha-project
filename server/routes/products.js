const express = require('express');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  res.json(await Product.find({ available: true }));
});

router.post('/', protect, admin, async (req, res) => {
  res.status(201).json(await Product.create(req.body));
});

router.put('/:id', protect, admin, async (req, res) => {
  res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

router.delete('/:id', protect, admin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: 'تم الحذف' });
});

module.exports = router;
