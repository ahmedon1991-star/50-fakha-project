const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  totalAmount: Number,
  shippingAddress: String,
  phone: String,
  status: {
    type: String,
    enum: ['قيد الانتظار', 'تم التأكيد', 'قيد التوصيل', 'تم التوصيل', 'ملغي'],
    default: 'قيد الانتظار'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
