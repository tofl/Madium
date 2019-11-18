let express = require('express');
let router = express.Router();
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const saltRounds = 10;
  let hash = await new Promise((resolve, reject) => {
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) reject(err);
      resolve(hash);
    })
  });
  
  return hash;
}


/* GET users listing. */
router.post('/new', async function(req, res, next) {
  let info = {};
  info.firstname = req.body.firstname;
  info.lastname = req.body.lastname;
  info.email = req.body.email;
  info.password = req.body.password;
  
  let errors = [];
  
  if (info.firstname.length < 2 || info.firstname.length > 20) {
    errors.push("firstname");
  }
  if (info.lastname.length < 2 || info.lastname.length > 25) {
    errors.push("lastname");
  }
  if (info.email.length < 5 || info.email.length > 200) {
    errors.push("email");
  }
  if (info.password.length < 5 || info.password.length > 255) {
    errors.push("password");
  }
  
  if (errors.length > 0) {
    res.status(400);
    res.send(JSON.stringify(errors));
  }
  
  let userCount = await res.locals.connection.query("SELECT COUNT(*) AS count FROM users WHERE email = ?", [info.email]);
  
  if (userCount[0][0].count > 0) {
    res.status(409);
    res.send("user already exists");
    return;
  }
  
  let password = await hashPassword(info.password);
  
  let newUser = await res.locals.connection.query("INSERT INTO users (firstname, lastname, email, password) VALUES (?, ?, ?, ?)", [info.firstname, info.lastname, info.email, password]);
  
  if (newUser[0].affectedRows === 0) {
    res.status(500);
    res.send("the user wasn't created");
    return;
  }
  
  res.status(201);
  // Create JWT
  res.send();
  
});

module.exports = router;
