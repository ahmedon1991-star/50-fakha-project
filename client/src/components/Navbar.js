import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export default function Navbar() {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactInfo, setContactInfo] = useState({ phone: '', email: '' });
  const [statusNotification, setStatusNotification] = useState(null);
  const orderStatusCache = useRef({});

  // Custom 0.8s melodic chime (Sine wave double tone)
  const playMelodicChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Note 1 (E5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      // Note 2 (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.12);
      gain2.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.17);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.5);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.7);
    } catch (e) {
      console.error('Audio failed:', e);
    }
  };

  // Realtime subscription for order status updates
  useEffect(() => {
    if (!user) {
      setStatusNotification(null);
      return;
    }

    const channel = supabase
      .channel(`client-order-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newOrder = payload.new;
          if (newOrder) {
            const lastStatus = orderStatusCache.current[newOrder.id];
            if (lastStatus !== undefined && lastStatus === newOrder.status) {
              return;
            }
            orderStatusCache.current[newOrder.id] = newOrder.status;

            playMelodicChime();
            setStatusNotification({
              orderNumber: newOrder.order_number,
              status: newOrder.status,
              id: newOrder.id
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Clear notification after 6 seconds
  useEffect(() => {
    if (statusNotification) {
      const timer = setTimeout(() => {
        setStatusNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [statusNotification]);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('whatsapp_phone, bank_name')
          .eq('id', 2)
          .maybeSingle();
        if (data) {
          setContactInfo({
            phone: data.whatsapp_phone || '',
            email: data.bank_name || ''
          });
        }
      } catch (err) {
        console.error('Error fetching contact info:', err);
      }
    };
    fetchContactInfo();
  }, [showContactModal]);

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    navigate('/login');
  };

  // Get initials for avatar
  const getInitials = (name = '') => {
    const parts = name.trim().split(' ');
    return parts.slice(0, 2).map(p => p[0]).join('');
  };

  return (
    <nav
      style={{ background: '#FFF7EC', borderBottom: '1px solid #F0E1CC' }}
      className="sticky top-0 z-50 shadow-sm"
    >
      <style>{`
        @keyframes slideInUp {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center hover:opacity-90 transition-opacity duration-200">
          <img
            src="/logo.png"
            alt="50 فاكهة"
            className="h-12 w-auto object-contain"
            style={{ maxWidth: '140px' }}
          />
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-3 sm:gap-4">

          {/* Cart Icon */}
          <Link
            to="/cart"
            title="عربة التسوق"
            className="relative p-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center"
            style={{ background: '#FFE3C2' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="#C95A06" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {totalItems > 0 && (
              <span
                className="absolute -top-1 -right-1 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow"
                style={{ background: '#E14133' }}
              >
                {totalItems}
              </span>
            )}
          </Link>

          {/* User Account / Drawer Trigger */}
          {user ? (
            <div>
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 py-2 px-3 rounded-2xl font-bold text-sm transition-all duration-200 border hover:scale-[1.02] active:scale-95"
                style={{ background: '#FFF7EC', borderColor: '#F0E1CC', color: '#1B130D' }}
              >
                {/* Avatar circle with initials */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #F3760C, #E14133)' }}
                >
                  {getInitials(user.name)}
                </div>
                <span
                  className="max-w-[80px] truncate font-bold hidden sm:inline"
                  style={{ fontFamily: "'Cairo', sans-serif", color: '#1B130D' }}
                >
                  {user.name}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#6B5C4F" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="text-xs sm:text-sm font-black px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: '#1B130D', color: '#FFF7EC' }}
            >
              تسجيل الدخول
            </Link>
          )}
        </div>
      </div>

      {/* ─── SLIDING DRAWER MENU ─── */}
      {drawerOpen && user && (
        <div 
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[250] flex justify-end"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Drawer Panel */}
          <div 
            className="w-72 sm:w-80 h-full bg-[#FCFAF7] p-6 shadow-2xl flex flex-col text-right overflow-y-auto animate-slide-left relative border-l border-slate-100"
            style={{ fontFamily: "'Cairo', sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Style tag for animations */}
            <style>{`
              @keyframes slideLeft {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
              .animate-slide-left {
                animation: slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
            `}</style>

            {/* Close Button & Brand Header */}
            <div className="flex justify-between items-center mb-5 pb-1">
              <button 
                onClick={() => setDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-800 text-lg p-2 bg-slate-100 hover:bg-slate-200/80 rounded-full transition duration-150 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
              <span className="font-extrabold text-sm text-[#1B130D]" style={{ fontFamily: "'Cairo', sans-serif" }}>قائمة المستخدم</span>
            </div>

            {/* User Info Header Card */}
            <div className="bg-white/80 border border-amber-100/50 shadow-xs p-4 rounded-2xl flex items-center gap-3.5 mb-6 text-right">
              {/* Text Info */}
              <div className="flex-grow min-w-0">
                <div className="font-black text-sm text-[#1B130D] truncate" style={{ fontFamily: "'Cairo', sans-serif" }}>
                  مرحبا {user.name}
                </div>
                {user.phone && (
                  <div className="text-[11px] text-[#9C7A5A] font-bold font-mono mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                    {user.phone}
                  </div>
                )}
                <div className="text-[10px] text-[#6B5C4F] truncate font-mono mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                  {user.email}
                </div>
              </div>

              {/* Initials Avatar */}
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-base font-black shadow-sm flex-shrink-0 border-3 border-amber-50"
                style={{ background: 'radial-gradient(circle, #F3760C 0%, #C95A06 100%)' }}
              >
                {getInitials(user.name)}
              </div>
            </div>

            {/* Menu Links */}
            <div className="flex-grow flex flex-col justify-between">
              {/* Vertical Options List */}
              <div className="flex flex-col gap-3">
                {/* 1. ملفي الشخصي */}
                <Link 
                  to="/profile" 
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-amber-50/40 border border-slate-100/80 rounded-2xl shadow-xs transition duration-200 group text-decoration-none"
                >
                  <span className="text-slate-400 font-bold transition group-hover:-translate-x-0.5">‹</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs sm:text-sm text-slate-700 group-hover:text-slate-900" style={{ fontFamily: "'Cairo', sans-serif" }}>ملفي الشخصي</span>
                    <span className="text-base text-[#F3760C] transition group-hover:scale-110 flex-shrink-0">👤</span>
                  </div>
                </Link>

                {/* 2. قائمتي المفضلة */}
                <Link 
                  to="/products?favorites=true" 
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-amber-50/40 border border-slate-100/80 rounded-2xl shadow-xs transition duration-200 group text-decoration-none"
                >
                  <span className="text-slate-400 font-bold transition group-hover:-translate-x-0.5">‹</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs sm:text-sm text-slate-700 group-hover:text-slate-900" style={{ fontFamily: "'Cairo', sans-serif" }}>قائمتي المفضلة</span>
                    <span className="text-base text-[#F3760C] transition group-hover:scale-110 flex-shrink-0">❤️</span>
                  </div>
                </Link>

                {/* 3. طلباتي السابقة */}
                <Link 
                  to="/orders" 
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-amber-50/40 border border-slate-100/80 rounded-2xl shadow-xs transition duration-200 group text-decoration-none"
                >
                  <span className="text-slate-400 font-bold transition group-hover:-translate-x-0.5">‹</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs sm:text-sm text-slate-700 group-hover:text-slate-900" style={{ fontFamily: "'Cairo', sans-serif" }}>طلباتي السابقة</span>
                    <span className="text-base text-[#F3760C] transition group-hover:scale-110 flex-shrink-0">📦</span>
                  </div>
                </Link>

                {/* 4. الإعدادات */}
                <Link 
                  to="/profile" 
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-amber-50/40 border border-slate-100/80 rounded-2xl shadow-xs transition duration-200 group text-decoration-none"
                >
                  <span className="text-slate-400 font-bold transition group-hover:-translate-x-0.5">‹</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs sm:text-sm text-slate-700 group-hover:text-slate-900" style={{ fontFamily: "'Cairo', sans-serif" }}>الإعدادات</span>
                    <span className="text-base text-[#F3760C] transition group-hover:scale-110 flex-shrink-0">⚙️</span>
                  </div>
                </Link>

                {/* 5. تواصل معنا */}
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    setShowContactModal(true);
                  }}
                  className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-amber-50/40 border border-slate-100/80 rounded-2xl shadow-xs transition duration-200 group text-right cursor-pointer"
                >
                  <span className="text-slate-400 font-bold transition group-hover:-translate-x-0.5">‹</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs sm:text-sm text-slate-700 group-hover:text-slate-900" style={{ fontFamily: "'Cairo', sans-serif" }}>تواصل معنا</span>
                    <span className="text-base text-[#F3760C] transition group-hover:scale-110 flex-shrink-0">📞</span>
                  </div>
                </button>

                {/* 6. دخول الإدارة (Admin Panel Access Card) */}
                {user.isAdmin && (
                  <Link 
                    to="/admin" 
                    onClick={() => setDrawerOpen(false)}
                    className="w-full flex items-center justify-between p-3.5 bg-amber-50/30 hover:bg-amber-50/60 border border-amber-200 rounded-2xl shadow-xs transition duration-200 group text-decoration-none"
                  >
                    <span className="text-amber-500 font-bold transition group-hover:-translate-x-0.5">‹</span>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-xs sm:text-sm text-amber-900" style={{ fontFamily: "'Cairo', sans-serif" }}>دخول الإدارة</span>
                      <span className="text-base text-amber-600 transition group-hover:scale-110 flex-shrink-0">🔐</span>
                    </div>
                  </Link>
                )}
              </div>

              {/* Logout Button (Styled in red at the very bottom of the drawer) */}
              <div className="border-t border-slate-200/80 pt-4 mt-6">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-2xl font-bold transition shadow-xs cursor-pointer"
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  <span>🚪</span> تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONTACT US MODAL ─── */}
      {showContactModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" 
          style={{ zIndex: 300 }}
          onClick={() => setShowContactModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full overflow-hidden text-right transform scale-100 transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-800 text-white p-5 flex justify-between items-center">
              <h3 className="text-lg font-black" style={{ fontFamily: "'Cairo', sans-serif" }}>📞 تواصل معنا</h3>
              <button 
                onClick={() => setShowContactModal(false)}
                className="text-emerald-100 hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <p className="text-xs text-slate-400 font-bold text-center">
                يسعدنا دائماً تواصلكم معنا والإجابة على استفساراتكم
              </p>

              <div className="space-y-4">
                {/* Phone Card */}
                {contactInfo.phone && (
                  <a 
                    href={`tel:${contactInfo.phone}`}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl border border-slate-100 transition duration-150 text-right text-decoration-none block"
                  >
                    <span className="text-xs text-emerald-600 font-bold">اتصال 📞</span>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold block">رقم الهاتف</span>
                        <span className="text-sm font-black text-slate-800 mt-0.5 block font-mono" dir="ltr">
                          {contactInfo.phone}
                        </span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-base">
                        📞
                      </div>
                    </div>
                  </a>
                )}

                {/* Email Card */}
                {contactInfo.email && (
                  <a 
                    href={`mailto:${contactInfo.email}`}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-100 transition duration-150 text-right text-decoration-none block"
                  >
                    <span className="text-xs text-blue-600 font-bold">إرسال ✉️</span>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold block">البريد الإلكتروني</span>
                        <span className="text-sm font-black text-slate-800 mt-0.5 block font-mono">
                          {contactInfo.email}
                        </span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-650 text-base">
                        ✉️
                      </div>
                    </div>
                  </a>
                )}

                {/* WhatsApp Chat Option */}
                {contactInfo.phone && (
                  <a 
                    href={`https://wa.me/${contactInfo.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-green-50/50 rounded-2xl border border-slate-100 transition duration-150 text-right text-decoration-none block"
                  >
                    <span className="text-xs text-green-600 font-bold">دردشة 💬</span>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold block">واتساب</span>
                        <span className="text-sm font-black text-slate-800 mt-0.5 block">المحادثة الفورية</span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center text-green-600 text-base">
                        💬
                      </div>
                    </div>
                  </a>
                )}

                {!contactInfo.phone && !contactInfo.email && (
                  <div className="text-center py-6 text-slate-400">
                    <span className="text-3xl block mb-2">📭</span>
                    <p className="text-xs font-bold">لم تقم الإدارة بإضافة معلومات التواصل بعد</p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowContactModal(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition duration-150 text-xs text-center"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── LIVE ORDER STATUS TOAST ─── */}
      {statusNotification && (
        <div 
          className="fixed top-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-105 p-4 z-[9999] flex items-center justify-between gap-4 animate-slide-up"
          dir="rtl"
        >
          <div className="flex items-center gap-3 text-right">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-lg flex-shrink-0 animate-bounce">
              🔔
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-800" style={{ fontFamily: "'Cairo', sans-serif" }}>
                تحديث حالة الطلب
              </h4>
              <p className="text-xs text-slate-650 mt-1 font-medium leading-relaxed">
                طلبك رقم <span className="font-mono font-bold text-orange-600">#{statusNotification.orderNumber}</span> أصبح الآن:
                <span className="font-bold text-slate-855 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 mr-1.5 inline-block">
                  {statusNotification.status}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/orders"
              onClick={() => setStatusNotification(null)}
              className="text-xs font-black text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100/80 px-3 py-2 rounded-xl transition text-decoration-none"
              style={{ fontFamily: "'Cairo', sans-serif" }}
            >
              تتبع 🗺️
            </Link>
            <button
              onClick={() => setStatusNotification(null)}
              className="text-slate-450 hover:text-slate-700 text-lg font-bold p-1 leading-none transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
