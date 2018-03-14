#include <Arduino.h>
#include <ESP8266Wifi.h>
#include <ESP8266WebServer.h>
#include <SHT1X.h>
#include <EEPROM.h>

/*
* DEFINICE PINŮ - viz Nákres PLC
*/
int Vent1 = 16; //OUT
//int Vent2 = 0; //OUT
//int Water = 4; //IN
//int Voltage = 0; //IN
int Light1 = 2; //OUT
int Light2 = 1; //OUT
int Heat1 = 5; //OUT
int Heat2 = 14; //OUT
int Heat3 = 12; //OUT
int Steam = 15; //OUT
//int Door = 5; //IN
int CLK = 13; //OUT - temp
int Temp1 = 4; //IN - temp
int Temp2 = 0; //IN - temp ANALOGOVY PIN NEFUNGUJE S TEPLOMEREM

IPAddress ip(192,168,0,253);
IPAddress gateway(192,168,0,1);
IPAddress subnet(255,255,255,0);

/*IPAddress ip(10,0,0,253);
IPAddress gateway(10,0,0,138);
IPAddress subnet(255,255,255,0);*/


ESP8266WebServer server(80);
SHT1x sensorTop(Temp1, CLK);
SHT1x sensorBottom(Temp2, CLK);

int finalTemp;
int finalHumidity;
bool status = false;
int tempThreshold = 20;
int humidityThreshold = 10;
int mode = 0;
int nextTempCheck = 0;
bool isWater = true;
bool Light1Value = false;
bool Light2Value = false;
bool ventilator = false;
bool justStarted = true;
double powerUsage = 0;
double cyclePowerUsage = 0;
int lastPowerCheck = 0;
int koeficient = 0;
int oldKoeficient = 0;
int turboDelta = 20;

long currentTime = 0;
long lastMillis = 0;
long turnOffIn = 0;

float tempTop = 0;
float tempBottom = 0;
float humidityTop = 0;
float humidityBottom = 0;
//String diagnostics = "";

float readEEPROM() {
  char buffer[10];
  for (size_t i=0; i < 10; i++) {
    if(EEPROM.read(i) != 255) {
      buffer[i] = (char)EEPROM.read(i);
    }
  }
  return atof(buffer);
}

void writeEEPROM(float value) {
  char data[50];
  sprintf(data, "%f", value);
  for (size_t i=0; strlen(data) > i; i++) {
    EEPROM.write(i, data[i]);
  }
  EEPROM.commit();
}


void setTemperature(int temperature) {
  finalTemp = temperature;
}

void setHumidity(int humidity) {
  finalHumidity = humidity;
}

bool isClosed() {
  return true;
  //return digitalRead(Door);
}

void turnOn() {
  status = true;
}

void turnOff() {
  status = false;
}

void setMode(int mod) {
  mode = mod;
}

float getTempBottom() {
  return tempBottom;
}


float getTempTop() {
  return tempTop;
}

float getHumidityTop() {
  return humidityTop;
}

float getHumidityBottom() {
  return humidityBottom;
}

void setLight(int light, bool value) {
  if (light == 1) {
    Light1Value = value;
    digitalWrite(Light1, !Light1Value);
  } else if (light == 2) {
    Light2Value = value;
    digitalWrite(Light2, !Light2Value);
  }
}

void setVent(bool value) {
  ventilator = value;
}

void setDelta(int value) {
  turboDelta = value;
}

double getPowerUsage() {
  return powerUsage;
}

double getCyclePowerUsage() {
  return cyclePowerUsage;
}

void update_temps() {
  tempBottom = sensorBottom.readTemperatureC();
  tempTop = sensorTop.readTemperatureC();
  humidityTop = sensorTop.readHumidity();
  humidityBottom = sensorBottom.readHumidity();
}

