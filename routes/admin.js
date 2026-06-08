const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const { db }   = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { sendStatusUpdate } = require('../emails/mailer');

/* ── GET /admin/login ── */
router.get('/login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

/* ── POST /admin/login ── */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email?.trim().toLowerCase());
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.render('admin/login', { error: 'Incorrect email or password.' });
  }
  req.session.adminId    = admin.id;
  req.session.adminName  = admin.name;
  req.session.adminEmail = admin.email;
  res.redirect('/admin');
});

/* ── GET /admin/logout ── */
router.get('/logout', (req, res) => {
  delete req.session.adminId;
  delete req.session.adminName;
  delete req.session.adminEmail;
  res.redirect('/admin/login');
});

router.use(requireAdmin);

/* ── GET /admin ── Dashboard ── */
router.get('/', (req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_bookings,
      SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END) as revenue,
      COUNT(DISTINCT guest_email) + COUNT(DISTINCT user_id) as customers
    FROM bookings
  `).get();

  const recent = db.prepare(`
    SELECT * FROM bookings ORDER BY created_at DESC LIMIT 10
  `).all();

  const monthly = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as count,
      SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END) as revenue
    FROM bookings
    GROUP BY month
    ORDER BY month DESC
    LIMIT 6
  `).all();

  res.render('admin/dashboard', { stats, recent, monthly });
});

/* ── GET /admin/bookings ── */
router.get('/bookings', (req, res) => {
  const { status, search, page = 1 } = req.query;
  const limit  = 20;
  const offset = (page - 1) * limit;
  let where    = '1=1';
  const params = [];
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (search) {
    where += ' AND (reference LIKE ? OR guest_email LIKE ? OR guest_first_name LIKE ? OR pickup LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  const bookings = db.prepare(
    `SELECT * FROM bookings WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE ${where}`).get(...params).c;
  res.render('admin/bookings', { bookings, total, page: parseInt(page), limit, status, search });
});

/* ── GET /admin/bookings/:id ── */
router.get('/bookings/:id', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.redirect('/admin/bookings');
  const user = booking.user_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(booking.user_id) : null;
  res.render('admin/booking-detail', { booking, user });
});

/* ── POST /admin/bookings/:id/status ── */
router.post('/bookings/:id/status', async (req, res) => {
  const { status, admin_notes } = req.body;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.redirect('/admin/bookings');

  db.prepare(
    'UPDATE bookings SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(status, admin_notes || null, booking.id);

  /* Send status update email */
  const email = booking.guest_email || (booking.user_id ? db.prepare('SELECT email FROM users WHERE id = ?').get(booking.user_id)?.email : null);
  if (email && ['confirmed', 'completed', 'cancelled'].includes(status)) {
    const updated = { ...booking, status, admin_notes };
    await sendStatusUpdate(updated, email);
  }

  res.redirect(`/admin/bookings/${booking.id}?success=Status+updated`);
});

/* ── POST /admin/bookings/:id/payment ── */
router.post('/bookings/:id/payment', (req, res) => {
  const { payment_status } = req.body;
  db.prepare('UPDATE bookings SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(payment_status, req.params.id);
  res.redirect(`/admin/bookings/${req.params.id}?success=Payment+updated`);
});

/* ── GET /admin/customers ── */
router.get('/customers', (req, res) => {
  const customers = db.prepare(`
    SELECT u.*,
      COUNT(b.id) as booking_count,
      SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END) as total_spent
    FROM users u
    LEFT JOIN bookings b ON b.user_id = u.id
    GROUP BY u.id ORDER BY u.created_at DESC
  `).all();
  res.render('admin/customers', { customers });
});

module.exports = router;
