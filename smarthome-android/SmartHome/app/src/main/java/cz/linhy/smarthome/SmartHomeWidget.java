package cz.linhy.smarthome;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Iterator;
import java.util.Random;

public class SmartHomeWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d("SmartHomeLog", "Log update from onUpdate function");
        for (int i = 0; i < appWidgetIds.length; i++) {
            int widgetId = appWidgetIds[i];
            //String number = String.format("%03d",(new Random().nextInt(900) + 100));

            RemoteViews remoteViews = new RemoteViews(context.getPackageName(), cz.linhy.smarthome.R.layout.default_widget);

            Intent intent = new Intent(context, SmartHomeWidget.class);
            intent.setAction("cz.linhy.smarthome.APPWIDGET_UPDATE");
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);
            //PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, 0);
            appWidgetManager.updateAppWidget(widgetId, remoteViews);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        Bundle extras = intent.getExtras();
        //Log.d("SmartHomeLog", "App widget ID: " + extras.getIntArray(AppWidgetManager.EXTRA_APPWIDGET_IDS));
        Log.d("SmartHomeLogWidget", "Received action: " + intent.getAction());
        if (intent.getAction().equals("cz.linhy.smarthome.widgetUpdateCall")) {
            try {
                String data = extras.getString("data");
                JSONObject functionData = new JSONObject(data);

                JSONObject configData = new JSONObject(extras.getString("widgetConfigurations"));
                Iterator<?> widgetIDs = configData.keys();
                while (widgetIDs.hasNext()) {
                    RemoteViews remoteViews = new RemoteViews(context.getPackageName(), R.layout.default_widget);
                    int appWidgetID = Integer.parseInt((String) widgetIDs.next());
                    if (configData.has(appWidgetID + "")) {
                        JSONObject thisWidgetData = configData.getJSONObject(appWidgetID + "");

                        Iterator<?> keys = thisWidgetData.keys();

                        while (keys.hasNext()) {
                            String deviceID = (String) keys.next();
                            JSONArray thisDeviceData = thisWidgetData.getJSONArray(deviceID);

                            for (int i = 0; i < thisDeviceData.length(); i++) {
                                String functionID = thisDeviceData.getString(i);

                                remoteViews.addView(R.id.widgetFunctionLayout, ValueBuilder.buildRemoteView(functionData.getJSONObject(deviceID).getJSONObject(functionID), functionID, deviceID, context));
                            }
                        }
                    }
                    appWidgetManager.updateAppWidget(appWidgetID, remoteViews);
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }

        } else if (intent.getAction().equals("android.appwidget.action.APPWIDGET_UPDATE")) {
            Log.d("SmartHomeLogWidget", "Widget update got fired");
        } else if (intent.getAction().equals("cz.linhy.smarthome.widgetAction")) {
            Bundle extrasAction = intent.getExtras();
            String functionID = extrasAction.getString("functionID");
            String deviceID = extrasAction.getString("deviceID");
            String command = extrasAction.getString("command");
            Boolean lastValue = extras.getBoolean("lastValue");

            if (command != null) {
                if (command.equals("app")) {
                    Log.d("SmartHomeLogWidget", "Opening app");
                }
            } else {
                Boolean newValue = !lastValue;
                Log.d("SmartHomeWidgetLog", "Emit function: " + functionID + " for device: " + deviceID + " Value: " + newValue);
            }
        }
    }
}
