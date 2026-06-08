/* ═══════════════════════════════════════════════
   SMS via Twilio — add keys to .env to activate
   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE
═══════════════════════════════════════════════ */
const brand = require('../config/brand');

function smsEnabled() {
  return brand.sms.enabled &&
         process.env.TWILIO_ACCOUNT_SID &&
         process.env.TWILIO_AUTH_TOKEN &&
         process.env.TWILIO_PHONE;
}

/* ── Send an SMS ── */
async function sendSMS(to, body) {
  if (!smsEnabled()) {
    console.log(`📱 [SMS disabled] To: ${to} | ${body}`);
    return;
  }
  try {
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from  = process.env.TWILIO_PHONE;
    const auth  = Buffer.from(`${sid}:${token}`).toString('base64');
    const params = new URLSearchParams({ To: to, From: from, Body: body });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method:  'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    });
    if (!res.ok) console.error('Twilio error:', await res.text());
  } catch (e) {
    console.error('SMS error:', e.message);
  }
}

/* ── Booking confirmation SMS ── */
async function sendBookingSMS(booking, phone) {
  const msg = `${brand.brand.shortName}: Booking ${booking.reference} confirmed! ${booking.vehicle_class} on ${booking.date || 'TBC'} ${booking.time || ''}. Total $${Number(booking.total_price).toFixed(2)}. Questions? ${brand.brand.phone}`;
  await sendSMS(phone, msg);
}

/* ── Pickup reminder SMS ── */
async function sendReminderSMS(booking, phone) {
  const msg = `${brand.brand.shortName} reminder: Your chauffeur (${booking.vehicle_class}) is booked for ${booking.date} ${booking.time}. Pickup: ${booking.pickup}. Ref ${booking.reference}.`;
  await sendSMS(phone, msg);
}

module.exports = { sendSMS, sendBookingSMS, sendReminderSMS };
