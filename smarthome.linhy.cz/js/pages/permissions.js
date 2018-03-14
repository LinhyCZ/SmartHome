var functions = {}
var device_id;
var urlDeviceID;
var checkedInputs = [];

function runAtPageLoad() {
  if (document.location.search.split("&")[1] != undefined) {
    urlDeviceID = document.location.search.split("&")[1].split("=")[1];
  };
  $("body").on("click", ".odstranit", function(e) {
    var tr = $($(this).parent().parent());

    var permission_id = tr.attr("id");

    var label = tr.parent().parent().parent().parent().find("label");
    console.log(label);
    var device_id = label.attr("for").split("my-uzivatel-")[1].split("_")[1];

    socket.emit("delete_permission", JSON.stringify({"permission_id": permission_id, "device_id": device_id}));
  })

  $("body").on("change", ".new-user", function(e) {
    $(this).attr("disabled", "disabled");
    $(this).parent().find("i").css("display", "inline-block");
    device_id = $(this).parent().attr("id").split("new-user-form-")[1];
    socket.emit("user_exists", JSON.stringify({"username": $(this).val()}));
  })

  $("body").on("submit", ".new-user-form", function(e) {
    e.preventDefault();
  })

  $("body").on("change", ".new-user-option", function(e) {
    redrawFunction($(this));
  })

  $("body").on("click", ".pridat", function(e) {
    var tr = $(this).parent().parent();

    if ($(this).hasClass("registerPermission")) {
      var label = tr.parent().parent().parent().parent().find("label");
      var device_id = label.attr("for").split("my-uzivatel-")[1].split("_")[1];
      var user_id = tr.find("select").attr("id").split("new-permission-option-")[1];
      var function_id = tr.find("select").val();
      socket.emit("register_permission", JSON.stringify({"device_id": device_id, "user_id": user_id, "function_id": function_id}));
      $(this).removeClass("registerPermission");
    } else {
      tr.find("td").css("visibility", "visible");
      $(this).html("<i class='fas fa-save'></i>");
      $(this).addClass("registerPermission");

      parseFunctions($(this).parent().parent().find("select"));
    }
  })

  $("body").on("click", ".new-user-submit", function(e) {
    var table = $(this).parent().parent().parent().parent();
    console.log(table);
    var device_id = table.attr("id").split("new-user-table-")[1];
    var user_id = table.parent().find("form").attr("data-userId");
    var function_id = table.find("select").val();

    socket.emit("register_permission", JSON.stringify({"device_id": device_id, "user_id": user_id, "function_id": function_id}));

  })

  socket.emit("get_permissions");
  socket.emit("get_GUI_and_Functions");
  socket.on("register_permission_success", function(data) {
    json = JSON.parse(data);

    var icon = $("#new-user-table-" + json["device_id"]).find("i");

    console.log(json["success"]);

    if (json["success"]) {
      icon.css("color", "green");
      socket.emit("get_permissions");
    } else {
      icon.css("color", "red");
    }
  })

  socket.on("delete_permission_success", function(data) {
    json = JSON.parse(data);

    var icon = $("#" + json["permission_id"]).find("i");
    if (json["success"]) {
      icon.css("color", "green");
      socket.emit("get_permissions");
    } else {
      icon.css("color", "red");
    }
  });

  socket.on("user_exists_response", function(data) {
    json = JSON.parse(data);
    if (json["error"] == undefined) {
      var form = $("#new-user-form-" + device_id);
      form.attr("data-userId", json["user_id"]);
      var i = form.find("i");
      $(i).attr("class", "fas fa-check");
      $(i).css("color", "green");

      parseFunctions($('#new-user-option-' + device_id));
    }
  })

  socket.on("functions_response", function(data) {
    console.log("Got function response.. Data: " + data);
    json = JSON.parse(data);
    var myFunctionsAppend = "";
    var otherFunctionsAppend = "";
    for (var i = 0; i < json.length; i++) {
      row = json[i];

      /*
      0 = ID_druhopravneni
      1 = nazev
      2 = cteni
      3 = zapis
      4 = autor
      5 = ID_GUI
      6 = Nazev_GUI
      7 = Zapis_GUI
      8 = Cteni_GUI
      9 = Napoveda_GUI
      */

      functions[row[0]["value"]] = {
        "nazev": row[1]["value"],
        "cteni": row[2]["value"],
        "zapis": row[3]["value"],
        "autor": row[4]["value"],
        "Nazev_GUI": row[6]["value"],
        "Napoveda_GUI": row[9]["value"]
      }
    }

  })

  socket.on("get_permissions_response", function(data) {
    json = JSON.parse(data);

    var permissions = {}

    for (i=0; i<json.length; i++) {
      row = json[i];

      console.log(row);

      if (permissions[row[2]["value"]] == undefined) {
        permissions[row[2]["value"]] = {
          "Prezdivka_zarizeni": row[3]["value"],
          "vlastnik": row[10]["value"],
          "uzivatele": {}
        }
      }
      if (permissions[row[2]["value"]]["uzivatele"][row[1]["value"]] == undefined) {
        permissions[row[2]["value"]]["uzivatele"][row[1]["value"]] = {
          "Prihlasovaci_jmeno": row[9]["value"],
          "opravneni": {}
        }
      }
      permissions[row[2]["value"]]["uzivatele"][row[1]["value"]]["opravneni"][row[0]["value"]] = {
        "ID_druhopravneni": row[4]["value"],
        "Nazev_opravneni": row[5]["value"],
        "Cteni": row[6]["value"],
        "Zapis": row[7]["value"],
        "autor": row[8]["value"],
        "ID_GUI": row[11]["value"],
        "Nazev_GUI": row[12]["value"]
      }

    }

    console.log(JSON.stringify(permissions));

    var prihlasovaciJmeno = JSON.parse(localStorage.getItem("data"))["Prihlasovaci_jmeno"];
    var append = "<ul class='permissions animated'>";
    for (var i in permissions) {
      if (permissions[i]["vlastnik"] == prihlasovaciJmeno) {
        append += "<li class='has-children' data-ID_zarizeni='" + i + "'>";
        append += "<input type='checkbox' name ='my-device-" + i + "' id='my-device-" + i + "'>";
        append += "<label for='my-device-" + i + "'>" + permissions[i]["Prezdivka_zarizeni"] + "</label>";
        append += "<ul>";
        append += "<li>";
        append += "Vlastník zařízení: " + permissions[i]["vlastnik"];
        append += "</li>";
        append += "<li>Oprávnění:";
        append += "<ul style='display: block'>";
        for (var j in permissions[i]["uzivatele"]) {
          if (permissions[i]["uzivatele"][j]["Prihlasovaci_jmeno"] != permissions[i]["vlastnik"]) {
            append += "<li data-ID_uzivazel = '" + j + "'class='has-children'>";
            append += "<input type='checkbox' name ='my-uzivatel-" + j + "_" + i + "' id='my-uzivatel-" + j + "_" + i + "'>";
            append += "<label for='my-uzivatel-" + j + "_" + i + "'>Oprávnění pro uživatele: " + permissions[i]["uzivatele"][j]["Prihlasovaci_jmeno"] + "</label>";
            append += "<ul>";
            append += "<table><tr><td>Název oprávnění</td><td>Autor oprávnění</td><td>Pro čtení</td><td>Pro zápis</td><td>Název GUI</td></tr>";
            for (var k in permissions[i]["uzivatele"][j]["opravneni"]) {
              append += "<tr id='" + k + "'>";
              append += "<td class='nazev_opravneni'>" + permissions[i]["uzivatele"][j]["opravneni"][k]["Nazev_opravneni"] + "</td>";
              append += "<td class='autor_opravneni'>" + permissions[i]["uzivatele"][j]["opravneni"][k]["autor"] + "</td>";
              append += "<td class='pro_cteni'>" + (permissions[i]["uzivatele"][j]["opravneni"][k]["Cteni"] == true ? "Ano" : "Ne") + "</td>";
              append += "<td class='pro_zapis'>" + (permissions[i]["uzivatele"][j]["opravneni"][k]["Zapis"] == true ? "Ano" : "Ne") + "</td>";
              if (permissions[i]["uzivatele"][j]["opravneni"][k]["Nazev_opravneni"] != "Owner") {
                append += "<td class='gui'>";
                append += permissions[i]["uzivatele"][j]["opravneni"][k]["Nazev_GUI"];
                append += "</td>";
                append += "<td><button type='submit' class='odstranit' id='odstranit-" + k + "'><i class='fas fa-trash' aria-hidden='true'></i></button>";
              }
              append += "</li>";
              append += "</tr>";
            }
            append += "<tr class='new-permission'><td><select class='new-user-option' id='new-permission-option-" + j + "'></select></td><td class='new-user-autor'></td><td><input type='radio' class='new-user-read' disabled></td><td><input type='radio' class='new-user-write' disabled></td><td class='new-user-gui'></td><td><button type='submit' class='pridat'><i class='fas fa-plus' aria-hidden='true'></i></button></td></tr>";
            append += "</table>";
            append += "</ul>";
            append += "</li>";
          }
        }
        append += "<li class='has-children'>";
        append += "<input type='checkbox' name ='new-user-" + i + "' id='new-user-" + i + "'>";
        append += "<label for='new-user-" + i + "' style='cursor: pointer'>Přidat nového uživatele.</label>";
        append += "<ul>";
        append += "<form class='new-user-form' id='new-user-form-" + i + "'><span>Zadejte uživatelské jméno, nebo email: </span><input type='text' name='username' class='new-user'>&nbsp;<i class='fas fa-circle-notch fa-spin fa-fw'></i></form>";
        append += "<table class='new-user-table' id='new-user-table-" + i + "'>";
        append += "<tr><td>Název funkce</td><td>Pro čtení</td><td>Pro zápis</td><td>Autor funkce</td><td>Název ovládacího prvku</td></tr>";
        append += "<tr><td><select class='new-user-option' id='new-user-option-" + i + "'></select></td><td><input type='radio' class='new-user-read' disabled></td><td><input type='radio' class='new-user-write' disabled></td><td class='new-user-autor'></td><td class='new-user-gui'></td><td><button class='new-user-submit'><i class='fas fa-save'></i></button></td>";
        append += "</table>";
        append += "</ul>";
        append += "</li>";
        append += "</ul>";
        append += "</li>";
        append += "</ul>";
        append += "</li>";
      }
    }
    append += "</ul>";

    $("#my_permissions").html(append);

    var append = "<ul class='permissions animated'>";
    for (var i in permissions) {
      if (permissions[i]["vlastnik"] != prihlasovaciJmeno) {
        append += "<li class='has-children' data-ID_zarizeni='" + i + "'>";
        append += "<input type='checkbox' name ='other-device-" + i + "' id='other-device-" + i + "'>";
        append += "<label for='other-device-" + i + "'>" + permissions[i]["Prezdivka_zarizeni"] + "</label>";
        append += "<ul>";
        append += "<li>";
        append += "Vlastník zařízení: " + permissions[i]["vlastnik"];
        append += "</li>";
        append += "<li>Oprávnění:";
        append += "<ul style='display: block'>";
        for (var j in permissions[i]["uzivatele"]) {
          append += "<li data-ID_uzivazel = '" + j + "'class='has-children'>";
          append += "<input type='checkbox' name ='other-uzivatel-" + j + "_" + i + "' id='other-uzivatel-" + j + "_" + i + "'>";
          append += "<label for='other-uzivatel-" + j + "_" + i + "'>Oprávnění pro uživatele: " + permissions[i]["uzivatele"][j]["Prihlasovaci_jmeno"] + "</label>";
          append += "<ul>";
          append += "<table><tr><td>Název oprávnění</td><td>Autor oprávnění</td><td>Pro čtení</td><td>Pro zápis</td></tr>";
          for (var k in permissions[i]["uzivatele"][j]["opravneni"]) {
            append += "<tr>";
            append += "<td>" + permissions[i]["uzivatele"][j]["opravneni"][k]["Nazev_opravneni"] + "</td>";
            append += "<td>" + permissions[i]["uzivatele"][j]["opravneni"][k]["autor"] + "</td>";
            append += "<td>" + permissions[i]["uzivatele"][j]["opravneni"][k]["Cteni"] + "</td>";
            append += "<td>" + permissions[i]["uzivatele"][j]["opravneni"][k]["Zapis"] + "</td>";
            append += "</li>";
            append += "</tr>";
          }
          append += "</table>";
          append += "</ul>";
          append += "</li>";
        }
        append += "</ul>";
        append += "</li>";
        append += "</ul>";
        append += "</li>";
      }
    }
    append += "</ul>";

    $("#other_permissions").html(append);

    $.each(checkedInputs, function(index, value) {
      $("#" + value).attr("checked", "checked");
    });

    if (urlDeviceID != undefined) {
      $("#my-device-" + urlDeviceID).attr("checked", "checked");
      checkedInputs.push("#my-device-" + urlDeviceID);
    }

    var accordionsMenu = $('.permissions');

    if( accordionsMenu.length > 0 ) {

      accordionsMenu.each(function(){
        var accordion = $(this);
        //detect change in the input[type="checkbox"] value
        accordion.on('change', 'input[type="checkbox"]', function(){
          var checkbox = $(this);
          console.log(checkbox.prop('checked'));
          if (checkbox.prop('checked')) {
            checkbox.siblings('ul').attr('style', 'display:none;').slideDown(300);
            checkedInputs.push(checkbox.attr('id'));
          } else {
            checkbox.siblings('ul').attr('style', 'display:block;').slideUp(300);
            var index = checkedInputs.indexOf(checkbox.attr('id'));
            if (index != undefined) {
              checkedInputs.splice(index, 1);
            }
          }
          console.log(checkedInputs);
        });
      });
    }
  })
}

