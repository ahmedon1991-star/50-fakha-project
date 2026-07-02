import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const STYLE = {
  bg: { background: '#EFE3CF', fontFamily: "'Tajawal', sans-serif" },
  card: {
    background: '#FFF7EC',
    border: '1px solid #F0E1CC',
    borderRadius: '26px',
    padding: '32px 28px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 18px 40px -18px rgba(27,19,13,.2)',
  },
  label: { display: 'block', fontWeight: 700, fontSize: '13px', color: '#1B130D', marginBottom: '8px' },
  input: {
    width: '100%', padding: '12px 16px', borderRadius: '14px',
    border: '1.5px solid #F0E1CC', background: '#FFFFFF',
    fontSize: '14px', color: '#1B130D', outline: 'none',
    boxSizing: 'border-box', fontFamily: "'Tajawal', sans-serif",
    transition: 'border-color 0.2s',
  },
  btn: {
    width: '100%', padding: '14px', borderRadius: '16px',
    background: '#F3760C', color: 'white', border: 'none',
    fontWeight: 800, fontSize: '15px', cursor: 'pointer',
    fontFamily: "'Cairo', sans-serif",
    boxShadow: '0 8px 20px -8px rgba(243, 118, 12, 0.5)',
    transition: 'transform 0.15s ease, background 0.2s ease',
  },
  btnDisabled: {
    background: '#FBBB82', cursor: 'not-allowed',
    boxShadow: 'none',
  },
  error: {
    background: '#FBE0DC', border: '1.5px solid #F3BDB8',
    borderRadius: '14px', padding: '10px 14px',
    color: '#C95A06', fontSize: '13px', fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: '8px',
    marginBottom: '20px',
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
      const loginData = await login(email, password);
      
      const sessionUser = loginData?.user;
      if (sessionUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', sessionUser.id)
          .single();
        if (profile?.is_admin) {
          navigate('/admin');
          return;
        }
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex-1 flex items-center justify-center p-6 pb-36 lg:pb-6"
      style={STYLE.bg}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Tajawal:wght@400;500;700&display=swap');
        .fakha-input:focus { border-color: #F3760C !important; box-shadow: 0 0 0 3px rgba(243,118,12,0.12); }
        .fakha-btn-primary:hover:not(:disabled) { transform: scale(1.02); background: #C95A06 !important; }
      `}</style>

      <div style={STYLE.card}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/logo.png" alt="50 فاكهة" style={{ height: '60px', width: 'auto', objectFit: 'contain', margin: '0 auto' }} />
          <h2 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '22px', fontWeight: 800, color: '#1B130D', marginTop: '12px' }}>
            تسجيل الدخول
          </h2>
          <p style={{ color: '#6B5C4F', fontSize: '13px', marginTop: '4px' }}>مرحباً بك مجدداً في 50 فاكهة</p>
        </div>

        {/* Error */}
        {error && (
          <div style={STYLE.error} id="error-alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={STYLE.label}>البريد الإلكتروني</label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={{ ...STYLE.input, direction: 'ltr', textAlign: 'left' }}
              className="fakha-input"
            />
          </div>

          <div>
            <label style={STYLE.label}>كلمة المرور</label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ ...STYLE.input, direction: 'ltr', textAlign: 'left' }}
              className="fakha-input"
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#6B5C4F', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#F3760C', cursor: 'pointer' }}
            />
            تذكرني على هذا الجهاز 💾
          </label>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={{ ...STYLE.btn, ...(loading ? STYLE.btnDisabled : {}) }}
            className="fakha-btn-primary"
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  border: '2.5px solid rgba(255,255,255,0.4)',
                  borderTopColor: 'white',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }} />
                جاري التحميل...
              </span>
            ) : 'دخول 🔓'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#6B5C4F' }}>
          ليس لديك حساب؟{' '}
          <Link to="/register" style={{ color: '#F3760C', fontWeight: 800, textDecoration: 'none' }}>
            أنشئ حسابك الآن
          </Link>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
