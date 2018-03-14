package cz.linhy.smarthome;

import android.content.Context;
import android.content.IntentFilter;
import android.util.Log;
import android.view.View;

import com.larswerkman.holocolorpicker.ColorPicker;

/**
 * Created by Tomáš on 28. 2. 2018.
 */

public class ColorChangeListener implements ColorPicker.OnColorSelectedListener, ColorPicker.OnColorChangedListener {
    private String _functionID;
    private ColorPicker _picker;
    private Context _context;
    private Integer _oldColor;
    private boolean softwareChange = false;

    public ColorChangeListener(String functionID, ColorPicker picker, Context context) {
        _functionID = functionID;
        _picker = picker;
        _context = context;
    }

    public ColorChangeListener getClassListener() {
        return this;
    }

    public void onSVBarChanged() {
        if (_picker.getTag(R.id.isOnline) != null) {
            if ((Boolean) _picker.getTag(R.id.isOnline)) {
                MainMenu.doAction(_functionID, "updateValue", Integer.toHexString(_picker.getColor()).substring(2), _context);
            }
        }
    }

    @Override
    public void onColorSelected(int color) {
        if (_picker.getTag(R.id.isOnline) != null) {
            if ((Boolean) _picker.getTag(R.id.isOnline)) {
                Log.d("SmartHomeLog", "Color changed!: " + Integer.toHexString(color).substring(2));
                MainMenu.doAction(_functionID, "updateValue", Integer.toHexString(color).substring(2), _context);
                _oldColor = color;
            }
        } else {
            Log.d("SmartHomeLog", "Color changed!: " + Integer.toHexString(color).substring(2));
            MainMenu.doAction(_functionID, "updateValue", Integer.toHexString(color).substring(2), _context);
            _oldColor = color;
        }
    }

    @Override
    public void onColorChanged(int color) {
        Log.d("SmartHomeLog", "Tag value" + _picker.getTag(R.id.isOnline));
        if (_picker.getTag(R.id.isOnline) != null) {
            if (!(Boolean) _picker.getTag(R.id.isOnline)) {
                if (!softwareChange) {
                    Log.d("SmartHomeLog", "COLOR CHANGED! SETTING BACK TO: " + _oldColor);
                    softwareChange = true;
                    _picker.setColor(_oldColor);
                } else {
                    Log.d("SmartHomeLog", "Event after software change, ignoring..");
                    softwareChange = false;
                }
            }
        } else {
            _oldColor = color;
            Log.d("SmartHomeLog", "Setting color to: " + _oldColor);
        }
    }
}
