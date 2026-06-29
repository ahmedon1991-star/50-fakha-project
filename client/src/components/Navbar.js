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
          <Link to="/cart" className="relative p-2 rounded-full hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center">
            <span className="text-xl sm:text-2xl">🛒</span>
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] sm:text-xs font-black rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center animate-pulse shadow">
                {totalItems}
              </span>
            )}
          </Link>

          {/* User Account Dropdown */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded-xl shadow-inner transition flex items-center gap-1.5 border border-emerald-500/25"
              >
                <span>👤</span>
                <span className="max-w-[70px] sm:max-w-[120px] truncate hidden xs:inline">{user.name}</span>
                <span className="text-[10px] opacity-75">▼</span>
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
