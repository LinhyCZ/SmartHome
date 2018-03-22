var fs = require('fs');
var http = require('http');
var httpServer = http.createServer();
httpServer.listen(8881);

var https = require('https');
var server = https.createServer({
  cert: fs.readFileSync("C:\\Users\\Administrator\\AppData\\Roaming\\letsencrypt-win-simple\\httpsacme-v01.api.letsencrypt.org\\linhy.cz-chain.pem"),
  key: fs.readFileSync("C:\\Users\\Administrator\\AppData\\Roaming\\letsencrypt-win-simple\\httpsacme-v01.api.letsencrypt.org\\linhy.cz-key.pem"),
  requestCert: false,
  rejectUnauthorized: false,
  passphrase: 'socketio'
})
server.listen(8880);


var crypto = require('crypto');
var ioServer = require('socket.io');
var io = new ioServer();
io.attach(server);
io.attach(httpServer);
var Connection = require('tedious').Connection;
var ConnectionPool = require('tedious-connection-pool');
var pw = require('./functions/password');
var dev = require('./functions/devices')();
var recaptcha = require('recaptcha2');
var mailer = require('nodemailer');

var transporter = mailer.createTransport({
  service: 'gmail',
  auth: {
    user: "rezervacefrymburklinhart@gmail.com",
    pass: "asdfASDF"
  }
})

var captcha = new recaptcha({
  siteKey:'6LcFDj0UAAAAAAr-u33N7IREXwCLWGQvlSOi7cM0',
  secretKey:'6LcFDj0UAAAAALq0KvmpE2yTmxe_N03s1V8mBdO3'
})

/*
 * MYSQL PART
 */

var poolConfig = {
  min: 1,
  max: 5,
  log: true,
  idleTimeout: 0
};

var awaitingRegister = {};

var db_config = {
    userName: 'SmartHome',
    password: 'jHkl8&zTH?',
    server: 'linhy.cz',
    options: {database: 'SmartHome', rowCollectionOnDone: true}
};
var connection = new Connection(db_config);
var Request = require('tedious').Request;
var TYPES = require('tedious').TYPES;
var pool = new ConnectionPool(poolConfig, db_config);

var fn = require('./functions/functions')(Request, pool, fs);
var auth = require('./functions/authentication')(fn);

var newDeviceInterval = setInterval(function() {
  for (var key in awaitingRegister) {
    obj = awaitingRegister[key];
    fn.l(obj[1]);
    fn.l("Limit: " + new Date(obj[1]));
    fn.l("Current date: " + new Date());
    if (new Date(obj[1]) <= new Date()) {
      delete awaitingRegister[key];
    }
  }
}, 10000);

pool.on('connect', function(err) {
  if (err) {
    fn.l("Got error while conecting to MSSQL server!");
    fn.l(err);
    fn.l("Stopping...");
    process.exit();
  }
  fn.l("Connected");
});

/*
 * SOCKET.IO PART
 */

fn.l("Loading authenticated users from file");

loadConnectedUsers();

fn.l("Starting server on port 8880");

process.on('uncaughtException', function(e) {
  fn.l('Uncaught Exception...');
  fn.l(e.stack);
});


/*
var auth_users = {
"USERNAME": [
  socket
  ip
  unique_identifier
]}
*/

