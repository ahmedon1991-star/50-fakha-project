import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

// Emoji fallback map by category name
const CATEGORY_EMOJI = {
  'عصائر طازجة': '🍊',
  'سلطات فواكه': '🍉',
  'سلطة فواكه': '🍉',
  'سموذي': '🍓',
  'بابل تي': '🧋',
  'حلويات': '🍮',
  'أخرى': '🍹',
};

function getProductEmoji(product) {
  const name = (product.name || '').toLowerCase();
  if (name.includes('برتقال') || name.includes('orange')) return '🍊';
  if (name.includes('مانجو') || name.includes('mango')) return '🥭';
  if (name.includes('فراولة') || name.includes('strawberry')) return '🍓';
  if (name.includes('موز') || name.includes('banana')) return '🍌';
  if (name.includes('بطيخ') || name.includes('watermelon')) return '🍉';
  if (name.includes('بابل') || name.includes('bubble')) return '🧋';
  if (name.includes('سموذي') || name.includes('smoothie')) return '🥤';
  if (name.includes('تفاح') || name.includes('apple')) return '🍎';
  if (name.includes('عنب') || name.includes('grape')) return '🍇';
  if (name.includes('ليمون') || name.includes('lemon')) return '🍋';
  if (name.includes('رمان') || name.includes('pomegranate')) return '🍎';
  if (name.includes('خوخ') || name.includes('peach')) return '🍑';
  return CATEGORY_EMOJI[product.category] || '🍹';
}

