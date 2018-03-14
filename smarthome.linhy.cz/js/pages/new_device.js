var newDeviceTimer;
function runAtPageLoad() {
  socket.emit("get_running_device_install");
  $(document).on("submit", "#new_device_form", function(e) {
    e.preventDefault();
    id = $("#new_device_id").val()

    if($("#new_device_submit").hasClass("register")) {
      if(id != "" && id > 0) {
        var timeLimit = new Date();
        timeLimit.setMinutes(timeLimit.getMinutes() + 10);

        registerData = {
          "device_id": id,
          "limit": timeLimit.getTime(),
          "name": $("#new_device_name").val()
        }
        socket.emit("new_device", JSON.stringify(registerData));
        $("#new_device_id").attr("disabled", "disabled");
        $("#new_device_name").attr("disabled", "disabled");
        $("#new_device_submit").val("Zrušit registraci");
        $("#new_device_info").css("display", "block");
        $("#new_device_submit").removeClass("register");
        $("#new_device_info h1, #new_device_info h3").css("display", "block");
        showTime(timeLimit);
        newDeviceTimer = setInterval(function() {showTime(timeLimit)}, 1000);
      }
    } else {
      clearInterval(newDeviceTimer);

      cancelData = {
        "device_id": id
      }

      socket.emit("cancel_device", JSON.stringify(cancelData));

      $("#new_device_id").removeAttr("disabled");
      $("#new_device_name").removeAttr("disabled");
      $("#new_device_submit").addClass("register");
      $("#new_device_submit").val("Přidat nové zařízení");
      $("#new_device_info").css("display", "none");
    }

  })

  socket.on('new_device_success', function() {
     $(".info_text").css("visibility", "hidden");
     $(".info_icon").html("<i class='fas fa-check' aria-hidden='true' style='color: #2bd822'></i>");
     $("#new_device_info h3").html("Zařízení úspěšně zaregistrováno! Další nastavení provedete ve <a href='?devices'>svých zařízeních</a>");
     clearInterval(newDeviceInterval);
     $("#new_device_info h3").css("display", "none");
  })

  socket.on('running_install', function(data) {
    console.log("Got running instalkl");
    var json = JSON.parse(data);
    $("#new_device_id").val(json["device_id"]);
    $("#new_device_id").attr("disabled", "disabled");
    $("#new_device_name").attr("disabled", "disabled");
    $("#new_device_submit").val("Zrušit registraci");
    $("#new_device_info").css("display", "block");
    $("#new_device_submit").removeClass("register");
    $("#new_device_info h1, #new_device_info h3").css("display", "block");
    showTime(new Date(json["timelimit"]));
    newDeviceTimer = setInterval(function() {showTime(new Date(json["timelimit"]))}, 1000);
  })
}

function showTime(timeLimit) {
  timeNow = new Date();
  timeRemaining = new Date(timeLimit - timeNow);
  $("#new_device_time_remaining").html(timeRemaining.getMinutes() + ":" + (timeRemaining.getSeconds() < 10 ? "0" + timeRemaining.getSeconds() : timeRemaining.getSeconds()));
  if(timeRemaining <= 0) {
    clearInterval(newDeviceTimer);
    $(".info_text").val("Bohužel se nám nepodařilo navázat spojení se zařízením. Zkontrolujte sériové číslo a postup opakujte.");
    $(".info_icon").html("<i class='fas fa-times' aria-hidden='true' style='color: #ea0707'></i>");
    $("#new_device_id").removeAttr("disabled");
    $("#new_device_name").removeAttr("disabled");
    $("#new_device_submit").addClass("register");
    $("#new_device_info h1, #new_device_info h3").css("display", "none");
    /*
     * TODO
     */
  }
}
