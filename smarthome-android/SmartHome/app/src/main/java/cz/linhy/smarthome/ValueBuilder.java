package cz.linhy.smarthome;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.support.annotation.Nullable;
import android.support.constraint.ConstraintLayout;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.RemoteViews;
import android.widget.TextView;

import com.larswerkman.holocolorpicker.ColorPicker;
import com.larswerkman.holocolorpicker.SVBar;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Created by Tomáš on 24. 2. 2018.
 */

public class ValueBuilder {
    private static MainMenu _context;

    public static View buildDeviceNameLabel(MainMenu context, String data) {
        LinearLayout nameLayout = (LinearLayout) LayoutInflater.from(context).inflate(R.layout.device_name_label, null);
        TextView nameText = (TextView) nameLayout.findViewById(R.id.deviceName);
        nameText.setText(data);
        return nameLayout;
    }

    public static View buildView(JSONObject data, String functionID, MainMenu context, String deviceID, boolean isPinned) {
        _context = context;
        try {
            int viewID = 0;
            boolean isBool = false;
            Log.d("SmartHomeLog", data.toString());
            String guiID = data.getString("ID_GUI");
            int dataTypeResource = context.getResources().getIdentifier("f" + guiID, "string", context.getPackageName());
            if (dataTypeResource != 0) {
                JSONArray dataTypesArray = new JSONArray(context.getResources().getString(dataTypeResource));
                for (int i = 0; i < dataTypesArray.length(); i++) {
                    if (dataTypesArray.getString(i).equals("bool")) {
                        isBool = true;
                        break;
                    }
                }
            }

            if (isBool) {
                if (data.getBoolean("Cteni") && data.getBoolean("Zapis")) {
                    if (data.getBoolean("LastValues")) {
                        viewID = context.getResources().getIdentifier("rw" + guiID + "t", "layout", context.getPackageName());
                    } else {
                        viewID = context.getResources().getIdentifier("rw" + guiID + "f", "layout", context.getPackageName());
                    }
                } else if (data.getBoolean("Zapis")) {
                    viewID = context.getResources().getIdentifier("w" + guiID, "layout", context.getPackageName());
                } else {
                    if (data.getBoolean("LastValues")) {
                        viewID = context.getResources().getIdentifier("r" + guiID + "t", "layout", context.getPackageName());
                    } else {
                        viewID = context.getResources().getIdentifier("r" + guiID + "f", "layout", context.getPackageName());
                    }
                }
            } else {
                if (data.getBoolean("Cteni") && data.getBoolean("Zapis")) {
                    viewID = context.getResources().getIdentifier("rw" + guiID, "layout", context.getPackageName());
                } else if (data.getBoolean("Zapis")) {
                    viewID = context.getResources().getIdentifier("w" + guiID, "layout", context.getPackageName());
                } else {
                    viewID = context.getResources().getIdentifier("r" + guiID, "layout", context.getPackageName());
                }
            }

            if (viewID == 0) return null;

            View functionWrapper = LayoutInflater.from(context).inflate(R.layout.value_wrapper, null);

            View function = LayoutInflater.from(context).inflate(viewID, null);
            TextView valueText = (TextView) function.findViewById(R.id.valueView);
            View onClickView = function.findViewById(R.id.onClick);
            if (onClickView != null) {
                onClickView.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        _context.onClickAction(v);
                    }
                });
            }
            if (valueText == null) {
                valueText = (TextView) function.findViewById(R.id.onClick);
            }
            ConstraintLayout parentLayout = (ConstraintLayout) function.findViewById(R.id.functionParentLayout);
            parentLayout.setTag(functionID);

            TextView functionNameText = (TextView) function.findViewById(R.id.functionName);
            functionNameText.setText(data.getString("Nazev_opravneni"));

            if (guiID.equals("4")) {
                if (data.getBoolean("Cteni") && !data.getBoolean("Zapis")) {
                    valueText.setBackgroundColor(Color.parseColor("#" + data.getString("LastValue")));
                } else {
                    ColorPicker picker = (ColorPicker) function.findViewById(R.id.picker);
                    SVBar svBar = (SVBar) function.findViewById(R.id.svbar);

                    picker.addSVBar(svBar);

                    picker.setShowOldCenterColor(false);


                    final ColorChangeListener listener = new ColorChangeListener(functionID, picker, context);

                    svBar.setOnTouchListener(new View.OnTouchListener() {
                        @Override
                        public boolean onTouch(View v, MotionEvent event) {
                            if (event.getAction() == MotionEvent.ACTION_CANCEL || event.getAction() == MotionEvent.ACTION_UP) {
                                    listener.onSVBarChanged();
                            }
                            return false;
                        }
                    });

                    /*picker.setOnTouchListener(new View.OnTouchListener() {

                        @Override
                        public boolean onTouch(View v, MotionEvent event) {
                            if ((Boolean) v.getTag(R.id.isOnline) == true) {
                                return false;
                            } else {
                                Log.d("SmartHomeLog", "Trying to override on touch");
                                return true;
                            }
                        }
                    });*/

                    picker.setOnColorChangedListener(listener.getClassListener());
                    picker.setOnColorSelectedListener(listener.getClassListener());

                    if (data.getBoolean("Cteni")) {
                        picker.setColor(Color.parseColor("#" + data.getString("LastValues")));
                    }

                }
            } else {
                if (!isBool) {
                    if(data.has("LastValue")) {
                        valueText.setText(data.getString("LastValue"));
                    }
                }
                valueText.setTag(R.id.functionID, functionID);
            }


            LinearLayout wrapperLayout = (LinearLayout) functionWrapper.findViewById(R.id.functionValueWrapper);
            Button pinButton = (Button) functionWrapper.findViewById(R.id.pinToHomescreen);
            pinButton.setTag(R.id.functionID, functionID);
            pinButton.setTag(R.id.deviceID, deviceID);
            if (isPinned) {
                pinButton.setBackground(context.getDrawable(R.drawable.pin_blue));
            }

            wrapperLayout.addView(function);
            return functionWrapper;
        } catch (JSONException e) {
            Log.d("SmartHomeLog", e.toString());
            return null;
        }
    }

    public static RemoteViews buildRemoteView(JSONObject data, String functionID, String deviceID, Context context) {
        try {
            RemoteViews function;
            int viewID = 0;
            boolean isBool = false;
            Log.d("SmartHomeLog", data.toString());
            String guiID = data.getString("ID_GUI");
            int dataTypeResource = context.getResources().getIdentifier("f" + guiID, "string", context.getPackageName());
            if (dataTypeResource != 0) {
                JSONArray dataTypesArray = new JSONArray(context.getResources().getString(dataTypeResource));
                for (int i = 0; i < dataTypesArray.length(); i++) {
                    if (dataTypesArray.getString(i).equals("bool")) {
                        isBool = true;
                        break;
                    }
                }
            }

            if (isBool) {
                if (data.getBoolean("Cteni") && data.getBoolean("Zapis")) {
                    if (data.getBoolean("LastValues")) {
                        viewID = context.getResources().getIdentifier("widget_rw" + guiID + "t", "layout", context.getPackageName());
                    } else {
                        viewID = context.getResources().getIdentifier("widget_rw" + guiID + "f", "layout", context.getPackageName());
                    }
                } else if (data.getBoolean("Zapis")) {
                    viewID = context.getResources().getIdentifier("widget_w" + guiID, "layout", context.getPackageName());
                } else {
                    if (data.getBoolean("LastValues")) {
                        viewID = context.getResources().getIdentifier("widget_r" + guiID + "t", "layout", context.getPackageName());
                    } else {
                        viewID = context.getResources().getIdentifier("widget_r" + guiID + "f", "layout", context.getPackageName());
                    }
                }
            } else {
                if (data.getBoolean("Cteni") && data.getBoolean("Zapis")) {
                    viewID = context.getResources().getIdentifier("widget_rw" + guiID, "layout", context.getPackageName());
                } else if (data.getBoolean("Zapis")) {
                    viewID = context.getResources().getIdentifier("widget_w" + guiID, "layout", context.getPackageName());
                } else {
                    viewID = context.getResources().getIdentifier("widget_r" + guiID, "layout", context.getPackageName());
                }
            }

            Log.d("SmartHomeLog", "Building remote view for widget: " + guiID);

            Intent action = new Intent(context, SmartHomeWidget.class);
            action.setAction("cz.linhy.smarthome.widgetAction");

            if (viewID == 0 || guiID.equals("4") || guiID.equals("3")) {
                Log.d("SmartHomeLog", "Widget view not found, using default one");
                function = new RemoteViews(context.getPackageName(), R.layout.widget_default_layout);
                action.putExtra("command", "app");
            } else {
                function = new RemoteViews(context.getPackageName(), viewID);

                function.setTextViewText(R.id.functionName, data.getString("Nazev_opravneni"));

                action.putExtra("lastValue", data.getBoolean("LastValue"));
            }

            action.putExtra("functionID", functionID);
            action.putExtra("deviceID",  deviceID);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, action, 0);

            function.setOnClickPendingIntent(R.id.onClick, pendingIntent);

            return function;
        } catch (JSONException e) {
            Log.d("SmartHomeLog", e.toString());
            return null;
        }
    }
}
