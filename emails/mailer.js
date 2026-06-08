const nodemailer = require('nodemailer');

function createTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendMail(to, subject, html) {
  const t = createTransport();
  if (!t) { console.log(`📧 [MAIL] To: ${to} | Subject: ${subject}`); return; }
  try {
    await t.sendMail({ from: `"Reliaro Chauffeurs" <${process.env.FROM_EMAIL}>`, to, subject, html });
  } catch (e) { console.error('Mail error:', e.message); }
}

/* ── Email: booking confirmation to customer ── */
async function sendBookingConfirmation(booking, recipientEmail) {
  const subject = `Booking Confirmed — ${booking.reference} | Reliaro Chauffeurs`;
  const statusColor = { pending: '#f59e0b', confirmed: '#10b981', completed: '#6366f1' };
  const html = `
  <div style="max-width:600px;margin:0 auto;font-family:'Helvetica Neue',sans-serif;color:#1a1a1a">
    <div style="background:#0D1117;padding:32px;text-align:center;border-radius:8px 8px 0 0">
      <h1 style="color:#C9A84C;font-size:24px;font-weight:300;margin:0;letter-spacing:.1em">RELIARO</h1>
      <p style="color:#6b7280;font-size:13px;margin:6px 0 0;letter-spacing:.15em">CHAUFFEURS</p>
    </div>
    <div style="background:#fff;padding:36px;border:1px solid #e5e7eb;border-top:none">
      <h2 style="font-size:20px;font-weight:400;margin:0 0 8px">Booking ${booking.payment_status === 'paid' ? 'Confirmed' : 'Received'}</h2>
      <p style="color:#6b7280;margin:0 0 24px">Reference: <strong style="color:#C9A84C;font-size:18px">${booking.reference}</strong></p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr><td style="padding:9px 14px;background:#f9f9f7;font-weight:600;width:130px">Vehicle</td><td style="padding:9px 14px;background:#f9f9f7">${booking.vehicle_class}</td></tr>
        <tr><td style="padding:9px 14px;font-weight:600">Pickup</td><td style="padding:9px 14px">${booking.pickup}</td></tr>
        <tr><td style="padding:9px 14px;background:#f9f9f7;font-weight:600">Drop-off</td><td style="padding:9px 14px;background:#f9f9f7">${booking.dropoff}</td></tr>
        <tr><td style="padding:9px 14px;font-weight:600">Date & Time</td><td style="padding:9px 14px">${booking.date || '—'} ${booking.time || ''}</td></tr>
        <tr><td style="padding:9px 14px;background:#f9f9f7;font-weight:600">Passengers</td><td style="padding:9px 14px;background:#f9f9f7">${booking.passengers}</td></tr>
        <tr><td style="padding:9px 14px;font-weight:600">Total Price</td><td style="padding:9px 14px"><strong style="font-size:18px;color:#C9A84C">$${Number(booking.total_price).toFixed(2)}</strong> (fixed, incl. GST)</td></tr>
      </table>

      ${booking.payment_status !== 'paid' ? `
      <div style="background:#fef9ed;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:24px">
        <p style="margin:0;font-size:14px;color:#92400e"><strong>Next step:</strong> We'll confirm your booking and send a payment link within 60 minutes.</p>
      </div>` : `
      <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:16px;margin-bottom:24px">
        <p style="margin:0;font-size:14px;color:#065f46"><strong>Payment received.</strong> Your chauffeur will be in touch 24 hours before your journey.</p>
      </div>`}

      <p style="font-size:14px;color:#6b7280">Questions? Call us on <a href="tel:+61400000000" style="color:#C9A84C">+61 400 000 000</a> or reply to this email.</p>
    </div>
    <div style="background:#f9f9f7;padding:16px;text-align:center;border-radius:0 0 8px 8px;font-size:12px;color:#9ca3af">
      © ${new Date().getFullYear()} Reliaro Chauffeurs · reliarochauffeurs.com · Melbourne, VIC
    </div>
  </div>`;
  await sendMail(recipientEmail, subject, html);
}

/* ── Email: new booking alert to admin ── */
async function sendAdminAlert(booking) {
  const subject = `New Booking ${booking.reference} — ${booking.vehicle_class}`;
  const html = `
  <div style="max-width:580px;margin:0 auto;font-family:sans-serif">
    <div style="background:#0D1117;padding:20px 28px;border-radius:8px 8px 0 0">
      <h2 style="color:#C9A84C;margin:0;font-size:18px;font-weight:400">New Booking — ${booking.reference}</h2>
    </div>
    <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 12px;background:#f9f9f7;font-weight:600;width:130px">Customer</td><td style="padding:8px 12px;background:#f9f9f7">${booking.first_name} ${booking.last_name}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:600">Email</td><td style="padding:8px 12px"><a href="mailto:${booking.email}">${booking.email}</a></td></tr>
        <tr><td style="padding:8px 12px;background:#f9f9f7;font-weight:600">Phone</td><td style="padding:8px 12px;background:#f9f9f7">${booking.phone}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:600">Vehicle</td><td style="padding:8px 12px">${booking.vehicle_class}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9f9f7;font-weight:600">Route</td><td style="padding:8px 12px;background:#f9f9f7">${booking.pickup} → ${booking.dropoff}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:600">Date</td><td style="padding:8px 12px">${booking.date || '—'} ${booking.time || ''}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9f9f7;font-weight:600">Price</td><td style="padding:8px 12px;background:#f9f9f7"><strong style="color:#C9A84C">$${Number(booking.total_price).toFixed(2)}</strong></td></tr>
        <tr><td style="padding:8px 12px;font-weight:600">Payment</td><td style="padding:8px 12px">${booking.payment_status}</td></tr>
      </table>
      <p style="margin-top:20px"><a href="${process.env.SITE_URL || ''}/admin/bookings/${booking.id}" style="background:#C9A84C;color:#0D1117;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500">View in Admin Dashboard</a></p>
    </div>
  </div>`;
  await sendMail(process.env.ADMIN_EMAIL || process.env.SMTP_USER, subject, html);
}

/* ── Email: booking status update ── */
async function sendStatusUpdate(booking, recipientEmail) {
  const labels = { confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
  const subject = `Booking ${labels[booking.status] || booking.status} — ${booking.reference}`;
  const html = `
  <div style="max-width:580px;margin:0 auto;font-family:sans-serif">
    <div style="background:#0D1117;padding:24px 32px;border-radius:8px 8px 0 0">
      <h1 style="color:#C9A84C;font-size:20px;font-weight:300;margin:0;letter-spacing:.1em">RELIARO CHAUFFEURS</h1>
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
      <h2>Booking ${labels[booking.status] || booking.status}</h2>
      <p>Your booking <strong>${booking.reference}</strong> has been updated to: <strong style="color:#C9A84C">${labels[booking.status] || booking.status}</strong></p>
      ${booking.admin_notes ? `<p style="background:#f9f9f7;padding:12px 16px;border-radius:6px;font-size:14px">${booking.admin_notes}</p>` : ''}
      <p style="font-size:14px;color:#6b7280">Questions? Call <a href="tel:+61400000000" style="color:#C9A84C">+61 400 000 000</a></p>
    </div>
  </div>`;
  await sendMail(recipientEmail, subject, html);
}

module.exports = { sendBookingConfirmation, sendAdminAlert, sendStatusUpdate };
