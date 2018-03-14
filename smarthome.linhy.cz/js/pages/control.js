var index = 1;
var offset = 305;
var devices = 0;
var halfWidth;
var functions;
var guis;
var urlDeviceID;

function runAtPageLoad() {
  /* TODO Refresh dat při obnovení připojení; obnovení připojení; Šipky posouvají zařízení; Špatné vykreslování GUI u zařízení 4322993, možná další? */
  if (document.location.search.split("&")[1] != undefined) {
    urlDeviceID = document.location.search.split("&")[1].split("=")[1];
  };

  $.getJSON("/json/guis.json", function(data) {
    guis = data;
  })

  halfWidth = $("#device_slider_placeholder").width() / 2;
  socket.emit("get_device_list");
  socket.emit("get_my_functions");

  socket.on("device_list", function(data) {
    json = JSON.parse(data);
    $("#device_slider").html("");
    console.log("DEVICES");
    console.log(data);

    for (i = 0; i < json.length; i++) {
      row = json[i];

      lastLogin = new Date(row[3]["value"]);
      lastLogin.setHours(lastLogin.getHours() + lastLogin.getTimezoneOffset() / 60);

      var prettyTime = lastLogin.getDate() + ". " + (lastLogin.getMonth() + 1) + ". " + lastLogin.getFullYear() + "&nbsp;" + lastLogin.getHours() + ":" + (lastLogin.getMinutes() > 9 ? lastLogin.getMinutes() : "0" + lastLogin.getMinutes()) + ":" + (lastLogin.getSeconds() > 9 ? lastLogin.getSeconds() : "0" + lastLogin.getSeconds());

      append = "<div class='device' id='" + row[0]["value"] + "'><img src='/images/microcontroller.png'><div class='symbol " + (row[2]["value"] ? "online" : "offline") + "' style='background-color: " + (row[2]["value"] ? "green" : "red") + "'><i class='fas " + (row[2]["value"] ? "fa-check" : "fa-times") + "' aria-hidden='true'></i></div><center><h2>" + row[1]["value"] + "</h2><h4>Poslední přihlášení:&nbsp;" + prettyTime + "</h4></center>";

      append += "</div>";
      devices = devices + 1;
      $("#device_slider").append(append);
    }
  });

  socket.on("my_functions_response", function(data) {
    functions = JSON.parse(data);
    console.log(data);

    if (urlDeviceID != undefined) {
      tempOffset = getOffset(urlDeviceID);
      console.log("TEMP: " + tempOffset);
      if (tempOffset != 0) {
        offset = tempOffset;
        $("#device_slider").animate({
          "margin-left": halfWidth - offset
        }, 500, drawFunctions())
      } else {
        drawFunctions();
      }
    } else {
      drawFunctions();
    }
  });

  socket.on("device_status", function(data) {
    json = JSON.parse(data);

    $("#" + json["device_id"] + " .symbol").removeClass((json["status"] ? "offline" : "online"))
    $("#" + json["device_id"] + " .symbol").addClass((json["status"] ? "online" : "offline"))
    $("#" + json["device_id"] + " .symbol").css("background-color", (json["status"] ? "green" : "red"))
    $("#" + json["device_id"] + " .symbol").html("<i class='fas " + (json["status"] ? "fa-check" : "fa-times") + "' aria-hidden='true'></i>");

    if (json["device_id"] == getDeviceId()) {
      if (!json["status"]) {
        $("#controls").find("input").attr("disabled", "disabled");
        $("#controls").find("button").attr("disabled", "disabled");
      } else {
        $("#controls").find("input").removeAttr("disabled");
        $("#controls").find("button").removeAttr("disabled");
      }
    }
  })

  socket.on("status", function(data) {
    json = JSON.parse(data);

    var colors = document.getElementsByClassName("jscolor");
    for (i = 0; i < colors.length; i++) {
      colors[i].jscolor.hide();
    }

    functions[json["ID_zarizeni"]][json["ID_druhopravneni"]]["LastValues"] = json["value"];

    if (getDeviceId() == json["ID_zarizeni"]) {
      var html = $("<div />").append($("#controls [data_druhopravneni=" + json["ID_druhopravneni"] + "]").clone()).html();

      var controls = $("#controls");
      console.log("To replace");
      console.log(html);
      console.log("To be replaced");
      console.log(controls.html());
      //controls.html(controls.html().replace(html, ""));
      controls.html(controls.html().replace(html, getGUI(functions[json["ID_zarizeni"]][json["ID_druhopravneni"]]["ID_GUI"], {
        "Nazev_funkce": functions[json["ID_zarizeni"]][json["ID_druhopravneni"]]["Nazev_opravneni"],
        "ID_druhopravneni": json["ID_druhopravneni"],
        "ID_opravneni": functions[json["ID_zarizeni"]][json["ID_druhopravneni"]]["ID_opravneni"],
        "value": functions[json["ID_zarizeni"]][json["ID_druhopravneni"]]["LastValues"],
        "cteni": functions[json["ID_zarizeni"]][json["ID_druhopravneni"]]["Cteni"],
        "zapis": functions[json["ID_zarizeni"]][json["ID_druhopravneni"]]["Zapis"]
      })));

      jscolor.installByClassName("jscolor");

      console.log("Got new value and replaced it..");
    }
  })

  $(window).resize(function() {
    halfWidth = $("#device_slider_placeholder").width() / 2;
    fixPosition();
  })

  $("body").on("click", "#arrow-right", animateRight);

  $("body").on("click", "#arrow-left", animateLeft);

  $("body").on("submit", "#controls form", sendCommand);

  $("body").keydown(function(e) {
    console.log("Keycode: " + e.keyCode);
    if ($(e.target).is('input') == false) {
      if (e.keyCode == 37) {
        animateLeft();
      } else if(e.keyCode == 39) {
        animateRight();
      }
    }
  })
}

