const express = require('express');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const products = await Product.find({ available: true });
  res.json(products);
}));

router.post('/', protect, admin, asyncHandler(async (req, res) => {
  const { name, price, description, category, image } = req.body;
  if (!name || !price) {
    res.status(400);
    throw new Error('الرجاء إدخال الاسم والسعر');
  }
  const product = await Product.create({ name, price, description, category, image });
  res.status(201).json(product);
}));

router.put('/:id', protect, admin, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('المنتج غير موجود');
  }
  const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updatedProduct);
}));

router.delete('/:id', protect, admin, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('المنتج غير موجود');
  }
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: 'تم الحذف' });
}));

module.exports = router;
