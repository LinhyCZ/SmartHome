var auth_users = {}
var jQuery = require('jQuery');
var fn;

function fnAuthUser(socket, username, user_id) {
  auth_users[socket.id] = [
    username,
    socket.handshake.address,
    fn.generateRandomString(60),
    user_id,
    socket
  ]
  fn.saveConnectedUsers(fnGetAuthUsers());
  return auth_users[socket.id];
}

/*
  identifier: socket nebo username
*/

function fnUnAuthUser(identifier) {
  if (identifier.id != null) {
    delete auth_users[identifier.id];
  } else {
    for (var key in auth_users) {
      value = auth_users[key];
      if (identifier == value[0]) {
        delete auth_users[key];
        break;
      }
    }
  }
  fn.saveConnectedUsers(fnGetAuthUsers());
}


/*
  identifier: socket nebo username
*/

function fnIsAuth(identifier) {
  if (identifier.id != null) {
    return auth_users.hasOwnProperty(identifier.id);
  } else {
    for (var key in auth_users) {
      value = auth_users[key];
      if (identifier == value[0]) {
        return true;
      }
    }

    return false;
  }
}

function fnRepeatAuth(username, unique, new_socket) {
  var socketIDs = fnGetSocketIDs(username);

  for (var key in socketIDs) {
    socketID = socketIDs[key];
    if (socketID !== undefined) {
      if (auth_users[socketID] !== undefined) {
        if (/*auth_users[socketID][1] == socket.handshake.address && */auth_users[socketID][2] == unique) {
          auth_users[new_socket.id] = auth_users[socketID];
          auth_users[new_socket.id].splice(4, 1, new_socket);
          //auth_users[new_socket.id][4] = new_socket;
          delete auth_users[socketID];
          fn.saveConnectedUsers(fnGetAuthUsers());
          return auth_users[new_socket.id];
        }
      }
    }
  }
  return false;
}

function fnGetUsername(socket) {
  return auth_users[socket.id][0];
}

function fnGetSocketById(userId) {
  var returnArray = []
  for (var key in auth_users) {
    if (auth_users[key][3] == userId) {
      returnArray.push(auth_users[key][4]);
    }
  }

  return returnArray;
}

function fnGetSocketIDs(username) {
  var returnArray = []
  for (var key in auth_users) {
    if (auth_users[key][0] == username) {
      returnArray.push(key);
    }
  }
  return returnArray;
}

function fnGetSocketByUserID(userID) {
  var returnArray = []
  for (var key in auth_users) {
    if (auth_users[key][3] == userID) {
      returnArray.push(auth_users[key][4]);
    }
  }
  return returnArray;
}

function fnGetSocket(username) {
  var returnArray = []
  for (var key in auth_users) {
    if (auth_users[key][0] == username) {
      returnArray.push(auth_users[key][4]);
    }
  }
  return returnArray;
}

function fnGetUserId(identifier) {
  if (identifier.id !== undefined) {
    return auth_users[identifier.id][3];
  } else {
    return auth_users[fnGetSocketIDs(identifier)[0]][3];
  }
}

function fnCheckToken(identifier, token) {
  if (identifier.id !== undefined) {
    socket = identifier;
  } else {
    socket = fnGetSocket(identifier);
  }

  if (token == auth_users[socket.id][2]) {
    return true;
  } else {
    return false;
  }
}

function fnSocketDisconnect(socket) {
  if (auth_users[socket.id] !== undefined) {
    delete auth_users[socket.id][4];
  }
}

function fnGetAuthUsers() {
  var sendUsers = Object.create(Object.getPrototypeOf(auth_users))

  for (var key in auth_users) {
    sendUsers[key] = [];
    var length = auth_users[key].length;
    for (i = 0; i < length; i++) {
      if (auth_users[key][i] != undefined && auth_users[key][i].id == undefined) {
        sendUsers[key].push(auth_users[key][i]);
      } else {
        sendUsers[key].push(null);
      }
    }
  }

  return JSON.stringify(sendUsers);
}

function fnLoadAuthUsers(usersString) {
  auth_users = JSON.parse(usersString);
}

module.exports = function(functions) {
  fn = functions;
  var modules = {
    authUser: fnAuthUser,
    unAuthUser: fnUnAuthUser,
    isAuth: fnIsAuth,
    repeatAuth: fnRepeatAuth,
    getUsername: fnGetUsername,
    getUserId: fnGetUserId,
    getSocket: fnGetSocket,
    getSocketById: fnGetSocketById,
    getSocketByUserID: fnGetSocketByUserID,
    checkToken: fnCheckToken,
    socketDisconnect: fnSocketDisconnect,
    getAuthUsers: fnGetAuthUsers,
    loadAuthUsers: fnLoadAuthUsers
  }

  return modules;
}
