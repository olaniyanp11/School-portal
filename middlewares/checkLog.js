const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  console.log('Token:', token); // Log the token for debugging
  if (!token) {
    return res.redirect('/logout'); // Or show an unauthorized page
  }

  try {
    console.log('Verifying token...'); // Log before verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded; // Attach user data to request
    req.isLoggedIn = true
    next();
  } catch (err) {
    console.log('Token verification failed:', err); // Log the error for debugging
    res.clearCookie('token'); // Clear the cookie if verification fails
    return res.redirect('/login?message=your session has expired&type=error'); // Token expired or invalid
  }
}

module.exports = authenticateToken;
// This middleware checks if the user is authenticated by verifying the JWT token.