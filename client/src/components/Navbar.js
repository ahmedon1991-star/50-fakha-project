import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/login');
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

          {/* User Account Dropdown */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 py-2 px-3 rounded-2xl font-bold text-sm transition-all duration-200 border"
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

              {/* Floating Dropdown Menu */}
              {dropdownOpen && (
                <div
                  className="absolute left-0 mt-2 w-52 rounded-2xl shadow-xl border text-right py-2 overflow-hidden z-50"
                  style={{ background: '#FFF7EC', borderColor: '#F0E1CC' }}
                >
                  {/* User info header */}
                  <div className="px-4 py-3 border-b" style={{ borderColor: '#F0E1CC' }}>
                    <div className="font-black text-sm" style={{ fontFamily: "'Cairo', sans-serif", color: '#1B130D' }}>{user.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#6B5C4F' }}>حسابي الشخصي</div>
                  </div>

                  {user.isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-orange-50"
                      style={{ color: '#1B130D' }}
                    >
                      <span className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: '#FFE3C2', color: '#C95A06' }}>⚙️</span>
                      لوحة التحكم
                      <span className="mr-auto text-xs" style={{ color: '#6B5C4F' }}>‹</span>
                    </Link>
                  )}

                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-orange-50"
                    style={{ color: '#1B130D' }}
                  >
                    <span className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: '#FFE3C2', color: '#C95A06' }}>👤</span>
                    ملفي الشخصي
                    <span className="mr-auto text-xs" style={{ color: '#6B5C4F' }}>‹</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-red-50 border-t"
                    style={{ color: '#E14133', borderColor: '#F0E1CC' }}
                  >
                    <span className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: '#FBE0DC', color: '#E14133' }}>🚪</span>
                    تسجيل الخروج
                  </button>
                </div>
              )}
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
    </nav>
  );
}