io.on("connection", function(socket) {
  fn.l("Somebody connected");
	socket.on("login", function(data) {
		if (data.user === undefined) {
			var obj = JSON.parse(data);
			getLogin(obj.user, obj.pass, socket);
		} else {
      getLogin(data.user, data.pass, socket);
    }
	})

	socket.on('disconnect', function() {
    var id = dev.unAuth(socket);
		if (id) {
      insertHistory(null, id, "", 4);

      parameters = {
        "ID": [TYPES.Int, id]
      }
      fn.doSQL("UPDATE tab_zarizeni SET Online = 0 WHERE ID_zarizeni = @ID", parameters, function(rowCount, more, rows) {
        acknowledgeUsers(false, id);
      })
    } else {
      auth.socketDisconnect(socket);
    }
	})

	socket.on('register', function(data) {
    registerUser(data, socket);
  });

  socket.on('validate', function(data) {
    validateUser(data, socket);
  })

  socket.on('logout', function() {
    auth.unAuthUser(socket);
  })

  socket.on('page_request', function(data) {
    fn.l(data);
    if(auth.isAuth(socket)) {
      sendPageContent(socket, JSON.parse(data)["url"].substring(1));
    }
  })

  socket.on('new_device', function(data) {
    if(auth.isAuth(socket)) {
      awaitDevice(socket, data);
    }
  })

  socket.on('cancel_device', function(data) {
    if(auth.isAuth(socket)) {
      cancelDevice(socket, data);
    }
  })

  socket.on('new_function', function(data) {
    if(auth.isAuth(socket)) {
      addNewFunction(socket, data);
    }
  })

  socket.on('get_GUI_and_Functions', function(data) {
    if (auth.isAuth(socket)) {
      getGUI(socket);
      getFunctions(socket);
    }
  })

  socket.on('get_GUI', function(data) {
    fn.l("Getting GUI");
    if(auth.isAuth(socket)) {
      getGUI(socket);
    }
  })

  socket.on('get_functions', function() {
    if(auth.isAuth(socket)) {
      getFunctions(socket);
    }
  })

  socket.on('get_my_functions', function() {
    if (auth.isAuth(socket)) {
      getMyFunctions(socket);
    }
  })

  socket.on('get_my_configuration', function() {
    if (auth.isAuth(socket)) {
      getMyConfiguration(socket);
    }
  })

  socket.on('update_function', function(data) {
    if (auth.isAuth(socket)) {
      updateFunction(socket, data);
    }
  });

  socket.on('error', function (err) {
    fn.l(err);
  });

  socket.on('get_permissions', function(data) {
    if (auth.isAuth(socket)) {
      getPermissions(socket);
    }
  })

  socket.on('user_exists', function(data) {
    if (auth.isAuth(socket)) {
      userExists(socket, JSON.parse(data));
    }
  });

  socket.on('get_configuration', function(data) {
    if (dev.isAuth(socket)) {
      getConfiguration(socket);
    }
  })

  socket.on('commandToServer', function(data) {
    if(auth.isAuth(socket)) {
      processCommand(socket, data);
    }
  })

  socket.on('status_to_server', function(data) {
    fn.l("DO SOMETHING!");
    if(dev.isAuth(socket)) {
      fn.l("Processing status");
      processStatusMessage(socket, data);
    } else {
      fn.l("Not atuhenticated to status");
    }
  })

  socket.on('get_running_device_install', function() {
    if(auth.isAuth(socket)) {
      for (var key in awaitingRegister) {
        obj = awaitingRegister[key];
        if (obj[2] == auth.getUsername(socket)) {
          awaitingRegister[key][0] = socket;
          socket.emit('running_install', JSON.stringify({"timelimit": obj[1], "device_id": key}));
        }
      }
    }
  })

  socket.on('register_permission', function(data) {
    json = JSON.parse(data);
    if (auth.isAuth(socket)) {
      isDeviceOwner(socket, json["device_id"], function(isOwner) {
        if (isOwner) {
          registerPermission(socket, json);
        }
      })
    }
  })

  socket.on('delete_permission', function(data) {
    json = JSON.parse(data);
    if (auth.isAuth(socket)) {
      isDeviceOwner(socket, json["device_id"], function(isOwner) {
        if (isOwner) {
          deletePermission(socket, json);
        }
      })
    }
  })

  socket.on('get_history', function() {
    if (auth.isAuth(socket)) {
      getHistory(socket);
    }
  });

  socket.on('dev_login', function(data) {
    if (data["device_id"] !== "") {
      json = data;
    } else {
      json = JSON.parse(data);
    }
    if (json["password"] == "") {
      checkDeviceRegister(socket, json["device_id"]);
    } else {
      deviceLogin(socket, json);
    }
  })

  socket.on('repeat_login', function(data) {
    json = JSON.parse(data);
    fn.l("JSON: ");
    fn.l(json);
    repeatAuthData = auth.repeatAuth(json["Prihlasovaci_jmeno"], json["identifier"], socket);
    if(repeatAuthData != false) {
      json["login"] = true;
      json["identifier"] = repeatAuthData[2];

      if (json["url"] != undefined) {
        sendPageContent(socket, json["url"].substring(1));
      } else {
        sendPageContent(socket);
      }
    } else {
      json = {};
      json["login"] = false;
    }

    socket.emit("login_response", JSON.stringify(json));
  })

  socket.on('get_device_list', function(data) {
    if(auth.isAuth(socket)) {
      getDeviceList(socket);
    }
  })

  socket.on('get_device_owner_list', function(data) {
    if(auth.isAuth(socket)) {
      getDeviceOwnerList(socket);
    }
  })

  socket.on("updateConfigurations", function(data) {
    if (auth.isAuth(socket)) {
      updateConfigurations(socket, JSON.parse(data));
    }
  })
})

function authenticate(socket, data) {
  fn.l("Authenticating");
	if (data !== false) {
    data["login"] = true;
    var user = auth.authUser(socket, data["Prihlasovaci_jmeno"], data["ID"]);
    data["identifier"] = user[2];
    if (data["url"] != undefined) {
      sendPageContent(socket, data["url"].substring(1));
    } else {
      sendPageContent(socket);
    }
		fn.l("User " + data["Jmeno_Prijmeni"] + " authenticated successfuly. Username (" + data["Prihlasovaci_jmeno"] + ")");
	} else {
    data = {};
    data["login"] = false;
	}
  fn.l("Emitting");
  socket.emit("login_response", JSON.stringify(data));
}

function getLogin(username, password, socket) {
  fn.l("Trying to get login data.. Socket ID: " + socket.id)
  var parameters = {
    "name": [TYPES.VarChar, username]
  }
  var result = {};

  fn.doSQL("SELECT * FROM tab_uzivatel WHERE Prihlasovaci_jmeno=@name OR email=@name", parameters, function(rowCount, more, rows) {
    if (rowCount != 1) {
      authenticate(socket, false);
    } else {
      pw.validate(password, rows[0][5].value, function(isValid) {
        if (isValid) {
          result["Jmeno_Prijmeni"] = rows[0][1].value + " " + rows[0][2].value;
          result["Prihlasovaci_jmeno"] = rows[0][6].value;
          result["ID"] = rows[0][0].value;
          authenticate(socket, result);
        } else {
          authenticate(socket, false);
        }
      })
    }
  })
}

