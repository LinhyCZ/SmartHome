var devices = {}
var fn;

function fnAuth(socket, device_id) {
  devices[device_id] = socket;
}

/*
  identifier: socket nebo username
*/

function fnUnAuth(socket) {
  for (var key in devices) {
    if (devices[key] == socket) {
      delete devices[key];
      return key;
    }
  }
  return false;
}

function fnGetSocketById(id) {
  return devices[id];
}

function fnGetIdBySocket(socket) {
  for (var k in devices) {
    if (devices[k] == socket) {
      return k;
    }
  }
  return false;
}

function fnIsAuth(identifier) {
  if (identifier.id == undefined) {
    if (devices[identifier] == undefined) {
      return false;
    } else {
      return true;
    }
  } else {
    if (fnGetIdBySocket(identifier)) {
      return true;
    } else {
      return false;
    }
  }
}


module.exports = function() {
  var modules = {
    auth: fnAuth,
    unAuth: fnUnAuth,
    isAuth: fnIsAuth,
    getIdBySocket: fnGetIdBySocket,
    getSocketById: fnGetSocketById
  }

  return modules;
}
