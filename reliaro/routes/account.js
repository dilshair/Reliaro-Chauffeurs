const express  = require('express');
const router   = express.Router();
const { db }   = require('../db/database');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

/* ── GET /account ── */
router.get('/', (req, res) => {
  const bookings = db.prepare(
    'SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC LIMIT 5'
  ).all(req.session.userId);
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END) as spent
    FROM bookings WHERE user_id = ?
  `).get(req.session.userId);
  res.render('account/dashboard', { bookings, stats });
});

/* ── GET /account/bookings ── */
router.get('/bookings', (req, res) => {
  const bookings = db.prepare(
    'SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.session.userId);
  res.render('account/bookings', { bookings });
});

/* ── GET /account/booking/:ref ── */
router.get('/booking/:ref', (req, res) => {
  const booking = db.prepare(
    'SELECT * FROM bookings WHERE reference = ? AND user_id = ?'
  ).get(req.params.ref, req.session.userId);
  if (!booking) return res.redirect('/account/bookings');
  res.render('account/booking-detail', { booking });
});

module.exports = router;
