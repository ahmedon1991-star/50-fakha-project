import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-emerald-600 text-white shadow-md sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Brand Logo */}
        <Link to="/" className="text-2xl font-extrabold flex items-center gap-2 hover:scale-105 transition-transform duration-200">
          <span>🍓</span>
          <span className="bg-gradient-to-r from-yellow-300 to-amber-300 bg-clip-text text-transparent">50 فاكهة</span>
        </Link>
        
        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          {/* Cart Icon */}
          <Link to="/cart" className="relative p-2 rounded-full hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center">
            <span className="text-2xl">🛒</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {totalItems}
              </span>
            )}
          </Link>

          {/* User Account Actions */}
          {user ? (
            <div className="flex items-center gap-4">
              {user.isAdmin && (
                <Link 
                  to="/admin" 
                  className="bg-yellow-400 hover:bg-yellow-500 text-emerald-950 text-sm font-bold px-3 py-2 rounded-lg shadow hover:shadow-lg transition-all duration-200"
                >
                  لوحة التحكم ⚙️
                </Link>
              )}
              <Link 
                to="/profile" 
                className="bg-emerald-700 hover:bg-emerald-800 text-emerald-100 text-sm font-bold px-4 py-2 rounded-lg shadow hover:shadow-lg transition-all duration-200"
              >
                حسابي 👤
              </Link>
              <button 
                onClick={handleLogout} 
                className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow hover:shadow-lg transition-all duration-200"
              >
                تسجيل الخروج
              </button>
            </div>
          ) : (
            <Link 
              to="/login" 
              className="bg-yellow-400 hover:bg-yellow-500 text-emerald-950 text-sm font-bold px-4 py-2 rounded-lg shadow hover:shadow-lg transition-all duration-200"
            >
              تسجيل الدخول
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
