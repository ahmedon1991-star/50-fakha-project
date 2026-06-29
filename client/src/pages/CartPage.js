import { useState, useEffect } from 'react';
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

  const [deliveryFee, setDeliveryFee] = useState(15);
  const [acceptingOrders, setAcceptingOrders] = useState(true);

  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolderName, setBankHolderName] = useState('');

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'bank'
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('delivery_fee, accepting_orders, whatsapp_phone, bank_name, bank_account, bank_holder_name')
          .single();
        if (data) {
          if (data.delivery_fee !== null && data.delivery_fee !== undefined) {
            setDeliveryFee(Number(data.delivery_fee));
          }
          if (data.accepting_orders !== null && data.accepting_orders !== undefined) {
            setAcceptingOrders(data.accepting_orders);
          }
          setWhatsappPhone(data.whatsapp_phone || '');
          setBankName(data.bank_name || '');
          setBankAccount(data.bank_account || '');
          setBankHolderName(data.bank_holder_name || '');
        }
      } catch (err) {
        console.error('Could not fetch app settings:', err);
      }
    };
    fetchSettings();
  }, []);

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
    if (!acceptingOrders) {
      setError('نعتذر منك، استقبال الطلبات مغلق حالياً من قِبل الإدارة. يرجى المحاولة لاحقاً 🚫');
      return;
    }

    if (paymentMethod === 'bank' && !receiptFile) {
      setError('يرجى إرفاق إشعار التحويل البنكي لإتمام الطلب');
      return;
    }

    setError('');
    setLoading(true);
    setUploadingReceipt(false);

    try {
      // 1. Generate 8-digit order number
      const orderNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
      let receiptUrl = '';

      // 2. Upload Bank receipt if bank payment
      if (paymentMethod === 'bank' && receiptFile) {
        setUploadingReceipt(true);
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `receipts/${orderNumber}_receipt.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, receiptFile);
        
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        receiptUrl = publicUrlData?.publicUrl || '';
        setUploadingReceipt(false);
      }

      // 3. Insert order
      const orderPayload = {
        user_id: user.id,
        order_number: orderNumber,
        payment_method: paymentMethod,
        transfer_receipt: receiptUrl,
        items: cartItems.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          selectedSize: item.selectedSize || null
        })),
        total_amount: grandTotal,
        shipping_address: address,
        phone: phone,
        status: 'قيد الانتظار'
      };

      const { error: insertError } = await supabase
        .from('orders')
        .insert(orderPayload);

      if (insertError) throw insertError;

      // Save details for success screen invoice preview & WhatsApp link
      const savedDetails = {
        orderNumber,
        items: cartItems,
        totalAmount,
        deliveryFee,
        grandTotal,
        address,
        phone,
        paymentMethod,
        receiptUrl,
        bankName,
        bankAccount,
        bankHolderName
      };
      setLastOrderDetails(savedDetails);

      // Trigger automatic WhatsApp redirect if phone configured
      sendToWhatsApp(savedDetails);

      setOrderSuccess(true);
      clearCart();
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء إتمام الطلب، حاول مرة أخرى');
    } finally {
      setLoading(false);
      setUploadingReceipt(false);
    }
  };

  const sendToWhatsApp = (details) => {
    if (!whatsappPhone) return;

    // Formatting beautiful Arabic invoice message
    const formattedItems = details.items.map(item => 
      `• ${item.name} ${item.selectedSize ? `(${item.selectedSize})` : ''} \n  *الكمية:* ${item.quantity} | *السعر:* ${item.price * item.quantity} ج.س`
    ).join('\n\n');

    const paymentText = details.paymentMethod === 'bank' 
      ? '🏦 تحويل بنكي (مرفق إشعار التحويل)' 
      : '💵 الدفع عند الاستلام (كاش)';

    const bankDetailsSection = details.paymentMethod === 'bank'
      ? `\n*بيانات الحساب البنكي للتأكيد:*\n🏦 البنك: ${details.bankName}\n💳 رقم الحساب: ${details.bankAccount}\n👤 صاحب الحساب: ${details.bankHolderName}\n🔗 *رابط إشعار التحويل:* ${details.receiptUrl}\n`
      : '';

    const message = `🧾 *فاتورة طلب جديدة - مطعم 50 فاكهة* 🧾\n` +
      `------------------------------------------\n` +
      `*رقم الطلب:* #${details.orderNumber}\n` +
      `*اسم العميل:* ${user?.name || 'عميل المتجر'}\n` +
      `*رقم الهاتف:* ${details.phone}\n` +
      `*العنوان:* ${details.address}\n` +
      `*طريقة الدفع:* ${paymentText}\n` +
      `------------------------------------------\n\n` +
      `📋 *الأصناف المطلوبة:*\n${formattedItems}\n\n` +
      `------------------------------------------\n` +
      `*المجموع الفرعي:* ${details.totalAmount} ج.س\n` +
      `*تكلفة التوصيل:* ${details.deliveryFee} ج.س\n` +
      `*الإجمالي الكلي:* *${details.grandTotal} ج.س*\n` +
      `------------------------------------------\n` +
      bankDetailsSection +
      `\nشكراً لطلبك من 50 فاكهة! 🍉🍹`;

    const cleanPhone = whatsappPhone.replace('+', '').trim();
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (orderSuccess && lastOrderDetails) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-teal-100 min-h-screen">
        <div className="max-w-xl w-full bg-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-emerald-100 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto animate-bounce">
            🎉
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-emerald-950">تم إرسال طلبك بنجاح!</h2>
            <p className="text-slate-500 text-sm">تم توليد فاتورة الطلب وإرسالها إلى الواتساب تلقائياً.</p>
          </div>

          {/* Invoice card preview */}
          <div className="bg-slate-50 rounded-2xl p-5 text-right border border-slate-200/80 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-slate-800 text-lg">🧾 فاتورة الطلب</span>
              <span className="font-mono text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">
                رقم الطلب: #{lastOrderDetails.orderNumber}
              </span>
            </div>
            
            <div className="space-y-1.5 text-sm text-slate-600">
              <p>👤 *العميل:* {user?.name}</p>
              <p>📞 *الهاتف:* {lastOrderDetails.phone}</p>
              <p>📍 *العنوان:* {lastOrderDetails.address}</p>
              <p>💳 *طريقة الدفع:* {lastOrderDetails.paymentMethod === 'bank' ? 'تحويل بنكي 🏦' : 'الدفع عند الاستلام 💵'}</p>
              {lastOrderDetails.paymentMethod === 'bank' && (
                <div className="bg-slate-100 p-2.5 rounded-lg border text-xs space-y-0.5 mt-2">
                  <p className="font-bold text-slate-700">بيانات الحساب المستخدم:</p>
                  <p>🏦 البنك: {lastOrderDetails.bankName}</p>
                  <p>💳 الحساب: {lastOrderDetails.bankAccount}</p>
                  <p>👤 الاسم: {lastOrderDetails.bankHolderName}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-3 space-y-2">
              {lastOrderDetails.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-sm text-slate-700">
                  <span>{it.quantity}x {it.name} {it.selectedSize ? `(${it.selectedSize})` : ''}</span>
                  <span className="font-semibold">{it.price * it.quantity} ج.س</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>المجموع الفرعي:</span>
                <span>{lastOrderDetails.totalAmount} ج.س</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>تكلفة التوصيل:</span>
                <span>{lastOrderDetails.deliveryFee} ج.س</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black text-base pt-1">
                <span>الإجمالي الكلي:</span>
                <span className="text-emerald-700">{lastOrderDetails.grandTotal} ج.س</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => sendToWhatsApp(lastOrderDetails)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition duration-200 flex items-center justify-center gap-2"
            >
              <span>💬</span> إعادة إرسال الفاتورة عبر واتساب
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition duration-200"
            >
              العودة للمتجر 🍉
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                key={item.cartKey}
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
                      {item.selectedSize && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                          {item.selectedSize}
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
                      onClick={() => updateQuantity(item.cartKey, Math.max(1, item.quantity - 1))}
                      className="px-3 py-1 font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-4 font-bold text-slate-800">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
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
                    onClick={() => removeFromCart(item.cartKey)}
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
                <span className="text-emerald-700">{grandTotal} gl.s</span>
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

              {!acceptingOrders ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-center space-y-2 font-semibold">
                  <span className="text-2xl block">🚫</span>
                  <p className="text-sm">نعتذر منك، استقبال الطلبات مغلق حالياً.</p>
                  <p className="text-xs text-rose-600">يرجى الانتظار لحين إعادة التفعيل من قِبل الإدارة.</p>
                </div>
              ) : user ? (
                <form onSubmit={handleCheckout} className="space-y-5">
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
                      rows="2"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="block text-slate-700 text-sm font-semibold">💳 طريقة الدفع</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all flex flex-col items-center gap-1 ${
                          paymentMethod === 'cash'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-200'
                        }`}
                      >
                        <span className="text-lg">💵</span>
                        <span>الدفع عند الاستلام</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bank')}
                        className={`py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all flex flex-col items-center gap-1 ${
                          paymentMethod === 'bank'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-200'
                        }`}
                      >
                        <span className="text-lg">🏦</span>
                        <span>تحويل بنكي</span>
                      </button>
                    </div>
                  </div>

                  {/* Bank Details & Receipt File Upload */}
                  {paymentMethod === 'bank' && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="text-xs text-slate-600 space-y-1 text-right">
                        <p className="font-bold text-slate-700">بيانات الحساب للتحويل البنكي:</p>
                        <p>🏦 البنك: <span className="font-bold">{bankName || 'غير محدد'}</span></p>
                        <p>💳 رقم الحساب: <span className="font-mono font-bold">{bankAccount || 'غير محدد'}</span></p>
                        <p>👤 اسم صاحب الحساب: <span className="font-bold">{bankHolderName || 'غير محدد'}</span></p>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-rose-700">📸 إرفاق صورة إشعار التحويل (إجباري):</label>
                        <input
                          type="file"
                          accept="image/*"
                          required
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          className="w-full text-xs text-slate-650 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    id="checkout-submit"
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-xl text-white font-bold text-lg shadow hover:shadow-md transition duration-200 ${
                      loading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {loading 
                      ? (uploadingReceipt ? 'جاري رفع إشعار التحويل...' : 'جاري إرسال الطلب...') 
                      : 'تأكيد الطلب وشحن 🚚'}
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
