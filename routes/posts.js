let express = require('express');
let router = express.Router();
const bcrypt = require('bcrypt');
let auth = require('./../services/authentication');

// Write a new post
router.post("/new", async (req, res, next) => {
  //console.log(req.cookies.token);
  let verified = auth.verifyJwt(req.cookies.token);
  
  if (!verified) {
    res.status(403);
    res.send();
    return;
  }
  
  let userId = verified;
  
  // Verifying the post :
  let info = {};
  info.title = req.body.title;
  info.content = req.body.content;
  info.author = userId;
  
  let errors = [];
  if (info.title.length < 0 || info.title.length > 255) {
    errors.push("title");
  }
  if (info.content.length < 10) {
    console.log(info.content.length);
    errors.push("content");
  }
  if (errors.length > 0) {
    res.status(400);
    res.send(errors);
    return;
  }
  
  let newPost = await res.locals.connection.query(
    "INSERT INTO posts (title, content, date, author_id) VALUES (?, ?, NOW(), ?)",
    [info.title, info.content, info.author]
  );
  
  res.status(201);
  res.send({id: newPost[0].insertId});
});

router.get("/:id", async (req, res, next) => {
  if (!req.params.id) {
    req.status(400);
    req.send();
    return;
  }
  
  let post = await res.locals.connection.query(
    "SELECT title, content, date, author_id FROM posts WHERE id = ?",
    [req.params.id]
  );
  
  
  if (post[0].length === 0) {
    res.status(404);
    res.send();
    return;
  }
  
  res.status(200);
  res.send(post[0][0]);
});

module.exports = router;