package com.fakha50.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // إعدادات إيقاظ الشاشة وتجاوز قفل الشاشة (Lockscreen)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            
            // فك قفل المفاتيح (Keyguard) إن وجد
            android.app.KeyguardManager keyguardManager = (android.app.KeyguardManager) getSystemService(android.content.Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }
        
        // طلب إذن الرسم فوق التطبيقات الأخرى (System Alert Window) للظهور كإشعار مكالمة ملء الشاشة
        checkOverlayPermission();
        
        createNotificationChannels();
    }

    private void checkOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!android.provider.Settings.canDrawOverlays(this)) {
                android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(this);
                builder.setTitle("إذن مطلوب للظهور فوق قفل الشاشة 🚨");
                builder.setMessage("لكي يعمل تنبيه الطلبات الجديدة بنغمة كاملة وشاشة منبثقة ملء الشاشة مثل المكالمة، يرجى تفعيل إذن 'الظهور فوق التطبيقات الأخرى' في الصفحة التالية.");
                builder.setPositiveButton("اذهب للإعدادات والتفعيل", new android.content.DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(android.content.DialogInterface dialog, int which) {
                        Intent intent = new Intent(
                            android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + getPackageName())
                        );
                        startActivity(intent);
                    }
                });
                builder.setCancelable(false);
                builder.show();
            }
        }
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            // قناة الطلبات الجديدة — أعلى أولوية مع نغمة رنين
            NotificationChannel ordersChannel = new NotificationChannel(
                "new_orders",
                "طلبات جديدة",
                NotificationManager.IMPORTANCE_HIGH
            );
            ordersChannel.setDescription("تنبيهات الطلبات الجديدة للمسؤول");
            ordersChannel.enableVibration(true);
            ordersChannel.setVibrationPattern(new long[]{0, 500, 250, 500, 250, 1000});
            ordersChannel.enableLights(true);
            ordersChannel.setLightColor(0xFFFF4500);
            ordersChannel.setShowBadge(true);
            ordersChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            // استخدام نغمة رنين التطبيق المخصصة المنتجة ديناميكياً (app_alarm) ليرن التطبيق بنغمته الخاصة
            Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/raw/app_alarm");

            AudioAttributes audioAttrs = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
            
            ordersChannel.setSound(soundUri, audioAttrs);

            manager.createNotificationChannel(ordersChannel);
        }
    }
}

