package cz.linhy.smarthome;

import android.app.ActivityManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONException;
import org.json.JSONObject;


public class LoginForm extends AppCompatActivity {
    private TextView wrongLogin;
    private EditText usernameInput;
    private EditText passwordInput;
    private BroadcastReceiver receiver;
    private SharedPreferences preferences;
    private SharedPreferences.Editor editor;

    void doStartService () {
        startService(new Intent(LoginForm.this, SmartHomeService.class));
    }


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(cz.linhy.smarthome.R.layout.login_screen);

        if (!serviceOn()) {
            doStartService();
        }

        Log.d("SmartHomeLogValue", "Showing login form");

        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                int what = intent.getExtras().getInt("what");

                switch (what) {
                    case SmartHomeService.MSG_SUCCESS_LOGIN:
                        if (((CheckBox) findViewById(R.id.loginCheckbox)).isChecked()) {
                            editor.putString("username", usernameInput.getText().toString());
                            editor.putString("password", passwordInput.getText().toString());
                            editor.putBoolean("isChecked", true);
                        } else {
                            editor.putString("username", "");
                            editor.putString("password", "");
                            editor.putBoolean("isChecked", false);
                        }
                        editor.commit();

                        Intent activity = new Intent(LoginForm.this, MainMenu.class);
                        startActivity(activity);
                        finish();
                        break;
                    case SmartHomeService.MSG_UNSUCCESS_LOGIN:
                        doUnsuccessLogin();
                        break;
                    case SmartHomeService.MSG_NOT_CONNECTED:
                        wrongLogin.setText("Probíhá opětovné připojení k serveru. Opakujte pokus o přihlášneí.");
                        break;
                    default:
                        break;
                }
            }
        };

        IntentFilter listenerFilter = new IntentFilter();
        listenerFilter.addAction("cz.linhy.smarthome.guiReceiver");
        registerReceiver(receiver, listenerFilter);

        final Button loginButton = (Button) findViewById(cz.linhy.smarthome.R.id.loginButton);
        usernameInput = (EditText) findViewById(cz.linhy.smarthome.R.id.nameInput);
        passwordInput = (EditText) findViewById(cz.linhy.smarthome.R.id.hesloInput);

        preferences = getSharedPreferences("remember_data", Context.MODE_PRIVATE);
        editor = preferences.edit();
        String username = preferences.getString("username", "");
        String password = preferences.getString("password", "");
        Boolean isChecked = preferences.getBoolean("isChecked", false);
        CheckBox rememberLogin = (CheckBox) findViewById(R.id.loginCheckbox);
        rememberLogin.setChecked(isChecked);


        usernameInput.setText(username);
        passwordInput.setText(password);

        wrongLogin = (TextView) findViewById(cz.linhy.smarthome.R.id.wrongLogin);

        usernameInput.setOnTouchListener(new View.OnTouchListener() {
                @Override
                public boolean onTouch(View view, MotionEvent motionEvent) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            wrongLogin.setVisibility(View.INVISIBLE);
                        }
                    });

                    return false;
                }
            });

        passwordInput.setOnTouchListener(new View.OnTouchListener() {
                @Override
                public boolean onTouch(View view, MotionEvent motionEvent) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            wrongLogin.setVisibility(View.INVISIBLE);
                        }
                    });

                    return false;
                }
            });
        loginButton.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    if (usernameInput.getText().toString().trim().equals("")) {
                        usernameInput.setError("Zadejte uživatelské jméno!");
                        return;
                    }

                    if (passwordInput.getText().toString().trim().equals("")) {
                        passwordInput.setError("Zadejte heslo!");
                        return;
                    }

                    JSONObject login_credentials = new JSONObject();
                    try {
                        login_credentials.put("user", usernameInput.getText().toString());
                        login_credentials.put("pass", passwordInput.getText().toString());

                        Intent messageIntent = new Intent("cz.linhy.smarthome.serviceReceiver");
                        messageIntent.putExtra("what", SmartHomeService.MSG_LOGIN_CREDENTIALS);
                        messageIntent.putExtra("data", login_credentials.toString());
                        sendBroadcast(messageIntent);
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        unregisterReceiver(receiver);
    }

    private void doUnsuccessLogin() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                wrongLogin.setVisibility(View.VISIBLE);

                return;
            }
        });
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
}
