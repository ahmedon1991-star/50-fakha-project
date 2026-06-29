import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [error, setError] = useState('');

  const deliveryFee = 15; // static delivery fee
  const grandTotal = totalAmount + deliveryFee;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('يرجى تسجيل الدخول أولاً لتتمكن من إتمام الطلب');
      return;
    }
    if (cartItems.length === 0) {
      setError('عربة التسوق فارغة');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          items: cartItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          total_amount: grandTotal,
          shipping_address: address,
          phone: phone,
          status: 'قيد الانتظار'
        });

      if (insertError) throw insertError;

      setOrderSuccess(true);
      clearCart();
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء إتمام الطلب، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-emerald-100 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto animate-bounce">
            🎉
          </div>
          <h2 className="text-3xl font-extrabold text-emerald-950">تم إرسال طلبك بنجاح!</h2>
          <p className="text-slate-600">
            نشكرك على طلبك من مطعم 50 فاكهة. نقوم الآن بتجهيز طلبك وتوصيله إليك في أسرع وقت.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition duration-200"
          >
            العودة للقائمة الرئيسية 🍓
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Title */}
      <div className="lg:col-span-3">
        <h1 className="text-3xl font-extrabold text-slate-900 border-b pb-4 flex items-center gap-2">
          <span>🛒</span> عربة التسوق
        </h1>
      </div>

      {cartItems.length === 0 ? (
        <div className="lg:col-span-3 text-center py-16 bg-white rounded-2xl shadow border border-slate-100 space-y-6">
          <span className="text-6xl block">🛍️</span>
          <h2 className="text-2xl font-bold text-slate-800">عربة التسوق فارغة حالياً</h2>
          <p className="text-slate-500">تصفح القائمة وأضف بعض الفواكه الطازجة والعصائر اللذيذة!</p>
          <Link
            to="/"
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl shadow-md transition duration-200"
          >
            تصفح القائمة 🍉
          </Link>
        </div>
      ) : (
        <>
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item._id}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200'}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-xl border border-slate-100 flex-shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      <span>{item.name}</span>
                      {item.size && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                          {item.size}
                        </span>
                      )}
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">{item.price} ج.س</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                  {/* Quantity Controls */}
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <button
                      onClick={() => updateQuantity(item._id, Math.max(1, item.quantity - 1))}
                      className="px-3 py-1 font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-4 font-bold text-slate-800">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity + 1)}
                      className="px-3 py-1 font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Item Total */}
                  <span className="font-extrabold text-emerald-700 min-w-[70px] text-left">
                    {item.price * item.quantity} ج.س
                  </span>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item._id)}
                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-full transition-colors"
                    title="حذف"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Checkout & Summary Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 border-b pb-3">تفاصيل الحساب</h2>
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي:</span>
                <span className="font-semibold">{totalAmount} ج.س</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>تكلفة التوصيل:</span>
                <span className="font-semibold">{deliveryFee} ج.س</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-lg border-t pt-3">
                <span>الإجمالي الكلي:</span>
                <span className="text-emerald-700">{grandTotal} ج.س</span>
              </div>
            </div>

            {/* Checkout Form */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 border-b pb-3">بيانات الشحن والتوصيل</h2>
              
              {error && (
                <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-700 p-3 rounded-lg text-sm" id="cart-error-alert">
                  {error}
                </div>
              )}

              {user ? (
                <form onSubmit={handleCheckout} className="space-y-4">
                  <div>
                    <label className="block text-slate-700 text-sm font-semibold mb-1">رقم الهاتف</label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-sm font-semibold mb-1">العنوان بالتفصيل</label>
                    <textarea
                      id="checkout-address"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="اسم الشارع، رقم العمارة، الشقة..."
                      rows="3"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                    />
                  </div>

                  <button
                    id="checkout-submit"
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-xl text-white font-bold text-lg shadow hover:shadow-md transition duration-200 ${
                      loading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {loading ? 'جاري إرسال الطلب...' : 'تأكيد الطلب وشحن 🚚'}
                  </button>
                </form>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-slate-500 text-sm">يجب تسجيل الدخول لإتمام عملية الشراء</p>
                  <Link
                    to="/login"
                    className="block w-full bg-yellow-400 hover:bg-yellow-500 text-emerald-950 font-bold py-2.5 rounded-xl text-center shadow transition duration-200"
                  >
                    تسجيل الدخول الآن
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
