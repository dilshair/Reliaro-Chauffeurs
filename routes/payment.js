const express = require('express');
const router  = express.Router();
const { db }  = require('../db/database');
const { sendBookingConfirmation } = require('../emails/mailer');

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('sk_test_xxx')) return null;
  return require('stripe')(key);
}

/* ── GET /payment/:bookingId ── */
router.get('/:bookingId', async (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.bookingId);
  if (!booking) return res.redirect('/');

  const stripe = getStripe();
  if (!stripe) {
    /* Stripe not configured — skip to success */
    return res.redirect(`/booking/success/${booking.reference}`);
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount:   Math.round(booking.total_price * 100), // cents
      currency: 'aud',
      metadata: { booking_ref: booking.reference, booking_id: booking.id },
      description: `Reliaro Chauffeurs — ${booking.vehicle_class} — ${booking.reference}`,
    });

    /* Save intent to booking */
    db.prepare('UPDATE bookings SET stripe_payment_intent = ? WHERE id = ?')
      .run(intent.id, booking.id);

    res.render('payment', { booking, clientSecret: intent.client_secret });
  } catch (e) {
    console.error('Stripe error:', e);
    res.redirect(`/booking/success/${booking.reference}`);
  }
});

/* ── POST /payment/webhook — Stripe webhook ── */
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.json({ received: true });

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).send(`Webhook error: ${e.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent  = event.data.object;
    const booking = db.prepare('SELECT * FROM bookings WHERE stripe_payment_intent = ?').get(intent.id);
    if (booking) {
      db.prepare(`UPDATE bookings SET payment_status = 'paid', status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(booking.id);
      const email = booking.guest_email;
      if (email) sendBookingConfirmation({ ...booking, payment_status: 'paid' }, email);
    }
  }

  res.json({ received: true });
});

/* ── POST /payment/confirm ── */
router.post('/confirm', async (req, res) => {
  const { bookingId, paymentIntentId } = req.body;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.json({ ok: false });

  db.prepare(`UPDATE bookings SET payment_status = 'paid', status = 'confirmed', stripe_payment_intent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(paymentIntentId, bookingId);

  res.json({ ok: true, ref: booking.reference });
});

module.exports = router;