function deviceLogin(socket, json) {
  var parameters = {
    "ID": [TYPES.Int, json["device_id"]]
  }

  fn.doSQL("SELECT * FROM tab_zarizeni WHERE ID_zarizeni = @ID", parameters, function (rowCount, more, rows) {
    if (rowCount == 1) {
      row = rows[0];
      pw.validate(json["password"], row[2]["value"], function(isValid) {
        /*0: ID_zarizeni
        1: Prezdivka_zarizeni
        2: Heslo
        3: Online
        4: LastLogin
        5: Functions*/
        fn.l("Validate, valid: " + isValid);

        if (isValid) {
          if (row[5] == json["functions"]) {
            var parameters = {
              "login": [TYPES.DateTime, new Date()],
              "ID": [TYPES.Int, json["device_id"]]
            }

            fn.doSQL("UPDATE tab_zarizeni SET Online = 1, LastLogin = @login WHERE ID_zarizeni = @ID", parameters, function (rowCount, more, rows) {
              if (rowCount == 1) {
                socket.emit("dev_login_response", true);
                dev.auth(socket, json["device_id"]);
                insertHistory(null, dev.getIdBySocket(socket), "", 3);
              }
            })
          } else {
            var parameters = {
              "login": [TYPES.DateTime, new Date()],
              "ID": [TYPES.Int, json["device_id"]],
              "functions": [TYPES.VarChar, json["functions"]]
            }

            fn.doSQL("UPDATE tab_zarizeni SET Online = 1, LastLogin = @login, Functions = @functions WHERE ID_zarizeni = @ID", parameters, function (rowCount, more, rows) {
              if (rowCount == 1) {
                acknowledgeUsers(true, json["device_id"]);
                socket.emit("dev_login_response", true);
                dev.auth(socket, json["device_id"]);
                insertHistory(null, dev.getIdBySocket(socket), "", 3);
              }
            });
          }
        }
      })
    }
  })
}

function registerUser(data, socket) {
  var token;
  json = JSON.parse(data);
  fn.l(data);
  response = {};
  if (json.username != "undefined" && json.name != "undefined" && json.surname != "undefined" && json.password != "undefined" && json.email != "undefined") {
    captcha.validate(json.token).then(function() {
      pw.hash(json.password, function(hash) {
        token = fn.generateRandomString(40);

        var parameters = {
          "username": [TYPES.VarChar, json.username],
          "name": [TYPES.VarChar, json.name],
          "surname": [TYPES.VarChar, json.surname],
          "password": [TYPES.VarChar, hash],
          "email": [TYPES.VarChar, json.email],
          "token": [TYPES.VarChar, token],
          "phone": [TYPES.Int, (json.phone == "" ? null : json.phone)]
        }

        /*TODO při erroru,

          response["successful"] = false;
          socket.emit("register_response", JSON.stringify(response));
          */

        fn.doSQL("INSERT INTO tab_uzivatel (Prihlasovaci_jmeno, Jmeno, Prijmeni, Heslo, Email, Telefon, Token, Overeno) VALUES (@username, @name, @surname, @password, @email, @phone, @token, 0)", parameters, function (rowCount, more, rows) {
          response["successful"] = true;
          socket.emit("register_response", JSON.stringify(response));
          sendVerificationEmail(token, json.email, json.username);
        })
      })
    }).catch(function(errorCode) {
      response["successful"] = false;
      response["error"] = recaptcha.translateErrors(errorCode);

      socket.emit("register_response", JSON.stringify(response));
    })
  } else {
    response["successful"] = false;
    socket.emit("register_response", JSON.stringify(response));
  }
}

function validateUser(data, socket) {
  json = JSON.parse(data);
  var response = {};

  var parameters = {
    "username": [TYPES.VarChar, json["username"]],
    "token": [TYPES.VarChar, json["token"]]
  }
  /*Při erroru -
  response["successful"] = false;
  socket.emit("validate_response", JSON.stringify(response));*/

  fn.doSQL('UPDATE tab_uzivatel SET Overeno = 1, Token = null WHERE Prihlasovaci_jmeno = @username AND token = @token', parameters, function (rowCount, more, rows) {
    fn.l("Updated rows: " + rowCount);
    if (rowCount == 1) {
      response["successful"] = true;
      socket.emit("validate_response", JSON.stringify(response));
    } else {
      response["successful"] = false;
      socket.emit("validate_response", JSON.stringify(response));
    }
  })
}

function sendVerificationEmail(token, address, username) {
  var url = "https://smarthome.linhy.cz/?validate&username=" + fn.escapeHTML(username) + "&token=" + token;
  var options = {
    from: "rezervacefrymburklinhart@gmail.com",
    to: address,
    subject: "Ověření emailové adresy na stránkách smarthome.linhy.cz",
    html: "<h2>Děkujeme za využití služeb smarthome.linhy.cz</h2><br>Pro aktivaci našich služeb <a href='" + url + "''>klikněte zde</a><br><br>Odkaz: " + url
  }

  transporter.sendMail(options, function(error, info) {
    lerr(error);
  })
}

function awaitDevice(socket, data) {
  var json = JSON.parse(data);

  awaitingRegister[json["device_id"]] = [socket, json["limit"], auth.getUsername(socket), json["name"]];
}

function cancelDevice(socket, data) {
  var json = JSON.parse(data);

  if (awaitingRegister[json["device_id"]][0] == socket) {
    delete awaitingRegister[json["device_id"]];
  }
}

function checkDeviceRegister(socket, id) {
  fn.l("Očekávající instalace..");
  fn.l(awaitingRegister);
  fn.l("Hotovo..");
  fn.l(awaitingRegister[id]);
  fn.l("Hotovo...");
  if(awaitingRegister[id] !== undefined) {
    username = auth.getUsername(awaitingRegister[id][0]);
    userId = auth.getUserId(awaitingRegister[id][2]);
    newDevicePass = fn.generateRandomString(30);

    pw.hash(newDevicePass, function(hash) {
      var parameters = {
        "id": [TYPES.Int, id],
        "pass": [TYPES.VarChar, hash],
        "user": [TYPES.Int, userId],
        "device": [TYPES.Int, id],
        'name': [TYPES.VarChar, awaitingRegister[id][3]],
        /* TODO Timezone offset */
        'time': [TYPES.DateTime, new Date()]
      }

      var done = false;
      fn.doSQL("INSERT INTO tab_zarizeni (ID_zarizeni, Prezdivka_zarizeni, heslo, Online, LastLogin) VALUES (@id, @name, @pass, 1, @time); INSERT INTO tab_opravneni (ID_uzivatel, ID_zarizeni, ID_druhopravneni) VALUES (@user, @device, 1)", parameters, function (rowCount, more, rows) {
        fn.l('SQL done..');
        if (!done) {
          done = true;
          fn.l('Počet řádků: ' + rowCount);
          if(rowCount == 1) {
            insertHistory(null, id, "", 5);
            awaitingRegister[id][0].emit("new_device_success");
            socket.emit("register_pass", newDevicePass);
            delete awaitingRegister[id];
          }
        }
      })
    })
  } else {
    fn.l("Pokus registrace zařízení s ID " + id + " o registraci bez vyžádání");
  }
}

