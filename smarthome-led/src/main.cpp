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

String RGBstring = "ffffff";

int R = 0;
int G = 0;
int B = 0;

int Rpin;// = 0;
int Gpin;// = 4;
int Bpin;// = 5;
int togglePin;// = 14;


int hexToDec(String hexString) {
  int decValue = 0;
  char nextInt;
  for ( long i = 0; i < hexString.length(); i++ ) {
    nextInt = toupper(hexString[i]);
    if( isxdigit(nextInt) ) {
        if (nextInt >= '0' && nextInt <= '9') nextInt = nextInt - '0';
        if (nextInt >= 'A' && nextInt <= 'F') nextInt = nextInt - 'A' + 10;
        decValue = (decValue << 4) + nextInt;
    }
  }
  return decValue;
}


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

void setLight(const char * value) {
  if (configReceived) {
    //Serial.print("Test světla: " );

    RGBstring = value;

    String strVal = String(value);

    R = hexToDec(strVal.substring(0,2));
    G = hexToDec(strVal.substring(2,4));
    B = hexToDec(strVal.substring(4,6));

    //Serial.print("R:"); Serial.println(R);
    //Serial.print("G:"); Serial.println(G);
    //Serial.print("B:"); Serial.println(B);

    smarthome.sendString("6", String(value));
  }
}

void handleFunctions() {
  if (configReceived) {
    if (status) {
      ///*Serial.print("R: " + R);
      //Serial.print("G: " + G);
      //Serial.print("B: " + B);*/
      analogWrite(Rpin, R);
      analogWrite(Gpin, G);
      analogWrite(Bpin, B);
    } else {
      analogWrite(Rpin, 0);
      analogWrite(Gpin, 0);
      analogWrite(Bpin, 0);
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

void receivedColor(JsonObject& data) {
  setLight((const char *) data["value"]);
}

void receivedConfig(JsonObject& data) {
  configReceived = true;
  Rpin = data["Rpin"];
  Gpin = data["Gpin"];
  Bpin = data["Bpin"];
  togglePin = data["togglePin"];

  pinMode(Rpin, OUTPUT);
  pinMode(Gpin, OUTPUT);
  pinMode(Bpin, OUTPUT);
  pinMode(togglePin, OUTPUT);

  digitalWrite(togglePin, LOW);

  analogWriteRange(255);
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
  smarthome.onReceive("6", receivedColor);

  smarthome.begin();
}

void loop() {
  smarthome.loop();
  handleFunctions();
  handleToggle();
}
