#include <SmartHome.h>

void SmartHome::setDefaultWiFiConnection(const char * SSID, const char * password)
{
  _defaultSSID = SSID;
  _defaultPassword = password;
}

void SmartHome::eraseEEPROM(size_t start, size_t length) {
  for (int i = 0 ; i < length ; i++) {
    EEPROM.write(start + i, 255);
  }

  EEPROM.commit();
}

void SmartHome::writeEEPROM(const char * data, size_t start) {
  for (size_t i=0; strlen(data) > i; i++) {
    EEPROM.write(start + i, data[i]);
  }
  EEPROM.commit();
}

String SmartHome::readEEPROM(size_t start, size_t length) {
  String buffer;
  for (size_t i=0; i < length; i++) {
    if(EEPROM.read(start+i) != 255) {
      buffer += (char)EEPROM.read(start+i);
    }
  }

  return buffer;
}

void SmartHome::_statusReceived(const char * payload, size_t length)
{
  String toParse = String(payload);
  toParse.replace("\\\"", "\"");

  if (_loggedIn) {
    StaticJsonBuffer<1000> buffer;
    JsonObject& data = buffer.parseObject(toParse);
    if (!data.success()) {
      return;
    }
    const char * function = data["function"];
    auto pointer = _functionListeners.find(function);
    if(pointer != _functionListeners.end()) {
      pointer->second(data);
    } else {
      //Not found!
    }
  }
}

void SmartHome::onReceive(String functionID, std::function<void (JsonObject& data)> function)
{
  _functionListeners[functionID] = function;
}

String SmartHome::getPassword() {
  return readEEPROM(0, 40);
}

void SmartHome::sendBool(String functionID, bool data) {
  StaticJsonBuffer<300> buffer;
  JsonObject& json = buffer.createObject();
  json[functionID] = data;

  char sendJson[128]; /* TODO DÉLKY ARRAYŮ A DALŠÍCH NASTAVIT DYNAMICKY, NE STATICKY */

  json.printTo(sendJson);

  _socket.emit("status_to_server", sendJson);
}

void SmartHome::sendString(String functionID, String data)
{
  StaticJsonBuffer<300> buffer;
  JsonObject& json = buffer.createObject();
  json[functionID] = data;

  char sendJson[128]; /* TODO DÉLKY ARRAYŮ A DALŠÍCH NASTAVIT DYNAMICKY, NE STATICKY */

  json.printTo(sendJson);

  _socket.emit("status_to_server", sendJson);
}

void SmartHome::_connect(const char * payload, size_t length) {
  StaticJsonBuffer<300> buffer;
  JsonObject& data = buffer.createObject();
  data["device_id"] = ESP.getChipId();
  data["password"] = getPassword();

  char sendJson[128];

  data.printTo(sendJson);

  _socket.emit("dev_login", sendJson);
}

void SmartHome::_login(const char * payload, size_t length) {
  if (String(payload) == "true") {
    _loggedIn = true;
    _socket.emit("get_configuration");
  } else {
    _loggedIn = false;
  }
}

void SmartHome::savePassword(const char * data) {
  eraseEEPROM(0, 40);
  writeEEPROM(data, 0);
}

void SmartHome::_registerPass(const char * payload, size_t length) {
  savePassword(payload);
}

void SmartHome::onReceivedConfiguration(std::function<void (JsonObject& data)> function) {
  _receivedConfigurationListener = function;
}

void SmartHome::retrieveConfiguration(const char * payload, size_t length) {
  String toParse = String(payload);
  toParse.replace("\\\"", "\"");
  toParse.replace("\n", "");

  if (_loggedIn) {
    StaticJsonBuffer<1000> buffer; /* TODO */
    JsonObject& data = buffer.parseObject(toParse);
    if (!data.success()) {
      return;
    }
    _receivedConfigurationListener->second(data);
  }
}

void SmartHome::begin()
{
  Serial.println("Starting smarthome library");
  _wifiMulti.addAP(_defaultSSID, _defaultPassword);
  Serial.print("Added default AP: "); Serial.print(_defaultSSID); Serial.print(":"); Serial.println(_defaultPassword);
  while (_wifiMulti.run() != WL_CONNECTED) {
    Serial.println(".");
    delay(500);
  }
  //std::function<void (const char * payload, size_t length)> connectFunc = std::bind(&SmartHome::_connect, this, _1, _2);
  std::function<void (const char * payload, size_t length)> connectFunc = [=](const char * payload, size_t length) {
    this->_connect(payload, length);
  };

  std::function<void (const char * payload, size_t length)> loginFunc = [=](const char * payload, size_t length) {
    this->_login(payload, length);
  };

  std::function<void (const char * payload, size_t length)> registerPassFunc = [=](const char * payload, size_t length) {
    this->_registerPass(payload, length);
  };

  std::function<void (const char * payload, size_t length)> statusReceivedFunc = [=](const char * payload, size_t length) {
    this->_statusReceived(payload, length);
  };

  std::function<void (const char * payload, size_t length)> configReceivedFunc = [=](const char * payload, size_t length) {
    this->retrieveConfiguration(payload, length);
  };
  _socket.on("connect", connectFunc);
  _socket.on("dev_login_response", loginFunc);
  _socket.on("register_pass", registerPassFunc);
  _socket.on("status", statusReceivedFunc);
  _socket.on("deviceConfiguration", configReceivedFunc);

  _socket.begin("linhy.cz", 8881, "/socket.io/?transport=websocket");
}

void SmartHome::loop() {
  _socket.loop();
}
