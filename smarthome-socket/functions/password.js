var hashing = require('pbkdf2-password-hash');
var pepper = "nTCpoDEG0jIOOU9";

module.exports = {
  hash: function(password, callback) {
    hashing.hash(password + pepper).then((hash) => {
      callback(hash);
    })
  },

  validate: function(password, hash, callback) {
    hashing.compare(password + pepper, hash).then((isValid) => {
      callback(isValid);
    })
  }
}
