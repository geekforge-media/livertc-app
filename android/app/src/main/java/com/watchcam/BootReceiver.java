package com.watchcam;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        if (action.equals(Intent.ACTION_BOOT_COMPLETED)
         || action.equals("android.intent.action.QUICKBOOT_POWERON")
         || action.equals("com.htc.intent.action.QUICKBOOT_POWERON")) {

            SharedPreferences prefs = context.getSharedPreferences("watchcam", Context.MODE_PRIVATE);
            boolean camActive = prefs.getBoolean("cam_active", false);

            if (camActive) {
                // Start the stream service first (faster)
                Intent svc = new Intent(context, StreamService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(svc);
                } else {
                    context.startService(svc);
                }

                // Then launch the main activity (loads the WebView + starts streaming)
                Intent app = new Intent(context, MainActivity.class);
                app.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                           | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                app.putExtra("from_boot", true);
                context.startActivity(app);
            }
        }
    }
}
