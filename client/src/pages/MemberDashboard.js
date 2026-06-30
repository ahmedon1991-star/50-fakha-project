import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

export default function MemberDashboard() {
  const { user, logout, verifyOtp } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Collapsible orders detail view
  const [expandedOrders, setExpandedOrders] = useState({});
  const toggleOrderDetails = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Sub-tab for orders ('active' or 'history')
  const [ordersSubTab, setOrdersSubTab] = useState('active');

  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Settings State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  
  // Phone OTP Update Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;
      setOrders(data || []);
    } catch (err) {
      console.error(err);
      setError('تعذر تحميل طلباتك، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // 1. Update Name in profiles and user metadata
      if (name !== user.name) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ name })
          .eq('id', user.id);
        
        if (profileErr) throw profileErr;

        const { error: authErr } = await supabase.auth.updateUser({
          data: { name }
        });
        if (authErr) throw authErr;
      }

      // 2. Update Password if entered
      if (password) {
        if (password.length < 6) {
          throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        }
        const { error: pwdErr } = await supabase.auth.updateUser({
          password: password
        });
        if (pwdErr) throw pwdErr;
        setPassword('');
      }

      // 3. Update Email if changed
      if (email !== user.email) {
        const { error: emailErr } = await supabase.auth.updateUser({
          email: email
        });
        if (emailErr) throw emailErr;
        setSuccessMsg('تم تحديث الاسم/كلمة المرور بنجاح. يرجى مراجعة بريدك الإلكتروني الجديد لتأكيد تغيير البريد.');
      } else {
        setSuccessMsg('تم تحديث بيانات ملفك الشخصي بنجاح! 🎉');
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تحديث البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneUpdateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setOtpError('');
    
    if (!phone.startsWith('+')) {
      setError('يرجى كتابة الهاتف بالصيغة الدولية التي تبدأ بـ + (مثال: +201012345678)');
      return;
    }

    setLoading(true);
    try {
      // Trigger phone change OTP
      const { error: phoneErr } = await supabase.auth.updateUser({ phone });
      if (phoneErr) throw phoneErr;

      setTempPhone(phone);
      setShowOtpModal(true);
    } catch (err) {
      setError(err.message || 'خطأ أثناء طلب تغيير الهاتف، تأكد من صحة الرقم');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);

    try {
      // Verify OTP (type 'phone_change' matches what is sent on updateUser({ phone }))
      await verifyOtp(tempPhone, otpToken, name);
      
      // Update phone in profiles table as well
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ phone: tempPhone })
        .eq('id', user.id);
      if (dbErr) console.error('Database phone sync error:', dbErr.message);

      setShowOtpModal(false);
      setOtpToken('');
      setSuccessMsg('تم تأكيد رقم الهاتف الجديد بنجاح! 📱✨');
    } catch (err) {
      setOtpError(err.message || 'رمز التأكيد غير صحيح، حاول مرة أخرى');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (deleteConfirmText !== 'حذف') {
      setDeleteError('يرجى كتابة كلمة حذف بشكل صحيح');
      return;
    }
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.message || 'حدث خطأ أثناء محاولة حذف الحساب. يرجى التأكد من تشغيل SQL الخاص بالدالة في لوحة تحكم Supabase');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) return;
    order.items.forEach(item => {
      const productObj = {
        id: item.productId || item.id,
        name: item.name,
        price: item.price,
        image: item.image || ''
      };
      for (let i = 0; i < (item.quantity || 1); i++) {
        addToCart(productObj, item.selectedSize || null, item.price);
      }
    });
    setSuccessMsg('تمت إعادة إضافة جميع الأصناف إلى السلة بنجاح! 🛒✨');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin);
    setSuccessMsg('تم نسخ رابط المتجر! شاركه مع أصدقائك وعائلتك 🍉✨');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const getStepIndex = (status) => {
    switch (status) {
      case 'قيد الانتظار': return 0;
      case 'تم التأكيد': return 1;
      case 'قيد التوصيل': return 2;
      case 'تم التوصيل': return 3;
      default: return -1; // Canceled
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'قيد الانتظار': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'تم التأكيد': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'قيد التوصيل': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'تم التوصيل': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  const steps = [
    { label: 'قيد الانتظار', icon: '⏳' },
    { label: 'تم التأكيد', icon: '📋' },
    { label: 'قيد التوصيل', icon: '🛵' },
    { label: 'تم التوصيل', icon: '📦' }
  ];

  return (
    <div className="flex-1 min-h-screen bg-slate-50 pb-36 lg:pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-800 text-white p-8 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-right">
          <div>
            <h1 className="text-3xl font-black">حسابي الشخصي</h1>
            <p className="text-emerald-100 text-sm mt-1">تتبع طلباتك وقم بإدارة إعدادات أمان حسابك</p>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="bg-white text-emerald-800 hover:bg-emerald-50 hover:scale-[1.02] text-xs font-bold px-4 py-2.5 rounded-xl shadow transition duration-200"
            >
              العودة للمتجر 🏪
            </Link>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
              <span className="text-2xl">👤</span>
              <div className="text-right">
                <p className="font-bold text-sm">{user?.name}</p>
                <p className="text-xs text-emerald-200 font-mono">{user?.phone || user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="bg-white border-b border-slate-200 sticky top-[60px] z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex gap-2 sm:gap-6 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-3 font-extrabold text-sm border-b-4 transition-all duration-200 ${
              activeTab === 'orders' 
                ? 'border-emerald-600 text-emerald-700' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            📦 تتبع طلباتي
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-3 font-extrabold text-sm border-b-4 transition-all duration-200 ${
              activeTab === 'settings' 
                ? 'border-emerald-600 text-emerald-700' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            ⚙️ إعدادات الحساب والأمان
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto p-4 md:p-6 mt-4">
        {error && (
          <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-800 p-4 rounded-xl shadow-sm mb-6 font-semibold text-sm">
            ⚠️ {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border-r-4 border-emerald-500 text-emerald-800 p-4 rounded-xl shadow-sm mb-6 font-semibold text-sm">
            ✅ {successMsg}
          </div>
        )}

        {loading && activeTab === 'orders' ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium">جاري تحميل طلباتك...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: ORDER TRACKING */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                
                {/* 3 Top Cards / Shortcuts */}
                <div className="grid grid-cols-3 gap-2.5 mb-6">
                  {/* ملفي الشخصي */}
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className="bg-[#3A3029] hover:bg-[#4d4037] text-white p-3 rounded-2xl flex flex-col items-center justify-between text-center gap-1.5 transition duration-150 min-h-[96px] border border-[#F0E1CC]/10"
                  >
                    <span className="text-xl">🕶️</span>
                    <span style={{ fontFamily: "'Cairo', sans-serif" }} className="text-[11px] font-black leading-tight">ملفي الشخصي</span>
                  </button>
                  
                  {/* قائمتي المفضلة */}
                  <Link 
                    to="/products"
                    className="bg-[#3A3029] hover:bg-[#4d4037] text-white p-3 rounded-2xl flex flex-col items-center justify-between text-center gap-1.5 transition duration-150 min-h-[96px] border border-[#F0E1CC]/10 flex justify-center"
                  >
                    <span className="text-xl">⭐</span>
                    <span style={{ fontFamily: "'Cairo', sans-serif" }} className="text-[11px] font-black leading-tight">قائمتي المفضلة</span>
                  </Link>
                  
                  {/* شاركنا مع أصدقائك */}
                  <button 
                    onClick={handleShare}
                    className="bg-[#3A3029] hover:bg-[#4d4037] text-white p-3 rounded-2xl flex flex-col items-center justify-between text-center gap-1.5 transition duration-150 min-h-[96px] border border-[#F0E1CC]/10"
                  >
                    <span className="text-xl">🤝</span>
                    <span style={{ fontFamily: "'Cairo', sans-serif" }} className="text-[11px] font-black leading-tight">شاركنا مع أصدقائك</span>
                  </button>
                </div>

                {/* Orders sub-tab switcher */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => setOrdersSubTab('active')}
                    className={`py-3 rounded-2xl font-black text-center text-xs sm:text-sm border-2 transition-all duration-200 ${
                      ordersSubTab === 'active'
                        ? 'bg-[#b8295b] border-[#b8295b] text-white shadow-md'
                        : 'bg-white border-[#b8295b] text-[#b8295b] hover:bg-[#b8295b]/5'
                    }`}
                  >
                    الطلبات الحالية
                  </button>
                  <button
                    onClick={() => setOrdersSubTab('history')}
                    className={`py-3 rounded-2xl font-black text-center text-xs sm:text-sm border-2 transition-all duration-200 ${
                      ordersSubTab === 'history'
                        ? 'bg-[#b8295b] border-[#b8295b] text-white shadow-md'
                        : 'bg-white border-[#b8295b] text-[#b8295b] hover:bg-[#b8295b]/5'
                    }`}
                  >
                    الطلبات السابقة
                  </button>
                </div>

                {(() => {
                  const filteredOrders = orders.filter(o => {
                    const isClosed = o.status === 'تم التوصيل' || o.status === 'ملغي';
                    return ordersSubTab === 'history' ? isClosed : !isClosed;
                  });

                  if (filteredOrders.length === 0) {
                    return (
                      <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center text-slate-500 space-y-3">
                        <span className="text-5xl block">🍍</span>
                        <p className="font-extrabold text-lg">
                          {ordersSubTab === 'active' ? 'لا توجد طلبات نشطة حالياً' : 'سجل طلباتك السابقة فارغ'}
                        </p>
                        <p className="text-sm text-slate-400">
                          {ordersSubTab === 'active' 
                            ? 'توجه للمتجر واطلب ألذ المشروبات لتبدأ التتبع!'
                            : 'كافة الطلبات التي تكتمل أو تُلغى ستظهر هنا كأرشيف لبياناتك.'}
                        </p>
                      </div>
                    );
                  }

                  return filteredOrders.map((order) => {
                    const currentStep = getStepIndex(order.status);
                    const isCanceled = order.status === 'ملغي';
                    const isDelivered = order.status === 'تم التوصيل';
                    const firstItem = order.items?.[0] || {};
                    const itemsCount = order.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 0;
                    const isExpanded = !!expandedOrders[order.id];
                    
                    return (
                      <div key={order.id} className="border border-[#F0E1CC] bg-white rounded-3xl p-5 mb-5 relative text-right flex flex-col gap-3.5 shadow-sm transition hover:shadow-md">
                        {/* Top Row: Order Number + Star */}
                        <div className="flex justify-between items-center">
                          <span style={{ fontSize: '20px', color: '#b8295b', cursor: 'pointer' }}>☆</span>
                          <div className="font-black text-[#F3760C] text-sm sm:text-base">
                            رقم الطلب: {order.order_number || order.id?.slice(0, 8)}
                          </div>
                        </div>

                        {/* Info Row: Count, Date, Status + Image */}
                        <div className="flex justify-between items-center gap-4">
                          {/* First Item Image (Left Side) */}
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#FFE3C2] flex items-center justify-center flex-shrink-0 border border-[#F0E1CC]/40">
                            {firstItem.image ? (
                              <img src={firstItem.image} alt={firstItem.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-3xl">🍹</span>
                            )}
                          </div>

                          {/* Text Info (Right Side) */}
                          <div className="flex-grow flex flex-col gap-0.5">
                            <div className="font-extrabold text-sm text-[#1B130D]">
                              {itemsCount} {itemsCount === 1 ? 'عنصر' : 'عناصر'}
                            </div>
                            <div className="text-[11px] text-[#9C7A5A] font-semibold">
                              موعد الطلب: {new Date(order.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                            <div className="mt-1">
                              <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeColor(order.status)}`}>
                                {order.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Delivery Method / Address */}
                        <div className="text-[11px] text-[#9C7A5A] font-semibold">
                          {order.shipping_address ? `📍 التوصيل إلى: ${order.shipping_address}` : '🏪 الاستلام من الفرع'}
                        </div>

                        {/* Collapsible Details */}
                        {isExpanded && (
                          <div className="mt-2 pt-4 border-t border-dashed border-[#F0E1CC] flex flex-col gap-3">
                            {/* Stepper Status (Only for active orders) */}
                            {!isCanceled && !isDelivered && (
                              <div className="py-2 border-b border-[#F0E1CC] overflow-x-auto">
                                <div className="relative flex justify-between items-center gap-4 py-2 min-w-[280px] max-w-xl mx-auto">
                                  {/* Horizontal line for MD */}
                                  <div className="absolute top-[20px] left-0 right-0 h-1 bg-slate-200 z-0">
                                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(currentStep / 3) * 100}%` }}></div>
                                  </div>
                                  {/* Stepper Nodes */}
                                  {steps.map((step, idx) => {
                                    const isCompleted = idx <= currentStep;
                                    const isActive = idx === currentStep;
                                    return (
                                      <div key={idx} className="flex flex-col items-center gap-1.5 z-10">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow border-2 transition-all duration-300 ${
                                          isActive ? 'bg-emerald-500 text-white border-emerald-400 scale-105 ring-2 ring-emerald-100' : isCompleted ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-slate-400 border-slate-200'
                                        }`}>
                                          {step.icon}
                                        </div>
                                        <p className={`font-bold text-[10px] ${isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Detailed Items list */}
                            <div className="flex flex-col gap-2">
                              <div className="font-extrabold text-[12px] text-[#1B130D]">📋 الأصناف بالتفصيل:</div>
                              <div className="flex flex-col gap-1.5">
                                {order.items?.map((it, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-[#FFF7EC] p-2.5 rounded-xl border border-[#F0E1CC]">
                                    <span className="font-bold text-[12px] text-[#1B130D]">
                                      {it.name} {it.selectedSize ? `(${it.selectedSize})` : ''}
                                    </span>
                                    <span className="text-[11px] text-[#9C7A5A] font-bold">
                                      <span className="text-[#F3760C] font-extrabold">{it.quantity}x</span> {it.price} ج.س
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Phone number */}
                            <div className="text-[11px] text-[#6B5C4F] font-semibold">
                              📞 رقم هاتف الطلب: <span className="font-mono font-bold text-slate-800">{order.phone}</span>
                            </div>
                          </div>
                        )}

                        {/* Bottom Buttons Row */}
                        <div className="flex gap-3 mt-1.5">
                          <button
                            onClick={() => toggleOrderDetails(order.id)}
                            className="flex-1 py-2.5 rounded-xl bg-[#b8295b] hover:bg-[#a0224f] text-white border-none font-bold text-xs sm:text-sm cursor-pointer transition shadow-sm text-center"
                          >
                            {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                          </button>
                          <button
                            onClick={() => handleReorder(order)}
                            className="flex-1 py-2.5 rounded-xl bg-white text-[#b8295b] border border-[#b8295b] hover:bg-[#b8295b]/5 font-bold text-xs sm:text-sm cursor-pointer transition text-center"
                          >
                            إعادة الطلب
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* TAB 2: ACCOUNT SETTINGS */}
            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Form 1: General Profile Info & Password */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-right space-y-5">
                  <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <span>🔑</span>
                    <span>تعديل الملف الشخصي والأمان</span>
                  </h3>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label className="block text-slate-700 text-sm font-semibold mb-2">الاسم الكامل</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-right"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 text-sm font-semibold mb-2">البريد الإلكتروني</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-left"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 text-sm font-semibold mb-2">كلمة المرور الجديدة (اختياري)</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="اتركها فارغة إذا لم ترغب في التغيير"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-right"
                        dir="ltr"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition duration-200 shadow-md"
                    >
                      حفظ التغييرات 💾
                    </button>
                  </form>
                </div>

                {/* Form 2: Phone Settings Update with SMS OTP */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-right space-y-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                      <span>📱</span>
                      <span>تحديث رقم الهاتف المؤكد</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-2">رقم الهاتف المستخدم حالياً لتلقي رسائل تتبع طلباتك وإثبات الهوية.</p>
                    
                    <form onSubmit={handlePhoneUpdateSubmit} className="space-y-4 mt-4">
                      <div>
                        <label className="block text-slate-700 text-sm font-semibold mb-2">رقم الهاتف الجديد (بصيغة دولية)</label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+201234567890"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-left"
                          dir="ltr"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">يجب كتابة رمز الدولة أولاً (مثال: +20 لمصر، +966 للسعودية)</span>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition duration-200 shadow-md"
                      >
                        طلب تعديل الهاتف وإرسال الرمز ✉️
                      </button>
                    </form>
                  </div>

                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mt-6 text-xs text-amber-800 space-y-1">
                    <p className="font-bold">⚠️ ملاحظة أمنية:</p>
                    <p>تغيير رقم الهاتف يتطلب تفعيل الهاتف الجديد عبر رمز تأكيد SMS حقيقي، ولا يمكن التسجيل بنفس الهاتف لحسابين مختلفين مطلقاً.</p>
                  </div>
                </div>

                {/* Form 3: Danger Zone */}
                <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm text-right space-y-5 md:col-span-2">
                  <h3 className="text-lg font-black text-rose-800 border-b border-rose-100 pb-3 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>منطقة الخطر (إجراء غير مسترد)</span>
                  </h3>
                  <p className="text-xs text-slate-500">حذف الحساب سيؤدي إلى مسح كافة بياناتك، طلباتك السابقة، وعنوانك نهائياً من أنظمتنا دون إمكانية للاسترجاع.</p>
                  
                  <div className="flex justify-between items-center gap-4 flex-wrap bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
                    <div className="text-right">
                      <p className="font-bold text-sm text-rose-955">حذف الحساب الشخصي</p>
                      <p className="text-xs text-slate-500">سيتم مسح الحساب نهائياً من خوادم Supabase وقاعدة البيانات فوراً.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirmText('');
                        setDeleteError('');
                        setShowDeleteModal(true);
                      }}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition duration-200 shadow-md text-xs sm:text-sm"
                    >
                      حذف الحساب نهائياً 🚨
                    </button>
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>

      {/* PHONE OTP VERIFICATION MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden text-right transition-all">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-lg font-bold">💬 تأكيد رقم الهاتف الجديد</h3>
              <button 
                onClick={() => setShowOtpModal(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOtpVerify} className="p-6 space-y-5 text-right">
              {otpError && (
                <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-800 p-3 rounded-lg text-xs font-semibold">
                  ⚠️ {otpError}
                </div>
              )}
              
              <div className="text-center space-y-2">
                <p className="text-slate-600 text-sm">أدخل رمز التأكيد (OTP) المكون من 6 أرقام المرسل إلى الرقم الجديد:</p>
                <p className="font-bold text-slate-800 font-mono text-base">{tempPhone}</p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  placeholder="123456"
                  className="w-full text-center px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-2xl font-bold tracking-[0.5em] text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow"
                >
                  {otpLoading ? 'جاري التحقق...' : 'تأكيد وحفظ الهاتف 📱'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-100 max-w-md w-full overflow-hidden text-right transition-all">
            <div className="bg-rose-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-lg font-bold">🚨 تأكيد حذف الحساب نهائياً</h3>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeleteAccount} className="p-6 space-y-5 text-right">
              {deleteError && (
                <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-800 p-3 rounded-lg text-xs font-semibold">
                  ⚠️ {deleteError}
                </div>
              )}
              
              <div className="space-y-2 text-slate-650 text-xs sm:text-sm">
                <p>لتأكيد حذف الحساب، يرجى كتابة الكلمة <span className="font-black text-rose-600">حذف</span> في الحقل أدناه:</p>
                <p className="font-semibold text-rose-800">تنبيه: هذا الإجراء سيقوم بإزالة حسابك كلياً ولا يمكن التراجع عنه!</p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder='اكتب "حذف" للتأكيد'
                  className="w-full text-center px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition text-base font-bold text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || deleteConfirmText !== 'حذف'}
                  className={`px-6 py-2 rounded-xl font-bold transition shadow text-white ${
                    deleteConfirmText === 'حذف'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-rose-300 cursor-not-allowed'
                  }`}
                >
                  {deleteLoading ? 'جاري الحذف...' : 'حذف الحساب نهائياً 🚨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
