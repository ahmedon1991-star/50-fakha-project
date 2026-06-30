import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[250] flex justify-end"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Drawer Panel */}
          <div 
            className="w-72 sm:w-80 h-full bg-[#FFF7EC] p-6 shadow-2xl flex flex-col text-right overflow-y-auto animate-slide-left relative"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
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
              .drawer-link {
                font-family: 'Cairo', sans-serif;
                font-size: 15px;
                font-weight: 800;
                color: #C95A06;
                padding: 10px 0;
                display: block;
                transition: color 0.15s ease, transform 0.15s ease;
                text-decoration: none;
                border-bottom: 1px solid #F0E1CC/30;
              }
              .drawer-link:hover {
                color: #1B130D;
                transform: translateX(-4px);
              }
            `}</style>

            {/* Close Button */}
            <div className="flex justify-between items-center mb-6">
              <button 
                onClick={() => setDrawerOpen(false)}
                className="text-slate-400 hover:text-[#1B130D] text-xl font-bold transition"
              >
                ✕
              </button>
              <span className="font-black text-sm text-[#1B130D]" style={{ fontFamily: "'Cairo', sans-serif" }}>قائمة المستخدم</span>
            </div>

            {/* User Info Header Block */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#F0E1CC]">
              {/* Initials Avatar */}
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-black shadow-md flex-shrink-0"
                style={{ background: 'radial-gradient(circle, #F3760C 0%, #C95A06 100%)' }}
              >
                {getInitials(user.name)}
              </div>
              {/* Text Info */}
              <div className="flex-grow min-w-0">
                <div className="font-black text-base text-[#1B130D] truncate" style={{ fontFamily: "'Cairo', sans-serif" }}>
                  مرحبا {user.name}
                </div>
                {user.phone && (
                  <div className="text-xs text-[#9C7A5A] font-mono mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                    {user.phone}
                  </div>
                )}
                <div className="text-xs text-[#6B5C4F] truncate font-mono mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                  {user.email}
                </div>
              </div>
            </div>

            {/* Menu Links */}
            <div className="flex-grow flex flex-col justify-between">
              <div className="flex flex-col gap-1">
                {/* 1. ملفي الشخصي */}
                <Link to="/profile" onClick={() => setDrawerOpen(false)} className="drawer-link">
                  ملفي الشخصي
                </Link>

                {/* 2. قائمتي المفضلة */}
                <Link to="/products?favorites=true" onClick={() => setDrawerOpen(false)} className="drawer-link">
                  قائمتي المفضلة
                </Link>

                {/* 3. طلباتي السابقة */}
                <Link to="/orders" onClick={() => setDrawerOpen(false)} className="drawer-link">
                  طلباتي السابقة
                </Link>

                {/* 4. الإعدادات */}
                <Link to="/profile" onClick={() => setDrawerOpen(false)} className="drawer-link">
                  الإعدادات
                </Link>

                {/* 5. حذف الحساب */}
                <Link to="/profile" onClick={() => setDrawerOpen(false)} className="drawer-link">
                  حذف الحساب
                </Link>

                {/* 6. دخول الإدارة (Admins only) */}
                {user.isAdmin && (
                  <Link 
                    to="/admin" 
                    onClick={() => setDrawerOpen(false)} 
                    className="drawer-link"
                    style={{ color: '#E14133' }}
                  >
                    🔐 دخول الإدارة
                  </Link>
                )}
              </div>

              {/* Logout Button (Bottom of drawer) */}
              <div className="border-t border-[#F0E1CC] pt-4 mt-6">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2.5 py-3 bg-[#E14133] hover:bg-[#c93024] text-white rounded-xl font-bold transition shadow-sm"
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  <span>🚪</span> تسجيل الخروج
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </nav>
  );
}