function userExists(socket, json) {
  var parameters = {
    "name": [TYPES.VarChar, json["username"]],
    "email": [TYPES.VarChar, json["username"]]
  }

  fn.doSQL("SELECT ID_uzivatel FROM tab_uzivatel WHERE email LIKE @name OR Prihlasovaci_jmeno LIKE @email", parameters, function (rowCount, more, rows) {
    if (rowCount == 1) {
      var sendJson = JSON.stringify({"user_id": rows[0][0]["value"]});
      socket.emit('user_exists_response', sendJson);
    } else {
      socket.emit('user_exists_response', sendJson);
    }
  })
}

function addNewFunction(socket, data) {
  json = JSON.parse(data);

  var parameters = {
    "nazev": [TYPES.VarChar, json["function_name"]],
    "read": [TYPES.Bit, (json["rw"] == 2 || json["rw"] == 0 ? 1 : 0)],
    "write": [TYPES.Bit, (json["rw"] == 2 || json["rw"] == 1 ? 1 : 0)],
    "autor": [TYPES.VarChar, auth.getUserId(socket)],
    "GUI": [TYPES.Int, json["ID_GUI"]]
  }

  fn.doSQL("INSERT INTO tab_druhopravneni (Nazev_opravneni, Cteni, Zapis, Autor, ID_GUI) VALUES (@nazev, @read, @write, @autor, @GUI); SELECT SCOPE_IDENTITY()", parameters, function (rowCount, more, rows) {
    if (rows[0] != undefined) {
      fn.l(rows[0]);
      socket.emit('new_function_success', JSON.stringify({"item_id": rows[0][0]["value"]}));
    }
  })
}

function getPermissions(socket) {
  var parameters = {
    "ID": [TYPES.Int, auth.getUserId(socket)]
  }

  fn.doSQL("SELECT tab_opravneni.ID_opravneni, tab_opravneni.ID_uzivatel, tab_opravneni.ID_zarizeni, tab_zarizeni.Prezdivka_zarizeni, tab_opravneni.ID_druhopravneni, tab_druhopravneni.Nazev_opravneni, tab_druhopravneni.Cteni, tab_druhopravneni.Zapis, tab_druhopravneni.Autor, tab_uzivatel.Prihlasovaci_jmeno, s.vlastnik, tab_GUI.ID_GUI, tab_GUI.Nazev_GUI FROM tab_opravneni INNER JOIN tab_uzivatel ON tab_uzivatel.ID_uzivatel = tab_opravneni.ID_uzivatel INNER JOIN tab_druhopravneni ON tab_opravneni.ID_druhopravneni = tab_druhopravneni.ID_druhopravneni INNER JOIN tab_zarizeni ON tab_opravneni.ID_zarizeni = tab_zarizeni.ID_zarizeni INNER JOIN (SELECT u.Prihlasovaci_jmeno AS vlastnik, o.ID_zarizeni FROM tab_uzivatel AS u INNER JOIN tab_opravneni AS o ON o.ID_uzivatel = u.ID_uzivatel WHERE o.ID_druhopravneni = 1) AS s ON s.ID_zarizeni = tab_zarizeni.ID_zarizeni INNER JOIN tab_GUI ON tab_druhopravneni.ID_GUI = tab_GUI.ID_GUI WHERE tab_opravneni.ID_uzivatel = @ID OR tab_opravneni.ID_zarizeni IN (SELECT tab_opravneni.ID_zarizeni FROM tab_opravneni WHERE tab_opravneni.ID_uzivatel = @ID AND tab_opravneni.ID_druhopravneni = 1)", parameters, function (rowCount, more, rows) {
    socket.emit('get_permissions_response', JSON.stringify(rows));
  })
}

function updateFunction(socket, data) {
  json = JSON.parse(data);

  var parameters = {
    "name": [TYPES.VarChar, json["function_name"]],
    "read": [TYPES.Bit, (json["rw"] == 2 || json["rw"] == 0 ? 1 : 0)],
    "write": [TYPES.Bit, (json["rw"] == 2 || json["rw"] == 1 ? 1 : 0)],
    "gui": [TYPES.Int, json["ID_GUI"]],
    "ID": [TYPES.Int, json["ID"]],
    "author": [TYPES.Int, auth.getUserId(socket)]
  }

  fn.doSQL("UPDATE tab_druhopravneni SET Nazev_opravneni = @name, Cteni = @read, Zapis = @write, ID_GUI = @gui WHERE ID_druhopravneni = @ID AND Autor = @author", parameters, function (rowCount, more, rows) {
    if (rowCount == 1) {
      socket.emit("update_function_response", JSON.stringify({"success": true, "ID": json["ID"]}));
    } else {
      socket.emit("update_function_response", JSON.stringify({"success": false}));
    }
  })
}

function getFunctions(socket) {
  var parameters = {}

  fn.doSQL("SELECT tab_druhopravneni.ID_druhopravneni, tab_druhopravneni.Nazev_opravneni, tab_druhopravneni.Cteni, tab_druhopravneni.Zapis, tab_druhopravneni.Autor, tab_GUI.ID_GUI, tab_GUI.Nazev_GUI, tab_GUI.Zapis_GUI, tab_GUI.Cteni_GUI, tab_GUI.Napoveda_GUI FROM tab_druhopravneni INNER JOIN tab_GUI ON tab_druhopravneni.ID_GUI = tab_GUI.ID_GUI", parameters, function (rowCount, more, rows) {
    socket.emit('functions_response', JSON.stringify(rows));
  })
}

