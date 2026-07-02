import { useEffect, useState, useRef } from 'react';
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
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [archiveOrders, setArchiveOrders] = useState([]);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Settings State
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
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
  const [statsFilter, setStatsFilter] = useState('today');
  const [allOrdersForStats, setAllOrdersForStats] = useState([]);

  // Order Acceptance Global Toggle State
  const [acceptingOrders, setAcceptingOrders] = useState(true);

  // Mobile Drawer Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // New Order Alarm State & Refs
  const [alarmActive, setAlarmActive] = useState(false);
  const [latestNewOrder, setLatestNewOrder] = useState(null);
  const [latestNewOrderCustomerName, setLatestNewOrderCustomerName] = useState('عميل المتجر');
  const audioIntervalRef = useRef(null);

  const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(() => {
    return localStorage.getItem('auto_accept_orders') === 'true';
  });
  const [countdown, setCountdown] = useState(5);
  const countdownIntervalRef = useRef(null);
  const alertedOrderIds = useRef(new Set());
  const hasInitializedAlerts = useRef(false);
  const [sliderImages, setSliderImages] = useState([]);
  const [sliderUploading, setSliderUploading] = useState(false);

  const toggleAutoAccept = () => {
    const nextVal = !autoAcceptEnabled;
    setAutoAcceptEnabled(nextVal);
    localStorage.setItem('auto_accept_orders', String(nextVal));
  };

  const fetchProfileName = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data?.name || 'عميل المتجر';
    } catch (e) {
      console.error(e);
      return 'عميل المتجر';
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err.message);
    }
  };

  const handleAcceptOrder = async (orderId, orderNumber) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'تم التأكيد' })
        .eq('id', orderId);
      
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'تم التأكيد' } : o));
      stopAlarm();
      setLatestNewOrder(null);
    } catch (err) {
      console.error('Error accepting order:', err);
    }
  };

  const handleRejectOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'ملغي' })
        .eq('id', orderId);
      
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ملغي' } : o));
      stopAlarm();
      setLatestNewOrder(null);
    } catch (err) {
      console.error('Error rejecting order:', err);
    }
  };

  const playLoudNotification = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      
      // Standard old mechanical bell frequencies (slightly discordant for penetration)
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(853, ctx.currentTime);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(960, ctx.currentTime);
      
      // LFO modulates the striker speed (16 strikes per second)
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(16, ctx.currentTime);
      
      // Set amplitude modulation depth
      lfoGain.gain.setValueAtTime(0.5, ctx.currentTime);
      
      // Connect components
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Main envelope (bell sound duration 1.2s)
      gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05); // Attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2); // Decay
      
      // Start/Stop
      lfo.start(ctx.currentTime);
      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      
      lfo.stop(ctx.currentTime + 1.2);
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.error('Audio failed:', e);
    }
  };

  const startAlarm = () => {
    playLoudNotification();
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    audioIntervalRef.current = setInterval(playLoudNotification, 2000);
    setAlarmActive(true);
  };

  const stopAlarm = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    setAlarmActive(false);
  };

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

  // Helper to convert date to YYYY-MM-DD in local timezone
  const getLocalDateString = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ===== STATS COMPUTE =====
  const computeStatsFromOrders = (orders, filter) => {
    let filtered = orders;
    const now = new Date();
    if (filter === 'today') {
      const todayStr = getLocalDateString(now);
      filtered = orders.filter(o => getLocalDateString(o.created_at) === todayStr);
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
      const dateStr = getLocalDateString(o.created_at);
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
    fetchProducts();
  }, []);

  // Manual test trigger for the new order modal (admin only)
  const triggerTestModal = () => {
    const testOrder = {
      id: 'test-' + Date.now(),
      order_number: Math.floor(10000000 + Math.random() * 90000000),
      phone: '0501234567',
      shipping_address: 'السودان - الخرطوم - شارع النيل',
      notes: 'طلب تجريبي للتحقق من الميزة',
      payment_method: 'cash',
      total_amount: 25000,
      items: [
        { name: products[0]?.name || 'عصير برتقال', price: 15000, quantity: 1, selectedSize: 'كبير' },
        { name: products[1]?.name || 'فاكهة مشكلة', price: 10000, quantity: 1, selectedSize: '' },
      ],
      user_id: null,
      admin_cleared: false,
    };
    setLatestNewOrder(testOrder);
    setLatestNewOrderCustomerName('عميل تجريبي');
    startAlarm();
  };

  const checkForNewOrders = async () => {
    if (!hasInitializedAlerts.current) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('admin_cleared', false)
        .eq('status', 'قيد الانتظار')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        // Find the first order that hasn't been alerted yet
        const unalertedOrder = data.find(order => !alertedOrderIds.current.has(order.id));
        if (unalertedOrder) {
          alertedOrderIds.current.add(unalertedOrder.id);
          setLatestNewOrder(unalertedOrder);
          startAlarm();
          setTimeout(() => fetchData(), 1500);
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  const checkForNewOrdersRef = useRef(checkForNewOrders);
  useEffect(() => {
    checkForNewOrdersRef.current = checkForNewOrders;
  }, [checkForNewOrders]);

  useEffect(() => {
    // 1. Initialize by fetching existing pending orders to prevent alerting old orders
    const initializeAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id')
          .eq('admin_cleared', false)
          .eq('status', 'قيد الانتظار');
        if (error) throw error;
        if (data) {
          data.forEach(order => alertedOrderIds.current.add(order.id));
        }
      } catch (err) {
        console.error('Failed to initialize order alerts:', err);
      } finally {
        hasInitializedAlerts.current = true;
      }
    };

    initializeAlerts();

    // 2. Web Worker for background interval polling (prevents mobile/tab throttling when in background/sleep)
    const blob = new Blob([
      `let timer = null;
       self.onmessage = function(e) {
         if (e.data === 'start') {
           if (timer) clearInterval(timer);
           timer = setInterval(() => {
             self.postMessage('tick');
           }, 6000);
         } else if (e.data === 'stop') {
           if (timer) clearInterval(timer);
         }
       };`
    ], { type: 'application/javascript' });

    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    worker.onmessage = (e) => {
      if (e.data === 'tick') {
        checkForNewOrdersRef.current();
      }
    };

    worker.postMessage('start');

    // 3. Realtime INSERT listener (fires if database permissions/RLS allows it)
    const pgChannel = supabase
      .channel('admin-realtime-orders-v5')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new;
          if (newOrder && !newOrder.admin_cleared && newOrder.status === 'قيد الانتظار') {
            if (!alertedOrderIds.current.has(newOrder.id)) {
              alertedOrderIds.current.add(newOrder.id);
              setLatestNewOrder(newOrder);
              startAlarm();
              setTimeout(() => fetchData(), 1500);
            }
          }
        }
      )
      .subscribe();

    // 4. Screen Wake Lock implementation (keeps screen active / prevents sleep)
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock acquired successfully! 🔓');
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err.message);
      }
    };

    const releaseWakeLock = async () => {
      try {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log('Screen Wake Lock released.');
        }
      } catch (err) {
        console.error('Wake Lock release error:', err);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      worker.postMessage('stop');
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      supabase.removeChannel(pgChannel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []); // eslint-disable-line

  // Countdown effect for auto-accepting orders
  useEffect(() => {
    if (latestNewOrder && autoAcceptEnabled) {
      setCountdown(5);
      
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            handleAcceptOrder(latestNewOrder.id, latestNewOrder.order_number);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [latestNewOrder, autoAcceptEnabled]);

  // Load customer name reactively when a new order is received
  useEffect(() => {
    if (latestNewOrder) {
      setLatestNewOrderCustomerName('عميل المتجر'); // reset
      const loadProfile = async () => {
        const name = await fetchProfileName(latestNewOrder.user_id);
        setLatestNewOrderCustomerName(name);
      };
      loadProfile();
    }
  }, [latestNewOrder]);

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

  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.75) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Canvas compression error'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (e) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setUploadingImage(true);
    setError('');

    try {
      let file = rawFile;
      try {
        file = await compressImage(rawFile, 800, 800, 0.75);
      } catch (err) {
        console.warn('Image compression failed, uploading original:', err);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `products/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage bucket 'product-images'
      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '31536000',
          contentType: file.type,
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

      // Auto-calculate base price: min of sizes prices, or keep form price if no sizes
      const autoPrice = cleanedSizes.length > 0
        ? Math.min(...cleanedSizes.map(s => s.price))
        : (Number(productForm.price) || 0);

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
      const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
      if (data) {
        setWhatsappPhone(data.whatsapp_phone || '');
        setBankName(data.bank_name || '');
        setBankAccount(data.bank_account || '');
        setBankHolderName(data.bank_holder_name || '');
        setDeliveryFee(data.delivery_fee !== undefined && data.delivery_fee !== null ? String(data.delivery_fee) : '15');
        setAcceptingOrders(data.accepting_orders ?? true);
      }

      const { data: contactData } = await supabase.from('app_settings').select('*').eq('id', 2).maybeSingle();
      if (contactData) {
        setContactPhone(contactData.whatsapp_phone || '');
        setContactEmail(contactData.bank_name || '');
      }

      // Fetch slider settings (id = 3)
      const { data: sliderData } = await supabase.from('app_settings').select('*').eq('id', 3).maybeSingle();
      if (sliderData && sliderData.bank_account) {
        try {
          const parsed = JSON.parse(sliderData.bank_account);
          if (Array.isArray(parsed)) {
            setSliderImages(parsed);
          } else {
            setSliderImages([]);
          }
        } catch (e) {
          setSliderImages([]);
        }
      } else {
        setSliderImages([]);
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

      const { error: contactErr } = await supabase.from('app_settings').upsert({
        id: 2,
        whatsapp_phone: contactPhone,
        bank_name: contactEmail,
        updated_at: new Date().toISOString()
      });
      if (contactErr) throw contactErr;

      setSettingsSuccess('تم حفظ الإعدادات ومعلومات التواصل بنجاح ✅');
    } catch (err) { setSettingsError(err.message || 'خطأ أثناء حفظ الإعدادات'); }
    finally { setSettingsLoading(false); }
  };

  const handleSaveSliderSettings = async () => {
    setSettingsLoading(true);
    setSettingsError('');
    setSettingsSuccess('');
    try {
      const { error } = await supabase.from('app_settings').upsert({
        id: 3,
        bank_name: 'hero_slider_settings',
        bank_account: JSON.stringify(sliderImages),
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setSettingsSuccess('تم حفظ صور السلايدر بنجاح 🖼️✨');
    } catch (err) {
      console.error('Error saving slider settings:', err);
      setSettingsError(err.message || 'حدث خطأ أثناء حفظ السلايدر');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUploadSliderImage = async (slotIdx, file) => {
    if (!file) return;
    setSliderUploading(true);
    setSettingsError('');
    setSettingsSuccess('');
    try {
      let finalFile = file;
      try {
        finalFile = await compressImage(file, 1200, 800, 0.75);
      } catch (cErr) {
        console.warn('Slider image compression failed:', cErr);
      }

      const fileExt = finalFile.name.split('.').pop() || 'jpg';
      const fileName = `hero_slider/slide_${slotIdx}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, finalFile, {
          contentType: finalFile.type,
          cacheControl: '31536000'
        });
      
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl || '';
      
      setSliderImages(prev => {
        const next = [...prev];
        next[slotIdx] = publicUrl;
        return next;
      });
      setSettingsSuccess(`تم رفع الصورة رقم ${slotIdx + 1} بنجاح 🖼️. اضغط على حفظ صور السلايدر لتأكيد التغيير.`);
    } catch (err) {
      console.error(err);
      setSettingsError(err.message || 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setSliderUploading(false);
    }
  };

  const handleDeleteSliderImage = (slotIdx) => {
    setSliderImages(prev => {
      const next = [...prev];
      next[slotIdx] = '';
      return next;
    });
    setSettingsSuccess(`تم مسح الصورة رقم ${slotIdx + 1}. تذكر الضغط على حفظ صور السلايدر.`);
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

            {/* Auto Accept toggle button */}
            <button
              onClick={toggleAutoAccept}
              className={`text-xs font-black px-4 py-2.5 rounded-xl shadow transition duration-200 hover:scale-[1.02] flex items-center gap-1.5 ${
                autoAcceptEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                  : 'bg-rose-600 hover:bg-rose-700 text-white font-bold'
              }`}
            >
              <span>{autoAcceptEnabled ? 'القبول التلقائي: مفعل 🤖' : 'القبول التلقائي: معطل 👤'}</span>
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

      {/* Mobile Drawer Navigation Trigger */}
      <div className="bg-white border-b border-slate-200 sticky top-[60px] z-35 shadow-sm md:hidden p-3 flex justify-between items-center">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="bg-slate-100 hover:bg-slate-250 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 border border-slate-200"
        >
          <span>☰</span> تصفح الأقسام
        </button>
        <div className="text-right text-xs font-bold text-slate-800 flex items-center gap-1">
          <span className="text-slate-400 font-normal">القسم الحالي:</span>
          <span>{
            activeTab === 'stats' ? '📊 إحصائيات وتقارير' :
            activeTab === 'orders' ? '📦 طلبات العملاء' :
            activeTab === 'products' ? '🍉 إدارة المنيو' :
            activeTab === 'settings' ? '⚙️ الإعدادات والأمان' : ''
          }</span>
        </div>
      </div>

      {/* Mobile Side Drawer Modal Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity duration-300 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer Sidebar */}
          <div 
            className="fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-50 p-6 flex flex-col justify-between text-right md:hidden transition-transform duration-300 ease-in-out"
            style={{ animation: 'slideRight 0.22s ease-out' }}
          >
            <div className="space-y-6">
              {/* Close Button & Brand */}
              <div className="flex justify-between items-center border-b pb-3">
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-lg p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg"
                >
                  ✕
                </button>
                <div className="flex items-center gap-1.5 font-black text-emerald-750">
                  <span>🍓</span>
                  <span>50 فاكهة</span>
                </div>
              </div>

              {/* Vertical Menu Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setActiveTab('stats'); setMobileMenuOpen(false); }}
                  className={`w-full text-right py-3 px-4 rounded-xl font-bold text-sm transition ${
                    activeTab === 'stats' 
                      ? 'bg-emerald-50 text-emerald-800' 
                      : 'text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  📊 إحصائيات وتقارير
                </button>

                <button
                  onClick={() => { setActiveTab('orders'); setMobileMenuOpen(false); }}
                  className={`w-full text-right py-3 px-4 rounded-xl font-bold text-sm transition flex justify-between items-center ${
                    activeTab === 'orders' 
                      ? 'bg-emerald-50 text-emerald-800' 
                      : 'text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>📦</span>
                    <span>طلبات العملاء</span>
                  </div>
                  {stats.pendingOrders > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                      {stats.pendingOrders}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('products'); setMobileMenuOpen(false); }}
                  className={`w-full text-right py-3 px-4 rounded-xl font-bold text-sm transition ${
                    activeTab === 'products' 
                      ? 'bg-emerald-50 text-emerald-800' 
                      : 'text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  🍉 إدارة المنيو والمنتجات
                </button>

                <button
                  onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
                  className={`w-full text-right py-3 px-4 rounded-xl font-bold text-sm transition ${
                    activeTab === 'settings' 
                      ? 'bg-purple-50 text-purple-800' 
                      : 'text-slate-650 hover:bg-purple-50'
                  }`}
                >
                  ⚙️ الإعدادات والأمان
                </button>
              </div>
            </div>

            {/* Bottom Status */}
            <div className="border-t pt-4 text-xs text-slate-400">
              أدمن لوحة تحكم 50 فاكهة
            </div>
          </div>
        </>
      )}

      {/* Desktop Tabs Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-[60px] z-30 shadow-sm hidden md:block">
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

      <style>{`
        @keyframes slideRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

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
                              <th className="p-4 text-center">التفاصيل</th>
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
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => setSelectedOrderDetail(order)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition duration-150 shadow-sm"
                                  >
                                    👁️ تفاصيل
                                  </button>
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
                                <th className="p-4 text-center">التفاصيل</th>
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
                                  <td className="p-4 text-center">
                                    <button
                                      onClick={() => setSelectedOrderDetail(order)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition duration-150 shadow-sm"
                                    >
                                      👁️ تفاصيل
                                    </button>
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

                  {/* LEFT: Account Security & Slider */}
                  <div className="space-y-6">
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

                    {/* Hero Slider Management */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                      <h3 className="text-lg font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
                        <span>🖼️</span> السلايدر الترحيبي (Hero Slider)
                      </h3>
                      <p className="text-xs text-slate-500">
                        إدارة صور الخلفية المتحركة في القسم الترحيبي للعملاء (يمكنك إضافة حتى 5 صور).
                      </p>

                      <div className="space-y-4">
                        {[0, 1, 2, 3, 4].map((idx) => {
                          const imgUrl = sliderImages[idx];
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 gap-4">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-600 text-sm">{idx + 1}</span>
                                {imgUrl ? (
                                  <img src={imgUrl} alt={`Slide ${idx + 1}`} className="w-12 h-12 object-cover rounded-lg border border-slate-300" />
                                ) : (
                                  <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center text-lg">📁</div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <label className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold px-3 py-2.5 rounded-lg cursor-pointer transition">
                                  رفع صورة
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadSliderImage(idx, file);
                                    }}
                                  />
                                </label>
                                {imgUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSliderImage(idx)}
                                    className="bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold px-3 py-2.5 rounded-lg transition"
                                  >
                                    حذف
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveSliderSettings}
                        disabled={settingsLoading || sliderUploading}
                        className="w-full bg-[#1B130D] hover:bg-[#2c2016] text-[#FFF7EC] font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow cursor-pointer"
                      >
                        {sliderUploading ? 'جاري الرفع والضغط...' : '💾 حفظ صور السلايدر'}
                      </button>
                    </div>
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

                      {/* Customer Contact Phone */}
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-slate-700">📞 رقم هاتف تواصل العملاء</label>
                        <p className="text-xs text-slate-400">مثال: +966558735605</p>
                        <input
                          type="text"
                          value={contactPhone}
                          onChange={e => setContactPhone(e.target.value)}
                          placeholder="+966558735605"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-left"
                          dir="ltr"
                        />
                      </div>

                      {/* Customer Contact Email */}
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-slate-700">✉️ البريد الإلكتروني للتواصل</label>
                        <p className="text-xs text-slate-400">مثال: info@50fakha.com</p>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={e => setContactEmail(e.target.value)}
                          placeholder="info@50fakha.com"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden text-right">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center flex-shrink-0">
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

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4 text-right overflow-y-auto flex-1">
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
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-300 rounded-xl bg-white">
                      لا توجد أحجام — سيُستخدم السعر الأساسي للمنتج
                    </p>
                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-1">السعر الأساسي (ج.س)</label>
                      <input
                        id="client-prod-price"
                        type="number"
                        min="0"
                        required
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        placeholder="مثال: 150"
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-bold"
                      />
                    </div>
                  </div>
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

      {/* Realtime New Order Notification Popup */}
      {alarmActive && latestNewOrder && (() => {
        const order = latestNewOrder;
        const subtotal = order.items?.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity)), 0) || 0;
        const deliveryFee = (Number(order.total_amount) || 0) - subtotal;
        
        return (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto text-right" dir="rtl">
            <div className="bg-[#FFF7EC] rounded-3xl shadow-2xl border-2 border-rose-500 max-w-2xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-slide-up">
              
              {/* Modal Header */}
              <div className="bg-rose-600 text-white p-5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-bounce">🚨</span>
                  <h3 className="text-xl font-black" style={{ fontFamily: "'Cairo', sans-serif" }}>
                    طلب جديد وارد الآن!
                  </h3>
                </div>
                <span className="font-mono text-sm bg-rose-700 px-3 py-1 rounded-full font-bold">
                  رقم الطلب: #{order.order_number}
                </span>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">
                
                {/* Auto Accept Indicator */}
                {autoAcceptEnabled && (
                  <div className="bg-emerald-50 border-r-4 border-emerald-500 text-emerald-800 p-4 rounded-xl shadow-xs font-bold text-center text-sm flex items-center justify-center gap-2 animate-pulse">
                    <span>⏱️</span>
                    <span>سيتم القبول التلقائي للطلب خلال: {countdown} ثوانٍ...</span>
                  </div>
                )}

                {/* Section 1: Customer Details */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3.5 shadow-xs">
                  <h4 className="font-bold text-slate-800 border-b pb-2 text-sm flex items-center gap-2">
                    <span>👤</span> بيانات العميل والتوصيل
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-650">
                    <div>
                      <span className="text-slate-400 font-bold block">اسم العميل</span>
                      <span className="text-slate-800 font-bold text-sm mt-0.5 block">{latestNewOrderCustomerName || 'عميل المتجر'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">رقم الهاتف</span>
                      <a href={`tel:${order.phone}`} className="text-emerald-700 font-bold text-sm mt-0.5 block font-mono hover:underline">{order.phone || order.customer_phone || '-'}</a>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 font-bold block">العنوان بالتفصيل</span>
                      <span className="text-slate-800 font-semibold mt-0.5 block leading-relaxed">{order.shipping_address || '-'}</span>
                    </div>
                    {order.notes && (
                      <div className="sm:col-span-2 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 text-amber-800">
                        <span className="text-slate-400 font-bold block text-[10px]">ملاحظات العميل</span>
                        <span className="font-semibold block mt-0.5">{order.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Ordered Items */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4 shadow-xs">
                  <h4 className="font-bold text-slate-800 border-b pb-2 text-sm flex items-center gap-2">
                    <span>🛒</span> الأصناف المطلوبة
                  </h4>
                  
                  <div className="divide-y divide-slate-100">
                    {order.items?.map((it, idx) => {
                      const prodInfo = products.find(p => p.name === it.name);
                      const imageUrl = prodInfo?.image;
                      
                      return (
                        <div key={idx} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-4">
                          <div className="flex items-center gap-3">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={it.name}
                                className="w-12 h-12 object-cover rounded-xl border border-slate-100 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-orange-100/60 flex items-center justify-center text-xl flex-shrink-0">
                                🍹
                              </div>
                            )}
                            <div>
                              <h5 className="font-bold text-slate-800 text-sm">
                                {it.name}
                                {it.selectedSize && (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-md mr-1.5 font-bold">
                                    {it.selectedSize}
                                  </span>
                                )}
                              </h5>
                              <p className="text-slate-400 text-xs mt-1">
                                {it.price} ج.س × {it.quantity}
                              </p>
                            </div>
                          </div>
                          
                          <span className="font-extrabold text-emerald-700 text-sm">
                            {Number(it.price) * Number(it.quantity)} ج.س
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Totals */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2.5 shadow-xs text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>المجموع الفرعي:</span>
                    <span className="font-semibold">{subtotal} ج.س</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>تكلفة التوصيل:</span>
                    <span className="font-semibold">{deliveryFee} ج.س</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black text-base border-t border-dashed pt-2.5 mt-2">
                    <span>الإجمالي الكلي:</span>
                    <span className="text-emerald-700">{order.total_amount} ج.س</span>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="p-5 bg-white border-t border-[#F0E1CC] flex gap-3 flex-shrink-0">
                <button
                  onClick={() => handleRejectOrder(order.id)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-2xl shadow-md transition active:scale-95 text-base cursor-pointer text-center"
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  ❌ رفض الطلب (إلغاء)
                </button>
                <button
                  onClick={() => handleAcceptOrder(order.id, order.order_number)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl shadow-md transition active:scale-95 text-base cursor-pointer text-center"
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  ✅ قبول وتأكيد الطلب
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Detailed Order View Modal */}
      {selectedOrderDetail && (() => {
        const order = selectedOrderDetail;
        const subtotal = order.items?.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity)), 0) || 0;
        const deliveryFee = order.total_amount - subtotal;
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[200] p-4">
            <div className="bg-[#FFF7EC] rounded-3xl shadow-2xl border border-[#F0E1CC] max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-right">
              {/* Header */}
              <div className="bg-[#1B130D] text-[#FFF7EC] p-5 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-black font-sans">
                    🧾 تفاصيل الطلب #{order.order_number || order.id?.slice(0, 8)}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOrderDetail(null)}
                  className="text-slate-400 hover:text-white text-xl p-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                
                {/* Section 1: Customer Details Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3.5 shadow-xs">
                  <h4 className="font-bold text-slate-800 border-b pb-2 text-sm flex items-center gap-2">
                    <span>👤</span> بيانات العميل والطلب
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-650">
                    <div>
                      <span className="text-slate-400 font-bold block">اسم العميل</span>
                      <span className="text-slate-800 font-bold text-sm mt-0.5 block">{order.user?.name || 'عميل المتجر'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">رقم الهاتف</span>
                      <a href={`tel:${order.phone}`} className="text-emerald-700 font-bold text-sm mt-0.5 block font-mono hover:underline">{order.phone || '-'}</a>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 font-bold block">العنوان بالتفصيل</span>
                      <span className="text-slate-800 font-semibold mt-0.5 block leading-relaxed">{order.shipping_address || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">تاريخ ووقت الطلب</span>
                      <span className="text-slate-800 font-semibold mt-0.5 block">
                        {new Date(order.created_at).toLocaleString('ar-SD', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">طريقة الدفع</span>
                      <span className="text-slate-800 font-bold mt-0.5 block">
                        {order.payment_method === 'bank' ? '🏦 تحويل بنكي' : '💵 الدفع عند الاستلام (كاش)'}
                      </span>
                    </div>
                  </div>

                  {order.payment_method === 'bank' && order.transfer_receipt && (
                    <div className="pt-3 border-t border-dashed border-slate-100">
                      <span className="text-slate-400 text-xs font-bold block mb-2">📸 إشعار التحويل المالي المرفق:</span>
                      <a
                        href={order.transfer_receipt}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block relative overflow-hidden rounded-xl border border-slate-200 group hover:shadow-md transition-shadow"
                      >
                        <img
                          src={order.transfer_receipt}
                          alt="إشعار التحويل البنكي"
                          className="max-h-48 w-auto object-contain bg-slate-50"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                          اضغط للتكبير 🔍
                        </div>
                      </a>
                    </div>
                  )}
                </div>

                {/* Section 2: Ordered Items Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4 shadow-xs">
                  <h4 className="font-bold text-slate-800 border-b pb-2 text-sm flex items-center gap-2">
                    <span>🛒</span> الأصناف المطلوبة
                  </h4>
                  
                  <div className="divide-y divide-slate-100">
                    {order.items?.map((it, idx) => {
                      const prodInfo = products.find(p => p.name === it.name);
                      const imageUrl = prodInfo?.image;
                      
                      return (
                        <div key={idx} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-4">
                          <div className="flex items-center gap-3">
                            {/* Product Thumb */}
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={it.name}
                                className="w-12 h-12 object-cover rounded-xl border border-slate-100 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-orange-100/60 flex items-center justify-center text-xl flex-shrink-0">
                                🍹
                              </div>
                            )}
                            <div>
                              <h5 className="font-bold text-slate-800 text-sm">
                                {it.name}
                                {it.selectedSize && (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-md mr-1.5 font-bold">
                                    {it.selectedSize}
                                  </span>
                                )}
                              </h5>
                              <p className="text-slate-400 text-xs mt-1">
                                {it.price} ج.س × {it.quantity}
                              </p>
                            </div>
                          </div>
                          
                          <span className="font-extrabold text-emerald-700 text-sm">
                            {Number(it.price) * Number(it.quantity)} ج.س
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Summary Invoice calculation */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2.5 shadow-xs text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>المجموع الفرعي:</span>
                    <span className="font-semibold">{subtotal} ج.س</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>تكلفة التوصيل:</span>
                    <span className="font-semibold">{deliveryFee} ج.س</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black text-base border-t border-dashed pt-2.5 mt-2">
                    <span>الإجمالي النهائي:</span>
                    <span className="text-emerald-700 text-lg">{order.total_amount} ج.س</span>
                  </div>
                </div>

              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 flex-shrink-0">
                {ordersSubTab === 'current' && (
                  <div className="flex-1 flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 whitespace-nowrap">تعديل حالة الطلب:</label>
                    <select
                      value={order.status}
                      onChange={(e) => {
                        handleStatusChange(order.id, e.target.value);
                        setSelectedOrderDetail({ ...order, status: e.target.value });
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="قيد الانتظار">قيد الانتظار</option>
                      <option value="تم التأكيد">تم التأكيد</option>
                      <option value="قيد التوصيل">قيد التوصيل</option>
                      <option value="تم التوصيل">تم التوصيل</option>
                      <option value="ملغي">ملغي</option>
                    </select>
                  </div>
                )}
                
                <button
                  onClick={() => setSelectedOrderDetail(null)}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  إغلاق التفاصيل 🚪
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
