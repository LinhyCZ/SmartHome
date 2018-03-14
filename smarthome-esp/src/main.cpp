#include <SmartHome.h>

/*
  EEPROM DATA:
  0-40: heslo
  40-100: SSID
  100-150: WIFI Heslo
*/

bool status = false;
bool isOn = false;
SmartHome smarthome;

void sendStatus() {
  if (status) {
    smarthome.send("5", "true");
  } else {
    smarthome.send("5", "false");
  }
}

void setTemp(JsonObject& data) {
  Serial.print("Výplňková funkce. Teplota: ");
  Serial.println((const char *) data["value"]);
}

void getStatus(JsonObject& data) {
  Serial.print("TESTOVACI FUNKCE: ");
  Serial.println((const char *) data["value"]);
  if (String((const char *) data["value"]) == "true") {
    status = true;
  } else {
    status = false;
  }
  sendStatus();
}


void sendFunction(bool status) {
  if (status) {
     smarthome.send("3", "true");
  } else {
     smarthome.send("3", "false");
  }
}

void handleFunctions() {
  if (digitalRead(4) == 1) {
    if (!isOn) {
      isOn = true;
      sendFunction(true);
    }
  } else {
    if (isOn) {
      isOn = false;
      sendFunction(false);
    }
  }
}


void setup() {
  Serial.begin(115200);

  Serial.println("Čekám na sériovou linku 30 vteřin");
  for (int i = 0; i < 30; i++) {delay(1000); Serial.print(".");}
  Serial.println(".");

  EEPROM.begin(4096);
  //savePassword("TestovaciHeslo");

  Serial.print("Chip Id:");
  Serial.println(ESP.getChipId());
  Serial.println("Connecting to Linhartovi");


  /*wifiMulti.addAP("LinhyCZ", "LinhyCZ1");
  wifiMulti.addAP("Linhartovi", "jk383384");
  wifiMulti.addAP("HTWR_home", "vanilka1");
  wifiMulti.addAP("Wifi-Linhart", "kobrety1");*/

  smarthome.setDefaultWiFiConnection("Linhartovi", "jk383384");
  smarthome.onReceive("2", setTemp);
  smarthome.onReceive("4", getStatus);
  smarthome.begin();


  //sendStatus();

  pinMode(4, OUTPUT);
  digitalWrite(4, LOW);
}

void loop() {
  smarthome.loop();
  handleFunctions();
}
