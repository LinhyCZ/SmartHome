package cz.linhy.smarthome;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.res.Resources;
import android.os.Bundle;
import android.support.constraint.ConstraintLayout;
import android.support.v7.widget.Toolbar;
import android.util.Log;
import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.support.v7.app.AppCompatActivity;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.Transformation;
import android.widget.Button;
import android.widget.ExpandableListView;
import android.widget.LinearLayout;
import android.widget.TableLayout;
import android.widget.TableRow;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;



public class MainMenu extends AppCompatActivity {
    private static final int LAYOUT_DEFAULT = 0;
    private static final int LAYOUT_HISTORY = 1;
    private static final int LAYOUT_CONTROLS = 2;


    private BroadcastReceiver receiver;
    private boolean menuOpen = false;
    private static String openedDeviceID;
    private static int currentLayout = LAYOUT_DEFAULT;
    public static int newMargin;
    ExpandableListAdapter listAdapter;
    ExpandableListView expListView;
    private static LinearLayout dataLayout;
    private static JSONObject deviceData;
    private static JSONObject historyData;
    private static JSONObject pinnedHomeScreenData;
    private SharedPreferences preferences;
    private SharedPreferences.Editor editor;
    List<String> deviceIDs = new ArrayList<>();

    HashMap<String, String> deviceNames = new HashMap<>();
    private static HashMap<String, String> historyActions = new HashMap<>();

    static {
        historyActions.put("1", "Příkaz");
        historyActions.put("2", "Status");
        historyActions.put("3", "Zapnuto");
        historyActions.put("4", "Vypnuto");
        historyActions.put("5", "Registrace");
    }

    void doStartService() {startService(new Intent(MainMenu.this, SmartHomeService.class));};

