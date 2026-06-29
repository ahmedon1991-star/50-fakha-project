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

  return (
    <nav className="bg-emerald-600 text-white shadow-md sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center relative">
        {/* Brand Logo */}
        <Link to="/" className="text-xl sm:text-2xl font-extrabold flex items-center gap-1.5 hover:scale-102 transition-transform duration-200 whitespace-nowrap">
          <span>🍓</span>
          <span className="bg-gradient-to-r from-yellow-300 to-amber-300 bg-clip-text text-transparent whitespace-nowrap font-black">50 فاكهة</span>
        </Link>
        
        {/* Navigation Links */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Cart Icon */}
          <Link to="/cart" className="relative p-2 rounded-full hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center" title="عربة التسوق">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-rose-550 text-white text-[10px] sm:text-xs font-black rounded-full w-4.5 h-4.5 sm:w-5 sm:h-5 flex items-center justify-center animate-pulse shadow-md border border-white/20">
                {totalItems}
              </span>
            )}
          </Link>

          {/* User Account Dropdown */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded-xl shadow-inner transition flex items-center gap-2 border border-emerald-500/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4.5 h-4.5 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span className="max-w-[70px] sm:max-w-[120px] truncate hidden xs:inline">{user.name}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-white opacity-80">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Floating Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 text-right py-2 text-slate-800 overflow-hidden animate-fadeIn z-50">
                  <div className="px-4 py-2 border-b border-slate-100 text-slate-400 text-[10px] font-bold">
                    حسابي الشخصي
                  </div>
                  
                  {user.isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-emerald-950 font-bold transition"
                    >
                      <span>⚙️</span> لوحة التحكم
                    </Link>
                  )}

                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700 font-semibold transition"
                  >
                    <span>👤</span> تعديل الملف
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-rose-50 text-rose-600 font-bold transition border-t border-slate-100"
                  >
                    <span>🚪</span> تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link 
              to="/login" 
              className="bg-yellow-400 hover:bg-yellow-500 text-emerald-950 text-xs sm:text-sm font-black px-4 py-2 rounded-xl shadow transition duration-200"
            >
              تسجيل الدخول
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