function getMyFunctions(socket) {
  var parameters = {"ID": [TYPES.Int, auth.getUserId(socket)]}
  var output_array = {
    /*
      "ID_zarizeni": {
        "ID_druhopravneni": {
          "ID_opravneni":
          "Nazev_opravneni":
          "ID_GUI":
          "Nazev_GUI":
        }
      }
     */
  }

  fn.l("Getting my functions");

  fn.doSQL("SELECT tab_opravneni.ID_zarizeni, tab_opravneni.ID_opravneni, tab_druhopravneni.ID_druhopravneni, tab_druhopravneni.Nazev_opravneni, tab_druhopravneni.Cteni, tab_druhopravneni.Zapis, tab_GUI.ID_GUI, tab_GUI.Nazev_GUI, tab_zarizeni.LastValues, tab_zarizeni.Online, tab_zarizeni.Prezdivka_zarizeni FROM tab_druhopravneni INNER JOIN tab_GUI ON tab_druhopravneni.ID_GUI = tab_GUI.ID_GUI INNER JOIN tab_opravneni ON tab_opravneni.ID_druhopravneni = tab_druhopravneni.ID_druhopravneni INNER JOIN tab_zarizeni ON tab_zarizeni.ID_zarizeni = tab_opravneni.ID_zarizeni WHERE tab_opravneni.ID_uzivatel = @ID AND tab_druhopravneni.ID_druhopravneni <> 1", parameters, function (rowCountst, morest, rowsst) {
    for (k in rowsst) {
      row = rowsst[k];
      if (output_array[row[0]["value"]] == undefined) {
        output_array[row[0]["value"]] = {};
      }

      json_value = JSON.parse(row[8]["value"]);
      output_array[row[0]["value"]][row[2]["value"]] = {
        "ID_opravneni": row[1]["value"],
        "Nazev_opravneni": row[3]["value"],
        "Cteni": row[4]["value"],
        "Zapis": row[5]["value"],
        "ID_GUI": row[6]["value"],
        "Nazev_GUI": row[7]["value"],
        "LastValues": json_value[row[2]["value"]]
      }
      output_array[row[0]["value"]]["Online"] = row[9]["value"];
      output_array[row[0]["value"]]["Prezdivka_zarizeni"] = row[10]["value"];
    }
    fn.doSQL("SELECT tab_zarizeni.ID_zarizeni, tab_zarizeni.Configuration, tab_zarizeni.LastValues, tab_opravneni.ID_opravneni, tab_zarizeni.Online, tab_zarizeni.Prezdivka_zarizeni FROM tab_zarizeni INNER JOIN tab_opravneni ON tab_zarizeni.ID_zarizeni = tab_opravneni.ID_zarizeni WHERE tab_opravneni.ID_druhopravneni = 1 AND tab_opravneni.ID_uzivatel = @ID", parameters, function(rowCount, more, rows) {
      if (rowCount >= 1) {
        var function_array = {};
        for (k in rows) {
          json = JSON.parse(rows[k][1]["value"]);
          function_array[rows[k][0]["value"]] = {
            "functions": [],
            "values": rows[k][2]["value"],
            "ID_opravneni": rows[k][3]["value"],
            "Online": rows[k][4]["value"],
            "Prezdivka_zarizeni": rows[k][5]["value"]
          };

          fn.l("Function array");
          fn.l(function_array);
          fn.l("JSON ARRAY");
          fn.l(json);
          for (j in json["functions"]) {
            if (json["functions"][j] == undefined) {
              function_array[rows[k][0]["value"]]["functions"].push("");
            } else {
              function_array[rows[k][0]["value"]]["functions"].push(json["functions"][j]);
            }
          }
        }

        var sql_function_array = [];

        for (i in function_array) {
          for (k = 0; k < function_array[i]["functions"].length; k++) {
            if (sql_function_array.indexOf(function_array[i]["functions"][k]) == -1 && function_array[i]["functions"][k] != 1) {
              sql_function_array.push(function_array[i]["functions"][k]);
            }
          }
        }

        var sqlArray = "(";

        for (i = 0; i < sql_function_array.length; i++) {
          sqlArray += sql_function_array[i];
          if (i != sql_function_array.length - 1 ) {
            sqlArray += ","
          }
        }

        sqlArray += ")";

        parameters = {}
        fn.doSQL("SELECT tab_druhopravneni.ID_druhopravneni, tab_druhopravneni.Nazev_opravneni, tab_druhopravneni.Cteni, tab_druhopravneni.Zapis, tab_GUI.ID_GUI, tab_GUI.Nazev_GUI FROM tab_druhopravneni INNER JOIN tab_GUI ON tab_druhopravneni.ID_GUI = tab_GUI.ID_GUI WHERE tab_druhopravneni.ID_druhopravneni IN " + sqlArray, parameters, function(rowCount, more, rows) {
          for (k in function_array) {
            for (i = 0; i < function_array[k]["functions"].length; i++) {
              var row = 0;
              for (j in rows) {
                if (rows[j][0]["value"] == function_array[k]["functions"][i]) {
                  row = j;
                }
              }
              if (output_array[k] == undefined) {
                output_array[k] = {};
              }

              jsonValue = JSON.parse(function_array[k]["values"]);
              output_array[k][function_array[k]["functions"][i]] = {
                "ID_opravneni": function_array[k]["ID_opravneni"],
                "Nazev_opravneni": rows[row][1]["value"],
                "Cteni": rows[row][2]["value"],
                "Zapis": rows[row][3]["value"],
                "ID_GUI": rows[row][4]["value"],
                "Nazev_GUI": rows[row][5]["value"]
              }
              if (jsonValue !== null) {
                if (jsonValue[function_array[k]["functions"][i]] !== null) {
                  output_array[k][function_array[k]["functions"][i]]["LastValues"] = jsonValue[function_array[k]["functions"][i]];
                }
              }

              output_array[k]["Online"] = function_array[k]["Online"];
              output_array[k]["Prezdivka_zarizeni"] = function_array[k]["Prezdivka_zarizeni"];
            }
          }

          fn.l("Returning my functions");
          socket.emit("my_functions_response", JSON.stringify(output_array));
        });
      } else {
        socket.emit("my_functions_response", JSON.stringify(output_array));
      }
    })
  })
}

