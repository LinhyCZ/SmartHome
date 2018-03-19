#include <SmartHome.h>

SmartHome smarthome;

/*
  EEPROM DATA:
  0-40: heslo
  40-100: SSID
  100-150: WIFI Heslo
*/

bool loggedIn = false;
bool status = false;
bool isOn = false;
bool isPressed = false;
bool configReceived = false;

int zasuvkaPin;// = 0;
int togglePin;// = 14;


void setStatus(const char * value) {
  if (configReceived) {
    if (String(value) == "true") {
      status = true;
    } else {
      status = false;
    }

    smarthome.sendBool("8", status);
  }
}

void handleFunctions() {
  if (configReceived) {
    if (status) {
      digitalWrite(zasuvkaPin, HIGH);
    } else {
      digitalWrite(zasuvkaPin, LOW);
    }
  }
}

void handleToggle() {
  if (configReceived) {
    if (digitalRead(togglePin) == 1) {
      if (isPressed == false) {
        if (status == false) {
          setStatus("true");
        } else {
          setStatus("false");
        }
      }
      isPressed = true;
    } else {
      isPressed = false;
    }
  }
}

void receivedStatus(JsonObject& data) {
  setStatus((const char *) data["value"]);
}

void receivedConfig(JsonObject& data) {
  configReceived = true;

  togglePin = data["togglePin"];
  zasuvkaPin = data["zasuvkaPin"];

  pinMode(zasuvkaPin, OUTPUT);
  pinMode(togglePin, OUTPUT);

  digitalWrite(togglePin, LOW);
}

void setup() {
  //Serial.begin(115200);

  //Serial.println("Čekám na sériovou linku 30 vteřin");
  //for (int i = 0; i < 30; i++) {delay(1000); Serial.print(".");}
  //Serial.println(".");
  //savePassword("cV3itmIr53ODk8HoWNB0JDye9LSKy9");

  //Serial.print("Chip Id:");
  //Serial.println(ESP.getChipId());
  //Serial.println("Connecting to Linhartovi");

  smarthome.setDefaultWiFiConnection("HTWR_home", "vanilka1");
  smarthome.onReceivedConfiguration(receivedConfig);

  smarthome.onReceive("8", receivedStatus);

  smarthome.begin();
}

void loop() {
  smarthome.loop();
  handleFunctions();
  handleToggle();
}