/*void checkWater() {
  //analogWrite(Steam, 255);
  delay(200);
  //isWater = digitalRead(Water);
  if (getHumidityTop() < humidityThreshold) {
    //analogWrite(Steam, 255/(humidityThreshold / getHumidityTop()));
  } else {
    //analogWrite(Steam, 255);
  }
}*/

/*int getTimerRemaining() {
  return (turnOffIn - currentTime) / 1000 / 60;
}*/

void sendResponse() {
  String message = F("<head><meta charset='UTF-8'><title>Ovládání sauny</title></head><body><H1>Nastavení sauny</H1>");
  message += F("<H2>Aktuální teploty:</H2><H4>Horní čidlo: ");
  message += getTempTop();
  message += F("</H4><H4>Dolní čidlo: ");
  message += getTempBottom();
  message += F("</h4><h3>Aktuální mód - ");
  if (mode == 0) {
    message += F("Finská sauna");
    message += F("</H3><H2>Cílová teplota: ");
    message += finalTemp;
  } else if (mode == 1) {
    message += F("Bio sauna");
    message += F("</H3><H2>Cílová vlhkost: ");
    message += finalHumidity;
  } else {
    message += F("Vlastní");
    message += F("</H3><H2>Cílová teplota: ");
    message += finalTemp;
    message += F("</H2><H2>Cílová vlhkost: ");
    message += finalHumidity;
  }
  message += F("</H2><H2>Aktuální hodnoty vlhkosti</H2><H4>Horní čidlo: ");
  message += getHumidityTop();
  message += F("%</H4><H4>Dolní čidlo: ");
  message += getHumidityBottom();
  message += F("%</H4></H2><H2>Aktuální stav</H2><H4>Sauna je aktuálně ");
  message += (status == true ? F("<span style='color: green'>zapnutá</span>") : F("<span style='color: red'>vypnutá</span>"));
  message += F("</H4><H4>Dveře jsou aktuálně: ");
  message += (isClosed() ? F("<span style='color: green'>zavřené</span>") : F("<span style='color: red'>otevřené</span>"));
  message += F("</H4><H2>Ovládání</H2>");
  if (mode == 0) {
    message += F("<h3>Mód: Finská sauna:<input type='radio' checked>&nbsp;&nbsp;Bio sauna:<input type='radio' onclick='document.location=\"?mod=1\"'>&nbsp;&nbsp;Vlastní:<input type='radio' onclick='document.location=\"?mod=2\"'>");
    message += F("<H4>Cílová teplota: <form><input type='number' name='setTemp'>C&nbsp;&nbsp;&nbsp;<input type='submit'></form>");
  } else if (mode == 1) {
    message += F("<h3>Mód: Finská sauna:<input type='radio' onclick='document.location=\"?mod=0\"'>&nbsp;&nbsp;Bio sauna:<input type='radio' checked>&nbsp;&nbsp;Vlastní:<input type='radio' onclick='document.location=\"?mod=2\"'>");
    message += F("<H4>Cílová vlhkost: <form><input type='number' name='setHumidity'>%&nbsp;&nbsp;&nbsp;<input type='submit'></form></h4>");
    if (!isWater) {
      message += F("<h3 style='color: red'>Nedostatek vody ve vyvíječi!</h3>");
    }
  } else {
    message += F("<h3>Mód: Finská sauna:<input type='radio' onclick='document.location=\"?mod=0\"'>&nbsp;&nbsp;Bio sauna:<input type='radio' onclick='document.location=\"?mod=1\"'>&nbsp;&nbsp;Vlastní:<input type='radio' checked>");
    message += F("<H4>Cílová teplota a vlhkost: <form><input type='number' name='setTemp'>C&nbsp;&nbsp;&nbsp;<input type='number' name='setHumidity'>%&nbsp;&nbsp;&nbsp;<input type='submit'></form></h4>");
  }
  message += F("<form id='vypnuti'><h4>Automaticky vypnout za: </h4><input type='range' max='120' min='0' name='timer' value='");
  //message += getTimerRemaining();
  message += F("' onchange='document.getElementById(\"vypnuti\").submit()' oninput='document.getElementById(\"timer_minutes\").innerHTML = this.value'><span id='timer_minutes'></span></form>");
  message += F("<H2>Turbo mód: </H2>");
  if (ventilator) {
    message += F("<p>Zapnuto:<input type='radio' checked>&nbsp;&nbsp;Vypnuto:<input type='radio' onclick='document.location=\"?vent=false\"'></p>");
  } else {
    message += F("<p>Zapnuto:<input type='radio' onclick='document.location=\"?vent=true\"'>&nbsp;&nbsp;Vypnuto:<input type='radio' checked></p>");
  }
  message += F("<form>Turbo delta: <input type='number' name='delta' value='");
  message += turboDelta;
  message += F("'><input type='submit'></form>");
  message += F("<H2>Osvětlení:</H2>");
  if (Light1Value) {
    message += F("<H4>Horní osvětlení: Zapnuto:<input type='radio' checked>&nbsp;&nbsp;Vypnuto:<input type='radio' onclick='document.location=\"?light1=false\"'></H4>");
  } else {
    message += F("<H4>Horní osvětlení: Zapnuto:<input type='radio' onclick='document.location=\"?light1=true\"'>&nbsp;&nbsp;Vypnuto:<input type='radio' checked></H4>");
  }

  if (Light2Value) {
    message += F("<H4>Dolní osvětlení: Zapnuto:<input type='radio' checked>&nbsp;&nbsp;Vypnuto:<input type='radio' onclick='document.location=\"?light2=false\"'></H4>");
  } else {
    message += F("<H4>Dolní osvětlení: Zapnuto:<input type='radio' onclick='document.location=\"?light2=true\"'>&nbsp;&nbsp;Vypnuto:<input type='radio' checked></H4>");
  }

  message += F("<button onclick='document.location = document.location.pathname'>Načíst znovu</button>");
  message += (status == true ? F("<form><input type='submit' name='off' value='Vypnout saunu'></form>") : F("<form><input type='submit' name='on' value='Zapnout saunu'></form>"));
  message += F("<H1>Diagnostika</h1><h3>Konečná teplota");
  message += finalTemp;
  message += F("</H3><H3>Konečná vlhkost");
  message += finalHumidity;
  message += F("</H3><H3>Spotřeba elektřiny za toto saunování: ");
  message += getCyclePowerUsage();
  message += F("kWh</H3><H3>Spotřeba elektřiny celkem:");
  message += getPowerUsage();
  message += F("kWh</H3>");

  message += "</body>";
  server.send(200, "text/html", message);
}
/*void setTimerOff(int minutes, int currTime) {
  if (currTime != 0) {
    currentTime = currTime;
  }
  turnOffIn = currentTime + (minutes * 60 * 1000);
}*/

