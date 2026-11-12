function requireAuthentication(req, res, next) {
  if (!req.user?._id) return res.redirect("/user/signin");
  next();
}

module.exports = requireAuthentication;
