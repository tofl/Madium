let express = require('express');
let router = express.Router();
let auth = require('./../services/authentication');

// New comment (id = post id)
router.post("/new/:id", async (req, res, next) => {
  let verified = auth.verifyJwt(req.cookies.token);
  
  if (!verified) {
    res.status(403);
    res.send();
    return;
  }
  
  let userId = verified;
  
  // Write the new comment :
  let info = {};
  info.content = req.body.content;
  info.author = userId;
  info.target = req.params.id;
  
  let errors = [];
  if (!info.content || info.content.length === 0 || info.content.length > 300) {
    errors.push("content");
  }
  if (!info.target) {
    errors.push("target");
  }
  
  if (errors.length > 0) {
    res.status(400);
    res.send(errors);
    return;
  }
  
  // Check if the target post exists
  let targetPost = await res.locals.connection.query("SELECT * FROM posts WHERE id = ?", [info.target]);
  if (targetPost[0].length === 0) {
    res.status(404);
    res.send();
    return;
  }
  
  // Persist the comment
  let persistComment = await res.locals.connection.query("INSERT INTO comments (content, author_id, target_id) VALUES (?, ?, ?)", [info.content, info.author, info.target]);
  
  if (!persistComment[0].insertId) {
    res.status(500);
    res.send();
    return;
  }
  
  res.status(201);
  res.send(persistComment);
});

router.get("/:id", async (req, res, next) => {
  let postId = req.params.id;
  
  if (!postId) {
    res.status(404);
    res.send();
    return;
  }
  
  let comments = await res.locals.connection.query("SELECT * FROM comments WHERE target_id = ?", [postId]);
  
  if (comments[0].length === 0) {
    res.status(404);
  } else {
    res.status(200);
  }
  res.send(comments[0]);
});

router.delete("/:id", async (req, res, next) => {
  let verified = auth.verifyJwt(req.cookies.token);
  
  if (!verified) {
    res.status(403);
    res.send();
    return;
  }
  
  let userId = verified;
  
  // Check if the user is authorised to delete the comment :
  let commentAuthor = await res.locals.connection.query("SELECT author_id FROM comments WHERE id = ?", [req.params.id]);
  
  if (!commentAuthor[0][0]) {
    res.status(404);
    res.send();
    return;
  }
  
  if (commentAuthor[0][0].author_id !== userId) {
    res.status(403);
    res.send();
    return;
  }
  
  // Delete the comment :
  let deleteComment = await res.locals.connection.query("DELETE FROM comments WHERE id = ?", [req.params.id]);
  
  if (deleteComment[0].affectedRows === 0) {
    res.status(409);
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
  
  // Retrieve the body of the request
  let info = {};
  info.content = req.body.content;
  info.target = req.params.id;
  
  let errors = [];
  if (!info.content || info.content.length === 0 || info.content.length > 300) {
    errors.push("content");
  }
  if (!info.target) {
    errors.push("target");
  }
  
  if (errors.length > 0) {
    res.status(400);
    res.send(errors);
    return;
  }
  
  // Check if the user is authorised to update the comment :
  let commentAuthor = await res.locals.connection.query("SELECT author_id FROM comments WHERE id = ?", [req.params.id]);
  
  if (!commentAuthor[0][0]) {
    res.status(404);
    res.send();
    return;
  }
  
  if (commentAuthor[0][0].author_id !== userId) {
    res.status(403);
    res.send();
    return;
  }
  
  // Update the comment :
  let updateComment = await res.locals.connection.query("UPDATE comments SET content = ? WHERE id = ?", [info.content, req.params.id]);
  if (updateComment[0].affectedRows === 0) {
    res.status(500);
    res.send();
    return;
  }
  
  res.status(200);
  res.send();
});

module.exports = router;