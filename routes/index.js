const express = require('express');
const router  = express.Router();
const https   = require('https');
const brand   = require('../config/brand');

/* ── GET / ── */
router.get('/', (req, res) => res.render('index'));

/* ── GET /services ── */
router.get('/services', (req, res) => res.render('pages/services'));

/* ── GET /business ── */
router.get('/business', (req, res) => res.render('pages/business', { success: req.query.success === '1' }));

/* ── POST /business/apply ── */
router.post('/business/apply', (req, res) => {
  /* TODO: save to DB and send email */
  res.redirect('/business?success=1');
});

/* ── GET /about ── */
router.get('/about', (req, res) => res.render('pages/about'));

/* ── GET /contact ── */
router.get('/contact', (req, res) => res.render('pages/contact', { success: req.query.success === '1' }));

/* ── POST /contact/send ── */
router.post('/contact/send', (req, res) => {
  /* TODO: send email */
  res.redirect('/contact?success=1');
});

/* ══════════════════════════════════════════════════
   POST /calculate — server-side price calculation
   Supports mode: 'oneway' | 'hourly'
══════════════════════════════════════════════════ */
router.post('/calculate', async (req, res) => {
  const { mode = 'oneway', origin, destination, date, time, passengers = 1, duration = 2, stops = [] } = req.body;

  if (!origin) return res.status(400).json({ ok: false, message: 'Pickup location is required.' });
  if (mode === 'oneway' && !destination) return res.status(400).json({ ok: false, message: 'Drop-off location is required.' });

  const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!serverKey) return res.status(500).json({ ok: false, message: 'Maps API not configured.' });

  /* Clean stops list */
  const cleanStops = Array.isArray(stops) ? stops.map(s => (s || '').trim()).filter(Boolean) : [];

  try {
    let route = null;
    let tolls  = [];

    if (mode === 'oneway') {
      if (cleanStops.length > 0) {
        /* ── Multi-stop: use Directions API with waypoints ── */
        const params = new URLSearchParams({
          origin:         origin,
          destination:    destination,
          waypoints:      cleanStops.join('|'),
          mode:           'driving',
          departure_time: 'now',
          traffic_model:  'best_guess',
          key:            serverKey,
        });
        const dir = await fetchJSON(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
        if (dir.status !== 'OK' || !dir.routes?.length) {
          return res.status(400).json({ ok: false, message: 'Route not found. Please check all addresses including stops.' });
        }
        const legs = dir.routes[0].legs || [];
        const totalMeters = legs.reduce((s, l) => s + (l.distance?.value || 0), 0);
        const totalSecs   = legs.reduce((s, l) => s + (l.duration_in_traffic?.value || l.duration?.value || 0), 0);
        route = {
          km:          Math.round(totalMeters / 100) / 10,
          mins:        Math.round(totalSecs / 60),
          origin:      legs[0]?.start_address || origin,
          destination: legs[legs.length-1]?.end_address || destination,
          stops:       cleanStops,
        };
        const text = (origin + ' ' + destination + ' ' + cleanStops.join(' ')).toLowerCase();
        tolls = brand.tolls.filter(t => t.match.some(k => text.includes(k)));
      } else {
        /* ── Direct: Distance Matrix ── */
        const params = new URLSearchParams({
          origins:        origin,
          destinations:   destination,
          mode:           'driving',
          units:          'metric',
          departure_time: 'now',
          traffic_model:  'best_guess',
          key:            serverKey,
        });
        const gmData = await fetchJSON(`https://maps.googleapis.com/maps/api/distancematrix/json?${params}`);
        if (gmData.status !== 'OK') return res.status(400).json({ ok: false, message: 'Route not found. Please check the addresses.' });
        const el = gmData.rows?.[0]?.elements?.[0];
        if (!el || el.status !== 'OK') return res.status(400).json({ ok: false, message: 'Could not calculate route. Please try different addresses.' });

        route = {
          km:          Math.round(el.distance.value / 100) / 10,
          mins:        Math.round((el.duration_in_traffic?.value || el.duration.value) / 60),
          origin:      gmData.origin_addresses?.[0] || origin,
          destination: gmData.destination_addresses?.[0] || destination,
          stops:       [],
        };
        const text = (route.origin + ' ' + route.destination).toLowerCase();
        tolls = brand.tolls.filter(t => t.match.some(k => text.includes(k)));
      }
    }

    /* ── Service area check ── */
    let serviceArea = { ok: true, status: 'in_area', message: null };
    const sa = brand.serviceArea;
    if (sa && sa.enforce) {
      try {
        /* Geocode pickup; for oneway also geocode dropoff */
        const pickupGeo = await geocode(origin, serverKey);
        let dropGeo = null;
        if (mode === 'oneway') dropGeo = await geocode(destination, serverKey);

        const pickupDist = pickupGeo ? haversineKm(sa.centerLat, sa.centerLng, pickupGeo.lat, pickupGeo.lng) : null;
        const dropDist   = dropGeo   ? haversineKm(sa.centerLat, sa.centerLng, dropGeo.lat, dropGeo.lng)   : null;

        const pickupIn = pickupDist !== null && pickupDist <= sa.radiusKm;
        const dropIn   = dropDist   !== null && dropDist   <= sa.radiusKm;

        if (mode === 'hourly') {
          /* Hourly: only pickup matters */
          if (!pickupIn) {
            serviceArea = { ok: true, status: 'out_of_area',
              message: 'This pickup is outside our usual Melbourne service area. You can still request it — we\'ll confirm availability before charging.' };
          }
        } else {
          if (pickupIn) {
            serviceArea = { ok: true, status: 'in_area', message: null };
          } else if (!pickupIn && dropIn) {
            /* Only drop-off near Melbourne → manual enquiry */
            serviceArea = { ok: true, status: 'enquiry',
              message: 'Your pickup is outside the Melbourne metro area. We can usually arrange this with notice — your booking will be sent to us as an enquiry to confirm.' };
          } else {
            /* Neither end near Melbourne → subject to confirmation */
            serviceArea = { ok: true, status: 'out_of_area',
              message: 'This trip is outside our Melbourne service area. You can still request a quote — it will be subject to confirmation before any charge.' };
          }
        }
      } catch (geoErr) {
        console.error('Geocode error (allowing booking):', geoErr.message);
        /* If geocoding fails, don't block the customer — let it through */
      }
    }

    /* ── Time surcharges ── */
    const surcharges = [];
    if (time) {
      const h = parseInt(time.split(':')[0]);
      const sc = brand.surcharges;
      if (h >= sc.afterHours.startHour || h < sc.afterHours.endHour) {
        surcharges.push({ label: sc.afterHours.label, pct: sc.afterHours.pct });
      } else {
        const day = date ? new Date(date + 'T12:00').getDay() : new Date().getDay();
        if (day >= 1 && day <= 5) {
          const { morning, evening } = sc.peakHour;
          if ((h >= morning.start && h < morning.end) || (h >= evening.start && h < evening.end)) {
            surcharges.push({ label: sc.peakHour.label, pct: sc.peakHour.pct });
          }
        }
      }
    }

    const tollTotal = tolls.reduce((s, t) => s + t.cost, 0);
    const pax       = parseInt(passengers) || 1;
    const hrs       = parseInt(duration) || 2;
    const reqSeats  = parseInt(req.body.childSeatCount) || 0;

    /* ── Calculate prices per vehicle (all returned; client greys out unbookable) ── */
    const results = brand.vehicles
      .map(v => {
        let base;
        if (mode === 'hourly') {
          base = v.hourlyRate * hrs;
        } else {
          base = v.baseFare + (route.km * v.perKm) + (route.mins * v.perMin);
        }
        const surchAmt  = surcharges.reduce((s, x) => s + base * x.pct, 0);
        const subtotal  = base + tollTotal + surchAmt;
        const gst       = subtotal * 0.10;
        const total     = Math.max(subtotal + gst, v.minFare);

        /* Capacity checks */
        const seatLimit   = v.maxChildSeats || 0;
        const tooManyPax   = pax > v.maxPax;
        const tooManySeats = reqSeats > seatLimit;
        const tooManyTotal = (pax + reqSeats) > v.maxPax;
        let unavailableReason = null;
        if (tooManyPax) {
          unavailableReason = `Seats up to ${v.maxPax} passengers`;
        } else if (tooManySeats) {
          unavailableReason = seatLimit === 0
            ? 'Child seats not available in this vehicle'
            : `Fits up to ${seatLimit} child seat${seatLimit > 1 ? 's' : ''}`;
        } else if (tooManyTotal) {
          unavailableReason = `Not enough room for ${pax} passenger${pax > 1 ? 's' : ''} + ${reqSeats} child seat${reqSeats > 1 ? 's' : ''}`;
        }

        return {
          id:          v.id,
          name:        v.name,
          description: v.description,
          features:    v.features,
          maxPax:      v.maxPax,
          maxChildSeats: seatLimit,
          popular:     v.popular,
          available:   !unavailableReason,
          unavailableReason,
          pricing: {
            base:      +base.toFixed(2),
            tolls:     +tollTotal.toFixed(2),
            surcharge: +surchAmt.toFixed(2),
            gst:       +gst.toFixed(2),
            total:     +total.toFixed(2),
          },
        };
      });

    res.json({ ok: true, mode, route, tolls, surcharges, results, serviceArea });

  } catch (err) {
    console.error('Calculate error:', err);
    res.status(500).json({ ok: false, message: 'Calculation failed. Please try again.' });
  }
});

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

/* ── Geocode an address to lat/lng ── */
async function geocode(address, key) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=au&key=${key}`;
  const data = await fetchJSON(url);
  if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  }
  return null;
}

/* ── Distance between two coords in km (Haversine) ── */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = router;