void handleRequest() {
  String message = "<H2>Přijal a zpracoval jsem žádost</H2>";

  if (server.arg("setTemp") != "") {
    setTemperature(server.arg("setTemp").toInt());
  }

  if (server.arg("setHumidity") != "") {
    setHumidity(server.arg("setHumidity").toInt());
  }

  if (server.arg("on") != "") {
    turnOn();
  }

  if (server.arg("off") != "") {
    turnOff();
  }

  /*if (server.arg("timer") != "") {
    setTimerOff(server.arg("timer").toInt(), (server.arg("currentTime") != "" ? server.arg("currentTime").toInt() : 0));
  }*/

  if (server.arg("mod") != "") {
    setMode(server.arg("mod").toInt());
  }

  if (server.arg("delta") != "") {
    setDelta(server.arg("delta").toInt());
  }

  if (server.arg("light1") != "") {
    setLight(1, (server.arg("light1") == "true" ? true : false));
  }

  if (server.arg("light2") != "") {
    setLight(2, (server.arg("light2") == "true" ? true : false));
  }

  if (server.arg("vent") != "") {
    setVent((server.arg("vent") == "true" ? true : false));
  }

  /*if (server.arg("getData") != "") {
    //server.send(200, "text/plain", diagnostics);
    //diagnostics = "";
  } else {*/
    sendResponse();
  //}

}

