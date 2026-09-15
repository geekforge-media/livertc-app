package com.watchcam;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

public class StreamService extends Service {

    private static final String CH_ID   = "wc_stream";
    private static final int    NOTIF_ID = 7001;

    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        acquireWakeLock();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Minimal, silent notification — required by Android for foreground service
        // but set to lowest possible priority so it appears at the very bottom
        // of the notification shade and doesn't disturb the user
        Notification notif = new NotificationCompat.Builder(this, CH_ID)
            .setContentTitle("WatchCam")
            .setContentText("Running")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setOngoing(true)
            .setSilent(true)
            .setShowWhen(false)
            .setVisibility(NotificationCompat.VISIBILITY_SECRET) // hidden on lock screen
            .build();

        startForeground(NOTIF_ID, notif);

        // START_STICKY = Android restarts service if it's killed
        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // App was swiped from recents — restart it
        Intent restart = new Intent(this, RestartReceiver.class);
        restart.setAction("com.watchcam.RESTART");
        sendBroadcast(restart);
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CH_ID,
                "WatchCam Stream",
                NotificationManager.IMPORTANCE_MIN // lowest = no sound, no pop-up
            );
            ch.setDescription("Background camera stream");
            ch.setShowBadge(false);
            ch.setSound(null, null);
            ch.enableLights(false);
            ch.enableVibration(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private void acquireWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            // PARTIAL_WAKE_LOCK keeps CPU on without keeping screen on
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "WatchCam:StreamLock"
            );
            wakeLock.acquire(); // hold indefinitely
        }
    }
}
