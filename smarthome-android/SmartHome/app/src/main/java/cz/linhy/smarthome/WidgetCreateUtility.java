package cz.linhy.smarthome;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.Resources;
import android.graphics.Color;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.RelativeLayout;
import android.widget.TableLayout;
import android.widget.TableRow;
import android.widget.TextView;

import com.wang.avi.AVLoadingIndicatorView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by Tomáš on 6. 3. 2018.
 */

public class WidgetCreateUtility extends Activity {
    private BroadcastReceiver receiver;
    private AVLoadingIndicatorView avi;
    int widgetID;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setContentView(R.layout.widget_configure_layout);
        avi = (AVLoadingIndicatorView) findViewById(R.id.loading_spinner);
        avi.show();

        Intent intent = getIntent();
        Bundle extras = intent.getExtras();
        if (extras != null) {
            widgetID = extras.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        }

        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Bundle data = intent.getExtras();
                int what = data.getInt("what");

                if (what == SmartHomeService.MSG_FUNCTIONS) {
                    try {
                        JSONObject jsonData = new JSONObject(data.getString("data"));

                        TableLayout mainLayout = (TableLayout) findViewById(R.id.widgetConfigureFunctionsLayout);

                        JSONArray keys = jsonData.names();

                        Log.d("SmartHomeLog", "Device IDs: " + keys.toString());

                        Log.d("SmartHomeLog", "Keys: " + keys.toString());
                        Log.d("SmartHomeLog", "Data: " + data.getString("data"));
                        Log.d("SmartHomeLog", "JSON Object: " + jsonData.toString());

                        for (int j = 0; j < keys.length(); j++) {
                            String deviceID = keys.getString(j);
                            Log.d("SmartHomeLog", "Next key: " + deviceID);
                            Boolean hasWrittenName = false;
                            JSONObject currentDevice = jsonData.getJSONObject(deviceID);

                            String deviceName = currentDevice.getString("Prezdivka_zarizeni");

                            JSONArray names = currentDevice.names();

                            for (int i = 0; i < names.length(); i++) {
                                String functionID = names.getString(i);

                                Log.d("SmartHomeLog", "ID funkce: " + functionID);

                                if (!functionID.equals("Prezdivka_zarizeni") && !functionID.equals("Online")) {
                                    JSONObject function = currentDevice.getJSONObject(functionID);

                                    TableRow newRow = new TableRow(WidgetCreateUtility.this);

                                    TextView deviceNameView = new TextView(WidgetCreateUtility.this);
                                    if (!hasWrittenName) {
                                        deviceNameView.setText(deviceName);
                                        hasWrittenName = true;
                                    }

                                    RelativeLayout functionLayout = new RelativeLayout(WidgetCreateUtility.this);
                                    TableRow.LayoutParams params = new TableRow.LayoutParams(TableRow.LayoutParams.WRAP_CONTENT, convertToPixels(25));

                                    functionLayout.setLayoutParams(params);

                                    TextView functionNameView = new TextView(WidgetCreateUtility.this);
                                    functionNameView.setText(function.getString("Nazev_opravneni"));

                                    RelativeLayout.LayoutParams functionNameParams = new RelativeLayout.LayoutParams(convertToPixels(150), convertToPixels(25));
                                    functionNameParams.addRule(RelativeLayout.ALIGN_PARENT_LEFT);
                                    functionNameView.setLayoutParams(functionNameParams);

                                    CheckBox selector = new CheckBox(WidgetCreateUtility.this);
                                    selector.setTag(R.id.deviceID, deviceID);
                                    selector.setTag(R.id.functionID, functionID);

                                    RelativeLayout.LayoutParams checkboxParams = new RelativeLayout.LayoutParams(convertToPixels(150), convertToPixels(25));
                                    checkboxParams.addRule(RelativeLayout.ALIGN_PARENT_RIGHT);
                                    selector.setLayoutParams(checkboxParams);

                                    functionLayout.addView(functionNameView);
                                    functionLayout.addView(selector);

                                    newRow.addView(deviceNameView);
                                    newRow.addView(functionLayout);

                                    mainLayout.addView(newRow);
                                }
                            }
                        }

                        Log.d("SmartHomeLog", "Removing loader layout");

                        avi.hide();

                        findViewById(R.id.generateButton).setVisibility(View.VISIBLE);

                        LinearLayout rootLayout = (LinearLayout) findViewById(R.id.widgetConfigureRootLayout);
                        rootLayout.removeView(findViewById(R.id.loader_layout));
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
            }
        };

        IntentFilter listenerFilter = new IntentFilter();
        listenerFilter.addAction("cz.linhy.smarthome.widgetConfigReceiver");
        registerReceiver(receiver, listenerFilter);

        Intent messageIntent = new Intent("cz.linhy.smarthome.serviceReceiver");
        messageIntent.putExtra("what", SmartHomeService.MSG_GET_FUNCTIONS);
        messageIntent.putExtra("destination", "widgetReceiver");
        sendBroadcast(messageIntent);
        super.onCreate(savedInstanceState);
    }

    public void saveWidgetConfiguration (View v) {
        JSONObject result = new JSONObject();
        List<View> children = getAllChildren(findViewById(R.id.widgetConfigureFunctionsLayout));

        for (int i = 0; i < children.size(); i++) {

            View child = children.get(i);

            //Do not add any parents, just add child elements

            try {
                if(child instanceof CheckBox) {
                    if (((CheckBox) child).isChecked()) {
                        if (result.has((String) child.getTag(R.id.deviceID))) {
                            result.getJSONArray((String) child.getTag(R.id.deviceID)).put((String) child.getTag(R.id.functionID));
                        } else {
                            JSONArray newArray = new JSONArray();
                            newArray.put((String) child.getTag(R.id.functionID));
                            result.put((String) child.getTag(R.id.deviceID), newArray);
                        }
                    }
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }
        try {
            JSONObject dataToSend = new JSONObject();
            dataToSend.put(widgetID + "", result);
            Intent messageIntent = new Intent("cz.linhy.smarthome.serviceReceiver");
            messageIntent.putExtra("what", SmartHomeService.MSG_WIDGET_CONFIGURATION);
            messageIntent.putExtra("data", dataToSend.toString());
            sendBroadcast(messageIntent);

            Intent value = new Intent();
            value.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetID);
            unregisterReceiver(receiver);
            setResult(RESULT_OK, value);
            finish();
        } catch (JSONException e) {
            e.printStackTrace();
        }

    }

    private List<View> getAllChildren(View v) {

        if (!(v instanceof ViewGroup)) {
            ArrayList<View> viewArrayList = new ArrayList<View>();
            viewArrayList.add(v);
            return viewArrayList;
        }

        ArrayList<View> result = new ArrayList<View>();

        ViewGroup viewGroup = (ViewGroup) v;
        for (int i = 0; i < viewGroup.getChildCount(); i++) {

            View child = viewGroup.getChildAt(i);

            result.addAll(getAllChildren(child));
        }
        return result;
    }

    public int convertToPixels(int dp) {
        Resources r = getApplicationContext().getResources();
        int px = (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                dp,
                r.getDisplayMetrics()
        );
        return px;
    }
}