function getGUI(socket, gui) {
  if (gui != null) {
    var parameters = {
      "ID": [TYPES.Int, json["device_id"]]
    }
    fn.doSQL("SELECT * FROM tab_GUI WHERE ID_GUI = @id", parameters, function (rowCount, more, rows) {
      socket.emit("gui_response", JSON.stringify(rows));
    })
  } else {
    fn.doSQL("SELECT * FROM tab_GUI", parameters, function (rowCount, more, rows) {
      socket.emit("gui_response", JSON.stringify(rows));
    });
  }
}

function getDeviceList(socket) {
  user_id = auth.getUserId(socket);

  var parameters = {
    "user_id": [TYPES.Int, user_id]
  }

  fn.doSQL("SELECT DISTINCT tab_zarizeni.ID_zarizeni, tab_zarizeni.Prezdivka_zarizeni, tab_zarizeni.Online, tab_zarizeni.LastLogin, tab_zarizeni.Configuration, CAST(CASE WHEN tab_opravneni.ID_druhopravneni = 1 THEN 1 ELSE 0 END AS bit) AS IsOwner FROM tab_zarizeni INNER JOIN tab_opravneni ON tab_opravneni.ID_zarizeni = tab_zarizeni.ID_zarizeni WHERE tab_opravneni.ID_uzivatel = @user_id ORDER BY ID_zarizeni", parameters, function (rowCount, more, rows) {
    fn.l(rows);
    socket.emit("device_list", JSON.stringify(rows));
  })
}

function getDeviceOwnerList(socket) {
  user_id = auth.getUserId(socket);

  var parameters = {
    "user_id": [TYPES.Int, user_id]
  }

  fn.doSQL("SELECT DISTINCT tab_zarizeni.ID_zarizeni, tab_zarizeni.Prezdivka_zarizeni, tab_zarizeni.Online, tab_zarizeni.LastLogin, tab_zarizeni.Configuration FROM tab_zarizeni INNER JOIN tab_opravneni ON tab_opravneni.ID_zarizeni = tab_zarizeni.ID_zarizeni WHERE tab_opravneni.ID_uzivatel = @user_id AND tab_opravneni.ID_druhopravneni = 1 ORDER BY ID_zarizeni", parameters, function (rowCount, more, rows) {
    fn.l(rows);
    socket.emit("owner_device_list", JSON.stringify(rows));
  })
}

/*
 * TODO databáze bdue ukládat všechny oprávnění a bude je pouze ukončovat - pole start, end - v dotazu se po end nebudou zobrazovat
 */

function deletePermission(socket, json) {
  var parameters = {
    "ID_opravneni": [TYPES.Int, json["permission_id"]]
  }

  fn.doSQL("DELETE FROM tab_opravneni WHERE ID_opravneni = @ID_opravneni", parameters, function (rowCount, more, rows) {
    if (rowCount == 1) {
      socket.emit("delete_permission_success", JSON.stringify({"success": true, "permission_id": json["permission_id"]}));
    } else {
      socket.emit("delete_permission_success", JSON.stringify({"success": false, "permission_id": json["permission_id"]}));
    }
  })
}

function registerPermission(socket, json) {
  var parameters = {
    "ID_uzivatel": [TYPES.Int, json["user_id"]],
    "ID_zarizeni": [TYPES.Int, json["device_id"]],
    "ID_druhopravneni": [TYPES.Int, json["function_id"]]
  }

  fn.doSQL("INSERT INTO tab_opravneni (ID_uzivatel, ID_zarizeni, ID_druhopravneni) VALUES (@ID_uzivatel, @ID_zarizeni, @ID_druhopravneni)", parameters, function (rowCount, more, rows) {
    if (rowCount == 1) {
      socket.emit("register_permission_success", JSON.stringify({"success": true, "device_id": json["device_id"]}));
      var userSocket = auth.getSocketByUserID(json["user_id"]);
      for (var key in userSocket) {
        getFunctions(userSocket[key]);
      }
    } else {
      socket.emit("register_permission_success", JSON.stringify({"success": false, "device_id": json["device_id"]}));
    }
  })
}


function isDeviceOwner(socket, device_id, callback) {
  var parameters = {
    "ID": [TYPES.Int, auth.getUserId(socket)],
    "devID": [TYPES.Int, device_id]
  }

  fn.doSQL("SELECT tab_opravneni.ID_zarizeni FROM tab_opravneni WHERE tab_opravneni.ID_zarizeni = @devID AND tab_opravneni.ID_uzivatel = @ID AND tab_opravneni.ID_druhopravneni = 1", parameters, function (rowCount, more, rows) {
    if (rowCount == 1) {
      callback(true);
    } else {
      callback(false);
    }
  })
}