function redrawFunction(selector) {
  var id = $(selector).val();

  var tr = selector.parent().parent();

  if (functions[id]["cteni"]) {
    tr.find(".new-user-read").attr("checked", "checked");
  } else {
    tr.find(".new-user-read").removeAttr("checked");
  }

  if (functions[id]["zapis"]) {
    tr.find(".new-user-write").attr("checked", "checked");
  } else {
    tr.find(".new-user-write").removeAttr("checked");
  }

  tr.find('.new-user-autor').html(functions[id]["autor"]);
  tr.find('.new-user-gui').html(functions[id]["Nazev_GUI"]);

  if (tr.parent().parent().css("display") == "none") {
    tr.parent().parent().slideDown(300);
  }
}

function parseFunctions(selector) {
  var first = true;
  for (var i in functions) {
    if (i != 1) {
      if (first) {
        $(selector).append($("<option>").attr({
          value: i,
          selected: true
        }).text(functions[i]["nazev"]));
      } else {
        $(selector).append($("<option>").attr({
          value: i
        }).text(functions[i]["nazev"]));
      }
      first = false;
    }
  }
  redrawFunction($(selector));
}

function test() {
  console.log("UDS");
  console.log(checkedInputs);
  //$.each($("#other_permissions input:checked"), function(key, value))
}