void handleSauna() {
  /*if (digitalRead(Voltage)) {
    status = false;
  }*/

  if (status == true && isClosed()) {
    int currentMillis = millis();
    if (justStarted) {lastMillis = currentMillis;justStarted = false;}
    int runningFor = currentMillis - lastMillis;
    if ((lastMillis != 0 && koeficient != 0 && runningFor > 10000) || oldKoeficient != koeficient) {
      powerUsage += (runningFor / 1000.0 / 60.0 / 60.0) * 2.0 * oldKoeficient;
      cyclePowerUsage += (runningFor / 1000.0 / 60.0 / 60.0) * 2.0 * oldKoeficient;
      lastMillis = currentMillis;

      writeEEPROM(powerUsage);
    }


    if (getTempTop() - getTempBottom() > turboDelta) {
      digitalWrite(Vent1, !ventilator);
    } else {
      digitalWrite(Vent1, HIGH);
    }

    oldKoeficient = koeficient;
    koeficient = 0;
  //diagnostics += "Aktuální vlhkost: ";
  //diagnostics += getHumidityTop();
  //diagnostics += " Aktuální teplota: ";
  //diagnostics += getTempTop();
  //diagnostics += "\n\n";
    if (mode == 1 || mode == 2) {
      if (mode == 1) {
        finalTemp = (0 - finalHumidity) + 100;
      }
      //diagnostics += "Nastavuji vlhkost. Cílová vlhkost: ";
      //diagnostics += finalHumidity;
      //diagnostics += " Cílová teplota: ";
      //diagnostics += finalTemp;
      //diagnostics += "\n\n";
      //diagnostics += "Podmínka vlhkost getHumidityTop() < humidityThreshold vychází: ";
      //diagnostics += getHumidityTop() < humidityThreshold;
      //diagnostics += "\nHodnoty jsou:";
      //diagnostics += getHumidityTop();
      //diagnostics += " < ";
      //diagnostics += humidityThreshold;
      //diagnostics += "\n Hodnota zapsaná na fázi výparníku:";
      if (getHumidityTop() > finalHumidity) {
        digitalWrite(Steam, LOW);
        //diagnostics += 255/(humidityThreshold / getHumidityTop());
        //diagnostics += "\nVýpočet: 255/(";
        //diagnostics += humidityThreshold;
        //diagnostics += " / ";
        //diagnostics += getHumidityTop();
        //diagnostics += ")";
      } else {
        digitalWrite(Steam, HIGH);
        koeficient += 1;
        //diagnostics += 255;
      }
    } else {
      digitalWrite(Steam, LOW);
    }

    //diagnostics += "\nPodmínka jestli je teplota přes konečnou: ";
    //diagnostics += getTempTop() > finalTemp;
    //diagnostics += "\nHodnoty jsou:";
    //diagnostics += getTempTop();
    //diagnostics += " > ";
    //diagnostics += finalTemp;

    //diagnostics += "\nPodmínka jestli se spustí PWM: ";
    //diagnostics += getTempTop() > finalTemp - tempThreshold;
    //diagnostics += "\nHodnoty jsou:";
    //diagnostics += getTempTop();
    //diagnostics += " > ";
    //diagnostics += finalTemp;
    //diagnostics += " - ";
    //diagnostics += tempThreshold;

    //diagnostics += "\nPodmínka jestli je threshold < 3: ";
    //diagnostics += (finalTemp - getTempTop() - (tempThreshold / 3)) < 0;
    //diagnostics += "\nHodnoty jsou:";
    //diagnostics += finalTemp;
    //diagnostics += " - ";
    //diagnostics += getTempTop();
    //diagnostics += " - (";
    //diagnostics += tempThreshold;
    //diagnostics += " / 3) < 0";

    //diagnostics += "\nPodmínka jestli je threshold < 3 * 2: ";
    //diagnostics += (finalTemp - getTempTop() - (tempThreshold / 3 * 2)) < 0;
    //diagnostics += "\nHodnoty jsou:";
    //diagnostics += finalTemp;
    //diagnostics += " - ";
    //diagnostics += getTempTop();
    //diagnostics += " - (";
    //diagnostics += tempThreshold;
    //diagnostics += " / 3 * 2) < 0";

    if (getTempTop() > finalTemp) {
      /*analogWrite(Heat1, 0); //Set PWM pin na 0
      analogWrite(Heat2, 0); //Set PWM pin na 0
      analogWrite(Heat3, 0); //Set PWM pin na 0
      //diagnostics += "\n Hodnota zapsaná na fázi 1: 0\nHodnota zapsaná na fázi 2: 0\nHodnota zapsaná na fázi 3: 0";*/

      digitalWrite(Heat1, LOW);
      digitalWrite(Heat2, LOW);
      digitalWrite(Heat3, LOW);
    } else if (getTempTop() > finalTemp - tempThreshold) {
      if (finalTemp - getTempTop() + 3 < 0) {
        digitalWrite(Heat1, LOW);
        digitalWrite(Heat2, LOW);
        digitalWrite(Heat3, LOW);
        koeficient += 0;
      } else if (finalTemp - getTempTop() < 0) {
        digitalWrite(Heat1, LOW);
        digitalWrite(Heat2, LOW);
        digitalWrite(Heat3, HIGH);
        koeficient += 1;
      } else if (finalTemp - getTempTop() - (tempThreshold / 3) < 0) {
        /*analogWrite(Heat1, 0); //Set PWM pin na 0
        analogWrite(Heat2, 0); //Set PWM pin na 0
        analogWrite(Heat3, 255/((tempThreshold/3) / getTempTop())); //Set PWM pin na 255/((finalTemp - averageTemp)/(tempThreshold/3))*/

        digitalWrite(Heat1, LOW);
        digitalWrite(Heat2, HIGH);
        digitalWrite(Heat3, HIGH);
        koeficient += 2;
        //diagnostics += "\n Hodnota zapsaná na fázi 1: 0\nHodnota zapsaná na fázi 2: 0\nHodnota zapsaná na fázi 3: ";
        //diagnostics += 255/((tempThreshold/3) / getTempTop());
        //diagnostics += "\nVýpočet: 255/((";
        //diagnostics += tempThreshold;
        //diagnostics += " / 3) / ";
        //diagnostics += getTempTop();
        //diagnostics += "))";
      } else {
        /*analogWrite(Heat1, 255); //Set PWM pin na 255
        analogWrite(Heat2, 255); //Set PWM pin na 255
        analogWrite(Heat3, 255/((tempThreshold/3) / getTempTop())); //Set PWM pin na 255/((finalTemp - averageTemp)/(tempThreshold/3))*/

        digitalWrite(Heat1, HIGH);
        digitalWrite(Heat2, HIGH);
        digitalWrite(Heat3, HIGH);
        koeficient += 3;
        //diagnostics += "\n Hodnota zapsaná na fázi 1: 255\nHodnota zapsaná na fázi 2: 0\nHodnota zapsaná na fázi 3: ";
        //diagnostics += 255/((tempThreshold/3) / getTempTop());
        //diagnostics += "\nVýpočet: 255/((";
        //diagnostics += tempThreshold;
        //diagnostics += " / 3) / ";
        //diagnostics += getTempTop();
        //diagnostics += "))";
      }
    } else {
      /*analogWrite(Heat1, 255); //Set PWM pin na 255
      analogWrite(Heat2, 255); //Set PWM pin na 255
      analogWrite(Heat3, 255); //Set PWM pin na 255*/

      digitalWrite(Heat1, HIGH);
      digitalWrite(Heat2, HIGH);
      digitalWrite(Heat3, HIGH);
      koeficient += 3;
      //diagnostics += "\n Hodnota zapsaná na fázi 1: 255\nHodnota zapsaná na fázi 2: 255\nHodnota zapsaná na fázi 3: 255";
    }
  } else {
    /*analogWrite(Heat1, 0); //Set PWM pin na 0
    analogWrite(Heat2, 0); //Set PWM pin na 0
    analogWrite(Heat3, 0); //Set PWM pin na 0*/
    int currentMillis = millis();
    int runningFor = currentMillis - lastMillis;
    if (lastMillis != 0 && koeficient != 0) {
      powerUsage += (runningFor / 1000 / 60 / 60) * 2 * koeficient;
      cyclePowerUsage += (runningFor / 1000 / 60 / 60) * 2 * koeficient;

      writeEEPROM(powerUsage);
    }

    justStarted = true;
    digitalWrite(Vent1, HIGH);
    digitalWrite(Heat1, LOW);
    digitalWrite(Heat2, LOW);
    digitalWrite(Heat3, LOW);
    digitalWrite(Steam, LOW);
    cyclePowerUsage = 0;
    koeficient = 0;
    lastMillis = 0;
    //diagnostics += "\n Hodnota zapsaná na fázi 1: 0\nHodnota zapsaná na fázi 2: 0\nHodnota zapsaná na fázi 3: 0";
  }

  /*long newMillis = millis();
  if (lastMillis < newMillis) {
    //Serial.println("OVERFLOW!! GET A NEW TIME!!");
  }

  currentTime = currentTime + (newMillis - lastMillis);
  lastMillis = newMillis;

  if (turnOffIn <= currentTime && turnOffIn != 0) {
    status = false;
  }*/
}