function processStatusMessage(socket, data) {
  fn.l("Got new data..");
  fn.l(data);
  if (typeof(data) == "object") {
    var json = data;
  } else {
    var json = JSON.parse(data);
  }

  var functionID = Object.keys(json)[0];
  var value = json[functionID];

  var parameters = {
    "ID_zarizeni": [TYPES.Int, dev.getIdBySocket(socket)],
    "ID_druhopravneni": [TYPES.Int, functionID]
  }

  insertHistory(functionID, dev.getIdBySocket(socket), value, 2);

  /* TODO uložit do historie */
  fn.doSQL("SELECT tab_zarizeni.LastValues FROM tab_zarizeni WHERE ID_zarizeni = @ID_zarizeni", parameters, function(rowCount, more, rows) {
    var jsonValue = JSON.parse(rows[0][0]["value"]);
    if (jsonValue == null) {
      jsonValue = {};
    }
    jsonValue[functionID] = value;
    parameters["LastValues"] = [TYPES.VarChar, JSON.stringify(jsonValue)];

    fn.doSQL("UPDATE tab_zarizeni SET LastValues = @LastValues WHERE ID_zarizeni = @ID_zarizeni", parameters, function(rowCount, more, rows) {
      fn.doSQL("SELECT tab_opravneni.ID_opravneni, tab_opravneni.ID_uzivatel, tab_opravneni.ID_zarizeni, tab_zarizeni.LastValues FROM tab_opravneni INNER JOIN tab_zarizeni ON tab_zarizeni.ID_zarizeni = tab_opravneni.ID_zarizeni WHERE tab_opravneni.ID_zarizeni = @ID_zarizeni AND (tab_opravneni.ID_druhopravneni = 1 OR tab_opravneni.ID_druhopravneni = @ID_druhopravneni)", parameters, function(rowCount, more, rows) {
        for (i = 0; i < rows.length; i++) {
          var row = rows[i];

          var sockets = auth.getSocketById(row[1]["value"]);
          fn.l("Processing socket for user: " + row[1]["value"]);
          fn.l("Socket count: " + sockets.length);
          for (j = 0; j < sockets.length; j++) {
            if (sockets[j] != undefined) {
              fn.l("Emitting to client..");
              sockets[j].emit("status", JSON.stringify({"ID_zarizeni": dev.getIdBySocket(socket), "ID_druhopravneni": functionID, "value": value, "ID_opravneni": row[0]["value"]}))
            }
          }
        }
      });
    })
  })
}

function getConfiguration(socket) {
  var deviceID = dev.getIdBySocket(socket);

  var parameters = {"ID": [TYPES.Int, deviceID]};

  fn.doSQL("SELECT tab_zarizeni.Configuration FROM tab_zarizeni WHERE tab_zarizeni.ID_zarizeni = @ID", parameters, function(rowCount, more, rows) {
    socket.emit("deviceConfiguration", JSON.stringify(rows[0][0]));
  });
}

function acknowledgeUsers(online, id) {
  var parameters = {
    "ID": [TYPES.Int, id]
  }
  fn.doSQL("SELECT DISTINCT tab_opravneni.ID_uzivatel FROM tab_opravneni WHERE tab_opravneni.ID_zarizeni = @ID", parameters, function(rowCount, more, rows) {
    for (i = 0; i < rows.length; i++) {
      row = rows[i];
      fn.l("Acknowledging user with ID: " + row[0]["value"])
      var sockets = auth.getSocketById(row[0]["value"]);

      for (j = 0; j < sockets.length; j++) {
        if (sockets[j] != undefined) {
          fn.l("Acknowledging socket with ID: " + sockets[j].id);
          sockets[j].emit("device_status", JSON.stringify({"device_id": id, "status": online}));
        }
      }
    }
  })
}


function processCommand(socket, data) {
  var json = JSON.parse(data);

  var parameters = {
    "ID_uzivatel": [TYPES.Int, auth.getUserId(socket)],
    "ID_zarizeni": [TYPES.Int, json["ID_zarizeni"]],
    "ID_druhopravneni": [TYPES.Int, json["ID_druhopravneni"]]
  }

  /* TODO uložit do historie */

  insertHistory(json["ID_druhopravneni"], json["ID_zarizeni"], json["value"], 1, auth.getUserId(socket));


  fn.l(json);
  if (auth.checkToken(socket, json["token"])) {
    var device_socket = dev.getSocketById(json["ID_zarizeni"]);
    if (device_socket != undefined) {
      fn.doSQL("SELECT tab_opravneni.ID_opravneni FROM tab_opravneni WHERE tab_opravneni.ID_uzivatel = @ID_uzivatel AND tab_opravneni.ID_zarizeni = @ID_zarizeni AND (tab_opravneni.ID_druhopravneni = @ID_druhopravneni OR tab_opravneni.ID_druhopravneni = 1)", parameters, function(rowCount, more, rows) {
        fn.l("ROWS");
        fn.l(rows);
        if (rowCount == 1) {
          if (rows[0][0]["value"] == json["ID_opravneni"]) {
            fn.l("Getting socket..");
            fn.l("Socket:")
            fn.l(device_socket);

            device_socket.emit("command", JSON.stringify({"function": json["ID_druhopravneni"], "value": json["value"]}))
            fn.l("Emitted");
          } else {
            fn.l("Not passed");
          }
        } else {
          fn.l("Not passed");
        }
      })
    }
  } else {
    fn.l("Bad token");
  }
}

