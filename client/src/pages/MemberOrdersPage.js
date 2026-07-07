import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { useOrderNotifications, requestNotificationPermission } from '../hooks/useOrderNotifications';

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
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [productsList, setProductsList] = useState([]);

  // ─── Order Status Notification Toast State ───────────────────────────────
  const [statusToast, setStatusToast] = useState(null); // { title, body, emoji, color, orderNumber, newStatus }
  const toastTimerRef = useRef(null);

  const handleStatusNotification = useCallback((orderNumber, newStatus, config) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setStatusToast({ orderNumber, newStatus, ...config });
    toastTimerRef.current = setTimeout(() => setStatusToast(null), 7000);
  }, []);

  const { triggerNotification } = useOrderNotifications(handleStatusNotification);

  // Request notification permission on first mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('whatsapp_phone')
          .eq('id', 1)
          .maybeSingle();
        if (data) {
          setWhatsappPhone(data.whatsapp_phone || '');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    const fetchProductsList = async () => {
      try {
        const { data } = await supabase.from('products').select('name, image');
        if (data) {
          setProductsList(data);
        }
      } catch (err) {
        console.error('Error fetching products images:', err);
      }
    };
    fetchSettings();
    fetchProductsList();
  }, []);

  const getProductImage = (itemName) => {
    const found = productsList.find(p => p.name === itemName);
    return found?.image || '';
  };

  const formatOrderDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const generateMemberInvoiceCanvas = async (order) => {
    const canvas = document.createElement('canvas');
    const size = 800; // 800x800 for 1:1 (4x4) aspect ratio
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 1. Background
    ctx.fillStyle = '#FFFBF7';
    ctx.fillRect(0, 0, size, size);

    // 2. Outer border
    ctx.strokeStyle = '#F0E1CC';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, size - 20, size - 20);

    // 3. Load Logo
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = '/logo.png';
    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = resolve;
    });

    // 4. Load QR Code
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.src = '/qr_code.jpg';
    await new Promise((resolve) => {
      qrImg.onload = resolve;
      qrImg.onerror = resolve;
    });

    // 5. Draw Header
    let logoY = 40;
    if (logoImg.complete && logoImg.naturalWidth > 0) {
      const logow = 110;
      const logoh = (logoImg.naturalHeight / logoImg.naturalWidth) * logow;
      ctx.drawImage(logoImg, size - logow - 50, logoY, logow, logoh);
    }

    // Restaurant details
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 26px Cairo, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('50 فاكهة 🍹', size - 180, logoY + 30);
    
    ctx.fillStyle = '#6B5C4F';
    ctx.font = 'bold 14px Cairo, Arial, sans-serif';
    ctx.fillText('البريد الإلكتروني: admin@50fakha.com', size - 180, logoY + 60);
    ctx.fillText('تتبع طلبك: five0-fakha-project.onrender.com', size - 180, logoY + 80);

    // Draw Title "فاتورة شراء"
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 24px Cairo, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🧾 فاتورة شراء', 50, logoY + 40);
    ctx.font = 'bold 15px Courier New, monospace';
    ctx.fillStyle = '#E14133';
    ctx.fillText(`#${order.order_number}`, 50, logoY + 70);

    // Divider
    ctx.strokeStyle = '#F0E1CC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 140);
    ctx.lineTo(size - 40, 140);
    ctx.stroke();

    // 6. Draw Metadata (2 columns)
    let metaY = 175;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#6B5C4F';
    ctx.font = '14px Cairo, Arial, sans-serif';
    
    // Column 1 (Right): Customer Details
    ctx.fillText('العميل:', size - 40, metaY);
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 14px Cairo, Arial, sans-serif';
    ctx.fillText(order.customer_name || user?.name || 'عميل المتجر', size - 130, metaY);
    
    ctx.fillStyle = '#6B5C4F';
    ctx.font = '14px Cairo, Arial, sans-serif';
    ctx.fillText('الهاتف:', size - 40, metaY + 28);
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 14px Courier New, monospace';
    ctx.fillText(order.customer_phone || order.phone || '-', size - 130, metaY + 28);

    ctx.fillStyle = '#6B5C4F';
    ctx.font = '14px Cairo, Arial, sans-serif';
    ctx.fillText('العنوان:', size - 40, metaY + 56);
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 13px Cairo, Arial, sans-serif';
    const addr = order.shipping_address || `${order.delivery_city || ''} ${order.delivery_neighborhood || ''}`.trim() || '-';
    ctx.fillText(addr, size - 130, metaY + 56);

    // Column 2 (Left): Order Details
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6B5C4F';
    ctx.font = '14px Cairo, Arial, sans-serif';
    ctx.fillText('التاريخ والوقت:', 40, metaY);
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 13px Cairo, Arial, sans-serif';
    ctx.fillText(formatOrderDate(order.created_at), 150, metaY);

    ctx.fillStyle = '#6B5C4F';
    ctx.font = '14px Cairo, Arial, sans-serif';
    ctx.fillText('طريقة الدفع:', 40, metaY + 28);
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 14px Cairo, Arial, sans-serif';
    ctx.fillText(order.payment_method === 'bank' ? 'تحويل بنكي 🏦' : 'الدفع عند الاستلام 💵', 150, metaY + 28);

    ctx.fillStyle = '#6B5C4F';
    ctx.font = '14px Cairo, Arial, sans-serif';
    ctx.fillText('حالة الطلب:', 40, metaY + 56);
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 14px Cairo, Arial, sans-serif';
    ctx.fillText(order.status, 150, metaY + 56);

    // Divider
    ctx.strokeStyle = '#F0E1CC';
    ctx.beginPath();
    ctx.moveTo(40, 260);
    ctx.lineTo(size - 40, 260);
    ctx.stroke();

    // 7. Table Header
    ctx.fillStyle = '#FFF7EC';
    ctx.fillRect(40, 275, size - 80, 35);
    ctx.strokeStyle = '#FFE3C2';
    ctx.strokeRect(40, 275, size - 80, 35);

    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 14px Cairo, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('الصنف', size - 55, 298);
    ctx.textAlign = 'center';
    ctx.fillText('الكمية', size - 260, 298);
    ctx.fillText('السعر', size - 380, 298);
    ctx.textAlign = 'left';
    ctx.fillText('الإجمالي', 55, 298);

    // Draw Items
    let itemY = 325;
    const items = order.items || [];
    
    // Draw up to 5 items to keep it clean on a 4x4 square paper
    const maxItemsToDraw = 4;
    for (let i = 0; i < Math.min(items.length, maxItemsToDraw); i++) {
      const item = items[i];
      const prodImgUrl = getProductImage(item.name);
      
      // Load and draw product image thumbnail if exists
      if (prodImgUrl) {
        const prodImg = new Image();
        prodImg.crossOrigin = 'anonymous';
        prodImg.src = prodImgUrl;
        await new Promise((resolve) => {
          prodImg.onload = resolve;
          prodImg.onerror = resolve;
        });
        if (prodImg.complete && prodImg.naturalWidth > 0) {
          ctx.drawImage(prodImg, size - 90, itemY - 18, 32, 32);
        }
      } else {
        // Draw emoji placeholder
        ctx.font = '16px Cairo, Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('🍹', size - 60, itemY + 4);
      }

      ctx.fillStyle = '#1B130D';
      ctx.font = 'bold 13px Cairo, Arial, sans-serif';
      ctx.textAlign = 'right';
      const sizeSuffix = item.selectedSize ? ` (${item.selectedSize})` : '';
      ctx.fillText(`${item.name}${sizeSuffix}`, size - 105, itemY + 4);

      ctx.textAlign = 'center';
      ctx.font = 'bold 13px Courier New, monospace';
      ctx.fillText(`${item.quantity}x`, size - 260, itemY + 4);
      ctx.fillText(`${item.price} ج.س`, size - 380, itemY + 4);

      ctx.textAlign = 'left';
      ctx.font = 'bold 14px Courier New, monospace';
      ctx.fillText(`${item.price * item.quantity} ج.س`, 55, itemY + 4);

      itemY += 42;
    }

    if (items.length > maxItemsToDraw) {
      ctx.fillStyle = '#6B5C4F';
      ctx.font = 'italic 12px Cairo, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`+ ${items.length - maxItemsToDraw} أصناف أخرى...`, size - 105, itemY + 4);
      itemY += 25;
    }

    // Divider
    ctx.strokeStyle = '#F0E1CC';
    ctx.beginPath();
    ctx.moveTo(40, 520);
    ctx.lineTo(size - 40, 520);
    ctx.stroke();

    // 8. Totals and QR Code footer area
    let footerY = 540;
    
    // Draw QR Code on the bottom-left
    if (qrImg.complete && qrImg.naturalWidth > 0) {
      const qrw = 135;
      ctx.drawImage(qrImg, 45, footerY, qrw, qrw);
      ctx.fillStyle = '#6B5C4F';
      ctx.font = 'bold 11px Cairo, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('الموقع الإلكتروني الرسمي 📲', 45 + (qrw / 2), footerY + qrw + 20);
    }

    // Draw Totals on the bottom-right
    const subtotal = items.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity)), 0) || 0;
    const deliveryFee = order.total_amount - subtotal;

    ctx.textAlign = 'right';
    ctx.fillStyle = '#6B5C4F';
    ctx.font = '14px Cairo, Arial, sans-serif';
    ctx.fillText('المجموع الفرعي:', size - 200, footerY + 25);
    ctx.fillText('تكلفة التوصيل:', size - 200, footerY + 55);
    
    ctx.fillStyle = '#E14133';
    ctx.font = 'bold 16px Cairo, Arial, sans-serif';
    ctx.fillText('الإجمالي الكلي:', size - 200, footerY + 95);

    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 14px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${subtotal} ج.س`, size - 180, footerY + 25);
    ctx.fillText(`${deliveryFee} ج.س`, size - 180, footerY + 55);
    
    ctx.fillStyle = '#E14133';
    ctx.font = 'bold 18px Courier New, monospace';
    ctx.fillText(`${order.total_amount} ج.س`, size - 180, footerY + 95);

    // 9. Brand Slogan Footer
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 15px Cairo, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💚 شكراً لتعاملك مع 50 فاكهة! يسعدنا دائماً خدمتكم 💚', size / 2, size - 35);

    return canvas;
  };

  const downloadMemberInvoice = async (order) => {
    try {
      const canvas = await generateMemberInvoiceCanvas(order);
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `invoice_${order.order_number || order.id}.png`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحميل الفاتورة كصورة.');
    }
  };

  const sendOrderToWhatsApp = (order) => {
    if (!whatsappPhone) return;

    const divider = '━━━━━━━━━━━━━━━━━━━━';
    const formattedItems = (order.items || []).map(item => 
      `• *${item.name}* ${item.selectedSize ? `(_${item.selectedSize}_)` : ''}\n` +
      `  الكمية: *${item.quantity || 1}* ✖️ ${item.price} ج.س = *${(item.price || 0) * (item.quantity || 1)} ج.س*`
    ).join('\n\n');

    const paymentText = order.payment_method === 'bank' 
      ? '🏦 تحويل بنكي (مرفق إشعار التحويل)' 
      : '💵 الدفع عند الاستلام (كاش)';

    const bankDetailsSection = (order.payment_method === 'bank' && order.transfer_receipt)
      ? `\n🔗 *رابط إشعار التحويل:* ${order.transfer_receipt}\n`
      : '';

    const message = `✨ *فاتورة طلب مؤكدة - 50 فاكهة* ✨\n` +
      `${divider}\n` +
      `🆔 *رقم الطلب:* \`#${order.order_number}\`\n` +
      `👤 *اسم العميل:* ${order.customer_name || user?.name || 'عميل المتجر'}\n` +
      `📞 *رقم الهاتف:* ${order.customer_phone || order.phone}\n` +
      `📍 *العنوان:* ${order.shipping_address || `${order.delivery_city || ''} ${order.delivery_neighborhood || ''}`}\n` +
      `💳 *طريقة الدفع:* ${paymentText}\n` +
      `${divider}\n\n` +
      `🛒 *الأصناف المطلوبة:*\n\n${formattedItems}\n\n` +
      `${divider}\n` +
      `💰 *الإجمالي الكلي:* *${order.total_amount} ج.س*\n` +
      `${divider}\n` +
      bankDetailsSection +
      `\n💚 شكراً لتعاملك مع 50 فاكهة!`;

    const cleanPhone = whatsappPhone.replace('+', '').trim();
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const NOTIFIABLE_STATUSES = ['تم التأكيد', 'قيد التوصيل', 'تم التوصيل'];

    const channel = supabase
      .channel(`member-orders-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedOrder = payload.new;
          const previousOrder = payload.old;
          if (updatedOrder) {
            // Update the orders list
            setOrders(prevOrders =>
              prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
            );

            // Fire notification if status changed to a notifiable status
            const statusChanged = previousOrder?.status !== updatedOrder.status;
            if (statusChanged && NOTIFIABLE_STATUSES.includes(updatedOrder.status)) {
              triggerNotification(
                updatedOrder.order_number || updatedOrder.id?.slice(0, 8),
                updatedOrder.status
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, triggerNotification]);

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
                            {order.total_amount} ج.س
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Details */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50/50 space-y-4">
                        {/* Canceled Order Warning */}
                        {order.status === 'ملغي' && (
                          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center text-rose-800 font-bold text-sm my-2 shadow-sm animate-pulse">
                            ❌ نعتذر منك، تم إلغاء/رفض هذا الطلب من قبل الإدارة.
                          </div>
                        )}

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

                        {/* 4x4 Paper Invoice Preview */}
                        <div className="bg-[#FFF7EC] border-2 border-[#F0E1CC] rounded-3xl p-5 sm:p-6 shadow-md max-w-md mx-auto flex flex-col justify-between text-right text-slate-800 relative select-none gap-4" style={{ fontFamily: "'Cairo', sans-serif" }}>
                          
                          {/* Invoice Background Texture/Decor */}
                          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFE3C2]/20 rounded-full blur-xl -z-10" />
                          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-50/30 rounded-full blur-2xl -z-10" />
                          
                          {/* Header */}
                          <div className="flex justify-between items-start gap-4">
                            <div className="text-left">
                              <h4 className="text-xs font-black text-rose-800">🧾 فاتورة شراء</h4>
                              <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-md mt-1 inline-block">
                                #{order.order_number}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <h3 className="font-black text-slate-900 text-xs sm:text-sm">50 فاكهة 🍹</h3>
                                <p className="text-[8px] text-slate-400 font-bold mt-0.5">admin@50fakha.com</p>
                              </div>
                              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-cover rounded-lg border border-slate-100" onError={(e) => { e.target.style.display = 'none'; }} />
                            </div>
                          </div>

                          <div className="border-t border-dashed border-[#F0E1CC] my-1.5" />

                          {/* Metadata */}
                          <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-600">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-400">التاريخ والوقت:</p>
                              <p className="font-extrabold text-slate-800">{formatOrderDate(order.created_at)}</p>
                              <p className="font-bold text-slate-400 mt-1">طريقة الدفع:</p>
                              <p className="font-extrabold text-slate-800">{order.payment_method === 'bank' ? '🏦 تحويل بنكي' : '💵 كاش عند الاستلام'}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-400">العميل:</p>
                              <p className="font-extrabold text-slate-800">{order.customer_name || user?.name || 'عميل المتجر'}</p>
                              <p className="font-bold text-slate-400 mt-1">العنوان:</p>
                              <p className="font-extrabold text-slate-800 truncate" title={order.shipping_address}>{order.shipping_address || '-'}</p>
                            </div>
                          </div>

                          <div className="border-t border-dashed border-[#F0E1CC] my-1.5" />

                          {/* Items Mini-Table */}
                          <div className="space-y-1.5 py-1">
                            {order.items?.map((item, idx) => {
                              const prodImg = getProductImage(item.name);
                              return (
                                <div key={idx} className="flex justify-between items-center bg-white/70 p-2 rounded-xl border border-[#F0E1CC]/65 text-xs">
                                  <span className="font-black text-emerald-700 font-mono text-[11px]">{item.price * item.quantity} ج.س</span>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <span className="font-extrabold text-slate-800 text-[10px] sm:text-[11px]">{item.name}</span>
                                      {item.selectedSize && <span className="text-[8px] text-rose-700 font-bold bg-rose-50 border border-rose-100 px-1 rounded-md mr-1">{item.selectedSize}</span>}
                                      <span className="text-[8px] text-slate-400 font-mono mr-1">({item.quantity}x)</span>
                                    </div>
                                    {prodImg ? (
                                      <img src={prodImg} alt={item.name} className="w-6 h-6 object-cover rounded-md border border-slate-100 flex-shrink-0" />
                                    ) : (
                                      <span className="text-xs">🍹</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="border-t border-dashed border-[#F0E1CC] my-1.5" />

                          {/* Footer and Totals */}
                          <div className="flex justify-between items-end gap-3 mt-0.5">
                            {/* QR Code */}
                            <div className="flex flex-col items-center">
                              <img src="/qr_code.jpg" alt="QR Link" className="w-16 h-16 object-contain rounded-md border border-[#F0E1CC]" onError={(e) => { e.target.src = '/qr_code.jpg'; }} />
                              <span className="text-[7px] text-slate-400 font-bold mt-1">الموقع الرسمي 📲</span>
                            </div>

                            {/* Totals */}
                            <div className="text-left space-y-0.5 text-[9px] sm:text-[10px]">
                              {(() => {
                                const subtotal = order.items?.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity)), 0) || 0;
                                const deliveryFee = order.total_amount - subtotal;
                                return (
                                  <>
                                    <div className="flex justify-between gap-6 text-slate-500">
                                      <span>المجموع الفرعي:</span>
                                      <span className="font-semibold font-mono">{subtotal} ج.س</span>
                                    </div>
                                    <div className="flex justify-between gap-6 text-slate-500">
                                      <span>تكلفة التوصيل:</span>
                                      <span className="font-semibold font-mono">{deliveryFee} ج.س</span>
                                    </div>
                                    <div className="flex justify-between gap-6 text-rose-800 font-black text-[11px] border-t border-dashed pt-1 mt-1">
                                      <span>الإجمالي الكلي:</span>
                                      <span className="text-emerald-700 font-mono font-bold text-xs">{order.total_amount} ج.س</span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Slogan */}
                          <p className="text-[8px] text-[#10B981] font-black text-center mt-2">
                            💚 شكراً لتعاملك مع 50 فاكهة! 💚
                          </p>
                        </div>

                        {/* Download invoice button */}
                        <button
                          onClick={() => downloadMemberInvoice(order)}
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                          style={{ fontFamily: "'Cairo', sans-serif" }}
                        >
                          <span>📥</span> تحميل الفاتورة كصورة (4x4)
                        </button>

                        {/* Delivery address details */}
                        <div className="bg-white p-3 rounded-2xl border border-slate-150 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-700">{order.customer_name || user?.name || 'عميل المتجر'}</span>
                            <span className="text-slate-400">اسم العميل:</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-700 font-mono">{order.customer_phone || order.phone || '-'}</span>
                            <span className="text-slate-400">رقم التواصل:</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-700">{order.shipping_address || `${order.delivery_city || ''} ${order.delivery_neighborhood || ''}`.trim() || '-'}</span>
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

                        {/* WhatsApp Send Button (Only active post-acceptance) */}
                        {order.status !== 'قيد الانتظار' && order.status !== 'ملغي' && (
                          <button
                            onClick={() => sendOrderToWhatsApp(order)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                            style={{ fontFamily: "'Cairo', sans-serif" }}
                          >
                            <span>💬</span> إرسال الفاتورة عبر واتساب
                          </button>
                        )}

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

      {/* ─── Order Status Toast Notification ─────────────────────────────── */}
      {statusToast && (
        <div
          className="fixed top-4 left-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm"
          style={{
            transform: 'translateX(-50%)',
            animation: 'slideDownFade 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
          dir="rtl"
        >
          <style>{`
            @keyframes slideDownFade {
              from { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.95); }
              to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1);    }
            }
            @keyframes shrink {
              from { width: 100%; }
              to   { width: 0%; }
            }
          `}</style>

          <div
            className="rounded-2xl shadow-2xl overflow-hidden border-2"
            style={{ borderColor: statusToast.color, background: '#fff' }}
          >
            {/* Header */}
            <div
              className="px-4 pt-4 pb-3 flex items-start gap-3"
            >
              <span
                className="text-3xl flex-shrink-0 leading-none"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
              >
                {statusToast.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 text-sm leading-snug">
                  {statusToast.title}
                </p>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  {statusToast.body}
                </p>
              </div>
              <button
                onClick={() => setStatusToast(null)}
                className="text-slate-300 hover:text-slate-500 text-lg leading-none flex-shrink-0 mt-0.5"
              >
                ✕
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1" style={{ background: statusToast.color + '22' }}>
              <div
                className="h-full"
                style={{
                  background: statusToast.color,
                  animation: 'shrink 7s linear forwards',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
