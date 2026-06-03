/* ═══════════════════════════════════════════════════
   RELIARO CHAUFFEURS — Price Calculator
   One Way + By the Hour
   Google Places Autocomplete + server-side calculation
═══════════════════════════════════════════════════ */

/* ── Tab switching ── */
window.switchTab = function(tab) {
  document.querySelectorAll('.calc-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false') });
  document.querySelectorAll('.calc-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).setAttribute('aria-selected','true');
  document.getElementById('panel-' + tab).classList.add('active');
  hideResults();
};

/* ── Google Maps init ── */
window.initMaps = function() {
  const opts = {
    componentRestrictions: { country: 'au' },
    fields: ['formatted_address'],
    bounds: new google.maps.LatLngBounds(
      new google.maps.LatLng(-45.0, 108.0),
      new google.maps.LatLng(-10.0, 155.0)
    ),
    strictBounds: false,
  };
  document.querySelectorAll('.calc-ac').forEach(el => {
    new google.maps.places.Autocomplete(el, opts);
  });
};

/* ── Set min date ── */
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type=date]').forEach(el => { if (!el.value) el.min = today });
});

/* ── Main calculate ── */
window.runCalculate = async function(mode) {
  const isHourly = mode === 'hourly';
  const prefix = isHourly ? 'hr' : 'ow';

  const pickup   = document.getElementById(prefix + '-pickup')?.value.trim();
  const date     = document.getElementById(prefix + '-date')?.value || '';
  const time     = document.getElementById(prefix + '-time')?.value || '09:00';
  const dropoff  = isHourly ? null : document.getElementById('ow-dropoff')?.value.trim();
  const duration = isHourly ? document.getElementById('hr-duration')?.value : null;

  const errEl  = document.getElementById(prefix + '-error');
  const loadEl = document.getElementById('calc-loading');
  const btn    = document.getElementById(prefix + '-submit');

  setError(errEl, null);

  if (!pickup) return setError(errEl, 'Please enter a pickup location.');
  if (!isHourly && !dropoff) return setError(errEl, 'Please enter a drop-off location.');
  if (!isHourly && pickup.toLowerCase() === dropoff?.toLowerCase()) return setError(errEl, 'Pickup and drop-off must be different.');

  /* Show loading */
  if (btn) { btn.disabled = true; btn.textContent = 'Calculating…'; }
  if (loadEl) loadEl.hidden = false;

  try {
    const body = isHourly
      ? { mode: 'hourly', origin: pickup, duration: parseInt(duration), date, time }
      : { mode: 'oneway', origin: pickup, destination: dropoff, date, time };

    const res  = await fetch('/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    if (!data.ok) return setError(errEl, data.message || 'Could not calculate. Please check the addresses.');

    renderResults(data, { mode, pickup, dropoff, date, time, duration });

  } catch(e) {
    setError(errEl, e.message?.includes('fetch') ? 'Network error. Please check your connection.' : (e.message || 'Something went wrong. Please try again.'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> View options';
    }
    if (loadEl) loadEl.hidden = true;
  }
};

/* ── Render results ── */
function renderResults(data, params) {
  const metaEl   = document.getElementById('results-meta');
  const cardsEl  = document.getElementById('vehicle-cards');
  const resultEl = document.getElementById('results-section');
  if (!resultEl || !cardsEl) return;

  /* Meta bar */
  const isHourly = params.mode === 'hourly';
  let metaHtml = '';
  if (isHourly) {
    metaHtml = `
      <span>📍 <strong>${esc(params.pickup)}</strong></span>
      <span>⏱ <strong>${params.duration} hour${params.duration > 1 ? 's' : ''}</strong></span>
      ${params.date ? `<span>📅 <strong>${fmtDate(params.date)}${params.time ? ' · ' + fmtTime(params.time) : ''}</strong></span>` : ''}
    `;
  } else {
    metaHtml = `
      <span>📍 <strong>${esc(data.route.origin)}</strong> → <strong>${esc(data.route.destination)}</strong></span>
      <span>🛣 <strong>${data.route.km} km · ${fmtMins(data.route.mins)}</strong></span>
      ${params.date ? `<span>📅 <strong>${fmtDate(params.date)}${params.time ? ' · ' + fmtTime(params.time) : ''}</strong></span>` : ''}
      ${data.tolls?.length ? `<span class="toll-tag">⚠ ${data.tolls.length} toll${data.tolls.length > 1 ? 's' : ''} detected</span>` : ''}
    `;
  }
  metaEl.innerHTML = metaHtml;

  /* Vehicle cards */
  if (!data.results?.length) {
    cardsEl.innerHTML = '<p style="text-align:center;color:var(--text-dmuted);padding:2rem">No vehicles available for this search. Please try different options.</p>';
  } else {
    cardsEl.innerHTML = data.results.map(r => {
      const p = r.pricing;
      const bookUrl = buildBookingUrl(r, data, params);
      return `
      <div class="vehicle-card ${r.popular ? 'featured' : ''}">
        ${r.popular ? '<div class="vehicle-card-badge">Most Popular</div>' : ''}
        <div class="vehicle-card-head">
          <h3>${r.name}</h3>
          <p>${r.description}</p>
          <div class="vehicle-card-price">
            <strong>$${p.total.toFixed(2)}</strong>
            <span>Fixed price · incl. GST</span>
          </div>
        </div>
        <div class="vehicle-card-body">
          <div class="price-breakdown">
            <div class="price-row"><span>${isHourly ? `Hourly rate (${params.duration} hr)` : `Base fare (${data.route.km} km · ${fmtMins(data.route.mins)})`}</span><span>$${p.base.toFixed(2)}</span></div>
            ${p.tolls > 0 ? `<div class="price-row"><span>Tolls (est.)</span><span>$${p.tolls.toFixed(2)}</span></div>` : ''}
            ${p.surcharge > 0 ? `<div class="price-row"><span>Surcharge</span><span>$${p.surcharge.toFixed(2)}</span></div>` : ''}
            <div class="price-row"><span>GST (10%)</span><span>$${p.gst.toFixed(2)}</span></div>
            <div class="price-row total"><span>Total (fixed)</span><span>$${p.total.toFixed(2)}</span></div>
          </div>
          <ul class="vehicle-features">
            ${r.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
          <a href="${bookUrl}" class="vehicle-card-cta">Book ${r.name} — $${p.total.toFixed(2)}</a>
        </div>
      </div>`;
    }).join('');
  }

  /* Show results */
  resultEl.hidden = false;
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Build booking URL ── */
function buildBookingUrl(r, data, params) {
  const p = r.pricing;
  const q = new URLSearchParams({
    service:      r.name,
    vehicleClass: r.name,
    pickup:       params.pickup,
    dropoff:      params.dropoff || '',
    date:         params.date || '',
    time:         params.time || '',
    mode:         params.mode,
    duration:     params.duration || '',
    distanceKm:   data.route?.km || '',
    durationMins: data.route?.mins || '',
    basePrice:    p.base.toFixed(2),
    tollCost:     p.tolls.toFixed(2),
    surchargeAmt: p.surcharge.toFixed(2),
    gst:          p.gst.toFixed(2),
    totalPrice:   p.total.toFixed(2),
  });
  return '/booking?' + q.toString();
}

/* ── Hide results ── */
window.hideResults = function() {
  const el = document.getElementById('results-section');
  if (el) el.hidden = true;
};

/* ── Helpers ── */
function setError(el, msg) {
  if (!el) return;
  if (msg) { el.textContent = msg; el.hidden = false; }
  else     { el.textContent = ''; el.hidden = true; }
}
function fmtMins(m) {
  if (!m) return '—';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h} hr ${mm} min` : `${h} hr`;
}
function fmtDate(d) {
  try { return new Date(d + 'T12:00').toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' }); }
  catch { return d; }
}
function fmtTime(t) {
  try {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'pm' : 'am'}`;
  } catch { return t; }
}
function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
