// middlewares/authMiddleware.js
module.exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.donor) {
    return next();
  }
  res.redirect('/login');
};

exports.ensureHealthCenterAuthenticated = (req, res, next) => {
    if (req.session && req.session.healthCenter) {
        return next();
    }
    res.redirect('/health-center/login');
};