import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', { name, email, password });
      login(response.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-emerald-100/50 transition-all duration-300">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-2">🍊</span>
          <h2 className="text-3xl font-extrabold text-emerald-950">إنشاء حساب</h2>
          <p className="text-slate-500 mt-2 text-sm">سجل حساباً لتتمكن من الطلب وتتبع طلباتك</p>
        </div>

        {error && (
          <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-700 p-3 rounded-lg mb-6 text-sm flex items-center gap-2" id="register-error-alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-700 font-semibold mb-2 text-sm">الاسم الكامل</label>
            <input
              id="register-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="احمد علي"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-2 text-sm">البريد الإلكتروني</label>
            <input
              id="register-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-right"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-2 text-sm">كلمة المرور</label>
            <input
              id="register-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-right"
              dir="ltr"
            />
          </div>

          <button
            id="register-submit"
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 ${
              loading 
                ? 'bg-emerald-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01]'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                جاري التحميل...
              </span>
            ) : (
              'تسجيل الحساب 🚀'
            )}
          </button>
        </form>

        <div className="text-center mt-6 text-slate-500 text-sm">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="text-emerald-600 font-bold hover:underline">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
