function checkLec(req, res, next) {
  if (req.user && req.user.role === 'lecturer') {
    return next();
  }

  // Redirect with a query string message
  return res.redirect('/?message=AccessDenied&type=error');
}
module.exports = checkLec;