export default function HomePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_products');
      return cached ? JSON.parse(cached) : [];
    } catch (e) { return []; }
  });
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_categories');
      return cached ? JSON.parse(cached) : ['الكل'];
    } catch (e) { return ['الكل']; }
  });
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [loading, setLoading] = useState(() => products.length === 0);
  const [error, setError] = useState('');
  const { addToCart } = useCart();

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
          .from('products').select('*').eq('available', true)
          .order('created_at', { ascending: false });
        if (prodErr) throw prodErr;
        const freshProducts = prodData || [];
        setProducts(freshProducts);
        localStorage.setItem('cached_products', JSON.stringify(freshProducts));

        const { data: catData, error: catErr } = await supabase
          .from('categories').select('name').order('name', { ascending: true });
        if (!catErr && catData && catData.length > 0) {
          const freshCategories = ['الكل', ...catData.map(c => c.name)];
          setCategories(freshCategories);
          localStorage.setItem('cached_categories', JSON.stringify(freshCategories));
        }
        setError('');
      } catch (err) {
        console.error(err);
        if (products.length === 0) setError('تعذر تحميل البيانات. تأكد من الاتصال.');
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

  return (
    <div
      style={{
        background: '#EFE3CF',
        fontFamily: "'Tajawal', sans-serif",
        minHeight: '100%',
        paddingBottom: '90px', // space for bottom nav on mobile
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;800;900&family=Tajawal:wght@400;500;700&display=swap');
        .chip-scroll::-webkit-scrollbar { display: none; }
        .product-card {
          background: #FFFFFF;
          border-radius: 20px;
          border: 1px solid #F0E1CC;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px -10px rgba(27,19,13,.2);
        }
        .add-circle {
          width: 34px; height: 34px;
          background: #1B130D;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 20px; font-weight: 700;
          border: none; cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.15s ease;
        }
        .add-circle:hover { transform: scale(1.1); }
        .modal-sheet {
          animation: sheetUp 0.3s cubic-bezier(.22,1,.36,1);
        }
        @keyframes sheetUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse-load {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* ─── HERO BANNER ─── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: 'radial-gradient(120% 140% at 100% 0%, #FF9A3D 0%, #F3760C 55%, #C95A06 100%)',
          borderRadius: '22px',
          padding: '20px 20px 20px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '16px',
        }}>
          <div style={{ position: 'absolute', left: '-20px', bottom: '-35px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,.1)', pointerEvents: 'none' }} />
          <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.9, marginBottom: '6px' }}>
            {user ? `أهلاً بك 👋 ${user.name.split(' ')[0]}` : 'عروض اليوم 🔥'}
          </div>
          <h1 style={{
            fontFamily: "'Cairo', sans-serif",
            fontSize: 'clamp(16px, 4.5vw, 22px)',
            fontWeight: 800, lineHeight: 1.45,
            maxWidth: '220px', marginBottom: '16px',
          }}>
            اعصر يومك بطعم ٥٠ فاكهة الأصلي
          </h1>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#1B130D', color: '#FFF7EC',
            fontSize: '12px', fontWeight: 700,
            padding: '8px 16px', borderRadius: '999px',
          }}>
            اطلب الآن ←
          </div>
          {/* SVG cup */}
          <svg viewBox="0 0 100 130" fill="none" style={{ position: 'absolute', left: '12px', bottom: '8px', width: '66px', opacity: 0.88, pointerEvents: 'none' }}>
            <path d="M22 30h56l-6 80a8 8 0 0 1-8 7H36a8 8 0 0 1-8-7L22 30Z" fill="white" fillOpacity=".18"/>
            <rect x="18" y="22" width="64" height="12" rx="6" fill="white" fillOpacity=".25"/>
            <path d="M60 8 L78 0 M78 0 a6 6 0 0 1 6 6 L84 28" stroke="white" strokeOpacity=".5" strokeWidth="6" strokeLinecap="round" fill="none"/>
          </svg>
        </div>

        {/* ─── CATEGORY CHIPS ─── */}
        <div className="chip-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '20px' }}>
          {categories.map((cat) => (
            <div
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0,
                padding: '7px 16px',
                borderRadius: '999px',
                fontSize: '12.5px', fontWeight: 700,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif",
                background: activeCategory === cat ? '#1B130D' : '#FFFFFF',
                color: activeCategory === cat ? '#FFF7EC' : '#6B5C4F',
                border: activeCategory === cat ? '1px solid #1B130D' : '1px solid #F0E1CC',
                transition: 'all 0.18s ease',
              }}
            >
              {cat}
            </div>
          ))}
        </div>

        {/* ─── SECTION HEADER ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '14px',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#F3760C', cursor: 'pointer' }}>عرض الكل</span>
          <h2 style={{
            fontFamily: "'Cairo', sans-serif",
            fontSize: '18px', fontWeight: 900, color: '#1B130D',
          }}>
            الأكثر طلبًا
          </h2>
        </div>

        {/* ─── ERROR ─── */}
        {error && (
          <div style={{
            background: '#FBE0DC', borderRadius: '16px', padding: '20px',
            textAlign: 'center', color: '#C95A06', marginBottom: '16px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔌</div>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{error}</div>
          </div>
        )}

        {/* ─── SKELETON LOADING ─── */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} style={{
                background: '#FFFFFF', borderRadius: '20px',
                border: '1px solid #F0E1CC', padding: '10px',
                animation: 'pulse-load 1.4s ease-in-out infinite',
              }}>
                <div style={{ height: '110px', borderRadius: '14px', background: '#F0E1CC', marginBottom: '10px' }} />
                <div style={{ height: '13px', background: '#F0E1CC', borderRadius: '8px', marginBottom: '6px', width: '75%', marginRight: 'auto', marginLeft: 'auto' }} />
                <div style={{ height: '11px', background: '#F0E1CC', borderRadius: '8px', width: '55%', marginRight: 'auto', marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        )}

        {/* ─── EMPTY ─── */}
        {!loading && !error && filteredProducts.length === 0 && (
          <div style={{
            background: '#FFFFFF', borderRadius: '20px',
            border: '1px solid #F0E1CC', padding: '40px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🥣</div>
            <div style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 800, fontSize: '15px', color: '#1B130D' }}>
              لا توجد منتجات في هذه الفئة
            </div>
          </div>
        )}

        {/* ─── PRODUCT GRID ─── */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {filteredProducts.map((p) => {
              const hasSizes = p.sizes && p.sizes.length > 0;
              const minPrice = hasSizes ? Math.min(...p.sizes.map(s => s.price)) : p.price;
              const emoji = getProductEmoji(p);
              const isNew = p.is_new || (p.tag === 'جديد');
              const isFamous = p.is_famous || (p.tag === 'الأشهر');

              return (
                <div
                  key={p.id || p._id}
                  className="product-card"
                  onClick={() => p.available && openProductModal(p)}
                >
                  {/* ── Thumbnail ── */}
                  <div style={{
                    position: 'relative',
                    height: '120px',
                    background: 'linear-gradient(160deg, #FFE3C2 0%, #FFD09A 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '52px', lineHeight: 1 }}>{emoji}</span>
                    )}

                    {/* Tags */}
                    {isFamous && (
                      <span style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: '#3B7A3E', color: 'white',
                        fontSize: '9px', fontWeight: 800,
                        padding: '3px 8px', borderRadius: '999px',
                        fontFamily: "'Cairo', sans-serif",
                      }}>الأشهر</span>
                    )}
                    {isNew && !isFamous && (
                      <span style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: '#3B7A3E', color: 'white',
                        fontSize: '9px', fontWeight: 800,
                        padding: '3px 8px', borderRadius: '999px',
                        fontFamily: "'Cairo', sans-serif",
                      }}>جديد</span>
                    )}
                    {hasSizes && !isFamous && !isNew && (
                      <span style={{
                        position: 'absolute', top: '8px', left: '8px',
                        background: '#F3760C', color: 'white',
                        fontSize: '9px', fontWeight: 800,
                        padding: '3px 8px', borderRadius: '999px',
                        fontFamily: "'Cairo', sans-serif",
                      }}>{p.sizes.length} أحجام</span>
                    )}
                    {!p.available && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(27,19,13,.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{
                          background: '#1B130D', color: '#FFF7EC',
                          padding: '4px 12px', borderRadius: '999px',
                          fontSize: '11px', fontWeight: 700,
                        }}>غير متوفر 🚫</span>
                      </div>
                    )}
                  </div>

                  {/* ── Info ── */}
                  <div style={{ padding: '10px 10px 12px', textAlign: 'right' }}>
                    <div style={{
                      fontFamily: "'Cairo', sans-serif",
                      fontSize: '14px', fontWeight: 800,
                      color: '#1B130D', marginBottom: '3px',
                    }}>
                      {p.name}
                    </div>
                    {p.description && (
                      <div style={{
                        fontSize: '11px', color: '#9C7A5A',
                        lineHeight: 1.45, marginBottom: '10px',
                      }}>
                        {p.description.length > 45 ? p.description.slice(0, 45) + '…' : p.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                      <button
                        className="add-circle"
                        onClick={(e) => { e.stopPropagation(); if (p.available) openProductModal(p); }}
                        disabled={!p.available}
                        style={!p.available ? { background: '#DDD', cursor: 'not-allowed' } : {}}
                      >
                        +
                      </button>
                      <div style={{ textAlign: 'left' }}>
                        {hasSizes && (
                          <div style={{ fontSize: '9px', color: '#9C7A5A' }}>يبدأ من</div>
                        )}
                        <span style={{
                          fontFamily: "'Cairo', sans-serif",
                          fontWeight: 800, fontSize: '14px', color: '#C95A06',
                        }}>
                          {minPrice}{' '}
                          <span style={{ fontSize: '11px', color: '#9C7A5A', fontWeight: 600 }}>ج.س</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Hint text */}
        {!loading && filteredProducts.length > 0 && (
          <div style={{
            textAlign: 'center', fontSize: '11px', color: '#9C7A5A',
            marginTop: '20px', paddingBottom: '8px',
          }}>
            اسحب لأعلى من الأسفل لرؤية المزيد 🍉
          </div>
        )}
      </div>

      {/* ─── PRODUCT MODAL (bottom sheet) ─── */}
      {selectedProduct && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(27,19,13,.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end',
            zIndex: 200,
          }}
          onClick={closeModal}
        >
          <div
            className="modal-sheet"
            style={{
              background: '#FFF7EC',
              borderRadius: '26px 26px 0 0',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Grab handle */}
            <div style={{ textAlign: 'center', paddingTop: '12px' }}>
              <div style={{ width: '38px', height: '4px', background: '#F0E1CC', borderRadius: '99px', display: 'inline-block' }} />
            </div>

            {/* Image */}
            <div style={{
              margin: '12px 16px 0',
              height: '200px',
              borderRadius: '20px',
              background: 'linear-gradient(160deg, #FFE3C2 0%, #FFD09A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', position: 'relative',
            }}>
              {selectedProduct.image ? (
                <img src={selectedProduct.image} alt={selectedProduct.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '80px' }}>{getProductEmoji(selectedProduct)}</span>
              )}
              {selectedProduct.category && (
                <span style={{
                  position: 'absolute', top: '10px', right: '10px',
                  background: '#3B7A3E', color: 'white',
                  fontSize: '10px', fontWeight: 800,
                  padding: '4px 10px', borderRadius: '999px',
                }}>
                  {selectedProduct.category}
                </span>
              )}
            </div>

            <div style={{ padding: '18px 20px 28px', textAlign: 'right' }}>
              <div style={{
                fontFamily: "'Cairo', sans-serif",
                fontSize: '20px', fontWeight: 900, color: '#1B130D', marginBottom: '6px',
              }}>
                {selectedProduct.name}
              </div>
              <div style={{ fontSize: '13px', color: '#6B5C4F', marginBottom: '18px', lineHeight: 1.6 }}>
                {selectedProduct.description || 'فواكه طازجة وصحية محضرة يومياً خصيصاً لك.'}
              </div>

              {/* Size Selection */}
              {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1B130D', marginBottom: '10px' }}>اختر الحجم:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedProduct.sizes.map((sz, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSizeIdx(idx)}
                        style={{
                          padding: '10px 18px', borderRadius: '14px',
                          fontWeight: 700, fontSize: '13px',
                          border: selectedSizeIdx === idx ? '2px solid #F3760C' : '2px solid #F0E1CC',
                          background: selectedSizeIdx === idx ? '#F3760C' : '#FFFFFF',
                          color: selectedSizeIdx === idx ? 'white' : '#1B130D',
                          cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
                        }}
                      >
                        {sz.name}
                        <span style={{ display: 'block', fontSize: '11px', opacity: 0.85 }}>{sz.price} ج.س</span>
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
                  <div style={{ fontSize: '11px', color: '#9C7A5A' }}>السعر</div>
                  <div style={{
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: '26px', fontWeight: 900, color: '#C95A06',
                  }}>
                    {getModalPrice()} <span style={{ fontSize: '13px', color: '#9C7A5A', fontWeight: 600 }}>ج.س</span>
                  </div>
                </div>
                <button
                  onClick={handleAddToCart}
                  style={{
                    background: '#F3760C', color: 'white',
                    border: 'none', borderRadius: '18px',
                    padding: '14px 28px', fontWeight: 800, fontSize: '14px',
                    cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
                    boxShadow: '0 8px 20px -8px rgba(243,118,12,.55)',
                  }}
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
