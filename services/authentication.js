let jwt = require('jsonwebtoken');
let fs = require('fs');
let path = require('path');

let key = fs.readFileSync(path.resolve('./private.key'), 'utf8');

function createJwt(userId) {
  return jwt.sign({
    userId
  }, key, { expiresIn: 60 * 60 * 24 * 7 }); // Expires in 7 days
}

function verifyJwt(token) {
  let decoded;
  try {
    decoded = jwt.verify(token, key);
  } catch (e) {
    return false;
  }
  
  return decoded.userId;
}

module.exports = {
  createJwt,
  verifyJwt
};