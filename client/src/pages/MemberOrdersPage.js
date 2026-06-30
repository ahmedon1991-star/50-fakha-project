import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

export default function MemberOrdersPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [ordersSubTab, setOrdersSubTab] = useState('active');
  const [expandedOrders, setExpandedOrders] = useState({});

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

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

  const toggleOrderDetails = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleReorder = (order) => {
    if (!order.items || !Array.isArray(order.items)) return;
    order.items.forEach(item => {
      const productObj = {
        id: item.product_id,
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

  const getStepIndex = (status) => {
    switch (status) {
      case 'قيد الانتظار': return 0;
      case 'تم التأكيد': return 1;
      case 'قيد التوصيل': return 2;
      case 'تم التوصيل': return 3;
      default: return -1;
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
    <div className="flex-1 min-h-screen bg-slate-50 pb-36 lg:pb-16 text-right">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-800 text-white p-8 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-right">
          <div>
            <h1 className="text-3xl font-black" style={{ fontFamily: "'Cairo', sans-serif" }}>طلباتي</h1>
            <p className="text-emerald-100 text-sm mt-1">تتبع طلباتك الحالية وتصفح تاريخ طلباتك السابقة</p>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="bg-white text-emerald-800 hover:bg-emerald-50 hover:scale-[1.02] text-xs font-bold px-4 py-2.5 rounded-xl shadow transition duration-200"
            >
              العودة للمتجر 🏪
            </Link>
          </div>
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium">جاري تحميل طلباتك...</p>
          </div>
        ) : (
          <div className="space-y-6">


            {/* Orders sub-tab switcher */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setOrdersSubTab('active')}
                className={`py-3 rounded-2xl font-black text-center text-xs sm:text-sm border-2 transition-all duration-200 cursor-pointer ${
                  ordersSubTab === 'active'
                    ? 'bg-[#b8295b] border-[#b8295b] text-white shadow-md'
                    : 'bg-white border-[#b8295b] text-[#b8295b] hover:bg-[#b8295b]/5'
                }`}
              >
                الطلبات الحالية ⏳
              </button>
              <button
                onClick={() => setOrdersSubTab('history')}
                className={`py-3 rounded-2xl font-black text-center text-xs sm:text-sm border-2 transition-all duration-200 cursor-pointer ${
                  ordersSubTab === 'history'
                    ? 'bg-[#b8295b] border-[#b8295b] text-white shadow-md'
                    : 'bg-white border-[#b8295b] text-[#b8295b] hover:bg-[#b8295b]/5'
                }`}
              >
                الطلبات السابقة 📦
              </button>
            </div>

            {/* Orders List */}
            {(() => {
              const filtered = orders.filter(o => {
                if (ordersSubTab === 'active') {
                  return o.status !== 'تم التوصيل' && o.status !== 'ملغي';
                } else {
                  return o.status === 'تم التوصيل' || o.status === 'ملغي';
                }
              });

              if (filtered.length === 0) {
                return (
                  <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
                    <p className="text-3xl">🥣</p>
                    <p className="font-bold text-slate-500 mt-2 text-sm">
                      {ordersSubTab === 'active' ? 'لا توجد طلبات نشطة حالياً' : 'لا يوجد لديك طلبات سابقة'}
                    </p>
                    <Link to="/products" className="inline-block mt-4 text-[#b8295b] hover:underline font-bold text-xs">
                      اطلب الآن من المنيو ←
                    </Link>
                  </div>
                );
              }

              return filtered.map(order => {
                const stepIdx = getStepIndex(order.status);
                const isExpanded = !!expandedOrders[order.id];
                const firstItem = order.items?.[0] || {};

                return (
                  <div key={order.id} className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden text-right">
                    {/* Compact Card Header */}
                    <div 
                      onClick={() => toggleOrderDetails(order.id)}
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition"
                    >
                      <span className="text-slate-400 text-xs font-bold">
                        {isExpanded ? '▲ إخفاء' : '▼ تفاصيل'}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-black text-sm text-slate-800">
                            طلب #{order.order_number}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {new Date(order.created_at).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
                          </div>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-orange-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {firstItem.image ? (
                            <img src={firstItem.image} alt={firstItem.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">🍹</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="px-4 pb-4 border-b border-slate-100">
                      <div className="flex justify-between items-center bg-slate-50 rounded-2xl p-3 border border-slate-100">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-black border ${getStatusBadgeColor(order.status)}`}>
                          {order.status}
                        </span>
                        <div className="text-left">
                          <span className="text-[9px] text-slate-400 block font-bold">الحساب الكلي</span>
                          <span className="text-xs font-black text-[#C95A06] font-mono">
                            {order.total_price} ج.س
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Details */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50/50 space-y-4">
                        {/* Stepper (Only for active orders) */}
                        {order.status !== 'ملغي' && stepIdx >= 0 && (
                          <div className="py-2 border-b border-slate-100">
                            <div className="relative flex justify-between items-center w-full max-w-md mx-auto">
                              {/* Horizontal track line */}
                              <div className="absolute top-[18px] left-0 right-0 h-1 bg-slate-200 -z-10" />
                              <div 
                                className="absolute top-[18px] right-0 h-1 bg-emerald-500 transition-all duration-500 -z-10" 
                                style={{ width: `${(stepIdx / 3) * 100}%` }}
                              />

                              {steps.map((st, sIdx) => {
                                const isDone = sIdx <= stepIdx;
                                const isCurrent = sIdx === stepIdx;
                                return (
                                  <div key={st.label} className="flex flex-col items-center gap-1.5 flex-1 relative">
                                    <div 
                                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${
                                        isDone 
                                          ? isCurrent 
                                            ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 scale-110 font-bold' 
                                            : 'bg-emerald-600 text-white'
                                          : 'bg-white text-slate-400 border-2 border-slate-200'
                                      }`}
                                    >
                                      {isDone ? '✓' : st.icon}
                                    </div>
                                    <span className={`text-[9px] font-black tracking-tight ${
                                      isCurrent ? 'text-emerald-600 font-bold' : isDone ? 'text-slate-700' : 'text-slate-400'
                                    }`}>
                                      {st.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Items List */}
                        <div className="space-y-2">
                          <h4 className="text-[11px] text-slate-400 font-bold">مكونات الطلب:</h4>
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-150">
                              <span className="text-xs font-black text-slate-700 font-mono">
                                {item.price * item.quantity} ج.س
                              </span>
                              <div className="text-right">
                                <span className="text-xs font-black text-slate-800">{item.name}</span>
                                {item.selectedSize && (
                                  <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-md font-bold mr-2">
                                    {item.selectedSize}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 mr-2 font-mono">({item.quantity}x)</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Delivery address details */}
                        <div className="bg-white p-3 rounded-2xl border border-slate-150 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-700">{order.customer_name}</span>
                            <span className="text-slate-400">اسم العميل:</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-700 font-mono">{order.customer_phone}</span>
                            <span className="text-slate-400">رقم التواصل:</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-700">{order.delivery_city} — {order.delivery_neighborhood}</span>
                            <span className="text-slate-400">موقع التوصيل:</span>
                          </div>
                          {order.delivery_street && (
                            <div className="flex justify-between">
                              <span className="font-bold text-slate-700">{order.delivery_street}</span>
                              <span className="text-slate-400">الشارع/المعلم:</span>
                            </div>
                          )}
                          {order.notes && (
                            <div className="flex justify-between text-amber-700">
                              <span className="font-bold">{order.notes}</span>
                              <span className="text-slate-400">ملاحظات العميل:</span>
                            </div>
                          )}
                        </div>

                        {/* Reorder Button */}
                        <button
                          onClick={() => handleReorder(order)}
                          className="w-full py-2.5 rounded-xl bg-white text-[#b8295b] border border-[#b8295b] hover:bg-[#b8295b]/5 font-bold text-xs sm:text-sm cursor-pointer transition text-center"
                        >
                          إعادة الطلب 🔁
                        </button>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
