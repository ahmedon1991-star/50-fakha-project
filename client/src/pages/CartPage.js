import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [error, setError] = useState('');

  const [deliveryFee, setDeliveryFee] = useState(15);
  const [acceptingOrders, setAcceptingOrders] = useState(true);

  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolderName, setBankHolderName] = useState('');

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'bank'
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState(null);
  const [insertedOrderId, setInsertedOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState('قيد الانتظار');
  const [whatsappSent, setWhatsappSent] = useState(false);

  // Real-time subscription to track order approval status (Postgres changes + Instant WebSocket Broadcast + Polling Fallback)
  useEffect(() => {
    if (!insertedOrderId) return;

    let currentStatus = 'قيد الانتظار';
    let stopped = false;

    // Immediately fetch current status from DB to avoid missing updates
    const fetchCurrentStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('status')
          .eq('id', insertedOrderId)
          .maybeSingle();
        if (!error && data && data.status !== currentStatus) {
          currentStatus = data.status;
          setOrderStatus(data.status);
        }
      } catch (err) {
        console.error('Initial status fetch error:', err);
      }
    };
    fetchCurrentStatus();

    // 1. Subscribe to Broadcast channel (Super fast instant WebSocket)
    const broadcastChannel = supabase
      .channel('order-status-broadcast')
      .on(
        'broadcast',
        { event: 'status-update' },
        (payload) => {
          const { orderId, status } = payload.payload || {};
          // Compare as strings to handle type differences
          if (String(orderId) === String(insertedOrderId)) {
            console.log('Received broadcast status update:', status);
            currentStatus = status;
            setOrderStatus(status);
          }
        }
      )
      .subscribe();

    // 2. Subscribe to Postgres Changes (Database replication fallback)
    const postgresChannel = supabase
      .channel(`order-status-${insertedOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${insertedOrderId}`
        },
        (payload) => {
          const updatedOrder = payload.new;
          if (updatedOrder) {
            console.log('Realtime order update received:', updatedOrder);
            currentStatus = updatedOrder.status;
            setOrderStatus(updatedOrder.status);
          }
        }
      )
      .subscribe();

    // 3. Robust Polling Fallback - polls every 2 seconds, never stops until final status
    const pollInterval = setInterval(async () => {
      if (stopped) return;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('status')
          .eq('id', insertedOrderId)
          .maybeSingle();
        
        if (!error && data) {
          if (data.status !== currentStatus) {
            console.log('Polling detected status update:', data.status);
            currentStatus = data.status;
            setOrderStatus(data.status);
          }
          // Stop polling only when reaching a truly final state
          if (data.status === 'ملغي' || data.status === 'تم التوصيل') {
            stopped = true;
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 2000);

    return () => {
      stopped = true;
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(postgresChannel);
      clearInterval(pollInterval);
    };
  }, [insertedOrderId]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('delivery_fee, accepting_orders, whatsapp_phone, bank_name, bank_account, bank_holder_name')
          .eq('id', 1)
          .maybeSingle();
        if (data) {
          if (data.delivery_fee !== null && data.delivery_fee !== undefined) {
            setDeliveryFee(Number(data.delivery_fee));
          }
          if (data.accepting_orders !== null && data.accepting_orders !== undefined) {
            setAcceptingOrders(data.accepting_orders);
          }
          setWhatsappPhone(data.whatsapp_phone || '');
          setBankName(data.bank_name || '');
          setBankAccount(data.bank_account || '');
          setBankHolderName(data.bank_holder_name || '');
        }
      } catch (err) {
        console.error('Could not fetch app settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const compressImage = (file, maxWidth = 1000, maxHeight = 1000, quality = 0.7) => {
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

  const grandTotal = totalAmount + deliveryFee;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('يرجى تسجيل الدخول أولاً لتتمكن من إتمام الطلب');
      return;
    }
    if (cartItems.length === 0) {
      setError('عربة التسوق فارغة');
      return;
    }
    if (!acceptingOrders) {
      setError('نعتذر منك، استقبال الطلبات مغلق حالياً من قِبل الإدارة. يرجى المحاولة لاحقاً 🚫');
      return;
    }

    if (paymentMethod === 'bank' && !receiptFile) {
      setError('يرجى إرفاق إشعار التحويل البنكي لإتمام الطلب');
      return;
    }

    // Validate phone number: must be exactly 10 digits (strip spaces and hyphens first)
    const cleanPhone = phone.replace(/[\s-]/g, '');
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError('يرجى إدخال رقم هاتف صحيح مكون من 10 أرقام (مثال: 0912345678)');
      return;
    }

    // Save cleaned phone back to state
    setPhone(cleanPhone);

    setError('');
    setLoading(true);
    setUploadingReceipt(false);

    try {
      // 1. Generate 8-digit order number
      const orderNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
      let receiptUrl = '';

      // 2. Upload Bank receipt if bank payment
      if (paymentMethod === 'bank' && receiptFile) {
        setUploadingReceipt(true);
        let finalReceiptFile = receiptFile;
        try {
          finalReceiptFile = await compressImage(receiptFile, 1000, 1000, 0.7);
        } catch (err) {
          console.warn('Receipt compression failed, uploading original:', err);
        }

        const fileExt = finalReceiptFile.name.split('.').pop();
        const fileName = `receipts/${orderNumber}_receipt.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, finalReceiptFile, {
            contentType: finalReceiptFile.type,
            cacheControl: '31536000'
          });
        
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        receiptUrl = publicUrlData?.publicUrl || '';
        setUploadingReceipt(false);
      }

      // 3. Insert order
      const orderPayload = {
        user_id: user.id,
        order_number: orderNumber,
        payment_method: paymentMethod,
        transfer_receipt: receiptUrl,
        items: cartItems.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          selectedSize: item.selectedSize || null
        })),
        total_amount: grandTotal,
        shipping_address: address,
        phone: cleanPhone,
        status: 'قيد الانتظار'
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select('id')
        .single();

      if (insertError) throw insertError;

      const insertedId = insertedData?.id;
      setInsertedOrderId(insertedId);
      setOrderStatus('قيد الانتظار');
      setWhatsappSent(false);

      // Notify admin dashboard via broadcast (works even without RLS full-access for INSERT events)
      try {
        await supabase.channel('admin-broadcast-orders').send({
          type: 'broadcast',
          event: 'new-order',
          payload: {
            id: insertedId,
            order_number: orderNumber,
            phone: cleanPhone,
            shipping_address: address,
            total_amount: grandTotal,
            payment_method: paymentMethod,
            items: orderPayload.items,
            notes: '',
            user_id: user?.id,
            admin_cleared: false
          }
        });
      } catch (broadcastErr) {
        console.warn('Broadcast notify failed (non-critical):', broadcastErr);
      }

      // Save details for success screen invoice preview & WhatsApp link
      const savedDetails = {
        orderNumber,
        items: cartItems,
        totalAmount,
        deliveryFee,
        grandTotal,
        address,
        phone: cleanPhone,
        paymentMethod,
        receiptUrl,
        bankName,
        bankAccount,
        bankHolderName
      };
      setLastOrderDetails(savedDetails);

      setOrderSuccess(true);
      clearCart();
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء إتمام الطلب، حاول مرة أخرى');
    } finally {
      setLoading(false);
      setUploadingReceipt(false);
    }
  };

  const sendToWhatsApp = (details) => {
    if (!whatsappPhone) return;

    const divider = '━━━━━━━━━━━━━━━━━━━━';
    const formattedItems = details.items.map(item => 
      `• *${item.name}* ${item.selectedSize ? `(_${item.selectedSize}_)` : ''}\n` +
      `  الكمية: *${item.quantity}* ✖️ ${item.price} ج.س = *${item.price * item.quantity} ج.س*`
    ).join('\n\n');

    const paymentText = details.paymentMethod === 'bank' 
      ? '🏦 تحويل بنكي (مرفق إشعار التحويل)' 
      : '💵 الدفع عند الاستلام (كاش)';

    const bankDetailsSection = details.paymentMethod === 'bank'
      ? `\n*تفاصيل التحويل البنكي للتأكيد:*\n🏦 البنك: ${details.bankName}\n💳 رقم الحساب: ${details.bankAccount}\n👤 صاحب الحساب: ${details.bankHolderName}\n🔗 *رابط إشعار التحويل:* ${details.receiptUrl}\n`
      : '';

    const message = `✨ *فاتورة طلب جديدة - 50 فاكهة* ✨\n` +
      `${divider}\n` +
      `🆔 *رقم الطلب:* \`#${details.orderNumber}\`\n` +
      `👤 *اسم العميل:* ${user?.name || 'عميل المتجر'}\n` +
      `📞 *رقم الهاتف:* ${details.phone}\n` +
      `📍 *العنوان:* ${details.address}\n` +
      `💳 *طريقة الدفع:* ${paymentText}\n` +
      `${divider}\n\n` +
      `🛒 *الأصناف المطلوبة:*\n\n${formattedItems}\n\n` +
      `${divider}\n` +
      `📊 *تفاصيل الحساب:*\n` +
      `▫️ المجموع الفرعي: ${details.totalAmount} ج.س\n` +
      `▫️ تكلفة التوصيل: ${details.deliveryFee} ج.س\n` +
      `💰 *الإجمالي الكلي:* *${details.grandTotal} ج.س*\n` +
      `${divider}\n` +
      bankDetailsSection +
      `\n💚 شكراً لطلبك من 50 فاكهة!`;

    const cleanPhone = whatsappPhone.replace('+', '').trim();
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const generateInvoiceCanvas = async (details) => {
    const canvas = document.createElement('canvas');
    const width = 600;
    
    // Dynamic height based on items and address wrapping
    const itemHeight = 45;
    const baseHeight = 350;
    const totalsHeight = 140;
    
    // Temporary context to measure address wrapping
    const tempCtx = canvas.getContext('2d');
    tempCtx.font = 'bold 15px Cairo, Arial, sans-serif';
    
    const addressText = details.address || '';
    const maxAddressWidth = 350;
    const words = addressText.split(' ');
    let line = '';
    const lines = [];
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = tempCtx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxAddressWidth && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    
    const addressPadding = (lines.length - 1) * 22;
    const height = baseHeight + (details.items.length * itemHeight) + totalsHeight + addressPadding;
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    
    // 1. Background
    ctx.fillStyle = '#FFFBF7';
    ctx.fillRect(0, 0, width, height);
    
    // 2. Load Logo
    const img = new Image();
    img.src = '/logo.png';
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
    
    let startY = 35;
    if (img.complete && img.naturalWidth > 0) {
      const logow = 140;
      const logoh = (img.naturalHeight / img.naturalWidth) * logow;
      ctx.drawImage(img, (width - logow) / 2, startY, logow, logoh);
      startY += logoh + 25;
    } else {
      ctx.fillStyle = '#C95A06';
      ctx.font = 'bold 28px Cairo, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('50 فاكهة 🍹', width / 2, startY + 20);
      startY += 55;
    }
    
    // Title
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 22px Cairo, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧾 فاتورة شراء', width / 2, startY);
    startY += 30;
    
    // 3. Customer Info Box
    const infoBoxY = startY;
    ctx.fillStyle = '#FFF7EC';
    ctx.strokeStyle = '#F0E1CC';
    ctx.lineWidth = 1.5;
    
    let boxCurrentY = infoBoxY + 28;
    
    // Set standard styles
    ctx.textAlign = 'right';
    
    // Draw Order Number
    ctx.fillStyle = '#6B5C4F';
    ctx.font = '16px Cairo, Arial, sans-serif';
    ctx.fillText('رقم الطلب:', width - 50, boxCurrentY);
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 15px Courier New, monospace';
    ctx.fillText(`#${details.orderNumber}`, width - 160, boxCurrentY);
    boxCurrentY += 28;
    
    // Customer Name
    ctx.font = '16px Cairo, Arial, sans-serif';
    ctx.fillStyle = '#6B5C4F';
    ctx.fillText('اسم العميل:', width - 50, boxCurrentY);
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 16px Cairo, Arial, sans-serif';
    ctx.fillText(user?.name || 'عميل المتجر', width - 160, boxCurrentY);
    boxCurrentY += 28;

    // Customer Phone
    ctx.font = '16px Cairo, Arial, sans-serif';
    ctx.fillStyle = '#6B5C4F';
    ctx.fillText('رقم الهاتف:', width - 50, boxCurrentY);
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 15px Courier New, monospace';
    ctx.fillText(details.phone, width - 160, boxCurrentY);
    boxCurrentY += 28;
    
    // Address (wrapped)
    ctx.font = '16px Cairo, Arial, sans-serif';
    ctx.fillStyle = '#6B5C4F';
    ctx.fillText('العنوان:', width - 50, boxCurrentY);
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 15px Cairo, Arial, sans-serif';
    
    lines.forEach((l, idx) => {
      ctx.fillText(l.trim(), width - 160, boxCurrentY + (idx * 22));
    });
    boxCurrentY += (lines.length * 22) + 6;
    
    // Payment Method
    ctx.font = '16px Cairo, Arial, sans-serif';
    ctx.fillStyle = '#6B5C4F';
    ctx.fillText('طريقة الدفع:', width - 50, boxCurrentY);
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 15px Cairo, Arial, sans-serif';
    ctx.fillText(details.paymentMethod === 'bank' ? 'تحويل بنكي 🏦' : 'الدفع عند الاستلام 💵', width - 160, boxCurrentY);
    
    const infoBoxHeight = boxCurrentY - infoBoxY + 18;
    
    // Draw the rounded box path now
    const radius = 15;
    ctx.strokeStyle = '#F0E1CC';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30 + radius, infoBoxY);
    ctx.lineTo(width - 30 - radius, infoBoxY);
    ctx.quadraticCurveTo(width - 30, infoBoxY, width - 30, infoBoxY + radius);
    ctx.lineTo(width - 30, infoBoxY + infoBoxHeight - radius);
    ctx.quadraticCurveTo(width - 30, infoBoxY + infoBoxHeight, width - 30 - radius, infoBoxY + infoBoxHeight);
    ctx.lineTo(30 + radius, infoBoxY + infoBoxHeight);
    ctx.quadraticCurveTo(30, infoBoxY + infoBoxHeight, 30, infoBoxY + infoBoxHeight - radius);
    ctx.lineTo(30, infoBoxY + radius);
    ctx.quadraticCurveTo(30, infoBoxY, 30 + radius, infoBoxY);
    ctx.closePath();
    ctx.stroke();
    
    startY = infoBoxY + infoBoxHeight + 35;
    
    // 4. Items Table Header
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 16px Cairo, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('الأصناف المطلوبة:', width - 30, startY);
    startY += 20;
    
    ctx.strokeStyle = '#F0E1CC';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, startY);
    ctx.lineTo(width - 30, startY);
    ctx.stroke();
    startY += 10;
    
    // Loop through items
    details.items.forEach((item) => {
      ctx.fillStyle = '#1B130D';
      ctx.font = 'bold 15px Cairo, Arial, sans-serif';
      ctx.textAlign = 'right';
      
      const sizeText = item.selectedSize ? ` (${item.selectedSize})` : '';
      ctx.fillText(`• ${item.name}${sizeText}`, width - 35, startY + 15);
      
      ctx.fillStyle = '#6B5C4F';
      ctx.font = '14px Cairo, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`(${item.quantity}x)  ${item.price} ج.س`, 170, startY + 15);
      
      ctx.fillStyle = '#1B130D';
      ctx.font = 'bold 15px Courier New, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${item.price * item.quantity} ج.س`, 35, startY + 15);
      
      startY += itemHeight;
    });
    
    startY += 10;
    
    ctx.strokeStyle = '#F0E1CC';
    ctx.beginPath();
    ctx.moveTo(30, startY);
    ctx.lineTo(width - 30, startY);
    ctx.stroke();
    startY += 20;
    
    // 5. Totals Box
    const totalsBoxY = startY;
    const totalsBoxHeight = 110;
    ctx.fillStyle = '#FFF7EC';
    ctx.strokeStyle = '#FFE3C2';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(30 + radius, totalsBoxY);
    ctx.lineTo(width - 30 - radius, totalsBoxY);
    ctx.quadraticCurveTo(width - 30, totalsBoxY, width - 30, totalsBoxY + radius);
    ctx.lineTo(width - 30, totalsBoxY + totalsBoxHeight - radius);
    ctx.quadraticCurveTo(width - 30, totalsBoxY + totalsBoxHeight, width - 30 - radius, totalsBoxY + totalsBoxHeight);
    ctx.lineTo(30 + radius, totalsBoxY + totalsBoxHeight);
    ctx.quadraticCurveTo(30, totalsBoxY + totalsBoxHeight, 30, totalsBoxY + totalsBoxHeight - radius);
    ctx.lineTo(30, totalsBoxY + radius);
    ctx.quadraticCurveTo(30, totalsBoxY, 30 + radius, totalsBoxY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#6B5C4F';
    ctx.font = '15px Cairo, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('المجموع الفرعي:', width - 50, totalsBoxY + 30);
    ctx.fillText('تكلفة التوصيل:', width - 50, totalsBoxY + 60);
    
    ctx.fillStyle = '#E14133';
    ctx.font = 'bold 18px Cairo, Arial, sans-serif';
    ctx.fillText('الإجمالي الكلي:', width - 50, totalsBoxY + 92);
    
    ctx.fillStyle = '#1B130D';
    ctx.font = 'bold 15px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${details.totalAmount} ج.س`, 50, totalsBoxY + 30);
    ctx.fillText(`${details.deliveryFee} ج.س`, 50, totalsBoxY + 60);
    
    ctx.fillStyle = '#E14133';
    ctx.font = 'bold 20px Courier New, monospace';
    ctx.fillText(`${details.grandTotal} ج.س`, 50, totalsBoxY + 92);
    
    // Footer
    ctx.fillStyle = '#6B5C4F';
    ctx.font = 'bold 15px Cairo, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💚 شكراً لطلبك من 50 فاكهة! 💚', width / 2, totalsBoxY + totalsBoxHeight + 35);
    
    return canvas;
  };

  const copyInvoiceAsImage = async () => {
    try {
      const canvas = await generateInvoiceCanvas(lastOrderDetails);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        alert('📋 تم نسخ صورة الفاتورة الاحترافية لحافظة جهازك بنجاح! يمكنك الآن لصقها (Ctrl + V) مباشرة للعميل في المحادثة.');
      }, 'image/png');
    } catch (err) {
      console.error(err);
      alert('تعذر نسخ الصورة تلقائياً. يرجى تحميل الفاتورة كصورة أولاً.');
    }
  };

  const copyInvoiceAsImageQuiet = async () => {
    const canvas = await generateInvoiceCanvas(lastOrderDetails);
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        try {
          if (!blob) throw new Error('Blob generation failed');
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve();
        } catch (e) {
          reject(e);
        }
      }, 'image/png');
    });
  };

  const downloadInvoiceAsImage = async () => {
    try {
      const canvas = await generateInvoiceCanvas(lastOrderDetails);
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `invoice_${lastOrderDetails.orderNumber}.png`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحميل الفاتورة.');
    }
  };

  const shareViaWhatsApp = async () => {
    // Always send full invoice text via WhatsApp
    sendToWhatsApp(lastOrderDetails);
    // Attempt to also copy invoice image to clipboard silently (bonus feature)
    try {
      await copyInvoiceAsImageQuiet();
    } catch (err) {
      // Clipboard copy is optional, don't block WhatsApp sharing
      console.warn('Clipboard image copy failed (non-critical):', err);
    }
  };

  if (orderSuccess && lastOrderDetails) {
    const isPending = orderStatus === 'قيد الانتظار';
    const isRejected = orderStatus === 'ملغي';
    const isAccepted = orderStatus !== 'قيد الانتظار' && orderStatus !== 'ملغي';

    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-start p-4 pb-12 pt-10 bg-gradient-to-br from-slate-50 to-slate-100 w-screen h-screen overflow-y-auto" style={{ fontFamily: "'Cairo', sans-serif" }}>
        <div className="max-w-xl w-full bg-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-100 text-center space-y-6 animate-slideInUp">
          
          {/* 1. Icon & Status Banner */}
          {isPending && (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-4xl mx-auto border-4 border-amber-100 animate-pulse">
                ⏳
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-amber-950">في انتظار مراجعة الطلب...</h2>
                <p className="text-slate-500 text-xs sm:text-sm font-bold leading-relaxed px-4">
                  جاري مراجعة طلبك وتأكيده من قبل الكاشير حالياً. يرجى إبقاء هذه الصفحة مفتوحة.
                </p>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center text-4xl mx-auto border-4 border-rose-100 animate-bounce">
                ❌
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-rose-950">عذراً، تم إلغاء الطلب!</h2>
                <p className="text-slate-500 text-xs sm:text-sm font-bold leading-relaxed px-4">
                  لقد تم رفض وإلغاء طلبك من قبل إدارة المتجر.
                </p>
              </div>
            </div>
          )}

          {isAccepted && (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto border-4 border-emerald-100">
                ✅
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-emerald-950">تم قبول وتأكيد طلبك!</h2>
                {!whatsappSent ? (
                  <p className="text-rose-700 text-xs sm:text-sm font-extrabold leading-relaxed px-4 bg-rose-50 border border-rose-100 py-3 rounded-2xl">
                    ⚠️ إجراء إجباري: يرجى الضغط على زر الإرسال للواتساب لمشاركة الفاتورة مع المتجر لتأكيد عنوان الشحن وبدء التوصيل.
                  </p>
                ) : (
                  <p className="text-emerald-800 text-xs sm:text-sm font-extrabold leading-relaxed px-4 bg-emerald-50 border border-emerald-100 py-3 rounded-2xl">
                    🎉 تم إرسال الإشعار بنجاح! يمكنك الآن إنهاء الطلب والعودة للمتجر.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 2. Invoice Card Preview */}
          <div className="bg-slate-50 rounded-2xl p-5 text-right border border-slate-200/80 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-slate-800 text-sm sm:text-base">🧾 تفاصيل الفاتورة</span>
              <span className="font-mono text-[10px] bg-slate-200/60 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                رقم الطلب: #{lastOrderDetails.orderNumber}
              </span>
            </div>
            
            <div className="space-y-1.5 text-xs sm:text-sm text-slate-600">
              <p>👤 **العميل:** {user?.name}</p>
              <p>📞 **الهاتف:** {lastOrderDetails.phone}</p>
              <p>📍 **العنوان:** {lastOrderDetails.address}</p>
              <p>💳 **طريقة الدفع:** {lastOrderDetails.paymentMethod === 'bank' ? 'تحويل بنكي 🏦' : 'الدفع عند الاستلام 💵'}</p>
            </div>

            <div className="border-t pt-3 space-y-2">
              {lastOrderDetails.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs sm:text-sm text-slate-700">
                  <span>{it.quantity}x {it.name} {it.selectedSize ? `(${it.selectedSize})` : ''}</span>
                  <span className="font-semibold">{it.price * it.quantity} ج.س</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed pt-3 space-y-1 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-500">
                <span>المجموع الفرعي:</span>
                <span>{lastOrderDetails.totalAmount} ج.س</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>تكلفة التوصيل:</span>
                <span>{lastOrderDetails.deliveryFee} ج.س</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black text-xs sm:text-sm border-t pt-2.5 mt-1.5">
                <span>الإجمالي الكلي:</span>
                <span className="text-emerald-700 text-sm sm:text-base">{lastOrderDetails.grandTotal} ج.s</span>
              </div>
            </div>
          </div>

          {/* 3. Action Buttons */}
          <div className="space-y-3">
            {/* If pending, no buttons allowed to close */}
            {isPending && (
              <div className="flex items-center justify-center gap-2.5 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-amber-700 text-xs sm:text-sm font-bold">
                <div className="w-4 h-4 border-2 border-amber-700 border-t-transparent rounded-full animate-spin"></div>
                <span>يرجى الانتظار، في انتظار رد الإدارة...</span>
              </div>
            )}

            {/* If rejected, allow closing to cart/home */}
            {isRejected && (
              <button
                onClick={() => {
                  setOrderSuccess(false);
                  setInsertedOrderId(null);
                  setOrderStatus('قيد الانتظار');
                }}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-4 rounded-2xl transition duration-200 text-sm cursor-pointer shadow-sm"
              >
                العودة للمتجر وإعادة المحاولة 🏪
              </button>
            )}

            {/* If accepted, enforce WhatsApp click */}
            {isAccepted && (
              <>
                {!whatsappSent ? (
                  <button
                    onClick={() => {
                      shareViaWhatsApp();
                      setWhatsappSent(true);
                    }}
                    className="w-full bg-[#25D366] hover:bg-[#20ba56] text-white font-black py-3.5 px-4 rounded-2xl shadow-md transition duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    <span>💬</span> إرسال الفاتورة للواتساب وتأكيد الشحن
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setOrderSuccess(false);
                      setInsertedOrderId(null);
                      setOrderStatus('قيد الانتظار');
                      setWhatsappSent(false);
                      navigate('/orders'); // redirect to orders history
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-4 rounded-2xl transition duration-200 text-sm cursor-pointer shadow-sm animate-pulse"
                  >
                    إتمام وإنهاء الطلب والعودة للمتجر 🍉
                  </button>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-36 lg:pb-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Title */}
      <div className="lg:col-span-3">
        <h1 className="text-3xl font-extrabold text-slate-900 border-b pb-4 flex items-center gap-2">
          <span>🛒</span> عربة التسوق
        </h1>
      </div>

      {cartItems.length === 0 ? (
        <div className="lg:col-span-3 text-center py-16 bg-white rounded-2xl shadow border border-slate-100 space-y-6">
          <span className="text-6xl block">🛍️</span>
          <h2 className="text-2xl font-bold text-slate-800">عربة التسوق فارغة حالياً</h2>
          <p className="text-slate-500">تصفح القائمة وأضف بعض الفواكه الطازجة والعصائر اللذيذة!</p>
          <Link
            to="/"
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl shadow-md transition duration-200"
          >
            تصفح القائمة 🍉
          </Link>
        </div>
      ) : (
        <>
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.cartKey}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200'}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-xl border border-slate-100 flex-shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      <span>{item.name}</span>
                      {item.selectedSize && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                          {item.selectedSize}
                        </span>
                      )}
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">{item.price} ج.س</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                  {/* Quantity Controls */}
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <button
                      onClick={() => updateQuantity(item.cartKey, Math.max(1, item.quantity - 1))}
                      className="px-3 py-1 font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-4 font-bold text-slate-800">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                      className="px-3 py-1 font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Item Total */}
                  <span className="font-extrabold text-emerald-700 min-w-[70px] text-left">
                    {item.price * item.quantity} ج.س
                  </span>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.cartKey)}
                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-full transition-colors"
                    title="حذف"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Checkout & Summary Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 border-b pb-3">تفاصيل الحساب</h2>
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي:</span>
                <span className="font-semibold">{totalAmount} ج.س</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>تكلفة التوصيل:</span>
                <span className="font-semibold">{deliveryFee} ج.س</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-lg border-t pt-3">
                <span>الإجمالي الكلي:</span>
                <span className="text-emerald-700">{grandTotal} gl.s</span>
              </div>
            </div>

            {/* Checkout Form */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 border-b pb-3">بيانات الشحن والتوصيل</h2>
              
              {error && (
                <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-700 p-3 rounded-lg text-sm" id="cart-error-alert">
                  {error}
                </div>
              )}

              {!acceptingOrders ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-center space-y-2 font-semibold">
                  <span className="text-2xl block">🚫</span>
                  <p className="text-sm">نعتذر منك، استقبال الطلبات مغلق حالياً.</p>
                  <p className="text-xs text-rose-600">يرجى الانتظار لحين إعادة التفعيل من قِبل الإدارة.</p>
                </div>
              ) : user ? (
                <form onSubmit={handleCheckout} className="space-y-5">
                  <div>
                    <label className="block text-slate-700 text-sm font-semibold mb-1">رقم الهاتف</label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-sm font-semibold mb-1">العنوان بالتفصيل</label>
                    <textarea
                      id="checkout-address"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="اسم الشارع، رقم العمارة، الشقة..."
                      rows="2"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="block text-slate-700 text-sm font-semibold">💳 طريقة الدفع</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all flex flex-col items-center gap-1 ${
                          paymentMethod === 'cash'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-200'
                        }`}
                      >
                        <span className="text-lg">💵</span>
                        <span>الدفع عند الاستلام</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bank')}
                        className={`py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all flex flex-col items-center gap-1 ${
                          paymentMethod === 'bank'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-200'
                        }`}
                      >
                        <span className="text-lg">🏦</span>
                        <span>تحويل بنكي</span>
                      </button>
                    </div>
                  </div>

                  {/* Bank Details & Receipt File Upload */}
                  {paymentMethod === 'bank' && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="text-xs text-slate-600 space-y-1 text-right">
                        <p className="font-bold text-slate-700">بيانات الحساب للتحويل البنكي:</p>
                        <p>🏦 البنك: <span className="font-bold">{bankName || 'غير محدد'}</span></p>
                        <p>💳 رقم الحساب: <span className="font-mono font-bold">{bankAccount || 'غير محدد'}</span></p>
                        <p>👤 اسم صاحب الحساب: <span className="font-bold">{bankHolderName || 'غير محدد'}</span></p>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-rose-700">📸 إرفاق صورة إشعار التحويل (إجباري):</label>
                        <input
                          type="file"
                          accept="image/*"
                          required
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          className="w-full text-xs text-slate-650 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    id="checkout-submit"
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-xl text-white font-bold text-lg shadow hover:shadow-md transition duration-200 ${
                      loading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {loading 
                      ? (uploadingReceipt ? 'جاري رفع إشعار التحويل...' : 'جاري إرسال الطلب...') 
                      : 'تأكيد الطلب وشحن 🚚'}
                  </button>
                </form>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-slate-500 text-sm">يجب تسجيل الدخول لإتمام عملية الشراء</p>
                  <Link
                    to="/login"
                    className="block w-full bg-yellow-400 hover:bg-yellow-500 text-emerald-950 font-bold py-2.5 rounded-xl text-center shadow transition duration-200"
                  >
                    تسجيل الدخول الآن
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
