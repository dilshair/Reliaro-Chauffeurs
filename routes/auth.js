const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const { db }  = require('../db/database');

/* ── GET /auth/login ── */
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/account');
  res.render('auth/login', { error: null, next: req.query.next || '/account' });
});

/* ── POST /auth/login ── */
router.post('/login', async (req, res) => {
  const { email, password, next = '/account' } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email?.trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.render('auth/login', { error: 'Incorrect email or password.', next });
  }
  req.session.userId    = user.id;
  req.session.userName  = `${user.first_name} ${user.last_name}`;
  req.session.userEmail = user.email;
  res.redirect(next);
});

/* ── GET /auth/register ── */
router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/account');
  res.render('auth/register', { error: null, next: req.query.next || '/account' });
});

/* ── POST /auth/register ── */
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, phone, password, confirmPassword, next = '/account' } = req.body;

  if (!firstName || !lastName || !email || !password)
    return res.render('auth/register', { error: 'Please fill in all required fields.', next });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim()))
    return res.render('auth/register', { error: 'Please enter a valid email address.', next });

  if (password !== confirmPassword)
    return res.render('auth/register', { error: 'Passwords do not match.', next });

  if (password.length < 8)
    return res.render('auth/register', { error: 'Password must be at least 8 characters.', next });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing)
    return res.render('auth/register', { error: 'An account with this email already exists.', next });

  try {
    const hash   = await bcrypt.hash(password, 10);
    const result = db.prepare(
      'INSERT INTO users (first_name, last_name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)'
    ).run(firstName.trim(), lastName.trim(), email.trim().toLowerCase(), phone?.trim() || null, hash);

    req.session.userId    = result.lastInsertRowid;
    req.session.userName  = `${firstName} ${lastName}`;
    req.session.userEmail = email.trim().toLowerCase();
    res.redirect(next);
  } catch (e) {
    console.error(e);
    res.render('auth/register', { error: 'Registration failed. Please try again.', next });
  }
});

/* ── GET /auth/logout ── */
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
