package cz.linhy.smarthome;

import android.app.ActivityManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.Message;
import android.os.Messenger;
import android.os.RemoteException;
import android.support.v4.content.LocalBroadcastManager;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.widget.Toast;

import com.wang.avi.AVLoadingIndicatorView;

/**
 * Created by Tomáš on 18. 2. 2018.
 */

public class StartLoader extends AppCompatActivity {
    private AVLoadingIndicatorView avi;
    private BroadcastReceiver receiver;
    private Handler handler;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.start_loader);

        avi = (AVLoadingIndicatorView) findViewById(R.id.loading_spinner);
        avi.show();

        if (!serviceOn()) {
            Log.d("SmartHomeLog", "Starting service");
            doStartService();

        }

        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                int what = intent.getExtras().getInt("what");

                Intent activityIntent;
                switch (what) {
                    case SmartHomeService.MSG_SERVICE_READY:
                        handler.removeCallbacksAndMessages(null);
                        Log.d("SmartHomeLog", "Removed callbacks!");
                        Intent messageIntent = new Intent("cz.linhy.smarthome.serviceReceiver");
                        messageIntent.putExtra("what", SmartHomeService.MSG_INITIAL_DATA_REQUEST);
                        sendBroadcast(messageIntent);
                        break;

                    case SmartHomeService.MSG_UNSUCCESS_REPEAT_LOGIN:
                        Log.d("SmartHomeLog", "unbinding..");

                        activityIntent = new Intent(StartLoader.this, LoginForm.class);
                        activityIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        startActivity(activityIntent);
                        finish();
                        return;
                    case SmartHomeService.MSG_SUCCESS_LOGIN:
                        Log.d("SmartHomeLog", "unbinding..");

                        activityIntent = new Intent(StartLoader.this, MainMenu.class);
                        activityIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        Log.d("SmartHomeLog", "Starting another activity");
                        startActivity(activityIntent);
                        finish();
                        return;
                    case SmartHomeService.MSG_NOT_CONNECTED:
                        Toast.makeText(StartLoader.this, "Neni pripojeno k Socket.IO", Toast.LENGTH_SHORT).show();
                    default:
                        break;
                }
            }
        };

        IntentFilter listenerFilter = new IntentFilter();
        listenerFilter.addAction("cz.linhy.smarthome.guiReceiver");
        registerReceiver(receiver, listenerFilter);

        handler = new Handler(Looper.getMainLooper());
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                doStopService();
                doStartService();
            }
        }, 2000);

        Intent messageIntent = new Intent("cz.linhy.smarthome.serviceReceiver");
        messageIntent.putExtra("what", SmartHomeService.MSG_IS_READY);
        sendBroadcast(messageIntent);
    }

    @Override
    protected void onStop() {
        super.onStop();
    }

    private boolean serviceOn() {
        ActivityManager mgr = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        for (ActivityManager.RunningServiceInfo service : mgr.getRunningServices(Integer.MAX_VALUE)) {
            if (SmartHomeService.class.getName().equals(service.service.getClassName())) {
                return true;
            }
        }
        return false;
    }

    public void doStartService () {
        startService(new Intent(StartLoader.this, SmartHomeService.class));
    }

    public void doStopService () {
        stopService(new Intent(StartLoader.this, SmartHomeService.class));
    }

    @Override
    protected void onDestroy() {
        unregisterReceiver(receiver);
        super.onDestroy();
    }
}
