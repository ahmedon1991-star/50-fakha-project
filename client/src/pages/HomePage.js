import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (productId, e) => {
    e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      localStorage.setItem('favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(0);

  const [sliderImages, setSliderImages] = useState([]);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [activeSlideIsPortrait, setActiveSlideIsPortrait] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    return localStorage.getItem('show_welcome_free_delivery') === 'true';
  });



  useEffect(() => {
    const fetchSliderImages = async () => {
      try {
        const { data } = await supabase.from('app_settings').select('*').eq('id', 2).maybeSingle();
        if (data && data.bank_account) {
          const parsed = JSON.parse(data.bank_account) || [];
          setSliderImages(parsed.filter(url => !!url));
        }
      } catch (err) {
        console.error('Error fetching slider:', err);
      }
    };
    fetchSliderImages();
  }, []);

  useEffect(() => {
    if (sliderImages.length === 0) {
      setActiveSlideIsPortrait(false);
      return;
    }
    const imgUrl = sliderImages[currentSlideIdx];
    if (!imgUrl) {
      setActiveSlideIsPortrait(false);
      return;
    }

    const img = new Image();
    img.src = imgUrl;
    img.onload = () => {
      if (img.naturalHeight > img.naturalWidth) {
        setActiveSlideIsPortrait(true);
      } else {
        setActiveSlideIsPortrait(false);
      }
    };
    img.onerror = () => {
      setActiveSlideIsPortrait(false);
    };
  }, [currentSlideIdx, sliderImages]);

  useEffect(() => {
    if (sliderImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIdx(prev => (prev + 1) % sliderImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [sliderImages]);

  useEffect(() => {
    const normQuery = searchQuery.trim().toLowerCase()
      .replace(/[أإآا]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[ىي]/g, 'ي')
      .replace(/[\u064B-\u0652]/g, '');

    let filtered = products;
    if (activeCategory === '❤️ المفضلة') {
      filtered = products.filter(p => favorites.includes(p.id || p._id));
    } else if (activeCategory !== 'الكل') {
      filtered = products.filter(p => p.category === activeCategory);
    }

    if (normQuery !== '') {
      filtered = filtered.filter(p => {
        const normName = (p.name || '').toLowerCase()
          .replace(/[أإآا]/g, 'ا')
          .replace(/[ة]/g, 'ه')
          .replace(/[ىي]/g, 'ي')
          .replace(/[\u064B-\u0652]/g, '');
        return normName.includes(normQuery);
      });
    }

    setFilteredProducts(filtered);
  }, [products, activeCategory, favorites, searchQuery]);

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
        paddingBottom: '130px', // space for bottom nav (tabs + address strip) on mobile
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
        /* Responsive product grid */
        .product-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .product-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
        }
        @media (min-width: 1024px) {
          .product-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; }
        }
        /* Responsive thumb height */
        .product-thumb { height: 120px; }
        @media (min-width: 640px) {
          .product-thumb { height: 140px; }
          .product-thumb-emoji { font-size: 60px !important; }
        }
        .search-input:focus {
          border-color: #F3760C !important;
          box-shadow: 0 0 0 3px rgba(243,118,12,0.12);
        }
        .hero-slider-container {
          position: relative;
          border-radius: 22px;
          color: white;
          overflow: hidden;
          margin-bottom: 16px;
          height: 150px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          box-shadow: 0 8px 30px rgba(0,0,0,0.06);
          transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hero-slider-container.is-portrait {
          height: 230px;
          justify-content: flex-end;
          padding: 12px;
        }
        @media (min-width: 640px) {
          .hero-slider-container {
            height: 180px;
          }
          .hero-slider-container.is-portrait {
            height: 320px;
            padding: 18px;
          }
        }
        .default-slide-container {
          display: flex;
          width: 100%;
          height: 100%;
          direction: rtl;
        }
        .default-slide-left {
          width: 50%;
          background: #083B3F;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 8px 12px;
          position: relative;
          border-left: 3px double #D6A84E;
          border-right: 3px double #D6A84E;
        }
        .default-slide-left::before, .default-slide-left::after {
          content: '';
          position: absolute;
          top: 8%;
          bottom: 8%;
          width: 1px;
          background: rgba(214, 168, 78, 0.3);
        }
        .default-slide-left::before { right: 6px; }
        .default-slide-left::after { left: 6px; }
        
        .default-slide-right {
          width: 50%;
          background-image: url('/luxury_fruit_dessert_slide.png');
          background-size: cover;
          background-position: center;
        }
      `}</style>

      {/* ─── MAIN CONTENT WRAPPER ─── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 0' }}>
        {sliderImages.length > 0 ? (
          /* Custom Banners Slider */
          <div 
            className={`hero-slider-container ${activeSlideIsPortrait ? 'is-portrait' : ''}`}
            onClick={() => {
              const el = document.querySelector('.chip-scroll');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ cursor: 'pointer' }}
          >
            {/* Slides background wrapper */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              {sliderImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: currentSlideIdx === idx ? 1 : 0,
                    transition: 'opacity 0.8s ease-in-out',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 0,
                  }}
                >
                  {/* Blurred Background Layer (Dynamic matching color/art cover) */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: '-20px',
                      backgroundImage: `url(${imgUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'blur(20px) brightness(0.85)',
                      transform: 'scale(1.15)',
                      zIndex: 0,
                    }}
                  />

                  {/* Centered Contained Foreground Image */}
                  <img
                    src={imgUrl}
                    alt={`Slide ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  />
                </div>
              ))}
              
              {/* Linear Gradient Overlay to guarantee high contrast readability */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: activeSlideIsPortrait
                  ? 'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.15) 100%)'
                  : 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 100%)',
                zIndex: 1,
              }} />
            </div>

            {/* Custom merchant slides welcome pill */}
            {user && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 2,
                fontSize: '10px',
                fontWeight: 800,
                color: 'white',
                background: 'rgba(0,0,0,0.22)',
                padding: '4px 10px',
                borderRadius: '999px',
                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                fontFamily: "'Cairo', sans-serif",
                pointerEvents: 'none'
              }}>
                أهلاً بك 👋 {user.name.split(' ')[0]}
              </div>
            )}
          </div>
        ) : (
          /* Default Welcome Banner (Redesigned Split Screen style) */
          <div 
            className="hero-slider-container"
            onClick={() => {
              const el = document.querySelector('.chip-scroll');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ cursor: 'pointer', padding: 0 }}
          >
            <div className="default-slide-container">
              {/* Left Side (Teal Text Card) */}
              <div className="default-slide-left">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px', color: '#D6A84E' }}>✨</span>
                  <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: 'clamp(12px, 3.8vw, 17px)', fontWeight: 855, color: '#D6A84E' }}>
                    ارتقِ بيومك
                  </span>
                </div>
                
                <p style={{
                  fontFamily: "'Cairo', sans-serif",
                  fontSize: 'clamp(9px, 2.5vw, 11px)',
                  fontWeight: 700,
                  color: 'white',
                  lineHeight: 1.45,
                  maxWidth: '92%',
                  margin: '4px 0 10px',
                }}>
                  استمتع بتجربة فاكهة استثنائية مع 50 فاكهة
                </p>
                
                <div style={{
                  fontFamily: "'Cairo', sans-serif",
                  fontSize: 'clamp(9px, 2.2vw, 11px)',
                  fontWeight: 800,
                  background: 'white',
                  color: '#083B3F',
                  padding: '5px 14px',
                  borderRadius: '999px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  اكتشف قائمتنا ←
                </div>
                
                <span style={{
                  fontFamily: "'Cairo', sans-serif",
                  fontSize: 'clamp(7px, 1.8vw, 8.5px)',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: '10px',
                }}>
                  توصيل سريع وآمن للمنتجات الطازجة
                </span>
              </div>
              
              {/* Right Side (Dessert Photo) */}
              <div className="default-slide-right" />
            </div>
          </div>
        )}


        {/* ─── CATEGORY CHIPS ─── */}
        <div className="chip-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '20px' }}>
          {(() => {
            const allCats = categories.includes('❤️ المفضلة') ? categories : ['الكل', '❤️ المفضلة', ...categories.filter(c => c !== 'الكل')];
            return allCats.map((cat) => (
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
            ));
          })()}
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
          <div className="product-grid">
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
          <div className="product-grid">
            {filteredProducts.map((p) => {
              const hasSizes = p.sizes && p.sizes.length > 0;
              const minPrice = hasSizes ? Math.min(...p.sizes.map(s => s.price)) : p.price;
              const emoji = getProductEmoji(p);
              const isNew = p.is_new || p.tag === 'جديد' || p.category === 'أصناف جديدة' || p.category === 'اصناف جديده';
              const isFamous = p.is_famous || (p.tag === 'الأشهر');

              return (
                <div
                  key={p.id || p._id}
                  className="product-card"
                  onClick={() => p.available && openProductModal(p)}
                >
                  {/* ── Thumbnail ── */}
                  <div
                    className="product-thumb"
                    style={{
                      position: 'relative',
                      background: 'linear-gradient(160deg, #FFE3C2 0%, #FFD09A 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '52px', lineHeight: 1 }}>{emoji}</span>
                    )}

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => toggleFavorite(p.id || p._id, e)}
                      style={{
                        position: 'absolute', top: '8px', left: '8px',
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(2px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer', zIndex: 10,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        transition: 'transform 0.1s ease',
                      }}
                      className="fav-btn"
                    >
                      <span style={{ fontSize: '14px', lineHeight: 1 }}>
                        {favorites.includes(p.id || p._id) ? '❤️' : '🤍'}
                      </span>
                    </button>

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
                        position: 'absolute', bottom: '8px', left: '8px',
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

      {/* ─── NEW USER WELCOME SPLASH MODAL ─── */}
      {showWelcomeModal && (
        <div
          className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center z-[9999] p-6"
          style={{ animation: 'fadeIn 0.35s ease-out forwards' }}
          onClick={() => {
            localStorage.removeItem('show_welcome_free_delivery');
            setShowWelcomeModal(false);
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes popIn {
              0% { transform: scale(0.85); opacity: 0; }
              70% { transform: scale(1.02); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes floatEmoji {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-10px) rotate(5deg); }
            }
          `}</style>
          <div
            className="bg-white border-2 border-orange-500 rounded-[32px] p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #FFFDF9 0%, #FFF7EC 100%)',
              animation: 'popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top decorative icons */}
            <div className="flex justify-center gap-3 mb-5">
              <span className="text-5xl" style={{ animation: 'floatEmoji 3s ease-in-out infinite' }}>🎉</span>
              <span className="text-5xl" style={{ animation: 'floatEmoji 3s ease-in-out infinite 0.5s' }}>🍹</span>
              <span className="text-5xl" style={{ animation: 'floatEmoji 3s ease-in-out infinite 1s' }}>🎁</span>
            </div>

            {/* Content */}
            <h2 className="font-black text-2xl text-slate-900 mb-2.5 leading-snug" style={{ fontFamily: "'Cairo', sans-serif" }}>
              ألف مبروك يا فنان!
              <br />
              <span className="text-orange-500">أهلاً بك في عائلة 50 فاكهة</span>
            </h2>

            <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif" }}>
              سعداء جداً بانضمامك إلينا! وتكريماً لك، قمنا بإضافة عرض ترحيبي خاص جداً على حسابك تلقائياً:
            </p>

            {/* Discount Cards container */}
            <div className="flex flex-col gap-3 mb-7">
              {/* Card 1: Free shipping */}
              <div 
                className="text-white p-4 rounded-2xl flex items-center justify-between shadow-md border border-white/10"
                style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}
              >
                <span className="text-3xl">🆓</span>
                <div className="flex-1 text-right mr-4">
                  <div className="text-sm font-black" style={{ fontFamily: "'Cairo', sans-serif" }}>الطلب الأول</div>
                  <div className="text-[10px] opacity-90" style={{ fontFamily: "'Cairo', sans-serif" }}>توصيل مجاني 100% بالكامل!</div>
                </div>
              </div>

              {/* Card 2: 50% discount */}
              <div 
                className="text-white p-4 rounded-2xl flex items-center justify-between shadow-md border border-white/10"
                style={{ background: 'linear-gradient(135deg, #F3760C 0%, #D97706 100%)' }}
              >
                <span className="text-3xl">🔥</span>
                <div className="flex-1 text-right mr-4">
                  <div className="text-sm font-black" style={{ fontFamily: "'Cairo', sans-serif" }}>الطلب الثاني</div>
                  <div className="text-[10px] opacity-90" style={{ fontFamily: "'Cairo', sans-serif" }}>خصم 50% نصف قيمة التوصيل!</div>
                </div>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={() => {
                localStorage.removeItem('show_welcome_free_delivery');
                setShowWelcomeModal(false);
              }}
              className="w-full bg-slate-900 text-amber-50 border-none rounded-2xl py-4 font-black text-sm cursor-pointer shadow-lg active:scale-[0.98] transition"
              style={{ fontFamily: "'Cairo', sans-serif" }}
            >
              ابدأ طلبك الأول الآن 🍊
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
