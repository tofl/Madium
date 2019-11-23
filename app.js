let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let cors = require('cors');
let mysql = require('mysql2/promise');

let usersRouter = require('./routes/users');
let postsRouter = require('./routes/posts');
let commentsRouter = require('./routes/comments');

let app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}));

app.use(async (req, res, next) => {
  res.locals.connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "medium"
  });
  res.locals.connection.connect();
  next();
});

app.use('/users', usersRouter);
app.use('/posts', postsRouter);
app.use('/comments', commentsRouter);

// catch 404 and forward to error handler
// TODO : 404

module.exports = app;
