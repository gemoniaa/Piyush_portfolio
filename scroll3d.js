/* Scroll effects for the portfolio page:
   progress line, section dots, 3D reveals, hero depth, stacking project cards,
   a glowing timeline for Experience and Education, and a floor grid that moves with the page. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const root = document.documentElement;
  const rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* Section dots */
  const defs = [['top', 'Home'], ['work', 'Projects'], ['experience', 'Experience'], ['education', 'Education'], ['certs', 'Certificates'], ['community', 'Community'], ['gallery', 'Gallery'], ['creative', 'Creative'], ['contact', 'Contact']];
  const secs = defs.map(d => ({ n: document.getElementById(d[0]), l: d[1], id: d[0] })).filter(s => s.n && !s.n.hidden);
  const dots = document.createElement('nav');
  dots.id = 'dots'; dots.setAttribute('aria-label', 'Page sections');
  secs.forEach(s => {
    const a = document.createElement('a');
    a.href = '#' + s.id; a.dataset.l = s.l; a.setAttribute('aria-label', s.l);
    a.append(document.createElement('i'));
    dots.append(a); s.a = a;
  });
  document.body.append(dots);

  const bar = $('#prog');
  if (rm) {
    addEventListener('scroll', () => { const h = root.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (h > 0 ? clamp(scrollY / h, 0, 1) : 0) + ')'; }, { passive: true });
    return;
  }

  /* Floor grid that slides as you scroll, the same grid as the landing page */
  const floor = document.createElement('div');
  floor.className = 'bgfloor'; floor.setAttribute('aria-hidden', 'true');
  document.body.prepend(floor);

  /* 3D reveal for headings and cards */
  const sel = '.wrap > h2, .wrap > h3, .wrap > .muted, .grid > *, .list > *, .two > *, .cteaser, .cylwrap, .row.mid, #social, .hero + * .row';
  const targets = [...document.querySelectorAll(sel)].filter(n => !n.closest('.hero') && !n.classList.contains('pcard') && !n.closest('.pcard'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.classList.add('in');
      setTimeout(() => { e.target.classList.remove('rv', 'in'); e.target.style.removeProperty('--d'); }, 1700);
    }), { threshold: .1, rootMargin: '0px 0px -6% 0px' });
    const seen = new Map();
    targets.forEach(n => {
      const p = n.parentElement, k = seen.get(p) || 0; seen.set(p, k + 1);
      n.classList.add('rv'); n.style.setProperty('--d', Math.min(k, 6) * 90 + 'ms');
      io.observe(n);
    });
  }

  /* Timeline: a glowing line fills down Experience and Education */
  const tls = ['#exp', '#edu'].map(s => $(s)).filter(Boolean);
  tls.forEach(t => t.classList.add('tl'));

  const cards = [...document.querySelectorAll('.pcard')];

  let ticking = false;
  const update = () => {
    ticking = false;
    const y = scrollY, vh = innerHeight, h = root.scrollHeight - vh;
    bar.style.transform = 'scaleX(' + (h > 0 ? clamp(y / h, 0, 1) : 0) + ')';
    root.style.setProperty('--hs', clamp(y / (vh * .9), 0, 1).toFixed(3));
    root.style.setProperty('--sy', y.toFixed(0));

    /* current section dot */
    let on = secs[0];
    secs.forEach(s => { if (s.n.getBoundingClientRect().top < vh * .45) on = s; });
    secs.forEach(s => s.a.classList.toggle('on', s === on));

    /* stacking project cards: each card sinks back as the next one slides over it */
    cards.forEach((c, i) => {
      const nx = cards[i + 1];
      let t = 0;
      if (nx) {
        const stuck = 78 + (i + 1) * 16;
        t = clamp(1 - (nx.getBoundingClientRect().top - stuck) / (vh * .55), 0, 1);
      }
      c.style.transform = t ? 'perspective(1200px) translate3d(0,' + (-t * 10) + 'px,' + (-t * 60) + 'px) rotateX(' + (t * 3) + 'deg) scale(' + (1 - t * .05) + ')' : '';
      c.style.filter = t ? 'brightness(' + (1 - t * .45).toFixed(3) + ')' : '';
    });

    /* timeline fill and dots */
    tls.forEach(t => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--fill', clamp((vh * .62 - r.top) / r.height, 0, 1).toFixed(3));
      [...t.children].forEach(c => c.classList.toggle('lit', c.getBoundingClientRect().top < vh * .66));
    });
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  update();
})();
