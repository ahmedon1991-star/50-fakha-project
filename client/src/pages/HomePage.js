import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { supabase } from '../supabaseClient';

export default function HomePage() {
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
      return cached ? JSON.parse(cached) : ['الكل', 'عصائر طازجة', 'سلطات فواكه', 'حلويات', 'أخرى'];
    } catch (e) {
      return ['الكل', 'عصائر طازجة', 'سلطات فواكه', 'حلويات', 'أخرى'];
    }
  });
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [loading, setLoading] = useState(() => products.length === 0);
  const [error, setError] = useState('');
  const { addToCart } = useCart();

  // Product modal state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(0);

  // Sync filtered products dynamically whenever products list or active category changes
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
        // 1. Fetch products from Supabase
        const { data: prodData, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('available', true)
          .order('created_at', { ascending: false });
        
        if (prodErr) throw prodErr;
        
        const freshProducts = prodData || [];
        setProducts(freshProducts);
        localStorage.setItem('cached_products', JSON.stringify(freshProducts));

        // 2. Fetch categories from Supabase
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
        // Only show error if we have no cached data at all (prevent breaking offline experience)
        if (products.length === 0) {
          setError('تعذر تحميل البيانات حالياً. يرجى التأكد من الاتصال بالإنترنت.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []); // eslint-disable-line

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
  };

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

  // Get the current displayed price in the modal
  const getModalPrice = () => {
    if (!selectedProduct) return 0;
    const hasSizes = selectedProduct.sizes && selectedProduct.sizes.length > 0;
    if (hasSizes) {
      return selectedProduct.sizes[selectedSizeIdx]?.price ?? 0;
    }
    return selectedProduct.price;
  };

  return (
    <div className="flex-1 pb-16">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-emerald-600 to-teal-800 text-white overflow-hidden py-16 px-6 sm:px-12 text-center sm:text-right shadow-lg">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-4">
            <span className="bg-yellow-400 text-emerald-950 font-bold text-xs uppercase px-3 py-1 rounded-full tracking-wider shadow">
              طبيعي 100% 🍊
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
              جرعتك اليومية من <br />
              <span className="text-yellow-300">السعادة والانتعاش!</span>
            </h1>
            <p className="text-emerald-100 text-base sm:text-lg">
              اختر من تشكيلتنا الواسعة من العصائر الاستوائية الطازجة، سلطات الفواكه المبتكرة، والحلويات الصحية المحضرة بحب وعناية.
            </p>
          </div>
          <div className="text-8xl select-none animate-bounce hidden md:block">
            🍹🍉🍍
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-12">
        {/* Section Title */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b pb-6 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">🍉 منيو 50 فاكهة</h2>
            <p className="text-slate-500 mt-1 text-sm">اختر ما تشتهيه وسنقوم بالتوصيل فوراً</p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-5 py-2 rounded-full font-bold text-sm transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Error Handling */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl text-center space-y-4 shadow-sm">
            <span className="text-4xl block">🔌</span>
            <p className="font-semibold text-lg">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-2 rounded-xl text-sm transition duration-200 shadow"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm animate-pulse space-y-4 p-4">
                <div className="w-full h-48 bg-slate-200 rounded-xl"></div>
                <div className="h-6 bg-slate-200 rounded-md w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded-md w-1/2"></div>
                <div className="h-10 bg-slate-200 rounded-xl w-full mt-4"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty List State */}
        {!loading && !error && filteredProducts.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <span className="text-5xl block">🥣</span>
            <h3 className="text-xl font-bold text-slate-800">لا توجد منتجات متوفرة</h3>
            <p className="text-slate-500">جرب البحث في فئة أخرى أو عد لاحقاً.</p>
          </div>
        )}

        {/* Product Cards Grid */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
            {filteredProducts.map((p) => {
              const hasSizes = p.sizes && p.sizes.length > 0;
              return (
                <div
                  key={p.id || p._id}
                  onClick={() => p.available && openProductModal(p)}
                  className={`bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group ${p.available ? 'cursor-pointer' : ''}`}
                >
                  {/* Product Image */}
                  <div className="relative h-32 sm:h-52 overflow-hidden bg-slate-100">
                    <img
                      src={p.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400'}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {!p.available && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                        <span className="bg-slate-800 text-white font-bold px-2 py-1 sm:px-4 sm:py-2 rounded-full text-[10px] sm:text-sm">
                          غير متوفر 🚫
                        </span>
                      </div>
                    )}
                    {p.category && (
                      <span className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-emerald-500/90 text-white font-bold text-[9px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow backdrop-blur-xs">
                        {p.category}
                      </span>
                    )}
                    {hasSizes && (
                      <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-amber-500/90 text-white font-bold text-[9px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow backdrop-blur-xs">
                        {p.sizes.length} أحجام
                      </span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-3 sm:p-5 flex flex-col flex-1 justify-between gap-3 sm:gap-4 text-right">
                    <div>
                      <h3 className="text-sm sm:text-xl font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {p.name}
                      </h3>
                      <p className="hidden sm:block text-slate-500 text-sm mt-1.5 line-clamp-2 h-10">
                        {p.description || 'فواكه طازجة وصحية محضرة يومياً خصيصاً لك.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 sm:pt-4 border-t border-slate-50">
                      <div>
                        {hasSizes ? (
                          <div>
                            <span className="text-[10px] text-slate-400 block">يبدأ من</span>
                            <span className="text-base sm:text-2xl font-black text-emerald-700">
                              {Math.min(...p.sizes.map(s => s.price))} <span className="text-[10px] sm:text-xs font-semibold text-slate-500">ج.س</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-base sm:text-2xl font-black text-emerald-700">
                            {p.price} <span className="text-[10px] sm:text-xs font-semibold text-slate-500">ج.س</span>
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); if (p.available) openProductModal(p); }}
                        disabled={!p.available}
                        className={`font-bold px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-xl shadow transition duration-200 text-xs sm:text-sm flex items-center gap-1 ${
                          p.available
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105 active:scale-95'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <span>{hasSizes ? 'اختر' : 'أضف'}</span>
                        <span className="hidden sm:inline">🛒</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.25s ease-out' }}
          >
            {/* Product Image */}
            <div className="relative h-56 overflow-hidden bg-slate-100">
              <img
                src={selectedProduct.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400'}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={closeModal}
                className="absolute top-3 left-3 bg-white/90 text-slate-700 p-2 rounded-full hover:bg-white transition shadow text-sm font-bold"
              >
                ✕
              </button>
              {selectedProduct.category && (
                <span className="absolute top-3 right-3 bg-emerald-500/90 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow">
                  {selectedProduct.category}
                </span>
              )}
            </div>

            <div className="p-6 space-y-5 text-right">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">{selectedProduct.name}</h2>
                <p className="text-slate-500 text-sm mt-1">
                  {selectedProduct.description || 'فواكه طازجة وصحية محضرة يومياً خصيصاً لك.'}
                </p>
              </div>

              {/* Size Selection */}
              {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700">اختر الحجم:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.sizes.map((sz, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSizeIdx(idx)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all duration-200 ${
                          selectedSizeIdx === idx
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200 scale-105'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'
                        }`}
                      >
                        <span>{sz.name}</span>
                        <span className={`block text-xs mt-0.5 ${selectedSizeIdx === idx ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {sz.price} ج.س
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price and Add to Cart */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 block">السعر</span>
                  <span className="text-3xl font-extrabold text-emerald-700">
                    {getModalPrice()}{' '}
                    <span className="text-sm font-semibold text-slate-500">ج.س</span>
                  </span>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 py-3 rounded-xl shadow-md shadow-emerald-200 transition duration-200 flex items-center gap-2 hover:scale-105 active:scale-95 text-base"
                >
                  إضافة للسلة 🛒
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
