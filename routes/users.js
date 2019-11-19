let express = require('express');
let router = express.Router();
const bcrypt = require('bcrypt');
let auth = require('./../services/authentication');

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
  
  if (!info.firstname || info.firstname.length < 2 || info.firstname.length > 20) {
    errors.push("firstname");
  }
  if (!info.lastname || info.lastname.length < 2 || info.lastname.length > 25) {
    errors.push("lastname");
  }
  if (!info.email || info.email.length < 5 || info.email.length > 200) {
    errors.push("email");
  }
  if (!info.password || info.password.length < 5 || info.password.length > 255) {
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
  res.send();
  
});

// User login endpoint
router.post('/login', async function(req, res, next) {
  let info = {};
  info.email = req.body.email;
  info.password = req.body.password;

  if (!info.email || !info.password) {
    res.status(400);
    res.send();
    return;
  }
  
  let userData = await res.locals.connection.query("SELECT id, email, password FROM users WHERE email = ?", [info.email]);
  
  if (userData[0].length === 0) {
    res.status(404);
    res.send();
    return;
  }
  
  const match = await bcrypt.compare(info.password, userData[0][0].password);
  
  if (!match) {
    res.status(403);
    res.send();
    return;
  }
  
  // Create JWT
  let token = auth.createJwt(userData[0][0].id);
  
  res.status(200);
  res.cookie('token', token, {
    httpOnly: true,
    expires: new Date(Date.now() + 3600000 * 24 * 14)
  });
  res.send();
});

// Delete a user
router.delete("/:id", async (req, res, next) => {
  let verified = auth.verifyJwt(req.cookies.token);
  
  if (!verified) {
    res.status(403);
    res.send();
    return;
  }
  
  let userId = verified;
  
  // The user can only delete himself, and no one else
  if (userId != req.params.id) {
    res.status(403);
    res.send();
    return;
  }
  
  // Delete the user (no need to check if the user in question exists, as he is the one currently logged in)
  let deleteUser = await res.locals.connection.query("DELETE FROM users WHERE id = ?", [req.params.id]);
  if (deleteUser[0].affectedRows === 0) {
    res.status(500);
    res.send();
    return;
  }
  
  res.status(200);
  res.send();
  return;
});


// Follow a user
router.get("/follow/:id", async (req, res, next) => {
  let verified = auth.verifyJwt(req.cookies.token);
  
  if (!verified) {
    res.status(403);
    res.send();
    return;
  }
  
  let userId = verified;
  
  // Check if the targeted user is not the user making the request
  if (userId == req.params.id) {
    res.status(403);
    res.send();
    return;
  }
  
  // Check if the targeted user exists
  let targetUser = await res.locals.connection.query("SELECT COUNT(*) AS count FROM users WHERE id = ?", [req.params.id]);
  if (targetUser[0][0].count === 0) {
    res.status(404);
    res.send();
    return;
  }
  
  // Check if the target is already followed
  let followCount = await res.locals.connection.query(
    "SELECT COUNT(*) AS count FROM followers WHERE follower = ? AND followed = ?",
    [userId, req.params.id]
  );
  if (followCount[0][0].count !== 0) {
    res.status(403);
    res.send();
    return;
  }
  
  // Follow the user
  let follow = await res.locals.connection.query("INSERT INTO followers (follower, followed) VALUES (?, ?)", [userId, req.params.id]);
  if (follow[0].affectedRows === 0) {
    res.status(500);
    res.send();
    return;
  }
  
  res.status(200);
  res.send();
});


// Unfollow a user
router.get("/unfollow/:id", async (req, res, next) => {
  let verified = auth.verifyJwt(req.cookies.token);
  
  if (!verified) {
    res.status(403);
    res.send();
    return;
  }
  
  let userId = verified;
  
  // Check if the targeted user is not the user making the request
  if (userId == req.params.id) {
    res.status(403);
    res.send();
    return;
  }
  
  // Check if the target is followed
  let followCount = await res.locals.connection.query(
    "SELECT COUNT(*) AS count FROM followers WHERE follower = ? AND followed = ?",
    [userId, req.params.id]
  );
  if (followCount[0][0].count === 0) {
    res.status(403);
    res.send();
    return;
  }
  
  // Delete the follow
  let deleteFollow = await res.locals.connection.query("DELETE FROM followers WHERE follower = ? AND followed = ?", [userId, req.params.id]);
  
  if (deleteFollow[0].affectedRows === 0) {
    res.status(500);
    res.send();
    return;
  }
  
  res.status(200);
  res.send();
});

router.put("/:id", async (req, res, next) => {
  let verified = auth.verifyJwt(req.cookies.token);
  
  if (!verified) {
    res.status(403);
    res.send();
    return;
  }
  
  let userId = verified;
  
  // Check if the targeted user is not the user making the request
  if (userId != req.params.id) {
    res.status(403);
    res.send();
    return;
  }
  
  // Checking for errors :
  let info = {};
  info.firstname = req.body.firstname;
  info.lastname = req.body.lastname;
  info.email = req.body.email;
  info.password = req.body.password
  
  let errors = [];
  
  if (!info.firstname || info.firstname.length < 2 || info.firstname.length > 20) {
    errors.push("firstname");
  }
  if (!info.lastname || info.lastname.length < 2 || info.lastname.length > 25) {
    errors.push("lastname");
  }
  if (!info.email || info.email.length < 5 || info.email.length > 200) {
    errors.push("email");
  }
  if (!info.password || info.password.length < 5 || info.password.length > 255) {
    errors.push("password");
  }
  
  if (errors.length > 0) {
    res.status(400);
    res.send(JSON.stringify(errors));
  }
  
  let password = await hashPassword(info.password);
  
  await res.locals.connection.query(
    "UPDATE users SET firstname = ?, lastname = ?, email = ?, password = ? WHERE id = ?",
    [info.firstname, info.lastname, info.email, password, req.params.id]
  );
  
  res.status(200);
  res.send();
});

module.exports = router;
