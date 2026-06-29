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

  // Archive State
  const [ordersSubTab, setOrdersSubTab] = useState('current');
  const [archiveOrders, setArchiveOrders] = useState([]);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Settings State
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolderName, setBankHolderName] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('15');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Stats Filter State
  const [statsFilter, setStatsFilter] = useState('all');
  const [allOrdersForStats, setAllOrdersForStats] = useState([]);

  // Order Acceptance Global Toggle State
  const [acceptingOrders, setAcceptingOrders] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'settings') fetchAppSettings();
  }, [activeTab]);

  // Recompute stats when filter changes (without re-fetching)
  useEffect(() => {
    if (allOrdersForStats.length >= 0 && activeTab === 'stats') {
      computeStatsFromOrders(allOrdersForStats, statsFilter);
    }
  }, [statsFilter]); // eslint-disable-line

  // ===== STATS COMPUTE =====
  const computeStatsFromOrders = (orders, filter) => {
    let filtered = orders;
    const now = new Date();
    if (filter === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      filtered = orders.filter(o => o.created_at?.startsWith(todayStr));
    } else if (filter === 'week') {
      const cutoff = new Date(now); cutoff.setDate(now.getDate() - 7);
      filtered = orders.filter(o => new Date(o.created_at) >= cutoff);
    } else if (filter === 'month') {
      const cutoff = new Date(now); cutoff.setDate(now.getDate() - 30);
      filtered = orders.filter(o => new Date(o.created_at) >= cutoff);
    }
    const totalOrders = filtered.length;
    const pendingOrders = filtered.filter(o => o.status === 'قيد الانتظار').length;
    const completedOrders = filtered.filter(o => o.status === 'تم التوصيل').length;
    const totalSales = filtered
      .filter(o => o.status !== 'ملغي')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const dailyMap = {};
    filtered.filter(o => o.status !== 'ملغي').forEach(o => {
      const dateStr = new Date(o.created_at).toISOString().split('T')[0];
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, sales: 0, orders: 0 };
      dailyMap[dateStr].sales += Number(o.total_amount) || 0;
      dailyMap[dateStr].orders += 1;
    });
    const salesByDate = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date));
    setStats({ totalOrders, pendingOrders, completedOrders, totalSales, salesByDate });
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'stats') {
        const { data: allOrders, error: ordErr } = await supabase
          .from('orders')
          .select('id, total_amount, status, created_at')
          .eq('admin_cleared', false)
          .order('created_at', { ascending: false });
        if (ordErr) throw ordErr;
        setAllOrdersForStats(allOrders || []);
        computeStatsFromOrders(allOrders || [], statsFilter);

      } else if (activeTab === 'orders') {
        // Auto-archive previous day orders first
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        await supabase
          .from('orders')
          .update({ archived: true })
          .lt('created_at', todayStart.toISOString())
          .eq('archived', false)
          .eq('admin_cleared', false);

        // Fetch only today's non-archived non-cleared orders
        const { data, error } = await supabase
          .from('orders')
          .select('*, profiles:user_id(name, id)')
          .eq('archived', false)
          .eq('admin_cleared', false)
          .order('created_at', { ascending: false });
        if (error) throw error;
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

  // Fetch archived orders (lazy — only when archive sub-tab is opened)
  const fetchArchiveOrders = async () => {
    setArchiveLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles:user_id(name, id)')
        .eq('archived', true)
        .eq('admin_cleared', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const formatted = (data || []).map(order => ({
        ...order,
        user: order.profiles ? { name: order.profiles.name, email: '' } : null
      }));
      setArchiveOrders(formatted);
    } catch (err) {
      console.error('Archive fetch error:', err);
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchAppSettings();
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

  // ===== SETTINGS HANDLERS =====
  const fetchAppSettings = async () => {
    try {
      const { data } = await supabase.from('app_settings').select('*').single();
      if (data) {
        setWhatsappPhone(data.whatsapp_phone || '');
        setBankName(data.bank_name || '');
        setBankAccount(data.bank_account || '');
        setBankHolderName(data.bank_holder_name || '');
        setDeliveryFee(data.delivery_fee !== undefined && data.delivery_fee !== null ? String(data.delivery_fee) : '15');
        setAcceptingOrders(data.accepting_orders ?? true);
      }
    } catch (err) { console.error('Settings fetch error:', err); }
  };

  const handleToggleAcceptingOrders = async () => {
    const nextVal = !acceptingOrders;
    setAcceptingOrders(nextVal);
    setSettingsError('');
    setSettingsSuccess('');
    try {
      const { error } = await supabase.from('app_settings').upsert({
        id: 1,
        accepting_orders: nextVal,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setSettingsSuccess(nextVal ? 'تم تفعيل استقبال الطلبات بنجاح 🟢' : 'تم إيقاف استقبال الطلبات بنجاح 🔴');
    } catch (err) {
      console.error('Error toggling accepting orders:', err);
      setSettingsError('حدث خطأ أثناء تعديل حالة استقبال الطلبات');
      setAcceptingOrders(!nextVal); // Rollback
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setSettingsLoading(true); setSettingsError(''); setSettingsSuccess('');
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setSettingsSuccess('تم إرسال رابط تأكيد البريد الجديد. تحقق من بريدك الإلكتروني.');
      setNewEmail('');
    } catch (err) { setSettingsError(err.message || 'خطأ أثناء تحديث البريد'); }
    finally { setSettingsLoading(false); }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setSettingsError('كلمتا المرور غير متطابقتين'); return; }
    if (newPassword.length < 6) { setSettingsError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setSettingsLoading(true); setSettingsError(''); setSettingsSuccess('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSettingsSuccess('تم تحديث كلمة المرور بنجاح ✅');
      setNewPassword(''); setConfirmPassword('');
    } catch (err) { setSettingsError(err.message || 'خطأ أثناء تحديث كلمة المرور'); }
    finally { setSettingsLoading(false); }
  };

  const handleSaveAppSettings = async (e) => {
    e.preventDefault();
    setSettingsLoading(true); setSettingsError(''); setSettingsSuccess('');
    try {
      const { error } = await supabase.from('app_settings').upsert({
        id: 1,
        whatsapp_phone: whatsappPhone,
        bank_name: bankName,
        bank_account: bankAccount,
        bank_holder_name: bankHolderName,
        delivery_fee: Number(deliveryFee) || 0,
        accepting_orders: acceptingOrders,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setSettingsSuccess('تم حفظ الإعدادات بنجاح ✅');
    } catch (err) { setSettingsError(err.message || 'خطأ أثناء حفظ الإعدادات'); }
    finally { setSettingsLoading(false); }
  };

  const handleResetData = async () => {
    const c1 = window.confirm('⚠️ هل أنت متأكد من تصفير جميع الطلبات والتقارير؟ هذا الإجراء لا يمكن التراجع عنه!');
    if (!c1) return;
    const c2 = window.confirm('⚠️ تأكيد أخير: سيتم إخفاء وتصفير جميع بيانات المبيعات الحالية من لوحة الأدمن نهائياً. هل تريد المتابعة؟');
    if (!c2) return;
    setSettingsLoading(true); setSettingsError(''); setSettingsSuccess('');
    try {
      const { error } = await supabase
        .from('orders')
        .update({ admin_cleared: true })
        .eq('admin_cleared', false);
      if (error) throw error;
      setSettingsSuccess('تم تصفير لوحة التحكم والتقارير بنجاح ✅');
      setStats({ totalOrders: 0, pendingOrders: 0, completedOrders: 0, totalSales: 0, salesByDate: [] });
      setOrders([]);
    } catch (err) { setSettingsError(err.message || 'خطأ أثناء التصفير'); }
    finally { setSettingsLoading(false); }
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
          <div className="flex items-center gap-3 flex-wrap">
            {/* Toggle accepting orders button */}
            <button
              onClick={handleToggleAcceptingOrders}
              className={`text-xs font-black px-4 py-2.5 rounded-xl shadow transition duration-200 hover:scale-[1.02] flex items-center gap-1.5 ${
                acceptingOrders
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              <span>{acceptingOrders ? 'استقبال الطلبات: مفعل 🟢' : 'استقبال الطلبات: مغلق 🔴'}</span>
            </button>

            <Link 
              to="/" 
              className="bg-slate-700 hover:bg-slate-800 hover:scale-[1.02] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition duration-200"
            >
              العودة للمتجر 🏪
            </Link>
            <div className="bg-slate-800 text-slate-200 text-sm px-4 py-2 rounded-xl border border-slate-700 font-semibold">
              المدير: {user?.name || 'أدمن'}
            </div>
            <button 
              onClick={handleLogoutClick}
              className="bg-slate-650 hover:bg-slate-700 hover:scale-[1.02] text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition duration-200"
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
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-3 font-extrabold text-sm border-b-4 transition-all duration-200 ${
              activeTab === 'settings'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            ⚙️ الإعدادات والأمان
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
              <div className="space-y-6">

                {/* Period Filter Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-slate-600 font-bold text-sm">📅 عرض بيانات:</span>
                  {[
                    { key: 'today', label: 'اليوم', icon: '☀️' },
                    { key: 'week',  label: 'هذا الأسبوع', icon: '📆' },
                    { key: 'month', label: 'هذا الشهر', icon: '🗓️' },
                    { key: 'all',   label: 'الكل', icon: '📊' },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setStatsFilter(key)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all duration-200 ${
                        statsFilter === key
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200 scale-105'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400'
                      }`}
                    >
                      <span>{icon}</span> {label}
                    </button>
                  ))}
                  <span className="text-xs text-slate-400 mr-auto">
                    {statsFilter === 'today' ? 'اليوم فقط' : statsFilter === 'week' ? 'آخر 7 أيام' : statsFilter === 'month' ? 'آخر 30 يوم' : 'جميع البيانات'}
                  </span>
                </div>

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

            {activeTab === 'orders' && (
              <div className="space-y-4">

                {/* Sub-tab switcher */}
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => setOrdersSubTab('current')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                      ordersSubTab === 'current'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400'
                    }`}
                  >
                    <span>🟢</span> طلبات اليوم
                    {orders.length > 0 && (
                      <span className="bg-white/30 text-white text-xs px-1.5 py-0.5 rounded-full font-black">{orders.length}</span>
                    )}
                  </button>
                  <button
                    onClick={() => { setOrdersSubTab('archive'); fetchArchiveOrders(); }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                      ordersSubTab === 'archive'
                        ? 'bg-slate-700 border-slate-700 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <span>📁</span> الأرشيف
                  </button>
                  <span className="text-xs text-slate-400 mr-auto">
                    {ordersSubTab === 'current' ? 'طلبات اليوم الحالي' : 'طلبات الأيام السابقة - تتم الأرشفة تلقائياً آخر كل يوم'}
                  </span>
                </div>

                {/* CURRENT ORDERS */}
                {ordersSubTab === 'current' && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-800">📦 طلبات اليوم</h3>
                      <span className="text-xs text-slate-400">تُؤرشف تلقائياً عند بداية كل يوم جديد</span>
                    </div>
                    {orders.length === 0 ? (
                      <div className="p-16 text-center text-slate-500 space-y-3">
                        <span className="text-4xl block">📦</span>
                        <p className="font-bold text-lg">لا توجد طلبات اليوم</p>
                        <p className="text-sm text-slate-400">طلبات الأيام السابقة محفوظة في الأرشيف</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 text-sm font-bold border-b border-slate-100">
                              <th className="p-4">رقم الطلب</th>
                              <th className="p-4">العميل</th>
                              <th className="p-4">رقم الهاتف</th>
                              <th className="p-4">العنوان</th>
                              <th className="p-4">الدفع</th>
                              <th className="p-4">الطلب</th>
                              <th className="p-4">المبلغ</th>
                              <th className="p-4 text-center">الحالة</th>
                              <th className="p-4 text-center">تعديل</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((order) => (
                              <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                                <td className="p-4 font-mono text-sm text-slate-800 font-bold">
                                  #{order.order_number || order.id?.slice(0, 8)}
                                </td>
                                <td className="p-4">
                                  <span className="font-bold text-slate-800">{order.user?.name || 'مجهول'}</span>
                                </td>
                                <td className="p-4 font-mono text-slate-600 text-sm">{order.phone || '-'}</td>
                                <td className="p-4 text-slate-600 text-sm max-w-[150px] truncate" title={order.shipping_address}>{order.shipping_address}</td>
                                <td className="p-4 text-xs font-bold">
                                  {order.payment_method === 'bank' ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-amber-800">🏦 تحويل بنكي</span>
                                      {order.transfer_receipt && (
                                        <a
                                          href={order.transfer_receipt}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] text-blue-600 underline hover:text-blue-800 flex items-center gap-0.5"
                                        >
                                          🖼️ عرض الإشعار
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-600">💵 عند الاستلام</span>
                                  )}
                                </td>
                                <td className="p-4">
                                  <div className="text-sm space-y-1">
                                    {order.items?.map((it, idx) => (
                                      <div key={idx} className="text-slate-700">
                                        <span className="font-bold text-emerald-600">{it.quantity}x</span> {it.name}
                                        {it.selectedSize && <span className="text-xs text-slate-400 mr-1">({it.selectedSize})</span>}
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

                {/* ARCHIVE TAB */}
                {ordersSubTab === 'archive' && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 space-y-3">
                      <h3 className="text-lg font-bold text-slate-800">📁 أرشيف الطلبات السابقة</h3>
                      {/* Search Box */}
                      <div className="relative">
                        <input
                          type="text"
                          value={archiveSearch}
                          onChange={e => setArchiveSearch(e.target.value)}
                          placeholder="🔍 ابحث برقم الطلب أو رقم الهاتف..."
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none text-right text-sm"
                        />
                        {archiveSearch && (
                          <button onClick={() => setArchiveSearch('')} className="absolute left-3 top-3 text-slate-400 hover:text-slate-700">✕</button>
                        )}
                      </div>
                    </div>

                    {archiveLoading ? (
                      <div className="p-12 text-center">
                        <div className="w-8 h-8 border-4 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-slate-500 text-sm">جاري تحميل الأرشيف...</p>
                      </div>
                    ) : (() => {
                      const filtered = archiveOrders.filter(o => {
                        if (!archiveSearch.trim()) return true;
                        const q = archiveSearch.trim().toLowerCase();
                        return o.id?.toLowerCase().includes(q) || 
                               o.order_number?.toLowerCase().includes(q) || 
                               o.phone?.toLowerCase().includes(q);
                      });
                      return filtered.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 space-y-3">
                          <span className="text-4xl block">📂</span>
                          <p className="font-bold">{archiveSearch ? 'لا توجد نتائج مطابقة' : 'الأرشيف فارغ حالياً'}</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600 text-sm font-bold border-b border-slate-100">
                                <th className="p-4">رقم الطلب</th>
                                <th className="p-4">التاريخ</th>
                                <th className="p-4">العميل</th>
                                <th className="p-4">رقم الهاتف</th>
                                <th className="p-4">الدفع</th>
                                <th className="p-4">الطلب</th>
                                <th className="p-4">المبلغ</th>
                                <th className="p-4 text-center">الحالة</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.map((order) => (
                                <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/40 transition">
                                  <td className="p-4">
                                    <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded-lg text-slate-700 font-bold">
                                      #{order.order_number || order.id?.slice(0, 8)}
                                    </span>
                                  </td>
                                  <td className="p-4 text-slate-500 text-xs">{new Date(order.created_at).toLocaleDateString('ar-SD')}</td>
                                  <td className="p-4 font-bold text-slate-800">{order.user?.name || 'مجهول'}</td>
                                  <td className="p-4 font-mono text-slate-600 text-sm">{order.phone || '-'}</td>
                                  <td className="p-4 text-xs font-bold">
                                    {order.payment_method === 'bank' ? (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-amber-800">🏦 تحويل بنكي</span>
                                        {order.transfer_receipt && (
                                          <a
                                            href={order.transfer_receipt}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-blue-600 underline hover:text-blue-800"
                                          >
                                            🖼️ عرض الإشعار
                                          </a>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-600">💵 عند الاستلام</span>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <div className="text-sm space-y-1">
                                      {order.items?.map((it, idx) => (
                                        <div key={idx} className="text-slate-600">
                                          <span className="font-bold text-slate-400">{it.quantity}x</span> {it.name}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="p-4 font-extrabold text-slate-700">{order.total_amount} ج.س</td>
                                  <td className="p-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                                      {order.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
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

            {/* TAB 4: SETTINGS & SECURITY */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">⚙️</span>
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">الإعدادات والأمان</h2>
                    <p className="text-slate-500 text-sm">إدارة حسابك وبيانات التواصل والحساب البنكي</p>
                  </div>
                </div>

                {/* Feedback Messages */}
                {settingsSuccess && (
                  <div className="bg-emerald-50 border-r-4 border-emerald-500 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <span className="font-semibold text-sm">{settingsSuccess}</span>
                  </div>
                )}
                {settingsError && (
                  <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-800 p-4 rounded-xl flex items-center gap-3">
                    <span className="text-2xl">❌</span>
                    <span className="font-semibold text-sm">{settingsError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* LEFT: Account Security */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
                      <span>🔐</span> أمان الحساب
                    </h3>

                    {/* Change Email */}
                    <form onSubmit={handleUpdateEmail} className="space-y-3">
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm mb-1">تغيير البريد الإلكتروني</h4>
                        <p className="text-xs text-slate-400 mb-2">البريد الحالي: <span className="font-semibold text-slate-600">{user?.email}</span></p>
                      </div>
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="البريد الإلكتروني الجديد"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-right"
                        dir="ltr"
                      />
                      <button
                        type="submit"
                        disabled={settingsLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                      >
                        <span>📧</span> تحديث البريد الإلكتروني
                      </button>
                    </form>

                    <hr className="border-slate-100" />

                    {/* Change Password */}
                    <form onSubmit={handleUpdatePassword} className="space-y-3">
                      <h4 className="font-bold text-slate-700 text-sm">تغيير كلمة المرور</h4>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-right"
                      />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="تأكيد كلمة المرور الجديدة"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-right"
                      />
                      <button
                        type="submit"
                        disabled={settingsLoading}
                        className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                      >
                        <span>🔑</span> تحديث كلمة المرور
                      </button>
                    </form>
                  </div>

                  {/* RIGHT: Contact, Bank, Danger Zone */}
                  <div className="space-y-6">

                    {/* Contact & Bank Settings */}
                    <form onSubmit={handleSaveAppSettings} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
                        <span>📱</span> إعدادات التواصل والبنك
                      </h3>

                      {/* WhatsApp */}
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-slate-700">📞 رقم الواتساب لاستقبال الطلبات</label>
                        <p className="text-xs text-slate-400">مثال: 249912345678 (بدون + أو مسافات)</p>
                        <input
                          type="tel"
                          value={whatsappPhone}
                          onChange={e => setWhatsappPhone(e.target.value)}
                          placeholder="249912345678"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-left"
                          dir="ltr"
                        />
                      </div>

                      {/* Bank Name */}
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-slate-700">🏦 اسم البنك</label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={e => setBankName(e.target.value)}
                          placeholder="مثال: بنك الخرطوم"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right"
                        />
                      </div>

                      {/* Bank Account Number */}
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-slate-700">💳 رقم الحساب البنكي</label>
                        <input
                          type="text"
                          value={bankAccount}
                          onChange={e => setBankAccount(e.target.value)}
                          placeholder="000-0000-0000"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-left"
                          dir="ltr"
                        />
                      </div>

                      {/* Bank Account Holder Name */}
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-slate-700">👤 اسم صاحب الحساب</label>
                        <input
                          type="text"
                          value={bankHolderName}
                          onChange={e => setBankHolderName(e.target.value)}
                          placeholder="الاسم الكامل لصاحب الحساب"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right"
                        />
                      </div>

                      {/* Delivery Fee */}
                      <div className="space-y-1 bg-amber-50 p-3 rounded-xl border border-amber-200">
                        <label className="block text-sm font-bold text-amber-800">🚚 سعر التوصيل (ج.س)</label>
                        <p className="text-xs text-amber-600">يُطبَّق تلقائياً على جميع طلبات العملاء</p>
                        <input
                          type="number"
                          min="0"
                          value={deliveryFee}
                          onChange={e => setDeliveryFee(e.target.value)}
                          placeholder="15"
                          className="w-full px-4 py-2.5 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-bold text-lg text-center"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={settingsLoading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-2.5 rounded-xl transition shadow flex items-center justify-center gap-2"
                      >
                        <span>💾</span> حفظ الإعدادات
                      </button>
                    </form>

                    {/* Danger Zone */}
                    <div className="bg-white p-6 rounded-2xl border-2 border-rose-200 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold text-rose-700 border-b border-rose-100 pb-3 flex items-center gap-2">
                        <span>⚠️</span> منطقة الخطر
                      </h3>
                      <p className="text-xs text-slate-500">هذه الإجراءات غير قابلة للتراجع بعد التنفيذ. تأكد تماماً قبل المتابعة.</p>
                      <button
                        onClick={handleResetData}
                        disabled={settingsLoading}
                        className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                      >
                        <span>🗑️</span> تصفير جميع الطلبات والتقارير
                      </button>
                      <button
                        onClick={handleLogoutClick}
                        className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                      >
                        <span>🚪</span> تسجيل الخروج
                      </button>
                    </div>
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
