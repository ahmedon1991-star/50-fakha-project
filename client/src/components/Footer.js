import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer
      style={{
        background: '#1B130D',
        borderTop: '1px solid #2D1E14',
        padding: '32px 16px 24px',
        textAlign: 'center',
        fontFamily: "'Tajawal', sans-serif",
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Logo area */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          <img
            src="/logo.png"
            alt="50 فاكهة"
            style={{ height: '50px', width: 'auto', objectFit: 'contain', opacity: 0.92 }}
          />
        </div>

        {/* Tagline */}
        <p style={{ color: '#C8A87A', fontSize: '12px', marginBottom: '16px', lineHeight: 1.6 }}>
          أجود أنواع العصائر الطبيعية وسلطات الفواكه الطازجة يومياً
        </p>

        {/* Address */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#9C7A5A', fontSize: '12px', marginBottom: '20px' }}>
          <span>📍</span>
          <span>السودان — الولاية الشمالية — دنقلا</span>
        </div>

        {/* Divider */}
        <div style={{ width: '40px', height: '2px', background: '#2D1E14', borderRadius: '999px', margin: '0 auto 16px' }} />

        {/* Legal Links */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
          <Link
            to="/privacy"
            style={{ color: '#9C7A5A', fontSize: '11px', fontWeight: 700, textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.color = '#F3760C'}
            onMouseOut={e => e.currentTarget.style.color = '#9C7A5A'}
          >
            سياسة الخصوصية
          </Link>
          <span style={{ color: '#2D1E14', fontSize: '10px' }}>•</span>
          <Link
            to="/terms"
            style={{ color: '#9C7A5A', fontSize: '11px', fontWeight: 700, textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.color = '#F3760C'}
            onMouseOut={e => e.currentTarget.style.color = '#9C7A5A'}
          >
            الشروط والأحكام
          </Link>
        </div>

        {/* Copyright */}
        <p style={{ color: '#4A3020', fontSize: '11px', fontWeight: 600 }}>
          &copy; {new Date().getFullYear()} جميع الحقوق محفوظة لمتجر 50 فاكهة
        </p>
      </div>
    </footer>
  );
}
