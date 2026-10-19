(() => {
  'use strict';
  const C = window.SITE;
  if (!C) return;
  (window.creativeReady || Promise.resolve()).then(init);
  function init() {
  const $ = s => document.querySelector(s);
  const root = document.documentElement;
  const rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt) e.textContent = txt; return e; };

  const nice = s => { const t = String(s || '').replace(/[-_]+/g, ' ').trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
  const all = (C.creative || []).map(x => Object.assign({}, x, {
    type: x.type === 'video' ? 'video' : 'image',
    cat: x.cat || (x.type === 'video' ? 'Videos' : 'Posters'),
    title: x.title || nice((x.src || '').split('/').pop().replace(/\.[^.]+$/, ''))
  }));

  /* Glow: the page light takes the main colours of the open picture */
  const toneOf = src => new Promise(res => {
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 16;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0, 16, 16);
        const d = x.getImageData(0, 0, 16, 16).data;
        let R = 0, G = 0, B = 0, W = 0;
        for (let p = 0; p < d.length; p += 4) {
          const w = Math.max(d[p], d[p + 1], d[p + 2]) - Math.min(d[p], d[p + 1], d[p + 2]) + 1;
          R += d[p] * w; G += d[p + 1] * w; B += d[p + 2] * w; W += w;
        }
        res('rgb(' + (R / W | 0) + ',' + (G / W | 0) + ',' + (B / W | 0) + ')');
      } catch (e) { res(null); }
    };
    im.onerror = () => res(null);
    im.src = src;
  });

  /* Drive buttons */
  if (C.links && C.links.drive) {
    $('#navDrive').href = C.links.drive; $('#navDrive').hidden = false;
    $('#driveBtn').href = C.links.drive; $('#emptyDrive').href = C.links.drive; $('#emptyDrive').hidden = false;
  }
  $('#yr').textContent = '© ' + new Date().getFullYear() + ' ' + C.name;

  /* Scroll progress line */
  const bar = $('#prog');
  addEventListener('scroll', () => {
    const h = root.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
  }, { passive: true });

  if (!all.length) { $('#empty').hidden = false; $('#chips').hidden = true; $('#count').hidden = true; $('#cgrid').hidden = true; return; }
  $('#driveRow').hidden = !(C.links && C.links.drive);

  /* Filter tabs */
  const cats = ['All'].concat([...new Set(all.map(x => x.cat))]);
  let cur = 'All', list = all, shown = 0;
  const grid = $('#cgrid'), PAGE = 18;
  const chips = $('#chips');
  const makeChip = c => {
    const b = el('button', 'chip' + (c === cur ? ' on' : ''), c);
    b.type = 'button'; b.setAttribute('role', 'tab');
    b.addEventListener('click', () => { cur = c; [...chips.children].forEach(x => x.classList.toggle('on', x === b)); build(); });
    return b;
  };
  if (cats.length > 2) cats.forEach(c => chips.append(makeChip(c))); else chips.hidden = true;

  /* Tiles, added a page at a time so a very long list stays quick */
  const vio = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const v = e.target; vio.unobserve(v);
    if (v.dataset.src) { v.src = v.dataset.src + '#t=0.1'; v.preload = 'metadata'; }
  }), { rootMargin: '300px' }) : null;
  const rio = 'IntersectionObserver' in window && !rm ? new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    rio.unobserve(e.target); e.target.classList.add('in');
    setTimeout(() => { e.target.classList.remove('rv', 'in'); e.target.style.removeProperty('--d'); }, 1500);
  }), { threshold: .08 }) : null;

  const tile = (it, i) => {
    const b = el('button', 'ct' + (it.type === 'video' ? ' vid' : ''));
    b.type = 'button'; b.setAttribute('aria-label', 'Open ' + it.title);
    if (it.w && it.h) b.style.aspectRatio = it.w + ' / ' + it.h;
    let m;
    if (it.type === 'video') {
      m = el('video'); m.muted = true; m.playsInline = true; m.preload = 'none';
      if (it.poster) m.poster = it.poster;
      if (vio) { m.dataset.src = it.src; vio.observe(m); } else m.src = it.src;
      if (!it.w) b.style.aspectRatio = '16 / 9';
    } else {
      m = new Image(); m.src = it.src; m.alt = it.title; m.loading = 'lazy'; m.decoding = 'async';
      m.addEventListener('error', () => b.classList.add('miss'));
    }
    b.append(m, el('span', 'cap', it.title));
    b.addEventListener('click', () => open(i));
    if (rio) { b.classList.add('rv'); b.style.setProperty('--d', (i % 3) * 80 + 'ms'); rio.observe(b); }
    return b;
  };
  const more = () => {
    const end = Math.min(list.length, shown + PAGE);
    for (let i = shown; i < end; i++) grid.append(tile(list[i], i));
    shown = end;
  };
  const build = () => {
    list = cur === 'All' ? all : all.filter(x => x.cat === cur);
    grid.replaceChildren(); shown = 0;
    $('#count').textContent = list.length + (list.length === 1 ? ' piece' : ' pieces');
    more();
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { if (es[0].isIntersecting && shown < list.length) more(); }, { rootMargin: '600px' }).observe($('#sentinel'));
  } else { PAGE_ALL(); }
  function PAGE_ALL() { list = all; shown = 0; while (shown < list.length) more(); }
  build();

  /* Lightbox with previous and next */
  const lb = $('#lb'), lbm = $('#lbm');
  let idx = 0, back = null;
  const show = i => {
    idx = (i + list.length) % list.length;
    const it = list[idx];
    lbm.replaceChildren();
    let m;
    if (it.type === 'video') { m = el('video'); m.src = it.src; m.controls = true; m.playsInline = true; m.autoplay = true; }
    else { m = el('img'); m.src = it.src; m.alt = it.title; }
    lbm.append(m);
    $('#lbt').textContent = it.title;
    $('#lbd').textContent = (idx + 1) + ' of ' + list.length;
    if (it.type === 'image') toneOf(it.src).then(c => { if (c && !lb.hidden) root.style.setProperty('--glow', c); });
    const nx = list[(idx + 1) % list.length];
    if (nx && nx.type === 'image') { const p = new Image(); p.src = nx.src; }
  };
  const open = i => {
    back = document.activeElement;
    lb.hidden = false; document.body.style.overflow = 'hidden';
    show(i); $('#lbx').focus();
  };
  const close = () => {
    lb.hidden = true; lbm.replaceChildren(); document.body.style.overflow = '';
    if (back) back.focus();
  };
  $('#lbx').addEventListener('click', close);
  $('#lbp').addEventListener('click', () => show(idx - 1));
  $('#lbf').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  let sx = null;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });
  }
})();
