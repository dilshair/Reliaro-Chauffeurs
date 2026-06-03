/* ═══════════════════════════════════════════════════════════
   RELIARO CHAUFFEURS — Price Calculator
   - Google Places Autocomplete on pickup/dropoff inputs
   - Falls back gracefully if Maps fails to load
   - Sends POST /calculate to server (Distance Matrix server-side)
═══════════════════════════════════════════════════════════ */

let mapsLoaded = false;

/* ── Called by Google Maps JS API when it finishes loading ── */
window.initReliaroMaps = function () {
  try {
    const pickupEl  = document.getElementById('hero-pickup');
    const dropoffEl = document.getElementById('hero-dropoff');
    if (!pickupEl || !dropoffEl) return;

    const opts = {
      componentRestrictions: { country: 'au' },
      fields: ['formatted_address'],
      bounds: new google.maps.LatLngBounds(
        new google.maps.LatLng(-39.2, 140.9),
        new google.maps.LatLng(-34.0, 150.0)
      ),
      strictBounds: false,
    };

    new google.maps.places.Autocomplete(pickupEl,  opts);
    new google.maps.places.Autocomplete(dropoffEl, opts);
    mapsLoaded = true;

    /* Remove any "Maps unavailable" warning */
    const warn = document.getElementById('maps-warn');
    if (warn) warn.remove();

  } catch (e) {
    console.warn('Maps Autocomplete init failed:', e.message);
    showMapsWarning();
  }
};

/* ── Show a subtle warning if Maps can't load ── */
function showMapsWarning() {
  const widget = document.getElementById('calc-widget');
  if (!widget || document.getElementById('maps-warn')) return;
  const div = document.createElement('div');
  div.id = 'maps-warn';
  div.style.cssText = 'background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.35);border-radius:8px;padding:.7rem 1rem;font-size:.82rem;color:#C9A84C;margin:0 1.75rem 1rem;display:flex;gap:.5rem;align-items:flex-start';
  div.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>Address autocomplete unavailable — you can still type addresses manually and get prices.</span>';
  /* Insert after header */
  const header = widget.querySelector('.calc-widget-header');
  if (header && header.nextSibling) header.parentNode.insertBefore(div, header.nextSibling);
}

/* ── If Maps fails to load at all after 8s, show warning ── */
setTimeout(() => {
  if (!mapsLoaded && document.getElementById('hero-pickup')) {
    showMapsWarning();
  }
}, 8000);

/* ── Bind button ── */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('calc-btn');
  if (btn) btn.addEventListener('click', runCalculate);

  const backBtn = document.getElementById('calc-back');
  if (backBtn) backBtn.addEventListener('click', resetCalculator);

  /* Allow Enter key on inputs */
  ['hero-pickup', 'hero-dropoff'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runCalculate(); } });
  });
});

