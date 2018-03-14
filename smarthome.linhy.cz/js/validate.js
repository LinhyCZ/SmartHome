$(function() {
  var i = 0;

  if (socket != undefined && socket.connected) {
    sendValidationRequest()
  } else {
    var interval = setInterval(function() {
      console.log("Looping");
      if (i > 10) {
        clearInterval(interval);
        validationFailed();
      } else {
        if (socket.connected) {
          clearInterval(interval);
          sendValidationRequest();
        } else {
          i++;
        }
      }
    }, 1000);
  }
})

function validationFailed() {
  $(".validate_placeholder h2, h3").fadeOut(150, function() {
    $(".validate_placeholder h2").html("Nepodařilo se ověřit vaši adresu.<br>Zkuste to prosím za chvíli.").fadeIn(150);
    $(".validate_placeholder h3").html("<i class='login_button_icon login_button_padding fa fa-times' aria-hidden='true'></i>").fadeIn(150);
    $(".validate_placeholder h3 i").css("color", "#ea0707");
  });
}

function sendValidationRequest() {
  socket.emit("validate", JSON.stringify(getObject()));

  socket.on("validate_response", parseValidation);
}

function getObject() {
  object = {};
  var attr = document.location.search.substring(1);
  var params = attr.split("&");
  for (i = 0; i < params.length; i++) {
    var parameter = params[i].split("=");
    object[parameter[0]] = parameter[1];
  }
  return object;
}

function parseValidation(data) {
  json = JSON.parse(data);
  if (json["successful"] == true) {
    $(".validate_placeholder h2, h3").fadeOut(150, function() {
      $(".validate_placeholder h2").html("Úspěšně ověřeno.<br>Nyní se již můžete přihlásit.").fadeIn(150);
      $(".validate_placeholder h3").html("<i class='login_button_icon login_button_padding fa fa-check' aria-hidden='true'></i>").fadeIn(150);
      $(".validate_placeholder h3 i").css("color", "#2bd822");
    })
  } else {
    validationFailed();
  }
}
