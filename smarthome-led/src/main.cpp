#include <SocketIoClient.h>
#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

SocketIoClient socket;

/*
  EEPROM DATA:
  0-40: heslo
  40-100: SSID
  100-150: WIFI Heslo
*/

ESP8266WiFiMulti wifiMulti;

String functions = "[6, 8]";
bool loggedIn = false;
bool status = false;
bool isOn = false;
bool isPressed = false;

String RGBstring = "ffffff";

int R = 0;
int G = 0;
int B = 0;

int Rpin = 0;
int Gpin = 4;
int Bpin = 5;
int togglePin = 14;

void eraseEEPROM(size_t start, size_t length) {
  for (int i = 0 ; i < length ; i++) {
    EEPROM.write(start + i, 255);
  }

  EEPROM.commit();
}

String readEEPROM(size_t start, size_t length) {
  String buffer;
  for (size_t i=0; i < length; i++) {
    if(EEPROM.read(start+i) != 255) {
      buffer += (char)EEPROM.read(start+i);
    }
  }

  return buffer;
}

String getPassword() {
  return readEEPROM(0, 40);
}

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

void connect(const char * payload, size_t length) {
  StaticJsonBuffer<300> buffer;
  JsonObject& data = buffer.createObject();
  data["device_id"] = ESP.getChipId();
  data["password"] = getPassword();
  data["functions"] = functions;

  char sendJson[128];

  data.printTo(sendJson);

  //delay(30000);

  //Serial.println(sendJson);
  socket.emit("dev_login", sendJson);
}

void writeEEPROM(const char * data, size_t start) {
  for (size_t i=0; strlen(data) > i; i++) {
    EEPROM.write(start + i, data[i]);
  }
  EEPROM.commit();
  //Serial.println("Zapsáno do paměti EEPROM");
}

void savePassword(const char * data) {
  eraseEEPROM(0, 40);
  writeEEPROM(data, 0);
}


bool getStatus() {
  if (random(2) == 1) {
    return false;
  } else {
    return true;
  }
}

void setStatus(const char * value) {
  if (String(value) == "true") {
    status = true;
  } else {
    status = false;
  }

  String statusMessage = "{\"8\": ";
  if (status) {
     statusMessage += "true";
  } else {
     statusMessage += "false";
  }
  statusMessage += "}";
  char buffer[statusMessage.length() + 1];
  statusMessage.toCharArray(buffer, statusMessage.length() + 1);
  socket.emit("status_to_server", buffer);
}

void setLight(const char * value) {
  //Serial.print("Test světla: " );

  RGBstring = value;

  String strVal = String(value);

  R = hexToDec(strVal.substring(0,2));
  G = hexToDec(strVal.substring(2,4));
  B = hexToDec(strVal.substring(4,6));

  //Serial.print("R:"); Serial.println(R);
  //Serial.print("G:"); Serial.println(G);
  //Serial.print("B:"); Serial.println(B);

  String statusMessage = "{\"6\": \"" + String(value) + "\"}";
  char buffer[statusMessage.length() + 1];
  statusMessage.toCharArray(buffer, statusMessage.length() + 1);
  socket.emit("status_to_server", buffer);
}

void login(const char * payload, size_t length) {
  //Serial.print("Login reponse: "); Serial.println(payload);
  //Serial.print(payload);Serial.print("==");Serial.println("true");
  if (String(payload) == "true") {
    //Serial.println("Setting logged in to true");
    loggedIn = true;

    char buffer[RGBstring.length() + 1];
    RGBstring.toCharArray(buffer, RGBstring.length() + 1);
    setLight(buffer);
    if (status) {
      setStatus("true");
    } else {
      setStatus("false");
    }

  } else {
    //Serial.println("Setting logged in to false");
    loggedIn = false;
  }
  //Serial.print("Logged in value:"); Serial.println(loggedIn);
}

void registerPass(const char * payload, size_t length) {
  savePassword(payload);
  //(const char *)data["password"]
  //Serial.println(getPassword());
}

void handleCommand(const char * payload, size_t size) {
  String toParse = String(payload);

  toParse.replace("\\\"", "\"");

  //Serial.println(toParse);
  //Serial.println(payload);
  //Serial.print("Logged in: "); Serial.println(loggedIn);
  if (loggedIn) {
    StaticJsonBuffer<1000> buffer;
    JsonObject& data = buffer.parseObject(toParse);
    if (!data.success()) {
      //Serial.println("Parsování selhalo..");
      return;
    }
    const int function = data["function"];
    switch (function){
      case 6: setLight((const char *) data["value"]); break;
      case 8: setStatus((const char *) data["value"]); break;
      //default: Serial.print("Neznámá funkce. ID funkce: "); Serial.println(function); break;
    }
  }
}

void handleFunctions() {
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

void handleToggle() {
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


void setup() {
  //Serial.begin(115200);

  //Serial.println("Čekám na sériovou linku 30 vteřin");
  //for (int i = 0; i < 30; i++) {delay(1000); Serial.print(".");}
  //Serial.println(".");

  EEPROM.begin(4096);
  savePassword("cV3itmIr53ODk8HoWNB0JDye9LSKy9");

  //Serial.print("Chip Id:");
  //Serial.println(ESP.getChipId());
  //Serial.println("Connecting to Linhartovi");

  wifiMulti.addAP("LinhyCZ", "LinhyCZ1");
  wifiMulti.addAP("Linhartovi", "jk383384");
  wifiMulti.addAP("HTWR_home", "vanilka1");
  wifiMulti.addAP("Wifi-Linhart", "kobrety1");

  while (wifiMulti.run() != WL_CONNECTED) {
    delay(500);
    //Serial.print(".");
  }


  //Serial.print("Připojeno! Lokální adresa: ");
  //Serial.println(WiFi.localIP());

  //Serial.println(getPassword());

  socket.on("connect", connect);
  socket.on("dev_login_response", login);
  socket.on("register_pass", registerPass);
  socket.on("command", handleCommand);

  socket.begin("linhy.cz", 8881, "/socket.io/?transport=websocket");

  pinMode(Rpin, OUTPUT);
  pinMode(Gpin, OUTPUT);
  pinMode(Bpin, OUTPUT);
  pinMode(togglePin, OUTPUT);

  digitalWrite(togglePin, LOW);

  analogWriteRange(255);
}

void loop() {
  socket.loop();
  handleFunctions();
  handleToggle();
}
