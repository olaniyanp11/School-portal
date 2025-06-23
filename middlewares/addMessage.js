// middleware/message.js
function makeMessage(req, res, next) {
  // 1. Read message from query
  const message = req.query.message;
  const type = req.query.type || 'info'; // optional: success, error, warning, etc.

  // 2. Set on res.locals so it's accessible in all EJS files
  res.locals.message = message || null;
  res.locals.messageType = type;

  next();
}

module.exports = makeMessage;
