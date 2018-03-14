var index = 1;
var offset = 305;
var devices = 0;
var halfWidth;
var historie;
var deviceIDs = [];
var guis;
var urlDeviceID;
var druhyHistorie = {
  1: "Příkaz",
  2: "Status",
  3: "Zapnuto",
  4: "Vypnuto",
  5: "Registrace"
}

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
  socket.emit("get_history");

  socket.on("device_list", function(data) {
    json = JSON.parse(data);
    $("#device_slider").html("");

    for (i = 0; i < json.length; i++) {
      row = json[i];

      lastLogin = new Date(row[3]["value"]);
      lastLogin.setHours(lastLogin.getHours() + lastLogin.getTimezoneOffset() / 60);

      var prettyTime = lastLogin.getDate() + ". " + (lastLogin.getMonth() + 1) + ". " + lastLogin.getFullYear() + "&nbsp;" + lastLogin.getHours() + ":" + (lastLogin.getMinutes() > 9 ? lastLogin.getMinutes() : "0" + lastLogin.getMinutes()) + ":" + (lastLogin.getSeconds() > 9 ? lastLogin.getSeconds() : "0" + lastLogin.getSeconds());

      append = "<div class='device' id='" + row[0]["value"] + "'><img src='/images/microcontroller.png'><div class='symbol " + (row[2]["value"] ? "online" : "offline") + "' style='background-color: " + (row[2]["value"] ? "green" : "red") + "'><i class='fas " + (row[2]["value"] ? "fa-check" : "fa-times") + "' aria-hidden='true'></i></div><center><h2>" + row[1]["value"] + "</h2><h4>Poslední přihlášení:&nbsp;" + prettyTime + "</h4></center>";

      append += "</div>";
      devices = devices + 1;
      deviceIDs.push(row[0]["value"]);
      $("#device_slider").append(append);
    }
  });

  socket.on("my_history", function(data) {
    console.log("Data:");
    console.log(data);
    historie = JSON.parse(data);
    console.log("Historie:");
    console.log(JSON.stringify(historie));
    if (urlDeviceID != undefined) {
      tempOffset = getOffset(urlDeviceID);
      if (tempOffset != 0) {
        offset = tempOffset;
        $("#device_slider").animate({
          "margin-left": halfWidth - offset
        }, 500, drawHistory())
      } else {
        drawHistory();
      }
    } else {
      drawHistory();
    }
  });

  $(window).resize(function() {
    halfWidth = $("#device_slider_placeholder").width() / 2;
    fixPosition();
  })

  $("body").on("click", "#arrow-right", animateRight);

  $("body").on("click", "#arrow-left", animateLeft);

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
    }, 500, drawHistory())
    /* TODO dvě verze prvku read a write */
    //$("#device_slider").css("margin-left", "calc(50% - " + offset + "px)");
  }
}

function animateRight() {
  if (offset < 305 + (devices - 1) * 610) {
    offset = offset + 610;
    $("#device_slider").animate({
      "margin-left": halfWidth - offset
    }, 500, drawHistory());
  }
}

function fixPosition() {
  $("#device_slider").css("margin-left", halfWidth - offset);
}

function drawHistory() {
  var device_id = getDeviceId();


  urlDeviceID = device_id;
  window.history.replaceState({}, document.title, "/?history&device_id=" + device_id);

  console.log(device_id);

  $("#history").fadeOut(250, function() {
    console.log(historie[device_id]);
    if (historie[device_id] != undefined) {
      var append = "<table><tr><td>Uživatel</td><td>Funkce</td><td>Druh akce</td><td>Odeslaná hodnota</td><td>Datum akce</td></tr>";
      console.log(historie);
      for (k in historie[device_id]) {
        historyTime = new Date(historie[device_id][k]["Cas"]);
        historyTime.setHours(historyTime.getHours() + historyTime.getTimezoneOffset() / 60);

        var prettyTime = historyTime.getDate() + ". " + (historyTime.getMonth() + 1) + ". " + historyTime.getFullYear() + "&nbsp;" + (historyTime.getHours() > 9 ? historyTime.getHours() : "0" + historyTime.getHours()) + ":" + (historyTime.getMinutes() > 9 ? historyTime.getMinutes() : "0" + historyTime.getMinutes()) + ":" + (historyTime.getSeconds() > 9 ? historyTime.getSeconds() : "0" + historyTime.getSeconds());

        append += "<tr><td>" + (historie[device_id][k]["ID_uzivatel"] == null ? "" : historie[device_id][k]["ID_uzivatel"]) + "</td><td>" + (historie[device_id][k]["Nazev_druhopravneni"] == null ? "" : historie[device_id][k]["Nazev_druhopravneni"])+ "</td><td>" + druhyHistorie[historie[device_id][k]["ID_druhhistorie"]] + "</td><td>" + historie[device_id][k]["Value"] + "</td><td>" + prettyTime + "</td></tr>";
      }
      append += "</table>";
    }  else {
      append = "<H2>Nezaznamenali jsme žádné události na tomto zařízení.</H2>";
    }
    $("#history").html("");
    $("#history").append(append + "</table>");
    $("#history").fadeIn(250);
  })

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
  var device_id = $(".device:nth-child(" + index + ")").attr("id");
  return device_id;
}

function getOffset(id) {
  console.log(deviceIDs);
  for (var index = 0; index < deviceIDs.length; index++) {
    if (deviceIDs[index] == id) {
      return 305 + (index * 610);
    }
  }
  return 0;
}

String.prototype.replaceAll = function(search, replace) {
  return this.split(search).join(replace);
}
