function runAtPageLoad() {
  socket.emit("get_device_list");

  socket.on("device_list", function(data) {
    json = JSON.parse(data);

    $("#my_device_list > center").html("");
    $("#other_device_list > center").html("");

    for (i = 0; i < json.length; i++) {
      row = json[i];

      lastLogin = new Date(row[3]["value"]);
      lastLogin.setHours(lastLogin.getHours() + lastLogin.getTimezoneOffset() / 60);

      var prettyTime = lastLogin.getDate() + ". " + (lastLogin.getMonth() + 1) + ". " + lastLogin.getFullYear() + "&nbsp;" + lastLogin.getHours() + ":" + (lastLogin.getMinutes() > 10 ? lastLogin.getMinutes() : "0" + lastLogin.getMinutes()) + ":" + (lastLogin.getSeconds() > 10 ? lastLogin.getSeconds() : "0" + lastLogin.getSeconds());

      append = "<div class='device' id='" + row[0]["value"] + "'><img src='/images/microcontroller.png'><div class='symbol' style='background-color: " + (row[2]["value"] ? "green" : "red") + "'><i class='fas " + (row[2]["value"] ? "fa-check" : "fa-times") + "' aria-hidden='true'></i></div><center><h2>" + row[1]["value"] + "</h2><h4>Poslední přihlášení:&nbsp;" + prettyTime + "</h4></center>";


      if (row[5]["value"] == 1) {
        if ($("#my_device_list").find("#" + row[0]["value"]).length == 0) {
          append += "<center class='hrefs'>" + (row[2]["value"] ? "<a href='?control&device_id=" + row[0]["value"] + "'><span class='control'>Ovládací panel</span></a><br>": "<br>") + "<a href='?permissions&device_id=" + row[0]["value"] + "'><span class='permissions'>Oprávnění</span></center>";
          append += "</div>";
          $("#my_device_list > center").append(append);
        }
      } else {
        if ($("#other_device_list").find("#" + row[0]["value"]).length == 0) {
          append += "</div>";
          $("#other_device_list > center").append(append);
        }
      }
    }
  });

  socket.on("device_status", function(data) {
    json = JSON.parse(data);

    $("#" + json["device_id"] + " .symbol").css("background-color", (json["status"] ? "green" : "red"))
    $("#" + json["device_id"] + " .symbol").html("<i class='fas " + (json["status"] ? "fa-check" : "fa-times") + "' aria-hidden='true'></i>");

    var element = $("#4322993 .hrefs");
    if (json["status"]) {
      element.prepend("<a href='?control&device_id=" + json["device_id"] + "'><span class='control'>Ovládací panel</span></a>");
    } else {
      var html = element.html();

      element.html("<br>" + html.split("<br>")[1]);
    }
  })
}
