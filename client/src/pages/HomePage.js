import { useEffect, useState } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToCart } = useCart();

  useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:5000/api/products')
      .then(res => {
        setProducts(res.data);
        setFilteredProducts(res.data);
        setError('');
      })
      .catch(err => {
        console.error(err);
        setError('تعذر تحميل المنتجات حالياً. يرجى التأكد من تشغيل الخادم الخلفي.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    if (category === 'الكل') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.category === category));
    }
  };

  const categories = ['الكل', 'عصائر طازجة', 'سلطات فواكه', 'حلويات', 'أخرى'];

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((p) => (
              <div
                key={p._id}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group"
              >
                {/* Product Image */}
                <div className="relative h-52 overflow-hidden bg-slate-100">
                  <img
                    src={p.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400'}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {!p.available && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                      <span className="bg-slate-800 text-white font-bold px-4 py-2 rounded-full text-sm">
                        غير متوفر حالياً 🚫
                      </span>
                    </div>
                  )}
                  {p.category && (
                    <span className="absolute top-3 right-3 bg-emerald-500/90 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow backdrop-blur-xs">
                      {p.category}
                    </span>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-slate-500 text-sm mt-1.5 line-clamp-2 h-10">
                      {p.description || 'فواكه طازجة وصحية محضرة يومياً خصيصاً لك.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-2xl font-extrabold text-emerald-700">
                      {p.price} <span className="text-xs font-semibold text-slate-500">ج.م</span>
                    </span>
                    
                    <button
                      onClick={() => addToCart(p)}
                      disabled={!p.available}
                      className={`font-bold px-5 py-2.5 rounded-xl shadow transition duration-200 text-sm flex items-center gap-1.5 ${
                        p.available
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105 active:scale-95'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <span>أضف</span>
                      <span>🛒</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
