// middlewares/authMiddleware.js
exports.isAuthenticated = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};