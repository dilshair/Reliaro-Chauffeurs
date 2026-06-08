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
  window._acOpts = opts;
  window._mapsReady = true;
  document.querySelectorAll('.calc-ac').forEach(el => {
    if (!el.dataset.acBound) { new google.maps.places.Autocomplete(el, opts); el.dataset.acBound = '1'; }
  });
};

/* ── Attach autocomplete to a single input (for dynamic stops) ── */
function attachAutocomplete(el) {
  if (window._mapsReady && window.google?.maps?.places && !el.dataset.acBound) {
    new google.maps.places.Autocomplete(el, window._acOpts);
    el.dataset.acBound = '1';
  }
}

/* ── Add stop feature ── */
let stopCount = 0;
const MAX_STOPS = 3;
window.addStop = function() {
  if (stopCount >= MAX_STOPS) return;
  stopCount++;
  const container = document.getElementById('stops-container');
  const id = 'ow-stop-' + stopCount;
  const row = document.createElement('div');
  row.className = 'calc-field-row calc-stop-row';
  row.id = 'stop-row-' + stopCount;
  row.innerHTML =
    '<div class="calc-field-icon"><span class="dot-stop"></span></div>' +
    '<div class="calc-field-main">' +
      '<label for="' + id + '">Stop</label>' +
      '<input type="text" id="' + id + '" class="calc-ac calc-stop-input" placeholder="Address, airport, hotel or place" autocomplete="off">' +
    '</div>' +
    '<button type="button" class="calc-stop-remove" onclick="removeStop(' + stopCount + ')" aria-label="Remove stop">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
    '</button>';
  container.appendChild(row);
  attachAutocomplete(document.getElementById(id));
  relabelStops();
  if (countStops() >= MAX_STOPS) {
    const btn = document.getElementById('add-stop-btn');
    if (btn) btn.disabled = true;
  }
};

function countStops() { return document.querySelectorAll('.calc-stop-row').length; }

function relabelStops() {
  const rows = document.querySelectorAll('.calc-stop-row');
  rows.forEach((row, i) => {
    const label = row.querySelector('label');
    if (label) label.textContent = rows.length > 1 ? 'Stop ' + (i + 1) : 'Stop';
  });
}

window.removeStop = function(n) {
  const row = document.getElementById('stop-row-' + n);
  if (row) row.remove();
  relabelStops();
  const btn = document.getElementById('add-stop-btn');
  if (btn) btn.disabled = false;
};

/* ── Child seats ── */
window.toggleChildSeats = function(prefix) {
  const panel = document.getElementById('cs-panel-' + prefix);
  const toggle = document.getElementById('cs-toggle-' + prefix);
  if (!panel) return;
  const open = panel.hidden;
  panel.hidden = !open;
  if (toggle) toggle.classList.toggle('open', open);
};

window.updateChildSeats = function(prefix) {
  /* Just updates the toggle label with count + fee */
  const selector = prefix === 'hr' ? '.cs-qty-hr' : '.cs-qty';
  let count = 0, fee = 0;
  document.querySelectorAll(selector).forEach(s => {
    const q = parseInt(s.value) || 0;
    count += q;
    fee += q * (parseFloat(s.dataset.fee) || 0);
  });
  const toggle = document.getElementById('cs-toggle-' + prefix);
  if (toggle) {
    const span = toggle.querySelector('span');
    if (span) {
      span.innerHTML = count > 0
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6a3 3 0 116 0M5 11h14l-1 9H6z"/></svg> ' + count + ' child seat' + (count>1?'s':'') + ' (+$' + fee.toFixed(0) + ')'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6a3 3 0 116 0M5 11h14l-1 9H6z"/></svg> Add a child seat';
    }
    toggle.classList.toggle('has-seats', count > 0);
  }
};

/* ── Collect child seats for a tab ── */
function collectChildSeats(prefix) {
  const selector = prefix === 'hr' ? '.cs-qty-hr' : '.cs-qty';
  const seats = [];
  let totalFee = 0;
  document.querySelectorAll(selector).forEach(s => {
    const q = parseInt(s.value) || 0;
    if (q > 0) {
      seats.push({ id: s.dataset.id, qty: q, fee: parseFloat(s.dataset.fee) || 0 });
      totalFee += q * (parseFloat(s.dataset.fee) || 0);
    }
  });
  return { seats, totalFee };
}

/* ── Set min date ── */
document.addEventListener('DOMContentLoaded', () => {
  initDateTimeLimits();
});

