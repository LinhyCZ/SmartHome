#include <SmartHome.h>

/*
  EEPROM DATA:
  0-40: heslo
  40-100: SSID
  100-150: WIFI Heslo
*/

SmartHome smarthome;
String polohy[] = {"Zavřeno", "V pohybu", "Otevřeno", "Chyba"};
String prikazy[] = {"Otevřít", "Zavřít"};
//Otevírání false, zavírání true
bool minulyPohyb;
int poloha;
int posledniPoloha;
bool vPohybu = false;
int majakCheck;

int majakPin = 4;
int fotonkaPin = 5;
int zavrenoPin = 2;
int otevrenoPin = 0;
int startPin = 14;
int stopPin = 12;

void handleDoor() {
  if (digitalRead(majakPin) == 1) {
    if (!vPohybu) {
      minulyPohyb = !minulyPohyb;
    }
    vPohybu = true;
    majakCheck = millis();
    poloha = 1;
  } else {
    if (majakCheck + 2000 < millis()) {
      vPohybu = false;
      poloha = 3;
    }
  }

  if (digitalRead(fotonkaPin) == 1) {
    if (vPohybu) {
      vPohybu = false;
      poloha = 3;
    }
  }

  if (digitalRead(otevrenoPin) == 1) {
    minulyPohyb = false;
    poloha = 2;
  }

  if (digitalRead(zavrenoPin) == 1) {
    minulyPohyb = true;
    poloha = 0;
  }

  if (posledniPoloha != poloha) {
    posledniPoloha = poloha;
    smarthome.sendString("9", polohy[poloha]);
    smarthome.sendBool("10", !minulyPohyb);
  }
}

void handleReceive(JsonObject& data) {
  const char * hodnota = data["value"];
  if (hodnota == "true") {
    if (vPohybu) {
      if (minulyPohyb) {
        digitalWrite(stopPin, HIGH);
        delay(200);
        digitalWrite(stopPin, LOW);
        delay(200);
        digitalWrite(startPin, HIGH);
        delay(200);
        digitalWrite(startPin, LOW);
        minulyPohyb = !minulyPohyb;
      }
    } else {
      if (poloha != 2) {
        if (minulyPohyb) {
          digitalWrite(startPin, HIGH);
          delay(200);
          digitalWrite(startPin, LOW);
        } else {
          digitalWrite(startPin, HIGH);
          delay(200);
          digitalWrite(startPin, LOW);
          delay(200);
          digitalWrite(stopPin, HIGH);
          delay(200);
          digitalWrite(stopPin, LOW);
          delay(200);
          digitalWrite(startPin, HIGH);
          delay(200);
          digitalWrite(startPin, LOW);
        }
      }
    }
  } else {
    if (vPohybu) {
      if (!minulyPohyb) {
        digitalWrite(stopPin, HIGH);
        delay(200);
        digitalWrite(stopPin, LOW);
        delay(200);
        digitalWrite(startPin, HIGH);
        delay(200);
        digitalWrite(startPin, LOW);
        minulyPohyb = !minulyPohyb;
      }
    } else {
      if (poloha != 0) {
        if (!minulyPohyb) {
          digitalWrite(startPin, HIGH);
          delay(200);
          digitalWrite(startPin, LOW);
        } else {
          digitalWrite(startPin, HIGH);
          delay(200);
          digitalWrite(startPin, LOW);
          delay(200);
          digitalWrite(stopPin, HIGH);
          delay(200);
          digitalWrite(stopPin, LOW);
          delay(200);
          digitalWrite(startPin, HIGH);
          delay(200);
          digitalWrite(startPin, LOW);
        }
      }
    }
  }
}

void setup() {
  smarthome.setDefaultWiFiConnection("HTWR_home", "vanilka1");
  smarthome.onReceive("10", handleReceive);
  smarthome.begin();

}

void loop() {
  handleDoor();
  smarthome.loop();
}
