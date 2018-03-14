var Request;
var pool;
var fs;

function lerr (error) {
  if (error) {
    console.log("Request Error: " + error);
  }
}


function fnRndStr(length) {
  var string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var result = "";
  for (i = 0; i < length; i++) {
    result += string.charAt(Math.floor(Math.random() * 62));
  }
  return result;
}

function escape (string) {
  return string.replace(/&/g, '&amp;').replace(/"/g, '&quot').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fnLog (string) {
  logTime = new Date();
  logTime.setHours(logTime.getHours() + logTime.getTimezoneOffset() / 60);

  var prettyTime = logTime.getDate() + ". " + (logTime.getMonth() + 1) + ". " + logTime.getFullYear() + " " + logTime.getHours() + ":" + (logTime.getMinutes() > 9 ? logTime.getMinutes() : "0" + logTime.getMinutes()) + ":" + (logTime.getSeconds() > 9 ? logTime.getSeconds() : "0" + logTime.getSeconds());

  if (typeof(string) == "object") {
    console.log(prettyTime);
    console.log(string);
  } else {
    console.log(prettyTime + " - " + string);
  }

}

function fnDoSQL(sql, parameters, callback) {
  pool.acquire(function(error, connection) {
    lerr(error);

    var request = new Request(sql, function(error) {
      lerr(error);

      connection.release();
    })

    for (var identifier in parameters) {
      request.addParameter(identifier, parameters[identifier][0], parameters[identifier][1]);
    }

    request.on('doneInProc', function(rowCount, more, rows) {
      console.log("Calling back");
      callback(rowCount, more, rows);
    })

    connection.execSql(request);
  })
}

function fnSaveConnectedUsers(usersString) {
  console.log("Writing users to file.");

  fs.writeFile("C:\\www\\smarthome-socket\\authUsers.bin", usersString, function(err) {
    if (err) {console.log(err)}
    console.log("Done");
  })
}

module.exports = function (req, poo, filesystem) {
  Request = req;
  pool = poo;
  fs = filesystem;
  var modules = {
    l: fnLog,
    generateRandomString: fnRndStr,
    escapeHTML: escape,
    doSQL: fnDoSQL,
    saveConnectedUsers: fnSaveConnectedUsers
  }

  return modules;
}
