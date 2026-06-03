/* ── Sticky nav ── */
const nav    = document.getElementById('site-nav');
const burger = document.getElementById('nav-burger');
const mobile = document.getElementById('nav-mobile');

if (nav) {
  const tick = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  tick();
  window.addEventListener('scroll', tick, { passive: true });
}

if (burger && mobile) {
  burger.addEventListener('click', () => {
    const open = mobile.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    mobile.setAttribute('aria-hidden', !open);
  });
}

/* ── Set today as min date on all date inputs ── */
document.querySelectorAll('input[type=date]').forEach(el => {
  if (!el.value) el.min = new Date().toISOString().split('T')[0];
});