/* ── Main calculate function ── */
async function runCalculate() {
  const pickup     = document.getElementById('hero-pickup')?.value.trim();
  const dropoff    = document.getElementById('hero-dropoff')?.value.trim();
  const date       = document.getElementById('hero-date')?.value || '';
  const time       = document.getElementById('hero-time')?.value || '09:00';
  const passengers = document.getElementById('hero-pax')?.value || '1';

  const errEl  = document.getElementById('calc-error');
  const loadEl = document.getElementById('calc-loading');
  const btn    = document.getElementById('calc-btn');

  /* Clear previous error */
  setError(null);

  /* Validate */
  if (!pickup)  return setError('Please enter a pickup location.');
  if (!dropoff) return setError('Please enter a drop-off location.');
  if (pickup.toLowerCase() === dropoff.toLowerCase())
    return setError('Pickup and drop-off must be different locations.');

  /* Show loading */
  if (btn)    { btn.disabled = true; btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Calculating…'; }
  if (loadEl)   loadEl.hidden = false;

  try {
    const res = await fetch('/calculate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ origin: pickup, destination: dropoff, date, time, passengers }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Server error ${res.status}`);
    }

    const data = await res.json();

    if (!data.ok) {
      setError(data.message || 'Could not calculate route. Please check the addresses and try again.');
      return;
    }

    renderResults(data, { pickup, dropoff, date, time, passengers });

  } catch (e) {
    if (e.name === 'TypeError' && e.message.includes('fetch')) {
      setError('Network error. Please check your connection and try again.');
    } else {
      setError(e.message || 'Something went wrong. Please try again.');
    }
  } finally {
    if (btn)    { btn.disabled = false; btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> View Prices'; }
    if (loadEl)   loadEl.hidden = true;
  }
}

/* ── Render results ── */
function renderResults(data, { pickup, dropoff, date, time, passengers }) {
  const formEl    = document.getElementById('calc-form');
  const resultsEl = document.getElementById('calc-results');
  const metaEl    = document.getElementById('calc-meta');
  const cardsEl   = document.getElementById('calc-cards');
  if (!resultsEl || !cardsEl) return;

  const minText  = fmtMins(data.route.mins);
  const dateText = date ? fmtDate(date) + (time ? ' · ' + fmtTime(time) : '') : '';

  metaEl.innerHTML =
    `<span>📍 ${data.route.origin} → ${data.route.destination}</span>` +
    `<span>🛣 ${data.route.km} km · ${minText}</span>` +
    (dateText ? `<span>📅 ${dateText}</span>` : '') +
    (data.tolls.length ? `<span style="color:#C9A84C">⚠ ${data.tolls.length} toll${data.tolls.length > 1 ? 's' : ''} detected</span>` : '');

  const FEATURES = {
    business: ['Up to 3 passengers', '2 large suitcases', 'Wi-Fi & USB'],
    first:    ['Up to 3 passengers', '3 large suitcases', 'Premium amenities'],
    suv:      ['Up to 6 passengers', '4+ suitcases', 'Groups & families'],
  };

  if (data.results.length === 0) {
    setError('No vehicles available for ' + passengers + ' passengers. Please choose fewer passengers.');
    return;
  }

  cardsEl.innerHTML = data.results.map(r => {
    const p = r.pricing;
    const feats = FEATURES[r.id] || [];
    const bookUrl = buildBookingUrl(r, data.route, { pickup, dropoff, date, time, passengers });
    return `
    <div class="calc-card ${r.id === 'first' ? 'calc-card-popular' : ''}">
      <div class="calc-card-head">
        <div><h4>${r.name}</h4><p>${r.vehicles}</p></div>
        <div class="calc-card-price">
          <strong>$${p.total.toFixed(2)}</strong>
          <span>Fixed price</span>
        </div>
      </div>
      <div class="calc-card-body">
        <div class="calc-card-breakdown">
          <div><span>Base fare (${data.route.km}km · ${minText})</span><span>$${p.base.toFixed(2)}</span></div>
          ${p.tolls > 0 ? `<div><span>Tolls (est.)</span><span>$${p.tolls.toFixed(2)}</span></div>` : ''}
          ${p.surcharge > 0 ? `<div><span>Surcharge</span><span>$${p.surcharge.toFixed(2)}</span></div>` : ''}
          <div><span>GST (10%)</span><span>$${p.gst.toFixed(2)}</span></div>
          <div class="bdr-total"><span>Total (fixed)</span><span>$${p.total.toFixed(2)}</span></div>
        </div>
        <div class="calc-card-feats">${feats.map(f => `<span>${f}</span>`).join('')}</div>
        <a href="${bookUrl}" class="calc-card-cta">Book ${r.name} — $${p.total.toFixed(2)}</a>
      </div>
    </div>`;
  }).join('');

  /* Switch views */
  if (formEl) formEl.style.display = 'none';
  resultsEl.hidden = false;
  document.getElementById('calc-widget')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ── Build /booking URL with pre-filled query params ── */
function buildBookingUrl(r, route, { pickup, dropoff, date, time, passengers }) {
  const p = r.pricing;
  const params = new URLSearchParams({
    service:      r.name,
    vehicleClass: r.name,
    pickup, dropoff,
    date: date || '',
    time: time || '',
    passengers,
    distanceKm:   route.km,
    durationMins: route.mins,
    basePrice:    p.base.toFixed(2),
    tollCost:     p.tolls.toFixed(2),
    surchargeAmt: p.surcharge.toFixed(2),
    gst:          p.gst.toFixed(2),
    totalPrice:   p.total.toFixed(2),
  });
  return '/booking?' + params.toString();
}

/* ── Reset to form view ── */
function resetCalculator() {
  const formEl    = document.getElementById('calc-form');
  const resultsEl = document.getElementById('calc-results');
  if (formEl)    formEl.style.display = '';
  if (resultsEl) resultsEl.hidden = true;
  setError(null);
}

/* ── Error helper ── */
function setError(msg) {
  const el = document.getElementById('calc-error');
  if (!el) return;
  if (msg) { el.textContent = msg; el.hidden = false; }
  else     { el.textContent = ''; el.hidden = true; }
}

/* ── Format helpers ── */
function fmtMins(m) {
  if (!m || m <= 0) return '—';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h} hr ${mm} min` : `${h} hr`;
}
function fmtDate(d) {
  try { return new Date(d + 'T12:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }); }
  catch { return d; }
}
function fmtTime(t) {
  try {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
  } catch { return t; }
}
