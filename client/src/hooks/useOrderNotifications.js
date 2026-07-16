import { useEffect, useRef, useCallback } from 'react';

// ─── Status messages for each transition ─────────────────────────────────────
const STATUS_MESSAGES = {
  'تم التأكيد': {
    title: '✅ تم تأكيد طلبك!',
    body: 'تم قبول طلبك #ORDER# وهو في انتظار التجهيز الآن 📋',
    emoji: '✅',
    color: '#059669',
  },
  'قيد التجهيز': {
    title: '👨‍🍳 طلبك قيد التجهيز!',
    body: 'طلبك #ORDER# قيد التحضير والتجهيز الآن. سنخبرك عندما يخرج للتوصيل 🚀',
    emoji: '👨‍🍳',
    color: '#3B82F6',
  },
  'قيد التوصيل': {
    title: '🚚 طلبك في الطريق إليك!',
    body: 'طلبك #ORDER# خرج للتوصيل. استعد لاستقباله قريباً! 🛵',
    emoji: '🚚',
    color: '#7C3AED',
  },
  'تم التوصيل': {
    title: '🎉 تم توصيل طلبك!',
    body: 'طلبك #ORDER# وصلك بالسلامة. شكراً لتعاملك مع 50 فاكهة 💚',
    emoji: '🎉',
    color: '#10B981',
  },
};

// ─── Generate a short notification sound using Web Audio API ─────────────────
function playNotificationSound(type = 'success') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const notes = {
      success:  [523, 659, 784],   // C5 E5 G5 — happy chord
      prep:     [587, 698, 880],   // D5 F5 A5 — active prep alert
      delivery: [440, 554, 659],   // A4 C#5 E5 — warm
      done:     [784, 987, 1175],  // G5 B5 D6 — celebratory
    };

    const freqs = notes[type] || notes.success;

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);

      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.45);
    });
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

// ─── Request notification permission ─────────────────────────────────────────
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

// ─── Show browser notification ─────────────────────────────────────────────
function showBrowserNotification(title, body, orderNumber) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [200, 100, 200],
      tag: `order-${orderNumber}`,
      renotify: true,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = '/orders';
      n.close();
    };
    setTimeout(() => n.close(), 8000);
  } catch (e) {
    console.warn('Notification error:', e);
  }
}

// ─── Main hook ────────────────────────────────────────────────────────────────
/**
 * useOrderNotifications
 * @param {Function} onNotification - callback(orderNumber, newStatus, config)
 *   called for every notifiable status change so the component can show a toast
 */
export function useOrderNotifications(onNotification) {
  const callbackRef = useRef(onNotification);
  useEffect(() => { callbackRef.current = onNotification; }, [onNotification]);

  // Register SW on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err =>
        console.warn('SW registration failed:', err)
      );
    }
  }, []);

  // The trigger function — call this whenever a status update arrives
  const triggerNotification = useCallback((orderNumber, newStatus) => {
    const config = STATUS_MESSAGES[newStatus];
    if (!config) return; // only notify for specific statuses

    const title = config.title;
    const body = config.body.replace('#ORDER#', `#${orderNumber}`);
    const soundType =
      newStatus === 'تم التوصيل' ? 'done' :
      newStatus === 'قيد التوصيل' ? 'delivery' :
      newStatus === 'قيد التجهيز' ? 'prep' : 'success';

    // 1. Play sound
    playNotificationSound(soundType);

    // 2. Browser notification (works in background too)
    showBrowserNotification(title, body, orderNumber);

    // 3. Notify component to show an in-app toast
    if (callbackRef.current) {
      callbackRef.current(orderNumber, newStatus, { title, body, ...config });
    }
  }, []);

  return { triggerNotification };
}
