import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export default function HomePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_products');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_categories');
      return cached ? JSON.parse(cached) : ['الكل'];
    } catch (e) {
      return ['الكل'];
    }
  });
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [loading, setLoading] = useState(() => products.length === 0);
  const [error, setError] = useState('');
  const { addToCart } = useCart();

  // Product modal state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(0);

  useEffect(() => {
    if (activeCategory === 'الكل') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.category === activeCategory));
    }
  }, [products, activeCategory]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: prodData, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('available', true)
          .order('created_at', { ascending: false });

        if (prodErr) throw prodErr;

        const freshProducts = prodData || [];
        setProducts(freshProducts);
        localStorage.setItem('cached_products', JSON.stringify(freshProducts));

        const { data: catData, error: catErr } = await supabase
          .from('categories')
          .select('name')
          .order('name', { ascending: true });

        if (!catErr && catData && catData.length > 0) {
          const freshCategories = ['الكل', ...catData.map(c => c.name)];
          setCategories(freshCategories);
          localStorage.setItem('cached_categories', JSON.stringify(freshCategories));
        }

        setError('');
      } catch (err) {
        console.error(err);
        if (products.length === 0) {
          setError('تعذر تحميل البيانات. يرجى التأكد من الاتصال بالإنترنت.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // eslint-disable-line

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setSelectedSizeIdx(0);
  };

  const closeModal = () => setSelectedProduct(null);

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const hasSizes = selectedProduct.sizes && selectedProduct.sizes.length > 0;
    if (hasSizes) {
      const sz = selectedProduct.sizes[selectedSizeIdx];
      addToCart(selectedProduct, sz.name, sz.price);
    } else {
      addToCart(selectedProduct);
    }
    closeModal();
  };

  const getModalPrice = () => {
    if (!selectedProduct) return 0;
    const hasSizes = selectedProduct.sizes && selectedProduct.sizes.length > 0;
    if (hasSizes) return selectedProduct.sizes[selectedSizeIdx]?.price ?? 0;
    return selectedProduct.price;
  };

  // Get initials for user avatar
  const getInitials = (name = '') => {
    const parts = name.trim().split(' ');
    return parts.slice(0, 2).map(p => p[0]).join('');
  };

  return (
    <div
      className="flex-1 pb-12"
      style={{ background: '#EFE3CF', fontFamily: "'Tajawal', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;800;900&family=Tajawal:wght@400;500;700&display=swap');

        .fakha-card {
          background: #FFFFFF;
          border-radius: 20px;
          border: 1px solid #F0E1CC;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }
        .fakha-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px -10px rgba(27,19,13,.22);
        }
        .fakha-chip {
          flex: 0 0 auto;
          padding: 8px 18px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          background: #FFFFFF;
          border: 1px solid #F0E1CC;
          color: #6B5C4F;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Cairo', sans-serif;
        }
        .fakha-chip.active {
          background: #1B130D;
          color: #FFF7EC;
          border-color: #1B130D;
        }
        .fakha-chip:hover:not(.active) {
          background: #FFE3C2;
          border-color: #F3760C;
          color: #C95A06;
        }
        .chips-scroll::-webkit-scrollbar { display: none; }
        .modal-slide-up {
          animation: modalSlideUp 0.28s cubic-bezier(.22,1,.36,1);
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .add-btn-small {
          width: 30px; height: 30px;
          border-radius: 10px;
          background: #1B130D;
          color: white;
          border: none;
          font-size: 18px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .add-btn-small:hover { transform: scale(1.08); }
      `}</style>

      {/* ===== HERO ===== */}
      <div className="px-4 sm:px-6 pt-5 max-w-6xl mx-auto">
        <div
          style={{
            background: 'radial-gradient(120% 140% at 100% 0%, #FF9A3D 0%, #F3760C 55%, #C95A06 100%)',
            borderRadius: '26px',
            padding: '24px 22px',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '24px',
          }}
        >
          {/* Deco circle */}
          <div style={{
            position: 'absolute', left: '-30px', bottom: '-40px',
            width: '140px', height: '140px', borderRadius: '50%',
            background: 'rgba(255,255,255,.1)',
            pointerEvents: 'none',
          }} />

          {/* User greeting or brand tagline */}
          <div style={{ fontSize: '11px', letterSpacing: '0.5px', opacity: 0.9, fontWeight: 700, marginBottom: '6px' }}>
            {user ? `أهلاً بك 👋  ${user.name.split(' ')[0]}` : 'عروض اليوم 🔥'}
          </div>

          <h1 style={{
            fontFamily: "'Cairo', sans-serif",
            fontSize: 'clamp(18px, 5vw, 24px)',
            fontWeight: 800,
            lineHeight: 1.4,
            maxWidth: '260px',
            marginBottom: '18px',
          }}>
            اعصر يومك بطعم ٥٠ فاكهة الأصلي
          </h1>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#1B130D', color: '#FFF7EC',
            fontSize: '12px', fontWeight: 700,
            padding: '9px 18px', borderRadius: '999px',
          }}>
            اطلب الآن ←
          </div>

          {/* SVG cup decoration */}
          <svg
            viewBox="0 0 100 130"
            fill="none"
            style={{ position: 'absolute', left: '14px', bottom: '10px', width: '72px', opacity: 0.9, pointerEvents: 'none' }}
          >
            <path d="M22 30h56l-6 80a8 8 0 0 1-8 7H36a8 8 0 0 1-8-7L22 30Z" fill="white" fillOpacity=".18"/>
            <rect x="18" y="22" width="64" height="12" rx="6" fill="white" fillOpacity=".25"/>
            <path d="M60 8 L78 0 M78 0 a6 6 0 0 1 6 6 L84 28" stroke="white" strokeOpacity=".5" strokeWidth="6" strokeLinecap="round" fill="none"/>
          </svg>
        </div>

        {/* ===== CATEGORY CHIPS ===== */}
        <div
          className="chips-scroll"
          style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '20px' }}
        >
          {categories.map((cat) => (
            <div
              key={cat}
              className={`fakha-chip${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </div>
          ))}
        </div>

        {/* ===== SECTION HEADER ===== */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', fontWeight: 800, color: '#1B130D' }}>
            الأكثر طلبًا
          </h2>
          <span style={{ fontSize: '11px', color: '#C95A06', fontWeight: 700 }}>
            {filteredProducts.length} منتج
          </span>
        </div>

        {/* ===== ERROR ===== */}
        {error && (
          <div style={{
            background: '#FBE0DC', border: '1px solid #F3BDB8',
            borderRadius: '18px', padding: '20px', textAlign: 'center',
            marginBottom: '20px', color: '#C95A06',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔌</div>
            <div style={{ fontWeight: 700, marginBottom: '12px' }}>{error}</div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#E14133', color: 'white',
                border: 'none', borderRadius: '12px',
                padding: '8px 20px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* ===== LOADING SKELETON ===== */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} style={{
                background: '#FFFFFF', borderRadius: '20px',
                border: '1px solid #F0E1CC', padding: '10px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                <div style={{ height: '96px', borderRadius: '14px', background: '#F0E1CC', marginBottom: '8px' }} />
                <div style={{ height: '14px', background: '#F0E1CC', borderRadius: '8px', marginBottom: '6px', width: '70%' }} />
                <div style={{ height: '11px', background: '#F0E1CC', borderRadius: '8px', width: '50%' }} />
              </div>
            ))}
          </div>
        )}

        {/* ===== EMPTY STATE ===== */}
        {!loading && !error && filteredProducts.length === 0 && (
          <div style={{
            background: '#FFFFFF', borderRadius: '20px',
            border: '1px solid #F0E1CC', padding: '40px',
            textAlign: 'center', color: '#6B5C4F',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🥣</div>
            <div style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 800, fontSize: '16px', color: '#1B130D', marginBottom: '6px' }}>
              لا توجد منتجات متوفرة
            </div>
            <div style={{ fontSize: '13px' }}>جرب تصفح فئة أخرى أو عد لاحقاً.</div>
          </div>
        )}

        {/* ===== PRODUCT GRID ===== */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}>
            {filteredProducts.map((p) => {
              const hasSizes = p.sizes && p.sizes.length > 0;
              const minPrice = hasSizes ? Math.min(...p.sizes.map(s => s.price)) : p.price;
              return (
                <div
                  key={p.id || p._id}
                  className="fakha-card"
                  onClick={() => p.available && openProductModal(p)}
                >
                  {/* Thumb */}
                  <div style={{ position: 'relative', height: '100px', overflow: 'hidden', background: 'linear-gradient(160deg, #FFE3C2, #FFD39A)' }}>
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>
                        🍹
                      </div>
                    )}
                    {!p.available && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(27,19,13,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{
                          background: '#1B130D', color: '#FFF7EC',
                          padding: '4px 12px', borderRadius: '999px',
                          fontSize: '11px', fontWeight: 700,
                        }}>غير متوفر 🚫</span>
                      </div>
                    )}
                    {p.category && (
                      <span style={{
                        position: 'absolute', top: '6px', right: '6px',
                        background: '#3B7A3E', color: 'white',
                        fontSize: '9px', fontWeight: 700,
                        padding: '3px 8px', borderRadius: '999px',
                      }}>
                        {p.category}
                      </span>
                    )}
                    {hasSizes && (
                      <span style={{
                        position: 'absolute', top: '6px', left: '6px',
                        background: '#F3760C', color: 'white',
                        fontSize: '9px', fontWeight: 700,
                        padding: '3px 8px', borderRadius: '999px',
                      }}>
                        {p.sizes.length} أحجام
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '10px' }}>
                    <div style={{
                      fontFamily: "'Cairo', sans-serif",
                      fontSize: '13px', fontWeight: 700,
                      color: '#1B130D', marginBottom: '2px',
                    }}>
                      {p.name}
                    </div>
                    {p.description && (
                      <div style={{ fontSize: '10.5px', color: '#6B5C4F', marginBottom: '8px', lineHeight: 1.4 }}>
                        {p.description.length > 40 ? p.description.slice(0, 40) + '…' : p.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                      <div>
                        {hasSizes && (
                          <div style={{ fontSize: '9px', color: '#6B5C4F' }}>يبدأ من</div>
                        )}
                        <span style={{
                          fontFamily: "'Cairo', sans-serif",
                          fontWeight: 800, fontSize: '13px', color: '#C95A06',
                        }}>
                          {minPrice} <span style={{ fontSize: '10px', color: '#6B5C4F', fontWeight: 600 }}>ج.س</span>
                        </span>
                      </div>
                      <button
                        className="add-btn-small"
                        onClick={(e) => { e.stopPropagation(); if (p.available) openProductModal(p); }}
                        disabled={!p.available}
                        style={!p.available ? { background: '#F0E1CC', cursor: 'not-allowed' } : {}}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== PRODUCT MODAL ===== */}
      {selectedProduct && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(27,19,13,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 1000, padding: '0',
          }}
          onClick={closeModal}
        >
          <div
            className="modal-slide-up"
            style={{
              background: '#FFF7EC',
              borderRadius: '26px 26px 0 0',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Product image */}
            <div style={{ position: 'relative', height: '220px', flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(160deg, #FFE3C2, #FFD39A)' }}>
              {selectedProduct.image ? (
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px' }}>
                  🍹
                </div>
              )}
              <button
                onClick={closeModal}
                style={{
                  position: 'absolute', top: '12px', left: '12px',
                  background: 'rgba(255,247,236,0.9)', border: 'none',
                  width: '34px', height: '34px', borderRadius: '50%',
                  fontSize: '16px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#1B130D', fontWeight: 800,
                }}
              >
                ✕
              </button>
              {selectedProduct.category && (
                <span style={{
                  position: 'absolute', top: '12px', right: '12px',
                  background: '#3B7A3E', color: 'white',
                  fontSize: '10px', fontWeight: 700,
                  padding: '4px 10px', borderRadius: '999px',
                }}>
                  {selectedProduct.category}
                </span>
              )}
            </div>

            {/* Details */}
            <div style={{ padding: '20px 22px', overflowY: 'auto', textAlign: 'right' }}>
              <div style={{
                fontFamily: "'Cairo', sans-serif",
                fontSize: '20px', fontWeight: 800, color: '#1B130D', marginBottom: '6px',
              }}>
                {selectedProduct.name}
              </div>
              <div style={{ fontSize: '13px', color: '#6B5C4F', marginBottom: '16px', lineHeight: 1.6 }}>
                {selectedProduct.description || 'فواكه طازجة وصحية محضرة يومياً خصيصاً لك.'}
              </div>

              {/* Size Selection */}
              {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1B130D', marginBottom: '10px' }}>
                    اختر الحجم:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedProduct.sizes.map((sz, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSizeIdx(idx)}
                        style={{
                          padding: '10px 16px', borderRadius: '14px',
                          fontWeight: 700, fontSize: '13px',
                          border: selectedSizeIdx === idx ? '2px solid #F3760C' : '2px solid #F0E1CC',
                          background: selectedSizeIdx === idx ? '#F3760C' : '#FFFFFF',
                          color: selectedSizeIdx === idx ? 'white' : '#1B130D',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          fontFamily: "'Cairo', sans-serif",
                        }}
                      >
                        {sz.name}
                        <span style={{
                          display: 'block', fontSize: '11px', marginTop: '2px',
                          opacity: 0.85,
                        }}>
                          {sz.price} ج.س
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price + CTA */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: '16px', borderTop: '1px solid #F0E1CC',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B5C4F' }}>السعر</div>
                  <div style={{
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: '26px', fontWeight: 800, color: '#C95A06',
                  }}>
                    {getModalPrice()} <span style={{ fontSize: '13px', color: '#6B5C4F', fontWeight: 600 }}>ج.س</span>
                  </div>
                </div>
                <button
                  onClick={handleAddToCart}
                  style={{
                    background: '#F3760C', color: 'white',
                    border: 'none', borderRadius: '18px',
                    padding: '14px 28px', fontWeight: 800, fontSize: '14px',
                    cursor: 'pointer', transition: 'transform 0.15s ease',
                    fontFamily: "'Cairo', sans-serif",
                    boxShadow: '0 8px 20px -8px rgba(243, 118, 12, 0.6)',
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.04)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  إضافة للسلة 🛒
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