/* ── Date can't go backward; time min 2 hours ahead ── */
function initDateTimeLimits() {
  const MIN_HOURS = 2;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  /* Earliest valid datetime = now + 2 hours */
  const earliest = new Date(now.getTime() + MIN_HOURS * 3600 * 1000);
  const earliestDateStr = earliest.toISOString().split('T')[0];
  const earliestTimeStr = String(earliest.getHours()).padStart(2,'0') + ':' + String(earliest.getMinutes()).padStart(2,'0');

  /* Set up each tab's date+time pair */
  [['ow-date','ow-time'], ['hr-date','hr-time']].forEach(([dateId, timeId]) => {
    const dateEl = document.getElementById(dateId);
    const timeEl = document.getElementById(timeId);
    if (!dateEl) return;

    /* Date minimum = today */
    dateEl.min = todayStr;
    /* Default date if empty = earliest valid date */
    if (!dateEl.value) dateEl.value = earliestDateStr;
    /* Default time if empty = earliest valid time */
    if (timeEl && !timeEl.dataset.touched) timeEl.value = earliestTimeStr;

    /* When date changes, adjust the time limits */
    const applyTimeLimit = () => {
      if (!timeEl) return;
      const selectedDate = dateEl.value;
      const freshEarliest = new Date(Date.now() + MIN_HOURS * 3600 * 1000);
      const freshEarliestTime = String(freshEarliest.getHours()).padStart(2,'0') + ':' + String(freshEarliest.getMinutes()).padStart(2,'0');

      if (selectedDate === freshEarliest.toISOString().split('T')[0]) {
        /* Same day as earliest → enforce min time */
        timeEl.min = freshEarliestTime;
        if (timeEl.value && timeEl.value < freshEarliestTime) timeEl.value = freshEarliestTime;
      } else if (selectedDate > freshEarliest.toISOString().split('T')[0]) {
        /* Future date → any time allowed */
        timeEl.min = '00:00';
      }
    };

    dateEl.addEventListener('change', applyTimeLimit);
    if (timeEl) timeEl.addEventListener('change', () => { timeEl.dataset.touched = '1'; });
    applyTimeLimit();
  });
}

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

  /* Collect stops */
  const stops = [];
  if (!isHourly) {
    document.querySelectorAll('.calc-stop-input').forEach(el => {
      const v = el.value.trim();
      if (v) stops.push(v);
    });
  }

  /* 2-hour advance validation */
  if (date && time) {
    const booking = new Date(date + 'T' + time);
    const minTime = new Date(Date.now() + 2 * 3600 * 1000);
    if (booking < minTime) {
      return setError(errEl, 'Bookings must be at least 2 hours in advance. Please choose a later time.');
    }
  }

  /* Show loading */
  if (btn) { btn.disabled = true; btn.textContent = 'Calculating…'; }
  if (loadEl) loadEl.hidden = false;

  try {
    const cs = collectChildSeats(prefix);
    const seatCount = cs.seats.reduce((s, x) => s + x.qty, 0);

    const body = isHourly
      ? { mode: 'hourly', origin: pickup, duration: parseInt(duration), date, time, childSeatCount: seatCount }
      : { mode: 'oneway', origin: pickup, destination: dropoff, date, time, stops, childSeatCount: seatCount };

    const res  = await fetch('/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    if (!data.ok) return setError(errEl, data.message || 'Could not calculate. Please check the addresses.');

    renderResults(data, { mode, pickup, dropoff, date, time, duration, stops, childSeats: cs });

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
    const stopsText = (params.stops && params.stops.length)
      ? ` <span style="color:var(--gold)">(via ${params.stops.length} stop${params.stops.length>1?'s':''})</span>` : '';
    metaHtml = `
      <span>📍 <strong>${esc(data.route.origin)}</strong> → <strong>${esc(data.route.destination)}</strong>${stopsText}</span>
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
    const csFee   = params.childSeats?.totalFee || 0;
    const csCount = params.childSeats?.seats?.reduce((s, x) => s + x.qty, 0) || 0;
    cardsEl.innerHTML = data.results.map(r => {
      const p = r.pricing;
      const grandTotal = p.total + csFee;
      const bookUrl = buildBookingUrl(r, data, params);
      const unavailable = r.available === false;

      if (unavailable) {
        return `
        <div class="vehicle-card vehicle-card-unavailable">
          <div class="vehicle-card-head">
            <h3>${r.name}</h3>
            <p>${r.description}</p>
          </div>
          <div class="vehicle-card-body">
            <div class="vehicle-unavailable-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>${r.unavailableReason || 'Not available for this trip'}</span>
            </div>
            <ul class="vehicle-features">
              ${r.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <button class="vehicle-card-cta" disabled>Not available</button>
          </div>
        </div>`;
      }

      return `
      <div class="vehicle-card ${r.popular ? 'featured' : ''}">
        ${r.popular ? '<div class="vehicle-card-badge">Most Popular</div>' : ''}
        <div class="vehicle-card-head">
          <h3>${r.name}</h3>
          <p>${r.description}</p>
          <div class="vehicle-card-price">
            <strong>$${grandTotal.toFixed(2)}</strong>
            <span>Fixed price · incl. GST</span>
          </div>
        </div>
        <div class="vehicle-card-body">
          <div class="price-breakdown">
            <div class="price-row"><span>${isHourly ? `Hourly rate (${params.duration} hr)` : `Base fare (${data.route.km} km · ${fmtMins(data.route.mins)})`}</span><span>$${p.base.toFixed(2)}</span></div>
            ${p.tolls > 0 ? `<div class="price-row"><span>Tolls (est.)</span><span>$${p.tolls.toFixed(2)}</span></div>` : ''}
            ${p.surcharge > 0 ? `<div class="price-row"><span>Surcharge</span><span>$${p.surcharge.toFixed(2)}</span></div>` : ''}
            ${csFee > 0 ? `<div class="price-row"><span>Child seats (${csCount})</span><span>$${csFee.toFixed(2)}</span></div>` : ''}
            <div class="price-row"><span>GST (10%)</span><span>$${p.gst.toFixed(2)}</span></div>
            <div class="price-row total"><span>Total (fixed)</span><span>$${grandTotal.toFixed(2)}</span></div>
          </div>
          <ul class="vehicle-features">
            ${r.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
          <a href="${bookUrl}" class="vehicle-card-cta">Book ${r.name} — $${grandTotal.toFixed(2)}</a>
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
  const csFee = params.childSeats?.totalFee || 0;
  const csList = (params.childSeats?.seats || []).map(s => `${s.id}:${s.qty}`).join(',');
  const q = new URLSearchParams({
    service:      r.name,
    vehicleClass: r.name,
    pickup:       params.pickup,
    stops:        (params.stops || []).join(' | '),
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
    childSeatFee: csFee.toFixed(2),
    childSeats:   csList,
    gst:          p.gst.toFixed(2),
    totalPrice:   (p.total + csFee).toFixed(2),
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