void WIFIConnect() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.config(ip, gateway, subnet);
    WiFi.begin("HTWR_home", "vanilka1");
    WiFi.mode(WIFI_STA);
    //WiFi.begin("LINHYCZ", "LinhyCZ1");
    //WiFi.begin("Linhartovi", "jk383384");

    //Serial.println("Připojuji se k WiFi..");
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      //Serial.print(".");
    }
  }
}


void setup() {
  //Serial.begin(115200);


  WIFIConnect();

  analogWriteRange(1);
  //Serial.println(".");

  //Serial.print("Aktuální IP adresa: ");
  //Serial.println(WiFi.localIP());

  server.on("/", handleRequest);

  server.begin();

  pinMode(Vent1, OUTPUT);
  //pinMode(Vent2, OUTPUT);
  //pinMode(Water, OUTPUT);
  //pinMode(Voltage, OUTPUT);
  pinMode(Light1, OUTPUT);
  pinMode(Light2, OUTPUT);
  pinMode(Heat1, OUTPUT);
  pinMode(Heat2, OUTPUT);
  pinMode(Heat3, OUTPUT);
  pinMode(Steam, OUTPUT);
  //pinMode(Door, OUTPUT);
  digitalWrite(Vent1, LOW);
  //digitalWrite(Vent2, LOW);
  //digitalWrite(Water, LOW);
  //digitalWrite(Voltage, LOW);
  digitalWrite(Light1, HIGH);
  digitalWrite(Light2, HIGH);
  digitalWrite(Heat1, LOW);
  digitalWrite(Heat2, LOW);
  digitalWrite(Heat3, LOW);
  digitalWrite(Steam, LOW);
  //digitalWrite(Door, LOW);

  /*analogWriteFreq(0.1);
  analogWriteRange(255);*/

  //powerUsage = 26.47;

  EEPROM.begin(4096);

  //writeEEPROM(32.89);

  powerUsage = readEEPROM();
}

void loop() {
  server.handleClient();
  handleSauna();
  WIFIConnect();
  int currentMillis = millis();
  if (nextTempCheck <= currentMillis) {
    update_temps();
    /*if (status == true && isClosed() && mode == 1) {
      checkWater();
    }*/
    nextTempCheck = currentMillis + (10 * 1000);
  }
}