function animateLeft() {
  if (offset >= 915) {
    offset = offset - 610;
    $("#device_slider").animate({
      "margin-left": halfWidth - offset
    }, 500, drawFunctions())
    /* TODO dvě verze prvku read a write */
    //$("#device_slider").css("margin-left", "calc(50% - " + offset + "px)");
  }
}

function animateRight() {
  if (offset < 305 + (devices - 1) * 610) {
    offset = offset + 610;
    $("#device_slider").animate({
      "margin-left": halfWidth - offset
    }, 500, drawFunctions());
  }
}

function fixPosition() {
  $("#device_slider").css("margin-left", halfWidth - offset);
}

function drawFunctions() {
  var device_id = getDeviceId();


  urlDeviceID = device_id;
  window.history.replaceState({}, document.title, "/?control&device_id=" + device_id);

  console.log(device_id);

  $("#controls").fadeOut(250, function() {
    $("#controls").html("");
    console.log(functions);
    for (k in functions[device_id]) {
      console.log(functions[device_id][k]);
      console.log(k);
      $("#controls").append(getGUI(functions[device_id][k]["ID_GUI"], {
        "Nazev_funkce": functions[device_id][k]["Nazev_opravneni"],
        "ID_druhopravneni": k,
        "ID_opravneni": functions[device_id][k]["ID_opravneni"],
        "value": functions[device_id][k]["LastValues"],
        "cteni": functions[device_id][k]["Cteni"],
        "zapis": functions[device_id][k]["Zapis"]
      }) + "<br>");

      jscolor.installByClassName("jscolor");
    }
    if ($("#" + device_id).find(".symbol").hasClass("offline")) {
      $("#controls").find("input").attr("disabled", "disabled");
      $("#controls").find("button").attr("disabled", "disabled");
    } else {
      $("#controls").find("input").removeAttr("disabled");
      $("#controls").find("button").removeAttr("disabled");
    }
    $("#controls").fadeIn(250);
  })

}

function isDeviceOnline() {
  console.log("ID: " + "#" + urlDeviceID);
  if ($("#" + urlDeviceID).find(".symbol").hasClass("offline")) {
    return false;
  } else {
    return true;
  }
}

function getGUI(id, parameters) {
  if (guis == undefined) {
    console.log("GUIS not defined, downloading..");
    $.getJSON("/json/guis.json", function(data) {
      guis = data;
      console.log("GUIS downloaded..");
      console.log(guis);
      return getGUIHTML(id, parameters);
    })
  } else {
    return getGUIHTML(id, parameters);
  }
}

function getGUIHTML(id, parameters) {
  if (guis[id] != undefined) {
    var html = guis[id]["html"];
    var types = guis[id]["types"];
    var rw = getRW(parameters["zapis"], parameters["cteni"]);
    parameters["types"] = types;
    console.log("ID:" + id);

    console.log(html);

    if (html != undefined) {
      if (types.indexOf("bool") > -1) {
        if (html[rw][parameters["value"]] == undefined) {
          html = html[rw]["default"]
        } else {
          html = html[rw][parameters["value"]]
        }
      } else {
        html = html[rw]
      }
      for (k in parameters) {
        if (parameters[k] == undefined) {
          parameters[k] = "";
        }
        if (typeof(parameters[k]) == "object") {
          parameters[k] = JSON.stringify(parameters[k]);
        }


        if (html != undefined) {
          html = html.replaceAll("@" + k, parameters[k]);
        }
      }
      return html;
    }
  }
  return "";
}

function getRW(zapis, cteni) {
  if (zapis && cteni) {
    return "rw"
  } else if (zapis) {
    return "w"
  } else {
    return "r"
  }
}

function getDeviceId() {
  var index = (offset / 610) + 0.5;
  console.log("INDEX: " + index);
  var device_id = $(".device:nth-child(" + index + ")").attr("id");
  return device_id;
}

function getOffset(id) {
  var index = 0;
  for (var device in functions) {
    console.log("DEVICE:");
    console.log(device);
    if (device == id) {
      return 305 + (index * 610);
    } else {
      index = index + 1;
    }
  }
  return 0;
}

function sendCommand(e) {
  e.preventDefault();

  device_id = getDeviceId();
  var types = JSON.parse($(this).attr("data_types"));
  if (types.indexOf("bool") > -1) {
    var value = $(this).find(".value").attr("data_value");
  } else {
    var value = $(this).find(".value").val();
  }


  var dataToSend = {
    "ID_zarizeni": device_id,
    "ID_druhopravneni": $(this).attr("data_druhopravneni"),
    "ID_opravneni": $(this).attr("data_opravneni"),
    "value": value,
    "token": getToken()
  }

  socket.emit("commandToServer", JSON.stringify(dataToSend));
}

String.prototype.replaceAll = function(search, replace) {
  return this.split(search).join(replace);
}
