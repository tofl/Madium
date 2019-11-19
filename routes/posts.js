let express = require('express');
let router = express.Router();
let auth = require('./../services/authentication');

// Write a new post
router.post("/new", async (req, res, next) => {
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

// Get a specific post
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

// Delete a post
router.delete("/:id", async (req, res, next) => {
  let verified = auth.verifyJwt(req.cookies.token);
  
  if (!verified) {
    res.status(403);
    res.send();
    return;
  }
  
  let userId = verified;
  
  // Check if the post exists
  let post = await res.locals.connection.query("SELECT author_id FROM posts WHERE id = ?", [req.params.id]);
  if (post[0].length === 0) {
    res.status(404);
    res.send();
    return;
  }
  
  // Check if the user is authorised
  if (post[0][0].author_id !== userId) {
    res.status(403);
    res.send();
    return;
  }
  
  // Delete the post
  let deletePost = await res.locals.connection.query("DELETE FROM posts WHERE id = ?", [req.params.id]);
  if (deletePost[0].affectedRows === 0) {
    res.status(500);
    res.send();
    return;
  }
  
  // Delete all the related comments
  let deleteComments = await res.locals.connection.query("DELETE FROM comments WHERE target_id = ?", [req.params.id]);
  
  res.status(200);
  res.send();
});



// Update post
router.put("/:id", async (req, res, next) => {
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
  
  let errors = [];
  if (!info.title || info.title.length < 0 || info.title.length > 255) {
    errors.push("title");
  }
  if (!info.content || info.content.length < 10) {
    errors.push("content");
  }
  if (errors.length > 0) {
    res.status(400);
    res.send(errors);
    return;
  }
  
  // Check if the post exists
  let post = await res.locals.connection.query("SELECT author_id FROM posts WHERE id = ?", [req.params.id]);
  if (post[0].length === 0) {
    res.status(404);
    res.send();
    return;
  }
  
  // Check if the user is the author of the targeted post
  if (userId !== post[0][0].author_id) {
    res.status(403);
    res.send();
    return
  }
  
  
  await res.locals.connection.query(
    "UPDATE posts SET title = ?, content = ? WHERE id = ?",
    [info.title, info.content, userId]
  );
  
  res.status(200);
  res.send();
});

// Get all posts (with pagination)
router.get("/page/:page", async (req, res, next) => {
  let page = req.params.page - 1;
  let from = 10 * page;
  let to = 10 * page + 10;
  
  let posts = await res.locals.connection.query("SELECT * FROM posts LIMIT ?, ?", [from, to]);
  
  res.status(200);
  res.send(posts[0]);
});

module.exports = router;