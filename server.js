require('dotenv').config();
const express     = require('express');
const session     = require('express-session');
const FileStore   = require('session-file-store')(session);
const path        = require('path');
const brand       = require('./config/brand');

const app  = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* ── Sessions ── */
app.use(session({
  store:             new FileStore({ path: './db/sessions', retries: 1, logFn: () => {} }),
  secret:            process.env.SESSION_SECRET || 'reliaro-dev-secret',
  resave:            false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true },
}));

/* ── Global locals ── */
app.use((req, res, next) => {
  res.locals.brand         = brand.brand;
  res.locals.nav           = brand.nav;
  res.locals.user          = req.session.userId  ? { id: req.session.userId,  name: req.session.userName,  email: req.session.userEmail  } : null;
  res.locals.admin         = req.session.adminId ? { id: req.session.adminId, name: req.session.adminName, email: req.session.adminEmail } : null;
  res.locals.googleMapsKey = process.env.GOOGLE_MAPS_API_KEY    || '';
  res.locals.stripePubKey  = process.env.STRIPE_PUBLIC_KEY      || '';
  res.locals.vehicles      = brand.vehicles;
  res.locals.services      = brand.services;
  res.locals.stats         = brand.stats;
  res.locals.businessTypes = brand.businessTypes;
  res.locals.coverage      = brand.coverage;
  next();
});

/* ── Routes ── */
app.use('/',        require('./routes/index'));
app.use('/auth',    require('./routes/auth'));
app.use('/booking', require('./routes/booking'));
app.use('/payment', require('./routes/payment'));
app.use('/account', require('./routes/account'));
app.use('/admin',   require('./routes/admin'));

app.use((req, res) => res.status(404).redirect('/'));

app.listen(PORT, () => {
  console.log(`\n✅  Reliaro Chauffeurs v2 → http://localhost:${PORT}`);
  console.log(`    Admin panel          → http://localhost:${PORT}/admin\n`);
});
