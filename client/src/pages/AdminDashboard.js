import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
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
  const [activeTab, setActiveTab] = useState('stats');
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

  // Modals and Forms State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    description: '',
    category: 'عصائر طازجة',
    image: '',
    available: true
  });

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${user?.token}`
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'stats') {
        const res = await axios.get('http://localhost:5000/api/admin/stats', axiosConfig);
        setStats(res.data);
      } else if (activeTab === 'orders') {
        const res = await axios.get('http://localhost:5000/api/admin/orders', axiosConfig);
        setOrders(res.data);
      } else if (activeTab === 'products') {
        const res = await axios.get('http://localhost:5000/api/products');
        setProducts(res.data);
      }
    } catch (err) {
      console.error(err);
      setError('تعذر تحميل البيانات من السيرفر. تأكد من تشغيل الخلفية.');
    } finally {
      setLoading(false);
    }
  };

  // Orders Management
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/admin/orders/${orderId}/status`, { status: newStatus }, axiosConfig);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert('خطأ أثناء تعديل حالة الطلب');
    }
  };

  // Products CRUD
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        const res = await axios.put(`http://localhost:5000/api/products/${editingProduct._id}`, productForm, axiosConfig);
        setProducts(prev => prev.map(p => p._id === editingProduct._id ? res.data : p));
      } else {
        const res = await axios.post('http://localhost:5000/api/products', productForm, axiosConfig);
        setProducts(prev => [...prev, res.data]);
      }
      setShowProductModal(false);
      resetProductForm();
    } catch (err) {
      alert(err.response?.data?.message || 'خطأ أثناء حفظ المنتج');
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
      available: product.available ?? true
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا المنتج؟')) return;
    try {
      await axios.delete(`http://localhost:5000/api/products/${productId}`, axiosConfig);
      setProducts(prev => prev.filter(p => p._id !== productId));
    } catch (err) {
      alert('خطأ أثناء حذف المنتج');
    }
  };

  const handleToggleAvailable = async (product) => {
    const updatedStatus = !product.available;
    try {
      await axios.put(`http://localhost:5000/api/products/${product._id}`, { available: updatedStatus }, axiosConfig);
      setProducts(prev => prev.map(p => p._id === product._id ? { ...p, available: updatedStatus } : p));
    } catch (err) {
      alert('خطأ أثناء تحديث حالة توفر المنتج');
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
          <div className="bg-slate-800 text-slate-200 text-sm px-4 py-2 rounded-xl border border-slate-700 font-semibold">
            المدير: {user?.name || 'أدمن'}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-[60px] z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex gap-6">
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
                      <h3 className="text-3xl font-black text-emerald-700">{stats.totalSales} ج.م</h3>
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
                          <Tooltip formatter={(value) => [`${value} ج.م`, 'المبيعات']} labelStyle={{ color: '#000' }} />
                          <Legend />
                          <Area type="monotone" dataKey="sales" name="المبيعات (ج.م)" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
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
                          <tr key={order._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                            <td className="p-4 flex flex-col">
                              <span className="font-bold text-slate-800">{order.user?.name || 'مجهول'}</span>
                              <span className="text-slate-400 text-xs font-mono">{order.user?.email || ''}</span>
                            </td>
                            <td className="p-4 font-mono text-slate-600 text-sm">{order.phone || '-'}</td>
                            <td className="p-4 text-slate-600 text-sm max-w-[200px] truncate" title={order.shippingAddress}>
                              {order.shippingAddress}
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
                            <td className="p-4 font-extrabold text-emerald-700">{order.totalAmount} ج.م</td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <select
                                value={order.status}
                                onChange={(e) => handleStatusChange(order._id, e.target.value)}
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

            {/* TAB 3: PRODUCT MANAGEMENT / CRUD */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800">قائمة أصناف المنيو</h3>
                  <button
                    onClick={() => {
                      resetProductForm();
                      setShowProductModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition duration-200"
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
                            <th className="p-4">السعر</th>
                            <th className="p-4">الفئة</th>
                            <th className="p-4">الوصف</th>
                            <th className="p-4 text-center">التوفر للطلب</th>
                            <th className="p-4 text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((p) => (
                            <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                              <td className="p-4">
                                <img
                                  src={p.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=100'}
                                  alt={p.name}
                                  className="w-12 h-12 object-cover rounded-lg border border-slate-100"
                                />
                              </td>
                              <td className="p-4 font-bold text-slate-850">{p.name}</td>
                              <td className="p-4 font-extrabold text-emerald-700">{p.price} ج.م</td>
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
                                    onClick={() => handleDeleteProduct(p._id)}
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

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4 text-right">
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-slate-700 text-sm font-semibold mb-1">السعر (ج.م)</label>
                  <input
                    id="client-prod-price"
                    type="number"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="50"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-semibold mb-1">فئة الصنف</label>
                <select
                  id="client-prod-category"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                >
                  <option value="عصائر طازجة">عصائر طازجة</option>
                  <option value="سلطات فواكه">سلطات فواكه</option>
                  <option value="حلويات">حلويات</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-semibold mb-1">رابط صورة الصنف</label>
                <input
                  id="client-prod-image"
                  type="url"
                  value={productForm.image}
                  onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                  placeholder="https://example.com/mango-juice.jpg"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-left"
                  dir="ltr"
                />
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
