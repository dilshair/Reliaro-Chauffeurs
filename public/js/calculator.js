/* ═══════════════════════════════════════════════════════════
   RELIARO CHAUFFEURS — Homepage Price Calculator
   Uses Google Places Autocomplete (client)
   Sends POST /calculate to server (server calls Distance Matrix)
═══════════════════════════════════════════════════════════ */

let autocompletePickup  = null;
let autocompleteDropoff = null;

/* ── Called by Google Maps JS API callback ── */
window.initReliaroMaps = function () {
  const pickupEl  = document.getElementById('hero-pickup');
  const dropoffEl = document.getElementById('hero-dropoff');
  if (!pickupEl || !dropoffEl) return;

  const opts = {
    componentRestrictions: { country: 'au' },
    fields: ['formatted_address', 'geometry', 'name'],
    bounds: new google.maps.LatLngBounds(
      new google.maps.LatLng(-39.2, 140.9),
      new google.maps.LatLng(-34.0, 150.0)
    ),
    strictBounds: false,
  };
  autocompletePickup  = new google.maps.places.Autocomplete(pickupEl,  opts);
  autocompleteDropoff = new google.maps.places.Autocomplete(dropoffEl, opts);
};

/* ── Bind button ── */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('calc-btn');
  if (btn) btn.addEventListener('click', runCalculate);

  const backBtn = document.getElementById('calc-back');
  if (backBtn) backBtn.addEventListener('click', resetCalculator);
});

/* ── Main calculate ── */
async function runCalculate() {
  const pickup     = document.getElementById('hero-pickup')?.value.trim();
  const dropoff    = document.getElementById('hero-dropoff')?.value.trim();
  const date       = document.getElementById('hero-date')?.value;
  const time       = document.getElementById('hero-time')?.value || '09:00';
  const passengers = document.getElementById('hero-pax')?.value || '1';

  const errEl  = document.getElementById('calc-error');
  const loadEl = document.getElementById('calc-loading');
  const btn    = document.getElementById('calc-btn');

  /* Reset error */
  if (errEl) { errEl.hidden = true; errEl.textContent = ''; }

  if (!pickup)  return showError('Please enter a pickup location.');
  if (!dropoff) return showError('Please enter a drop-off location.');
  if (pickup.toLowerCase() === dropoff.toLowerCase()) return showError('Pickup and drop-off must be different locations.');

  /* Loading state */
  if (btn)    { btn.disabled = true; btn.textContent = 'Calculating…'; }
  if (loadEl)   loadEl.hidden = false;

  try {
    const res  = await fetch('/calculate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ origin: pickup, destination: dropoff, date, time, passengers }),
    });
    const data = await res.json();

    if (!data.ok) return showError(data.message || 'Could not calculate route. Please check the addresses.');

    renderResults(data, { pickup, dropoff, date, time, passengers });

  } catch (e) {
    showError('Network error. Please check your connection and try again.');
  } finally {
    if (btn)    { btn.disabled = false; btn.textContent = 'View Prices'; }
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

  /* Route meta row */
  const kmText   = data.route.km + ' km';
  const minText  = fmtMins(data.route.mins);
  const dateText = date ? fmtDate(date) + (time ? ' · ' + fmtTime(time) : '') : '';
  const tollText = data.tolls.length ? `${data.tolls.length} toll${data.tolls.length > 1 ? 's' : ''} detected` : '';

  metaEl.innerHTML =
    `<span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12h18M3 12l4-4M3 12l4 4"/></svg>${kmText}</span>` +
    `<span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${minText}</span>` +
    (dateText ? `<span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${dateText}</span>` : '') +
    (tollText ? `<span style="color:#C9A84C"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${tollText}</span>` : '');

  /* Vehicle cards */
  const FEATURES = {
    business: ['Up to 3 passengers', '2 large suitcases', 'Wi-Fi & USB charging'],
    first:    ['Up to 3 passengers', '3 large suitcases', 'Premium amenities'],
    suv:      ['Up to 6 passengers', '4+ suitcases', 'Groups & families'],
  };

  cardsEl.innerHTML = data.results.map(r => {
    const p = r.pricing;
    const feats = FEATURES[r.id] || [];
    const bookUrl = buildBookingUrl(r, data.route, data.tolls, data.surcharges, { pickup, dropoff, date, time, passengers });
    return `
    <div class="calc-card ${r.id === 'first' ? 'calc-card-popular' : ''}">
      <div class="calc-card-head">
        <div>
          <h4>${r.name}</h4>
          <p>${r.vehicles}</p>
        </div>
        <div class="calc-card-price">
          <strong>$${p.total.toFixed(2)}</strong>
          <span>Fixed price</span>
        </div>
      </div>
      <div class="calc-card-body">
        <div class="calc-card-breakdown">
          <div><span>Base fare (${data.route.km} km · ${minText})</span><span>$${p.base.toFixed(2)}</span></div>
          ${p.tolls > 0 ? `<div><span>Tolls (est.)</span><span>$${p.tolls.toFixed(2)}</span></div>` : ''}
          ${p.surcharge > 0 ? `<div><span>Surcharge</span><span>$${p.surcharge.toFixed(2)}</span></div>` : ''}
          <div><span>GST (10%)</span><span>$${p.gst.toFixed(2)}</span></div>
          <div class="bdr-total"><span>Total</span><span>$${p.total.toFixed(2)}</span></div>
        </div>
        <div class="calc-card-feats">${feats.map(f => `<span>${f}</span>`).join('')}</div>
        <a href="${bookUrl}" class="calc-card-cta">Book ${r.name} — $${p.total.toFixed(2)}</a>
      </div>
    </div>`;
  }).join('');

  /* Switch views */
  if (formEl)    formEl.style.display = 'none';
  resultsEl.hidden = false;
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ── Build pre-filled booking URL ── */
function buildBookingUrl(result, route, tolls, surcharges, { pickup, dropoff, date, time, passengers }) {
  const p = result.pricing;
  const params = new URLSearchParams({
    service:      result.name,
    vehicleClass: result.name,
    pickup, dropoff,
    date: date || '', time: time || '',
    passengers, distanceKm: route.km, durationMins: route.mins,
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
  if (formEl)    formEl.style.display = 'flex';
  if (resultsEl) resultsEl.hidden = true;
}

/* ── Helpers ── */
function showError(msg) {
  const el = document.getElementById('calc-error');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

function fmtMins(m) {
  if (!m) return '—';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h} hr ${mm} min` : `${h} hr`;
}

function fmtDate(d) {
  try { return new Date(d + 'T12:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }); }
  catch { return d; }
}

function fmtTime(t) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}
