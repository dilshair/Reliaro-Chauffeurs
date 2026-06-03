const express = require('express');
const router  = express.Router();
const https   = require('https');

/* ════════════════════════════
   GET /  — Homepage
════════════════════════════ */
router.get('/', (req, res) => {
  res.render('index');
});

/* ════════════════════════════
   POST /calculate
   Server-side Google Maps Distance Matrix
   Keeps API key secure on the server
════════════════════════════ */
router.post('/calculate', async (req, res) => {
  const { origin, destination, date, time, passengers = 1 } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ ok: false, message: 'Origin and destination are required.' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, message: 'Maps API not configured.' });
  }

  try {
    /* ── Call Google Distance Matrix API ── */
    const params = new URLSearchParams({
      origins:      origin,
      destinations: destination,
      mode:         'driving',
      units:        'metric',
      departure_time: 'now',
      traffic_model:  'best_guess',
      key:          apiKey,
    });

    const gmData = await fetchJSON(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
    );

    if (gmData.status !== 'OK') {
      return res.status(400).json({ ok: false, message: 'Route not found. Please check the addresses.' });
    }

    const element = gmData.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      return res.status(400).json({ ok: false, message: 'Could not calculate route. Please try different addresses.' });
    }

    const km   = Math.round(element.distance.value / 100) / 10;
    const mins = Math.round((element.duration_in_traffic?.value || element.duration.value) / 60);
    const originAddr = gmData.origin_addresses?.[0]      || origin;
    const destAddr   = gmData.destination_addresses?.[0] || destination;

    /* ── Detect Melbourne tolls ── */
    const TOLLS = [
      { match: ['airport','tullamarine','essendon'],                  name: 'CityLink (Airport)',  cost: 8.50 },
      { match: ['eastlink','ringwood','frankston','dandenong'],        name: 'EastLink',            cost: 10.50 },
      { match: ['westgate','west gate','werribee','geelong','altona'], name: 'West Gate Tunnel',    cost: 7.00 },
      { match: ['citylink','burnley','domain'],                        name: 'CityLink (City)',     cost: 5.50 },
    ];
    const text  = (originAddr + ' ' + destAddr).toLowerCase();
    const tolls = TOLLS.filter(t => t.match.some(k => text.includes(k)));

    /* ── Time surcharges ── */
    const surcharges = [];
    if (time) {
      const h = parseInt(time.split(':')[0]);
      if (h >= 22 || h < 6) surcharges.push({ label: 'After-hours (10pm–6am)', pct: 0.20 });
      else if ((h >= 7 && h <= 9) || (h >= 16 && h <= 19)) {
        const day = date ? new Date(date + 'T12:00').getDay() : new Date().getDay();
        if (day >= 1 && day <= 5) surcharges.push({ label: 'Peak hour', pct: 0.10 });
      }
    }

    /* ── Pricing tiers ── */
    const TIERS = {
      business: { name: 'Business Class', vehicles: 'Mercedes E-Class · BMW 5 Series', baseFare: 55, perKm: 2.40, perMin: 0.45, minFare: 85,  maxPax: 3, airportFee: 15 },
      first:    { name: 'First Class',    vehicles: 'Mercedes S-Class · BMW 7 Series', baseFare: 85, perKm: 3.60, perMin: 0.65, minFare: 130, maxPax: 3, airportFee: 22 },
      suv:      { name: 'SUV / Van',      vehicles: 'Mercedes V-Class · Genesis GV80', baseFare: 75, perKm: 3.00, perMin: 0.55, minFare: 110, maxPax: 6, airportFee: 22 },
    };

    const pax    = parseInt(passengers);
    const tollTotal = tolls.reduce((s, t) => s + t.cost, 0);

    const results = Object.entries(TIERS)
      .filter(([, t]) => pax <= t.maxPax)
      .map(([id, t]) => {
        const base      = t.baseFare + km * t.perKm + mins * t.perMin;
        const surchAmt  = surcharges.reduce((s, x) => s + base * x.pct, 0);
        const subtotal  = base + tollTotal + surchAmt;
        const gst       = subtotal * 0.10;
        const total     = Math.max(subtotal + gst, t.minFare);
        return {
          id,
          name:       t.name,
          vehicles:   t.vehicles,
          maxPax:     t.maxPax,
          pricing: {
            base:      +base.toFixed(2),
            tolls:     +tollTotal.toFixed(2),
            surcharge: +surchAmt.toFixed(2),
            gst:       +gst.toFixed(2),
            total:     +total.toFixed(2),
          },
        };
      });

    res.json({
      ok: true,
      route: { km, mins, origin: originAddr, destination: destAddr },
      tolls,
      surcharges,
      results,
    });

  } catch (err) {
    console.error('Calculate error:', err);
    res.status(500).json({ ok: false, message: 'Calculation failed. Please try again.' });
  }
});

/* ── Simple HTTPS JSON fetch ── */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

module.exports = router;
