var guis = {};
var myFunctions = {};
var otherFunctions = {};

var start = true;
function runAtPageLoad() {
  socket.emit("get_GUI_and_Functions");

  var send_data;
  $("body").on("submit", "#new_function", function(e) {
    e.preventDefault();

    if ($("#readwrite").is(":checked")) {
      rw = 2;
    } else if ($("#write").is(":checked")) {
      rw = 1;
    } else {
      rw = 0;
    }

    send_data = {
      "function_name": $("#nazev").val(),
      "rw": rw,
      "ID_GUI": $("#gui").val()
    }

    console.log(JSON.stringify(send_data));
    socket.emit('new_function', JSON.stringify(send_data));
  })

  $("body").on("click", ".edit_submit", function(e) {
    e.preventDefault();

    var tr = $(this).parent().parent();

    if ($(tr.find("input")[4]).is(":checked")) {
      rw = 2;
    } else if ($(tr.find("input")[3]).is(":checked")) {
      rw = 1;
    } else {
      rw = 0;
    }
    send_data = {
      "ID": $(tr.find("input")[0]).val(),
      "function_name": $(tr.find("input")[1]).val(),
      "rw": rw,
      "ID_GUI": tr.find("select").val()
    }

    console.log(JSON.stringify(send_data));
    socket.emit("update_function", JSON.stringify(send_data));
  })

  socket.on('new_function_success', function(data) {
    json = JSON.parse(data);

    var tableRow = $("#new_function").find("tr").last();
    $(tableRow).attr("class", json["item_id"]);
    $("#read").addClass("read");
    $("#read").removeAttr("id");
    $("#readwrite").addClass("readwrite");
    $("#readwrite").removeAttr("id");
    $("#write").addClass("write");
    $("#write").removeAttr("id");
    $("#gui").addClass("gui");
    $("#gui").removeAttr("id");
    $("#nazev").addClass("nazev");
    $("#nazev").removeAttr("id");
    $(tableRow.find("input[type='radio']")[0]).attr("onclick", "updateGUI(0, $(this).parent().parent())");
    $(tableRow.find("input[type='radio']")[1]).attr("onclick", "updateGUI(1, $(this).parent().parent())");
    $(tableRow.find("input[type='radio']")[2]).attr("onclick", "updateGUI(2, $(this).parent().parent())");
    tableRow.find("input[type='radio']").attr("name", "rw" + json["item_id"]);
    tableRow.find("button").addClass("edit_submit");
    tableRow.prepend('<td><input type="number" name="ID_funkce" disabled class="ID_funkce" value="' + json["item_id"] + '"></td>');
    tableRow.appendTo($("#my_functions"));
  })

  socket.on('update_function_response', function(data) {
    json = JSON.parse(data);

    if(json["success"] == true) {
      $("." + json["ID"]).find("button").find("i").css("color", "green");
      setTimeout(function() {$("." + json["ID"]).find("button").find("i").css("color", "black");}, 2000);
    } else {
      $("." + json["ID"]).find("button").find("i").css("color", "red");
      setTimeout(function() {$("." + json["ID"]).find("button").find("i").css("color", "black");}, 2000);
    }
  });

  socket.on('gui_response', function(data) {
    json = JSON.parse(data);

    for (var i = 0; i < json.length; i++) {
      /*
      0 = ID_GUI
      1 = nazev
      2 = zapis
      3 = cteni
      */
      row = json[i];

      if (row[2]["value"] == true && row[3]["value"] == true) {
        rw = 2;
      } else if (row[2]["value"] == true) {
        rw = 1;
      } else {
        rw = 0;
      }

      guis[row[0]["value"]] = [
        row[1]["value"],
        rw
      ];
    }

    if (start) {
      start = !start;
      updateGUI(0);
    }
  })

  socket.on('functions_response', function(data) {
    console.log("Got function response.. Data: " + data);
    json = JSON.parse(data);
    var myFunctionsAppend = "";
    var otherFunctionsAppend = "";
    for (var i = 0; i < json.length; i++) {
      row = json[i];

      var id = JSON.parse(localStorage.getItem("data"))["ID"];

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



      if (id == row[4]["value"]) {
        myFunctionsAppend += '<tr class="' + row[0]["value"] + '"><td><input type="number" name="ID_funkce" disabled class="ID_funkce" value="' + row[0]["value"] + '"></td><td><input type="text" name="nazev" class="nazev" value="' + row[1]["value"] + '" required></td><td>';
        if (row[2]["value"] == true && row[3]["value"] == true) {
          myFunctionsAppend = myFunctionsAppend + '<input type="radio" name="rw' + row[0]["value"] + '" class="read" onclick="updateGUI(0, $(this).parent().parent())"></td><td><input type="radio" name="rw' + row[0]["value"] + '" class="write" onclick="updateGUI(1, $(this).parent().parent())"></td><td><input type="radio" name="rw' + row[0]["value"] + '" class="readwrite" onclick="updateGUI(2, $(this).parent().parent())" checked></td><td><select name="gui" class="gui">';

          $.each(guis, function(key, hodnota) {
            if (hodnota[1] == 2) {
              //console.log(hodnota[0] + "=" + key + ":" + row[5]["value"]);
              if (key == row[5]["value"]) {
                myFunctionsAppend = myFunctionsAppend + "<option selected value='" + key + "'>" + hodnota[0] + "</option>";
              } else {
                myFunctionsAppend = myFunctionsAppend + "<option value='" + key + "'>" + hodnota[0] + "</option>";
              }
            }
          })
        } else if (row[3]["value"] == true) {
          myFunctionsAppend = myFunctionsAppend + '<input type="radio" name="rw' + row[0]["value"] + '" class="read" onclick="updateGUI(0, $(this).parent().parent())"></td><td><input type="radio" name="rw' + row[0]["value"] + '" class="write" onclick="updateGUI(1, $(this).parent().parent())" checked></td><td><input type="radio" name="rw' + row[0]["value"] + '" class="readwrite" onclick="updateGUI(2, $(this).parent().parent())"></td><td><select name="gui" class="gui">';
          $.each(guis, function(key, hodnota) {
            if (hodnota[1] == 2 || hodnota[1] == 1) {
              //console.log(hodnota[0] + "=" + key + ":" + row[5]["value"]);
              if (key == row[5]["value"]) {
                myFunctionsAppend = myFunctionsAppend + "<option selected value='" + key + "'>" + hodnota[0] + "</option>";
              } else {
                myFunctionsAppend = myFunctionsAppend + "<option value='" + key + "'>" + hodnota[0] + "</option>";
              }
            }
          })
        } else {
          myFunctionsAppend = myFunctionsAppend + '<input type="radio" name="rw' + row[0]["value"] + '" class="read" onclick="updateGUI(0, $(this).parent().parent())" checked></td><td><input type="radio" name="rw' + row[0]["value"] + '" class="write" onclick="updateGUI(1, $(this).parent().parent())"></td><td><input type="radio" name="rw' + row[0]["value"] + '" class="readwrite" onclick="updateGUI(2, $(this).parent().parent())"></td><td><select name="gui" class="gui">';
          $.each(guis, function(key, hodnota) {
            if (hodnota[1] == 2 || hodnota[1] == 0) {
              //console.log(hodnota[0] + "=" + key + ":" + row[5]["value"]);
              if (key == row[5]["value"]) {
                myFunctionsAppend = myFunctionsAppend + "<option selected value='" + key + "'>" + hodnota[0] + "</option>";
              } else {
                myFunctionsAppend = myFunctionsAppend + "<option value='" + key + "'>" + hodnota[0] + "</option>";
              }
            }
          })
        }

        myFunctionsAppend = myFunctionsAppend + '</select></td><td><button type="submit" name="submit" class="edit_submit"><i class="fas fa-check" aria-hidden="true"></i></button></td></tr>';
      } else {
        otherFunctionsAppend += '<tr><td><input type="number" name="ID_funkce" class="ID_funkce" disabled value="' + row[0]["value"] + '"></td><td><input type="text" disabled name="nazev" class="nazev" value="' + row[1]["value"] + '"></td><td>';
        if (row[2]["value"] == true && row[3]["value"] == true) {
          otherFunctionsAppend = otherFunctionsAppend + '<input type="radio" disabled name="rw' + row[0]["value"] + '" class="read" onclick="updateGUI(0, $(this).parent().parent())"></td><td><input type="radio" disabled name="rw' + row[0]["value"] + '" class="write" onclick="updateGUI(1, $(this).parent().parent())"></td><td><input type="radio" disabled name="rw' + row[0]["value"] + '" class="readwrite" onclick="updateGUI(2, $(this).parent().parent())" checked></td><td><select disabled name="gui" class="gui">';

          $.each(guis, function(key, hodnota) {
            if (hodnota[1] == 2) {
              if (key == row[5]["value"]) {
                otherFunctionsAppend = otherFunctionsAppend + "<option selected value='" + key + "'>" + hodnota[0] + "</option>";
              } else {
                otherFunctionsAppend = otherFunctionsAppend + "<option value='" + key + "'>" + hodnota[0] + "</option>";
              }
            }
          })
        } else if (row[3]["value"] == true) {
          otherFunctionsAppend = otherFunctionsAppend + '<input type="radio" disabled name="rw' + row[0]["value"] + '" class="read" onclick="updateGUI(0, $(this).parent().parent())"></td><td><input type="radio" disabled name="rw' + row[0]["value"] + '" class="write" onclick="updateGUI(1, $(this).parent().parent())" checked></td><td><input type="radio" disabled name="rw' + row[0]["value"] + '" class="readwrite" onclick="updateGUI(2, $(this).parent().parent())"></td><td><select disabled name="gui" class="gui">';
          $.each(guis, function(key, hodnota) {
            if (hodnota[1] == 2 || hodnota[1] == 1) {
              if (key == row[5]["value"]) {
                otherFunctionsAppend = otherFunctionsAppend + "<option selected value='" + key + "'>" + hodnota[0] + "</option>";
              } else {
                otherFunctionsAppend = otherFunctionsAppend + "<option value='" + key + "'>" + hodnota[0] + "</option>";
              }
            }
          })
        } else {
          otherFunctionsAppend = otherFunctionsAppend + '<input disabled type="radio" name="rw' + row[0]["value"] + '" class="read" onclick="updateGUI(0, $(this).parent().parent())" checked></td><td><input disabled type="radio" name="rw' + row[0]["value"] + '" class="write" onclick="updateGUI(1, $(this).parent().parent())"></td><td><input disabled type="radio" name="rw' + row[0]["value"] + '" class="readwrite" onclick="updateGUI(2, $(this).parent().parent())"></td><td><select disabled name="gui" class="gui">';
          $.each(guis, function(key, hodnota) {
            if (hodnota[1] == 2 || hodnota[1] == 0) {
              if (key == row[5]["value"]) {
                otherFunctionsAppend = otherFunctionsAppend + "<option selected value='" + key + "'>" + hodnota[0] + "</option>";
              } else {
                otherFunctionsAppend = otherFunctionsAppend + "<option value='" + key + "'>" + hodnota[0] + "</option>";
              }
            }
          })
        }

        var otherFunctionsAppend = otherFunctionsAppend + '</select></td></tr>';
      }
    }
    $("#my_functions").html("<tr><td>ID funkce</td><td>Název funkce</td><td>Čtení</td><td>Zápis</td><td>Zápis a čtení</td><td>Ovládací prvek</td></tr>");
    $("#my_functions").append(myFunctionsAppend);
    $("#other_functions").html("<tr><td>ID funkce</td><td>Název funkce</td><td>Čtení</td><td>Zápis</td><td>Zápis a čtení</td><td>Ovládací prvek</td></tr>");
    $("#other_functions").append(otherFunctionsAppend)
  });
};

function updateGUI(type, parent) {
  if (parent != null) {element = parent.find("select")} else {element = "#gui"}
  $(element).html("");

  $.each(guis, function(key, hodnota) {
    if (hodnota[1] == type || (hodnota[1] == 2 && type == 1) || (hodnota[1] == 2 && type == 0)) {
      $(element).append($("<option>", {value: key, text: hodnota[0]}));
    }
  })
};

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
