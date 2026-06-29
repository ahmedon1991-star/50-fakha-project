import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
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
      const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      
      // Crucial: Check if user is an admin
      if (!response.data.isAdmin) {
        setError('عذراً، هذا الحساب لا يمتلك صلاحيات المدير (Admin)');
        return;
      }

      login(response.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-slate-700/50 text-white space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-5xl block">🔑</span>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-yellow-300">
            لوحة تحكم المدير
          </h2>
          <p className="text-slate-400 text-sm">أدخل بياناتك لإدارة مطعم 50 فاكهة</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/80 border-r-4 border-rose-500 text-rose-200 p-3 rounded-lg text-sm flex items-center gap-2" id="admin-login-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-300 font-semibold mb-2 text-sm">البريد الإلكتروني للادارة</label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@50fakha.com"
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-right"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2 text-sm">كلمة المرور</label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-right"
              dir="ltr"
            />
          </div>

          <button
            id="admin-login-submit"
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl text-slate-950 font-extrabold text-lg shadow-lg transition-all duration-200 ${
              loading 
                ? 'bg-emerald-500/50 cursor-not-allowed text-slate-400' 
                : 'bg-emerald-400 hover:bg-emerald-300 hover:scale-[1.01]'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                جاري تسجيل الدخول...
              </span>
            ) : (
              'دخول لوحة التحكم 🔓'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
