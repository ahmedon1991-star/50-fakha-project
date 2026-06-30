import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { supabase } from '../supabaseClient';

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
  if (name.includes('خوخ') || name.includes('peach')) return '🍑';
  return CATEGORY_EMOJI[product.category] || '🍹';
}

export default function ProductsPage() {
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_products');
      return cached ? JSON.parse(cached) : [];
    } catch (e) { return []; }
  });
  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_categories');
      const cats = cached ? JSON.parse(cached) : ['الكل'];
      return cats.filter(c => c !== 'الكل');
    } catch (e) { return []; }
  });
  const [loading, setLoading] = useState(() => products.length === 0);
  const [error, setError] = useState('');
  const { addToCart } = useCart();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(0);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: prodData, error: prodErr } = await supabase
          .from('products').select('*').eq('available', true)
          .order('created_at', { ascending: false });
        if (prodErr) throw prodErr;
        const fresh = prodData || [];
        setProducts(fresh);
        localStorage.setItem('cached_products', JSON.stringify(fresh));

        const { data: catData, error: catErr } = await supabase
          .from('categories').select('name').order('name', { ascending: true });
        if (!catErr && catData && catData.length > 0) {
          setCategories(catData.map(c => c.name));
          localStorage.setItem('cached_categories', JSON.stringify(['الكل', ...catData.map(c => c.name)]));
        }
        setError('');
      } catch (err) {
        console.error(err);
        if (products.length === 0) setError('تعذر تحميل البيانات.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); // eslint-disable-line

  const openModal = (p) => { setSelectedProduct(p); setSelectedSizeIdx(0); };
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
    return hasSizes ? (selectedProduct.sizes[selectedSizeIdx]?.price ?? 0) : selectedProduct.price;
  };

  // Group products by category
  const grouped = {};
  // "الكل" group first
  const uncategorized = products.filter(p => !p.category || p.category.trim() === '');
  if (uncategorized.length > 0) grouped['أخرى'] = uncategorized;

  categories.forEach(cat => {
    const catProds = products.filter(p => p.category === cat);
    if (catProds.length > 0) grouped[cat] = catProds;
  });

  // If no categories from DB, just show all
  const hasGrouped = Object.keys(grouped).length > 0;
  const allProds = hasGrouped ? [] : products; // fallback

  const ProductCard = ({ p }) => {
    const hasSizes = p.sizes && p.sizes.length > 0;
    const minPrice = hasSizes ? Math.min(...p.sizes.map(s => s.price)) : p.price;
    const emoji = getProductEmoji(p);

    return (
      <div
        className="product-card"
        onClick={() => p.available && openModal(p)}
      >
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
            <img src={p.image} alt={p.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '50px', lineHeight: 1 }}>{emoji}</span>
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

          {(p.is_famous || p.tag === 'الأشهر') && (
            <span style={{
              position: 'absolute', top: '8px', right: '8px',
              background: '#3B7A3E', color: 'white',
              fontSize: '9px', fontWeight: 800,
              padding: '3px 8px', borderRadius: '999px',
            }}>الأشهر</span>
          )}
          {(p.is_new || p.tag === 'جديد') && !(p.is_famous || p.tag === 'الأشهر') && (
            <span style={{
              position: 'absolute', top: '8px', right: '8px',
              background: '#3B7A3E', color: 'white',
              fontSize: '9px', fontWeight: 800,
              padding: '3px 8px', borderRadius: '999px',
            }}>جديد</span>
          )}
          {hasSizes && !(p.is_famous || p.tag === 'الأشهر') && !(p.is_new || p.tag === 'جديد') && (
            <span style={{
              position: 'absolute', bottom: '8px', left: '8px',
              background: '#F3760C', color: 'white',
              fontSize: '9px', fontWeight: 800,
              padding: '3px 8px', borderRadius: '999px',
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

        <div style={{ padding: '10px 10px 12px', textAlign: 'right' }}>
          <div style={{
            fontFamily: "'Cairo', sans-serif",
            fontSize: '13px', fontWeight: 800,
            color: '#1B130D', marginBottom: '2px',
          }}>{p.name}</div>
          {p.description && (
            <div style={{ fontSize: '11px', color: '#9C7A5A', lineHeight: 1.4, marginBottom: '8px' }}>
              {p.description.length > 42 ? p.description.slice(0, 42) + '…' : p.description}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <button
              className="add-circle"
              onClick={e => { e.stopPropagation(); if (p.available) openModal(p); }}
              disabled={!p.available}
              style={!p.available ? { background: '#DDD', cursor: 'not-allowed' } : {}}
            >+</button>
            <div style={{ textAlign: 'left' }}>
              {hasSizes && <div style={{ fontSize: '9px', color: '#9C7A5A' }}>يبدأ من</div>}
              <span style={{
                fontFamily: "'Cairo', sans-serif",
                fontWeight: 800, fontSize: '13px', color: '#C95A06',
              }}>
                {minPrice} <span style={{ fontSize: '10px', color: '#9C7A5A', fontWeight: 600 }}>ج.س</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: '#EFE3CF',
      fontFamily: "'Tajawal', sans-serif",
      minHeight: '100%',
      paddingBottom: '130px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;800;900&family=Tajawal:wght@400;500;700&display=swap');
        .product-card {
          background: #FFFFFF; border-radius: 20px;
          border: 1px solid #F0E1CC; overflow: hidden; cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .product-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px -10px rgba(27,19,13,.2); }
        .add-circle {
          width: 34px; height: 34px; background: #1B130D; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 20px; font-weight: 700;
          border: none; cursor: pointer; flex-shrink: 0;
          transition: transform 0.15s ease;
        }
        .add-circle:hover { transform: scale(1.1); }
        .product-thumb { height: 110px; }
        .product-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
        }
        @media (min-width: 640px) {
          .product-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; }
          .product-thumb { height: 130px; }
        }
        @media (min-width: 1024px) {
          .product-grid { grid-template-columns: repeat(4, 1fr); gap: 18px; }
        }
        .modal-sheet { animation: sheetUp 0.3s cubic-bezier(.22,1,.36,1); }
        @keyframes sheetUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse-load { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* Page Header */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '20px',
        }}>
          <span style={{ fontSize: '13px', color: '#9C7A5A' }}>
            {products.length} منتج
          </span>
          <h1 style={{
            fontFamily: "'Cairo', sans-serif",
            fontSize: '20px', fontWeight: 900, color: '#1B130D',
          }}>
            🍹 كل منتجاتنا
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#FBE0DC', borderRadius: '16px', padding: '20px',
            textAlign: 'center', color: '#C95A06', marginBottom: '20px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔌</div>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{error}</div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="product-grid" style={{ marginBottom: '20px' }}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} style={{
                background: '#FFFFFF', borderRadius: '20px',
                border: '1px solid #F0E1CC', padding: '10px',
                animation: 'pulse-load 1.4s ease-in-out infinite',
              }}>
                <div style={{ height: '110px', borderRadius: '14px', background: '#F0E1CC', marginBottom: '10px' }} />
                <div style={{ height: '12px', background: '#F0E1CC', borderRadius: '8px', marginBottom: '5px', width: '70%', marginRight: 'auto', marginLeft: 'auto' }} />
                <div style={{ height: '10px', background: '#F0E1CC', borderRadius: '8px', width: '50%', marginRight: 'auto', marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Favourites Section */}
            {(() => {
              const favProducts = products.filter(p => favorites.includes(p.id || p._id));
              if (favProducts.length === 0) return null;
              return (
                <div style={{ marginBottom: '28px' }}>
                  {/* Category Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    marginBottom: '12px',
                  }}>
                    <div style={{ flex: 1, height: '1px', background: '#F0E1CC' }} />
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: '#C95A06', color: '#FFF7EC',
                      padding: '6px 16px', borderRadius: '999px',
                      fontFamily: "'Cairo', sans-serif",
                      fontSize: '13px', fontWeight: 800,
                    }}>
                      <span>❤️</span>
                      <span>قائمتي المفضلة</span>
                      <span style={{
                        background: '#1B130D', color: 'white',
                        fontSize: '9px', fontWeight: 800,
                        padding: '1px 6px', borderRadius: '999px',
                      }}>{favProducts.length}</span>
                    </div>
                    <div style={{ flex: 1, height: '1px', background: '#F0E1CC' }} />
                  </div>

                  {/* Favorite Products Grid */}
                  <div className="product-grid">
                    {favProducts.map(p => <ProductCard key={p.id || p._id} p={p} />)}
                  </div>
                </div>
              );
            })()}

            {hasGrouped ? (
              Object.entries(grouped).map(([catName, catProducts]) => (
                <div key={catName} style={{ marginBottom: '28px' }}>
                  {/* Category Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    marginBottom: '12px',
                  }}>
                    <div style={{ flex: 1, height: '1px', background: '#F0E1CC' }} />
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: '#1B130D', color: '#FFF7EC',
                      padding: '6px 16px', borderRadius: '999px',
                      fontFamily: "'Cairo', sans-serif",
                      fontSize: '13px', fontWeight: 800,
                    }}>
                      <span>{CATEGORY_EMOJI[catName] || '🍹'}</span>
                      <span>{catName}</span>
                      <span style={{
                        background: '#F3760C', color: 'white',
                        fontSize: '9px', fontWeight: 800,
                        padding: '1px 6px', borderRadius: '999px',
                      }}>{catProducts.length}</span>
                    </div>
                    <div style={{ flex: 1, height: '1px', background: '#F0E1CC' }} />
                  </div>

                  {/* Category Products */}
                  <div className="product-grid">
                    {catProducts.map(p => <ProductCard key={p.id || p._id} p={p} />)}
                  </div>
                </div>
              ))
            ) : (
              // Fallback: no categories in DB, show all flat
              <div className="product-grid">
                {allProds.map(p => <ProductCard key={p.id || p._id} p={p} />)}
              </div>
            )}

            {products.length === 0 && (
              <div style={{
                background: '#FFFFFF', borderRadius: '20px',
                border: '1px solid #F0E1CC', padding: '40px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🥣</div>
                <div style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 800, color: '#1B130D' }}>
                  لا توجد منتجات حالياً
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── PRODUCT MODAL ─── */}
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
              background: '#FFF7EC', borderRadius: '26px 26px 0 0',
              width: '100%', maxHeight: '90vh', overflow: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', paddingTop: '12px' }}>
              <div style={{ width: '38px', height: '4px', background: '#F0E1CC', borderRadius: '99px', display: 'inline-block' }} />
            </div>

            <div style={{
              margin: '12px 16px 0', height: '180px', borderRadius: '20px',
              background: 'linear-gradient(160deg, #FFE3C2 0%, #FFD09A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', position: 'relative',
            }}>
              {selectedProduct.image ? (
                <img src={selectedProduct.image} alt={selectedProduct.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '70px' }}>{getProductEmoji(selectedProduct)}</span>
              )}
            </div>

            <div style={{ padding: '18px 20px 28px', textAlign: 'right' }}>
              <div style={{ fontFamily: "'Cairo', sans-serif", fontSize: '20px', fontWeight: 900, color: '#1B130D', marginBottom: '6px' }}>
                {selectedProduct.name}
              </div>
              <div style={{ fontSize: '13px', color: '#6B5C4F', marginBottom: '16px', lineHeight: 1.6 }}>
                {selectedProduct.description || 'فواكه طازجة وصحية محضرة يومياً خصيصاً لك.'}
              </div>

              {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1B130D', marginBottom: '10px' }}>اختر الحجم:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedProduct.sizes.map((sz, idx) => (
                      <button key={idx} onClick={() => setSelectedSizeIdx(idx)} style={{
                        padding: '10px 16px', borderRadius: '14px',
                        fontWeight: 700, fontSize: '13px',
                        border: selectedSizeIdx === idx ? '2px solid #F3760C' : '2px solid #F0E1CC',
                        background: selectedSizeIdx === idx ? '#F3760C' : '#FFFFFF',
                        color: selectedSizeIdx === idx ? 'white' : '#1B130D',
                        cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
                      }}>
                        {sz.name}
                        <span style={{ display: 'block', fontSize: '11px', opacity: 0.85 }}>{sz.price} ج.س</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid #F0E1CC' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#9C7A5A' }}>السعر</div>
                  <div style={{ fontFamily: "'Cairo', sans-serif", fontSize: '24px', fontWeight: 900, color: '#C95A06' }}>
                    {getModalPrice()} <span style={{ fontSize: '13px', color: '#9C7A5A', fontWeight: 600 }}>ج.س</span>
                  </div>
                </div>
                <button onClick={handleAddToCart} style={{
                  background: '#F3760C', color: 'white', border: 'none',
                  borderRadius: '16px', padding: '13px 26px',
                  fontWeight: 800, fontSize: '14px', cursor: 'pointer',
                  fontFamily: "'Cairo', sans-serif",
                  boxShadow: '0 8px 20px -8px rgba(243,118,12,.55)',
                }}>
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
