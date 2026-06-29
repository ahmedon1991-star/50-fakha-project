import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stats');

  const handleLogoutClick = async () => {
    await logout();
    navigate('/login');
  };
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSales: 0,
    salesByDate: []
  });
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Categories State
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Modals and Forms State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    description: '',
    category: 'عصائر طازجة',
    image: '',
    size: '',
    sizes: [],
    available: true
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'stats') {
        // 1. Fetch total orders
        const { count: totalOrdersCount, error: totalErr } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });
        if (totalErr) throw totalErr;

        // 2. Fetch pending orders
        const { count: pendingCount, error: pendingErr } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'قيد الانتظار');
        if (pendingErr) throw pendingErr;

        // 3. Fetch completed orders
        const { count: completedCount, error: completedErr } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'تم التوصيل');
        if (completedErr) throw completedErr;

        // 4. Fetch sales data for sales sum and chart
        const { data: salesData, error: salesErr } = await supabase
          .from('orders')
          .select('total_amount, status, created_at')
          .neq('status', 'ملغي');
        if (salesErr) throw salesErr;

        const totalSales = salesData.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

        // Group by date in Javascript
        const dailyMap = {};
        salesData.forEach(o => {
          const dateStr = new Date(o.created_at).toISOString().split('T')[0];
          if (!dailyMap[dateStr]) {
            dailyMap[dateStr] = { date: dateStr, sales: 0, orders: 0 };
          }
          dailyMap[dateStr].sales += Number(o.total_amount) || 0;
          dailyMap[dateStr].orders += 1;
        });

        const salesByDate = Object.values(dailyMap)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-7);

        setStats({
          totalOrders: totalOrdersCount || 0,
          pendingOrders: pendingCount || 0,
          completedOrders: completedCount || 0,
          totalSales,
          salesByDate
        });

      } else if (activeTab === 'orders') {
        // Fetch all orders with profiles relation join
        const { data, error } = await supabase
          .from('orders')
          .select('*, profiles:user_id(name, id)')
          .order('created_at', { ascending: false });
        
        if (error) throw error;

        // Map profiles to match expected user object format
        const formattedOrders = (data || []).map(order => ({
          ...order,
          user: order.profiles ? { name: order.profiles.name, email: '' } : null
        }));
        setOrders(formattedOrders);

      } else if (activeTab === 'products') {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setProducts(data || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'تعذر تحميل البيانات من قاعدة بيانات Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err.message);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Categories CRUD
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setError('');
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name: newCategoryName.trim() })
        .select()
        .single();
      if (error) throw error;
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName('');
    } catch (err) {
      setError(err.message || 'خطأ أثناء إضافة القسم. تأكد من أن الاسم غير مكرر.');
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryName.trim()) return;
    setError('');
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editCategoryName.trim() })
        .eq('id', editingCategory.id);
      if (error) throw error;
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: editCategoryName.trim() } : c).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingCategory(null);
      setEditCategoryName('');
    } catch (err) {
      setError(err.message || 'خطأ أثناء تحديث القسم.');
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا القسم؟ قد يؤثر ذلك على المنتجات المرتبطة به.')) return;
    setError('');
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', catId);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== catId));
    } catch (err) {
      setError(err.message || 'خطأ أثناء حذف القسم. قد يكون هناك منتجات مرتبطة به.');
    }
  };

  // Sizes CRUD handlers
  const handleAddSize = () => {
    setProductForm(prev => ({ ...prev, sizes: [...prev.sizes, { name: '', price: '' }] }));
  };

  const handleSizeChange = (idx, field, value) => {
    setProductForm(prev => ({
      ...prev,
      sizes: prev.sizes.map((sz, i) => i === idx ? { ...sz, [field]: value } : sz)
    }));
  };

  const handleRemoveSize = (idx) => {
    setProductForm(prev => ({ ...prev, sizes: prev.sizes.filter((_, i) => i !== idx) }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `products/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage bucket 'product-images'
      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setProductForm(prev => ({ ...prev, image: publicUrl }));
    } catch (err) {
      console.error('Image upload error:', err);
      alert('خطأ أثناء رفع الصورة: ' + (err.message || 'تأكد من تفعيل باكت التخزين product-images في Supabase وجعلها عامة (Public).'));
    } finally {
      setUploadingImage(false);
    }
  };

  // Orders Management
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert('خطأ أثناء تعديل حالة الطلب: ' + err.message);
    }
  };

  // Products CRUD
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      // Clean sizes: remove empty, convert prices to numbers
      const cleanedSizes = (productForm.sizes || [])
        .filter(sz => sz.name.trim() !== '')
        .map(sz => ({ name: sz.name.trim(), price: Number(sz.price) || 0 }));

      // Auto-calculate base price: min of sizes prices, or 0 if no sizes
      const autoPrice = cleanedSizes.length > 0
        ? Math.min(...cleanedSizes.map(s => s.price))
        : 0;

      const formData = { ...productForm, sizes: cleanedSizes, price: autoPrice };

      if (editingProduct) {
        // Update product
        const { data, error } = await supabase
          .from('products')
          .update(formData)
          .eq('id', editingProduct.id)
          .select()
          .single();
        
        if (error) throw error;
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? data : p));
      } else {
        // Create product
        const { data, error } = await supabase
          .from('products')
          .insert(formData)
          .select()
          .single();
        
        if (error) throw error;
        setProducts(prev => [data, ...prev]);
      }
      setShowProductModal(false);
      resetProductForm();
    } catch (err) {
      alert(err.message || 'خطأ أثناء حفظ المنتج');
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price,
      description: product.description || '',
      category: product.category || 'عصائر طازجة',
      image: product.image || '',
      size: product.size || '',
      sizes: product.sizes || [],
      available: product.available ?? true
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا المنتج؟')) return;
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      alert('خطأ أثناء حذف المنتج: ' + err.message);
    }
  };

  const handleToggleAvailable = async (product) => {
    const updatedStatus = !product.available;
    try {
      const { error } = await supabase
        .from('products')
        .update({ available: updatedStatus })
        .eq('id', product.id);
      
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, available: updatedStatus } : p));
    } catch (err) {
      alert('خطأ أثناء تحديث حالة توفر المنتج: ' + err.message);
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      price: '',
      description: '',
      category: 'عصائر طازجة',
      image: '',
      size: '',
      sizes: [],
      available: true
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'قيد الانتظار': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'تم التأكيد': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'قيد التوصيل': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'تم التوصيل': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ملغي': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50 flex flex-col pb-16">
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white shadow-md p-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚙️</span>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                لوحة التحكم الإدارية
              </h1>
              <p className="text-slate-400 text-xs">إدارة منيو وطلبات مطعم 50 فاكهة</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition duration-200"
            >
              العودة للمتجر 🏪
            </Link>
            <div className="bg-slate-800 text-slate-200 text-sm px-4 py-2 rounded-xl border border-slate-700 font-semibold">
              المدير: {user?.name || 'أدمن'}
            </div>
            <button 
              onClick={handleLogoutClick}
              className="bg-rose-600 hover:bg-rose-700 hover:scale-[1.02] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition duration-200"
            >
              تسجيل الخروج 🚪
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-[60px] z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex gap-2 sm:gap-6 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-4 px-3 font-extrabold text-sm border-b-4 transition-all duration-200 ${
              activeTab === 'stats' 
                ? 'border-emerald-600 text-emerald-700' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            📊 إحصائيات وتقارير
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-3 font-extrabold text-sm border-b-4 transition-all duration-200 ${
              activeTab === 'orders' 
                ? 'border-emerald-600 text-emerald-700' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            📦 طلبات العملاء {stats.pendingOrders > 0 && (
              <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full mr-1 animate-pulse">
                {stats.pendingOrders}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`py-4 px-3 font-extrabold text-sm border-b-4 transition-all duration-200 ${
              activeTab === 'products' 
                ? 'border-emerald-600 text-emerald-700' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            🍉 إدارة المنيو والمنتجات
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl w-full mx-auto p-4 md:p-6 mt-4">
        {error && (
          <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-800 p-4 rounded-xl shadow-sm mb-6 flex items-center justify-between">
            <span className="text-sm font-semibold">⚠️ {error}</span>
            <button onClick={fetchData} className="bg-rose-600 text-white font-bold text-xs px-3 py-1 rounded hover:bg-rose-700 transition">
              تحديث
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW / STATS */}
            {activeTab === 'stats' && (
              <div className="space-y-8">
                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-slate-500 text-sm font-medium">إجمالي المبيعات</p>
                      <h3 className="text-3xl font-black text-emerald-700">{stats.totalSales} ج.س</h3>
                    </div>
                    <span className="text-4xl bg-emerald-50 p-3 rounded-2xl">💰</span>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-slate-500 text-sm font-medium">إجمالي الطلبات</p>
                      <h3 className="text-3xl font-black text-slate-800">{stats.totalOrders}</h3>
                    </div>
                    <span className="text-4xl bg-slate-50 p-3 rounded-2xl">📦</span>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-slate-500 text-sm font-medium">الطلبات المعلقة</p>
                      <h3 className="text-3xl font-black text-amber-600">{stats.pendingOrders}</h3>
                    </div>
                    <span className="text-4xl bg-amber-50 p-3 rounded-2xl">⏳</span>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-slate-500 text-sm font-medium">تم التوصيل</p>
                      <h3 className="text-3xl font-black text-blue-600">{stats.completedOrders || 0}</h3>
                    </div>
                    <span className="text-4xl bg-blue-50 p-3 rounded-2xl">✅</span>
                  </div>
                </div>

                {/* Sales Chart Section */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                  <h3 className="text-lg font-bold text-slate-800">مخطط المبيعات اليومية (آخر 7 أيام)</h3>
                  {stats.salesByDate?.length > 0 ? (
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.salesByDate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                          <YAxis stroke="#94a3b8" fontSize={12} />
                          <Tooltip formatter={(value) => [`${value} ج.س`, 'المبيعات']} labelStyle={{ color: '#000' }} />
                          <Legend />
                          <Area type="monotone" dataKey="sales" name="المبيعات (ج.س)" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="py-24 text-center text-slate-400 bg-slate-50 rounded-2xl">
                      لا تتوفر إحصائيات مبيعات كافية لعرض الرسم البياني حالياً.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ORDERS MANAGEMENT */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800">إدارة طلبات المطعم</h3>
                </div>
                {orders.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 space-y-3">
                    <span className="text-4xl block">📦</span>
                    <p className="font-bold text-lg">لا توجد أي طلبات حالياً</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 text-sm font-bold border-b border-slate-100">
                          <th className="p-4">العميل</th>
                          <th className="p-4">رقم الهاتف</th>
                          <th className="p-4">العنوان</th>
                          <th className="p-4">الطلب</th>
                          <th className="p-4">المبلغ الكلي</th>
                          <th className="p-4 text-center">الحالة الحالية</th>
                          <th className="p-4 text-center">تعديل الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                            <td className="p-4 flex flex-col">
                              <span className="font-bold text-slate-800">{order.user?.name || 'مجهول'}</span>
                            </td>
                            <td className="p-4 font-mono text-slate-600 text-sm">{order.phone || '-'}</td>
                            <td className="p-4 text-slate-600 text-sm max-w-[200px] truncate" title={order.shipping_address}>
                              {order.shipping_address}
                            </td>
                            <td className="p-4">
                              <div className="text-sm space-y-1">
                                {order.items?.map((it, idx) => (
                                  <div key={idx} className="text-slate-700">
                                    <span className="font-bold text-emerald-600">{it.quantity}x</span> {it.name}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 font-extrabold text-emerald-700">{order.total_amount} ج.س</td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <select
                                value={order.status}
                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                              >
                                <option value="قيد الانتظار">قيد الانتظار</option>
                                <option value="تم التأكيد">تم التأكيد</option>
                                <option value="قيد التوصيل">قيد التوصيل</option>
                                <option value="تم التوصيل">تم التوصيل</option>
                                <option value="ملغي">ملغي</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PRODUCT & CATEGORIES MANAGEMENT */}
            {activeTab === 'products' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Right side (span 2): Products list */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">قائمة أصناف المنيو</h3>
                    <button
                      onClick={() => {
                        resetProductForm();
                        setShowProductModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition duration-200 text-sm"
                    >
                      <span>إضافة منتج جديد</span>
                      <span>➕</span>
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {products.length === 0 ? (
                      <div className="p-16 text-center text-slate-400 space-y-3">
                        <span className="text-4xl block">🍍</span>
                        <p className="font-bold text-lg">المنيو فارغ حالياً. أضف منتجاتك الأولى!</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 text-sm font-bold border-b border-slate-100">
                              <th className="p-4">الصورة</th>
                              <th className="p-4">اسم الصنف</th>
                              <th className="p-4 text-center">الحجم</th>
                              <th className="p-4">السعر</th>
                              <th className="p-4">الفئة</th>
                              <th className="p-4">الوصف</th>
                              <th className="p-4 text-center">التوفر للطلب</th>
                              <th className="p-4 text-center">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map((p) => (
                              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                                <td className="p-4">
                                  <img
                                    src={p.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=100'}
                                    alt={p.name}
                                    className="w-12 h-12 object-cover rounded-lg border border-slate-100"
                                  />
                                </td>
                                <td className="p-4 font-bold text-slate-850">{p.name}</td>
                                <td className="p-4 text-center text-slate-650 font-semibold text-sm">{p.size || '-'}</td>
                                <td className="p-4 font-extrabold text-emerald-700">{p.price} ج.س</td>
                                <td className="p-4">
                                  <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                    {p.category || 'غير محدد'}
                                  </span>
                                </td>
                                <td className="p-4 text-slate-500 text-sm max-w-[200px] truncate" title={p.description}>
                                  {p.description || '-'}
                                </td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => handleToggleAvailable(p)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                                      p.available
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                        : 'bg-rose-100 text-rose-800 border-rose-200'
                                    }`}
                                  >
                                    {p.available ? 'متوفر ✅' : 'نفذت الكمية 🚫'}
                                  </button>
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex justify-center gap-3">
                                    <button
                                      onClick={() => handleEditClick(p)}
                                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg text-sm font-semibold transition"
                                    >
                                      ✏️ تعديل
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProduct(p.id)}
                                      className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-2 rounded-lg text-sm font-semibold transition"
                                    >
                                      🗑️ حذف
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Left side (span 1): Categories Management */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">📁 إدارة أقسام المنيو</h3>
                  </div>

                  {/* Add category form */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-700 text-sm">إضافة قسم جديد</h4>
                    <form onSubmit={handleAddCategory} className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="مثال: مشروبات ساخنة"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right text-sm"
                      />
                      <button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition text-sm shadow-sm"
                      >
                        إضافة ➕
                      </button>
                    </form>
                  </div>

                  {/* Categories list */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 text-sm">
                      الأقسام الحالية
                    </div>
                    {categories.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        لا توجد أقسام مخصصة حالياً.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {categories.map((cat) => (
                          <div key={cat.id} className="p-4 flex justify-between items-center gap-3">
                            {editingCategory?.id === cat.id ? (
                              <form onSubmit={handleUpdateCategory} className="flex gap-2 w-full">
                                <input
                                  type="text"
                                  required
                                  value={editCategoryName}
                                  onChange={(e) => setEditCategoryName(e.target.value)}
                                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right text-xs"
                                />
                                <button
                                  type="submit"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                                >
                                  حفظ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCategory(null)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-650 px-3 py-1.5 rounded-lg text-xs font-bold"
                                >
                                  إلغاء
                                </button>
                              </form>
                            ) : (
                              <>
                                <span className="font-bold text-slate-700 text-sm">{cat.name}</span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingCategory(cat);
                                      setEditCategoryName(cat.name);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-xs font-semibold p-1 hover:bg-blue-50 rounded"
                                  >
                                    ✏️ تعديل
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="text-rose-600 hover:text-rose-800 text-xs font-semibold p-1 hover:bg-rose-50 rounded"
                                  >
                                    🗑️ حذف
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>

      {/* PRODUCT FORM MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden text-right">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-lg font-bold">
                {editingProduct ? '✏️ تعديل صنف في المنيو' : '➕ إضافة صنف جديد للمنيو'}
              </h3>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  resetProductForm();
                }}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4 text-right overflow-y-auto max-h-[80vh]">
              <div>
                <label className="block text-slate-700 text-sm font-semibold mb-1">اسم الصنف</label>
                <input
                  id="client-prod-name"
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="مثال: عصير مانجو طازج"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-semibold mb-1">فئة الصنف</label>
                <select
                  id="client-prod-category"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                >
                  {categories.map(c => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                  {categories.length === 0 && (
                    <>
                      <option value="عصائر طازجة">عصائر طازجة</option>
                      <option value="سلطات فواكه">سلطات فواكه</option>
                      <option value="حلويات">حلويات</option>
                      <option value="أخرى">أخرى</option>
                    </>
                  )}
                </select>
              </div>

              {/* Multi-Size Editor */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-slate-700 text-sm font-bold">أحجام المنتج مع أسعارها</label>
                    <p className="text-xs text-slate-400 mt-0.5">أضف أحجام بأسعار مختلفة — يختارها العميل عند الطلب</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSize}
                    className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition shadow-sm"
                  >
                    + إضافة حجم
                  </button>
                </div>
                {productForm.sizes.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-300 rounded-xl bg-white">
                    لا توجد أحجام — سيُستخدم السعر الأساسي أعلاه للمنتج
                  </p>
                ) : (
                  <div className="space-y-2">
                    {productForm.sizes.map((sz, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="اسم الحجم (كبير، وسط، صغير...)"
                          value={sz.name}
                          onChange={(e) => handleSizeChange(idx, 'name', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        />
                        <input
                          type="number"
                          placeholder="السعر ج.س"
                          value={sz.price}
                          onChange={(e) => handleSizeChange(idx, 'price', e.target.value)}
                          className="w-28 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSize(idx)}
                          className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-lg transition flex-shrink-0"
                          title="حذف الحجم"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-slate-700 text-sm font-semibold mb-1">صورة الصنف</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* File Upload Option */}
                  <div className="bg-slate-50 border border-dashed border-slate-200 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 relative hover:bg-slate-100/50 transition">
                    <span className="text-2xl">📁</span>
                    <span className="text-xs font-bold text-slate-700">رفع صورة من المعرض</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center rounded-xl text-white text-xs font-bold">
                        جاري الرفع... ⏳
                      </div>
                    )}
                  </div>

                  {/* URL Text Option */}
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500 block">أو أدخل رابط صورة مباشرة:</span>
                    <input
                      id="client-prod-image"
                      type="url"
                      value={productForm.image}
                      onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-left text-sm"
                      dir="ltr"
                    />
                    {productForm.image && (
                      <div className="mt-2 flex items-center gap-2 bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                        <img src={productForm.image} alt="معاينة" className="w-8 h-8 object-cover rounded-md border border-emerald-200" />
                        <span className="text-[10px] text-emerald-800 font-bold truncate flex-1">{productForm.image}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-semibold mb-1">وصف الصنف</label>
                <textarea
                  id="client-prod-description"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="وصف مختصر للمكونات أو الحجم..."
                  rows="3"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  id="client-prod-available"
                  type="checkbox"
                  checked={productForm.available}
                  onChange={(e) => setProductForm({ ...productForm, available: e.target.checked })}
                  className="w-5 h-5 accent-emerald-600 cursor-pointer"
                />
                <label htmlFor="client-prod-available" className="text-slate-700 text-sm font-semibold cursor-pointer">
                  توفير هذا المنتج للطلب فوراً في منيو العميل
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false);
                    resetProductForm();
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  id="client-prod-submit"
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow"
                >
                  حفظ الصنف 💾
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
