var index = 1;
var offset = 305;
var devices = 0;
var halfWidth;
var configurations;
var guis;
var urlDeviceID;

function runAtPageLoad() {
  /* TODO Refresh dat při obnovení připojení; obnovení připojení; Šipky posouvají zařízení; Špatné vykreslování GUI u zařízení 4322993, možná další? */
  if (document.location.search.split("&")[1] != undefined) {
    urlDeviceID = document.location.search.split("&")[1].split("=")[1];
  };

  halfWidth = $("#device_slider_placeholder").width() / 2;

  socket.on("owner_device_list", function(data) {
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

  socket.on("my_configuration", function(data) {
    rows = JSON.parse(data);
    configurations = {};
    for (var key in rows) {
      row = rows[key];

      configurations[row[0]["value"]] = row[1]["value"];
    }

    if (urlDeviceID != undefined) {
      tempOffset = getOffset(urlDeviceID);
      if (tempOffset != 0) {
        offset = tempOffset;
        $("#device_slider").animate({
          "margin-left": halfWidth - offset
        }, 500, drawConfigurations())
      } else {
        drawConfigurations();
      }
    } else {
      drawConfigurations();
    }
  });

  socket.on("device_status", function(data) {
    json = JSON.parse(data);

    $("#" + json["device_id"] + " .symbol").removeClass((json["status"] ? "offline" : "online"))
    $("#" + json["device_id"] + " .symbol").addClass((json["status"] ? "online" : "offline"))
    $("#" + json["device_id"] + " .symbol").css("background-color", (json["status"] ? "green" : "red"))
    $("#" + json["device_id"] + " .symbol").html("<i class='fas " + (json["status"] ? "fa-check" : "fa-times") + "' aria-hidden='true'></i>");
  })

  $(window).resize(function() {
    halfWidth = $("#device_slider_placeholder").width() / 2;
    fixPosition();
  })

  $("body").on("click", "#arrow-right", animateRight);

  $("body").on("click", "#arrow-left", animateLeft);

  $("body").keydown(function(e) {
    if ($(e.target).is('input') == false && $(e.target).is('textarea') == false) {
      if (e.keyCode == 37) {
        animateLeft();
      } else if(e.keyCode == 39) {
        animateRight();
      }
    }

    if ($(e.target).is('#valueText') == true) {
      if (e.keyCode == 9) {
        e.preventDefault();
        var cursorPos = $('#valueText').prop('selectionStart');
        var value = $('#valueText').val();
        var textBefore = value.substring(0,  cursorPos);
        var textAfter  = value.substring(cursorPos, value.length);
        $('#valueText').val(textBefore + "   " + textAfter);
        $('#valueText').prop('selectionStart', cursorPos + 3);
        $('#valueText').prop('selectionEnd', cursorPos + 3);
      }
    }
  })

  $("#submitButton").click(function(e) {
    e.preventDefault();

    var device_id = getDeviceId();

    var toSend = {
      "device_id": device_id,
      "value": $("#valueText").val()
    }
    socket.emit("updateConfigurations", JSON.stringify(toSend));
  })

  socket.emit("get_device_owner_list");
  socket.emit("get_my_configuration");
}

function animateLeft() {
  if (offset >= 915) {
    offset = offset - 610;
    $("#device_slider").animate({
      "margin-left": halfWidth - offset
    }, 500, drawConfigurations())
    /* TODO dvě verze prvku read a write */
    //$("#device_slider").css("margin-left", "calc(50% - " + offset + "px)");
  }
}

function animateRight() {
  if (offset < 305 + (devices - 1) * 610) {
    offset = offset + 610;
    $("#device_slider").animate({
      "margin-left": halfWidth - offset
    }, 500, drawConfigurations());
  }
}

function fixPosition() {
  $("#device_slider").css("margin-left", halfWidth - offset);
}

function drawConfigurations() {
  var device_id = getDeviceId();

  urlDeviceID = device_id;
  if (device_id != undefined) {
    window.history.replaceState({}, document.title, "/?device_settings&device_id=" + device_id);

    $("#settings").fadeOut(250, function() {
      var value = "";
      if (configurations != undefined) {
        if (configurations[device_id] != undefined) {
          value = configurations[device_id];
        }
      }
      $("#settings").find("textarea").html(value);
      $("#settings").fadeIn(250);
    })
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
  for (var device in configurations) {
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

String.prototype.replaceAll = function(search, replace) {
  return this.split(search).join(replace);
}
