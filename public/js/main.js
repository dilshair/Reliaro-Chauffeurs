/* ── Sticky nav ── */
const nav    = document.getElementById('site-nav');
const burger = document.getElementById('nav-burger');
const mobile = document.getElementById('nav-mobile');

if (nav) {
  const tick = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  tick();
  window.addEventListener('scroll', tick, { passive: true });
}

if (burger && mobile) {
  burger.addEventListener('click', () => {
    const open = mobile.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    mobile.setAttribute('aria-hidden', String(!open));
  });
  /* Close on link click */
  mobile.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobile.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      mobile.setAttribute('aria-hidden', 'true');
    });
  });
}

/* ── Min date on all date inputs ── */
document.querySelectorAll('input[type=date]').forEach(el => {
  if (!el.min) el.min = new Date().toISOString().split('T')[0];
});