    private boolean serviceOn() {
        ActivityManager mgr = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        for (ActivityManager.RunningServiceInfo service : mgr.getRunningServices(Integer.MAX_VALUE)) {
            if (SmartHomeService.class.getName().equals(service.service.getClassName())) {
                return true;
            }
        }
        return false;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main_menu);

        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        toolbar.setNavigationOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                onMenuClick(v);
            }
        });

        preferences = getSharedPreferences("data", Context.MODE_PRIVATE);
        editor = preferences.edit();

        try {

            pinnedHomeScreenData = new JSONObject(preferences.getString("pinnedDevices", ""));
        } catch (JSONException e) {
            e.printStackTrace();
        }

        dataLayout = (LinearLayout) findViewById(R.id.data);
        View defaultView = getLayoutInflater().inflate(R.layout.main_menu_default, dataLayout, false);
        dataLayout.addView(defaultView);

        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Bundle dataBundle = intent.getExtras();
                int what = intent.getExtras().getInt("what");

                switch (what) {
                    case SmartHomeService.MSG_FUNCTIONS:
                        deviceIDs.clear();
                        deviceNames.clear();

                        String data = dataBundle.getString("data");
                        try {
                            List<String> listHeaders = new ArrayList<>();
                            List<Boolean> Status = new ArrayList<>();
                            HashMap<String, List<String>> listItems = new HashMap<>();

                            deviceData = new JSONObject(data);

                            List<String> options = new ArrayList<String>();
                            options.add("Ovládání");
                            options.add("Historie");

                            Iterator<?> keys = deviceData.keys();
                            while (keys.hasNext()) {
                                String key = (String) keys.next();
                                deviceIDs.add(key);
                                String nazevZarizeni = deviceData.getJSONObject(key).getString("Prezdivka_zarizeni");
                                deviceNames.put(key, nazevZarizeni);
                                Status.add(deviceData.getJSONObject(key).getBoolean("Online"));
                                listHeaders.add(nazevZarizeni);
                                listItems.put(nazevZarizeni, options);
                            }
                            expListView = (ExpandableListView) findViewById(R.id.ExpandableView);
                            listAdapter = new ExpandableListAdapter(MainMenu.this, listHeaders, deviceIDs, Status, listItems);

                            expListView.setAdapter(listAdapter);

                            if (currentLayout == LAYOUT_CONTROLS) {
                                /* TODO VYkRESLIT MOŽNOSTI!*/
                                View controls = findViewById(R.id.controlElements);
                                controls.setEnabled(deviceData.getJSONObject(openedDeviceID).getBoolean("Online")); /* TODO FIX THIS! PODLE STARÉ FUNKCE! NUTNO POUŽÍT GETALLCHILDREN -> VIZ. RENDEROPTIONS */
                            }

                            if (currentLayout == LAYOUT_DEFAULT) {
                                renderPinnedItems();
                            }
                        } catch (JSONException e) {
                            Log.d("SmartHomeLog", e.toString());
                        }

                        break;
                    case SmartHomeService.MSG_FUNCTION_UPDATE:
                        try {
                            if (currentLayout == LAYOUT_CONTROLS) {
                                JSONObject jsonData = new JSONObject(dataBundle.getString("data"));
                                JSONObject buildData = deviceData.getJSONObject(jsonData.getString("ID_zarizeni")).getJSONObject(jsonData.getString("ID_druhopravneni"));
                                buildData.put("LastValues", jsonData.getString("value"));
                                if(jsonData.getString("ID_zarizeni").equals(openedDeviceID)) {
                                    ViewGroup functions = (ViewGroup) findViewById(R.id.controlElements);
                                    ConstraintLayout oldLayout = (ConstraintLayout) functions.findViewWithTag(jsonData.get("ID_druhopravneni"));
                                    ViewGroup parent = (ViewGroup) oldLayout.getParent();
                                    int index = parent.indexOfChild(oldLayout);
                                    parent.removeView(oldLayout);

                                    boolean isPinned = false;
                                    if (pinnedHomeScreenData != null) {
                                        if (pinnedHomeScreenData.has(jsonData.getString("ID_zarizeni"))) {
                                            JSONObject deviceData = pinnedHomeScreenData.getJSONObject(jsonData.getString("ID_zarizeni"));
                                            if (deviceData.has(jsonData.getString("ID_druhopravneni"))) {
                                                isPinned = deviceData.getBoolean(jsonData.getString("ID_druhopravneni"));
                                            }
                                        }
                                    }

                                    View newView = ValueBuilder.buildView(buildData, jsonData.getString("ID_druhopravneni"), MainMenu.this, jsonData.getString("ID_zarizeni"), isPinned);
                                    parent.addView(newView, index);


                                    List<View> children = getAllChildren(findViewById(R.id.controlElements));
                                    for (int i = 0; i < children.size(); i++) {
                                        if (children.get(i).getId() != R.id.pinToHomescreen) {
                                            children.get(i).setEnabled(deviceData.getJSONObject(jsonData.getString("ID_zarizeni")).getBoolean("Online"));
                                            children.get(i).setClickable(deviceData.getJSONObject(jsonData.getString("ID_zarizeni")).getBoolean("Online"));
                                            children.get(i).setTag(R.id.isOnline, deviceData.getJSONObject(jsonData.getString("ID_zarizeni")).getBoolean("Online"));
                                        }
                                    }
                                }
                            }


                        } catch (JSONException e) {
                            e.printStackTrace();
                        }
                        break;
                    case SmartHomeService.MSG_SERVICE_READY:
                        Intent messageIntent = new Intent("cz.linhy.smarthome.serviceReceiver");
                        messageIntent.putExtra("what", SmartHomeService.MSG_GET_FUNCTIONS);
                        sendBroadcast(messageIntent);

                        break;
                    case SmartHomeService.MSG_HISTORY:
                        try {
                            historyData = new JSONObject(dataBundle.getString("data"));

                            if (currentLayout == LAYOUT_HISTORY) {
                                drawHistory();
                            }
                        } catch (JSONException e) {
                            e.printStackTrace();
                        }
                        break;
                }
            }
        };

        IntentFilter listenerFilter = new IntentFilter();
        listenerFilter.addAction("cz.linhy.smarthome.guiReceiver");
        registerReceiver(receiver, listenerFilter);

        /* Service code */
        if (!serviceOn()) {
            doStartService();
        }
    }

    @Override
    protected void onResume() {
        if (serviceOn()) {
            Log.d("SmartHomeLog", "Resume called..");
            Intent messageIntent = new Intent("cz.linhy.smarthome.serviceReceiver");
            messageIntent.putExtra("what", SmartHomeService.MSG_GET_FUNCTIONS);
            sendBroadcast(messageIntent);
        } else {
            doStartService();
        }
        super.onResume();
    }


    @Override
    protected void onDestroy () {
        unregisterReceiver(receiver);
        super.onDestroy();
    }

    public static void onMenuListClick(View v, MainMenu context) {
        String tag = (String) v.getTag();
        if (tag != null) {
            if (tag.equals("0")) {
                dataLayout.removeAllViewsInLayout();
                View controlView = LayoutInflater.from(context).inflate(R.layout.main_menu_default, null);
                dataLayout.addView(controlView);

                currentLayout = LAYOUT_DEFAULT;
                context.renderPinnedItems();
                context.toggleMenu();
            }
        }
    }

    private void renderPinnedItems() {
        Log.d("SmartHomeLogRender", "Trying to render items");
        try {
            if (currentLayout == LAYOUT_DEFAULT) {
                Log.d("SmartHomeLogRender", "Layout is default");
                if (pinnedHomeScreenData != null) {
                    Log.d("SmartHomeLogRender", "I have pinned screen data: " + pinnedHomeScreenData.toString());
                    JSONObject currentDeviceData = null;
                    Iterator<?> deviceIDs = pinnedHomeScreenData.keys();
                    ViewGroup controlElements = (ViewGroup) findViewById(R.id.controlElements);
                    controlElements.removeAllViews();
                    while (deviceIDs.hasNext()) {
                        boolean addedName = false;
                        String deviceID = (String) deviceIDs.next();
                        Log.d("SmartHomeLogRender", "Rendering for deviceID: " + deviceID);
                        if (deviceData.has(deviceID)) {
                            currentDeviceData = deviceData.getJSONObject(deviceID);

                            Iterator<?> functionIDs = pinnedHomeScreenData.getJSONObject(deviceID).keys();
                            while (functionIDs.hasNext()) {
                                String functionID = (String) functionIDs.next();
                                Log.d("SmartHomeLogRender", "Rendering for functionID: " + functionID);
                                if (pinnedHomeScreenData.getJSONObject(deviceID).getBoolean(functionID)) {
                                    if (currentDeviceData.has(functionID)) {
                                        JSONObject currentFunction = currentDeviceData.getJSONObject(functionID);

                                        Log.d("SmartHomeLogRender", "Building value");
                                        if(!addedName) {
                                            controlElements.addView(ValueBuilder.buildDeviceNameLabel(MainMenu.this, currentDeviceData.getString("Prezdivka_zarizeni")));
                                            addedName = true;
                                        }
                                        controlElements.addView(ValueBuilder.buildView(currentFunction, functionID, MainMenu.this, deviceID, true));

                                        List<View> children = getAllChildren(controlElements);
                                        for (int i = 0; i < children.size(); i++) {
                                            if (children.get(i).getId() != R.id.pinToHomescreen) {
                                                children.get(i).setEnabled(currentDeviceData.getBoolean("Online"));
                                                children.get(i).setClickable(currentDeviceData.getBoolean("Online"));
                                                children.get(i).setTag(R.id.isOnline, currentDeviceData.getBoolean("Online"));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public void closeMenu (View v) {
        if (menuOpen) {
            toggleMenu();
        }
    }

    public void onMenuClick(View v) {
        toggleMenu();
    }

    public void onClickMenuOption (View v) {
        TextView clickedText = (TextView) v;
        //View llParent = (ViewGroup) v.getParent();
        //ViewGroup parent = (ViewGroup) v.getParent().getParent();
        //TextView label = (TextView)parent.findViewById(R.id.labelListHeader);

        //int elementIndex = parent.indexOfChild(llParent);
        //int deviceIndex = ((elementIndex - 1) / 3) + 1;
        openedDeviceID = clickedText.getTag(R.id.deviceID).toString();

        toggleMenu();

        //String deviceName = (String) label.getText();
        String deviceName = deviceNames.get(openedDeviceID);
        if (clickedText.getText().equals("Ovládání")) {
            dataLayout.removeAllViewsInLayout();
            View controlView = LayoutInflater.from(this).inflate(R.layout.main_menu_control, null);
            dataLayout.addView(controlView);

            currentLayout = LAYOUT_CONTROLS;
            renderOptions(openedDeviceID);
        } else if (clickedText.getText().equals("Historie")){
            dataLayout.removeAllViewsInLayout();
            View historyView = LayoutInflater.from(this).inflate(R.layout.main_menu_history, null);
            dataLayout.addView(historyView);

            currentLayout = LAYOUT_HISTORY;

            drawHistory();
        }
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

    public void togglePinHomescreen(View v) {
        Log.d("SmartHomeLog", "Toggling pin to homescreen");
        String deviceID = (String) v.getTag(R.id.deviceID);
        String functionID = (String) v.getTag(R.id.functionID);

        try {
            if (pinnedHomeScreenData == null) {
                pinnedHomeScreenData = new JSONObject();
            }
            if (pinnedHomeScreenData.has(deviceID)) {
                JSONObject deviceObject = pinnedHomeScreenData.getJSONObject(deviceID);
                if (deviceObject.has(functionID)) {
                    boolean previousValue = deviceObject.getBoolean(functionID);
                    deviceObject.put(functionID, !previousValue);
                    if (!previousValue) {
                        v.setBackground(getDrawable(R.drawable.pin_blue));
                    } else {
                        v.setBackground(getDrawable(R.drawable.map_pin));
                    }
                } else {
                    deviceObject.put(functionID, true);
                    v.setBackground(getDrawable(R.drawable.pin_blue));
                }
            } else {
                pinnedHomeScreenData.put(deviceID, new JSONObject().put(functionID, true));
                v.setBackground(getDrawable(R.drawable.pin_blue));
            }

            editor.putString("pinnedDevices", pinnedHomeScreenData.toString());
            editor.commit();

            renderPinnedItems();
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    private void drawHistory() {
        try {
            Log.d("SmartHomeLog", "History data: " + historyData);
            if (historyData == null) {
                Intent messageIntent = new Intent("cz.linhy.smarthome.serviceReceiver");
                messageIntent.putExtra("what", SmartHomeService.MSG_GET_HISTORY);
                sendBroadcast(messageIntent);
            } else {
                Log.d("SmartHomeLog", "Drawing history");
                TableLayout layout = (TableLayout) findViewById(R.id.historyTable);
                layout.removeAllViews();

                if (historyData.has(openedDeviceID)) {
                    JSONObject thisDeviceData = historyData.getJSONObject(openedDeviceID);
                    Iterator<?> keys = thisDeviceData.keys();

                    TableRow infoRow = new TableRow(MainMenu.this);
                    TableRow.LayoutParams lp = new TableRow.LayoutParams(TableRow.LayoutParams.WRAP_CONTENT);
                    infoRow.setLayoutParams(lp);

                    TextView infoUzivatel = new TextView(MainMenu.this);
                    infoUzivatel.setText("Uživatel");

                    TextView infoDruhopravneni = new TextView(MainMenu.this);
                    infoDruhopravneni.setText("Funkce");

                    TextView infoDruhhistorie = new TextView(MainMenu.this);
                    infoDruhhistorie.setText("Druh");

                    TextView infoValue = new TextView(MainMenu.this);
                    infoValue.setText("Hodnota");

                    TextView infoCas = new TextView(MainMenu.this);
                    infoCas.setText("Datum");

                    infoRow.addView(infoUzivatel);
                    infoRow.addView(infoDruhopravneni);
                    infoRow.addView(infoDruhhistorie);
                    infoRow.addView(infoValue);
                    infoRow.addView(infoCas);

                    layout.addView(infoRow);

                    while (keys.hasNext()) {
                        String currentKey = (String) keys.next();

                        JSONObject currentRecord = thisDeviceData.getJSONObject(currentKey);


                        TableRow row = new TableRow(MainMenu.this);
                        row.setLayoutParams(lp);

                        TextView ID_uzivatel = new TextView(MainMenu.this);
                        ID_uzivatel.setText(currentRecord.getString("ID_uzivatel") == "null" ? "" : currentRecord.getString("ID_uzivatel"));

                        TextView ID_druhopravneni = new TextView(MainMenu.this);
                        ID_druhopravneni.setText(currentRecord.getString("Nazev_druhopravneni") == "null" ? "" : currentRecord.getString("Nazev_druhopravneni"));

                        TextView ID_druhhistorie = new TextView(MainMenu.this);
                        ID_druhhistorie.setText(historyActions.get(currentRecord.getString("ID_druhhistorie")));

                        TextView Value = new TextView(MainMenu.this);
                        Value.setText(currentRecord.getString("Value"));


                        TextView Cas = new TextView(MainMenu.this);
                        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
                        try {
                            Date date = format.parse(currentRecord.getString("Cas"));
                            SimpleDateFormat newFormat = new SimpleDateFormat("dd. MM. yyyy HH:mm:ss");
                            Cas.setText(newFormat.format(date));

                        } catch (ParseException e) {
                            Cas.setText("");
                            Log.e("SmartHomeLog", "Parsování času selhalo");
                        }

                        row.addView(ID_uzivatel);
                        row.addView(ID_druhopravneni);
                        row.addView(ID_druhhistorie);
                        row.addView(Value);
                        row.addView(Cas);

                        layout.addView(row);
                    }
                } else {
                    TextView noHistory = new TextView(MainMenu.this);
                    noHistory.setText("Pro toto zařízení nebyly zaznamenány žádné události");

                    layout.addView(noHistory);
                }
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public void renderOptions(String device_id) {
        //String device_id = deviceIDs.get(index - 1);

        JSONObject currentDeviceData = null;
        try {
            currentDeviceData = deviceData.getJSONObject(device_id);
            TextView device_name = (TextView) findViewById(R.id.device_name);
            device_name.setText(currentDeviceData.getString("Prezdivka_zarizeni"));
        } catch (JSONException e) {
            e.printStackTrace();
        }

        Iterator<?> functionIDs = currentDeviceData.keys();
        LinearLayout controlElements = (LinearLayout) findViewById(R.id.controlElements);
        while (functionIDs.hasNext()) {
            String key = (String) functionIDs.next();
            if (!key.equals("Prezdivka_zarizeni") && !key.equals("Online")) {
                try {
                    JSONObject currentFunction = currentDeviceData.getJSONObject(key);

                    boolean isPinned = false;
                    if (pinnedHomeScreenData != null) {
                        if (pinnedHomeScreenData.has(device_id)) {
                            JSONObject deviceData = pinnedHomeScreenData.getJSONObject(device_id);
                            if (deviceData.has(key)) {
                                isPinned = deviceData.getBoolean(key);
                            }
                        }
                    }

                    controlElements.addView(ValueBuilder.buildView(currentFunction, key, this, device_id, isPinned));

                    List<View> children = getAllChildren(findViewById(R.id.controlElements));
                    for (int i = 0; i < children.size(); i++) {
                        if (children.get(i).getId() != R.id.pinToHomescreen) {
                            children.get(i).setEnabled(currentDeviceData.getBoolean("Online"));
                            children.get(i).setClickable(currentDeviceData.getBoolean("Online"));
                            children.get(i).setTag(R.id.isOnline, currentDeviceData.getBoolean("Online"));
                        }
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
        }
    }

    public void toggleMenu() {
        Log.d("SmartHomeLog", "Toggling menu");
        if (menuOpen) {
            newMargin = -300;
        } else {
            newMargin = 0;
        }

        menuOpen = !menuOpen;

        final View menu = findViewById(R.id.menu);

        Animation a = new Animation() {
            @Override
            protected void applyTransformation(float interpolatedTime, Transformation t) {
                ViewGroup.MarginLayoutParams params = (ViewGroup.MarginLayoutParams) (menu.getLayoutParams());
                if (newMargin == 0) {
                    params.leftMargin = convertToPixels( - 300 - (int)(-300 * interpolatedTime));
                } else {
                    params.leftMargin = convertToPixels((int)(newMargin * interpolatedTime));
                }
                menu.setLayoutParams(params);
            }
        };

        a.setDuration(300);
        menu.startAnimation(a);
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

            //Do not add any parents, just add child elements
            result.addAll(getAllChildren(child));
        }
        return result;
    }

    public void onClickAction(View v) {
        Log.d("SmartHomeLog", "OnClickAction got called..");
        String buttonID = v.getTag(R.id.action).toString();
        View value = ((View) v.getParent()).findViewById(R.id.valueView);
        if (value == null) {
            value = v;
        }
        Object functionIDobj = value.getTag(R.id.functionID);
        String functionId = "";
        if (functionIDobj != null) {
            functionId = functionIDobj.toString();
        }
        Log.d("SmartHomeLog", "OnClickAction got called.. Function ID: " + functionId);
        String valueText = ((TextView) value).getText().toString();
        doAction(functionId, buttonID, valueText, this);

    }


    public static void doAction(String functionID, String buttonID, String value, Context context) {
        try {
            int ID_opravneni = deviceData.getJSONObject(openedDeviceID).getJSONObject(functionID).getInt("ID_opravneni");

            JSONObject dataToSend = new JSONObject();
            dataToSend.put("ID_zarizeni", openedDeviceID);
            dataToSend.put("ID_druhopravneni", functionID);
            dataToSend.put("ID_opravneni", ID_opravneni);

            Log.d("SmartHomeLog", "OnClickAction got called.. Switching.. ButtonID: " + buttonID);

            MainMenu sender = new MainMenu();
            Intent messageIntent = new Intent("cz.linhy.smarthome.serviceReceiver");

            switch (buttonID) {
                case "turnOff":
                    dataToSend.put("value", false);
                    messageIntent.putExtra("what", SmartHomeService.MSG_COMMAND);
                    messageIntent.putExtra("data", dataToSend.toString());
                    context.sendBroadcast(messageIntent);

                    break;
                case "turnOn":
                    dataToSend.put("value", true);
                    messageIntent.putExtra("what", SmartHomeService.MSG_COMMAND);
                    messageIntent.putExtra("data", dataToSend.toString());
                    context.sendBroadcast(messageIntent);

                    break;
                case "updateValue":
                    dataToSend.put("value", value);
                    messageIntent.putExtra("what", SmartHomeService.MSG_COMMAND);
                    messageIntent.putExtra("data", dataToSend.toString());
                    context.sendBroadcast(messageIntent);
                    break;
                default:
                    Log.d("SmartHomeLog", "What to do?");
                    break;
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }
}
