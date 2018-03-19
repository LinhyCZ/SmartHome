#ifndef SmartHome_h
#define SmartHome_h

#include <map>
#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include "SocketIO/SocketIoClient.h"
#include "ArduinoJson/ArduinoJson.h"
#include <EEPROM.h>

class SmartHome
{
  public:
    void begin();
    void setDefaultWiFiConnection(const char * SSID, const char * password = NULL);
    void sendString(String functionID, String data);
    void sendBool(String functionID, bool data);
    void onReceive (String functionID, std::function<void (JsonObject& data)>);
    void onReceivedConfiguration(std::function<void (JsonObject& data)>);
    void loop();
  private:
    ESP8266WiFiMulti _wifiMulti;
    const char * _defaultSSID;
    const char * _defaultPassword;
    SocketIoClient _socket;
    void _connect(const char * payload, size_t length);
    void _login(const char * payload, size_t length);
    void _registerPass(const char * payload, size_t length);
    bool _loggedIn = false;
    void savePassword(const char * data);
    void writeEEPROM(const char * data, size_t start);
    String readEEPROM(size_t start, size_t length);
    void eraseEEPROM(size_t start, size_t length);
    void _statusReceived(const char * payload, size_t length);
    String getPassword();
    void retrieveConfiguration(const char * payload, size_t length);
    std::function<void (JsonObject& data)> _receivedConfigurationListener;
    std::map<String, std::function<void (JsonObject& data)>> _functionListeners;
};

#endif
