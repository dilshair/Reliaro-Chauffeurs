const express = require('express');
const router  = express.Router();
const { db }  = require('../db/database');
const { sendBookingConfirmation } = require('../emails/mailer');
const brand   = require('../config/brand');

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('sk_test_xxx') || key.includes('REPLACE')) return null;
  return require('stripe')(key);
}

function siteUrl(req) {
  return process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
}

/* ══════════════════════════════════════════════════
   GET /payment/:bookingId
   Creates a Stripe Checkout Session (hosted page).
   Apple Pay & Google Pay appear automatically on
   supported devices — no extra per-method setup.
══════════════════════════════════════════════════ */
router.get('/:bookingId', async (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.bookingId);
  if (!booking) return res.redirect('/');

  const stripe = getStripe();
  if (!stripe) {
    /* Stripe not configured yet — skip straight to success */
    return res.redirect(`/booking/success/${booking.reference}`);
  }

  try {
    const base = siteUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      /* 'card' covers Apple Pay & Google Pay automatically —
         Stripe shows the wallet button based on the device. */
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: `${brand.brand.name} — ${booking.vehicle_class}`,
            description: `${booking.pickup}${booking.dropoff ? ' -> ' + booking.dropoff : ''} · Ref ${booking.reference}`,
          },
          unit_amount: Math.round(booking.total_price * 100),
        },
        quantity: 1,
      }],
      customer_email: booking.guest_email || undefined,
      client_reference_id: booking.reference,
      metadata: { booking_ref: booking.reference, booking_id: booking.id },
      success_url: `${base}/payment/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${base}/payment/cancel/${booking.id}`,
    });

    db.prepare('UPDATE bookings SET stripe_payment_intent = ? WHERE id = ?')
      .run(session.id, booking.id);

    res.redirect(303, session.url);
  } catch (e) {
    console.error('Stripe Checkout error:', e);
    res.redirect(`/booking/success/${booking.reference}`);
  }
});

/* ── GET /payment/complete — return from Stripe ── */
router.get('/complete', async (req, res) => {
  const stripe = getStripe();
  const sessionId = req.query.session_id;
  if (!stripe || !sessionId) return res.redirect('/');

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const booking = db.prepare('SELECT * FROM bookings WHERE stripe_payment_intent = ? OR reference = ?')
      .get(sessionId, session.client_reference_id);

    if (booking && session.payment_status === 'paid') {
      db.prepare(`UPDATE bookings SET payment_status = 'paid', status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(booking.id);
      if (booking.guest_email) {
        sendBookingConfirmation({ ...booking, payment_status: 'paid' }, booking.guest_email);
      }
    }
    return res.redirect(`/booking/success/${booking ? booking.reference : ''}`);
  } catch (e) {
    console.error('Stripe complete error:', e);
    return res.redirect('/');
  }
});

/* ── GET /payment/cancel/:bookingId — customer backed out ── */
router.get('/cancel/:bookingId', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.bookingId);
  if (!booking) return res.redirect('/');
  res.redirect(`/booking/success/${booking.reference}`);
});

/* ══════════════════════════════════════════════════
   POST /payment/webhook — Stripe webhook
   Reliable source of truth for payment status.
══════════════════════════════════════════════════ */
router.post('/webhook', (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.json({ received: true });

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).send(`Webhook error: ${e.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const booking = db.prepare('SELECT * FROM bookings WHERE stripe_payment_intent = ? OR reference = ?')
      .get(session.id, session.client_reference_id);
    if (booking) {
      db.prepare(`UPDATE bookings SET payment_status = 'paid', status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(booking.id);
      if (booking.guest_email) sendBookingConfirmation({ ...booking, payment_status: 'paid' }, booking.guest_email);
    }
  }

  res.json({ received: true });
});

module.exports = router;