function getHistory(socket) {
  var userID = auth.getUserId(socket);

  var parameters = {
    "ID_uzivatel": [TYPES.Int, userID]
  }

  fn.doSQL("SELECT tab_historie.ID_zarizeni, tab_historie.ID_druhhistorie, tab_historie.Cas, tab_historie.Value, tab_historie.ID_druhopravneni, tab_historie.ID_uzivatel, tab_historie.ID_historie, tab_druhopravneni.Nazev_opravneni FROM tab_historie JOIN (SELECT tab_opravneni.ID_zarizeni, tab_opravneni.ID_druhopravneni FROM tab_opravneni WHERE tab_opravneni.ID_uzivatel = @ID_uzivatel) AS opravneni ON opravneni.ID_zarizeni = tab_historie.ID_zarizeni LEFT JOIN tab_druhopravneni ON tab_historie.ID_druhopravneni = tab_druhopravneni.ID_druhopravneni WHERE opravneni.ID_druhopravneni = tab_historie.ID_druhopravneni OR opravneni.ID_druhopravneni = 1", parameters, function(rowCount, more, rows) {
    var history = {};
    for (var key in rows) {
      row = rows[key];

      if (history[row[0]["value"]] == undefined) {
        history[row[0]["value"]] = {};
      }

      history[row[0]["value"]][row[6]["value"]] = {
        "ID_druhhistorie": row[1]["value"],
        "Cas": row[2]["value"],
        "Value": row[3]["value"],
        "ID_druhopravneni": row[4]["value"],
        "Nazev_druhopravneni": row[7]["value"],
        "ID_uzivatel": row[5]["value"]
      }
    }
    socket.emit("my_history", JSON.stringify(history));
  });
}

function insertHistory(functionID, deviceID, data, druhHistorieID, userID) {
  var parameters = {
    "ID_zarizeni": [TYPES.Int, deviceID],
    "Value": [TYPES.VarChar, data],
    "Cas": [TYPES.DateTime, new Date()],
    "ID_druhhistorie": [TYPES.Int, druhHistorieID]
  }



  if (userID != null) {
    parameters["ID_druhopravneni"] = [TYPES.Int, functionID];
    parameters["ID_uzivatel"] = [TYPES.Int, userID];
    fn.doSQL("INSERT INTO tab_historie (ID_zarizeni, ID_uzivatel, ID_druhopravneni, Cas, Value, ID_druhhistorie) VALUES (@ID_zarizeni, @ID_uzivatel, @ID_druhopravneni, @Cas, @Value, @ID_druhhistorie)", parameters, function(rowCount, more, rows){});
  } else if (functionID == null) {
    fn.l("ID_druhhistorie:" + druhHistorieID);
    fn.doSQL("INSERT INTO tab_historie (ID_zarizeni, Cas, Value, ID_druhhistorie) VALUES (@ID_zarizeni, @Cas, @Value, @ID_druhhistorie)", parameters, function(rowCount, more, rows){});
  } else {
    parameters["ID_druhopravneni"] = [TYPES.Int, functionID];
    fn.l("ID_druhhistorie:" + druhHistorieID);
    fn.doSQL("INSERT INTO tab_historie (ID_zarizeni, ID_druhopravneni, Cas, Value, ID_druhhistorie) VALUES (@ID_zarizeni, @ID_druhopravneni, @Cas, @Value, @ID_druhhistorie)", parameters, function(rowCount, more, rows){});
  }

    /* DO something? */
}

function sendPageContent(socket, url) {
  fn.l("Sending page content");
  var menuOptions = {
    "HOME": [
      "Domů",
      "?home"
    ],
    "NEW_DEVICE": [
      "Nové zařízení",
      "?new_device"
    ],
    "HISTORY": [
      "Historie",
      "?history"
    ],
    "PERMISSIONS": [
      "Oprávnění",
      "?permissions"
    ],
    "SETTINGS": [
      "Nastavení zařízení",
      "?device_settings"
    ],
    "DEVICES": [
      "Moje zařízení",
      "?devices"
    ],
    "CONTROL": [
      "Ovládací panel",
      "?control"
    ],
    "FUNCTIONS": [
      "Seznam funkcí",
      "?functions"
    ]
  }

  var pageContent = {
    "Menu": menuOptions
  }

  fn.l("URL" + url);

  if (url != undefined) {
    fn.l("STILL GOING!");
    pageContent["URL"] = url;
    pageContent["Body"] = fs.readFileSync("C:\\www\\smarthome-socket\\pages\\" + url + ".html", "utf-8");
  }

  fn.l("Emitting page content");
  socket.emit("page_content", JSON.stringify(pageContent));
  fn.l("Emitting page content");
}

function getMyConfiguration(socket) {
  var user_id = auth.getUserId(socket);

  var parameters = {"ID": [TYPES.Int, user_id]};

  fn.doSQL("SELECT tab_zarizeni.ID_zarizeni, tab_zarizeni.Configuration FROM tab_zarizeni INNER JOIN tab_opravneni ON tab_opravneni.ID_zarizeni = tab_zarizeni.ID_zarizeni WHERE tab_opravneni.ID_uzivatel = @ID AND tab_opravneni.ID_druhopravneni = 1", parameters, function(rowCount, more, rows) {
    socket.emit("my_configuration", JSON.stringify(rows));
  });
}

function updateConfigurations(socket, data) {
  var deviceID = data["device_id"];
  var configValue = data["value"];

  isDeviceOwner(socket, deviceID, function(isOwner) {
    if (isOwner) {

      var parameters = {
        "config": [TYPES.VarChar, configValue],
        "ID": [TYPES.Int, deviceID]
      }

      fn.doSQL("UPDATE tab_zarizeni SET Configuration = @config WHERE tab_zarizeni.ID_zarizeni = @ID", parameters, function(rowCount, more, rows) {
        /* TODO callback success/ne */
      })
    }
  })
}

function loadConnectedUsers() {
  if (fs.existsSync("C:\\www\\smarthome-socket\\authUsers.bin")) {
    var usersString = fs.readFileSync("C:\\www\\smarthome-socket\\authUsers.bin", "utf8");

    if (usersString != "") {
      auth.loadAuthUsers(usersString);
    }
  }
}
