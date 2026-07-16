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
    const currentEmail = user?.email?.toLowerCase();
    const isDedicatedAdmin = currentEmail === 'admin@50fakha.com';

    if (isDedicatedAdmin) {
      // 1. Verify if there are any active/current orders
      const activeOrders = orders.filter(o => o.status !== 'تم التوصيل' && o.status !== 'ملغي');
      if (activeOrders.length > 0) {
        alert(`⚠️ لا يمكنك تسجيل الخروج حالياً! هناك ${activeOrders.length} طلبات نشطة في لوحة التحكم. يرجى إكمالها (تم التوصيل) أو إلغاؤها (ملغي) أولاً قبل الخروج لحماية أعمالك.`);
        return;
      }

      // 2. Automatically close receiving orders and disable auto-accept
      try {
        await supabase.from('app_settings').upsert({
          id: 1,
          accepting_orders: false,
          updated_at: new Date().toISOString()
        });
        localStorage.setItem('auto_accept_orders', 'false');
      } catch (err) {
        console.error('Error disabling settings on logout:', err);
      }
    }

    // 3. Perform logout
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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
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
    discount_price: '',
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

  // Completed & Cancelled Orders (split from main orders list)
  const [completedOrders, setCompletedOrders] = useState([]);
  const [cancelledOrders, setCancelledOrders] = useState([]);

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

  // Campaign Settings State
  const [campaignActive, setCampaignActive] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignMarqueeText, setCampaignMarqueeText] = useState('');
  const [campaignDiscountPercentage, setCampaignDiscountPercentage] = useState(15);
  const [campaignFreeDelivery, setCampaignFreeDelivery] = useState(true);
  const [campaignStartDate, setCampaignStartDate] = useState('');
  const [campaignEndDate, setCampaignEndDate] = useState('');

  // Mobile Drawer Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // New Order Alarm State & Refs
  const [alarmActive, setAlarmActive] = useState(false);
  const [latestNewOrder, setLatestNewOrder] = useState(null);
  const [latestNewOrderCustomerName, setLatestNewOrderCustomerName] = useState('عميل المتجر');
  const audioIntervalRef = useRef(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const audioContextRef = useRef(null);

  const initAudio = async () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (ctx.state === 'running') {
        setAudioBlocked(false);
        console.log('AudioContext unlocked and running successfully! 🔊');
      } else {
        setAudioBlocked(true);
      }
    } catch (e) {
      console.warn('Failed to initialize audio:', e);
      setAudioBlocked(true);
    }
  };

  useEffect(() => {
    const handleUnlock = () => {
      initAudio();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUnlock);
      document.removeEventListener('touchstart', handleUnlock);
    };

    document.addEventListener('click', handleUnlock);
    document.addEventListener('touchstart', handleUnlock);

    // Initial check for autoplay block after 1.5 seconds
    const timer = setTimeout(() => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const tempCtx = new AudioContextClass();
        if (tempCtx.state === 'suspended') {
          setAudioBlocked(true);
        }
        tempCtx.close();
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleUnlock);
      document.removeEventListener('touchstart', handleUnlock);
    };
  }, []);

  const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(() => {
    return localStorage.getItem('auto_accept_orders') === 'true';
  });
  const [countdown, setCountdown] = useState(5);
  const countdownIntervalRef = useRef(null);
  const alertedOrderIds = useRef(new Set());
  const hasInitializedAlerts = useRef(false);
  const wakeLockRef = useRef(null);
  const wakeLockRenewRef = useRef(null);  // interval for periodic wake lock renewal
  const swRegistrationRef = useRef(null); // service worker registration for OS notifications
  const statusBroadcastChannelRef = useRef(null);
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
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    stopAlarm();
    setLatestNewOrder(null);

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'تم التأكيد' })
        .eq('id', orderId);
      
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'تم التأكيد' } : o));

      // Broadcast status update instantly
      if (statusBroadcastChannelRef.current) {
        statusBroadcastChannelRef.current.send({
          type: 'broadcast',
          event: 'status-update',
          payload: { orderId, status: 'تم التأكيد' }
        }).catch(err => console.warn('Broadcast send error:', err));
      }
    } catch (err) {
      console.error('Error accepting order:', err);
      alert('⚠️ عذراً، فشل قبول الطلب في قاعدة البيانات. يرجى التحقق من اتصالك بالإنترنت وإعادة المحاولة.');
    }
  };

  const handleRejectOrder = async (orderId) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    stopAlarm();
    setLatestNewOrder(null);

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'ملغي' })
        .eq('id', orderId);
      
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ملغي' } : o));

      // Broadcast status update instantly
      if (statusBroadcastChannelRef.current) {
        statusBroadcastChannelRef.current.send({
          type: 'broadcast',
          event: 'status-update',
          payload: { orderId, status: 'ملغي' }
        }).catch(err => console.warn('Broadcast send error:', err));
      }
    } catch (err) {
      console.error('Error rejecting order:', err);
      alert('⚠️ عذراً، فشل رفض وإلغاء الطلب في قاعدة البيانات. يرجى التحقق من اتصالك بالإنترنت وإعادة المحاولة.');
    }
  };

  const playLoudNotification = async () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        setAudioBlocked(true);
        try {
          await ctx.resume();
        } catch (e) {
          console.warn('Could not resume AudioContext:', e);
          return;
        }
      }

      if (ctx.state === 'running') {
        setAudioBlocked(false);
      }

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(853, ctx.currentTime);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(960, ctx.currentTime);
      
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(16, ctx.currentTime);
      
      lfoGain.gain.setValueAtTime(0.5, ctx.currentTime);
      
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05); // Attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2); // Decay
      
      lfo.start(ctx.currentTime);
      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      
      lfo.stop(ctx.currentTime + 1.2);
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.error('Audio failed:', e);
      setAudioBlocked(true);
    }
  };

  // Send OS notification via Service Worker (works even when tab is sleeping)
  const sendAdminOsNotification = (orderNumber) => {
    try {
      const swReg = swRegistrationRef.current;
      if (swReg && Notification.permission === 'granted') {
        // Use SW's showNotification for a true OS-level alert
        swReg.showNotification('🚨 طلب جديد وارد!', {
          body: 'طلب جديد #' + orderNumber + ' بانتظار قبولك الآن',
          icon: '/logo192.png',
          badge: '/logo192.png',
          dir: 'rtl',
          lang: 'ar',
          vibrate: [300, 100, 300, 100, 600],
          tag: 'admin-new-order-' + orderNumber,
          renotify: true,
          requireInteraction: true,  // stays on screen until admin taps it
          data: { url: '/admin' }
        });
      } else if ('Notification' in window && Notification.permission === 'granted') {
        // Fallback: standard browser notification
        const n = new Notification('🚨 طلب جديد وارد!', {
          body: 'طلب جديد #' + orderNumber + ' بانتظار قبولك',
          icon: '/logo192.png',
          dir: 'rtl',
          tag: 'admin-order-' + orderNumber,
          renotify: true,
        });
        n.onclick = () => { window.focus(); n.close(); };
      }
    } catch (e) {
      console.warn('Admin OS notification error:', e);
    }
  };

  const startAlarm = (orderNumber) => {
    playLoudNotification();
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    audioIntervalRef.current = setInterval(playLoudNotification, 2000);
    setAlarmActive(true);
    // Fire OS notification so admin gets alerted even if tab is sleeping
    if (orderNumber) sendAdminOsNotification(orderNumber);
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
        // Auto-archive previous day completed/cancelled orders
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        await supabase
          .from('orders')
          .update({ archived: true })
          .lt('created_at', todayStart.toISOString())
          .eq('archived', false)
          .eq('admin_cleared', false)
          .in('status', ['تم التوصيل', 'ملغي']);

        // Fetch all non-archived, non-cleared orders in one query
        const { data, error } = await supabase
          .from('orders')
          .select('*, profiles:user_id(name, id)')
          .eq('archived', false)
          .eq('admin_cleared', false)
          .order('created_at', { ascending: false });
        if (error) throw error;

        const formatted = (data || []).map(order => ({
          ...order,
          user: order.profiles ? { name: order.profiles.name, email: '' } : null
        }));

        // Split into current (active), completed, cancelled
        const ACTIVE_STATUSES = ['قيد الانتظار', 'تم التأكيد', 'قيد التجهيز', 'قيد التوصيل'];
        setOrders(formatted.filter(o => ACTIVE_STATUSES.includes(o.status)));
        setCompletedOrders(formatted.filter(o => o.status === 'تم التوصيل'));
        setCancelledOrders(formatted.filter(o => o.status === 'ملغي'));

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
    startAlarm(testOrder.order_number);
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
    let pgChannel = null;
    let broadcastChannel = null;
    let orderBroadcastChannel = null;

    // ── A. Register Service Worker + Request Notification Permission ──────────
    const setupServiceWorker = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.register('/sw.js');
          swRegistrationRef.current = reg;
          console.log('Admin SW registered ✅', reg.scope);
        }
        if ('Notification' in window && Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          console.log('Notification permission:', perm);
        }
      } catch (e) {
        console.warn('SW/Notification setup error:', e);
      }
    };
    setupServiceWorker();

    const setupSubscriptions = () => {
      try {
        if (pgChannel) supabase.removeChannel(pgChannel);
        if (broadcastChannel) supabase.removeChannel(broadcastChannel);
        if (orderBroadcastChannel) supabase.removeChannel(orderBroadcastChannel);
      } catch (e) {
        console.warn('Error clearing existing channels:', e);
      }

      // 0. Initialize shared status broadcast channel
      broadcastChannel = supabase.channel('order-status-broadcast');
      broadcastChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Admin subscribed to order-status-broadcast channel successfully! 📡');
        }
      });
      statusBroadcastChannelRef.current = broadcastChannel;

      // 0b. Subscribe to admin-broadcast-orders
      orderBroadcastChannel = supabase.channel('admin-broadcast-orders');
      orderBroadcastChannel
        .on('broadcast', { event: 'new-order' }, (payload) => {
          console.log('Received peer-to-peer new-order broadcast:', payload.payload);
          const newOrder = payload.payload;
          if (newOrder && !newOrder.admin_cleared) {
            if (!alertedOrderIds.current.has(newOrder.id)) {
              alertedOrderIds.current.add(newOrder.id);
              setLatestNewOrder(newOrder);
              startAlarm(newOrder.order_number);
              setTimeout(() => fetchData(), 1500);
            }
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Admin subscribed to admin-broadcast-orders channel successfully! 📡');
          }
        });

      // 3. Realtime INSERT listener
      pgChannel = supabase
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
                startAlarm(newOrder.order_number);
                setTimeout(() => fetchData(), 1500);
              }
            }
          }
        )
        .subscribe();
    };

    setupSubscriptions();

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

    // 2. Web Worker for background interval polling (prevents mobile throttling)
    const blob = new Blob([
      `let timer = null;
       self.onmessage = function(e) {
         if (e.data === 'start') {
           if (timer) clearInterval(timer);
           timer = setInterval(function() {
             self.postMessage('tick');
           }, 10000);
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

    // 4. Screen Wake Lock — acquire and renew every 45s to prevent expiry
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          // Release old lock before requesting new one
          if (wakeLockRef.current) {
            try { await wakeLockRef.current.release(); } catch (_) {}
          }
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock acquired/renewed ✅');
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
        }
      } catch (err) {
        console.error('Wake Lock release error:', err);
      }
    };

    requestWakeLock();

    // Renew wake lock every 45 seconds (it can expire silently on some devices)
    wakeLockRenewRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    }, 45000);

    // 5. Visibility change — re-acquire wake lock + reconnect subscriptions + scan for new orders
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Admin Dashboard became visible — reconnecting & scanning for new orders 🔄');
        requestWakeLock();
        setupSubscriptions();
        fetchData();
        // Small delay before checking to let subscriptions re-establish
        setTimeout(() => checkForNewOrdersRef.current(), 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      worker.postMessage('stop');
      worker.terminate();
      URL.revokeObjectURL(workerUrl);

      if (wakeLockRenewRef.current) {
        clearInterval(wakeLockRenewRef.current);
        wakeLockRenewRef.current = null;
      }

      try {
        if (pgChannel) supabase.removeChannel(pgChannel);
        if (broadcastChannel) supabase.removeChannel(broadcastChannel);
        if (orderBroadcastChannel) supabase.removeChannel(orderBroadcastChannel);
      } catch (e) {}

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []); // eslint-disable-line


  // Countdown effect for auto-accepting orders
  useEffect(() => {
    if (latestNewOrder && autoAcceptEnabled) {
      const orderTime = new Date(latestNewOrder.created_at);
      const ageMs = new Date() - orderTime;
      const isRecent = ageMs < 60000; // 60 seconds

      if (!isRecent) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        return;
      }

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
    const ACTIVE_STATUSES = ['قيد الانتظار', 'تم التأكيد', 'قيد التجهيز', 'قيد التوصيل'];

    // Gather the order from whichever list currently holds it
    const orderFromActive    = orders.find(o => o.id === orderId);
    const orderFromCompleted = completedOrders.find(o => o.id === orderId);
    const orderFromCancelled = cancelledOrders.find(o => o.id === orderId);
    const existingOrder = orderFromActive || orderFromCompleted || orderFromCancelled;
    if (!existingOrder) return;

    const updatedOrder = { ...existingOrder, status: newStatus };

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Remove the order from all three lists first
      const removeFromAll = (setter) => setter(prev => prev.filter(o => o.id !== orderId));
      removeFromAll(setOrders);
      removeFromAll(setCompletedOrders);
      removeFromAll(setCancelledOrders);

      // Place it in the correct list based on newStatus
      if (newStatus === 'تم التوصيل') {
        setCompletedOrders(prev => [updatedOrder, ...prev]);
      } else if (newStatus === 'ملغي') {
        setCancelledOrders(prev => [updatedOrder, ...prev]);
      } else if (ACTIVE_STATUSES.includes(newStatus)) {
        setOrders(prev => [updatedOrder, ...prev.filter(o => o.id !== orderId)]);
      }

      // Keep the detail modal in sync if open
      if (selectedOrderDetail?.id === orderId) {
        setSelectedOrderDetail(updatedOrder);
      }

      // Broadcast status update to client dashboards instantly
      if (statusBroadcastChannelRef.current) {
        statusBroadcastChannelRef.current.send({
          type: 'broadcast',
          event: 'status-update',
          payload: { orderId, status: newStatus }
        }).catch(err => console.warn('Broadcast send error:', err));
      }
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

      const discountVal = (productForm.discount_price === '' || productForm.discount_price === null || productForm.discount_price === undefined)
        ? null
        : (Number(productForm.discount_price) || null);

      const formData = {
        ...productForm,
        sizes: cleanedSizes,
        price: autoPrice,
        discount_price: discountVal
      };

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
      discount_price: product.discount_price !== undefined && product.discount_price !== null ? String(product.discount_price) : '',
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
      discount_price: '',
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
      case 'قيد التجهيز': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
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

        // Campaign fields mapping
        setCampaignActive(data.campaign_active ?? false);
        setCampaignTitle(data.campaign_title || 'مرور عام على الافتتاح!');
        setCampaignMarqueeText(data.campaign_marquee_text || 'بمناسبة مرور عام على الافتتاح! خصم 15% وتوصيل مجاني لمدة 3 أيام');
        setCampaignDiscountPercentage(data.campaign_discount_percentage !== undefined && data.campaign_discount_percentage !== null ? data.campaign_discount_percentage : 15);
        setCampaignFreeDelivery(data.campaign_free_delivery ?? true);

        const formatDatetimeLocal = (isoStr) => {
          if (!isoStr) return '';
          const d = new Date(isoStr);
          const pad = (n) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        setCampaignStartDate(formatDatetimeLocal(data.campaign_start_date));
        setCampaignEndDate(formatDatetimeLocal(data.campaign_end_date));
      }

      const { data: contactData } = await supabase.from('app_settings').select('*').eq('id', 2).maybeSingle();
      if (contactData) {
        setContactPhone(contactData.whatsapp_phone || '');
        setContactEmail(contactData.bank_name || '');
        
        // Load slider images from id = 2's bank_account field
        if (contactData.bank_account) {
          try {
            const parsed = JSON.parse(contactData.bank_account);
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

  const handleSaveCampaignSettings = async (e) => {
    e.preventDefault();
    setSettingsLoading(true); setSettingsError(''); setSettingsSuccess('');
    try {
      const { error } = await supabase.from('app_settings').upsert({
        id: 1,
        campaign_active: campaignActive,
        campaign_title: campaignTitle,
        campaign_marquee_text: campaignMarqueeText,
        campaign_discount_percentage: Number(campaignDiscountPercentage) || 0,
        campaign_free_delivery: campaignFreeDelivery,
        campaign_start_date: campaignStartDate ? new Date(campaignStartDate).toISOString() : null,
        campaign_end_date: campaignEndDate ? new Date(campaignEndDate).toISOString() : null,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setSettingsSuccess('تم حفظ إعدادات حملة العروض بنجاح! 🚀');
    } catch (err) {
      setSettingsError(err.message || 'خطأ أثناء حفظ إعدادات الحملة');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSliderSettings = async () => {
    setSettingsLoading(true);
    setSettingsError('');
    setSettingsSuccess('');
    try {
      const { error } = await supabase.from('app_settings').update({
        bank_account: JSON.stringify(sliderImages),
        updated_at: new Date().toISOString()
      }).eq('id', 2);
      
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
    setSettingsLoading(true); setSettingsError(''); setSettingsSuccess('');
    try {
      // 1. Check if there are active (uncompleted and not cancelled) orders
      const { data: activeOrdersList, error: checkErr } = await supabase
        .from('orders')
        .select('id, status')
        .eq('admin_cleared', false)
        .neq('status', 'تم التوصيل')
        .neq('status', 'ملغي');
      
      if (checkErr) throw checkErr;
      
      if (activeOrdersList && activeOrdersList.length > 0) {
        setSettingsError('⚠️ لا يمكن تصفير البيانات والتقارير لوجود طلبات نشطة (قيد الانتظار أو تم التأكيد). يرجى إكمال أو إلغاء جميع الطلبات أولاً!');
        setSettingsLoading(false);
        return;
      }

      // 2. Double confirmation prompts
      const c1 = window.confirm('⚠️ هل أنت متأكد من تصفير جميع الطلبات والتقارير؟ هذا الإجراء لا يمكن التراجع عنه!');
      if (!c1) { setSettingsLoading(false); return; }
      const c2 = window.confirm('⚠️ تأكيد أخير: سيتم إخفاء وتصفير جميع بيانات المبيعات الحالية من لوحة الأدمن نهائياً. هل تريد المتابعة؟');
      if (!c2) { setSettingsLoading(false); return; }

      // 3. Clear orders
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
      {/* Audio Activation Banner if blocked */}
      {audioBlocked && (
        <div className="bg-amber-600 text-white font-bold p-3 text-center text-xs sm:text-sm animate-pulse flex flex-col sm:flex-row items-center justify-center gap-2 border-b border-amber-700 shadow-md sticky top-[60px] z-[200]" style={{ fontFamily: "'Cairo', sans-serif" }}>
          <span>🔔 تنبيه: صوت تنبيهات الطلبات الجديدة مقيد بواسطة متصفحك. يرجى النقر على تفعيل أو الضغط على أي مكان في الصفحة للسماح بالأصوات.</span>
          <button 
            onClick={initAudio} 
            className="bg-white text-amber-950 hover:bg-amber-50 px-3.5 py-1 rounded-xl text-xs font-black shadow-sm transition active:scale-95 cursor-pointer"
          >
            تفعيل التنبيهات الصوتية 🔊
          </button>
        </div>
      )}
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white shadow-md p-5 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-5">
          <div className="flex items-center gap-3.5 text-right w-full md:w-auto">
            <div className="bg-slate-800 p-2.5 rounded-2xl border border-slate-700">
              <span className="text-2xl block">⚙️</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent" style={{ fontFamily: "'Cairo', sans-serif" }}>
                لوحة التحكم الإدارية
              </h1>
              <p className="text-slate-400 text-xs mt-0.5" style={{ fontFamily: "'Cairo', sans-serif" }}>
                إدارة المتجر | المدير: <span className="text-emerald-400 font-bold">{user?.name || 'أدمن'}</span>
              </p>
            </div>
          </div>
          
          <div className="w-full md:w-auto grid grid-cols-2 sm:flex sm:flex-row gap-2.5">
            {/* Toggle accepting orders button */}
            <button
              onClick={handleToggleAcceptingOrders}
              className={`text-xs font-black px-3.5 py-3 rounded-2xl shadow transition duration-200 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border ${
                acceptingOrders
                  ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 border-rose-500 hover:bg-rose-700 text-white'
              }`}
              style={{ fontFamily: "'Cairo', sans-serif" }}
            >
              <span>{acceptingOrders ? '🟢 استقبال الطلبات' : '🔴 استقبال الطلبات'}</span>
            </button>

            {/* Auto Accept toggle button */}
            <button
              onClick={toggleAutoAccept}
              className={`text-xs font-black px-3.5 py-3 rounded-2xl shadow transition duration-200 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border ${
                autoAcceptEnabled
                  ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 border-rose-500 hover:bg-rose-700 text-white'
              }`}
              style={{ fontFamily: "'Cairo', sans-serif" }}
            >
              <span>{autoAcceptEnabled ? '🤖 القبول التلقائي' : '👤 القبول اليدوي'}</span>
            </button>

            <Link 
              to="/" 
              className="bg-slate-800 border border-slate-700 hover:bg-slate-750 active:scale-95 text-white text-xs font-black px-3.5 py-3 rounded-2xl shadow transition duration-200 flex items-center justify-center gap-1.5 text-center"
              style={{ fontFamily: "'Cairo', sans-serif" }}
            >
              <span>🏪</span> العودة للمتجر
            </Link>

            <button 
              onClick={handleLogoutClick}
              className="bg-slate-800 border border-slate-700 hover:bg-slate-755 active:scale-95 text-rose-450 text-xs font-black px-3.5 py-3 rounded-2xl shadow transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ fontFamily: "'Cairo', sans-serif" }}
            >
              <span>🚪</span> خروج
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation Trigger */}
      <div className="bg-white border-b border-slate-200 sticky top-[60px] z-35 shadow-sm md:hidden p-2.5 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none" dir="rtl">
        {/* Right side: Drawer Menu Button for all sections */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition active:scale-95 border border-slate-200 shrink-0"
          style={{ fontFamily: "'Cairo', sans-serif" }}
        >
          <span>☰</span> الأقسام
        </button>

        {/* Left side: Direct shortcuts to Orders & Stats */}
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab('orders')}
            className={`font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 border shrink-0 ${
              activeTab === 'orders'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm ring-2 ring-emerald-100'
                : 'bg-rose-50 border-rose-100 text-[#b8295b] hover:bg-rose-100/70'
            }`}
            style={{ fontFamily: "'Cairo', sans-serif" }}
          >
            <span>📦 الطلبات الحالية</span>
            {stats.pendingOrders > 0 && (
              <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                {stats.pendingOrders}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`font-black px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 border shrink-0 ${
              activeTab === 'stats'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm ring-2 ring-emerald-100'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            style={{ fontFamily: "'Cairo', sans-serif" }}
          >
            <span>📊 الإحصائيات</span>
          </button>
        </div>
      </div>


      {/* Mobile Side Drawer Modal Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer Sidebar */}
          <div 
            className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-slate-50 shadow-2xl z-50 p-6 flex flex-col justify-between text-right md:hidden transition-transform duration-300 ease-in-out border-l border-slate-200"
            style={{ animation: 'slideRight 0.22s ease-out' }}
          >
            <div>
              {/* Close Button & Brand */}
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-500 hover:text-slate-800 text-lg p-2.5 bg-slate-200/60 hover:bg-slate-200 rounded-full transition duration-150 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
                <div className="flex items-center gap-2 font-black text-xl text-slate-800" style={{ fontFamily: "'Cairo', sans-serif" }}>
                  <span className="text-2xl">🍓</span>
                  <span>50 فاكهة</span>
                </div>
              </div>

              {/* Vertical Menu Buttons */}
              <div className="flex flex-col gap-3">
                {/* 1. Stats Card */}
                <button
                  onClick={() => { setActiveTab('stats'); setMobileMenuOpen(false); }}
                  className={`w-full text-right p-4 rounded-2xl font-bold text-sm transition duration-200 flex items-center justify-between gap-3 border cursor-pointer shadow-xs hover:shadow-sm ${
                    activeTab === 'stats' 
                      ? 'bg-white border-emerald-500 text-emerald-700 shadow-sm ring-2 ring-emerald-50' 
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350'
                  }`}
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  <span className="text-lg">📊</span>
                  <span className="font-extrabold text-sm">إحصائيات وتقارير</span>
                </button>

                {/* 2. Orders Card */}
                <button
                  onClick={() => { setActiveTab('orders'); setMobileMenuOpen(false); }}
                  className={`w-full text-right p-4 rounded-2xl font-bold text-sm transition duration-200 flex items-center justify-between gap-3 border cursor-pointer shadow-xs hover:shadow-sm ${
                    activeTab === 'orders' 
                      ? 'bg-white border-emerald-500 text-emerald-700 shadow-sm ring-2 ring-emerald-50' 
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350'
                  }`}
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  <div className="flex items-center gap-1.5">
                    {stats.pendingOrders > 0 && (
                      <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                        {stats.pendingOrders}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📦</span>
                    <span className="font-extrabold text-sm">طلبات العملاء</span>
                  </div>
                </button>

                {/* 3. Products Card */}
                <button
                  onClick={() => { setActiveTab('products'); setMobileMenuOpen(false); }}
                  className={`w-full text-right p-4 rounded-2xl font-bold text-sm transition duration-200 flex items-center justify-between gap-3 border cursor-pointer shadow-xs hover:shadow-sm ${
                    activeTab === 'products' 
                      ? 'bg-white border-emerald-500 text-emerald-700 shadow-sm ring-2 ring-emerald-50' 
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350'
                  }`}
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  <span className="text-lg">🍉</span>
                  <span className="font-extrabold text-sm">إدارة المنيو والمنتجات</span>
                </button>

                {/* 4. Settings Card */}
                <button
                  onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
                  className={`w-full text-right p-4 rounded-2xl font-bold text-sm transition duration-200 flex items-center justify-between gap-3 border cursor-pointer shadow-xs hover:shadow-sm ${
                    activeTab === 'settings' 
                      ? 'bg-white border-emerald-500 text-emerald-700 shadow-sm ring-2 ring-emerald-50' 
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350'
                  }`}
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  <span className="text-lg">⚙️</span>
                  <span className="font-extrabold text-sm">الإعدادات والأمان</span>
                </button>

                {/* 5. Campaign Card */}
                <button
                  onClick={() => { setActiveTab('campaign'); setMobileMenuOpen(false); }}
                  className={`w-full text-right p-4 rounded-2xl font-bold text-sm transition duration-200 flex items-center justify-between gap-3 border cursor-pointer shadow-xs hover:shadow-sm ${
                    activeTab === 'campaign' 
                      ? 'bg-white border-emerald-500 text-emerald-700 shadow-sm ring-2 ring-emerald-50' 
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350'
                  }`}
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  <span className="text-lg">📢</span>
                  <span className="font-extrabold text-sm">حملة العروض (مرور عام)</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions & Status */}
            <div>
              <div className="border-t border-slate-200 pt-4 mb-4 space-y-2">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full p-3 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition duration-150 flex items-center justify-center gap-2"
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  <span>🏪</span> العودة للمتجر
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogoutClick(); }}
                  className="w-full p-3 rounded-xl font-bold text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  <span>🚪</span> تسجيل الخروج
                </button>
              </div>
              <div className="text-center text-[10px] text-slate-400 font-bold" style={{ fontFamily: "'Cairo', sans-serif" }}>
                أدمن لوحة تحكم 50 فاكهة
              </div>
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
          <button
            onClick={() => setActiveTab('campaign')}
            className={`py-4 px-3 font-extrabold text-sm border-b-4 transition-all duration-200 ${
              activeTab === 'campaign'
                ? 'border-orange-600 text-orange-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            📢 حملة العروض (مرور عام)
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

                {/* Period Filter (Segmented Control) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700" style={{ fontFamily: "'Cairo', sans-serif" }}>📅 الفترة الزمنية:</span>
                    <span className="text-xs text-slate-400 font-bold" style={{ fontFamily: "'Cairo', sans-serif" }}>
                      ({statsFilter === 'today' ? 'اليوم فقط' : statsFilter === 'week' ? 'آخر 7 أيام' : statsFilter === 'month' ? 'آخر 30 يوم' : 'جميع البيانات'})
                    </span>
                  </div>

                  <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200 w-full sm:w-80 shadow-inner">
                    {[
                      { key: 'today', label: 'اليوم', icon: '☀️' },
                      { key: 'week',  label: 'أسبوع', icon: '📆' },
                      { key: 'month', label: 'شهر', icon: '🗓️' },
                      { key: 'all',   label: 'الكل', icon: '📊' },
                    ].map(({ key, label, icon }) => (
                      <button
                        key={key}
                        onClick={() => setStatsFilter(key)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl font-bold text-xs transition duration-200 cursor-pointer ${
                          statsFilter === key
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                        style={{ fontFamily: "'Cairo', sans-serif" }}
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
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

            {activeTab === 'orders' && (() => {
              // Helper: render an order card
              const OrderCard = ({ order, isReadOnly }) => {
                const timeStr = new Date(order.created_at).toLocaleTimeString('ar-SD', {
                  hour: '2-digit', minute: '2-digit', hour12: true
                });
                const dateStr = new Date(order.created_at).toLocaleDateString('ar-SD', {
                  day: 'numeric', month: 'short'
                });
                const itemsCount = order.items?.reduce((s, it) => s + Number(it.quantity), 0) || 0;

                const statusColors = {
                  'قيد الانتظار':  'bg-amber-50  border-amber-300  text-amber-700',
                  'تم التأكيد':    'bg-blue-50   border-blue-300   text-blue-700',
                  'قيد التجهيز':   'bg-indigo-50  border-indigo-300  text-indigo-700',
                  'قيد التوصيل':   'bg-purple-50 border-purple-300 text-purple-700',
                  'تم التوصيل':    'bg-emerald-50 border-emerald-300 text-emerald-700',
                  'ملغي':          'bg-rose-50   border-rose-300   text-rose-700',
                };
                const statusStyle = statusColors[order.status] || 'bg-slate-50 border-slate-200 text-slate-600';

                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderDetail(order)}
                    className="w-full text-right bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 p-4 group active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Right: order info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono font-black text-slate-800 text-base group-hover:text-emerald-700 transition-colors">
                            #{order.order_number || order.id?.slice(0, 8)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle}`}>
                            {order.status}
                          </span>
                          {order.payment_method === 'bank' && (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">🏦 تحويل</span>
                          )}
                        </div>
                        <p className="font-bold text-slate-700 text-sm truncate">
                          {order.user?.name || 'عميل المتجر'}
                        </p>
                        <p className="text-slate-400 text-xs mt-1 font-mono">{order.phone || '-'}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{itemsCount} صنف • {dateStr} {timeStr}</p>
                      </div>
                      {/* Left: amount + arrow */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="font-extrabold text-emerald-700 text-lg leading-none">
                          {order.total_amount}
                          <span className="text-xs font-bold text-emerald-600 mr-0.5">ج.س</span>
                        </span>
                        <span className="text-slate-300 group-hover:text-emerald-400 transition-colors text-lg">←</span>
                      </div>
                    </div>
                  </button>
                );
              };

              // Tab config
              const tabs = [
                {
                  key: 'current',
                  label: 'الحالية',
                  emoji: '🟢',
                  list: orders,
                  emptyMsg: 'لا توجد طلبات نشطة حالياً',
                  emptyIcon: '📦',
                  activeClass: 'bg-emerald-600 border-emerald-600 text-white',
                  badgeClass: 'bg-white/25 text-white',
                },
                {
                  key: 'completed',
                  label: 'المكتملة',
                  emoji: '✅',
                  list: completedOrders,
                  emptyMsg: 'لا توجد طلبات مكتملة',
                  emptyIcon: '✅',
                  activeClass: 'bg-teal-600 border-teal-600 text-white',
                  badgeClass: 'bg-white/25 text-white',
                },
                {
                  key: 'cancelled',
                  label: 'الملغية',
                  emoji: '❌',
                  list: cancelledOrders,
                  emptyMsg: 'لا توجد طلبات ملغية',
                  emptyIcon: '❌',
                  activeClass: 'bg-rose-600 border-rose-600 text-white',
                  badgeClass: 'bg-white/25 text-white',
                },
                {
                  key: 'archive',
                  label: 'الأرشيف',
                  emoji: '📁',
                  list: archiveOrders,
                  emptyMsg: 'الأرشيف فارغ حالياً',
                  emptyIcon: '📂',
                  activeClass: 'bg-slate-700 border-slate-700 text-white',
                  badgeClass: 'bg-white/20 text-white',
                },
              ];

              const activeTabConfig = tabs.find(t => t.key === ordersSubTab);

              return (
                <div className="space-y-4" dir="rtl">

                  {/* ─── 4-Tab Navigation Bar ─── */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex gap-2 overflow-x-auto">
                    {tabs.map(tab => {
                      const isActive = ordersSubTab === tab.key;
                      const count = tab.key === 'archive' ? null : tab.list.length;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => {
                            setOrdersSubTab(tab.key);
                            if (tab.key === 'archive') fetchArchiveOrders();
                          }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all whitespace-nowrap flex-shrink-0 ${
                            isActive
                              ? tab.activeClass + ' shadow-md'
                              : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>{tab.emoji}</span>
                          <span>{tab.label}</span>
                          {count !== null && count > 0 && (
                            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-black ${
                              isActive ? tab.badgeClass : 'bg-slate-200 text-slate-700'
                            }`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* ─── Current (Active) Orders ─── */}
                  {ordersSubTab === 'current' && (
                    <div>
                      {orders.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center space-y-3">
                          <span className="text-5xl block">📦</span>
                          <p className="font-bold text-lg text-slate-600">لا توجد طلبات نشطة حالياً</p>
                          <p className="text-sm text-slate-400">الطلبات المكتملة والملغية في تبويباتها الخاصة</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {orders.map(order => <OrderCard key={order.id} order={order} isReadOnly={false} />)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── Completed Orders ─── */}
                  {ordersSubTab === 'completed' && (
                    <div>
                      {completedOrders.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center space-y-3">
                          <span className="text-5xl block">✅</span>
                          <p className="font-bold text-lg text-slate-600">لا توجد طلبات مكتملة</p>
                          <p className="text-sm text-slate-400">ستظهر هنا الطلبات بعد تحديث حالتها إلى "تم التوصيل"</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {completedOrders.map(order => <OrderCard key={order.id} order={order} isReadOnly={true} />)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── Cancelled Orders ─── */}
                  {ordersSubTab === 'cancelled' && (
                    <div>
                      {cancelledOrders.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center space-y-3">
                          <span className="text-5xl block">❌</span>
                          <p className="font-bold text-lg text-slate-600">لا توجد طلبات ملغية</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {cancelledOrders.map(order => <OrderCard key={order.id} order={order} isReadOnly={true} />)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── Archive Tab ─── */}
                  {ordersSubTab === 'archive' && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-5 border-b border-slate-100 space-y-3">
                        <h3 className="text-lg font-bold text-slate-800">📁 أرشيف الطلبات السابقة</h3>
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
                          <div className="p-4 grid gap-3">
                            {filtered.map(order => (
                              <button
                                key={order.id}
                                onClick={() => setSelectedOrderDetail(order)}
                                className="w-full text-right bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-white transition p-4 group"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-mono font-bold text-slate-700">#{order.order_number || order.id?.slice(0, 8)}</span>
                                    <span className="text-slate-400 text-xs mr-3">
                                      {new Date(order.created_at).toLocaleDateString('ar-SD', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-slate-600">{order.user?.name || 'مجهول'}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(order.status)}`}>{order.status}</span>
                                    <span className="font-extrabold text-slate-700">{order.total_amount} ج.س</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                </div>
              );
            })()}


            {/* TAB 3: PRODUCT & CATEGORIES MANAGEMENT */}
            {activeTab === 'products' && (() => {
              const filteredProducts = selectedCategoryFilter === 'all'
                ? products
                : products.filter(p => p.category === selectedCategoryFilter);

              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Right side (span 2): Products list */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800" style={{ fontFamily: "'Cairo', sans-serif" }}>
                          أصناف المنيو ({filteredProducts.length})
                        </h3>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                          {selectedCategoryFilter === 'all' 
                            ? 'عرض جميع أصناف المنيو' 
                            : `عرض الأصناف في قسم: ${selectedCategoryFilter}`}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          resetProductForm();
                          setShowProductModal(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-sm flex items-center gap-2 transition duration-200 text-sm cursor-pointer w-full sm:w-auto justify-center"
                        style={{ fontFamily: "'Cairo', sans-serif" }}
                      >
                        <span>إضافة منتج جديد</span>
                        <span>➕</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {filteredProducts.length === 0 ? (
                        <div className="bg-white p-16 text-center text-slate-400 space-y-3 rounded-2xl border border-slate-100 shadow-xxs">
                          <span className="text-4xl block">🍍</span>
                          <p className="font-bold text-base">لا توجد منتجات في هذا القسم حالياً.</p>
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          {filteredProducts.map((p) => (
                            <div 
                              key={p.id} 
                              className="bg-white p-4 rounded-3xl border border-slate-100/80 shadow-xxs hover:shadow-xs hover:border-slate-200/50 transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-right"
                            >
                              {/* Product Info (Right) */}
                              <div className="flex items-center gap-4 w-full sm:w-auto">
                                <img
                                  src={p.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=100'}
                                  alt={p.name}
                                  className="w-16 h-16 object-cover rounded-2xl border border-slate-100/60 flex-shrink-0"
                                />
                                <div className="space-y-1">
                                  <h4 className="font-extrabold text-slate-800 text-sm sm:text-base" style={{ fontFamily: "'Cairo', sans-serif" }}>
                                    {p.name}
                                  </h4>
                                  <p className="text-slate-400 text-xs leading-relaxed max-w-sm sm:max-w-md truncate" title={p.description}>
                                    {p.description || 'لا يوجد وصف لهذا الصنف'}
                                  </p>
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    <span className="bg-amber-50 text-amber-800 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-100/30">
                                      📁 {p.category || 'غير محدد'}
                                    </span>
                                    {p.size && (
                                      <span className="bg-slate-100 text-slate-600 text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                        📏 {p.size}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Price, Availability & Actions (Left) */}
                              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50 flex-shrink-0">
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 font-bold block">السعر</span>
                                  <span className="text-sm sm:text-base font-extrabold text-[#F3760C] font-mono">{p.price} ج.س</span>
                                </div>

                                <button
                                  onClick={() => handleToggleAvailable(p)}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                                    p.available
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100/60 hover:bg-emerald-100/30'
                                      : 'bg-rose-50 text-rose-700 border-rose-100/60 hover:bg-rose-100/30'
                                  }`}
                                  style={{ fontFamily: "'Cairo', sans-serif" }}
                                >
                                  {p.available ? 'متوفر 🟢' : 'غير متوفر 🔴'}
                                </button>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditClick(p)}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition text-xs font-bold border border-slate-200/80 cursor-pointer flex items-center justify-center gap-1"
                                    style={{ fontFamily: "'Cairo', sans-serif" }}
                                  >
                                    ✏️ تعديل
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(p.id)}
                                    className="px-3 py-1.5 bg-rose-50/50 hover:bg-rose-100/70 text-rose-700 rounded-xl transition text-xs font-bold border border-rose-200/40 cursor-pointer flex items-center justify-center gap-1"
                                    style={{ fontFamily: "'Cairo', sans-serif" }}
                                  >
                                    🗑️ حذف
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Left side (span 1): Categories Management */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-800" style={{ fontFamily: "'Cairo', sans-serif" }}>📁 أقسام المنيو</h3>
                    </div>

                    {/* Add category form */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                      <h4 className="font-bold text-slate-700 text-xs sm:text-sm">إضافة قسم جديد</h4>
                      <form onSubmit={handleAddCategory} className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="مثال: مشروبات ساخنة"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right text-xs"
                        />
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition text-xs shadow-sm cursor-pointer"
                        >
                          إضافة ➕
                        </button>
                      </form>
                    </div>

                    {/* Categories list */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-right">
                      <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 text-xs sm:text-sm">
                        الأقسام الحالية
                      </div>
                      
                      <div className="divide-y divide-slate-100">
                        {/* All Filter Row */}
                        <div 
                          onClick={() => setSelectedCategoryFilter('all')}
                          className={`p-3.5 flex justify-between items-center gap-3 cursor-pointer transition-all duration-200 ${
                            selectedCategoryFilter === 'all' 
                              ? 'bg-amber-50/50 text-[#F3760C] border-r-4 border-[#F3760C] font-extrabold shadow-xxs' 
                              : 'hover:bg-slate-50/70 text-slate-650'
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-bold">📂 الكل (جميع الأصناف)</span>
                          <span className="bg-slate-200/80 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-extrabold font-mono">
                            {products.length}
                          </span>
                        </div>

                        {categories.length === 0 ? (
                          <div className="p-8 text-center text-slate-450 text-xs">
                            لا توجد أقسام مخصصة حالياً.
                          </div>
                        ) : (
                          categories.map((cat) => {
                            const catProductCount = products.filter(p => p.category === cat.name).length;
                            const isSelected = selectedCategoryFilter === cat.name;

                            return (
                              <div 
                                key={cat.id} 
                                onClick={() => setSelectedCategoryFilter(cat.name)}
                                className={`p-3.5 flex justify-between items-center gap-3 cursor-pointer transition-all duration-200 ${
                                  isSelected 
                                    ? 'bg-amber-50/50 text-[#F3760C] border-r-4 border-[#F3760C] font-extrabold shadow-xxs' 
                                    : 'hover:bg-slate-50/70 text-slate-650'
                                }`}
                              >
                                {editingCategory?.id === cat.id ? (
                                  <form 
                                    onSubmit={handleUpdateCategory} 
                                    className="flex gap-2 w-full"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="text"
                                      required
                                      value={editCategoryName}
                                      onChange={(e) => setEditCategoryName(e.target.value)}
                                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right text-xs"
                                    />
                                    <button
                                      type="submit"
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                    >
                                      حفظ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingCategory(null)}
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                    >
                                      إلغاء
                                    </button>
                                  </form>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs sm:text-sm font-bold">{cat.name}</span>
                                      <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-extrabold font-mono">
                                        {catProductCount}
                                      </span>
                                    </div>
                                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => {
                                          setEditingCategory(cat);
                                          setEditCategoryName(cat.name);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 text-xs font-semibold p-1 hover:bg-blue-50 rounded cursor-pointer"
                                      >
                                        ✏️ تعديل
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        className="text-rose-600 hover:text-rose-800 text-xs font-semibold p-1 hover:bg-rose-50 rounded cursor-pointer"
                                      >
                                        🗑️ حذف
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

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

            {/* TAB 5: PROMOTIONAL CAMPAIGN */}
            {activeTab === 'campaign' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">📢</span>
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">إدارة حملة العروض (مرور عام)</h2>
                    <p className="text-slate-500 text-sm">تفعيل وإدارة الحملات الترويجية والخصومات والتوصيل المجاني التلقائي</p>
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

                <form onSubmit={handleSaveCampaignSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LEFT: General Info & Timing */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                    <h3 className="text-lg font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
                      <span>⚙️</span> الإعدادات الأساسية والجدولة الزمنية
                    </h3>

                    {/* Campaign Title */}
                    <div className="space-y-1">
                      <label className="block text-sm font-bold text-slate-700">عنوان الحملة الترحيبية</label>
                      <input
                        type="text"
                        required
                        value={campaignTitle}
                        onChange={e => setCampaignTitle(e.target.value)}
                        placeholder="مثال: احتفلوا معنا بمرور عام على الافتتاح!"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Start Date */}
                    <div className="space-y-1">
                      <label className="block text-sm font-bold text-slate-700">تاريخ ووقت بدء العرض</label>
                      <input
                        type="datetime-local"
                        required
                        value={campaignStartDate}
                        onChange={e => setCampaignStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* End Date */}
                    <div className="space-y-1">
                      <label className="block text-sm font-bold text-slate-700">تاريخ ووقت انتهاء العرض</label>
                      <input
                        type="datetime-local"
                        required
                        value={campaignEndDate}
                        onChange={e => setCampaignEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Campaign Active Switch */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <span className="block text-sm font-bold text-slate-850">تفعيل الحملة ترويجياً</span>
                        <span className="block text-[11px] text-slate-400">عند إلغاء هذا الخيار لن يظهر العرض حتى لو كان الزمن مناسباً</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={campaignActive}
                          onChange={e => setCampaignActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>

                  {/* RIGHT: Offer discounts & Marquee banner */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                    <h3 className="text-lg font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
                      <span>💸</span> نسبة الخصم والشريط المتحرك
                    </h3>

                    {/* Discount percentage */}
                    <div className="space-y-1">
                      <label className="block text-sm font-bold text-slate-700">نسبة الخصم التلقائي على السلة (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={campaignDiscountPercentage}
                        onChange={e => setCampaignDiscountPercentage(e.target.value)}
                        placeholder="15"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Free Delivery Switch */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <span className="block text-sm font-bold text-slate-850">توصيل مجاني بالكامل</span>
                        <span className="block text-[11px] text-slate-400">تصفير تكلفة التوصيل لجميع الطلبات أثناء تشغيل الحملة</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={campaignFreeDelivery}
                          onChange={e => setCampaignFreeDelivery(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    {/* Marquee Banner Text */}
                    <div className="space-y-1">
                      <label className="block text-sm font-bold text-slate-700">نص الشريط الإعلاني المتحرك</label>
                      <textarea
                        required
                        rows="3"
                        value={campaignMarqueeText}
                        onChange={e => setCampaignMarqueeText(e.target.value)}
                        placeholder="اكتب هنا نص التهنئة الذي سيتحرك في أعلى شاشة المتجر..."
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Save Button */}
                    <button
                      type="submit"
                      disabled={settingsLoading}
                      className="w-full bg-[#F3760C] hover:bg-[#D97706] disabled:bg-orange-350 text-white font-extrabold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                      style={{ fontFamily: "'Cairo', sans-serif" }}
                    >
                      <span>💾</span> حفظ إعدادات حملة العروض الترويجية
                    </button>
                  </div>
                </form>
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
                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-1">السعر بعد الخصم (ج.س) - اختياري</label>
                      <input
                        id="client-prod-discount-price"
                        type="number"
                        min="0"
                        value={productForm.discount_price}
                        onChange={(e) => setProductForm({ ...productForm, discount_price: e.target.value })}
                        placeholder="اتركه فارغاً في حال عدم وجود خصم"
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
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 flex-shrink-0 flex-wrap">
                {/* Status change — only shown for active (non-completed, non-cancelled) orders */}
                {order.status !== 'تم التوصيل' && order.status !== 'ملغي' ? (
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <label className="text-xs font-bold text-slate-500 whitespace-nowrap">تعديل الحالة:</label>
                    <select
                      value={order.status}
                      onChange={(e) => {
                        handleStatusChange(order.id, e.target.value);
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {/* Only show valid next statuses based on current status */}
                      {order.status === 'قيد الانتظار' && <>
                        <option value="قيد الانتظار">قيد الانتظار</option>
                        <option value="تم التأكيد">✅ تم التأكيد</option>
                        <option value="ملغي">❌ ملغي</option>
                      </>}
                      {order.status === 'تم التأكيد' && <>
                        <option value="تم التأكيد">تم التأكيد</option>
                        <option value="قيد التجهيز">👨‍🍳 قيد التجهيز</option>
                        <option value="ملغي">❌ ملغي</option>
                      </>}
                      {order.status === 'قيد التجهيز' && <>
                        <option value="قيد التجهيز">قيد التجهيز</option>
                        <option value="قيد التوصيل">🚚 قيد التوصيل</option>
                        <option value="ملغي">❌ ملغي</option>
                      </>}
                      {order.status === 'قيد التوصيل' && <>
                        <option value="قيد التوصيل">قيد التوصيل</option>
                        <option value="تم التوصيل">✅ تم التوصيل</option>
                      </>}
                    </select>
                  </div>
                ) : (
                  /* Read-only status badge for completed/cancelled */
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">الحالة:</span>
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black border ${
                      order.status === 'تم التوصيل'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                      {order.status === 'تم التوصيل' ? '✅ ' : '❌ '}{order.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">• للقراءة فقط</span>
                  </div>
                )}
                
                <button
                  onClick={() => setSelectedOrderDetail(null)}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  إغلاق 🚪
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
