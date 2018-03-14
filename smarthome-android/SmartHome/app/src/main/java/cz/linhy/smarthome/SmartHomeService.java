package cz.linhy.smarthome;

import android.app.Notification;
import android.app.Service;
import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.support.v4.content.LocalBroadcastManager;
import android.support.v7.app.NotificationCompat;
import android.util.Log;
import android.widget.RemoteViews;
import android.widget.Toast;

import org.json.JSONException;
import org.json.JSONObject;

import java.net.URISyntaxException;

import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;

public class SmartHomeService extends Service {
    private BroadcastReceiver dataReceiver;
    private Boolean isWidgetExpectingData = false;
    private Boolean triedRepeat = false;
    private Boolean isLoggedIn = false;
    private Socket socket;
    private String token;
    private boolean isRepeat = true;
    private SharedPreferences preferences;
    private SharedPreferences.Editor editor;
    private static JSONObject currentValues;
    private String widgetConfigurationData;
    private JSONObject historyValues;
    private Handler timerHandler = new Handler(Looper.getMainLooper());

    static final int MSG_IS_READY = 1;
    static final int MSG_GET_HISTORY = 2;
    static final int MSG_HISTORY = 3;
    static final int MSG_SUCCESS_LOGIN = 4;
    static final int MSG_UNSUCCESS_LOGIN = 5;
    static final int MSG_LOGIN_CREDENTIALS = 6;
    static final int MSG_NOT_CONNECTED = 7;
    static final int MSG_COMMAND = 8;
    static final int MSG_UNSUCCESS_REPEAT_LOGIN = 9;
    static final int MSG_INITIAL_DATA_REQUEST = 10;
    static final int MSG_FUNCTIONS = 11;
    static final int MSG_GET_FUNCTIONS = 12;
    static final int MSG_FUNCTION_UPDATE = 13;
    static final int MSG_SERVICE_READY = 14;
    static final int MSG_WIDGET_CONFIGURATION = 15;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
        //return mMessenger.getBinder();
    }

    @Override
    public void onCreate() {
        //Toast.makeText(SmartHomeService.this, "Service created!", Toast.LENGTH_SHORT).show();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        dataReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Bundle data = intent.getExtras();
                int what = data.getInt("what");
                Intent messageIntent = new Intent("cz.linhy.smarthome.guiReceiver");

                switch (what) {
                    case MSG_IS_READY:
                        messageIntent.putExtra("what", MSG_SERVICE_READY);
                        sendBroadcast(messageIntent);
                        break;
                    case MSG_LOGIN_CREDENTIALS:
                        try {
                            JSONObject obj = new JSONObject(data.getString("data"));
                            if (!socket.connected()) {
                                socket.connect();
                                int repeat = 0;
                                while (!socket.connected()) {
                                    Thread.sleep(50);
                                    repeat++;
                                    if (repeat > 60) {
                                        socket = null;
                                        initSocket();
                                        break;
                                    }
                                }
                            }
                            socket.emit("login", obj);
                        } catch (JSONException e) {
                            e.printStackTrace();
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }
                        break;
                    case MSG_INITIAL_DATA_REQUEST:
                        Log.d("SmartHomeLog", "Socket connected" + socket.connected());
                        Log.d("SmartHomeLog", "Is logged in" + isLoggedIn);
                        if (socket.connected() &&  isLoggedIn) {

                            messageIntent.putExtra("what", MSG_SUCCESS_LOGIN);
                            sendBroadcast(messageIntent);

                            Log.d("SmartHomeLog", "Sending reply success!");
                        } else if (socket.connected()) {
                            Log.d("SmartHomeLog", "Sending reply unsuccess!");
                            messageIntent.putExtra("what", MSG_UNSUCCESS_REPEAT_LOGIN);
                            sendBroadcast(messageIntent);
                        }
                        break;

                    case MSG_GET_FUNCTIONS:
                        if (currentValues != null) {
                            if (data.getString("destination", "").equals("widgetReceiver")) {
                                Log.d("SmartHomeLog", "Sending data to widget receiver");
                                Intent widgetMessageIntent = new Intent("cz.linhy.smarthome.widgetConfigReceiver");
                                widgetMessageIntent.putExtra("what", MSG_FUNCTIONS);
                                widgetMessageIntent.putExtra("data", currentValues.toString());
                                sendBroadcast(widgetMessageIntent);
                            } else {
                                messageIntent.putExtra("what", MSG_FUNCTIONS);
                                messageIntent.putExtra("data", currentValues.toString());
                                sendBroadcast(messageIntent);
                            }
                        } else {
                            socket.emit("get_my_functions");
                            if (data.getString("destination") != null) {
                                isWidgetExpectingData = data.getString("destination").equals("widgetReceiver");
                            } else {
                                isWidgetExpectingData = false;
                            }
                        }
                        break;
                    case MSG_COMMAND:
                        try {
                            JSONObject obj = new JSONObject(data.getString("data"));
                            obj.put("token", token);
                            Log.d("SmartHomeLog", "Got command.. Here are the data: " + obj.toString());
                            socket.emit("commandToServer", obj.toString());
                        } catch (JSONException e) {
                            e.printStackTrace();
                        }
                        break;
                    case MSG_GET_HISTORY:
                        if (historyValues != null) {
                            messageIntent.putExtra("what", MSG_HISTORY);
                            messageIntent.putExtra("data", historyValues.toString());
                            sendBroadcast(messageIntent);
                        } else {
                            socket.emit("get_history");
                        }
                        break;

                    case MSG_WIDGET_CONFIGURATION:
                        widgetConfigurationData = data.getString("data");
                        editor.putString("widgetConfigurationData", widgetConfigurationData);
                        Intent sendIntent = new Intent("cz.linhy.smarthome.widgetUpdateCall");
                        sendIntent.putExtra("data", currentValues.toString());
                        sendIntent.putExtra("widgetConfigurations", widgetConfigurationData);
                        sendBroadcast(sendIntent);
                        break;
                    default:
                        break;
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction("cz.linhy.smarthome.serviceReceiver");
        registerReceiver(dataReceiver, filter);

        Intent messageIntent = new Intent("cz.linhy.smarthome.guiReceiver");
        messageIntent.putExtra("what", MSG_SERVICE_READY);
        sendBroadcast(messageIntent);

        Log.d("SmartHomeLogReceiver", "Created receiver");


        initSocket();

        Log.d("SmartHomeLog", "On start command got called!");
        preferences = getSharedPreferences("data", Context.MODE_PRIVATE);
        editor = preferences.edit();

        startForeground(1337, buildForegroundNotification());

        super.onStartCommand(intent, flags, startId);

        return START_STICKY;
    }
    @Override
    public void onDestroy() {
        Log.d("SmartHomeLog", "I got DESTROYED! HELP!");
        if (dataReceiver != null) {
            unregisterReceiver(dataReceiver);
        }
        socket.disconnect();
        socket.close();
        super.onDestroy();
    }

    private Notification buildForegroundNotification() {
        Notification notification = new NotificationCompat.Builder(this)
                .setContentTitle("SmartHome")
                .setTicker("SmartHome")
                .setContentText("Aplikace SmartHome je připravena.")
                .setSmallIcon(R.drawable.ic_menu_send) /*TODO Změna ikony! */
                .setPriority(Notification.PRIORITY_MIN)
                .setOngoing(true).build();
        return notification;
    }

    /*public void UpdateWidget(String text) {
        Context ctx = this;
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        RemoteViews view = new RemoteViews(ctx.getPackageName(), R.layout.default_widget);
        ComponentName widget = new ComponentName(ctx, SmartHomeWidget.class);

        view.setTextViewText(R.id.TestText, text);
        mgr.updateAppWidget(widget, view);
    }*/

    public void initSocket() {
        Log.d("SmartHomeLog", "Initializing socket!");
        try {
            socket = IO.socket("https://linhy.cz:8880");
            socket.connect();

            Log.d("SmartHomeLogSocket", "Connecting to socket");

            //Toast.makeText(GateService.this, "Is socket connected?: " + socket.connected(), Toast.LENGTH_SHORT).show();

            socket.on(Socket.EVENT_CONNECT, new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    timerHandler.removeCallbacksAndMessages(null);
                    String repeatLoginData = preferences.getString("repeatLoginData", "");
                    Log.d("SmartHomeLog", "REPEAT login data: " + repeatLoginData);
                    if (repeatLoginData != "") {
                        Log.d("SmartHomeLog","Emitting repeat login.. :/ Repeat login data: " + repeatLoginData);
                        socket.emit("repeat_login", repeatLoginData);
                    } else {
                        Intent messageIntent = new Intent("cz.linhy.smarthome.guiReceiver");
                        messageIntent.putExtra("what", MSG_UNSUCCESS_REPEAT_LOGIN);
                        sendBroadcast(messageIntent);
                    }
                    triedRepeat = true;
                }
            });

            socket.on(Socket.EVENT_ERROR, new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    Log.d("SmartHomeLogError", "Socket error: " + args[0].toString());
                }
            });

            socket.on(Socket.EVENT_DISCONNECT, new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    socket.off();
                    socket.close();
                    Log.d("SmartHomeLog", "DISCONNECT!!!!!!!!!!!!!!!!!!");
                    timerHandler.postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            if (!socket.connected()) {
                                Log.d("SmartHomeLog", "Restarting socket connection.");
                                socket = null;
                                initSocket();
                                Log.d("SmartHomeLog", "Restart executed.");
                            }
                        }
                    }, 500);
                }
            });

            socket.on("login_response", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    int i = 0;
                    try {
                        Log.d("SmartHome", "Data response: " + args[0].toString());
                        JSONObject json = new JSONObject(args[0].toString());
                        int action;
                        if(json.getBoolean("login")){
                            isLoggedIn = true;
                            action = MSG_SUCCESS_LOGIN;
                            token = new JSONObject(args[0].toString()).getString("identifier");
                            editor.putString("repeatLoginData", args[0].toString());
                            editor.commit();
                            socket.emit("get_my_functions");
                            socket.emit("get_history");
                        } else {
                            isLoggedIn = false;
                            if (isRepeat) {
                                action = MSG_UNSUCCESS_REPEAT_LOGIN;
                                isRepeat = false;
                            } else {
                                action = MSG_UNSUCCESS_LOGIN;
                            }
                        }

                        Intent messageIntent = new Intent("cz.linhy.smarthome.guiReceiver");
                        messageIntent.putExtra("what", action);
                        sendBroadcast(messageIntent);
                    } catch (JSONException e) {
                        Log.d("SmartHomeLog", e.toString());
                    }
                }
            });

            socket.on("my_history", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    try {
                        historyValues = new JSONObject(args[0].toString());
                        Intent messageIntent = new Intent("cz.linhy.smarthome.guiReceiver");
                        messageIntent.putExtra("what", MSG_HISTORY);
                        messageIntent.putExtra("data", historyValues.toString());
                        sendBroadcast(messageIntent);
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
            });

            socket.on("my_functions_response", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    int i = 0;
                    try {
                        currentValues = new JSONObject(args[0].toString());
                        Intent messageIntent = new Intent("cz.linhy.smarthome.guiReceiver");
                        messageIntent.putExtra("what", MSG_FUNCTIONS);
                        messageIntent.putExtra("data", currentValues.toString());
                        sendBroadcast(messageIntent);

                        if (isWidgetExpectingData) {
                            Intent widgetMessageIntent = new Intent("cz.linhy.smarthome.widgetConfigReceiver");
                            widgetMessageIntent.putExtra("what", MSG_FUNCTIONS);
                            widgetMessageIntent.putExtra("data", currentValues.toString());
                            sendBroadcast(widgetMessageIntent);
                            isWidgetExpectingData = false;
                        }
                    } catch (JSONException e) {
                        Log.e("SmartHomeLog", e.toString());
                    }
                }
            });

            socket.on("status", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    try {
                        JSONObject data = new JSONObject(args[0].toString());
                        //UpdateWidget(data.getString("data"));
                        currentValues.getJSONObject(data.getString("ID_zarizeni")).getJSONObject(data.getString("ID_druhopravneni")).put("LastValues", data.getString("value"));
                        Intent messageIntent = new Intent("cz.linhy.smarthome.guiReceiver");
                        messageIntent.putExtra("what", MSG_FUNCTIONS);
                        messageIntent.putExtra("data", currentValues.toString());
                        sendBroadcast(messageIntent);
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
            });

            socket.on("device_status", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    Log.d("SmartHomeLog", "Got device status value: " + args[0].toString());
                    try {
                        JSONObject data = new JSONObject(args[0].toString());
                        //UpdateWidget(data.getString("data"));
                        currentValues.getJSONObject(data.getString("device_id")).put("Online", data.getBoolean("status"));

                        Intent messageIntent = new Intent("cz.linhy.smarthome.guiReceiver");
                        messageIntent.putExtra("what", MSG_FUNCTIONS);
                        messageIntent.putExtra("data", currentValues.toString());
                        sendBroadcast(messageIntent);
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
            });

            socket.on("status", new Emitter.Listener() {
                @Override
                public void call(Object... args) {

                    Intent messageIntent = new Intent("cz.linhy.smarthome.guiReceiver");
                    messageIntent.putExtra("what", MSG_FUNCTION_UPDATE);
                    messageIntent.putExtra("data", args[0].toString());
                    sendBroadcast(messageIntent);
                }
            });

            /*socket.on("disconnect", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    initSocket();
                }
            });*/


        } catch (URISyntaxException e) {
            Toast.makeText(this, "Exception: " + e.toString(), Toast.LENGTH_SHORT).show();
        }
    }
}
