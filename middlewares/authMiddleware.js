// middlewares/authMiddleware.js
module.exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.donor) {
    return next();
  }
  res.redirect('/login');
};