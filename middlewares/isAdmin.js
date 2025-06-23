function checkAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  // Redirect with a query string message
  return res.redirect('/?message=AccessDenied&type=error');
}
module.exports = checkAdmin;