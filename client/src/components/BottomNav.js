import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function BottomNav() {
  const { totalItems } = useCart();
  const location = useLocation();
  const path = location.pathname;

  const active = '#F3760C';
  const inactive = '#9C7A5A';

  const tabs = [
    {
      label: 'الرئيسية',
      to: '/',
      isActive: path === '/',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
          <path d="M3 9.75L12 3l9 6.75V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.75z" />
          <path d="M9 22V12h6v10" />
        </svg>
      ),
    },
    {
      label: 'منتجاتنا',
      to: '/?cat=all',
      isActive: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a5 5 0 0 1 5 5c0 2-1 3.5-3 4.5S12 14 12 16" />
          <path d="M8 7c0-1 .8-2 2-2.5" />
          <circle cx="12" cy="20" r="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'عربة التسوق',
      to: '/cart',
      isActive: path === '/cart',
      badge: totalItems > 0 ? totalItems : null,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      label: 'المفضلة',
      to: '/profile',
      isActive: path === '/profile',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, right: 0, left: 0,
        background: '#FFF7EC',
        borderTop: '1px solid #F0E1CC',
        display: 'flex', justifyContent: 'space-around',
        padding: '10px 8px 20px',
        zIndex: 100,
        fontFamily: "'Tajawal', sans-serif",
      }}
      className="md:hidden"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          to={tab.to}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            color: tab.isActive ? active : inactive,
            fontSize: '10px', fontWeight: 700,
            textDecoration: 'none',
            position: 'relative',
          }}
        >
          {tab.badge && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-2px',
              background: '#E14133', color: 'white',
              fontSize: '8.5px', fontWeight: 800,
              width: '15px', height: '15px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #FFF7EC',
            }}>
              {tab.badge}
            </span>
          )}
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
