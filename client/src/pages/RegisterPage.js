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
    maxWidth: '440px',
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
    marginBottom: '16px',
  },
};

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone.startsWith('+')) {
      setError('يرجى كتابة رقم الهاتف بصيغة دولية تبدأ بـ + (مثال: +249912345678)');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if the phone number is already registered in profiles
      const { data: existingPhone, error: phoneCheckErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone.trim())
        .maybeSingle();

      if (phoneCheckErr) {
        console.warn('Phone validation check error:', phoneCheckErr);
      }

      if (existingPhone) {
        setError('عذراً، رقم الهاتف هذا مسجل بالفعل لحساب آخر. يرجى استخدام رقم هاتف مختلف أو تسجيل الدخول 🚫');
        setLoading(false);
        return;
      }

      // 2. Perform Supabase Sign Up
      await register(name, email, phone.trim(), password);
      localStorage.setItem('show_welcome_free_delivery', 'true');
      navigate('/');
    } catch (err) {
      let errMsg = err.message || '';
      if (errMsg.toLowerCase().includes('user already registered') || 
          errMsg.toLowerCase().includes('email already exists') || 
          errMsg.toLowerCase().includes('already registered')) {
        setError('عذراً، هذا البريد الإلكتروني مسجل بالفعل لحساب آخر. يرجى استخدام بريد مختلف أو تسجيل الدخول 🚫');
      } else if (errMsg.toLowerCase().includes('phone number') || errMsg.toLowerCase().includes('phone')) {
        setError('عذراً، رقم الهاتف هذا مسجل بالفعل لحساب آخر. يرجى استخدام رقم هاتف مختلف 🚫');
      } else {
        setError(errMsg || 'حدث خطأ أثناء إنشاء الحساب. يرجى مراجعة البيانات والمحاولة مرة أخرى.');
      }
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
            إنشاء حساب جديد
          </h2>
          <p style={{ color: '#6B5C4F', fontSize: '13px', marginTop: '4px' }}>سجل لتتمكن من الطلب وتتبع طلباتك</p>
        </div>

        {/* Error */}
        {error && (
          <div style={STYLE.error} id="register-error-alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={STYLE.label}>الاسم الكامل</label>
            <input
              id="register-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أحمد علي"
              style={STYLE.input}
              className="fakha-input"
            />
          </div>

          <div>
            <label style={STYLE.label}>البريد الإلكتروني</label>
            <input
              id="register-email"
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
            <label style={STYLE.label}>رقم الهاتف (بصيغة دولية)</label>
            <input
              id="register-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+249912345678"
              style={{ ...STYLE.input, direction: 'ltr', textAlign: 'left' }}
              className="fakha-input"
            />
            <span style={{ fontSize: '11px', color: '#9C7A5A', display: 'block', marginTop: '4px', textAlign: 'right' }}>
              يجب كتابة رمز الدولة أولاً (مثال: +249 للسودان)
            </span>
          </div>

          <div>
            <label style={STYLE.label}>كلمة المرور</label>
            <input
              id="register-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ ...STYLE.input, direction: 'ltr', textAlign: 'left' }}
              className="fakha-input"
            />
          </div>

          <button
            id="register-submit"
            type="submit"
            disabled={loading}
            style={{ ...STYLE.btn, marginTop: '6px', ...(loading ? STYLE.btnDisabled : {}) }}
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
                جاري التسجيل...
              </span>
            ) : 'تسجيل الحساب 🚀'}
          </button>
        </form>

        {/* Consent */}
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#9C7A5A', marginTop: '14px', lineHeight: 1.6 }}>
          بالتسجيل، أنت توافق على{' '}
          <Link to="/terms" style={{ color: '#F3760C', textDecoration: 'underline' }}>الشروط والأحكام</Link>
          {' '}و{' '}
          <Link to="/privacy" style={{ color: '#F3760C', textDecoration: 'underline' }}>سياسة الخصوصية</Link>
          {' '}الخاصة بنا.
        </p>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#6B5C4F' }}>
          لديك حساب بالفعل؟{' '}
          <Link to="/login" style={{ color: '#F3760C', fontWeight: 800, textDecoration: 'none' }}>
            تسجيل الدخول
          </Link>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
