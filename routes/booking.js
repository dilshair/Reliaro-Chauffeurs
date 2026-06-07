const express  = require('express');
const router   = express.Router();
const { db, generateRef } = require('../db/database');
const { sendBookingConfirmation, sendAdminAlert } = require('../emails/mailer');
const { sendBookingSMS } = require('../emails/sms');

/* ── GET /booking ── */
router.get('/', (req, res) => {
  res.render('booking', { prefill: req.query, error: null, promoCodes: require('../config/brand').promoCodes });
});

/* ── POST /booking ── */
router.post('/', async (req, res) => {
  const {
    firstName, lastName, email, phone,
    service, vehicleClass, pickup, dropoff,
    date, time, passengers, luggage,
    distanceKm, durationMins,
    basePrice, tollCost, surchargeAmt, gst, totalPrice,
    quotedPrice, notes,
    paymentMethod,
    returnTrip, childSeats, extraStops, stopAddresses,
    flightNumber, appliedPromo, promoDiscount,
  } = req.body;

  /* Validate required */
  if (!firstName || !lastName || !email || !phone || !service || !pickup) {
    return res.render('booking', { prefill: req.body, error: 'Please fill in all required fields.', promoCodes: require('../config/brand').promoCodes });
  }

  /* Build extra options note */
  const extras = [];
  if (returnTrip === 'yes')                 extras.push('Return trip: YES');
  if (flightNumber)                          extras.push(`Flight: ${flightNumber}`);
  if (childSeats && childSeats !== '0')      extras.push(`Child seats: ${childSeats}`);
  if (extraStops && extraStops !== '0')      extras.push(`Extra stops: ${extraStops}`);
  if (stopAddresses)                         extras.push(`Stops: ${stopAddresses.replace(/\n/g, ' | ')}`);
  if (appliedPromo)                          extras.push(`Promo: ${appliedPromo} (-$${Number(promoDiscount||0).toFixed(2)})`);
  const fullNotes = [notes, extras.length ? '--- Options ---\n' + extras.join('\n') : ''].filter(Boolean).join('\n\n');

  const ref = generateRef();

  /* Determine user */
  const userId = req.session.userId || null;

  /* Save booking */
  const result = db.prepare(`
    INSERT INTO bookings (
      reference, user_id,
      guest_first_name, guest_last_name, guest_email, guest_phone,
      service, vehicle_class, pickup, dropoff, date, time,
      passengers, luggage, distance_km, duration_mins,
      base_price, toll_cost, surcharge_amt, gst, total_price,
      payment_status, payment_method, notes, status
    ) VALUES (
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      'pending', ?, ?, 'pending'
    )
  `).run(
    ref, userId,
    firstName, lastName, email, phone,
    service, vehicleClass || service, pickup, dropoff || 'Hourly hire', date || null, time || null,
    parseInt(passengers) || 1, luggage || null,
    parseFloat(distanceKm) || null, parseInt(durationMins) || null,
    parseFloat(basePrice) || parseFloat(totalPrice) || 0,
    parseFloat(tollCost) || 0,
    parseFloat(surchargeAmt) || 0,
    parseFloat(gst) || 0,
    parseFloat(totalPrice) || parseFloat(quotedPrice?.replace(/[^0-9.]/g, '')) || 0,
    paymentMethod || 'invoice',
    fullNotes || null,
  );

  const bookingId = result.lastInsertRowid;
  const booking   = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

  /* Emails */
  const emailData = {
    ...booking,
    first_name: firstName,
    last_name:  lastName,
    email,
    phone,
  };
  await sendBookingConfirmation(booking, email);
  await sendAdminAlert(emailData);
  await sendBookingSMS(booking, phone);

  /* If Stripe payment requested — redirect to payment */
  if (paymentMethod === 'stripe' && parseFloat(totalPrice) > 0) {
    return res.redirect(`/payment/${bookingId}`);
  }

  res.redirect(`/booking/success/${ref}`);
});

/* ── GET /booking/success/:ref ── */
router.get('/success/:ref', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE reference = ?').get(req.params.ref);
  if (!booking) return res.redirect('/');
  res.render('booking-success', { booking });
});

module.exports = router;
