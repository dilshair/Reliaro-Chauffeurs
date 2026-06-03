/* ── Require logged-in customer ── */
function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login?next=' + encodeURIComponent(req.originalUrl));
}

/* ── Require logged-in admin ── */
function requireAdmin(req, res, next) {
  if (req.session?.adminId) return next();
  res.redirect('/admin/login');
}

module.exports = { requireAuth, requireAdmin };
